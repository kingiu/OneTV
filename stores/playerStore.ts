import { type AVPlaybackStatus, type Video } from "expo-av";
import { type RefObject, useEffect } from "react";
import Toast from "react-native-toast-message";
import { create } from "zustand";

import { getPlaybackUrlCandidates } from "@/services/m3u";
import { getResolutionFromM3U8 } from "@/services/m3u8";
import { type PlayRecord, PlayRecordManager, PlayerSettingsManager } from "@/services/storage";
import { useSettingsStore } from "@/stores/settingsStore";
import Logger from "@/utils/Logger";
import networkMonitor from "@/utils/NetworkMonitor";
import playerMonitor from "@/utils/PlayerMonitor";

import useDetailStore, { episodesSelectorBySource } from "./detailStore";

const logger = Logger.withTag("PlayerStore");

const getEpisodeTitle = (index: number) => `第 ${index + 1} 集`;

const mapEpisodesForPlayback = (episodeUrls: string[], sourceKey: string) => {
  const { apiBaseUrl, vodAdBlockEnabled } = useSettingsStore.getState();

  return episodeUrls.map((episodeUrl, index) => {
    const playbackCandidates = getPlaybackUrlCandidates(episodeUrl, apiBaseUrl, sourceKey, vodAdBlockEnabled);

    const uniqueCandidates = Array.from(
      new Set(
        [...(playbackCandidates.length > 0 ? playbackCandidates : []), episodeUrl].filter(
          (candidate): candidate is string => Boolean(candidate)
        )
      )
    );

    return {
      url: uniqueCandidates[0] || episodeUrl,
      rawUrl: episodeUrl,
      title: getEpisodeTitle(index),
      urlCandidates: uniqueCandidates,
      currentCandidateIndex: 0,
    };
  });
};

interface Episode {
  url: string;
  rawUrl: string;
  title: string;
  urlCandidates: string[];
  currentCandidateIndex: number;
}

interface LineTestResult {
  index: number;
  latency: number;
  bandwidth: number;
  quality: number;
  compositeScore?: number;
}

interface PlayerState {
  videoRef: RefObject<Video> | null;
  currentEpisodeIndex: number;
  currentPlaySourceIndex: number;
  episodes: Episode[];
  status: AVPlaybackStatus | null;
  isLoading: boolean;
  showControls: boolean;
  showEpisodeModal: boolean;
  episodeModalInitialTab: 'episodes' | 'lines';
  showSourceModal: boolean;
  showSpeedModal: boolean;
  showQualityModal: boolean;
  showNextEpisodeOverlay: boolean;
  isSeeking: boolean;
  seekPosition: number;
  progressPosition: number;
  initialPosition: number;
  playbackRate: number;
  introEndTime?: number;
  outroStartTime?: number;
  // 缓冲相关状态
  bufferProgress: number;
  isBuffering: boolean;
  // 预加载相关状态
  preloadingEpisodeIndex: number | null;
  isPreloading: boolean;
  // 网络状态相关
  isConnected: boolean;
  connectionType: string | null;
  recommendedQuality: 'high' | 'medium' | 'low';
  currentQuality: 'high' | 'medium' | 'low';
  // 线路测试结果缓存
  lineTestCache: Map<string, { result: { latency: number; bandwidth: number }; timestamp: number }>;
  setVideoRef: (ref: RefObject<Video>) => void;
  loadVideo: (options: {
    source: string;
    id: string;
    title: string;
    episodeIndex: number;
    position?: number;
    skipAutoSourceSelection?: boolean;
    preferredDetail?: unknown;
  }) => Promise<void>;
  playEpisode: (index: number) => void;
  togglePlayPause: () => void;
  seek: (duration: number) => void;
  handlePlaybackStatusUpdate: (newStatus: AVPlaybackStatus) => void;
  setLoading: (loading: boolean) => void;
  setShowControls: (show: boolean) => void;
  setShowEpisodeModal: (show: boolean, initialTab?: 'episodes' | 'lines') => void;
  setShowSourceModal: (show: boolean) => void;
  setShowSpeedModal: (show: boolean) => void;
  setShowQualityModal: (show: boolean) => void;
  setShowNextEpisodeOverlay: (show: boolean) => void;
  setPlaybackRate: (rate: number) => void;
  setVideoQuality: (quality: 'high' | 'medium' | 'low') => void;
  setIntroEndTime: () => void;
  setOutroStartTime: () => void;
  refreshEpisodeUrls: () => void;
  prependCurrentEpisodeCandidate: (candidateUrl: string, originalUrl?: string) => boolean;
  tryFallbackUrl: (failedUrl: string) => boolean;
  reset: () => void;
  _seekTimeout?: NodeJS.Timeout;
  _preloadTimeout?: NodeJS.Timeout;
  _isRecordSaveThrottled: boolean;
  // Internal helper
  _savePlayRecord: (updates?: any, options?: { immediate?: boolean }) => void;
  handleVideoError: (errorType: "ssl" | "network" | "other", failedUrl: string) => Promise<void>;
  onLineChange: (lineIndex: number) => void;
  testLineSpeed: (url: string) => Promise<{ latency: number; bandwidth: number }>;
  selectBestLine: (playSources: Array<{ episodes: string[]; name?: string }>) => Promise<number>;
  // 缓冲状态更新
  updateBufferStatus: (isBuffering: boolean, bufferProgress: number) => void;
  // 预加载方法
  preloadNextEpisode: () => void;
  cancelPreload: () => void;
  // 网络状态方法
  updateNetworkStatus: (isConnected: boolean, connectionType: string | null) => void;
  getRecommendedQuality: () => 'high' | 'medium' | 'low';
}

