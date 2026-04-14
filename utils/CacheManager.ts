import * as FileSystem from 'expo-file-system';
import Logger from './Logger';

const logger = Logger.withTag('CacheManager');

export class CacheManager {
  private static instance: CacheManager;
  private cacheDir = `${FileSystem.cacheDirectory}video-cache/`;
  private imageCacheDir = `${FileSystem.cacheDirectory}image-cache/`;

  private constructor() {
    this.initialize();
  }

  static getInstance(): CacheManager {
    if (!CacheManager.instance) {
      CacheManager.instance = new CacheManager();
    }
    return CacheManager.instance;
  }

  /**
   * 初始化缓存目录
   */
  private async initialize() {
    try {
      // 确保视频缓存目录存在
      const videoCacheDirInfo = await FileSystem.getInfoAsync(this.cacheDir);
      if (!videoCacheDirInfo.exists) {
        await FileSystem.makeDirectoryAsync(this.cacheDir, { intermediates: true });
        logger.info('[CACHE] Created video cache directory');
      }

      // 确保图片缓存目录存在
      const imageCacheDirInfo = await FileSystem.getInfoAsync(this.imageCacheDir);
      if (!imageCacheDirInfo.exists) {
        await FileSystem.makeDirectoryAsync(this.imageCacheDir, { intermediates: true });
        logger.info('[CACHE] Created image cache directory');
      }
    } catch (error) {
      logger.error('[CACHE] Failed to initialize cache directories:', error);
    }
  }

  /**
   * 清除所有缓存
   * @returns 是否清除成功
   */
  async clearCache(): Promise<boolean> {
    try {
      // 清除视频缓存
      await FileSystem.deleteAsync(this.cacheDir, { idempotent: true });
      // 清除图片缓存
      await FileSystem.deleteAsync(this.imageCacheDir, { idempotent: true });
      // 重新初始化缓存目录
      await this.initialize();
      logger.info('[CACHE] Cache cleared successfully');
      return true;
    } catch (error) {
      logger.error('[CACHE] Failed to clear cache:', error);
      return false;
    }
  }

  /**
   * 清除视频缓存
   * @returns 是否清除成功
   */
  async clearVideoCache(): Promise<boolean> {
    try {
      await FileSystem.deleteAsync(this.cacheDir, { idempotent: true });
      await FileSystem.makeDirectoryAsync(this.cacheDir, { intermediates: true });
      logger.info('[CACHE] Video cache cleared successfully');
      return true;
    } catch (error) {
      logger.error('[CACHE] Failed to clear video cache:', error);
      return false;
    }
  }

  /**
   * 清除图片缓存
   * @returns 是否清除成功
   */
  async clearImageCache(): Promise<boolean> {
    try {
      await FileSystem.deleteAsync(this.imageCacheDir, { idempotent: true });
      await FileSystem.makeDirectoryAsync(this.imageCacheDir, { intermediates: true });
      logger.info('[CACHE] Image cache cleared successfully');
      return true;
    } catch (error) {
      logger.error('[CACHE] Failed to clear image cache:', error);
      return false;
    }
  }

  /**
   * 获取总缓存大小
   * @returns 缓存大小（字节）
   */
  async getCacheSize(): Promise<number> {
    try {
      const videoCacheSize = await this.getDirectorySize(this.cacheDir);
      const imageCacheSize = await this.getDirectorySize(this.imageCacheDir);
      const totalSize = videoCacheSize + imageCacheSize;
      logger.info(`[CACHE] Total cache size: ${this.formatSize(totalSize)}`);
      return totalSize;
    } catch (error) {
      logger.error('[CACHE] Failed to get cache size:', error);
      return 0;
    }
  }

  /**
   * 获取视频缓存大小
   * @returns 视频缓存大小（字节）
   */
  async getVideoCacheSize(): Promise<number> {
    try {
      const size = await this.getDirectorySize(this.cacheDir);
      logger.info(`[CACHE] Video cache size: ${this.formatSize(size)}`);
      return size;
    } catch (error) {
      logger.error('[CACHE] Failed to get video cache size:', error);
      return 0;
    }
  }

  /**
   * 获取图片缓存大小
   * @returns 图片缓存大小（字节）
   */
  async getImageCacheSize(): Promise<number> {
    try {
      const size = await this.getDirectorySize(this.imageCacheDir);
      logger.info(`[CACHE] Image cache size: ${this.formatSize(size)}`);
      return size;
    } catch (error) {
      logger.error('[CACHE] Failed to get image cache size:', error);
      return 0;
    }
  }

  /**
   * 获取目录大小
   * @param directoryPath 目录路径
   * @returns 目录大小（字节）
   */
  private async getDirectorySize(directoryPath: string): Promise<number> {
    try {
      const dirInfo = await FileSystem.getInfoAsync(directoryPath);
      if (!dirInfo.exists || !dirInfo.isDirectory) {
        return 0;
      }

      const files = await FileSystem.readDirectoryAsync(directoryPath);
      let totalSize = 0;

      for (const file of files) {
        const filePath = `${directoryPath}${file}`;
        const fileInfo = await FileSystem.getInfoAsync(filePath);
        
        if (fileInfo.exists) {
          if (fileInfo.isDirectory) {
            totalSize += await this.getDirectorySize(filePath + '/');
          } else if ('size' in fileInfo) {
            totalSize += fileInfo.size || 0;
          }
        }
      }

      return totalSize;
    } catch (error) {
      logger.error(`[CACHE] Failed to get directory size for ${directoryPath}:`, error);
      return 0;
    }
  }

  /**
   * 格式化大小显示
   * @param bytes 字节数
   * @returns 格式化后的大小字符串
   */
  private formatSize(bytes: number): string {
    if (bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  }

  /**
   * 检查缓存大小并清理超过阈值的缓存
   * @param maxSize 最大缓存大小（字节）
   * @returns 是否清理了缓存
   */
  async checkAndCleanCache(maxSize: number = 100 * 1024 * 1024): Promise<boolean> {
    try {
      const currentSize = await this.getCacheSize();
      
      if (currentSize > maxSize) {
        logger.info(`[CACHE] Cache size (${this.formatSize(currentSize)}) exceeds threshold (${this.formatSize(maxSize)}), cleaning...`);
        return await this.clearCache();
      }
      
      return false;
    } catch (error) {
      logger.error('[CACHE] Failed to check and clean cache:', error);
      return false;
    }
  }

  /**
   * 获取缓存目录路径
   * @returns 缓存目录路径
   */
  getCacheDirectory(): string {
    return this.cacheDir;
  }

  /**
   * 获取图片缓存目录路径
   * @returns 图片缓存目录路径
   */
  getImageCacheDirectory(): string {
    return this.imageCacheDir;
  }
}

export default CacheManager.getInstance();
