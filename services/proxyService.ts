import AsyncStorage from "@react-native-async-storage/async-storage";
import Logger from "@/utils/Logger";

const logger = Logger.withTag('ProxyService');

interface ProxyConfig {
  enabled: boolean;
  useBackendProxy: boolean;
  proxyUrl?: string;
  cacheEnabled: boolean;
  cacheTTL: number;
}

interface CacheItem {
  data: any;
  timestamp: number;
  ttl: number;
}

class ProxyService {
  private baseURL: string;
  private config: ProxyConfig;
  private cache: Map<string, CacheItem> = new Map();

  constructor(baseURL?: string) {
    this.baseURL = baseURL || '';
    this.config = {
      enabled: false,
      useBackendProxy: false,
      cacheEnabled: true,
      cacheTTL: 3600,
    };
    this.loadConfig();
  }

  public setBaseUrl(url: string) {
    this.baseURL = url;
  }

  public getBaseUrl(): string {
    return this.baseURL;
  }

  public async loadConfig() {
    try {
      const configStr = await AsyncStorage.getItem('proxyConfig');
      if (configStr) {
        this.config = { ...this.config, ...JSON.parse(configStr) };
      }
    } catch (error) {
      logger.error('Failed to load proxy config:', error);
    }
  }

  public async saveConfig(config: Partial<ProxyConfig>) {
    try {
      this.config = { ...this.config, ...config };
      await AsyncStorage.setItem('proxyConfig', JSON.stringify(this.config));
    } catch (error) {
      logger.error('Failed to save proxy config:', error);
    }
  }

  public getConfig(): ProxyConfig {
    return { ...this.config };
  }

  // 生成缓存键
  private generateCacheKey(url: string, method: string, body?: string): string {
    const key = `${method}:${url}`;
    if (!body) return key;
    
    try {
      // 处理非 ASCII 字符
      return `${key}:${btoa(unescape(encodeURIComponent(body)))}`;
    } catch (error) {
      // 如果编码失败，使用简单的哈希方法
      let hash = 0;
      for (let i = 0; i < body.length; i++) {
        const char = body.charCodeAt(i);
        hash = ((hash << 5) - hash) + char;
        hash = hash & hash;
      }
      return `${key}:${hash}`;
    }
  }

  // 从缓存获取数据
  private getFromCache(key: string): any {
    if (!this.config.cacheEnabled) return null;

    const item = this.cache.get(key);
    if (!item) return null;

    const now = Date.now();
    if (now - item.timestamp > item.ttl * 1000) {
      this.cache.delete(key);
      return null;
    }

    return item.data;
  }

  // 保存到缓存
  private saveToCache(key: string, data: any, ttl: number = this.config.cacheTTL) {
    if (!this.config.cacheEnabled) return;

    this.cache.set(key, {
      data,
      timestamp: Date.now(),
      ttl,
    });

    // 限制缓存大小
    if (this.cache.size > 100) {
      // 删除最旧的缓存项
      const oldestKey = Array.from(this.cache.keys())[0];
      this.cache.delete(oldestKey);
    }
  }

  // 清理过期缓存
  public cleanupCache() {
    const now = Date.now();
    for (const [key, item] of this.cache.entries()) {
      if (now - item.timestamp > item.ttl * 1000) {
        this.cache.delete(key);
      }
    }
  }

  // 构建代理 URL
  private buildProxyUrl(targetUrl: string): string {
    if (!this.config.enabled) return targetUrl;

    if (this.config.useBackendProxy && this.baseURL) {
      // 使用后端代理
      return `${this.baseURL}/api/proxy/cdn?url=${encodeURIComponent(targetUrl)}`;
    } else if (this.config.proxyUrl) {
      // 使用 Cloudflare Worker 代理
      const proxyBaseUrl = this.config.proxyUrl.replace(/\/$/, '');
      const sourceId = this.extractSourceId(targetUrl);
      return `${proxyBaseUrl}/p/${sourceId}?url=${encodeURIComponent(targetUrl)}`;
    }

    return targetUrl;
  }

  // 提取源标识符
  private extractSourceId(url: string): string {
    try {
      const urlObj = new URL(url);
      const hostname = urlObj.hostname;
      const parts = hostname.split('.');

      // 如果是 caiji.xxx.com 或 api.xxx.com 格式，取倒数第二部分
      if (parts.length >= 3 && (parts[0] === 'caiji' || parts[0] === 'api' || parts[0] === 'cj' || parts[0] === 'www')) {
        return parts[parts.length - 2].toLowerCase().replace(/[^a-z0-9]/g, '');
      }

      // 否则取第一部分（去掉 zyapi/zy 等后缀）
      let name = parts[0].toLowerCase();
      name = name.replace(/zyapi$/, '').replace(/zy$/, '').replace(/api$/, '');
      return name.replace(/[^a-z0-9]/g, '') || 'source';
    } catch {
      return 'source';
    }
  }

