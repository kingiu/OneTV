import { create } from "zustand";
import { SearchResult, api } from "../services/api";
import { getResolutionFromM3U8 } from "../services/m3u8";
import { useSettingsStore } from "./settingsStore";
import { FavoriteManager } from "../services/storage";
import { useAuthStore } from "./authStore";
import Logger from "../utils/Logger";

const logger = Logger.withTag('DetailStore');

console.log('=== DetailStore loaded ===');

export type SearchResultWithResolution = SearchResult & { resolution?: string | null };

interface DetailState {
  q: string | null;
  searchResults: SearchResultWithResolution[];
  sources: { source: string; source_name: string; resolution: string | null | undefined }[];
  detail: SearchResultWithResolution | null;
  loading: boolean;
  error: string | null;
  allSourcesLoaded: boolean;
  controller: AbortController | null;
  isFavorited: boolean;
  failedSources: Set<string>;
  selectedLineIndex: number;
  userSelectedLine: boolean;

  init: (q: string, preferredSource?: string, id?: string) => Promise<void>;
  setDetail: (detail: SearchResultWithResolution, lineIndex: number, userSelected?: boolean) => Promise<void>;
  abort: () => void;
  toggleFavorite: () => Promise<void>;
  markSourceAsFailed: (source: string, reason: string) => void;
  getNextAvailableSource: (currentSource: string, episodeIndex: number) => SearchResultWithResolution | null;
}