const usePlayerStore = create<PlayerState>((set, get) => ({
  videoRef: null,
  episodes: [],
  currentEpisodeIndex: -1,
  currentPlaySourceIndex: 0,
  status: null,
  isLoading: true,
  showControls: false,
  showEpisodeModal: false,
  episodeModalInitialTab: 'episodes' as 'episodes' | 'lines',
  showSourceModal: false,
  showSpeedModal: false,
  showQualityModal: false,
  showNextEpisodeOverlay: false,
  isSeeking: false,
  seekPosition: 0,
  progressPosition: 0,
  initialPosition: 0,
  playbackRate: 1.0,
  introEndTime: undefined,
  outroStartTime: undefined,
  // 缓冲相关状态
  bufferProgress: 0,
  isBuffering: false,
  // 线路测试结果缓存
  lineTestCache: new Map(),
  // 预加载相关状态
  preloadingEpisodeIndex: null,
  isPreloading: false,
  // 网络状态相关
  isConnected: networkMonitor.getIsConnected(),
  connectionType: networkMonitor.getConnectionType(),
  recommendedQuality: networkMonitor.getOptimalPlaybackQuality(),
  currentQuality: networkMonitor.getOptimalPlaybackQuality(),
  _seekTimeout: undefined,
  _preloadTimeout: undefined,
  _isRecordSaveThrottled: false,
  setVideoRef: (ref) => set({ videoRef: ref }),

  // 缓冲状态更新
  updateBufferStatus: (isBuffering, bufferProgress) => {
    set({ 
      isBuffering,
      bufferProgress 
    });
  },

  // 测试线路速度的函数（优化：增加带宽测试）
  testLineSpeed: async (url: string): Promise<{ latency: number; bandwidth: number }> => {
    try {
      const { proxyService } = await import('@/services/proxyService');
      const startTime = performance.now();
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 5000); // 5 秒超时

      // 第一步：HEAD 请求测试延迟
      await proxyService.fetch(url, {
        signal: controller.signal,
        method: 'HEAD',
        redirect: 'follow',
      });

      const latency = performance.now() - startTime;

      // 第二步：GET 请求前 50KB 测试带宽
      clearTimeout(timeoutId);
      const bandwidthController = new AbortController();
      const bandwidthTimeoutId = setTimeout(() => bandwidthController.abort(), 5000);

      const bandwidthStart = performance.now();
      const getResponse = await proxyService.fetch(url, {
        signal: bandwidthController.signal,
        method: 'GET',
        redirect: 'follow',
        headers: {
          'Range': 'bytes=0-51199', // 只请求前 50KB
        },
      });

      const bandwidthEnd = performance.now();
      clearTimeout(bandwidthTimeoutId);

      // 计算带宽（KB/s）
      const contentLength = getResponse.headers.get('content-length');
      const bytesDownloaded = contentLength ? parseInt(contentLength, 10) : 51200;
      const durationSeconds = (bandwidthEnd - bandwidthStart) / 1000;
      const bandwidth = bytesDownloaded / 1024 / durationSeconds; // KB/s

      logger.info(`[SPEED_TEST] ${url.substring(0, 50)}... - latency: ${latency.toFixed(2)}ms, bandwidth: ${bandwidth.toFixed(2)}KB/s`);

      return { latency, bandwidth };
    } catch (error) {
      logger.warn(`[SPEED_TEST] Failed to test speed for ${url}:`, error);
      return { latency: Infinity, bandwidth: 0 }; // 失败的线路设为无限大延迟，0 带宽
    }
  },



  // 选择最佳线路的函数（优化：使用带宽和延迟综合评分）
  selectBestLine: async (playSources: Array<{ episodes: string[]; name?: string }>): Promise<number> => {
    if (!playSources || playSources.length === 0) {
      return 0;
    }

    if (playSources.length === 1) {
      return 0;
    }

    logger.info(`[LINE_SELECTION] Testing ${playSources.length} lines for speed and quality`);

    // 对每个线路进行速度测试（并行执行）
    const lineTests = await Promise.all<LineTestResult>(
      playSources.map(async (source, index) => {
        if (!source.episodes || source.episodes.length === 0) {
          return { index, latency: Infinity, bandwidth: 0, quality: 0 };
        }

        const testUrl = source.episodes[0];
        let speedResult;
        
        // 检查缓存
        const cacheKey = `line_test:${testUrl}`;
        const cached = get().lineTestCache.get(cacheKey);
        const now = Date.now();
        
        if (cached && (now - cached.timestamp) < 5 * 60 * 1000) { // 5分钟缓存
          logger.info(`[LINE_SELECTION] Using cached test result for ${source.name}`);
          speedResult = cached.result;
        } else {
          // 带超时的测试
          try {
            const controller = new AbortController();
            const timeoutId = setTimeout(() => controller.abort(), 8000); // 8秒超时
            
            speedResult = await Promise.race([
              get().testLineSpeed(testUrl),
              new Promise<{ latency: number; bandwidth: number }>((_, reject) => {
                setTimeout(() => reject(new Error('Speed test timeout')), 8000);
              })
            ]);
            
            clearTimeout(timeoutId);
            
            // 缓存结果
            const updatedCache = new Map(get().lineTestCache);
            updatedCache.set(cacheKey, { result: speedResult, timestamp: now });
            set({ lineTestCache: updatedCache });
          } catch (error) {
            logger.warn(`[LINE_SELECTION] Speed test failed for ${source.name}:`, error);
            return { index, latency: Infinity, bandwidth: 0, quality: 0 };
          }
        }

        // 改进的质量评分：基于线路名称和其他因素
        let quality = 0;
        const sourceName = source.name ? source.name.toLowerCase() : '';
        
        // 基于清晰度的评分
        if (sourceName.includes('1080') || sourceName.includes('fullhd')) quality = 4;
        else if (sourceName.includes('720') || sourceName.includes('hd')) quality = 3;
        else if (sourceName.includes('480') || sourceName.includes('sd')) quality = 2;
        else if (sourceName.includes('360')) quality = 1;
        
        // 基于线路名称的可靠性评分
        let reliability = 0;
        if (sourceName.includes('官方') || sourceName.includes('original')) reliability = 2;
        else if (sourceName.includes('高清') || sourceName.includes('超清')) reliability = 1;
        
        logger.info(`[LINE_SELECTION] Line ${index + 1} (${source.name}): latency = ${speedResult.latency.toFixed(2)}ms, bandwidth = ${speedResult.bandwidth.toFixed(2)}KB/s, quality = ${quality}`);
        return {
          index,
          latency: speedResult.latency,
          bandwidth: speedResult.bandwidth,
          quality: quality + reliability // 质量 + 可靠性
        };
      })
    );

    // 过滤掉失败的线路
    const validLines = lineTests.filter(line => line.latency < Infinity && line.bandwidth > 0);
    if (validLines.length === 0) {
      logger.warn(`[LINE_SELECTION] All lines failed speed test, using first line`);
      return 0;
    }

    // 综合评分：延迟 35% + 带宽 40% + 质量 25%
    validLines.forEach(line => {
      // 归一化延迟（越低越好，转为 0-100 分）
      const latencyScore = Math.max(0, 100 - line.latency / 10);
      // 归一化带宽（越高越好，转为 0-100 分）
      const bandwidthScore = Math.min(100, line.bandwidth / 10);
      // 质量分（0-6 转为 0-100 分）
      const qualityScore = (line.quality / 6) * 100;
      // 综合评分
      line.compositeScore = latencyScore * 0.35 + bandwidthScore * 0.4 + qualityScore * 0.25;
    });

    // 按综合评分排序
    validLines.sort((a, b) => b.compositeScore - a.compositeScore);

    const bestLineIndex = validLines[0].index;
    logger.info(`[LINE_SELECTION] Selected best line: ${bestLineIndex + 1} (${playSources[bestLineIndex].name}), score: ${validLines[0].compositeScore.toFixed(2)}`);
    return bestLineIndex;
  },

  loadVideo: async ({ source, id, episodeIndex, position, title, skipAutoSourceSelection, preferredDetail }) => {
    const perfStart = performance.now();
    logger.info(`[PERF] PlayerStore.loadVideo START - source: ${source}, id: ${id}, title: ${title}, skipAutoSourceSelection: ${skipAutoSourceSelection}, hasPreferredDetail: ${!!preferredDetail}`);

    let detail = preferredDetail || useDetailStore.getState().detail;
    let episodes: string[] = [];

    if (detail && detail.source) {
      logger.info(`[INFO] Using detail source "${detail.source}" to get episodes (preferred: ${!!preferredDetail})`);
      episodes = detail.episodes && detail.episodes.length > 0
        ? detail.episodes
        : episodesSelectorBySource(detail.source)(useDetailStore.getState());
    } else {
      logger.info(`[INFO] No existing detail, using provided source "${source}" to get episodes`);
      episodes = episodesSelectorBySource(source)(useDetailStore.getState());
    }

    set({
      isLoading: true,
    });

    const needsDetailInit = !preferredDetail && (!detail || !episodes || episodes.length === 0 || detail.title !== title);
    logger.info(
      `[PERF] Detail check - needsInit: ${needsDetailInit}, hasDetail: ${!!detail}, hasPreferredDetail: ${!!preferredDetail}, episodesCount: ${
        episodes?.length || 0
      }`
    );

    if (needsDetailInit) {
      const detailInitStart = performance.now();
      logger.info(`[PERF] DetailStore.init START - ${title}`);

      await useDetailStore.getState().init(title, source, id);

      const detailInitEnd = performance.now();
      logger.info(`[PERF] DetailStore.init END - took ${(detailInitEnd - detailInitStart).toFixed(2)}ms`);

      detail = useDetailStore.getState().detail;

      if (!detail) {
        logger.error(`[ERROR] Detail not found after initialization for "${title}" (source: ${source}, id: ${id})`);

        // Check DetailStore error state.
        const detailStoreState = useDetailStore.getState();
        if (detailStoreState.error) {
          logger.error(`[ERROR] DetailStore error: ${detailStoreState.error}`);
          set({
            isLoading: false,
            // PlayerStore has no dedicated error field.
          });
        } else {
          logger.error(`[ERROR] DetailStore init completed but no detail found and no error reported`);
          set({ isLoading: false });
        }
        return;
      }

      // Use actual source selected by DetailStore.
      logger.info(`[INFO] Using actual source "${detail.source}" instead of preferred source "${source}"`);
      episodes = detail.episodes && detail.episodes.length > 0
        ? detail.episodes
        : episodesSelectorBySource(detail.source)(useDetailStore.getState());

      if (!episodes || episodes.length === 0) {
        logger.error(`[ERROR] No episodes found for "${title}" from source "${detail.source}" (${detail.source_name})`);

        // Try to read episodes from searchResults.
        const detailStoreState = useDetailStore.getState();
        logger.info(
          `[INFO] Available sources in searchResults: ${detailStoreState.searchResults
            .map((r) => `${r.source}(${r.episodes?.length || 0} episodes)`)
            .join(", ")}`
        );

        // If current source has no episodes, fallback to first source with episodes.
        const sourceWithEpisodes = detailStoreState.searchResults.find((r) => r.episodes && r.episodes.length > 0);
        if (sourceWithEpisodes) {
          logger.info(
            `[FALLBACK] Using alternative source "${sourceWithEpisodes.source}" with ${sourceWithEpisodes.episodes.length} episodes`
          );
          episodes = sourceWithEpisodes.episodes;
          // Switch detail to source that has episodes.
          detail = sourceWithEpisodes;
        } else {
          logger.error(`[ERROR] No source with episodes found in searchResults`);
          set({ isLoading: false });
          return;
        }
      }

      logger.info(`[SUCCESS] Detail and episodes loaded - source: ${detail.source_name}, episodes: ${episodes.length}`);
    } else {
      logger.info(`[PERF] Skipping DetailStore.init - using cached data`);

      // Even with cached data, ensure episodes are loaded from the right source.
      if (detail && detail.source && detail.source !== source && !preferredDetail) {
        logger.info(
          `[INFO] Cached detail source "${detail.source}" differs from provided source "${source}", updating episodes`
        );
        // 从 searchResults 中找到对应的 source 的 detail 对象
        const detailStoreState = useDetailStore.getState();
        const sourceDetail = detailStoreState.searchResults.find(r => r.source === source);
        if (sourceDetail) {
          logger.info(
            `[INFO] Found detail for source "${source}", updating DetailStore`
          );
          useDetailStore.getState().setDetail(sourceDetail);
          detail = sourceDetail;
        }
        episodes = detail.episodes && detail.episodes.length > 0
          ? detail.episodes
          : episodesSelectorBySource(source)(useDetailStore.getState());

        if (!episodes || episodes.length === 0) {
          logger.warn(
            `[WARN] Provided source "${source}" has no episodes, trying cached source "${detail.source}"`
          );
          episodes = detail.episodes && detail.episodes.length > 0
            ? detail.episodes
            : episodesSelectorBySource(detail.source)(useDetailStore.getState());

          // If cached source also has no episodes, try to find any source with episodes
          if (!episodes || episodes.length === 0) {
            const detailStoreState = useDetailStore.getState();
            const sourceWithEpisodes = detailStoreState.searchResults.find((r) => r.episodes && r.episodes.length > 0);
            if (sourceWithEpisodes) {
              logger.info(
                `[FALLBACK] Using alternative source "${sourceWithEpisodes.source}" with ${sourceWithEpisodes.episodes.length} episodes`
              );
              episodes = sourceWithEpisodes.episodes;
              detail = sourceWithEpisodes;
            } else {
              logger.error(`[ERROR] No source with episodes found in searchResults`);
              set({ isLoading: false });
              return;
            }
          }
        }
      } else if (detail) {
        // Ensure episodes are loaded for the current source
        episodes = detail.episodes && detail.episodes.length > 0
          ? detail.episodes
          : episodesSelectorBySource(detail.source)(useDetailStore.getState());

        if (!episodes || episodes.length === 0) {
          // 如果是用户手动选择的源，不要自动切换到其他源
          if (preferredDetail) {
            logger.error(`[ERROR] User selected source "${detail.source}" has no episodes`);
            Toast.show({
              type: "error",
              text1: "播放失败",
              text2: `播放源 "${detail.source_name}" 没有可用的剧集`,
            });
            set({ isLoading: false });
            return;
          }

          logger.error(`[ERROR] No episodes found for "${title}" from source "${detail.source}" (${detail.source_name})`);

          // Try to find any source with episodes
          const detailStoreState = useDetailStore.getState();
          const sourceWithEpisodes = detailStoreState.searchResults.find((r) => r.episodes && r.episodes.length > 0);
          if (sourceWithEpisodes) {
            logger.info(
              `[FALLBACK] Using alternative source "${sourceWithEpisodes.source}" with ${sourceWithEpisodes.episodes.length} episodes`
            );
            episodes = sourceWithEpisodes.episodes;
            detail = sourceWithEpisodes;
          } else {
            logger.error(`[ERROR] No source with episodes found in searchResults`);
            set({ isLoading: false });
            return;
          }
        }
      }
    }

    // Final validation.
    if (!detail) {
      logger.error(`[ERROR] Final check failed: detail is null`);
      set({ isLoading: false });
      return;
    }

    if (!episodes || episodes.length === 0) {
      logger.error(
        `[ERROR] Final check failed: no episodes available for source "${detail.source}" (${detail.source_name})`
      );
      set({ isLoading: false });
      return;
    }

    logger.info(`[SUCCESS] Final validation passed - detail: ${detail.source_name}, episodes: ${episodes.length}`);

    // 自动选择最佳播放源（除非用户手动选择了源）
    if (!skipAutoSourceSelection) {
      const bestSource = await useDetailStore.getState().selectBestSource(episodeIndex);
      if (bestSource && bestSource.source !== detail.source) {
        logger.info(`[AUTO_SOURCE] Switching to best source: ${bestSource.source_name} (from ${detail.source_name})`);
        detail = bestSource;
        episodes = bestSource.episodes || [];
        await useDetailStore.getState().setDetail(bestSource);
      } else if (bestSource) {
        logger.info(`[AUTO_SOURCE] Current source is already the best: ${detail.source_name}`);
      } else {
        logger.warn(`[AUTO_SOURCE] No best source found, using current: ${detail.source_name}`);
      }
    } else {
      logger.info(`[AUTO_SOURCE] Skipped auto source selection (user manually selected source)`);
    }

    try {
      const storageStart = performance.now();
      logger.info(`[PERF] Storage operations START`);

      const playRecord = await PlayRecordManager.get(detail!.source, detail!.id.toString());
      const storagePlayRecordEnd = performance.now();
      logger.info(`[PERF] PlayRecordManager.get took ${(storagePlayRecordEnd - storageStart).toFixed(2)}ms`);

      const playerSettings = await PlayerSettingsManager.get(detail!.source, detail!.id.toString());
      const storageEnd = performance.now();
      logger.info(`[PERF] PlayerSettingsManager.get took ${(storageEnd - storagePlayRecordEnd).toFixed(2)}ms`);
      logger.info(`[PERF] Total storage operations took ${(storageEnd - storageStart).toFixed(2)}ms`);

      const initialPositionFromRecord = playRecord?.currentTime ? playRecord.currentTime * 1000 : 0;
      const savedPlaybackRate = playerSettings?.playbackRate || 1.0;
      const savedVideoQuality = playerSettings?.videoQuality || networkMonitor.getOptimalPlaybackQuality();

      // 自动选择最佳线路
      let currentPlaySourceIndex = 0;
      if (detail.play_sources && detail.play_sources.length > 1) {
        currentPlaySourceIndex = await get().selectBestLine(detail.play_sources);
        // 如果选择了非默认线路，更新 episodes
        if (currentPlaySourceIndex > 0 && detail.play_sources[currentPlaySourceIndex].episodes) {
          episodes = detail.play_sources[currentPlaySourceIndex].episodes;
          logger.info(`[LINE_SELECTION] Updated episodes to best line: ${detail.play_sources[currentPlaySourceIndex].name}`);
        }
      }

      const episodesMappingStart = performance.now();
      const mappedEpisodes = mapEpisodesForPlayback(episodes, detail.source);
      const episodesMappingEnd = performance.now();
      logger.info(
        `[PERF] Episodes mapping (${episodes.length} episodes) took ${(
          episodesMappingEnd - episodesMappingStart
        ).toFixed(2)}ms`
      );

      set({
        isLoading: false,
        currentEpisodeIndex: episodeIndex,
        currentPlaySourceIndex: currentPlaySourceIndex,
        initialPosition: position || initialPositionFromRecord,
        playbackRate: savedPlaybackRate,
        currentQuality: savedVideoQuality,
        episodes: mappedEpisodes,
        introEndTime: playRecord?.introEndTime || playerSettings?.introEndTime,
        outroStartTime: playRecord?.outroStartTime || playerSettings?.outroStartTime,
      });

      logger.info(`[DEBUG] Loaded video with play_sources: ${detail.play_sources?.length || 0}, selected line: ${currentPlaySourceIndex + 1}`);

      // 异步检测 M3U8 分辨率（不阻塞播放）
      if (mappedEpisodes.length > 0) {
        const firstEpisodeUrl = mappedEpisodes[0].url;
        getResolutionFromM3U8(firstEpisodeUrl).catch((error) => {
          logger.warn(`[RESOLUTION] Failed to detect resolution: ${error}`);
        });
      }

      const perfEnd = performance.now();
      logger.info(`[PERF] PlayerStore.loadVideo COMPLETE - total time: ${(perfEnd - perfStart).toFixed(2)}ms`);
    } catch (error) {
      logger.debug("Failed to load play record", error);
      set({ isLoading: false });

      const perfEnd = performance.now();
      logger.info(`[PERF] PlayerStore.loadVideo ERROR - total time: ${(perfEnd - perfStart).toFixed(2)}ms`);
    }
  },

  playEpisode: async (index) => {
    const { episodes, videoRef, currentEpisodeIndex } = get();
    if (index >= 0 && index < episodes.length) {
      // 记录剧集变化事件
      if (currentEpisodeIndex !== index) {
        playerMonitor.recordEpisodeChange(currentEpisodeIndex, index);
      }
      
      set({
        currentEpisodeIndex: index,
        showNextEpisodeOverlay: false,
        initialPosition: 0,
        progressPosition: 0,
        seekPosition: 0,
      });
      try {
        await videoRef?.current?.replayAsync();
        // 记录播放开始事件
        const detail = useDetailStore.getState().detail;
        playerMonitor.recordPlay(index, detail?.source || "unknown");
      } catch (error) {
        logger.debug("Failed to replay video:", error);
        Toast.show({ type: "error", text1: "播放失败" });
        // 记录错误事件
        playerMonitor.recordError("playback", error instanceof Error ? error.message : "Unknown error");
      }
    }
  },

  togglePlayPause: async () => {
    const { status, videoRef } = get();
    if (status?.isLoaded) {
      try {
        if (status.isPlaying) {
          await videoRef?.current?.pauseAsync();
        } else {
          await videoRef?.current?.playAsync();
        }
      } catch (error) {
        logger.debug("Failed to toggle play/pause:", error);
        Toast.show({ type: "error", text1: "操作失败" });
      }
    }
  },

  seek: async (duration) => {
    const { status, videoRef } = get();
    if (!status?.isLoaded || !status.durationMillis) return;

    const newPosition = Math.max(0, Math.min(status.positionMillis + duration, status.durationMillis));
    try {
      await videoRef?.current?.setPositionAsync(newPosition);
    } catch (error) {
      logger.debug("Failed to seek video:", error);
      Toast.show({ type: "error", text1: "快进/快退失败" });
    }

    set({
      isSeeking: true,
      seekPosition: newPosition / status.durationMillis,
    });

    if (get()._seekTimeout) {
      clearTimeout(get()._seekTimeout);
    }
    const timeoutId = setTimeout(() => set({ isSeeking: false }), 1000);
    set({ _seekTimeout: timeoutId });
  },

  setIntroEndTime: () => {
    const { status, introEndTime: existingIntroEndTime } = get();
    const detail = useDetailStore.getState().detail;
    if (!status?.isLoaded || !detail) return;

    if (existingIntroEndTime) {
      // Clear the time
      set({ introEndTime: undefined });
      get()._savePlayRecord({ introEndTime: undefined }, { immediate: true });
      Toast.show({
        type: "info",
        text1: "已清除片头时间",
      });
    } else {
      // Set the time
      const newIntroEndTime = status.positionMillis;
      set({ introEndTime: newIntroEndTime });
      get()._savePlayRecord({ introEndTime: newIntroEndTime }, { immediate: true });
      Toast.show({
        type: "success",
        text1: "设置成功",
        text2: "片头时间已记录",
      });
    }
  },

  setOutroStartTime: () => {
    const { status, outroStartTime: existingOutroStartTime } = get();
    const detail = useDetailStore.getState().detail;
    if (!status?.isLoaded || !detail) return;

    if (existingOutroStartTime) {
      // Clear the time
      set({ outroStartTime: undefined });
      get()._savePlayRecord({ outroStartTime: undefined }, { immediate: true });
      Toast.show({
        type: "info",
        text1: "已清除片尾时间",
      });
    } else {
      // Set the time
      if (!status.durationMillis) return;
      const newOutroStartTime = status.durationMillis - status.positionMillis;
      set({ outroStartTime: newOutroStartTime });
      get()._savePlayRecord({ outroStartTime: newOutroStartTime }, { immediate: true });
      Toast.show({
        type: "success",
        text1: "设置成功",
        text2: "片尾时间已记录",
      });
    }
  },

  _savePlayRecord: (updates = {}, options = {}) => {
    const { immediate = false } = options;
    if (!immediate) {
      if (get()._isRecordSaveThrottled) {
        logger.info(`[DEBUG] playerStore._savePlayRecord - throttled, returning early`);
        return;
      }
      set({ _isRecordSaveThrottled: true });
      setTimeout(() => {
        set({ _isRecordSaveThrottled: false });
      }, 10000); // 10 seconds
    }

    const { detail } = useDetailStore.getState();
    const { currentEpisodeIndex, episodes, status, introEndTime, outroStartTime } = get();
    logger.info(`[DEBUG] playerStore._savePlayRecord - detail: ${!!detail}, status.isLoaded: ${status?.isLoaded}`);
    if (detail && status?.isLoaded) {
      logger.info(`[DEBUG] playerStore._savePlayRecord - saving play record for ${detail.title}`);
      const existingRecord = {
        introEndTime,
        outroStartTime,
      };
      PlayRecordManager.save(detail.source, detail.id.toString(), {
        title: detail.title,
        cover: detail.poster || "",
        currentTime: Math.floor(status.positionMillis / 1000),
        totalTime: status.durationMillis ? Math.floor(status.durationMillis / 1000) : 0,
        lastPlayed: Date.now(),
        ...existingRecord,
        ...updates,
      });
    } else {
      if (!detail) {
        logger.info(`[DEBUG] playerStore._savePlayRecord - no detail, returning early`);
      }
      if (!status?.isLoaded) {
        logger.info(`[DEBUG] playerStore._savePlayRecord - status not loaded, returning early`);
      }
    }
  },

  handlePlaybackStatusUpdate: (newStatus) => {
    const previousStatus = get().status;
    
    if (!newStatus.isLoaded) {
      if ('error' in newStatus && newStatus.error) {
        logger.error(`[PLAYBACK_ERROR] ${newStatus.error}`);
        // 记录错误事件
        playerMonitor.recordError("playback", newStatus.error);
        // 自动尝试恢复播放
        const currentEpisode = get().episodes[get().currentEpisodeIndex];
        if (currentEpisode && currentEpisode.url) {
          logger.info(`[PLAYBACK_RECOVERY] Attempting to recover from error`);
          // 先尝试使用备用URL
          if (get().tryFallbackUrl(currentEpisode.url)) {
            logger.info(`[PLAYBACK_RECOVERY] Switched to fallback URL`);
          } else {
            // 如果没有备用URL，尝试切换播放源
            get().handleVideoError("other", currentEpisode.url);
          }
        }
      }
      set({ status: newStatus });
      return;
    }

    // 先更新 status，确保 _savePlayRecord 能获取到最新的状态
    const progressPosition = newStatus.durationMillis ? newStatus.positionMillis / newStatus.durationMillis : 0;
    set({ status: newStatus, progressPosition });
    
    // 处理播放状态更新，监控事件
    playerMonitor.handlePlaybackStatusUpdate(newStatus, previousStatus);
    
    // 更新缓冲状态
    if (newStatus.isBuffering !== undefined) {
      const bufferProgress = 'bufferProgress' in newStatus ? (newStatus.bufferProgress as number) : 0;
      get().updateBufferStatus(newStatus.isBuffering, bufferProgress || 0);
    }

    const { currentEpisodeIndex, episodes, outroStartTime, playEpisode } = get();
    const detail = useDetailStore.getState().detail;

    if (
      outroStartTime &&
      newStatus.durationMillis &&
      newStatus.positionMillis >= newStatus.durationMillis - outroStartTime
    ) {
      if (currentEpisodeIndex < episodes.length - 1) {
        playEpisode(currentEpisodeIndex + 1);
        return; // Stop further processing for this update
      }
    }

    if (detail && newStatus.durationMillis) {
      logger.info(`[DEBUG] playerStore.handlePlaybackStatusUpdate - calling _savePlayRecord`);
      get()._savePlayRecord();

      const progress = newStatus.positionMillis / newStatus.durationMillis;
      const isNearEnd = progress > 0.95;
      
      // 当播放到 80% 时开始预加载下一集
      if (progress > 0.8 && currentEpisodeIndex < episodes.length - 1) {
        get().preloadNextEpisode();
      }
      
      if (isNearEnd && currentEpisodeIndex < episodes.length - 1 && !outroStartTime) {
        set({ showNextEpisodeOverlay: true });
      } else {
        set({ showNextEpisodeOverlay: false });
      }
    }

    if (newStatus.didJustFinish) {
      if (currentEpisodeIndex < episodes.length - 1) {
        playEpisode(currentEpisodeIndex + 1);
      }
    }
  },

  setLoading: (loading) => set({ isLoading: loading }),
  setShowControls: (show) => set({ showControls: show }),
  setShowEpisodeModal: (show, initialTab) => set({
    showEpisodeModal: show,
    episodeModalInitialTab: initialTab || 'episodes'
  }),
  setShowSourceModal: (show) => set({ showSourceModal: show }),
  setShowSpeedModal: (show) => set({ showSpeedModal: show }),
  setShowQualityModal: (show) => set({ showQualityModal: show }),
  setShowNextEpisodeOverlay: (show) => set({ showNextEpisodeOverlay: show }),

  setVideoQuality: (quality) => {
    const { videoRef, status } = get();
    const detail = useDetailStore.getState().detail;

    set({ currentQuality: quality });

    // 记录视频质量变化事件
    playerMonitor.recordQualityChange(quality);

    // 这里可以根据质量设置不同的播放参数
    // 例如：调整缓冲策略、分辨率等
    logger.info(`[QUALITY] Set video quality to ${quality}`);

    // 保存质量偏好
    if (detail) {
      PlayerSettingsManager.save(detail.source, detail.id.toString(), { videoQuality: quality });
    }
  },

  setPlaybackRate: async (rate) => {
    const { videoRef } = get();
    const detail = useDetailStore.getState().detail;

    try {
      await videoRef?.current?.setRateAsync(rate, true);
      set({ playbackRate: rate });

      // Save the playback rate preference
      if (detail) {
        await PlayerSettingsManager.save(detail.source, detail.id.toString(), { playbackRate: rate });
      }
    } catch (error) {
      logger.debug("Failed to set playback rate:", error);
    }
  },

  refreshEpisodeUrls: () => {
    const detail = useDetailStore.getState().detail;
    const { currentEpisodeIndex } = get();
    if (!detail) {
      return;
    }

    const sourceEpisodes = episodesSelectorBySource(detail.source)(useDetailStore.getState());
    if (!sourceEpisodes.length) {
      return;
    }

    const mappedEpisodes = mapEpisodesForPlayback(sourceEpisodes, detail.source);
    const safeEpisodeIndex = Math.max(0, Math.min(currentEpisodeIndex, mappedEpisodes.length - 1));

    set({
      episodes: mappedEpisodes,
      currentEpisodeIndex: safeEpisodeIndex,
    });
  },

  prependCurrentEpisodeCandidate: (candidateUrl: string, originalUrl) => {
    if (!candidateUrl) {
      return false;
    }

    const { currentEpisodeIndex, episodes } = get();
    const currentEpisode = episodes[currentEpisodeIndex];

    if (!currentEpisode) {
      return false;
    }

    if (originalUrl && currentEpisode.rawUrl && currentEpisode.rawUrl !== originalUrl) {
      return false;
    }

    if (currentEpisode.urlCandidates[0] === candidateUrl && currentEpisode.url === candidateUrl) {
      return false;
    }

    const nextCandidates = [candidateUrl, ...currentEpisode.urlCandidates.filter((url) => url !== candidateUrl)];

    const nextEpisodes = [...episodes];
    nextEpisodes[currentEpisodeIndex] = {
      ...currentEpisode,
      url: candidateUrl,
      urlCandidates: nextCandidates,
      currentCandidateIndex: 0,
    };

    set({
      episodes: nextEpisodes,
      isLoading: false,
    });

    logger.info("[ADBLOCK] Injected local filtered playlist for current episode");

    return true;
  },

  tryFallbackUrl: (failedUrl: string) => {
    const { currentEpisodeIndex, episodes } = get();
    const currentEpisode = episodes[currentEpisodeIndex];

    if (!currentEpisode || !failedUrl || currentEpisode.url !== failedUrl) {
      return false;
    }

    const nextCandidateIndex = currentEpisode.currentCandidateIndex + 1;
    const nextCandidateUrl = currentEpisode.urlCandidates[nextCandidateIndex];

    if (!nextCandidateUrl) {
      return false;
    }

    const nextEpisodes = [...episodes];
    nextEpisodes[currentEpisodeIndex] = {
      ...currentEpisode,
      url: nextCandidateUrl,
      currentCandidateIndex: nextCandidateIndex,
    };

    set({
      episodes: nextEpisodes,
      isLoading: false,
    });

    logger.warn(
      `[VIDEO_FALLBACK] Switching episode ${currentEpisodeIndex + 1} url candidate ${nextCandidateIndex + 1}/${
        currentEpisode.urlCandidates.length
      }`
    );

    return true;
  },

  // 预加载下一集
  preloadNextEpisode: () => {
    const { currentEpisodeIndex, episodes, isPreloading, preloadingEpisodeIndex } = get();
    const nextIndex = currentEpisodeIndex + 1;
    
    // 检查是否已经在预加载，或者已经是最后一集
    if (isPreloading || preloadingEpisodeIndex === nextIndex || nextIndex >= episodes.length) {
      return;
    }
    
    const nextEpisode = episodes[nextIndex];
    if (!nextEpisode || !nextEpisode.url) {
      return;
    }
    
    logger.info(`[PRELOAD] Starting preload for episode ${nextIndex + 1}: ${nextEpisode.title}`);
    
    set({ 
      isPreloading: true, 
      preloadingEpisodeIndex: nextIndex 
    });
    
    // 模拟预加载过程，实际项目中可以根据需要实现真正的预加载逻辑
    // 例如：预加载视频元数据、关键帧或部分视频内容
    const preloadTimeout = setTimeout(() => {
      logger.info(`[PRELOAD] Preload completed for episode ${nextIndex + 1}`);
      set({ 
        isPreloading: false, 
        preloadingEpisodeIndex: null 
      });
    }, 2000);
    
    // 保存超时ID，以便可以取消预加载
    set({ _preloadTimeout: preloadTimeout });
  },
  
  // 取消预加载
  cancelPreload: () => {
    const { isPreloading, _preloadTimeout } = get();
    if (isPreloading && _preloadTimeout) {
      clearTimeout(_preloadTimeout);
      logger.info(`[PRELOAD] Preload cancelled`);
      set({ 
        isPreloading: false, 
        preloadingEpisodeIndex: null, 
        _preloadTimeout: undefined 
      });
    }
  },
  
  // 更新网络状态
  updateNetworkStatus: (isConnected, connectionType) => {
    const recommendedQuality = networkMonitor.getOptimalPlaybackQuality();
    logger.info(`[NETWORK] Updated status: connected=${isConnected}, type=${connectionType}, recommendedQuality=${recommendedQuality}`);
    
    set({ 
      isConnected, 
      connectionType, 
      recommendedQuality 
    });
    
    // 网络状态变化时的处理逻辑
    if (!isConnected) {
      logger.warn(`[NETWORK] Network disconnected, playback may be affected`);
      // 可以在这里添加网络断开时的处理逻辑
    }
  },
  
  // 获取推荐的播放质量
  getRecommendedQuality: () => {
    return get().recommendedQuality;
  },

  reset: async () => {
    const { videoRef, _preloadTimeout } = get();
    
    // 取消预加载
    if (_preloadTimeout) {
      clearTimeout(_preloadTimeout);
    }
    
    try {
      if (videoRef?.current) {
        await videoRef.current.unloadAsync();
      }
    } catch (error) {
      logger.debug("Failed to unload video:", error);
    }
    set({
      episodes: [],
      currentEpisodeIndex: 0,
      status: null,
      isLoading: true,
      showControls: false,
      showEpisodeModal: false,
      showSourceModal: false,
      showSpeedModal: false,
      showQualityModal: false,
      showNextEpisodeOverlay: false,
      initialPosition: 0,
      playbackRate: 1.0,
      introEndTime: undefined,
      outroStartTime: undefined,
      // 重置缓冲状态
      bufferProgress: 0,
      isBuffering: false,
      // 重置线路测试缓存
      lineTestCache: new Map(),
      // 重置预加载状态
      preloadingEpisodeIndex: null,
      isPreloading: false,
      // 重置质量设置
      currentQuality: networkMonitor.getOptimalPlaybackQuality(),
      _preloadTimeout: undefined,
    });
  },

  handleVideoError: async (errorType: "ssl" | "network" | "other", failedUrl: string) => {
    const perfStart = performance.now();
    logger.error(`[VIDEO_ERROR] Handling ${errorType} error for URL: ${failedUrl}`);

    const detailStoreState = useDetailStore.getState();
    const { detail } = detailStoreState;
    const { currentEpisodeIndex } = get();

    if (!detail) {
      logger.error(`[VIDEO_ERROR] Cannot fallback - no detail available`);
      set({ isLoading: false });
      return;
    }

    // Mark current source as failed.
    const currentSource = detail.source;
    const errorReason = `${errorType} error: ${failedUrl.substring(0, 100)}...`;
    useDetailStore.getState().markSourceAsFailed(currentSource, errorReason);

    // Get next available source.
    const fallbackSource = useDetailStore.getState().getNextAvailableSource(currentSource, currentEpisodeIndex);

    if (!fallbackSource) {
      logger.error(`[VIDEO_ERROR] No fallback sources available for episode ${currentEpisodeIndex + 1}`);
      Toast.show({
        type: "error",
        text1: "无法找到视频",
        text2: "所有播放源都不可用，建议尝试以下操作：\n1. 检查网络连接\n2. 稍后再试\n3. 尝试搜索其他相似内容",
      });
      set({ isLoading: false });
      return;
    }

    logger.info(`[VIDEO_ERROR] Switching to fallback source: ${fallbackSource.source} (${fallbackSource.source_name})`);

    try {
      // Update DetailStore with fallback source.
      await useDetailStore.getState().setDetail(fallbackSource);

      // Reload episodes for current index.
      const newEpisodes = fallbackSource.episodes || [];
      if (newEpisodes.length > currentEpisodeIndex) {
        const mappedEpisodes = mapEpisodesForPlayback(newEpisodes, fallbackSource.source);

        set({
          episodes: mappedEpisodes,
          isLoading: false,
        });

        const perfEnd = performance.now();
        logger.info(`[VIDEO_ERROR] Successfully switched to fallback source in ${(perfEnd - perfStart).toFixed(2)}ms`);
        logger.info(`[VIDEO_ERROR] New episode URL: ${newEpisodes[currentEpisodeIndex].substring(0, 100)}...`);

        Toast.show({
          type: "success",
          text1: "已切换播放源",
          text2: `正在使用 ${fallbackSource.source_name}`,
        });
      } else {
        logger.error(`[VIDEO_ERROR] Fallback source doesn't have episode ${currentEpisodeIndex + 1}`);
        set({ isLoading: false });
      }
    } catch (error) {
      logger.error(`[VIDEO_ERROR] Failed to switch to fallback source:`, error);
      set({ isLoading: false });
    }
  },

  onLineChange: (lineIndex: number) => {
    const detail = useDetailStore.getState().detail;
    if (!detail || !detail.play_sources || !detail.play_sources[lineIndex]) {
      logger.warn(`[LINE_CHANGE] Invalid line index or no play sources available`);
      return;
    }

    const selectedSource = detail.play_sources[lineIndex];
    const { currentEpisodeIndex, currentPlaySourceIndex } = get();
    const previousSource = detail.play_sources[currentPlaySourceIndex]?.name || "unknown";

    if (selectedSource.episodes && selectedSource.episodes.length > currentEpisodeIndex) {
      const mappedEpisodes = mapEpisodesForPlayback(selectedSource.episodes, detail.source);

      set({
        episodes: mappedEpisodes,
        currentPlaySourceIndex: lineIndex,
      });

      // 记录播放源变化事件
      playerMonitor.recordSourceChange(previousSource, selectedSource.name || "unknown");

      logger.info(`[LINE_CHANGE] Switched to line ${lineIndex + 1}: ${selectedSource.name}`);

      Toast.show({
        type: "success",
        text1: "已切换线路",
        text2: `正在使用 ${selectedSource.name}`,
      });
    } else {
      logger.error(`[LINE_CHANGE] Selected line doesn't have episode ${currentEpisodeIndex + 1}`);
    }
  },
}));

export default usePlayerStore;

export const selectCurrentEpisode = (state: PlayerState) => {
  // Safer data checks.
  if (
    state.episodes &&
    Array.isArray(state.episodes) &&
    state.episodes.length > 0 &&
    state.currentEpisodeIndex >= 0 &&
    state.currentEpisodeIndex < state.episodes.length
  ) {
    const episode = state.episodes[state.currentEpisodeIndex];
    // 纭繚episode鏈夋湁鏁堢殑URL
    if (episode && episode.url && episode.url.trim() !== "") {
      return episode;
    } else {
      // Debug only.
      if (__DEV__) {
        logger.debug(`[PERF] selectCurrentEpisode - episode found but invalid URL: ${episode?.url}`);
      }
    }
  } else {
    // Debug only.
    if (__DEV__) {
      logger.debug(
        `[PERF] selectCurrentEpisode - no valid episode: episodes.length=${state.episodes?.length}, currentIndex=${state.currentEpisodeIndex}`
      );
    }
  }
  return undefined;
};

// 设置网络状态监听器
networkMonitor.addListener((isConnected, connectionType) => {
  usePlayerStore.getState().updateNetworkStatus(isConnected, connectionType);
});
