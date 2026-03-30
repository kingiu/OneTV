import AsyncStorage from "@react-native-async-storage/async-storage";

// region: --- Interface Definitions ---
export interface DoubanItem {
  title: string;
  poster: string;
  rate?: string;
}

export interface DoubanResponse {
  code: number;
  message: string;
  list: DoubanItem[];
}

export interface VideoDetail {
  id: string;
  title: string;
  poster: string;
  source: string;
  source_name: string;
  desc?: string;
  type?: string;
  year?: string;
  area?: string;
  director?: string;
  actor?: string;
  remarks?: string;
}

export interface PlaySource {
  name: string;
  episodes: string[];
  episodes_titles: string[];
}

export interface SearchResult {
  id: number;
  title: string;
  poster: string;
  episodes: string[];
  episodes_titles: string[];
  source: string;
  source_name: string;
  class?: string;
  year: string;
  desc?: string;
  type_name?: string;
  play_sources?: PlaySource[];
  vod_play_from?: string;
  vod_play_url?: string;
}

export interface Favorite {
  cover: string;
  title: string;
  source_name: string;
  total_episodes: number;
  search_title: string;
  year: string;
  save_time?: number;
}

export interface PlayRecord {
  title: string;
  source_name: string;
  cover: string;
  index: number;
  total_episodes: number;
  play_time: number;
  total_time: number;
  save_time: number;
  year: string;
}

export interface ApiSite {
  key: string;
  api: string;
  name: string;
  detail?: string;
}

export interface ServerConfig {
  SiteName: string;
  StorageType: "localstorage" | "redis" | string;
}

export interface LiveSource {
  key: string;
  name: string;
  url: string;
  epg?: string;
  ua?: string;
  disabled?: boolean;
}

export interface LiveChannel {
  id: string;
  tvgId: string;
  name: string;
  logo: string;
  group: string;
  url: string;
}

export interface LiveEpgProgram {
  title?: string;
  start?: string;
  end?: string;
  [key: string]: unknown;
}

interface LiveApiResponse<T> {
  success: boolean;
  data: T;
}

// region: --- Card and Membership Interfaces ---
export interface Coupon {
  id: string;
  code: string;
  type: 'membership' | 'discount' | 'trial';
  tier: string;
  tierName: string;
  durationDays: number;
  status: 'active' | 'used' | 'expired';
  createdAt: number;
  createdAtStr: string;
  redeemedAt?: number;
  redeemedAtStr: string;
  redeemedBy?: string;
  expireTime: number;
  expireTimeStr: string;
  isExpired: boolean;
}

export interface CouponBatch {
  id: string;
  name: string;
  tier: string;
  tierName: string;
  count: number;
  durationDays: number;
  createdAt: number;
  createdBy: string;
  status: 'pending' | 'completed';
}

export interface MembershipTier {
  id: string;
  name: string;
  displayName: string;
  userGroup: string;
  benefits: string[];
  price?: number;
  durationDays?: number;
}

export interface UserMembership {
  tierId: string;
  tierName: string;
  status: 'active' | 'expired' | 'pending';
  startDate: number;
  endDate: number;
  autoRenew: boolean;
  source: string;
  isActive: boolean;
  tags: string[];
}

export interface MembershipConfig {
  enabled: boolean;
  tiers?: MembershipTier[];
  levels?: Array<{
    level: number;
    name: string;
    price: number;
    duration: number;
  }>;
  benefits?: Record<string, string[]>;
}

export interface ApiResponse<T = any> {
  success: boolean;
  message: string;
  data?: T;
}

export class API {
  public baseURL: string = "";

  constructor(baseURL?: string) {
    if (baseURL) {
      this.baseURL = baseURL;
    }
  }

  public setBaseUrl(url: string) {
    console.log('Setting API base URL to:', url);
    this.baseURL = url;
  }

  private async buildHeaders(headers?: HeadersInit): Promise<Headers> {
    const requestHeaders = new Headers(headers);
    const authCookies = await AsyncStorage.getItem("authCookies");
    if (authCookies && !requestHeaders.has("Cookie")) {
      requestHeaders.set("Cookie", authCookies);
    }
    return requestHeaders;
  }

