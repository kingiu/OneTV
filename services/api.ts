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


}

// 默认实例
export let api = new API();
