import { type AVPlaybackStatus } from "expo-av";
import Logger from "./Logger";

const logger = Logger.withTag("PlayerMonitor");

export interface PlayerEvent {
  type: "play" | "pause" | "seek" | "error" | "buffer" | "quality_change" | "source_change" | "episode_change";
  timestamp: number;
  data?: any;
  duration?: number;
  error?: string;
}

export class PlayerMonitor {
  private static instance: PlayerMonitor;
  private eventBuffer: PlayerEvent[] = [];
  private bufferFlushInterval: NodeJS.Timeout;
  private maxBufferSize = 50;
  private flushInterval = 5000; // 5 seconds

  private constructor() {
    this.bufferFlushInterval = setInterval(() => this.flushEvents(), this.flushInterval);
  }

  static getInstance(): PlayerMonitor {
    if (!PlayerMonitor.instance) {
      PlayerMonitor.instance = new PlayerMonitor();
    }
    return PlayerMonitor.instance;
  }

  /**
   * 记录播放器事件
   * @param event 播放器事件
   */
  recordEvent(event: PlayerEvent): void {
    this.eventBuffer.push(event);
    
    // 如果缓冲区超过最大大小，立即刷新
    if (this.eventBuffer.length > this.maxBufferSize) {
      this.flushEvents();
    }
  }

  /**
   * 记录播放开始事件
   * @param episodeIndex 剧集索引
   * @param source 播放源
   */
  recordPlay(episodeIndex: number, source: string): void {
    this.recordEvent({
      type: "play",
      timestamp: Date.now(),
      data: {
        episodeIndex,
        source,
      },
    });
    logger.info(`[PLAYER_EVENT] Play started - Episode: ${episodeIndex + 1}, Source: ${source}`);
  }

  /**
   * 记录暂停事件
   * @param position 暂停位置（毫秒）
   */
  recordPause(position: number): void {
    this.recordEvent({
      type: "pause",
      timestamp: Date.now(),
      data: {
        position,
      },
    });
    logger.info(`[PLAYER_EVENT] Paused - Position: ${(position / 1000).toFixed(2)}s`);
  }

  /**
   * 记录快进/快退事件
   * @param from 起始位置（毫秒）
   * @param to 目标位置（毫秒）
   */
  recordSeek(from: number, to: number): void {
    this.recordEvent({
      type: "seek",
      timestamp: Date.now(),
      data: {
        from,
        to,
        duration: Math.abs(to - from),
      },
    });
    logger.info(`[PLAYER_EVENT] Seek - From: ${(from / 1000).toFixed(2)}s, To: ${(to / 1000).toFixed(2)}s`);
  }

  /**
   * 记录错误事件
   * @param errorType 错误类型
   * @param errorMessage 错误消息
   * @param url 错误发生的URL
   */
  recordError(errorType: string, errorMessage: string, url?: string): void {
    this.recordEvent({
      type: "error",
      timestamp: Date.now(),
      data: {
        errorType,
        url,
      },
      error: errorMessage,
    });
    logger.error(`[PLAYER_ERROR] ${errorType} - ${errorMessage} ${url ? `(URL: ${url})` : ""}`);
  }

  /**
   * 记录缓冲事件
   * @param isBuffering 是否正在缓冲
   * @param bufferProgress 缓冲进度
   */
  recordBuffer(isBuffering: boolean, bufferProgress: number): void {
    this.recordEvent({
      type: "buffer",
      timestamp: Date.now(),
      data: {
        isBuffering,
        bufferProgress,
      },
    });
    if (isBuffering) {
      logger.info(`[PLAYER_EVENT] Buffering started - Progress: ${(bufferProgress * 100).toFixed(2)}%`);
    } else {
      logger.info(`[PLAYER_EVENT] Buffering ended - Progress: ${(bufferProgress * 100).toFixed(2)}%`);
    }
  }

  /**
   * 记录视频质量变化事件
   * @param quality 新的视频质量
   */
  recordQualityChange(quality: 'high' | 'medium' | 'low'): void {
    this.recordEvent({
      type: "quality_change",
      timestamp: Date.now(),
      data: {
        quality,
      },
    });
    logger.info(`[PLAYER_EVENT] Quality changed to ${quality}`);
  }

  /**
   * 记录播放源变化事件
   * @param oldSource 旧播放源
   * @param newSource 新播放源
   */
  recordSourceChange(oldSource: string, newSource: string): void {
    this.recordEvent({
      type: "source_change",
      timestamp: Date.now(),
      data: {
        oldSource,
        newSource,
      },
    });
    logger.info(`[PLAYER_EVENT] Source changed from ${oldSource} to ${newSource}`);
  }

  /**
   * 记录剧集变化事件
   * @param oldEpisodeIndex 旧剧集索引
   * @param newEpisodeIndex 新剧集索引
   */
  recordEpisodeChange(oldEpisodeIndex: number, newEpisodeIndex: number): void {
    this.recordEvent({
      type: "episode_change",
      timestamp: Date.now(),
      data: {
        oldEpisodeIndex,
        newEpisodeIndex,
      },
    });
    logger.info(`[PLAYER_EVENT] Episode changed from ${oldEpisodeIndex + 1} to ${newEpisodeIndex + 1}`);
  }

  /**
   * 处理播放状态更新
   * @param status 新的播放状态
   * @param previousStatus 之前的播放状态
   */
  handlePlaybackStatusUpdate(status: AVPlaybackStatus, previousStatus: AVPlaybackStatus | null): void {
    if (!status.isLoaded) {
      if (status.error) {
        this.recordError("playback", status.error);
      }
      return;
    }

    // 检测播放/暂停状态变化
    if (previousStatus?.isLoaded) {
      if (status.isPlaying && !previousStatus.isPlaying) {
        // 开始播放
        this.recordPlay(0, "unknown"); // 这里可以从其他地方获取剧集索引和播放源
      } else if (!status.isPlaying && previousStatus.isPlaying) {
        // 暂停播放
        this.recordPause(status.positionMillis || 0);
      }

      // 检测快进/快退
      const previousPosition = previousStatus.positionMillis || 0;
      const currentPosition = status.positionMillis || 0;
      if (Math.abs(currentPosition - previousPosition) > 1000) { // 超过1秒的位置变化
        this.recordSeek(previousPosition, currentPosition);
      }
    }

    // 检测缓冲状态变化
    if (status.isBuffering !== previousStatus?.isBuffering) {
      this.recordBuffer(status.isBuffering, status.bufferProgress || 0);
    }
  }

  /**
   * 刷新事件缓冲区，将事件上报
   */
  private flushEvents(): void {
    if (this.eventBuffer.length === 0) {
      return;
    }

    const events = [...this.eventBuffer];
    this.eventBuffer = [];

    // 这里可以实现事件上报逻辑，例如发送到服务器或本地存储
    // 目前只打印日志
    logger.info(`[PLAYER_MONITOR] Flushed ${events.length} events`);
    
    // 示例：将事件保存到本地存储以便后续分析
    // AsyncStorage.setItem('player_events', JSON.stringify(events));
  }

  /**
   * 清理资源
   */
  dispose(): void {
    clearInterval(this.bufferFlushInterval);
    this.flushEvents();
  }
}

export default PlayerMonitor.getInstance();
