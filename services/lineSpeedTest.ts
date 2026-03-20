import Logger from '../utils/Logger';

const logger = Logger.withTag('LineSpeedTest');

export interface SpeedTestResult {
  lineIndex: number;
  lineName: string;
  loadTime: number;
  success: boolean;
}

export class LineSpeedTest {
  static async testLineSpeed(url: string, timeout: number = 5000): Promise<number> {
    const startTime = Date.now();
    
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), timeout);
      
      const response = await fetch(url, {
        method: 'HEAD',
        signal: controller.signal,
        cache: 'no-cache',
      });
      
      clearTimeout(timeoutId);
      
      const endTime = Date.now();
      const loadTime = endTime - startTime;
      
      if (response.ok) {
        logger.debug(`[SPEED_TEST] URL: ${url.substring(0, 100)}... - Time: ${loadTime.toFixed(2)}ms`);
        return loadTime;
      } else {
        logger.warn(`[SPEED_TEST] URL failed with status ${response.status}: ${url.substring(0, 100)}...`);
        return Infinity;
      }
    } catch (error) {
      const endTime = Date.now();
      const loadTime = endTime - startTime;
      logger.warn(`[SPEED_TEST] URL error: ${url.substring(0, 100)}... - Error: ${error}`);
      return Infinity;
    }
  }

  static async testAllLines(
    playSources: Array<{ name: string; episodes: string[] }>,
    episodeIndex: number = 0,
    timeout: number = 5000
  ): Promise<SpeedTestResult[]> {
    logger.info(`[SPEED_TEST] Testing ${playSources.length} lines for episode ${episodeIndex}`);
    
    const results: SpeedTestResult[] = [];
    
    const testPromises = playSources.map(async (source, index) => {
      const episodeUrl = source.episodes[episodeIndex] || source.episodes[0];
      
      if (!episodeUrl) {
        logger.warn(`[SPEED_TEST] Line ${index} (${source.name}) has no episodes`);
        return {
          lineIndex: index,
          lineName: source.name,
          loadTime: Infinity,
          success: false,
        };
      }
      
      const loadTime = await this.testLineSpeed(episodeUrl, timeout);
      
      return {
        lineIndex: index,
        lineName: source.name,
        loadTime,
        success: loadTime < Infinity,
      };
    });
    
    const testResults = await Promise.all(testPromises);
    results.push(...testResults);
    
    const sortedResults = results.sort((a, b) => a.loadTime - b.loadTime);
    
    logger.info(`[SPEED_TEST] Results:`);
    sortedResults.forEach((result, index) => {
      logger.info(
        `[SPEED_TEST] ${index + 1}. Line ${result.lineIndex} (${result.lineName}): ` +
        `${result.success ? `${result.loadTime.toFixed(2)}ms` : 'FAILED'}`
      );
    });
    
    return sortedResults;
  }

  static async findFastestLine(
    playSources: Array<{ name: string; episodes: string[] }>,
    episodeIndex: number = 0,
    timeout: number = 5000
  ): Promise<number> {
    if (!playSources || playSources.length === 0) {
      logger.warn(`[SPEED_TEST] No play sources to test`);
      return 0;
    }
    
    if (playSources.length === 1) {
      logger.info(`[SPEED_TEST] Only one line available, skipping speed test`);
      return 0;
    }
    
    const results = await this.testAllLines(playSources, episodeIndex, timeout);
    
    const fastestResult = results.find(r => r.success);
    
    if (fastestResult) {
      logger.info(
        `[SPEED_TEST] Fastest line: ${fastestResult.lineIndex} (${fastestResult.lineName}) ` +
        `with ${fastestResult.loadTime.toFixed(2)}ms`
      );
      return fastestResult.lineIndex;
    } else {
      logger.warn(`[SPEED_TEST] All lines failed, using first line`);
      return 0;
    }
  }
}
