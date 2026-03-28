import { create } from "zustand";
import Toast from "react-native-toast-message";
import { AVPlaybackStatus, Video } from "expo-av";
import { RefObject } from "react";
import { PlayRecord, PlayRecordManager, PlayerSettingsManager } from "../services/storage";
import useDetailStore, { episodesSelectorBySource } from "./detailStore";
import { useAuthStore } from "./authStore";
import Logger from "../utils/Logger";
import { LineSpeedTest } from "../services/lineSpeedTest";

const logger = Logger.withTag('PlayerStore');

interface Episode {
  url: string;
  title: string;
}

interface PlayerState {
  videoRef: RefObject<Video> | null;
  currentEpisodeIndex: number;
  episodes: Episode[];
  status: AVPlaybackStatus | null;
  isLoading: boolean;
  showControls: boolean;
  showEpisodeModal: boolean;
  showSourceModal: boolean;
  showSpeedModal: boolean;
  showLineModal: boolean;
  showNextEpisodeOverlay: boolean;
  isSeeking: boolean;
  seekPosition: number;
  progressPosition: number;
  initialPosition: number;
  playbackRate: number;
  introEndTime?: number;
  outroStartTime?: number;
  setVideoRef: (ref: RefObject<Video>) => void;
  loadVideo: (options: {
    source: string;
    id: string;
    title: string;
    episodeIndex: number;
    position?: number;
  }) => Promise<void>;
  playEpisode: (index: number) => void;
  togglePlayPause: () => void;
  seek: (duration: number) => void;
  handlePlaybackStatusUpdate: (newStatus: AVPlaybackStatus) => void;
  setLoading: (loading: boolean) => void;
  setShowControls: (show: boolean) => void;
  setShowEpisodeModal: (show: boolean) => void;
  setShowSourceModal: (show: boolean) => void;
  setShowSpeedModal: (show: boolean) => void;
  setShowLineModal: (show: boolean) => void;
  setShowNextEpisodeOverlay: (show: boolean) => void;
  setPlaybackRate: (rate: number) => void;
  setIntroEndTime: () => void;
  setOutroStartTime: () => void;
  reset: () => void;
  _seekTimeout?: ReturnType<typeof setTimeout>;
  _isRecordSaveThrottled: boolean;
  // Internal helper
  _savePlayRecord: (updates?: Partial<PlayRecord>, options?: { immediate?: boolean }) => void;
  handleVideoError: (errorType: 'ssl' | 'network' | 'other', failedUrl: string) => Promise<void>;
  handleLineError: () => Promise<void>;
}

