import { create } from "zustand";
import { SearchResult, api } from "@/services/api";
import { getResolutionFromM3U8 } from "@/services/m3u8";
import { useSettingsStore } from "@/stores/settingsStore";
import { FavoriteManager } from "@/services/storage";
import Logger from "@/utils/Logger";

const logger = Logger.withTag('DetailStore');

export interface PlaySource {
  name: string;
  episodes: string[];
  episodes_titles: string[];
}

export type SearchResultWithResolution = SearchResult & { resolution?: string | null; play_sources?: PlaySource[] };

interface DetailState {
  q: string | null;
  year: string | null;
  doubanId: string | null;
  searchResults: SearchResultWithResolution[];
  sources: { source: string; source_name: string; resolution: string | null | undefined }[];
  resourceWeights: { [key: string]: number }; // 后端返回的资源权重
  detail: SearchResultWithResolution | null;
  loading: boolean;
  error: string | null;
  allSourcesLoaded: boolean;
  controller: AbortController | null;
  isFavorited: boolean;
  failedSources: Set<string>; // 记录失败的source列表

  init: (q: string, preferredSource?: string, id?: string, year?: string, doubanId?: string) => Promise<void>;
  setDetail: (detail: SearchResultWithResolution) => Promise<void>;
  abort: () => void;
  toggleFavorite: () => Promise<void>;
  markSourceAsFailed: (source: string, reason: string) => void;
  getNextAvailableSource: (currentSource: string, episodeIndex: number) => SearchResultWithResolution | null;
  selectBestSource: (episodeIndex?: number) => Promise<SearchResultWithResolution | null>;
  testSourceSpeed: (url: string) => Promise<number>;
}

