import AsyncStorage from "@react-native-async-storage/async-storage";
import { MembershipConfig, UserMembership } from '@/types/membership';
import { Coupon, CouponStatusInfo, RedeemResult } from '@/types/coupon';
import { MembershipAdapter, CouponAdapter } from './apiAdapter';

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

export interface SearchResult {
  id: number;
  title: string;
  poster: string;
  episodes: string[];
  source: string;
  source_name: string;
  class?: string;
  year: string;
  desc?: string;
  type_name?: string;
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

export class API {
  public baseURL: string = "";

  constructor(baseURL?: string) {
    if (baseURL) {
      this.baseURL = baseURL;
    }
  }

  public setBaseUrl(url: string) {
    this.baseURL = url;
  }

  private async _fetch(url: string, options: RequestInit = {}): Promise<Response> {
    if (!this.baseURL) {
      throw new Error("API_URL_NOT_SET");
    }

    const response = await fetch(`${this.baseURL}${url}`, options);

    if (response.status === 401) {
      throw new Error("UNAUTHORIZED");
    }

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    return response;
  }

  async login(username?: string | undefined, password?: string): Promise<{ ok: boolean }> {
    const response = await this._fetch("/api/login", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ username, password }),
    });

    // 存储cookie到AsyncStorage
    const cookies = response.headers.get("Set-Cookie");
    if (cookies) {
      await AsyncStorage.setItem("authCookies", cookies);
    }

    return response.json();
  }

  public async getUserInfo(): Promise<{ id: string; username: string } | null> {
    try {
      const response = await this._fetch('/auth/userinfo');
      if (response.ok) {
        return await response.json();
      }
      return null;
    } catch (error) {
      console.error('获取用户信息失败:', error);
      return null;
    }
  }

  public async validateCookie(): Promise<Response> {
    return this._fetch('/auth/validate');
  }

  async logout(): Promise<{ ok: boolean }> {
    const response = await this._fetch("/api/logout", {
      method: "POST",
    });
    await AsyncStorage.setItem("authCookies", '');
    return response.json();
  }

  async getServerConfig(): Promise<ServerConfig> {
    const response = await this._fetch("/api/server-config");
    return response.json();
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

  // 会员系统API方法
  async getMembershipConfig(): Promise<MembershipConfig> {
    try {
      // 调用LunaTV API端点
      const response = await this._fetch("/api/membership/config", {
        headers: {
          'X-Platform': 'tv',  // 添加平台标识
          'X-Client-Version': '1.0.0'
        }
      });
      const lunaConfig = await response.json();
      // 使用适配器转换数据格式
      return MembershipAdapter.convertToOneTVMembershipConfig(lunaConfig);
    } catch (error) {
      console.error("获取会员配置失败:", error);
      // 返回默认配置作为降级处理
      return {
        tiers: [
          {
            name: "default",
            price: 0,
            features: ["基础内容访问"],
            duration: 0,
            priority: 0
          },
          {
            name: "basic",
            price: 19.9,
            features: ["高清画质", "无广告"],
            duration: 30,
            priority: 1
          },
          {
            name: "standard",
            price: 39.9,
            features: ["全高清画质", "多设备登录", "无广告"],
            duration: 30,
            priority: 2
          },
          {
            name: "premium",
            price: 59.9,
            features: ["4K画质", "更多设备支持", "无广告", "专属内容"],
            duration: 30,
            priority: 3
          },
          {
            name: "vip",
            price: 99.9,
            features: ["全部高级功能", "无限设备", "专属客服", "独家内容"],
            duration: 30,
            priority: 4
          }
        ],
        defaultTier: "default",
        upgradeOptions: {}
      };
    }
  }

  async getUserMembership(): Promise<UserMembership> {
    try {
      // 获取存储的认证信息
      const authCookies = await AsyncStorage.getItem("authCookies");
      const response = await this._fetch("/api/membership/user", {
        headers: {
          'Cookie': authCookies || '',
          'X-Platform': 'tv'
        }
      });
      const lunaMembership = await response.json();
      // 使用适配器转换数据格式
      return MembershipAdapter.convertToOneTVMembership(lunaMembership);
    } catch (error) {
      console.error("获取会员信息失败:", error);
      // 返回默认免费会员作为降级处理
      return {
        userId: "",
        tier: "default",
        startDate: Date.now(),
        endDate: Date.now(),
        status: "expired"
      };
    }
  }

  // 卡券系统API方法
  async redeemCoupon(code: string): Promise<RedeemResult> {
    try {
      const authCookies = await AsyncStorage.getItem("authCookies");
      const response = await this._fetch("/api/coupon/redeem", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          'Cookie': authCookies || '',
          'X-Platform': 'tv'
        },
        body: JSON.stringify({ code, platform: 'tv' }),
      });
      const result = await response.json();
      // 转换兑换结果格式
      return {
        success: result.success,
        message: result.message,
        coupon: result.coupon ? CouponAdapter.convertToOneTVCoupon(result.coupon) : undefined,
        membershipInfo: result.membershipInfo ? {
          tier: result.membershipInfo.tierId,
          endDate: result.membershipInfo.endDate
        } : undefined
      };
    } catch (error) {
      console.error("兑换卡券失败:", error);
      return {
        success: false,
        message: error instanceof Error ? error.message : "兑换失败，请检查网络连接"
      };
    }
  }

  async getUserCoupons(): Promise<Coupon[]> {
    try {
      const authCookies = await AsyncStorage.getItem("authCookies");
      const response = await this._fetch("/api/coupon/user", {
        headers: {
          'Cookie': authCookies || '',
          'X-Platform': 'tv'
        }
      });
      const lunaCoupons = await response.json();
      // 转换卡券列表
      return lunaCoupons.map((coupon: any) => CouponAdapter.convertToOneTVCoupon(coupon));
    } catch (error) {
      console.error("获取卡券列表失败:", error);
      return [];
    }
  }

  public async checkCouponStatus(code: string): Promise<CouponStatusInfo> {
    try {
      const authCookies = await AsyncStorage.getItem("authCookies");
      const response = await this._fetch(`/api/coupon/status?code=${encodeURIComponent(code)}`, {
        headers: {
          'Cookie': authCookies || '',
          'X-Platform': 'tv'
        }
      });
      const lunaStatus = await response.json();
      // 转换状态信息
      return CouponAdapter.convertToOneTVCouponStatus(lunaStatus);
    } catch (error) {
      console.error("检查卡券状态失败:", error);
      return {
        code,
        isValid: false,
        status: 'INVALID' as const,
        message: "卡券不存在或已失效"
      };
    }
  }

  public async getDoubanData(
    type: "movie" | "tv",
    tag: string,
    pageSize: number = 16,
    pageStart: number = 0
  ): Promise<DoubanResponse> {
    const url = `/api/douban?type=${type}&tag=${encodeURIComponent(tag)}&pageSize=${pageSize}&pageStart=${pageStart}`;
    const response = await this._fetch(url);
    return response.json();
  }

  async searchVideos(query: string): Promise<{ results: SearchResult[] }> {
    const url = `/api/search?q=${encodeURIComponent(query)}`;
    const response = await this._fetch(url);
    return response.json();
  }

  async searchVideo(query: string, resourceId: string, signal?: AbortSignal): Promise<{ results: SearchResult[] }> {
    const url = `/api/search/one?q=${encodeURIComponent(query)}&resourceId=${encodeURIComponent(resourceId)}`;
    const response = await this._fetch(url, { signal });
    const { results } = await response.json();
    return { results: results.filter((item: any) => item.title === query )};
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
