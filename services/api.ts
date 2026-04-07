import AsyncStorage from "@react-native-async-storage/async-storage";
import {
  MembershipTier,
  UserMembership,
  MembershipConfig,
  MembershipResponse,
  Coupon,
  CouponBatch,
  RedeemResult,
  LiveApiResponse,
  LiveSource,
  SearchResult,
  VideoDetail,
  ApiSite,
  DoubanResponse,
  PlayRecord,
  Favorite,
  ServerConfig
} from "./types";

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

  public getBaseUrl(): string {
    return this.baseURL;
  }

  private async buildHeaders(headers?: HeadersInit): Promise<Headers> {
    const requestHeaders = new Headers(headers);
    const authCookies = await AsyncStorage.getItem("authCookies");
    
    // 添加Cookie认证
    if (authCookies && !requestHeaders.has("Cookie")) {
      requestHeaders.set("Cookie", authCookies);
    }
    
    // 检查是否是登录请求，如果是，不添加认证头
    const isLoginRequest = requestHeaders.has('X-Login-Request');
    if (!isLoginRequest) {
      // 添加认证头
      try {
        const credentialsStr = await AsyncStorage.getItem("mytv_login_credentials");
        if (credentialsStr) {
          const authInfo = JSON.parse(credentialsStr);
          if (authInfo.password) {
            requestHeaders.set('X-Auth-Password', authInfo.password);
          } else if (authInfo.username && authInfo.signature) {
            requestHeaders.set('X-Auth-Username', authInfo.username);
            requestHeaders.set('X-Auth-Signature', authInfo.signature);
            if (authInfo.timestamp) {
              requestHeaders.set('X-Auth-Timestamp', authInfo.timestamp.toString());
            }
          }
        }
      } catch (error) {
        console.error('Failed to add auth headers:', error);
      }
    }
    
    return requestHeaders;
  }

  private async _getSavedCredentials() {
    try {
      const credentialsStr = await AsyncStorage.getItem("mytv_login_credentials");
      return credentialsStr ? JSON.parse(credentialsStr) : null;
    } catch (error) {
      console.error("Failed to get saved credentials:", error);
      return null;
    }
  }

  private async _fetch(url: string, options: RequestInit = {}, retryCount = 0, avoidReLogin = false): Promise<Response> {
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

      if (response.status === 401 && retryCount < 1 && !avoidReLogin) {
        // 尝试自动重新登录
        try {
          const credentialsStr = await AsyncStorage.getItem("mytv_login_credentials");
          if (credentialsStr) {
            const authInfo = JSON.parse(credentialsStr);
            let loginResponse;
            
            if (authInfo.password) {
              // 使用密码登录 - 使用原始fetch，避免递归调用
              loginResponse = await fetch(`${this.baseURL}/api/login`, {
                method: "POST",
                headers: { 
                  "Content-Type": "application/json",
                  "X-Auth-Password": authInfo.password
                },
                body: JSON.stringify({ password: authInfo.password }),
              });
            } else if (authInfo.username) {
              // 使用用户名登录 - 使用原始fetch，避免递归调用
              loginResponse = await fetch(`${this.baseURL}/api/login`, {
                method: "POST",
                headers: { 
                  "Content-Type": "application/json",
                  "X-Auth-Username": authInfo.username,
                  ...(authInfo.signature && { "X-Auth-Signature": authInfo.signature }),
                  ...(authInfo.timestamp && { "X-Auth-Timestamp": authInfo.timestamp.toString() })
                },
                body: JSON.stringify({ username: authInfo.username }),
              });
            }
            
            if (loginResponse && loginResponse.ok) {
              console.log('重新登录成功，重试原请求...');
              // 处理登录响应的 Set-Cookie 头
              const loginSetCookie = loginResponse.headers.get('Set-Cookie');
              if (loginSetCookie) {
                const cookieString = loginSetCookie.split('; ')[0];
                await AsyncStorage.setItem("authCookies", cookieString);
              }
              // 重新尝试原请求
              return this._fetch(url, options, retryCount + 1);
            }
          }
        } catch (loginError) {
          console.warn("Auto re-login failed:", loginError);
        }
        // 重新登录失败，抛出错误
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
    try {
      const response = await this._fetch("/api/login", {
        method: "POST",
        headers: { 
          "Content-Type": "application/json",
          "X-Login-Request": "true"
        },
        body: JSON.stringify({ username, password }),
      }, 0, true);

      return response.json();
    } catch (error) {
      console.error('Login error:', error);
      throw error;
    }
  }

  async register(username: string, password: string): Promise<{ ok: boolean; message?: string }> {
    try {
      const response = await this._fetch("/api/register", {
        method: "POST",
        headers: { 
          "Content-Type": "application/json",
          "X-Login-Request": "true"
        },
        body: JSON.stringify({ username, password, confirmPassword: password }),
      }, 0, true);

      return response.json();
    } catch (error) {
      console.error('Register error:', error);
      throw error;
    }
  }

  async cardLogin(code: string): Promise<{ success: boolean; message: string; username?: string; redeemSuccess?: boolean; redeemMessage?: string; data?: any; cardStatus?: string }> {
    try {
      const response = await this._fetch("/api/login/card", {
        method: "POST",
        headers: { 
          "Content-Type": "application/json",
          "X-Login-Request": "true"
        },
        body: JSON.stringify({ code }),
      }, 0, true);

      return response.json();
    } catch (error) {
      console.error('Card login error:', error);
      throw error;
    }
  }

  async logout(): Promise<{ ok: boolean }> {
    try {
      const response = await this._fetch("/api/logout", {
        method: "POST",
      }, 0, true);

      // 清除认证cookie
      await AsyncStorage.setItem("authCookies", "");
      return response.json();
    } catch (error) {
      console.error('Logout error:', error);
      throw error;
    }
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
    // 适配 LunaTV API - 使用 /api/member/level 端点
    try {
      const response = await this._fetch("/api/member/level");
      const data = await response.json();
      // 转换为前端期望的格式
      return {
        levels: (data.data || []).map((level: any) => ({
          id: level.id,
          name: level.name,
          displayName: level.name, // LunaTV 没有 displayName 字段，使用 name 代替
          price: 0, // LunaTV 没有 price 字段，默认为 0
          description: level.description || "",
          features: [], // LunaTV 没有 features 字段，默认为空数组
          durationDays: 30, // LunaTV 没有 durationDays 字段，默认为 30 天
          priority: 0, // LunaTV 没有 priority 字段，默认为 0
          permissions: [], // LunaTV 没有 permissions 字段，默认为空数组
          isDefault: false, // LunaTV 没有 isDefault 字段，默认为 false
          userGroup: level.userGroupId // LunaTV 使用 userGroupId 字段
        })),
        enable: true // 假设 LunaTV 总是启用会员系统
      };
    } catch (error) {
      // 如果 API 调用失败，返回默认配置
      return {
        levels: [],
        enable: true // 即使 API 调用失败，也默认启用会员系统
      };
    }
  }

  async getMembershipInfo(): Promise<MembershipResponse> {
    // 适配 LunaTV API - 尝试获取用户会员信息
    try {
      // 1. 尝试使用 /api/member/level/user 端点获取用户会员信息 (LunaTV 专用)
      const response = await this._fetch("/api/member/level/user");
      const data = await response.json();
      
      // 检查返回格式是否符合规范
      if (data && data.success) {
        // 如果 data 为 null，返回默认信息
        if (!data.data) {
          const config = await this.getMembershipConfig().catch(() => ({
            levels: [],
            enable: true
          }));
          return {
            membership: {
              tierId: "0",
              startDate: 0,
              endDate: 0,
              status: "expired",
              autoRenew: false
            },
            config: config
          };
        }
        
        const membershipData = data.data;
        const config = await this.getMembershipConfig().catch(() => ({
          levels: [],
          enable: true
        }));
        
        // 处理 tierId，确保它是合理的等级标识符
        let tierId = membershipData.levelId || membershipData.memberLevelId || membershipData.tierId || "0";
        // 保留原始的 tierId，不再强制转换为 "1"
        
        // 处理过期时间
        let endDate = 0;
        if (membershipData.expiryTime) {
          endDate = new Date(membershipData.expiryTime).getTime();
        } else if (membershipData.endDate) {
          endDate = membershipData.endDate;
        } else if (membershipData.endTime) {
          endDate = membershipData.endTime;
        }
        
        // 处理开始时间，只使用LunaTV API实际返回的字段
        let startDate = 0;
        if (membershipData.createdAt) {
          startDate = new Date(membershipData.createdAt).getTime();
        }
        
        return {
          membership: {
            tierId: tierId,
            tierName: membershipData.levelName || "", // 使用 LunaTV 返回的等级名称
            startDate: startDate,
            endDate: endDate,
            status: membershipData.status || (endDate > Date.now() ? "active" : "expired"),
            autoRenew: membershipData.autoRenew || false,
            source: "system",
            lastUpdated: membershipData.updatedAt ? new Date(membershipData.updatedAt).getTime() : Date.now()
          },
          config: config
        };
      } else if (data && !data.success) {
        // 记录错误并返回默认信息
        console.warn("API returned failure:", data.message);
        const config = await this.getMembershipConfig().catch(() => ({
          levels: [],
          enable: true
        }));
        return {
          membership: {
            tierId: "0",
            tierName: "",
            startDate: 0,
            endDate: 0,
            status: "expired",
            autoRenew: false
          },
          config: config
        };
      }
    } catch (error) {
      // 记录错误
      console.warn("Failed to fetch membership info:", error);
    }
    
    // 所有尝试都失败，返回默认信息
    const config = await this.getMembershipConfig().catch(() => ({
      levels: [],
      enable: true
    }));
    return {
      membership: {
        tierId: "0",
        tierName: "",
        startDate: 0,
        endDate: 0,
        status: "expired",
        autoRenew: false
      },
      config: config
    };
  }

  // 卡券相关方法
  async getUserCoupons(): Promise<Coupon[]> {
    // 适配 LunaTV API - 使用 /api/coupon 端点
    try {
      const response = await this._fetch("/api/coupon");
      const data = await response.json();
      // 转换为前端期望的格式
      return (data.data || []).map((coupon: any) => ({
        code: coupon.code,
        batchId: coupon.batchId || "",
        type: coupon.typeName || coupon.typeId || "", // 使用 LunaTV 返回的类型名称
        tier: coupon.levelName || coupon.memberLevelId || "", // 使用 LunaTV 返回的等级名称
        durationDays: coupon.validityDays || 30,
        status: coupon.status === 0 ? "inactive" : coupon.status === 1 ? "active" : "used",
        createdAt: new Date(coupon.createdAt).getTime(),
        expireTime: coupon.validityDays ? new Date(Date.now() + coupon.validityDays * 24 * 60 * 60 * 1000).getTime() : 0,
        username: coupon.username || ""
      }));
    } catch (error) {
      // 如果 API 调用失败，返回空数组
      return [];
    }
  }

  async redeemCard(code: string): Promise<RedeemResult> {
    // 适配 LunaTV API - 使用卡券码兑换
    try {
      // 从 AsyncStorage 直接获取用户名，避免循环依赖
      let username = "testuser";
      try {
        const credentialsStr = await AsyncStorage.getItem("mytv_login_credentials");
        if (credentialsStr) {
          const credentials = JSON.parse(credentialsStr);
          username = credentials.username || username;
        }
      } catch (error) {
        console.error("Failed to get username from storage:", error);
      }
      
      // 调用后端API进行卡券兑换
      // 适配 LunaTV API - 使用 /api/coupon/redeem 端点
      const response = await this._fetch("/api/coupon/redeem", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ code, username, useScene: "manual" }),
      });
      
      const result = await response.json();
      
      // 转换为前端期望的格式
      if (result.success) {
        return {
          success: true,
          message: result.message || "卡券兑换成功",
          data: {
            membership: {
              tierId: result.data?.memberLevelId || "1",
              startDate: Date.now(),
              endDate: Date.now() + 30 * 24 * 60 * 60 * 1000, // 默认30天
              status: "active",
              autoRenew: false
            },
            config: {
              tiers: [
                {
                  id: result.data?.memberLevelId || "1",
                  name: "高级会员",
                  displayName: "高级会员",
                  price: 111,
                  description: "高级会员特权",
                  features: ["无广告", "高清画质", "专属内容"],
                  durationDays: 30,
                  priority: 1,
                  permissions: [],
                  isDefault: false
                }
              ],
              enableMembershipSystem: true
            }
          }
        };
      } else {
        return {
          success: false,
          message: result.message || "卡券兑换失败",
          data: null
        };
      }
    } catch (error) {
      // 处理错误
      let errorMessage = "兑换卡券失败";
      if (error instanceof Error) {
        // 尝试从错误信息中提取JSON格式的错误消息
        const errorMsg = error.message;
        if (errorMsg.includes('body: {')) {
          try {
            const bodyStart = errorMsg.indexOf('body: {') + 6;
            const bodyEnd = errorMsg.lastIndexOf('}');
            if (bodyStart > 6 && bodyEnd > bodyStart) {
              const bodyStr = errorMsg.substring(bodyStart, bodyEnd + 1);
              const errorBody = JSON.parse(bodyStr);
              if (errorBody.message) {
                errorMessage = errorBody.message;
              }
            }
          } catch (parseError) {
            // 解析失败，使用原始错误信息
            errorMessage = errorMsg;
          }
        } else {
          errorMessage = errorMsg;
        }
      }
      return {
        success: false,
        message: errorMessage,
        data: null
      };
    }
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
    const url = `/api/cron?password=${encodeURIComponent(password)}`;
    const response = await this._fetch(url);
    return response.json();
  }
}

// 导出单例
export const api = new Api();