  // 分析网络错误原因
  private analyzeNetworkError(error: any): string {
    const errorMsg = error instanceof Error ? error.message : String(error);
    
    if (errorMsg.includes('Network request failed')) {
      return 'Possible causes:\n' +
             '  1. Device is offline or network unstable\n' +
             '  2. DNS resolution failed\n' +
             '  3. Target server unreachable\n' +
             '  4. SSL/TLS certificate invalid\n' +
             '  5. Firewall or VPN blocking the request\n' +
             '  6. Request timeout (server not responding)';
    }
    
    if (errorMsg.includes('abort') || errorMsg.includes('AbortError')) {
      return 'Request was aborted (timeout or manual cancellation)';
    }
    
    if (errorMsg.includes('timeout')) {
      return 'Request timed out - server took too long to respond';
    }
    
    if (errorMsg.includes('SSL') || errorMsg.includes('certificate')) {
      return 'SSL certificate error - server certificate invalid or expired';
    }
    
    if (errorMsg.includes('CORS') || errorMsg.includes('cross-origin')) {
      return 'CORS policy blocked the request';
    }
    
    return `Unknown error type: ${errorMsg}`;
  }

  // 代理请求
  public async fetch(url: string, options: RequestInit = {}, retries = 2): Promise<Response> {
    const targetUrl = this.buildProxyUrl(url);
    const cacheKey = this.generateCacheKey(targetUrl, options.method || 'GET', options.body as string);

    // 尝试从缓存获取
    const cachedData = this.getFromCache(cacheKey);
    if (cachedData && options.method === 'GET') {
      logger.debug('Cache hit for:', targetUrl);
      return new Response(JSON.stringify(cachedData), {
        status: 200,
        headers: {
          'Content-Type': 'application/json',
          'X-Cache': 'HIT',
        },
      });
    }

    // 定义请求函数
    const makeRequest = async (requestUrl: string, isProxy: boolean): Promise<Response> => {
      logger.debug(isProxy ? 'Fetching through proxy:' : 'Fetching directly:', requestUrl);
      try {
        // 添加默认超时（如果未设置）
        const fetchOptions = {
          ...options,
          signal: options.signal,
        };
        
        // 如果没有设置超时，添加默认 30 秒超时
        if (!fetchOptions.signal) {
          const controller = new AbortController();
          const timeoutId = setTimeout(() => controller.abort(), 30000);
          fetchOptions.signal = controller.signal;
          
          // 存储 timeoutId 以便后续清理
          (fetchOptions as any)._timeoutId = timeoutId;
        }
        
        const response = await fetch(requestUrl, fetchOptions);
        
        // 清理超时
        if ((fetchOptions as any)._timeoutId) {
          clearTimeout((fetchOptions as any)._timeoutId);
        }
        
        // 缓存成功的 GET 请求
        if (response.ok && options.method === 'GET') {
          try {
            const data = await response.clone().json();
            this.saveToCache(cacheKey, data);
          } catch {
            // 非 JSON 响应不缓存
          }
        }
        
        return response;
      } catch (error) {
        // 增强错误日志
        const errorMsg = error instanceof Error ? error.message : String(error);
        const errorDetails = this.analyzeNetworkError(error);
        
        logger.error(
          isProxy ? 'Proxy fetch error:' : 'Direct fetch error:', 
          `\n  URL: ${requestUrl.substring(0, 100)}...`,
          `\n  Error: ${errorMsg}`,
          `\n  Analysis: ${errorDetails}`
        );
        
        throw error;
      }
    };

    // 尝试使用代理请求
    if (targetUrl !== url) {
      try {
        return await makeRequest(targetUrl, true);
      } catch (error) {
        logger.warn('Falling back to direct request for:', url);
        // 代理请求失败，回退到直接请求
      }
    }

    // 尝试直接请求，支持重试
    for (let i = 0; i <= retries; i++) {
      try {
        if (i > 0) {
          logger.warn(`Retrying direct request (${i}/${retries}) for:`, url);
          // 重试前添加延迟
          await new Promise(resolve => setTimeout(resolve, 1000 * i));
        }
        return await makeRequest(url, false);
      } catch (error) {
        if (i === retries) {
          logger.error('All direct requests failed:', error);
          throw error;
        }
        logger.warn(`Direct request failed (${i}/${retries}), retrying...`);
      }
    }

    // 理论上不会到达这里，但为了类型安全添加
    throw new Error('All requests failed');
  }

  // 获取图片代理 URL
  public getImageProxyUrl(imageUrl: string): string {
    if (!this.config.enabled) return imageUrl;

    if (this.config.useBackendProxy && this.baseURL) {
      return `${this.baseURL}/api/image-proxy?url=${encodeURIComponent(imageUrl)}`;
    } else if (this.config.proxyUrl) {
      return `${this.config.proxyUrl}/image?url=${encodeURIComponent(imageUrl)}`;
    }

    return imageUrl;
  }

  // 获取视频代理 URL
  public getVideoProxyUrl(videoUrl: string): string {
    if (!this.config.enabled) return videoUrl;

    if (this.config.useBackendProxy && this.baseURL) {
      return `${this.baseURL}/api/proxy/stream?url=${encodeURIComponent(videoUrl)}`;
    } else if (this.config.proxyUrl) {
      return `${this.config.proxyUrl}/stream?url=${encodeURIComponent(videoUrl)}`;
    }

    return videoUrl;
  }
}

// 导出单例
export const proxyService = new ProxyService();
export default ProxyService;
