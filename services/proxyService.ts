import AsyncStorage from "@react-native-async-storage/async-storage";
import Logger from "@/utils/Logger";

const logger = Logger.withTag("ProxyService");

interface CacheItem {
  data: any;
  timestamp: number;
  ttl: number;
}

class ProxyService {
  private baseURL: string;
  private cache: Map<string, CacheItem> = new Map();
  private readonly DEFAULT_CACHE_TTL = 3600;

  constructor(baseURL?: string) {
    this.baseURL = baseURL || "";
  }

  public setBaseUrl(url: string) {
    this.baseURL = url;
  }

  public getBaseUrl(): string {
    return this.baseURL;
  }

  // 生成缓存键
  private generateCacheKey(url: string, method: string, body?: string): string {
    const key = `${method}:${url}`;
    if (!body) return key;
    
    try {
      return `${key}:${btoa(unescape(encodeURIComponent(body)))}`;
    } catch (error) {
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
  private saveToCache(key: string, data: any, ttl: number = this.DEFAULT_CACHE_TTL) {
    this.cache.set(key, {
      data,
      timestamp: Date.now(),
      ttl,
    });

    if (this.cache.size > 100) {
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

  // 分析网络错误原因
  private analyzeNetworkError(error: any): string {
    const errorMsg = error instanceof Error ? error.message : String(error);
    
    if (errorMsg.includes("Network request failed")) {
      return "Possible causes:\n" +
             "  1. Device is offline or network unstable\n" +
             "  2. DNS resolution failed\n" +
             "  3. Target server unreachable\n" +
             "  4. SSL/TLS certificate invalid\n" +
             "  5. Firewall or VPN blocking the request\n" +
             "  6. Request timeout (server not responding)";
    }
    
    if (errorMsg.includes("abort") || errorMsg.includes("AbortError") || errorMsg === "Aborted") {
      return "Request was aborted (timeout or manual cancellation)";
    }
    
    if (errorMsg.includes("timeout")) {
      return "Request timed out - server took too long to respond";
    }
    
    if (errorMsg.includes("SSL") || errorMsg.includes("certificate")) {
      return "SSL certificate error - server certificate invalid or expired";
    }
    
    if (errorMsg.includes("CORS") || errorMsg.includes("cross-origin")) {
      return "CORS policy blocked the request";
    }
    
    return `Unknown error type: ${errorMsg}`;
  }

  // 直接请求
  public async fetch(url: string, options: RequestInit = {}, retries = 2): Promise<Response> {
    const cacheKey = this.generateCacheKey(url, options.method || "GET", options.body as string);

    logger.debug("Fetching directly:", url);

    // 尝试从缓存获取
    const cachedData = this.getFromCache(cacheKey);
    if (cachedData && options.method === "GET") {
      logger.debug("Cache hit for:", url);
      return new Response(JSON.stringify(cachedData), {
        status: 200,
        headers: {
          "Content-Type": "application/json",
          "X-Cache": "HIT",
        },
      });
    }

    // 定义请求函数
    const makeRequest = async (requestUrl: string): Promise<Response> => {
      logger.debug("Fetching directly:", requestUrl);
      try {
        const fetchOptions = {
          ...options,
          signal: options.signal,
        };
        
        if (!fetchOptions.signal) {
          const controller = new AbortController();
          const timeoutId = setTimeout(() => controller.abort(), 60000);
          fetchOptions.signal = controller.signal;
          (fetchOptions as any)._timeoutId = timeoutId;
        }
        
        const response = await fetch(requestUrl, fetchOptions);
        
        if ((fetchOptions as any)._timeoutId) {
          clearTimeout((fetchOptions as any)._timeoutId);
        }
        
        if (response.ok && options.method === "GET") {
          try {
            const data = await response.clone().json();
            this.saveToCache(cacheKey, data);
          } catch {
          }
        }
        
        return response;
      } catch (error) {
        const errorMsg = error instanceof Error ? error.message : String(error);
        const errorDetails = this.analyzeNetworkError(error);
        
        logger.error(
          "Direct fetch error:", 
          `\n  URL: ${requestUrl.substring(0, 100)}...`,
          `\n  Error: ${errorMsg}`,
          `\n  Analysis: ${errorDetails}`
        );
        
        throw error;
      }
    };

    // 尝试直接请求，支持重试
    for (let i = 0; i <= retries; i++) {
      try {
        if (i > 0) {
          logger.warn(`Retrying direct request (${i}/${retries}) for:`, url);
          await new Promise(resolve => setTimeout(resolve, 1000 * i));
        }
        return await makeRequest(url);
      } catch (error) {
        if (i === retries) {
          logger.error("All direct requests failed:", error);
          throw error;
        }
        logger.warn(`Direct request failed (${i}/${retries}), retrying...`);
      }
    }

    throw new Error("All requests failed");
  }

  // 获取图片 URL - 直接返回原始 URL
  public async getImageProxyUrl(imageUrl: string): Promise<string> {
    return imageUrl;
  }

  // 获取视频 URL - 直接返回原始 URL
  public async getVideoProxyUrl(videoUrl: string): Promise<string> {
    return videoUrl;
  }
}

// 导出单例
export const proxyService = new ProxyService();
export default ProxyService;
