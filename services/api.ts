import AsyncStorage from "@react-native-async-storage/async-storage";

// region: --- Interface Definitions ---

// 会员相关类型
export interface MembershipTier {
  id?: string;
  name: string;
  displayName: string;
  price: number;
  description?: string;
  features: string[];
  durationDays?: number;
  priority?: number;
  permissions?: string[];
  isDefault?: boolean;
  userGroup?: string;
}

export interface UserMembership {
  tierId: string;
  startDate: number;
  endDate: number;
  status: 'active' | 'expired' | 'pending';
  autoRenew: boolean;
  source?: 'manual' | 'coupon' | 'system';
  renewInfo?: {
    enabled: boolean;
    renewalTierId: string;
    nextRenewalDate: number;
  } | null;
  lastUpdated?: number;
  activationHistory?: Array<{
    tierId: string;
    startDate: number;
    durationDays: number;
    source: 'manual' | 'coupon' | 'system';
    transactionId: string;
  }>;
}

export interface MembershipConfig {
  tiers: MembershipTier[];
  defaultTierId?: string;
  enableMembershipSystem?: boolean;
  lastUpdated?: number;
  defaultDurationDays?: number;
}

export interface MembershipResponse {
  membership: UserMembership;
  config: MembershipConfig;
}

// 卡券相关类型
export interface Coupon {
  code: string;
  batchId: string;
  type: string;
  tier: string;
  durationDays: number;
  status: 'active' | 'used' | 'expired' | 'invalid';
  createdAt: number;
  redeemedAt?: number;
  redeemedBy?: string;
  expireTime: number;
  expireDate?: number;
  expireTimeStr?: string;
  usedAt?: number;
  usedBy?: string;
  createDate?: number;
  isExpired?: boolean;
}

export interface CouponBatch {
  id: string;
  name: string;
  type: string;
  tier: string;
  durationDays: number;
  quantity: number;
  prefix: string;
  status: 'active' | 'inactive';
  createdAt: number;
  expiredAt?: number;
  startAt?: number;
  endAt?: number;
  totalRedeemed: number;
  totalCreated: number;
  createdBy?: string;
  description?: string;
}

export interface RedeemResult {
  success: boolean;
  message: string;
  data?: {
    membership: UserMembership;
    config: MembershipConfig;
  };
  error?: string;
}

// 直播源相关类型
export interface LiveApiResponse<T> {
  code: number;
  data: T;
  message: string;
  total?: number;
}

export interface LiveSource {
  id: string;
  name: string;
  url: string;
  logo: string;
  group: string;
  delay?: number;
  filter?: string;
  sort?: number;
  isOk?: boolean;
  lastCheck?: number;
}

// 搜索相关类型
export interface SearchResult {
  id: string;
  title: string;
  type: string;
  cover: string;
  rating?: number;
  year?: number;
  doubanId?: string;
  imdbId?: string;
  tmdbId?: string;
  overview?: string;
  genres?: string[];
  tags?: string[];
  actors?: string[];
  directors?: string[];
  countries?: string[];
  languages?: string[];
  releaseDate?: string;
  runtime?: number;
  status?: string;
  network?: string;
  seasons?: number;
  episodes?: string[];
  episodes_titles?: string[];
  play_sources?: Array<{
    name: string;
    episodes: string[];
    episodes_titles: string[];
  }>;
  vod_play_from?: string;
  vod_play_url?: string;
}

// 视频详情相关类型
export interface VideoDetail {
  id: string;
  title: string;
  type: string;
  cover: string;
  rating?: number;
  year?: number;
  doubanId?: string;
  imdbId?: string;
  tmdbId?: string;
  overview?: string;
  genres?: string[];
  tags?: string[];
  actors?: string[];
  directors?: string[];
  countries?: string[];
  languages?: string[];
  releaseDate?: string;
  runtime?: number;
  status?: string;
  network?: string;
  seasons?: number;
  episodes?: string[];
  episodes_titles?: string[];
  play_sources?: Array<{
    name: string;
    episodes: string[];
    episodes_titles: string[];
  }>;
  vod_play_from?: string;
  vod_play_url?: string;
}