  private async _fetch(url: string, options: RequestInit = {}): Promise<Response> {
    if (!this.baseURL) {
      throw new Error("API_URL_NOT_SET");
    }

    const headers = await this.buildHeaders(options.headers);

    try {
      console.log('Fetching:', `${this.baseURL}${url}`);
      const response = await fetch(`${this.baseURL}${url}`, {
        ...options,
        headers,
      });

      console.log('Response status:', response.status);
      console.log('Response headers:', response.headers);

      const latestCookies = response.headers.get("Set-Cookie");
      if (latestCookies) {
        await AsyncStorage.setItem("authCookies", latestCookies);
      }

      if (response.status === 401) {
        throw new Error("UNAUTHORIZED");
      }

      if (!response.ok) {
        // 尝试获取错误响应的内容，以便更好地理解问题
        const errorText = await response.text();
        throw new Error(`HTTP error! status: ${response.status}, body: ${errorText.substring(0, 200)}`);
      }

      // 检查响应内容类型，跳过cron请求的检查
      if (!url.includes("/api/cron/")) {
        const contentType = response.headers.get("content-type");
        console.log('Response content type:', contentType);
        if (contentType && !contentType.includes("application/json")) {
          const errorText = await response.text();
          console.log('Response body:', errorText.substring(0, 500));
          throw new Error(`Invalid content type: ${contentType}, body: ${errorText.substring(0, 200)}`);
        }
      }

      return response;
    } catch (error) {
      console.log('Fetch error:', error);
      if (error instanceof Error) {
        throw error;
      }
      throw error;
    }
  }