const useDetailStore = create<DetailState>((set, get) => ({
  q: null,
  year: null,
  doubanId: null,
  searchResults: [],
  sources: [],
  resourceWeights: {},
  detail: null,
  loading: true,
  error: null,
  allSourcesLoaded: false,
  controller: null,
  isFavorited: false,
  failedSources: new Set(),

  init: async (q, preferredSource, id, year, doubanId) => {
    const perfStart = performance.now();
    logger.info(`[PERF] DetailStore.init START - q: ${q}, preferredSource: ${preferredSource}, id: ${id}, year: ${year}, doubanId: ${doubanId}`);
    
    const { controller: oldController } = get();
    if (oldController) {
      oldController.abort();
    }
    const newController = new AbortController();
    const signal = newController.signal;

    set({
      q,
      year: year || null,
      doubanId: doubanId || null,
      loading: true,
      searchResults: [],
      detail: null,
      error: null,
      allSourcesLoaded: false,
      controller: newController,
      failedSources: new Set(),
    });

    const { videoSource } = useSettingsStore.getState();

    const matchesSearchQuery = (
      item: SearchResult, 
      queryTitle: string, 
      queryYear: string | null | undefined, 
      queryDoubanId: string | null | undefined
    ): boolean => {
      // 1. 优先使用 doubanId 匹配
      if (queryDoubanId && item.doubanId) {
        return item.doubanId === queryDoubanId;
      }
      
      // 2. 标题匹配是必须的
      const titleMatches = item.title === queryTitle;
      if (!titleMatches) return false;
      
      // 3. 年份匹配
      if (queryYear) {
        const itemYear = item.year?.toString() || '';
        if (itemYear !== queryYear) return false;
      }
      
      // 4. 类型匹配（确保电影匹配电影，电视剧匹配电视剧）
      if (queryDoubanId) {
        // 从豆瓣 ID 推断类型：电影以 '1' 开头，电视剧以 '2' 开头
        const isMovie = queryDoubanId.startsWith('1');
        const isTV = queryDoubanId.startsWith('2');
        
        if (isMovie && item.type !== 'movie') return false;
        if (isTV && item.type !== 'tv') return false;
      }
      
      // 5. 针对中文剧集的额外匹配条件
      if (queryTitle === '危险关系') {
        // 检查是否为中文剧集
        if (item.countries) {
          const isChinese = item.countries.some(country => 
            country.includes('中国') || country.includes('中国大陆') || country.includes('香港') || country.includes('台湾')
          );
          if (!isChinese) return false;
        }
        
        // 检查语言
        if (item.languages) {
          const isChineseLanguage = item.languages.some(lang => 
            lang.includes('中文') || lang.includes('汉语') || lang.includes('Mandarin')
          );
          if (!isChineseLanguage) return false;
        }
      }
      
      return true;
    };

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
          logger.info(`[DEBUG] Play sources for ${searchResult.source_name}: ${searchResult.play_sources?.length || 0}`);
          logger.info(`[DEBUG] vod_play_from: ${searchResult.vod_play_from}`);
          logger.info(`[DEBUG] vod_play_url: ${searchResult.vod_play_url}`);
          return { ...searchResult, resolution };
        })
      );
      
      const resolutionEnd = performance.now();
      logger.info(`[PERF] Resolution detection COMPLETE - took ${(resolutionEnd - resolutionStart).toFixed(2)}ms`);

      if (signal.aborted) return;

      set((state) => {
        // 同时根据 source 和 source_name 去重，避免相同名称的播放源重复显示
        let finalResults;
        if (merge) {
          const existingSources = new Set(state.searchResults.map((r) => r.source));
          const existingSourceNames = new Set(state.searchResults.map((r) => r.source_name));
          const newResults = resultsWithResolution.filter((r) => 
            !existingSources.has(r.source) && !existingSourceNames.has(r.source_name)
          );
          finalResults = [...state.searchResults, ...newResults];
        } else {
          // 初始加载时也要去重相同名称的播放源
          const seenSourceNames = new Set();
          finalResults = resultsWithResolution.filter((r) => {
            if (seenSourceNames.has(r.source_name)) {
              return false;
            }
            seenSourceNames.add(r.source_name);
            return true;
          });
        }

        // 优先选择最佳匹配的结果作为 detail
        let bestDetail = state.detail;
        if (!bestDetail) {
          // 首先尝试豆瓣 ID 匹配
          if (state.doubanId) {
            // 从所有结果中查找，不考虑source_name去重
            const allResults = merge ? [...state.searchResults, ...resultsWithResolution] : resultsWithResolution;
            bestDetail = allResults.find((r) => 
              r.doubanId === state.doubanId
            );
          }
          // 然后尝试年份匹配
          if (!bestDetail && state.year) {
            // 从所有结果中查找，不考虑source_name去重
            const allResults = merge ? [...state.searchResults, ...resultsWithResolution] : resultsWithResolution;
            bestDetail = allResults.find((r) => 
              r.year?.toString() === state.year
            );
          }
          // 如果没有匹配，选择第一个结果
          if (!bestDetail) {
            bestDetail = finalResults[0] ?? null;
          }
        }

        // 对于"危险关系"特殊处理，确保选择2026年版本
        if (state.q === '危险关系' && state.year === '2026' && bestDetail && bestDetail.year?.toString() !== '2026') {
          // 从所有结果中查找2026年版本，不考虑source_name去重
          const allResults = merge ? [...state.searchResults, ...resultsWithResolution] : resultsWithResolution;
          const yearMatchDetail = allResults.find((r) => 
            r.year?.toString() === '2026'
          );
          if (yearMatchDetail) {
            bestDetail = yearMatchDetail;
          }
        }

        return {
          searchResults: finalResults,
          sources: finalResults.map((r) => ({
            source: r.source,
            source_name: r.source_name,
            resolution: r.resolution,
          })),
          detail: bestDetail,
        };
      });
    };

    try {
      // Optimization for favorite navigation
      if (preferredSource && id) {
        const searchPreferredStart = performance.now();
        logger.info(`[PERF] API searchVideo (preferred) START - source: ${preferredSource}, query: "${q}", id: ${id}`);
        
        let preferredResult: SearchResult[] = [];
        let preferredSearchError: any = null;
        
        try {
          const response = await api.searchVideo(q, id, signal);
          preferredResult = response.results;
        } catch (error) {
          preferredSearchError = error;
          logger.error(`[ERROR] API searchVideo (preferred) FAILED - source: ${preferredSource}, error:`, error);
          // 检查是否是API_URL_NOT_SET错误
          if ((error as Error).message === "API_URL_NOT_SET") {
            set({ 
              error: "API地址未设置，请在设置中配置API地址",
              loading: false 
            });
            return;
          }
        }
        
        const searchPreferredEnd = performance.now();
        logger.info(`[PERF] API searchVideo (preferred) END - took ${(searchPreferredEnd - searchPreferredStart).toFixed(2)}ms, results: ${preferredResult.length}, error: ${!!preferredSearchError}`);
        
        if (signal.aborted) return;
        
        // 检查preferred source结果
        if (preferredResult.length > 0) {
          logger.info(`[SUCCESS] Preferred source "${preferredSource}" found ${preferredResult.length} results for "${q}"`);
          const filteredPreferredResults = preferredResult.filter(item => matchesSearchQuery(item, q, year, doubanId));
          logger.info(`[PREFERRED] Filtered results: ${filteredPreferredResults.length} matches for "${q}" (year: ${year || 'any'}, doubanId: ${doubanId || 'none'})`);
          if (filteredPreferredResults.length > 0) {
            await processAndSetResults(filteredPreferredResults, false);
            set({ loading: false });
          } else {
            // 优先源没有匹配结果，降级到所有源
            logger.warn(`[FALLBACK] Preferred source "${preferredSource}" found no matching results, trying all sources`);
            // 立即尝试所有源，不再依赖后台搜索
            const fallbackStart = performance.now();
            logger.info(`[PERF] FALLBACK search (all sources) START - query: "${q}"`);
            
            try {
              const { results: allResults } = await api.searchVideos(q);
              const fallbackEnd = performance.now();
              logger.info(`[PERF] FALLBACK search END - took ${(fallbackEnd - fallbackStart).toFixed(2)}ms, total results: ${allResults.length}`);
              
              const filteredResults = allResults.filter(item => matchesSearchQuery(item, q, year, doubanId));
              logger.info(`[FALLBACK] Filtered results: ${filteredResults.length} matches for "${q}" (year: ${year || 'any'}, doubanId: ${doubanId || 'none'})`);
              
              if (filteredResults.length > 0) {
                logger.info(`[SUCCESS] FALLBACK search found results, proceeding with ${filteredResults[0].source_name}`);
                await processAndSetResults(filteredResults, false);
                set({ loading: false });
              } else {
                logger.error(`[ERROR] FALLBACK search found no matching results for "${q}"`);
                set({ 
                  error: `未找到 "${q}" 的播放源，请检查标题或稍后重试`,
                  loading: false 
                });
              }
            } catch (fallbackError) {
              logger.error(`[ERROR] FALLBACK search FAILED:`, fallbackError);
              // 检查是否是API_URL_NOT_SET错误
              if ((fallbackError as Error).message === "API_URL_NOT_SET") {
                set({ 
                  error: "API地址未设置，请在设置中配置API地址",
                  loading: false 
                });
              } else {
                set({ 
                  error: `搜索失败：${fallbackError instanceof Error ? fallbackError.message : '网络错误，请稍后重试'}`,
                  loading: false 
                });
              }
            }
          }
        } else {
          // 降级策略：preferred source失败时立即尝试所有源
          if (preferredSearchError) {
            logger.warn(`[FALLBACK] Preferred source "${preferredSource}" failed with error, trying all sources immediately`);
          } else {
            logger.warn(`[FALLBACK] Preferred source "${preferredSource}" returned 0 results for "${q}", trying all sources immediately`);
          }
          
          // 立即尝试所有源，不再依赖后台搜索
          const fallbackStart = performance.now();
          logger.info(`[PERF] FALLBACK search (all sources) START - query: "${q}"`);
          
          try {
            const { results: allResults } = await api.searchVideos(q);
            const fallbackEnd = performance.now();
            logger.info(`[PERF] FALLBACK search END - took ${(fallbackEnd - fallbackStart).toFixed(2)}ms, total results: ${allResults.length}`);
            
            const filteredResults = allResults.filter(item => matchesSearchQuery(item, q, year, doubanId));
            logger.info(`[FALLBACK] Filtered results: ${filteredResults.length} matches for "${q}" (year: ${year || 'any'}, doubanId: ${doubanId || 'none'})`);
            
            if (filteredResults.length > 0) {
              logger.info(`[SUCCESS] FALLBACK search found results, proceeding with ${filteredResults[0].source_name}`);
              await processAndSetResults(filteredResults, false);
              set({ loading: false });
            } else {
              logger.error(`[ERROR] FALLBACK search found no matching results for "${q}"`);
              set({ 
                error: `未找到 "${q}" 的播放源，请检查标题或稍后重试`,
                loading: false 
              });
            }
          } catch (fallbackError) {
            logger.error(`[ERROR] FALLBACK search FAILED:`, fallbackError);
            // 检查是否是API_URL_NOT_SET错误
            if ((fallbackError as Error).message === "API_URL_NOT_SET") {
              set({ 
                error: "API地址未设置，请在设置中配置API地址",
                loading: false 
              });
            } else {
              set({ 
                error: `搜索失败：${fallbackError instanceof Error ? fallbackError.message : '网络错误，请稍后重试'}`,
                loading: false 
              });
            }
          }
        }
        
        // 后台搜索（如果preferred source成功的话）
        if (preferredResult.length > 0) {
          const searchAllStart = performance.now();
          logger.info(`[PERF] API searchVideos (background) START`);
          
          try {
            const { results: allResults } = await api.searchVideos(q);
            
            const searchAllEnd = performance.now();
            logger.info(`[PERF] API searchVideos (background) END - took ${(searchAllEnd - searchAllStart).toFixed(2)}ms, results: ${allResults.length}`);
            
            if (signal.aborted) return;
            await processAndSetResults(allResults.filter(item => matchesSearchQuery(item, q, year, doubanId)), true);
          } catch (backgroundError) {
            logger.warn(`[WARN] Background search failed, but preferred source already succeeded:`, backgroundError);
          }
        }
      } else {
        // Standard navigation: fetch resources, then fetch details one by one
        const resourcesStart = performance.now();
        logger.info(`[PERF] API getResources START - query: "${q}"`);
        
        try {
          const allResources = await api.getResources(signal);
          
          const resourcesEnd = performance.now();
          logger.info(`[PERF] API getResources END - took ${(resourcesEnd - resourcesStart).toFixed(2)}ms, resources: ${allResources.length}`);
          
          // 保存后端返回的资源权重
          const weights: { [key: string]: number } = {};
          allResources.forEach(r => {
            weights[r.key] = r.weight;
          });
          set({ resourceWeights: weights });
          logger.info(`[INFO] Resource weights from backend: ${JSON.stringify(weights)}`);
          
          const enabledResources = videoSource.enabledAll
            ? allResources
            : allResources.filter((r) => videoSource.sources[r.key]);

          logger.info(`[PERF] Enabled resources: ${enabledResources.length}/${allResources.length}`);
          
          if (enabledResources.length === 0) {
            logger.error(`[ERROR] No enabled resources available for search`);
            set({ 
              error: "没有可用的视频源，请检查设置或联系管理员",
              loading: false 
            });
            return;
          }

          let firstResultFound = false;
          let totalResults = 0;
          const searchPromises = enabledResources.map(async (resource) => {
            try {
              const searchStart = performance.now();
              const { results } = await api.searchVideo(q, resource.key, signal);
              const searchEnd = performance.now();
              logger.info(`[PERF] API searchVideo (${resource.name}) took ${(searchEnd - searchStart).toFixed(2)}ms, results: ${results.length}`);
              
              if (results.length > 0) {
                const filteredResults = results.filter(item => matchesSearchQuery(item, q, year, doubanId));
                if (filteredResults.length > 0) {
                  totalResults += filteredResults.length;
                  logger.info(`[SUCCESS] Source "${resource.name}" found ${filteredResults.length} matching results for "${q}"`);
                  await processAndSetResults(filteredResults, true);
                  if (!firstResultFound) {
                    set({ loading: false }); // Stop loading indicator on first result
                    firstResultFound = true;
                    logger.info(`[SUCCESS] First matching result found from "${resource.name}", stopping loading indicator`);
                  }
                } else {
                  logger.warn(`[WARN] Source "${resource.name}" found no matching results for "${q}"`);
                }
              } else {
                logger.warn(`[WARN] Source "${resource.name}" returned 0 results for "${q}"`);
              }
            } catch (error) {
              logger.error(`[ERROR] Failed to fetch from ${resource.name}:`, error);
            }
          });

          await Promise.all(searchPromises);
          
          // 检查是否找到任何结果
          if (totalResults === 0) {
            logger.error(`[ERROR] All sources returned 0 results for "${q}"`);
            set({ 
              error: `未找到 "${q}" 的播放源，请尝试其他关键词或稍后重试`,
              loading: false 
            });
          } else {
            logger.info(`[SUCCESS] Standard search completed, total results: ${totalResults}`);
          }
        } catch (resourceError) {
          logger.error(`[ERROR] Failed to get resources:`, resourceError);
          set({ 
            error: `获取视频源失败：${resourceError instanceof Error ? resourceError.message : '网络错误，请稍后重试'}`,
            loading: false 
          });
          return;
        }
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
      
    } catch (e) {
      if ((e as Error).name !== "AbortError") {
        logger.error(`[ERROR] DetailStore.init caught unexpected error:`, e);
        const errorMessage = e instanceof Error ? e.message : "获取数据失败";
        set({ error: `搜索失败：${errorMessage}` });
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

  setDetail: async (detail) => {
    set({ detail });
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

  testSourceSpeed: async (url: string): Promise<number> => {
    try {
      const { proxyService } = await import('@/services/proxyService');
      const startTime = performance.now();
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 5000);

      const response = await proxyService.fetch(url, {
        signal: controller.signal,
        method: 'HEAD',
        redirect: 'follow',
      });

      clearTimeout(timeoutId);
      const endTime = performance.now();
      return endTime - startTime;
    } catch (error) {
      logger.warn(`[SPEED_TEST] Failed to test speed for ${url}:`, error);
      return Infinity;
    }
  },

  selectBestSource: async (episodeIndex = 0): Promise<SearchResultWithResolution | null> => {
    const { searchResults, failedSources, resourceWeights } = get();
    const { sourceWeights } = useSettingsStore.getState();

    logger.info(`[BEST_SOURCE] Selecting best source for episode ${episodeIndex + 1}`);
    logger.info(`[BEST_SOURCE] Available sources: ${searchResults.length}`);
    logger.info(`[BEST_SOURCE] Failed sources: [${Array.from(failedSources).join(', ')}]`);
    logger.info(`[BEST_SOURCE] Backend resource weights: ${JSON.stringify(resourceWeights)}`);
    logger.info(`[BEST_SOURCE] Local source weights: ${JSON.stringify(sourceWeights)}`);

    // 过滤掉已失败的sources和没有对应剧集的sources
    const availableSources = searchResults.filter(result =>
      !failedSources.has(result.source) &&
      result.episodes &&
      result.episodes.length > episodeIndex
    );

    if (availableSources.length === 0) {
      logger.error(`[BEST_SOURCE] No available sources for episode ${episodeIndex + 1}`);
      return null;
    }

    if (availableSources.length === 1) {
      logger.info(`[BEST_SOURCE] Only one source available: ${availableSources[0].source_name}`);
      return availableSources[0];
    }

    // 对每个源进行评分
    const sourceScores = await Promise.all(
      availableSources.map(async (source) => {
        // 1. 权重分数 (0-100) - 优先使用后端权重，其次使用本地配置
        const backendWeight = resourceWeights[source.source];
        const localWeight = sourceWeights[source.source];
        const weight = backendWeight ?? localWeight ?? 50;
        const weightScore = weight;
        
        logger.info(`[BEST_SOURCE] ${source.source_name} weight: backend=${backendWeight}, local=${localWeight}, using=${weight}`);

        // 2. 清晰度分数 (0-40)
        let resolutionScore = 0;
        const resolution = source.resolution || '';
        if (resolution.includes('4K') || resolution.includes('2160')) resolutionScore = 40;
        else if (resolution.includes('1080')) resolutionScore = 35;
        else if (resolution.includes('720')) resolutionScore = 25;
        else if (resolution.includes('480')) resolutionScore = 15;
        else if (resolution.includes('360')) resolutionScore = 10;
        else resolutionScore = 20; // 未知分辨率给中等分数

        // 3. 速度分数 (0-30) - 测试第一个剧集URL
        let speedScore = 15; // 默认中等分数
        if (source.episodes && source.episodes.length > 0) {
          try {
            const latency = await get().testSourceSpeed(source.episodes[0]);
            if (latency < 500) speedScore = 30;
            else if (latency < 1000) speedScore = 25;
            else if (latency < 2000) speedScore = 20;
            else if (latency < 3000) speedScore = 15;
            else if (latency < 5000) speedScore = 10;
            else speedScore = 5;

            logger.info(`[BEST_SOURCE] Speed test for ${source.source_name}: ${latency.toFixed(0)}ms (score: ${speedScore})`);
          } catch (e) {
            logger.warn(`[BEST_SOURCE] Speed test failed for ${source.source_name}`);
          }
        }

        // 总分 = 权重分数 + 清晰度分数 + 速度分数
        const totalScore = weightScore + resolutionScore + speedScore;

        logger.info(
          `[BEST_SOURCE] ${source.source_name}: weight=${weightScore}, resolution=${resolutionScore}, speed=${speedScore}, total=${totalScore}`
        );

        return {
          source,
          totalScore,
          weightScore,
          resolutionScore,
          speedScore,
        };
      })
    );

    // 按总分排序
    sourceScores.sort((a, b) => b.totalScore - a.totalScore);

    const bestSource = sourceScores[0].source;
    logger.info(
      `[BEST_SOURCE] Selected best source: ${bestSource.source_name} (total score: ${sourceScores[0].totalScore})`
    );

    return bestSource;
  },
}));

export const sourcesSelector = (state: DetailState) => state.sources;
export default useDetailStore;
export const episodesSelectorBySource = (source: string) => (state: DetailState) =>
  state.searchResults.find((r) => r.source === source)?.episodes || [];
