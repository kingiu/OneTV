import Logger from '@/utils/Logger';
import { proxyService } from '@/services/proxyService';

const logger = Logger.withTag('M3U8');

interface CacheEntry {
  resolution: string | null;
  timestamp: number;
}

const resolutionCache: { [url: string]: CacheEntry } = {};
const CACHE_DURATION = 5 * 60 * 1000; // 5 minutes
const FETCH_TIMEOUT = 15000; // 15秒超时

export const getResolutionFromM3U8 = async (
  url: string,
  signal?: AbortSignal
): Promise<string | null> => {
  const perfStart = performance.now();
  logger.info(`[PERF] M3U8 resolution detection START - url: ${url.substring(0, 100)}...`);
  
  // 1. Check cache first
  const cachedEntry = resolutionCache[url];
  if (cachedEntry && Date.now() - cachedEntry.timestamp < CACHE_DURATION) {
    const perfEnd = performance.now();
    logger.info(`[PERF] M3U8 resolution detection CACHED - took ${(perfEnd - perfStart).toFixed(2)}ms, resolution: ${cachedEntry.resolution}`);
    return cachedEntry.resolution;
  }

  if (!url.toLowerCase().endsWith(".m3u8")) {
    logger.info(`[PERF] M3U8 resolution detection SKIPPED - not M3U8 file`);
    return null;
  }

  // 创建超时控制器
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), FETCH_TIMEOUT);
  
  // 如果外部提供了 signal，在外部 abort 时也中止请求
  if (signal) {
    signal.addEventListener('abort', () => controller.abort());
  }

  try {
    const fetchStart = performance.now();
    const response = await proxyService.fetch(url, { 
      signal: controller.signal,
      headers: {
        'Accept': '*/*',
        'User-Agent': 'Mozilla/5.0 (compatible; OneTV/1.0)',
      }
    });
    
    clearTimeout(timeoutId);
    const fetchEnd = performance.now();
    logger.info(`[PERF] M3U8 fetch took ${(fetchEnd - fetchStart).toFixed(2)}ms, status: ${response.status}`);
    
    if (!response.ok) {
      return null;
    }
    
    const parseStart = performance.now();
    const playlist = await response.text();
    const lines = playlist.split("\n");
    let highestResolution = 0;
    let resolutionString: string | null = null;

    for (const line of lines) {
      if (line.startsWith("#EXT-X-STREAM-INF")) {
        const resolutionMatch = line.match(/RESOLUTION=(\d+)x(\d+)/);
        if (resolutionMatch) {
          const height = parseInt(resolutionMatch[2], 10);
          if (height > highestResolution) {
            highestResolution = height;
            resolutionString = `${height}p`;
          }
        }
      }
    }
    
    const parseEnd = performance.now();
    logger.info(`[PERF] M3U8 parsing took ${(parseEnd - parseStart).toFixed(2)}ms, lines: ${lines.length}`);

    // 2. Store result in cache
    resolutionCache[url] = {
      resolution: resolutionString,
      timestamp: Date.now(),
    };

    const perfEnd = performance.now();
    logger.info(`[PERF] M3U8 resolution detection COMPLETE - took ${(perfEnd - perfStart).toFixed(2)}ms, resolution: ${resolutionString}`);
    
    return resolutionString;
  } catch (error) {
    clearTimeout(timeoutId);
    const perfEnd = performance.now();
    
    // 区分不同类型的错误
    if (error instanceof DOMException && error.name === 'AbortError') {
      logger.warn(`[PERF] M3U8 resolution detection TIMEOUT/ABORTED - took ${(perfEnd - perfStart).toFixed(2)}ms`);
    } else if (error instanceof TypeError && error.message.includes('Network request failed')) {
      logger.error(`[PERF] M3U8 resolution detection NETWORK ERROR - took ${(perfEnd - perfStart).toFixed(2)}ms, url: ${url.substring(0, 80)}`);
      logger.error('Possible causes: Network offline, DNS failure, SSL certificate invalid, or server unreachable');
    } else {
      logger.error(`[PERF] M3U8 resolution detection ERROR - took ${(perfEnd - perfStart).toFixed(2)}ms, error: ${error}`);
    }
    
    return null;
  }
};