  async login(username?: string | undefined, password?: string): Promise<{ ok: boolean }> {
    const response = await this._fetch("/api/login", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ username, password }),
    });

    return response.json();
  }

  async logout(): Promise<{ ok: boolean }> {
    const response = await this._fetch("/api/logout", {
      method: "POST",
    });
    await AsyncStorage.setItem("authCookies", "");
    return response.json();
  }

  async getServerConfig(): Promise<ServerConfig> {
    const response = await this._fetch("/api/server-config");
    return response.json();
  }

  async getLiveSources(): Promise<LiveSource[]> {
    const response = await this._fetch("/api/live/sources");
    const payload: LiveApiResponse<LiveSource[]> = await response.json();
    return payload.data || [];
  }

  async getLiveChannels(source: string): Promise<LiveChannel[]> {
    const response = await this._fetch(`/api/live/channels?source=${encodeURIComponent(source)}`);
    const payload: LiveApiResponse<LiveChannel[]> = await response.json();
    return payload.data || [];
  }

  async getLiveEpg(source: string, tvgId: string): Promise<LiveEpgProgram[]> {
    const response = await this._fetch(
      `/api/live/epg?source=${encodeURIComponent(source)}&tvgId=${encodeURIComponent(tvgId)}`,
    );
    const payload: LiveApiResponse<{ programs?: LiveEpgProgram[] }> = await response.json();
    return payload.data?.programs || [];
  }

  async triggerCron(password: string = "cron_secure_password"): Promise<boolean> {
    const response = await this._fetch(`/api/cron/${encodeURIComponent(password)}`, {
      headers: {
        "Accept": "*/*"
      }
    });
    return response.ok;
  }

  async getFavorites(key?: string): Promise<Record<string, Favorite> | Favorite | null> {
    const url = key ? `/api/favorites?key=${encodeURIComponent(key)}` : "/api/favorites";
    const response = await this._fetch(url);
    return response.json();
  }

  async addFavorite(key: string, favorite: Omit<Favorite, "save_time">): Promise<{ success: boolean }> {
    const response = await this._fetch("/api/favorites", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ key, favorite }),
    });
    return response.json();
  }

  async deleteFavorite(key?: string): Promise<{ success: boolean }> {
    const url = key ? `/api/favorites?key=${encodeURIComponent(key)}` : "/api/favorites";
    const response = await this._fetch(url, { method: "DELETE" });
    return response.json();
  }

  async getPlayRecords(): Promise<Record<string, PlayRecord>> {
    const response = await this._fetch("/api/playrecords");
    return response.json();
  }

  async savePlayRecord(key: string, record: Omit<PlayRecord, "save_time">): Promise<{ success: boolean }> {
    const response = await this._fetch("/api/playrecords", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ key, record }),
    });
    return response.json();
  }

  async deletePlayRecord(key?: string): Promise<{ success: boolean }> {
    const url = key ? `/api/playrecords?key=${encodeURIComponent(key)}` : "/api/playrecords";
    const response = await this._fetch(url, { method: "DELETE" });
    return response.json();
  }

  async getSearchHistory(): Promise<string[]> {
    const response = await this._fetch("/api/searchhistory");
    return response.json();
  }

  async addSearchHistory(keyword: string): Promise<string[]> {
    const response = await this._fetch("/api/searchhistory", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ keyword }),
    });
    return response.json();
  }

  async deleteSearchHistory(keyword?: string): Promise<{ success: boolean }> {
    const url = keyword ? `/api/searchhistory?keyword=${keyword}` : "/api/searchhistory";
    const response = await this._fetch(url, { method: "DELETE" });
    return response.json();
  }

  getImageProxyUrl(imageUrl: string): string {
    return `${this.baseURL}/api/image-proxy?url=${encodeURIComponent(imageUrl)}`;
  }

  async getDoubanData(
    type: "movie" | "tv",
    tag: string,
    pageSize: number = 16,
    pageStart: number = 0,
  ): Promise<DoubanResponse> {
    const url = `/api/douban?type=${type}&tag=${encodeURIComponent(tag)}&pageSize=${pageSize}&pageStart=${pageStart}`;
    const response = await this._fetch(url);
    return response.json();
  }

  async searchVideos(query: string): Promise<{ results: SearchResult[] }> {
    const url = `/api/search?q=${encodeURIComponent(query)}`;
    const response = await this._fetch(url);
    const data = await response.json();
    // 处理 vod_play_from 和 vod_play_url 字段，转换为 play_sources
    if (data.results) {
      data.results = data.results.map((item: any) => {
        if (item.vod_play_from && item.vod_play_url) {
          const play_sources: { name: string; episodes: string[]; episodes_titles: string[] }[] = [];
          const sources = item.vod_play_from.split('$$$');
          const urls = item.vod_play_url.split('$$$');
          
          console.log('Processing sources:', sources);
          console.log('Processing urls:', urls);
          
          sources.forEach((source: string, index: number) => {
            if (urls[index]) {
              const sourceName = source.replace(/\(.*\)/, '').trim();
              const episodePairs = urls[index].split('#');
              const episodes: string[] = [];
              const episodes_titles: string[] = [];
              
              console.log('Processing source:', sourceName);
              console.log('Processing episode pairs:', episodePairs);
              
              episodePairs.forEach((pair: string) => {
                const parts = pair.split('$');
                if (parts.length >= 2) {
                  episodes_titles.push(parts[0].trim());
                  episodes.push(parts[1].trim());
                }
              });
              
              if (episodes.length > 0) {
                play_sources.push({ name: sourceName, episodes, episodes_titles });
              }
            }
          });
          
          console.log('Parsed play_sources:', play_sources);
          
          if (play_sources.length > 0) {
            item.play_sources = play_sources;
            // 如果没有 episodes 和 episodes_titles 字段，使用第一个播放源的内容
            if (!item.episodes || item.episodes.length === 0) {
              item.episodes = play_sources[0].episodes;
              item.episodes_titles = play_sources[0].episodes_titles;
            }
          }
        }
        return item;
      });
    }
    return data;
  }

  async searchVideo(query: string, resourceId: string, signal?: AbortSignal): Promise<{ results: SearchResult[] }> {
    const url = `/api/search/one?q=${encodeURIComponent(query)}&resourceId=${encodeURIComponent(resourceId)}`;
    const response = await this._fetch(url, { signal });
    const { results } = await response.json();
    // 处理 vod_play_from 和 vod_play_url 字段，转换为 play_sources
    const processedResults = results.map((item: any) => {
      if (item.vod_play_from && item.vod_play_url) {
        const play_sources: { name: string; episodes: string[]; episodes_titles: string[] }[] = [];
        const sources = item.vod_play_from.split('$$$');
        const urls = item.vod_play_url.split('$$$');
        
        console.log('Processing sources:', sources);
        console.log('Processing urls:', urls);
        
        sources.forEach((source: string, index: number) => {
          if (urls[index]) {
            const sourceName = source.replace(/\(.*\)/, '').trim();
            const episodePairs = urls[index].split('#');
            const episodes: string[] = [];
            const episodes_titles: string[] = [];
            
            console.log('Processing source:', sourceName);
            console.log('Processing episode pairs:', episodePairs);
            
            episodePairs.forEach((pair: string) => {
              const parts = pair.split('$');
              if (parts.length >= 2) {
                episodes_titles.push(parts[0].trim());
                episodes.push(parts[1].trim());
              }
            });
            
            if (episodes.length > 0) {
              play_sources.push({ name: sourceName, episodes, episodes_titles });
            }
          }
        });
        
        console.log('Parsed play_sources:', play_sources);
        
        if (play_sources.length > 0) {
          item.play_sources = play_sources;
          // 如果没有 episodes 和 episodes_titles 字段，使用第一个播放源的内容
          if (!item.episodes || item.episodes.length === 0) {
            item.episodes = play_sources[0].episodes;
            item.episodes_titles = play_sources[0].episodes_titles;
          }
        }
      }
      return item;
    });
    return { results: processedResults };
  }

  async getResources(signal?: AbortSignal): Promise<ApiSite[]> {
    const url = `/api/search/resources`;
    const response = await this._fetch(url, { signal });
    return response.json();
  }

  async getVideoDetail(source: string, id: string): Promise<VideoDetail> {
    const url = `/api/detail?source=${source}&id=${id}`;
    const response = await this._fetch(url);
    return response.json();
  }

  // region: --- Card and Membership API Methods ---

  async getUserCoupons(): Promise<Coupon[]> {
    const response = await this._fetch('/api/card/user');
    const result: ApiResponse<{ data: Coupon[] }> = await response.json();
    return result.data?.data || [];
  }

  async redeemCoupon(code: string): Promise<{ success: boolean; message: string }> {
    const response = await this._fetch('/api/card/redeem', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ code }),
    });
    const result: ApiResponse = await response.json();
    return {
      success: result.success,
      message: result.message || '兑换失败',
    };
  }

  async getUserMembership(): Promise<{ membership: UserMembership | null; config: MembershipConfig | null }> {
    const response = await this._fetch('/api/membership');
    const result: ApiResponse<{ membership: any; config: any }> = await response.json();
    
    // 转换会员信息格式
    const apiMembership = result.data?.membership;
    const membership: UserMembership | null = apiMembership ? {
      tierId: apiMembership.tierId,
      tierName: apiMembership.tierName || apiMembership.tier || '普通会员',
      status: apiMembership.status as 'active' | 'expired' | 'pending' || 'inactive',
      startDate: apiMembership.startDate || 0,
      endDate: apiMembership.endDate || 0,
      autoRenew: apiMembership.autoRenew || false,
      source: apiMembership.source || 'unknown',
      isActive: apiMembership.status === 'active' && apiMembership.endDate > Date.now(),
      tags: apiMembership.tags || []
    } : null;
    
    // 转换配置格式
    const apiConfig = result.data?.config;
    const config: MembershipConfig | null = apiConfig ? {
      enabled: true,
      tiers: apiConfig.tiers || [],
      levels: apiConfig.levels,
      benefits: apiConfig.benefits
    } : null;
    
    return { membership, config };
  }

  async getMembershipConfig(): Promise<MembershipConfig> {
    try {
      const response = await this._fetch('/api/membership?action=getConfig');
      const result: ApiResponse<{ config: any }> = await response.json();
      const apiConfig = result.data?.config || result.data;
      
      return {
        enabled: true,
        tiers: apiConfig?.tiers || [],
        levels: apiConfig?.levels,
        benefits: apiConfig?.benefits
      };
    } catch (error) {
      // 如果获取配置失败，返回默认配置
      return {
        enabled: false,
        tiers: [],
        levels: [],
        benefits: {}
      };
    }
  }
}

// 默认实例
export let api = new API();