const useDetailStore = create<DetailState>((set, get) => ({
  q: null,
  searchResults: [],
  sources: [],
  detail: null,
  loading: false,
  error: null,
  allSourcesLoaded: false,
  controller: null,
  isFavorited: false,
  failedSources: new Set<string>(),
  selectedLineIndex: 0,
  userSelectedLine: false,

  init: async (q, preferredSource, id) => {
    console.log('=== DetailStore.init START ===', { q, preferredSource, id });
    const perfStart = performance.now();
    logger.info(`[PERF] DetailStore.init START - q: ${q}, preferredSource: ${preferredSource}, id: ${id}`);
    
    const { controller: oldController } = get();
    if (oldController) {
      oldController.abort();
    }
    const newController = new AbortController();
    const signal = newController.signal;

    set({
      q,
      loading: true,
      searchResults: [],
      detail: null,
      error: null,
      allSourcesLoaded: false,
      controller: newController,
      userSelectedLine: false,
    });

    const { videoSource } = useSettingsStore.getState();

    const processAndSetResults = async (results: SearchResult[], merge = false) => {
      const resolutionStart = performance.now();
      logger.info(`[PERF] Resolution detection START - processing ${results.length} sources`);
      
      const resultsWithResolution = await Promise.all(
        results.map(async (searchResult) => {
          let resolution;
          const m3u8Start = performance.now();
          try {
            if (searchResult.episodes && searchResult.episodes.length > 0) {
              resolution = await getResolutionFromM3U8(searchResult.episodes[0], signal);
            }
          } catch (e) {
            if ((e as Error).name !== "AbortError") {
              logger.info(`Failed to get resolution for ${searchResult.source_name}`, e);
            }
          }
          const m3u8End = performance.now();
          logger.info(`[PERF] M3U8 resolution for ${searchResult.source_name}: ${(m3u8End - m3u8Start).toFixed(2)}ms (${resolution || 'failed'})`);
          return { ...searchResult, resolution };
        })
      );
      
      const resolutionEnd = performance.now();
      logger.info(`[PERF] Resolution detection COMPLETE - took ${(resolutionEnd - resolutionStart).toFixed(2)}ms`);

      if (signal.aborted) return;

      set((state) => {
        // 不使用去重逻辑，确保所有视频源的结果都被保留
        const finalResults = merge ? [...state.searchResults, ...resultsWithResolution] : resultsWithResolution;

        // 调试：打印所有结果的线路数量
        console.log('=== 处理搜索结果 ===');
        finalResults.forEach((result, index) => {
          console.log(`结果 ${index}: ${result.source_name}, 线路数量: ${result.episodes?.length || 0}`);
        });

        // 优先选择包含play_sources的结果作为detail
        let selectedDetail = state.detail;
        if (!selectedDetail) {
          // 首先查找包含play_sources的结果
          selectedDetail = (finalResults.find(r => r.play_sources && r.play_sources.length > 0) || finalResults[0]) ?? null;
        }
        return {
          searchResults: finalResults,
          sources: finalResults.map((r) => ({
            source: r.source,
            source_name: r.source_name,
            resolution: r.resolution,
          })),
          detail: selectedDetail,
        };
      });
    };

    // 添加API请求超时处理
    const timeoutPromise = new Promise<never>((_, reject) => {
      setTimeout(() => {
        reject(new Error('API request timeout'));
      }, 25000); // 25秒超时
    });

    try {
      // 包装整个操作以支持超时
      await Promise.race([
        (async () => {
          // 直接获取所有资源并逐个搜索
          const searchAllStart = performance.now();
          logger.info(`[PERF] API searchVideos (all resources) START - query: "${q}"`);
          
          try {
            const allResources = await api.getResources(signal);
            logger.info(`[STANDARD] 获取到 ${allResources.length} 个资源`);
            console.log('=== 获取到的资源 ===');
            allResources.forEach((resource, index) => {
              console.log(`资源 ${index}: ${resource.name} (${resource.key})`);
            });
            
            const enabledResources = videoSource.enabledAll
              ? allResources
              : allResources.filter((r) => videoSource.sources[r.key]);
            logger.info(`[STANDARD] 启用的资源数量: ${enabledResources.length}, enabledAll: ${videoSource.enabledAll}`);
            console.log('=== 启用的资源 ===');
            enabledResources.forEach((resource, index) => {
              console.log(`启用资源 ${index}: ${resource.name} (${resource.key})`);
            });
            
            const searchPromises = enabledResources.map(async (resource) => {
              try {
                logger.info(`[STANDARD] 正在搜索资源: ${resource.name} (${resource.key})`);
                console.log(`=== 正在搜索资源: ${resource.name} (${resource.key}) ===`);
                const { results } = await api.searchVideo(q, resource.key, signal);
                logger.info(`[STANDARD] 资源 ${resource.name} 返回 ${results.length} 个结果`);
                console.log(`=== 资源 ${resource.name} 返回 ${results.length} 个结果 ===`);
                if (results.length > 0) {
                  await processAndSetResults(results, true);
                }
              } catch (error) {
                logger.warn(`[WARN] Search failed for ${resource.name}:`, error);
                console.log(`=== 搜索 ${resource.name} 失败:`, error);
                
                // 检查是否是401未授权错误
                if (error instanceof Error && error.message === 'UNAUTHORIZED') {
                  logger.error(`[ERROR] 401 Unauthorized error detected for ${resource.name}`);
                  // 抛出错误以便上层处理
                  throw error;
                }
              }
            });
            
            await Promise.all(searchPromises);
            
            const searchAllEnd = performance.now();
            logger.info(`[PERF] API searchVideos (all resources) END - took ${(searchAllEnd - searchAllStart).toFixed(2)}ms`);
            
            const finalState = get();
            if (finalState.searchResults.length > 0) {
              set({ loading: false });
              logger.info(`[SUCCESS] Standard search completed, total results: ${finalState.searchResults.length}`);
              console.log(`=== 搜索完成，总共找到 ${finalState.searchResults.length} 个结果 ===`);
            } else {
              logger.error(`[ERROR] No results found for "${q}"`);
              set({ 
                error: `未找到 "${q}" 的播放源，请尝试其他关键词或稍后重试`,
                loading: false 
              });
            }
          } catch (error) {
            logger.error(`[ERROR] API search failed:`, error);
            set({ 
              error: `搜索失败：${error instanceof Error ? error.message : '网络错误，请稍后重试'}`,
              loading: false 
            });
            return;
          }

          const favoriteCheckStart = performance.now();
          const finalState = get();
          
          // 最终检查：如果所有搜索都完成但仍然没有结果
          if (finalState.searchResults.length === 0 && !finalState.error) {
            logger.error(`[ERROR] All search attempts completed but no results found for "${q}"`);
            set({ error: `未找到 "${q}" 的播放源，请检查标题拼写或稍后重试` });
          } else if (finalState.searchResults.length > 0) {
            logger.info(`[SUCCESS] DetailStore.init completed successfully with ${finalState.searchResults.length} sources`);
          }

          if (finalState.detail) {
            const { source, id } = finalState.detail;
            logger.info(`[INFO] Checking favorite status for source: ${source}, id: ${id}`);
            try {
              const isFavorited = await FavoriteManager.isFavorited(source, id.toString());
              set({ isFavorited });
              logger.info(`[INFO] Favorite status: ${isFavorited}`);
            } catch (favoriteError) {
              logger.warn(`[WARN] Failed to check favorite status:`, favoriteError);
            }
          } else {
            logger.warn(`[WARN] No detail found after all search attempts for "${q}"`);
          }
          
          const favoriteCheckEnd = performance.now();
          logger.info(`[PERF] Favorite check took ${(favoriteCheckEnd - favoriteCheckStart).toFixed(2)}ms`);
        })(),
        timeoutPromise
      ]);
    } catch (e) {
      if ((e as Error).name !== "AbortError") {
        logger.error(`[ERROR] DetailStore.init caught unexpected error:`, e);
        const errorMessage = e instanceof Error ? e.message : "获取数据失败";
        
        // 检查是否是401未授权错误
        if (errorMessage === 'UNAUTHORIZED') {
          logger.error(`[ERROR] 401 Unauthorized error detected in DetailStore.init`);
          set({ 
            error: `登录已过期，请重新登录`, 
            loading: false 
          });
          // 调用authStore的handleUnauthorized方法
          await useAuthStore.getState().handleUnauthorized();
        } else {
          set({ error: `搜索失败：${errorMessage}`, loading: false });
        }
      } else {
        logger.info(`[INFO] DetailStore.init aborted by user`);
      }
    } finally {
      if (!signal.aborted) {
        set({ loading: false, allSourcesLoaded: true });
        logger.info(`[INFO] DetailStore.init cleanup completed`);
      }
      
      const perfEnd = performance.now();
      logger.info(`[PERF] DetailStore.init COMPLETE - total time: ${(perfEnd - perfStart).toFixed(2)}ms`);
    }
  },

  setDetail: async (detail, lineIndex = 0, userSelected = false) => {
    set({ detail, selectedLineIndex: lineIndex, userSelectedLine: userSelected });
    const { source, id } = detail;
    const isFavorited = await FavoriteManager.isFavorited(source, id.toString());
    set({ isFavorited });
  },

  abort: () => {
    get().controller?.abort();
  },

  toggleFavorite: async () => {
    const { detail } = get();
    if (!detail) return;

    const { source, id, title, poster, source_name, episodes, year } = detail;
    const favoriteItem = {
      cover: poster,
      title,
      poster,
      source_name,
      total_episodes: episodes.length,
      search_title: get().q!,
      year: year || "",
    };

    const newIsFavorited = await FavoriteManager.toggle(source, id.toString(), favoriteItem);
    set({ isFavorited: newIsFavorited });
  },

  markSourceAsFailed: (source: string, reason: string) => {
    const { failedSources } = get();
    const newFailedSources = new Set(failedSources);
    newFailedSources.add(source);
    
    logger.warn(`[SOURCE_FAILED] Marking source "${source}" as failed due to: ${reason}`);
    logger.info(`[SOURCE_FAILED] Total failed sources: ${newFailedSources.size}`);
    
    set({ failedSources: newFailedSources });
  },

  getNextAvailableSource: (currentSource: string, episodeIndex: number) => {
    const { searchResults, failedSources } = get();
    
    logger.info(`[SOURCE_SELECTION] Looking for alternative to "${currentSource}" for episode ${episodeIndex + 1}`);
    logger.info(`[SOURCE_SELECTION] Failed sources: [${Array.from(failedSources).join(', ')}]`);
    
    // 过滤掉当前source和已失败的sources
    const availableSources = searchResults.filter(result => 
      result.source !== currentSource && 
      !failedSources.has(result.source) &&
      result.episodes && 
      result.episodes.length > episodeIndex
    );
    
    logger.info(`[SOURCE_SELECTION] Available sources: ${availableSources.length}`);
    availableSources.forEach(source => {
      logger.info(`[SOURCE_SELECTION] - ${source.source} (${source.source_name}): ${source.episodes?.length || 0} episodes`);
    });
    
    if (availableSources.length === 0) {
      logger.error(`[SOURCE_SELECTION] No available sources for episode ${episodeIndex + 1}`);
      return null;
    }
    
    // 优先选择有高分辨率的source
    const sortedSources = availableSources.sort((a, b) => {
      const aResolution = a.resolution || '';
      const bResolution = b.resolution || '';
      
      // 优先级: 1080p > 720p > 其他 > 无分辨率
      const resolutionPriority = (res: string) => {
        if (res.includes('1080')) return 4;
        if (res.includes('720')) return 3;
        if (res.includes('480')) return 2;
        if (res.includes('360')) return 1;
        return 0;
      };
      
      return resolutionPriority(bResolution) - resolutionPriority(aResolution);
    });
    
    const selectedSource = sortedSources[0];
    logger.info(`[SOURCE_SELECTION] Selected fallback source: ${selectedSource.source} (${selectedSource.source_name}) with resolution: ${selectedSource.resolution || 'unknown'}`);
    
    return selectedSource;
  },
}));

export const sourcesSelector = (state: DetailState) => state.sources;
export default useDetailStore;

// 导出episodesSelectorBySource函数，供playerStore使用
export const episodesSelectorBySource = (source: string) => (state: DetailState) => {
  const searchResult = state.searchResults.find(r => r.source === source);
  if (!searchResult) return [];
  
  // 如果有play_sources字段，合并所有线路的episodes
  if (searchResult.play_sources && searchResult.play_sources.length > 0) {
    const allEpisodes: string[] = [];
    searchResult.play_sources.forEach(source => {
      allEpisodes.push(...source.episodes);
    });
    return allEpisodes;
  }
  
  // 兼容旧版本，使用episodes字段
  return searchResult.episodes || [];
};
