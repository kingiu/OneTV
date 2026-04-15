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
  detailCache: Map<string, { data: SearchResultWithResolution; timestamp: number }>; // 详情页数据缓存

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
  detailCache: new Map(),

  init: async (q, preferredSource, id, year, doubanId) => {
    const perfStart = performance.now();
    // 清理搜索词，去除前后空格
    const cleanedQ = q ? q.trim() : q;
    logger.info(`[PERF] DetailStore.init START - q: "${q}", cleaned: "${cleanedQ}", preferredSource: ${preferredSource}, id: ${id}, year: ${year}, doubanId: ${doubanId}`);

    // 检查详情页缓存
    const cacheKey = `detail:${cleanedQ}:${year || ''}:${doubanId || ''}`;
    const { detailCache } = get();
    const cached = detailCache.get(cacheKey);
    if (cached && Date.now() - cached.timestamp < 30 * 60 * 1000) { // 30分钟缓存
      logger.info(`[CACHE HIT] Returning cached detail for "${cleanedQ}"`);
      const { data: cachedDetail } = cached;
      const cacheStart = performance.now();
      set({
        q: cleanedQ,
        year: year || null,
        doubanId: doubanId || null,
        loading: false,
        searchResults: [cachedDetail],
        detail: cachedDetail,
        error: null,
        allSourcesLoaded: true,
        controller: null,
        failedSources: new Set(),
      });
      // 检查收藏状态
      if (cachedDetail) {
        const { source, id } = cachedDetail;
        try {
          const favStart = performance.now();
          const isFavorited = await FavoriteManager.isFavorited(source, id.toString());
          set({ isFavorited });
          logger.info(`[PERF] Favorite check took ${(performance.now() - favStart).toFixed(2)}ms`);
        } catch (favoriteError) {
          logger.warn(`[WARN] Failed to check favorite status:`, favoriteError);
        }
      }
      logger.info(`[PERF] DetailStore.init COMPLETE from cache - total time: ${(performance.now() - perfStart).toFixed(2)}ms`);
      logger.info(`[PERF] Cache processing took ${(performance.now() - cacheStart).toFixed(2)}ms`);
      return;
    }

    const { controller: oldController, searchResults: existingSearchResults } = get();
    if (oldController) {
      oldController.abort();
    }
    const newController = new AbortController();
    const signal = newController.signal;

    // 构建带年份的查询字符串，用于搜索
    const searchQuery = year ? `${cleanedQ} ${year}` : cleanedQ;
    logger.info(`[MATCHING] Search query: "${searchQuery}" (original: "${q}", cleaned: "${cleanedQ}", year: ${year})`);

    // 关键修复：不要立即清空 searchResults，保留旧数据直到新数据准备好
    // 这样可以避免在异步搜索完成前，playerStore 读取到空数据
    set({
      q: cleanedQ,
      year: year || null,
      doubanId: doubanId || null,
      loading: true,
      // 保留现有的 searchResults，避免竞态条件
      // searchResults: [],  // ❌ 旧代码：立即清空会导致 playerStore 读取到空数据
      detail: null,
      error: null,
      allSourcesLoaded: false,
      controller: newController,
      failedSources: new Set(),
    });
    
    logger.info(`[STATE] Keeping existing searchResults (${existingSearchResults?.length || 0} items) during loading to prevent race conditions`);

    const { videoSource } = useSettingsStore.getState();

    // 使用 resourceMatcher 进行更灵活的匹配，不再需要严格的匹配函数

    const processAndSetResults = async (results: SearchResult[], merge = false) => {
      const resolutionStart = performance.now();
      logger.info(`[PERF] Processing ${results.length} sources - skipping M3U8 resolution detection`);

      // 直接返回搜索结果，不进行 M3U8 分辨率检测
      // 分辨率检测将在播放时进行
      const resultsWithResolution = results.map((searchResult) => {
        return { ...searchResult, resolution: undefined };
      });

      const resolutionEnd = performance.now();
      logger.info(`[PERF] Resolution detection COMPLETE - took ${(resolutionEnd - resolutionStart).toFixed(2)}ms`);

      if (signal.aborted) return;

      set((state) => {
        // 统一去重逻辑：使用 source_id 作为唯一键（参考 LunaTV）
        const seenKeys = new Set<string>();
        const allResults = merge ? [...state.searchResults, ...resultsWithResolution] : resultsWithResolution;

        // 生成唯一键的辅助函数
        const generateUniqueKey = (r: SearchResultWithResolution) => {
          if (r.source && r.id) {
            return `${r.source}_${r.id}`;
          } else {
            const title = r.title || 'unknown';
            const year = r.year || 'unknown';
            const sourceName = r.source_name || 'unknown';
            return `${r.source || 'unknown'}_${title}_${year}_${sourceName}`;
          }
        };

        const deduplicatedResults = allResults.filter((r) => {
          const uniqueKey = generateUniqueKey(r);
          if (seenKeys.has(uniqueKey)) {
            return false;
          }
          seenKeys.add(uniqueKey);
          return true;
        });

        logger.info(`[MATCHING] Before dedup: ${allResults.length} results, After dedup: ${deduplicatedResults.length} results`);

        // 检查官方资源站是否在去重前
        const officialBeforeDedup = allResults.find(r => r.source === 'aixuexi.com');
        logger.info(`[MATCHING] Official source before dedup: ${officialBeforeDedup ? 'FOUND' : 'NOT FOUND'}`);
        if (officialBeforeDedup) {
          logger.info(`[MATCHING]   - Title: ${officialBeforeDedup.title}, ID: ${officialBeforeDedup.id}, DoubanID: ${officialBeforeDedup.doubanId || officialBeforeDedup.douban_id}`);
        }

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
        } else {
          logger.info(`[FILTER] All video sources enabled`);
        }

        // 检查官方资源站是否在过滤后
        const officialAfterFilter = filteredResults.find(r => r.source === 'aixuexi.com');
        logger.info(`[MATCHING] Official source after filter: ${officialAfterFilter ? 'FOUND' : 'NOT FOUND'}`);

        // 不使用匹配引擎过滤，直接使用所有过滤后的结果
        // 这样可以确保获取到所有可用的视频源
        logger.info(`[MATCHING] Using all filtered results: ${filteredResults.length} results`);

        // 首先对所有结果按后端权重排序（确保官方资源站总是排在前面）
        const { sourceWeights } = useSettingsStore.getState();
        const { resourceWeights: currentResourceWeights } = get(); // 重新获取最新的 resourceWeights

        // 按权重排序所有结果
        // 优先使用后端权重，其次使用前端配置权重，最后使用默认值 50
        const sortedResults = [...filteredResults].sort((a, b) => {
          // 为每个源单独获取权重，确保使用最新值
          const aWeight = currentResourceWeights?.[a.source] ?? sourceWeights[a.source] ?? 50;
          const bWeight = currentResourceWeights?.[b.source] ?? sourceWeights[b.source] ?? 50;
          return bWeight - aWeight;
        });

        // 记录排序后的权重信息（只记录前5个结果，避免日志过多）
        logger.info(`[MATCHING] === TOP 5 SORTED RESULTS BY WEIGHT ===`);
        sortedResults.slice(0, 5).forEach((r, index) => {
          const weight = currentResourceWeights?.[r.source] ?? sourceWeights[r.source] ?? 50;
          logger.info(`[MATCHING] #${index + 1}: ${r.source_name} (${r.source}) - weight: ${weight}`);
        });

        // 特别检查官方资源站
        const officialSource = sortedResults.find(r => r.source === 'aixuexi.com');
        if (officialSource) {
          const officialWeight = currentResourceWeights?.['aixuexi.com'] ?? sourceWeights['aixuexi.com'] ?? 50;
          logger.info(`[MATCHING] ✅ 官方资源站 found: ${officialSource.source_name} (weight: ${officialWeight})`);
        } else {
          logger.warn(`[MATCHING] ❌ 官方资源站 NOT found in search results`);
        }

        // 优先选择最佳匹配的结果作为 detail
        let bestDetail = state.detail;
        
        // 1. 如果有 preferredSource（从 playerStore 传入），优先使用它
        if (preferredSource && !bestDetail) {
          bestDetail = sortedResults.find((r) => r.source === preferredSource);
          if (bestDetail) {
            logger.info(`[MATCHING] Using preferred source: ${preferredSource} (${bestDetail.source_name})`);
          }
        }
        
        // 2. 豆瓣 ID 匹配 - 从去重后的结果中查找
        if (!bestDetail && doubanId) {
          bestDetail = sortedResults.find((r) =>
            r.doubanId === doubanId || r.douban_id?.toString() === doubanId
          );
          if (bestDetail) {
            logger.info(`[MATCHING] Found doubanId match: ${bestDetail.title} (${bestDetail.doubanId || bestDetail.douban_id})`);
          }
        }

        // 3. 年份精确匹配
        if (!bestDetail && year && sortedResults.length > 0) {
          const yearMatch = sortedResults.find((r) =>
            r.year === year || r.year === String(year)
          );
          if (yearMatch) {
            logger.info(`[MATCHING] Found year exact match: ${yearMatch.title} (${yearMatch.year})`);
            bestDetail = yearMatch;
          }
        }

        // 4. 最后使用排序后的第一个结果（已经按权重排好序）
        if (!bestDetail && sortedResults.length > 0) {
          bestDetail = sortedResults[0];
          logger.info(`[MATCHING] Selected best source by weight: ${bestDetail.source} (${bestDetail.source_name})`);
        }
        
        // 5. 如果还是没有 detail，使用 state 中已有的 detail（保留旧数据）
        if (!bestDetail && state.detail) {
          bestDetail = state.detail;
          logger.info(`[MATCHING] Keeping existing detail from state: ${bestDetail.source} (${bestDetail.source_name})`);
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
      // 关键性能优化：增加超时时间，避免首次搜索被提前中止
      const INIT_TIMEOUT = 15000; // 15 秒超时（首次搜索可能需要更多时间）
      const initController = new AbortController();
      const initTimeoutId = setTimeout(() => {
        initController.abort();
        logger.warn(`[TIMEOUT] DetailStore.init exceeded ${INIT_TIMEOUT}ms, aborting all operations`);
      }, INIT_TIMEOUT);
      
      // 合并信号，确保超时时能取消所有操作
      const combinedSignal = initController.signal;
      
      // 并行执行权重获取和视频搜索，减少总加载时间
      const [weights, searchResults] = await Promise.all([
        // 并行任务 1：获取资源权重（优化：直接使用默认权重，避免额外 API 调用）
        (async () => {
          const perfStart = performance.now();
          logger.info(`[WEIGHT] Using default resource weights (optimized for speed)`);
          
          // 前端默认权重配置（已覆盖所有已知资源）
          const defaultWeights: { [key: string]: number } = {
            // 官方资源站 - 最高优先级
            'aixuexi.com': 100,
            'lunatv.com': 100,
            
            // 高速资源 - 高优先级
            'jszyapi.com': 80,
            'bfzyapi.com': 80,
            
            // 普通资源 - 中等优先级
            'tyjszy.com': 60,
            'haohzy.com': 60,
            'huozui.com': 60,
            
            // 备用资源 - 低优先级
            'wolongzy.com': 40,
            '1080zy.com': 40,
            'ffzyapi.com': 40,
            
            // 其他资源 - 默认优先级
            'default': 50,
          };
          
          logger.info(`[PERF] Weight initialization took ${(performance.now() - perfStart).toFixed(2)}ms`);
          return defaultWeights;
        })(),

        // 并行任务 2：搜索视频源
        (async () => {
          const searchStart = performance.now();
          logger.info(`[PERF] API searchVideos START - query: "${searchQuery}"`);

          try {
            const { results: allResults } = await api.searchVideos(searchQuery, doubanId);
            const searchEnd = performance.now();
            logger.info(`[PERF] API searchVideos END - took ${(searchEnd - searchStart).toFixed(2)}ms, results: ${allResults.length}`);

            if (signal.aborted || combinedSignal.aborted) return null;
            return allResults;
          } catch (searchError) {
            logger.error(`[ERROR] searchVideos failed:`, searchError);
            throw searchError;
          }
        })()
      ]);
      
      // 清除超时定时器
      clearTimeout(initTimeoutId);

      // 保存权重
      set({ resourceWeights: weights });
      logger.info(`[WEIGHT] ✓ Final resource weights SAVED: ${JSON.stringify(weights)}`);

      // 处理搜索结果
      if (signal.aborted) return;

      if (searchResults && searchResults.length > 0) {
        logger.info(`[SUCCESS] searchVideos found ${searchResults.length} results for "${cleanedQ}"`);
        await processAndSetResults(searchResults, false);
        set({ loading: false }); // Stop loading indicator
      } else {
        // 关键修复：搜索失败时的处理逻辑
        const currentState = get();
        
        // 1. 如果有旧数据，保留旧数据
        if (currentState.searchResults && currentState.searchResults.length > 0) {
          logger.warn(`[WARN] searchVideos found no new results, but keeping existing ${currentState.searchResults.length} results from cache/previous search`);
          set({ 
            loading: false,
            allSourcesLoaded: true,
            error: null // 清除错误，因为还有旧数据可用
          });
        } 
        // 2. 如果有 preferredSource（从 VideoCard 传入），尝试直接获取该源的详情
        else if (preferredSource) {
          logger.warn(`[WARN] searchVideos found no results, but preferredSource is provided: ${preferredSource}`);
          // 创建一个临时的 detail 对象，让用户可以尝试播放
          set({
            loading: false,
            allSourcesLoaded: true,
            error: null,
            // 保留 preferredSource 信息，让用户知道我们在尝试哪个源
            detail: {
              source: preferredSource,
              source_name: preferredSource,
              title: cleanedQ,
              episodes: [], // 空剧集列表，播放时会重新获取
            } as SearchResultWithResolution,
          });
        }
        // 3. 完全没有数据，显示错误
        else {
          logger.error(`[ERROR] searchVideos found no results for "${cleanedQ}" and no cached data available`);
          set({
            error: `未找到 "${cleanedQ}" 的播放源，请尝试其他关键词或稍后重试`,
            loading: false,
            allSourcesLoaded: true
          });
        }
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

        // 缓存详情页数据
        const cacheKey = `detail:${cleanedQ}:${year || ''}:${doubanId || ''}`;
        const { detailCache } = get();
        detailCache.set(cacheKey, {
          data: finalState.detail,
          timestamp: Date.now()
        });
        logger.info(`[CACHE] Saved detail to cache: ${cacheKey}`);

        // 限制缓存大小，最多缓存20个详情页数据
        if (detailCache.size > 20) {
          // 按时间戳排序，删除最旧的缓存
          const oldestKey = Array.from(detailCache.entries())
            .sort((a, b) => a[1].timestamp - b[1].timestamp)[0][0];
          detailCache.delete(oldestKey);
          logger.info(`[CACHE] Removed oldest cache: ${oldestKey}`);
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

    // 对每个源进行评分（不进行速度测试，避免网络请求导致的循环）
    const sourceScores = availableSources.map((source) => {
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

      // 3. 速度分数 (0-30) - 不进行速度测试，使用默认分数
      const speedScore = 15; // 默认中等分数

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
    });

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