const usePlayerStore = create<PlayerState>((set, get) => ({
  videoRef: null,
  episodes: [],
  currentEpisodeIndex: -1,
  status: null,
  isLoading: true,
  showControls: false,
  showEpisodeModal: false,
  showSourceModal: false,
  showSpeedModal: false,
  showLineModal: false,
  showNextEpisodeOverlay: false,
  isSeeking: false,
  seekPosition: 0,
  progressPosition: 0,
  initialPosition: 0,
  playbackRate: 1.0,
  introEndTime: undefined,
  outroStartTime: undefined,
  _seekTimeout: undefined,
  _isRecordSaveThrottled: false,

  setVideoRef: (ref) => set({ videoRef: ref }),

  loadVideo: async ({ source, id, episodeIndex, position, title }) => {
    const perfStart = performance.now();
    logger.info(`[PERF] PlayerStore.loadVideo START - source: ${source}, id: ${id}, title: ${title}`);
    
    let detail = useDetailStore.getState().detail;
    let episodes: Episode[] = [];
    
    set({
      isLoading: true,
    });

    // 添加API请求超时处理
    const timeoutPromise = new Promise<never>((_, reject) => {
      setTimeout(() => {
        reject(new Error('API request timeout'));
      }, 30000); // 30秒超时
    });

    try {
      // 包装整个操作以支持超时
      await Promise.race([
        (async () => {
          // 总是从detailStore获取最新的detail，而不是使用传入的detail参数
          let latestDetail = useDetailStore.getState().detail;
          
          // 如果有detail，使用detail的source获取episodes；否则使用传入的source
          if (latestDetail && latestDetail.source) {
            logger.info(`[INFO] Using latest detail source "${latestDetail.source}" to get episodes`);
            
            // 处理play_sources字段
            if (latestDetail.play_sources && latestDetail.play_sources.length > 0) {
              logger.info(`[INFO] Using play_sources with ${latestDetail.play_sources.length} lines`);
              
              // 检查用户是否已经手动选择了线路
              const { selectedLineIndex, userSelectedLine } = useDetailStore.getState();
              let finalLineIndex = selectedLineIndex;
              
              // 如果用户没有手动选择线路，则自动测速选择最快的线路
              if (!userSelectedLine) {
                const fastestLineIndex = await LineSpeedTest.findFastestLine(
                  latestDetail.play_sources,
                  episodeIndex,
                  5000 // 5秒超时
                );
                
                // 更新选中的线路索引
                if (fastestLineIndex !== selectedLineIndex) {
                  logger.info(`[INFO] Auto-switching to fastest line: ${fastestLineIndex}`);
                  await useDetailStore.getState().setDetail(latestDetail, fastestLineIndex);
                  finalLineIndex = fastestLineIndex;
                }
              } else {
                logger.info(`[INFO] User manually selected line ${selectedLineIndex}, skipping auto speed test`);
              }
              
              const selectedLine = latestDetail.play_sources[finalLineIndex];
              if (selectedLine && selectedLine.episodes && selectedLine.episodes.length > 0) {
                logger.info(`[INFO] Using line ${finalLineIndex + 1} (${selectedLine.name}): ${selectedLine.episodes.length} episodes`);
                episodes = selectedLine.episodes.map((episodeUrl, index) => ({
                  url: episodeUrl,
                  title: `第 ${index + 1} 集`,
                }));
              } else {
                // 如果选中的线路不存在，使用第一个线路
                logger.warn(`[WARN] Selected line index ${finalLineIndex} out of range, using first line`);
                const firstLine = latestDetail.play_sources[0];
                if (firstLine && firstLine.episodes && firstLine.episodes.length > 0) {
                  logger.info(`[INFO] Using first line (${firstLine.name}): ${firstLine.episodes.length} episodes`);
                  episodes = firstLine.episodes.map((episodeUrl, index) => ({
                    url: episodeUrl,
                    title: `第 ${index + 1} 集`,
                  }));
                }
              }
            } else {
              // 兼容旧版本，使用episodes字段
              const allEpisodes = episodesSelectorBySource(latestDetail.source)(useDetailStore.getState());
              logger.info(`[INFO] All episodes length: ${allEpisodes.length}`);
              
              if (allEpisodes.length > 0) {
                logger.info(`[INFO] Using ${allEpisodes.length} episodes from ${latestDetail.source}`);
                episodes = allEpisodes.map((episodeUrl, index) => ({
                  url: episodeUrl,
                  title: `第 ${index + 1} 集`,
                }));
              }
            }
          } else {
            logger.info(`[INFO] No existing detail, using provided source "${source}" to get episodes`);
            const allEpisodes = episodesSelectorBySource(source)(useDetailStore.getState());
            logger.info(`[INFO] All episodes length: ${allEpisodes.length}`);
            if (allEpisodes.length > 0) {
              logger.info(`[INFO] Using ${allEpisodes.length} episodes from ${source}`);
              episodes = allEpisodes.map((episodeUrl, index) => ({
                url: episodeUrl,
                title: `第 ${index + 1} 集`,
              }));
            }
          }

          const needsDetailInit = !latestDetail || !episodes || episodes.length === 0 || latestDetail.title !== title;
          logger.info(`[PERF] Detail check - needsInit: ${needsDetailInit}, hasDetail: ${!!latestDetail}, episodesCount: ${episodes?.length || 0}`);

          if (needsDetailInit) {
            const detailInitStart = performance.now();
            logger.info(`[PERF] DetailStore.init START - ${title}`);
            
            await useDetailStore.getState().init(title, source, id);
            
            const detailInitEnd = performance.now();
            logger.info(`[PERF] DetailStore.init END - took ${(detailInitEnd - detailInitStart).toFixed(2)}ms`);
            
            // 更新latestDetail为最新的detail
            latestDetail = useDetailStore.getState().detail;
            
            if (!latestDetail) {
              logger.error(`[ERROR] Detail not found after initialization for "${title}" (source: ${source}, id: ${id})`);
              
              // 检查DetailStore的错误状态
              const detailStoreState = useDetailStore.getState();
              if (detailStoreState.error) {
                logger.error(`[ERROR] DetailStore error: ${detailStoreState.error}`);
                set({ 
                  isLoading: false,
                });
              } else {
                logger.error(`[ERROR] DetailStore init completed but no detail found and no error reported`);
                set({ isLoading: false });
              }
              return;
            }
            
            // 使用DetailStore找到的实际source来获取episodes，而不是原始的preferredSource
            logger.info(`[INFO] Using actual source "${latestDetail.source}" instead of preferred source "${source}"`);  
            
            // 处理play_sources字段
            if (latestDetail.play_sources && latestDetail.play_sources.length > 0) {
              logger.info(`[INFO] Using play_sources with ${latestDetail.play_sources.length} lines`);
              
              // 检查用户是否已经手动选择了线路
              const { selectedLineIndex, userSelectedLine } = useDetailStore.getState();
              let finalLineIndex = selectedLineIndex;
              
              // 如果用户没有手动选择线路，则自动测速选择最快的线路
              if (!userSelectedLine) {
                const fastestLineIndex = await LineSpeedTest.findFastestLine(
                  latestDetail.play_sources,
                  episodeIndex,
                  5000 // 5秒超时
                );
                
                // 更新选中的线路索引
                if (fastestLineIndex !== selectedLineIndex) {
                  logger.info(`[INFO] Auto-switching to fastest line: ${fastestLineIndex}`);
                  await useDetailStore.getState().setDetail(latestDetail, fastestLineIndex);
                  finalLineIndex = fastestLineIndex;
                }
              } else {
                logger.info(`[INFO] User manually selected line ${selectedLineIndex}, skipping auto speed test`);
              }
              
              const selectedLine = latestDetail.play_sources[finalLineIndex];
              if (selectedLine && selectedLine.episodes && selectedLine.episodes.length > 0) {
                logger.info(`[INFO] Using line ${finalLineIndex + 1} (${selectedLine.name}): ${selectedLine.episodes[0].substring(0, 100)}...`);
                episodes = selectedLine.episodes.map((episodeUrl, index) => ({
                  url: episodeUrl,
                  title: `第 ${index + 1} 集`,
                }));
              } else {
                // 如果选中的线路不存在，使用第一个线路
                logger.warn(`[WARN] Selected line index ${finalLineIndex} out of range, using first line`);
                const firstLine = latestDetail.play_sources[0];
                if (firstLine && firstLine.episodes && firstLine.episodes.length > 0) {
                  logger.info(`[INFO] Using first line (${firstLine.name}): ${firstLine.episodes[0].substring(0, 100)}...`);
                  episodes = firstLine.episodes.map((episodeUrl, index) => ({
                    url: episodeUrl,
                    title: `第 ${index + 1} 集`,
                  }));
                }
              }
            } else {
              // 兼容旧版本，使用episodes字段
              const allEpisodes = episodesSelectorBySource(latestDetail.source)(useDetailStore.getState());
              logger.info(`[INFO] All episodes length: ${allEpisodes.length}`);
              
              if (allEpisodes.length > 0) {
                logger.info(`[INFO] Using ${allEpisodes.length} episodes from ${latestDetail.source}`);
                episodes = allEpisodes.map((episodeUrl, index) => ({
                  url: episodeUrl,
                  title: `第 ${index + 1} 集`,
                }));
              }
            }
            
            if (!episodes || episodes.length === 0) {
              logger.error(`[ERROR] No episodes found for "${title}" from source "${latestDetail.source}" (${latestDetail.source_name})`);
              
              // 尝试从searchResults中直接获取episodes
              const detailStoreState = useDetailStore.getState();
              logger.info(`[INFO] Available sources in searchResults: ${detailStoreState.searchResults.map(r => `${r.source}(${r.episodes?.length || 0} episodes)`).join(', ')}`);
              
              // 如果当前source没有episodes，尝试使用第一个有episodes的source
              const sourceWithEpisodes = detailStoreState.searchResults.find(r => r.episodes && r.episodes.length > 0);
              if (sourceWithEpisodes) {
                logger.info(`[FALLBACK] Using alternative source "${sourceWithEpisodes.source}" with ${sourceWithEpisodes.episodes.length} episodes`);
                episodes = sourceWithEpisodes.episodes.map((episodeUrl, index) => ({
                  url: episodeUrl,
                  title: `第 ${index + 1} 集`,
                }));
                // 更新latestDetail为有episodes的source
                latestDetail = sourceWithEpisodes;
              } else {
                logger.error(`[ERROR] No source with episodes found in searchResults`);
                set({ isLoading: false });
                return;
              }
            }
            
            logger.info(`[SUCCESS] Detail and episodes loaded - source: ${latestDetail.source_name}, episodes: ${episodes.length}`);
          } else {
            logger.info(`[PERF] Skipping DetailStore.init - using cached data`);
            
            // 即使是缓存的数据，也要确保使用正确的source获取episodes
            if (latestDetail && latestDetail.source && latestDetail.source !== source) {
              logger.info(`[INFO] Cached detail source "${latestDetail.source}" differs from provided source "${source}", updating episodes`);
              
              // 处理play_sources字段
              if (latestDetail.play_sources && latestDetail.play_sources.length > 0) {
                logger.info(`[INFO] Using play_sources with ${latestDetail.play_sources.length} lines`);
                logger.info(`[INFO] Play sources: ${latestDetail.play_sources.map(l => l.name).join(', ')}`);
                
                // 检查用户是否已经手动选择了线路
                const { selectedLineIndex, userSelectedLine } = useDetailStore.getState();
                let finalLineIndex = selectedLineIndex;
                
                // 如果用户没有手动选择线路，则自动测速选择最快的线路
                if (!userSelectedLine) {
                  const fastestLineIndex = await LineSpeedTest.findFastestLine(
                    latestDetail.play_sources,
                    episodeIndex,
                    5000 // 5秒超时
                  );
                  
                  // 更新选中的线路索引
                  if (fastestLineIndex !== selectedLineIndex) {
                    logger.info(`[INFO] Auto-switching to fastest line: ${fastestLineIndex}`);
                    await useDetailStore.getState().setDetail(latestDetail, fastestLineIndex);
                    finalLineIndex = fastestLineIndex;
                  }
                } else {
                  logger.info(`[INFO] User manually selected line ${selectedLineIndex}, skipping auto speed test`);
                }
                
                const selectedLine = latestDetail.play_sources[finalLineIndex];
                if (selectedLine && selectedLine.episodes && selectedLine.episodes.length > 0) {
                  logger.info(`[INFO] Selected line: ${selectedLine.name} with ${selectedLine.episodes.length} episodes`);
                  episodes = selectedLine.episodes.map((episodeUrl, index) => ({
                    url: episodeUrl,
                    title: `第 ${index + 1} 集`,
                  }));
                } else {
                  // 如果选中的线路不存在，使用第一个线路
                  logger.warn(`[WARN] Selected line index ${finalLineIndex} out of range, using first line`);
                  const firstLine = latestDetail.play_sources[0];
                  if (firstLine && firstLine.episodes && firstLine.episodes.length > 0) {
                    logger.info(`[INFO] Using first line (${firstLine.name}): ${firstLine.episodes.length} episodes`);
                    episodes = firstLine.episodes.map((episodeUrl, index) => ({
                      url: episodeUrl,
                      title: `第 ${index + 1} 集`,
                    }));
                  }
                }
              } else {
                const allEpisodes = episodesSelectorBySource(latestDetail.source)(useDetailStore.getState());
                logger.info(`[INFO] All episodes length: ${allEpisodes.length}`);
                if (allEpisodes.length > 0) {
                  logger.info(`[INFO] Using ${allEpisodes.length} episodes from ${latestDetail.source}`);
                  episodes = allEpisodes.map((episodeUrl, index) => ({
                    url: episodeUrl,
                    title: `第 ${index + 1} 集`,
                  }));
                } else {
                  logger.warn(`[WARN] Cached detail source "${latestDetail.source}" has no episodes, trying provided source "${source}"`);
                  const providedEpisodes = episodesSelectorBySource(source)(useDetailStore.getState());
                  logger.info(`[INFO] Provided episodes length: ${providedEpisodes.length}`);
                  if (providedEpisodes.length > 0) {
                    logger.info(`[INFO] Using ${providedEpisodes.length} episodes from ${source}`);
                    episodes = providedEpisodes.map((episodeUrl, index) => ({
                      url: episodeUrl,
                      title: `第 ${index + 1} 集`,
                    }));
                  }
                }
              }
            }
          }

          // 最终验证：确保我们有有效的detail和episodes数据
          if (!latestDetail) {
            logger.error(`[ERROR] Final check failed: detail is null`);
            set({ isLoading: false });
            return;
          }
          
          if (!episodes || episodes.length === 0) {
            logger.error(`[ERROR] Final check failed: no episodes available for source "${latestDetail.source}" (${latestDetail.source_name})`);
            set({ isLoading: false });
            return;
          }
          
          logger.info(`[SUCCESS] Final validation passed - detail: ${latestDetail.source_name}, episodes: ${episodes.length}`);
          logger.info(`[SUCCESS] First episode URL: ${episodes[0].url.substring(0, 100)}...`);

          try {
            const storageStart = performance.now();
            logger.info(`[PERF] Storage operations START`);
            
            const playRecord = await PlayRecordManager.get(latestDetail.source, latestDetail.id.toString());
            const storagePlayRecordEnd = performance.now();
            logger.info(`[PERF] PlayRecordManager.get took ${(storagePlayRecordEnd - storageStart).toFixed(2)}ms`);
            
            const playerSettings = await PlayerSettingsManager.get(latestDetail.source, latestDetail.id.toString());
            const storageEnd = performance.now();
            logger.info(`[PERF] PlayerSettingsManager.get took ${(storageEnd - storagePlayRecordEnd).toFixed(2)}ms`);
            logger.info(`[PERF] Total storage operations took ${(storageEnd - storageStart).toFixed(2)}ms`);
            
            const initialPositionFromRecord = playRecord?.play_time ? playRecord.play_time * 1000 : 0;
            const savedPlaybackRate = playerSettings?.playbackRate || 1.0;
            
            // 确定播放的集数索引：优先使用 playRecord 中保存的集数，否则使用传入的 episodeIndex
            // playRecord.index 是 1-based，需要转换为 0-based
            const savedEpisodeIndex = playRecord?.index ? playRecord.index - 1 : episodeIndex;
            // 确保索引在有效范围内
            const validEpisodeIndex = Math.max(0, Math.min(savedEpisodeIndex, episodes.length - 1));
            logger.info(`[INFO] Episode index - requested: ${episodeIndex}, saved: ${playRecord?.index}, final: ${validEpisodeIndex}`);
            
            const episodesMappingStart = performance.now();
            const mappedEpisodes = episodes.map((ep, index) => ({
              url: typeof ep === 'string' ? ep : ep.url,
              title: typeof ep === 'string' ? `第 ${index + 1} 集` : ep.title || `第 ${index + 1} 集`,
            }));
            const episodesMappingEnd = performance.now();
            logger.info(`[PERF] Episodes mapping (${episodes.length} episodes) took ${(episodesMappingEnd - episodesMappingStart).toFixed(2)}ms`);
            
            set({
              isLoading: false,
              currentEpisodeIndex: validEpisodeIndex,
              initialPosition: position || initialPositionFromRecord,
              playbackRate: savedPlaybackRate,
              episodes: mappedEpisodes,
              introEndTime: playRecord?.introEndTime || playerSettings?.introEndTime,
              outroStartTime: playRecord?.outroStartTime || playerSettings?.outroStartTime,
            });
            
            const perfEnd = performance.now();
            logger.info(`[PERF] PlayerStore.loadVideo COMPLETE - total time: ${(perfEnd - perfStart).toFixed(2)}ms`);
            
          } catch (error) {
            logger.debug("Failed to load play record", error);
            set({ isLoading: false });
            
            const perfEnd = performance.now();
            logger.info(`[PERF] PlayerStore.loadVideo ERROR - total time: ${(perfEnd - perfStart).toFixed(2)}ms`);
          }
        })(),
        timeoutPromise
      ]);
    } catch (error) {
      logger.error(`[ERROR] PlayerStore.loadVideo timeout or error:`, error);
      set({ isLoading: false });
      
      // 检查是否是401未授权错误
      const errorMessage = error instanceof Error ? error.message : "加载失败";
      if (errorMessage === 'UNAUTHORIZED') {
        logger.error(`[ERROR] 401 Unauthorized error detected in PlayerStore.loadVideo`);
        // 调用authStore的handleUnauthorized方法
        useAuthStore.getState().handleUnauthorized();
      }
      
      const perfEnd = performance.now();
      logger.info(`[PERF] PlayerStore.loadVideo TIMEOUT - total time: ${(perfEnd - perfStart).toFixed(2)}ms`);
    }
  },

  playEpisode: async (index) => {
    const { episodes, videoRef } = get();
    if (index >= 0 && index < episodes.length) {
      set({
        currentEpisodeIndex: index,
        showNextEpisodeOverlay: false,
        initialPosition: 0,
        progressPosition: 0,
        seekPosition: 0,
      });
      try {
        await videoRef?.current?.replayAsync();
      } catch (error) {
        logger.debug("Failed to replay video:", error);
        Toast.show({ type: "error", text1: "播放失败" });
      }
    }
  },

  togglePlayPause: async () => {
    const { status, videoRef } = get();
    console.log(`[DEBUG] togglePlayPause called - status?.isLoaded: ${status?.isLoaded}, isPlaying: ${status?.isPlaying}`);
    if (status?.isLoaded) {
      try {
        if (status.isPlaying) {
          console.log('[DEBUG] Pausing video...');
          await videoRef?.current?.pauseAsync();
          console.log('[DEBUG] Video paused');
        } else {
          console.log('[DEBUG] Playing video...');
          await videoRef?.current?.playAsync();
          console.log('[DEBUG] Video playing');
        }
      } catch (error) {
        logger.debug("Failed to toggle play/pause:", error);
        Toast.show({ type: "error", text1: "操作失败" });
      }
    } else {
      console.log('[DEBUG] Video not loaded, cannot toggle play/pause');
    }
  },

  seek: async (duration) => {
    const { status, videoRef, isSeeking, seekPosition } = get();
    console.log('[SEEK] Called with duration:', duration);
    console.log('[SEEK] status?.isLoaded:', status?.isLoaded);
    console.log('[SEEK] status?.durationMillis:', status?.durationMillis);
    console.log('[SEEK] videoRef?.current:', !!videoRef?.current);

    if (!status?.isLoaded || !status.durationMillis) {
      console.log('[SEEK] Early return - status not loaded or no duration');
      return;
    }

    // 如果duration是绝对位置（大于总时长的一半），直接使用它作为目标位置
    // 否则，将它作为相对偏移量处理
    let newPosition: number;
    if (Math.abs(duration) > status.durationMillis / 2) {
      // duration是绝对位置
      newPosition = Math.max(0, Math.min(duration, status.durationMillis));
      console.log('[SEEK] Using absolute position:', newPosition);
    } else {
      // duration是相对偏移量
      // 如果在seeking状态，使用seekPosition作为基准位置，否则使用当前播放位置
      // 这样可以避免连续seek时位置计算错误
      const basePosition = isSeeking && seekPosition > 0
        ? seekPosition * status.durationMillis
        : status.positionMillis;
      newPosition = Math.max(0, Math.min(basePosition + duration, status.durationMillis));
      console.log('[SEEK] Base position:', basePosition);
    }
    console.log('[SEEK] New position:', newPosition);

    try {
      await videoRef?.current?.setPositionAsync(newPosition);
      console.log('[SEEK] setPositionAsync success');
    } catch (error) {
      console.log('[SEEK] Failed to seek video:', error);
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
        text2: "片头时间已记录。",
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
        text2: "片尾时间已记录。",
      });
    }
  },

  _savePlayRecord: (updates = {}, options = {}) => {
    const { immediate = false } = options;
    if (!immediate) {
      if (get()._isRecordSaveThrottled) {
        return;
      }
      set({ _isRecordSaveThrottled: true });
      setTimeout(() => {
        set({ _isRecordSaveThrottled: false });
      }, 10000); // 10 seconds
    }

    const { detail } = useDetailStore.getState();
    const { currentEpisodeIndex, episodes, status, introEndTime, outroStartTime } = get();
    if (detail && status?.isLoaded) {
      const existingRecord = {
        introEndTime,
        outroStartTime,
      };
      PlayRecordManager.save(detail.source, detail.id.toString(), {
        title: detail.title,
        cover: detail.poster || "",
        index: currentEpisodeIndex + 1,
        total_episodes: episodes.length,
        play_time: Math.floor(status.positionMillis / 1000),
        total_time: status.durationMillis ? Math.floor(status.durationMillis / 1000) : 0,
        source_name: detail.source_name,
        year: detail.year || "",
        ...existingRecord,
      });
    }
  },

  handlePlaybackStatusUpdate: (newStatus) => {
    if (!newStatus.isLoaded) {
      if (!newStatus.isLoaded && 'error' in newStatus) {
        logger.debug(`Playback Error: ${String(newStatus.error || 'Unknown error')}`);
        // 处理播放错误，尝试切换线路
        get().handleLineError();
      }
      set({ status: newStatus });
      return;
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
      get()._savePlayRecord();

      const isNearEnd = newStatus.positionMillis / newStatus.durationMillis > 0.95;
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

    const progressPosition = newStatus.durationMillis ? newStatus.positionMillis / newStatus.durationMillis : 0;
    set({ status: newStatus, progressPosition });
  },

  setLoading: (loading) => set({ isLoading: loading }),
  setShowControls: (show) => set({ showControls: show }),
  setShowEpisodeModal: (show) => set({ showEpisodeModal: show }),
  setShowSourceModal: (show) => set({ showSourceModal: show }),
  setShowSpeedModal: (show) => set({ showSpeedModal: show }),
  setShowLineModal: (show) => set({ showLineModal: show }),
  setShowNextEpisodeOverlay: (show) => set({ showNextEpisodeOverlay: show }),

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

  reset: () => {
    set({
      episodes: [],
      currentEpisodeIndex: 0,
      status: null,
      isLoading: true,
      showControls: false,
      showEpisodeModal: false,
      showSourceModal: false,
      showSpeedModal: false,
      showLineModal: false,
      showNextEpisodeOverlay: false,
      initialPosition: 0,
      playbackRate: 1.0,
      introEndTime: undefined,
      outroStartTime: undefined,
    });
  },

  handleLineError: async () => {
    const perfStart = performance.now();
    logger.error(`[LINE_ERROR] Handling playback error, trying to switch line`);
    
    const detailStoreState = useDetailStore.getState();
    const { detail, selectedLineIndex } = detailStoreState;
    const { currentEpisodeIndex } = get();
    
    if (!detail) {
      logger.error(`[LINE_ERROR] Cannot switch line - no detail available`);
      return;
    }
    
    // 检查是否有多个线路
    if (detail.play_sources && detail.play_sources.length > 1) {
      logger.info(`[LINE_ERROR] Multiple lines available: ${detail.play_sources.length}`);
      
      // 尝试切换到下一个线路
      const nextLineIndex = (selectedLineIndex + 1) % detail.play_sources.length;
      logger.info(`[LINE_ERROR] Switching from line ${selectedLineIndex + 1} to ${nextLineIndex + 1}`);
      
      try {
        // 更新选中的线路
        await useDetailStore.getState().setDetail(detail, nextLineIndex);
        
        // 重新加载视频
        await get().loadVideo({
          source: detail.source,
          id: detail.id.toString(),
          episodeIndex: currentEpisodeIndex,
          title: detail.title
        });
        
        const perfEnd = performance.now();
        logger.info(`[LINE_ERROR] Successfully switched to line ${nextLineIndex + 1} in ${(perfEnd - perfStart).toFixed(2)}ms`);
        
        Toast.show({ 
          type: "success", 
          text1: "已切换线路", 
          text2: `正在使用 ${detail.play_sources[nextLineIndex].name}` 
        });
        
        return; // 成功切换线路，结束处理
      } catch (error) {
        logger.error(`[LINE_ERROR] Failed to switch line:`, error);
      }
    } else {
      logger.info(`[LINE_ERROR] Only one line available, switching to next source`);
    }
    
    // 如果只有一个线路或切换线路失败，尝试切换播放源
    logger.info(`[LINE_ERROR] All lines failed, switching to next source`);
    const currentSource = detail.source;
    const errorReason = `All lines failed for source ${currentSource}`;
    useDetailStore.getState().markSourceAsFailed(currentSource, errorReason);
    
    // 获取下一个可用的source
    const fallbackSource = useDetailStore.getState().getNextAvailableSource(currentSource, currentEpisodeIndex);
    
    if (!fallbackSource) {
      logger.error(`[LINE_ERROR] No fallback sources available for episode ${currentEpisodeIndex + 1}`);
      Toast.show({ 
        type: "error", 
        text1: "播放失败", 
        text2: "所有播放源都不可用，请稍后重试" 
      });
      set({ isLoading: false });
      return;
    }
    
    logger.info(`[LINE_ERROR] Switching to fallback source: ${fallbackSource.source} (${fallbackSource.source_name})`);
    
    try {
      // 更新DetailStore的当前detail为fallback source
      await useDetailStore.getState().setDetail(fallbackSource);
      
      // 重新加载视频
      await get().loadVideo({
        source: fallbackSource.source,
        id: fallbackSource.id.toString(),
        episodeIndex: currentEpisodeIndex,
        title: fallbackSource.title
      });
      
      const perfEnd = performance.now();
      logger.info(`[LINE_ERROR] Successfully switched to fallback source in ${(perfEnd - perfStart).toFixed(2)}ms`);
      
      Toast.show({ 
        type: "success", 
        text1: "已切换播放源", 
        text2: `正在使用 ${fallbackSource.source_name}` 
      });
    } catch (error) {
      logger.error(`[LINE_ERROR] Failed to switch to fallback source:`, error);
      set({ isLoading: false });
    }
  },

  handleVideoError: async (errorType: 'ssl' | 'network' | 'other', failedUrl: string) => {
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
    
    // 标记当前source为失败
    const currentSource = detail.source;
    const errorReason = `${errorType} error: ${failedUrl.substring(0, 100)}...`;
    useDetailStore.getState().markSourceAsFailed(currentSource, errorReason);
    
    // 获取下一个可用的source
    const fallbackSource = useDetailStore.getState().getNextAvailableSource(currentSource, currentEpisodeIndex);
    
    if (!fallbackSource) {
      logger.error(`[VIDEO_ERROR] No fallback sources available for episode ${currentEpisodeIndex + 1}`);
      Toast.show({ 
        type: "error", 
        text1: "播放失败", 
        text2: "所有播放源都不可用，请稍后重试" 
      });
      set({ isLoading: false });
      return;
    }
    
    logger.info(`[VIDEO_ERROR] Switching to fallback source: ${fallbackSource.source} (${fallbackSource.source_name})`);
    
    try {
      // 更新DetailStore的当前detail为fallback source
      await useDetailStore.getState().setDetail(fallbackSource);
      
      // 重新加载当前集数的episodes
      const newEpisodes = fallbackSource.episodes || [];
      if (newEpisodes.length > currentEpisodeIndex) {
        const mappedEpisodes = newEpisodes.map((ep, index) => ({
          url: ep,
          title: `第 ${index + 1} 集`,
        }));
        
        set({
          episodes: mappedEpisodes,
          isLoading: false, // 让Video组件重新渲染
        });
        
        const perfEnd = performance.now();
        logger.info(`[VIDEO_ERROR] Successfully switched to fallback source in ${(perfEnd - perfStart).toFixed(2)}ms`);
        logger.info(`[VIDEO_ERROR] New episode URL: ${newEpisodes[currentEpisodeIndex].substring(0, 100)}...`);
        
        Toast.show({ 
          type: "success", 
          text1: "已切换播放源", 
          text2: `正在使用 ${fallbackSource.source_name}` 
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
}));

export default usePlayerStore;

export const selectCurrentEpisode = (state: PlayerState) => {
  // 增强数据安全性检查
  if (
    state.episodes &&
    Array.isArray(state.episodes) &&
    state.episodes.length > 0 &&
    state.currentEpisodeIndex >= 0 &&
    state.currentEpisodeIndex < state.episodes.length
  ) {
    const episode = state.episodes[state.currentEpisodeIndex];
    // 确保episode有有效的URL
    if (episode && episode.url && episode.url.trim() !== "") {
      return episode;
    } else {
      // 仅在调试模式下打印
      if (__DEV__) {
        logger.debug(`[PERF] selectCurrentEpisode - episode found but invalid URL: ${episode?.url}`);
      }
    }
  } else {
    // 仅在调试模式下打印
    if (__DEV__) {
      logger.debug(`[PERF] selectCurrentEpisode - no valid episode: episodes.length=${state.episodes?.length}, currentIndex=${state.currentEpisodeIndex}`);
    }
  }
  return undefined;
};