// 搜索资源相关类型
export interface ApiSite {
  id: string;
  name: string;
  key: string;
  type: string;
  api: string;
  search: string;
  quickSearch?: string;
  categories?: Array<{
    key: string;
    name: string;
  }>;
  filters?: Array<{
    key: string;
    name: string;
    values: Array<{
      key: string;
      name: string;
    }>;
  }>;
  weight: number;
  enabled: boolean;
  searchable: boolean;
  quickSearchable: boolean;
  lang: string;
}

// 豆瓣相关类型
export interface DoubanResponse {
  items: Array<{
    id: string;
    title: string;
    cover: string;
    rating: number;
    year: number;
    type: string;
  }>;
  total: number;
  page: number;
  pageSize: number;
  hasMore: boolean;
}

// 播放记录相关类型
export interface PlayRecord {
  key: string;
  title: string;
  cover: string;
  currentTime: number;
  totalTime: number;
  lastPlayed: number;
  save_time: number;
}

// 收藏相关类型
export interface Favorite {
  key: string;
  title: string;
  cover: string;
  type: string;
  save_time: number;
}

// 服务器配置相关类型
export interface ServerConfig {
  Version: string;
  StorageType: string;
  AuthConfig: {
    Enable: boolean;
    Password: string;
  };
  SiteConfig: {
    Name: string;
    Logo: string;
    Favicon: string;
  };
  UserConfig: {
    Enable: boolean;
    Users: Array<{
      username: string;
      password: string;
      role: 'admin' | 'user';
      group: string;
      expiredAt: number;
      createdAt: number;
      updatedAt: number;
      banned: boolean;
    }>;
  };
  ApiConfig: {
    EnableSearch: boolean;
    EnableLive: boolean;
    EnableDouban: boolean;
    EnableMembership: boolean;
    EnableCoupon: boolean;
    EnablePlayRecord: boolean;
    EnableFavorite: boolean;
    EnableSearchHistory: boolean;
  };
  MembershipConfig: {
    Enable: boolean;
    Tiers: Array<{
      id: string;
      name: string;
      displayName: string;
      price: number;
      description: string;
      features: string[];
      durationDays: number;
      priority: number;
      permissions: string[];
    }>;
  };
}

// endregion

// 主API类
export class Api {
  private baseURL: string;

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

      // 处理 Set-Cookie 头 - 兼容 React Native
      const setCookie = response.headers.get('Set-Cookie');
      if (setCookie) {
        // 提取 cookie 的名称和值部分（不包含 Path、Expires 等属性）
        const cookieString = setCookie.split('; ')[0];
        await AsyncStorage.setItem("authCookies", cookieString);
      }

      if (response.status === 401) {
        throw new Error("UNAUTHORIZED");
      }

      if (!response.ok) {
        // 尝试获取错误响应的内容，以便更好地理解问题
        const errorText = await response.text();
        throw new Error(`HTTP error! status: ${response.status}, body: ${errorText.substring(0, 200)}`);
      }

      return response;
    } catch (error) {
      console.error('Fetch error:', error);
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

  async cardLogin(code: string): Promise<{ success: boolean; message: string; username?: string; redeemSuccess?: boolean; redeemMessage?: string; data?: any; cardStatus?: string }> {
    const response = await this._fetch("/api/login/card", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ code }),
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

  async getLiveCategories(): Promise<Array<{ name: string; key: string }>> {
    const response = await this._fetch("/api/live/categories");
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

  // 会员相关方法
  async getMembershipConfig(): Promise<MembershipConfig> {
    const response = await this._fetch("/api/membership?action=getConfig");
    const data = await response.json();
    return data.config;
  }

  async getMembershipInfo(): Promise<MembershipResponse> {
    const response = await this._fetch("/api/membership");
    const data = await response.json();
    return data.data;
  }

  // 卡券相关方法
  async getUserCoupons(): Promise<Coupon[]> {
    const response = await this._fetch("/api/card/user");
    const data = await response.json();
    return data.data;
  }

  async redeemCard(code: string): Promise<RedeemResult> {
    const response = await this._fetch("/api/card/redeem", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ code }),
    });
    return response.json();
  }

  // 播放记录相关方法
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

  // 收藏相关方法
  async getFavorites(): Promise<Favorite[]> {
    const response = await this._fetch("/api/favorites");
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

  // 搜索历史相关方法
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

  async triggerCron(password: string): Promise<{ success: boolean }> {
    const response = await this._fetch("/api/cron", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ password }),
    });
    return response.json();
  }
}

// 导出单例
export const api = new Api();
