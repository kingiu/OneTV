import { create } from "zustand";

import { type SearchResult, api } from "@/services/api";
import { getResolutionFromM3U8 } from "@/services/m3u8";
import { resourceMatcher } from "@/services/resourceMatcher";
import { FavoriteManager } from "@/services/storage";
import { useSettingsStore } from "@/stores/settingsStore";
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
  sources: Array<{ source: string; source_name: string; resolution: string | null | undefined }>;
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
    // 清理搜索词，去除前后空格
    const cleanedQ = q ? q.trim() : q;
    logger.info(`[PERF] DetailStore.init START - q: "${q}", cleaned: "${cleanedQ}", preferredSource: ${preferredSource}, id: ${id}, year: ${year}, doubanId: ${doubanId}`);

    const { controller: oldController } = get();
    if (oldController) {
      oldController.abort();
    }
    const newController = new AbortController();
    const signal = newController.signal;

    // 构建带年份的查询字符串，用于搜索
    const searchQuery = year ? `${cleanedQ} ${year}` : cleanedQ;
    logger.info(`[MATCHING] Search query: "${searchQuery}" (original: "${q}", cleaned: "${cleanedQ}", year: ${year})`);

    set({
      q: cleanedQ,
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

    // 使用 resourceMatcher 进行更灵活的匹配，不再需要严格的匹配函数

    const processAndSetResults = async (results: SearchResult[], merge = false) => {
      const resolutionStart = performance.now();
      logger.info(`[PERF] Processing ${results.length} sources - skipping M3U8 resolution detection`);

      // 直接返回搜索结果，不进行 M3U8 分辨率检测
      // 分辨率检测将在播放时进行
      const resultsWithResolution = results.map((searchResult) => {
        logger.info(`[DEBUG] Play sources for ${searchResult.source_name}: ${searchResult.play_sources?.length || 0}`);
        logger.info(`[DEBUG] vod_play_from: ${searchResult.vod_play_from}`);
        logger.info(`[DEBUG] vod_play_url: ${searchResult.vod_play_url}`);
        logger.info(`[DEBUG] episodes: ${searchResult.episodes?.length || 0}`);
        logger.info(`[DEBUG] Raw searchResult keys:`, Object.keys(searchResult));
        return { ...searchResult, resolution: undefined };
      });

      const resolutionEnd = performance.now();
      logger.info(`[PERF] Resolution detection COMPLETE - took ${(resolutionEnd - resolutionStart).toFixed(2)}ms`);

      if (signal.aborted) return;

      set((state) => {
        // 统一去重逻辑：使用 source_id 作为唯一键（参考 LunaTV）
        const seenKeys = new Set<string>();
        const allResults = merge ? [...state.searchResults, ...resultsWithResolution] : resultsWithResolution;

        const deduplicatedResults = allResults.filter((r) => {
          const uniqueKey = `${r.source}_${r.id}`;
          if (seenKeys.has(uniqueKey)) {
            return false;
          }
          seenKeys.add(uniqueKey);
          return true;
        });

        logger.info(`[MATCHING] Before dedup: ${allResults.length} results, After dedup: ${deduplicatedResults.length} results`);

        // 不再限制视频源数量，后端会持续增加新的视频源
        logger.info(`[MATCHING] Total unique sources: ${deduplicatedResults.length}`);

        // 根据设置过滤视频源
        const { videoSource } = useSettingsStore.getState();
        let filteredResults = deduplicatedResults;

        if (!videoSource.enabledAll) {
          filteredResults = deduplicatedResults.filter((r) => {
            const isEnabled = videoSource.sources[r.source] === true;
            if (!isEnabled) {
              logger.info(`[FILTER] Filtering out disabled source: ${r.source} (${r.source_name})`);
            }
            return isEnabled;
          });
          logger.info(`[FILTER] After filtering: ${filteredResults.length} results`);
        }

        let processedResults = filteredResults;
        let finalDeduplicatedResults = filteredResults;

        // 不使用匹配引擎过滤，直接使用所有过滤后的结果
        // 这样可以确保获取到所有可用的视频源
        logger.info(`[MATCHING] Using all filtered results: ${filteredResults.length} results`);
        processedResults = filteredResults;

        // 最终去重：使用 source_id 作为唯一键（参考 LunaTV）
        const seenFinal = new Set<string>();
        finalDeduplicatedResults = processedResults.filter((r) => {
          const uniqueKey = `${r.source}_${r.id}`;
          if (seenFinal.has(uniqueKey)) {
            return false;
          }
          seenFinal.add(uniqueKey);
          return true;
        });

        logger.info(`[MATCHING] After final deduplication: ${finalDeduplicatedResults.length} results`);
        logger.info(`[MATCHING] Total sources available: ${finalDeduplicatedResults.length} (no limit)`);

        // 首先对所有结果按后端权重排序（确保官方资源站总是排在前面）
        const { sourceWeights } = useSettingsStore.getState();
        const { resourceWeights: currentResourceWeights } = get(); // 获取当前状态中的 resourceWeights

        // 按权重排序所有结果
        // 优先使用后端权重，其次使用前端配置权重，最后使用默认值 50
        const sortedResults = [...finalDeduplicatedResults].sort((a, b) => {
          const aWeight = currentResourceWeights?.[a.source] ?? sourceWeights[a.source] ?? 50;
          const bWeight = currentResourceWeights?.[b.source] ?? sourceWeights[b.source] ?? 50;
          return bWeight - aWeight;
        });

        // 记录排序后的权重信息
        logger.info(`[MATCHING] === SORTED RESULTS BY WEIGHT ===`);
        sortedResults.forEach((r, index) => {
          const weight = currentResourceWeights?.[r.source] ?? sourceWeights[r.source] ?? 50;
          logger.info(`[MATCHING] #${index + 1}: ${r.source_name} (${r.source}) - weight: ${weight}`);
        });

        // 优先选择最佳匹配的结果作为 detail
        let bestDetail = state.detail;
        if (!bestDetail) {
          // 首先尝试豆瓣 ID 匹配
          if (state.doubanId) {
            // 从所有结果中查找，不考虑 source_name 去重
            const allResults = merge ? [...state.searchResults, ...resultsWithResolution] : resultsWithResolution;
            bestDetail = allResults.find((r) =>
              r.doubanId === state.doubanId
            );
          }

          // 然后尝试年份精确匹配
          if (!bestDetail && state.year && sortedResults.length > 0) {
            const yearMatch = sortedResults.find((r) =>
              r.year === state.year || r.year === String(state.year)
            );
            if (yearMatch) {
              logger.info(`[MATCHING] Found year exact match: ${yearMatch.title} (${yearMatch.year})`);
              bestDetail = yearMatch;
            }
          }

          // 最后使用排序后的第一个结果（已经按权重排好序）
          if (!bestDetail && sortedResults.length > 0) {
            bestDetail = sortedResults[0];
            logger.info(`[MATCHING] Selected best source by weight: ${bestDetail.source} (${bestDetail.source_name})`);
          }
        }

        return {
          searchResults: sortedResults,
          sources: sortedResults.map((r) => ({
            source: r.source,
            source_name: r.source_name,
            resolution: r.resolution,
          })),
          detail: bestDetail,
        };
      });
    };

    try {
      // 首先获取后端返回的资源权重，确保在搜索结果处理之前就有正确的权重
      let weights: { [key: string]: number } = {};
      try {
        logger.info(`[WEIGHT] Fetching resource weights from backend FIRST...`);

        // 使用 LunaTV API 端点获取权重
        const backendWeights = await api.getSourceWeights(signal);
        logger.info(`[WEIGHT] Got weights from /api/source-weights: ${JSON.stringify(backendWeights)}`);

        const hasBackendWeights = Object.keys(backendWeights).length > 0;

        // 如果后端返回了权重，直接使用
        if (hasBackendWeights) {
          Object.assign(weights, backendWeights);
          logger.info(`[WEIGHT] ✓ Using backend weights from /api/source-weights`);
          Object.entries(weights).forEach(([key, weight]) => {
            logger.info(`[WEIGHT]   ${key}: ${weight}`);
          });
        }

        // 如果后端没有返回权重，使用前端默认权重
        if (!hasBackendWeights) {
          logger.info(`[WEIGHT] Backend did not return weights, using frontend default weights`);

          // 前端默认权重配置（可按需修改）
          const defaultWeights: { [key: string]: number } = {
            'aixuexi.com': 100,        // 官方高清站 - 最高优先级
            'jszyapi.com': 50,         // 极速资源 - 中等优先级
          };

          // 为每个资源分配默认权重
          const allResources = await api.getResources(signal);
          logger.info(`[WEIGHT] Got ${allResources.length} resources from /api/search/resources`);

          allResources.forEach(r => {
            const resourceKey = r.key || r.source || 'unknown';
            const defaultWeight = defaultWeights[resourceKey];

            if (defaultWeight !== undefined) {
              weights[resourceKey] = defaultWeight;
              logger.info(`[WEIGHT] ⚙️ ${resourceKey}: assigned default weight=${defaultWeight}`);
            } else {
              weights[resourceKey] = 50; // 未知资源使用默认值
              logger.info(`[WEIGHT] ⚙️ ${resourceKey}: using default weight=50`);
            }
          });
        }

        // 立即保存权重，让 processAndSetResults 能够使用
        set({ resourceWeights: weights });
        logger.info(`[WEIGHT] ✓ Final resource weights SAVED: ${JSON.stringify(weights)}`);
      } catch (resourceError) {
        logger.warn(`[WEIGHT] Failed to get resources (non-fatal):`, resourceError);
      }

      // 然后搜索视频源
      const searchStart = performance.now();
      logger.info(`[PERF] API searchVideos (all sources) START - query: "${searchQuery}"`);

      try {
        const { results: allResults } = await api.searchVideos(searchQuery, doubanId);
        const searchEnd = performance.now();
        logger.info(`[PERF] API searchVideos (all sources) END - took ${(searchEnd - searchStart).toFixed(2)}ms, results: ${allResults.length}`);

        if (signal.aborted) return;

        if (allResults.length > 0) {
          logger.info(`[SUCCESS] searchVideos found ${allResults.length} results for "${cleanedQ}"`);
          await processAndSetResults(allResults, false);
          set({ loading: false }); // Stop loading indicator
        } else {
          logger.error(`[ERROR] searchVideos found no results for "${cleanedQ}"`);
          set({
            error: `未找到 "${cleanedQ}" 的播放源，请尝试其他关键词或稍后重试`,
            loading: false
          });
        }
      } catch (searchError) {
        logger.error(`[ERROR] searchVideos failed:`, searchError);
        set({
          error: `搜索失败：${searchError instanceof Error ? searchError.message : '网络错误，请稍后重试'}`,
          loading: false
        });
      }

      // 旧的 preferredSource 逻辑已被替换，因为我们现在总是使用 searchVideos

      const favoriteCheckStart = performance.now();
      const finalState = get();

      // 最终检查：如果所有搜索都完成但仍然没有结果
      const MAX_SOURCES = 24;
      if (finalState.searchResults.length === 0 && !finalState.error) {
        logger.error(`[ERROR] All search attempts completed but no results found for "${cleanedQ}"`);
        set({ error: `未找到 "${cleanedQ}" 的播放源，请检查标题拼写或稍后重试` });
      } else if (finalState.searchResults.length > 0) {
        logger.info(`[SUCCESS] DetailStore.init completed successfully with ${finalState.searchResults.length} sources (no limit)`);
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
      }
      // 移除重复警告：如果 searchResults.length === 0，上面已经记录了错误

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

      // 移除 AbortController，使用 proxyService 内部的超时机制
      const response = await proxyService.fetch(url, {
        method: 'HEAD',
        redirect: 'follow',
      });

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

    logger.info(`[BEST_SOURCE] === WEIGHT DEBUG START ===`);
    logger.info(`[BEST_SOURCE] Selecting best source for episode ${episodeIndex + 1}`);
    logger.info(`[BEST_SOURCE] Available sources: ${searchResults.length}`);
    logger.info(`[BEST_SOURCE] Failed sources: [${Array.from(failedSources).join(', ')}]`);
    logger.info(`[BEST_SOURCE] Backend resource weights: ${JSON.stringify(resourceWeights)}`);
    logger.info(`[BEST_SOURCE] Local source weights: ${JSON.stringify(sourceWeights)}`);

    // 调试：详细输出每个源的权重来源
    logger.info(`[BEST_SOURCE] === SOURCE WEIGHT DETAILS ===`);
    searchResults.forEach(source => {
      const backendW = resourceWeights[source.source];
      const localW = sourceWeights[source.source];
      const finalW = backendW ?? localW ?? 50;
      logger.info(`[BEST_SOURCE] ${source.source} (${source.source_name}): backend=${backendW}, local=${localW}, final=${finalW}`);
    });
    logger.info(`[BEST_SOURCE] === WEIGHT DEBUG END ===`);

    // 过滤掉已失败的 sources 和没有对应剧集的 sources
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
        // 1. 权重分数 (0-100) - 后端权重优先，本地权重作为备份
        const backendWeight = resourceWeights[source.source];
        const localWeight = sourceWeights[source.source];

        // 修复：后端权重不存在（undefined）时才使用本地权重
        // 注意：backendWeight 可能为 0，此时应该使用 0 而不是 fallback
        const weight = backendWeight !== undefined ? backendWeight : (localWeight ?? 50);
        const weightScore = weight;

        logger.info(`[BEST_SOURCE] ${source.source_name}: backend=${backendWeight}, local=${localWeight}, using=${weight}`);

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

    // 详细输出排序结果
    logger.info(`[BEST_SOURCE] === FINAL RANKING ===`);
    sourceScores.forEach((score, index) => {
      logger.info(`[BEST_SOURCE] #${index + 1}: ${score.source.source_name} (total=${score.totalScore}, weight=${score.weightScore}, resolution=${score.resolutionScore}, speed=${score.speedScore})`);
    });
    logger.info(`[BEST_SOURCE] === END RANKING ===`);

    const bestSource = sourceScores[0].source;
    logger.info(
      `[BEST_SOURCE] ✓ Selected best source: ${bestSource.source_name} (total score: ${sourceScores[0].totalScore})`
    );

    return bestSource;
  },
}));

export const sourcesSelector = (state: DetailState) => state.sources;
export default useDetailStore;
export const episodesSelectorBySource = (source: string) => (state: DetailState) =>
  state.searchResults.find((r) => r.source === source)?.episodes || [];
