import AsyncStorage from "@react-native-async-storage/async-storage";
import { MembershipConfig, UserMembership } from '@/types/membership';
import { Coupon, CouponStatus, CouponStatusInfo, RedeemResult } from '@/types/coupon';
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

    // 最大重试次数
    const MAX_RETRIES = 3;
    // 重试间隔（毫秒）
    const RETRY_DELAY = 1000;
    
    for (let attempt = 0; attempt < MAX_RETRIES; attempt++) {
      try {
        const response = await fetch(`${this.baseURL}${url}`, {
          ...options,
          headers: {
            'Content-Type': 'application/json',
            'X-Client-Platform': 'OneTV',
            'X-Client-Version': '1.0.0',
            ...options.headers,
          },
          credentials: 'include',
          // 添加超时控制
          signal: options.signal || AbortSignal.timeout(30000), // 30秒超时
        });

        if (response.status === 401) {
          // 清除认证信息
          await AsyncStorage.removeItem('authCookies');
          throw new Error("UNAUTHORIZED");
        }

        // 对于服务器错误，可以进行重试
        if (!response.ok && response.status >= 500 && attempt < MAX_RETRIES - 1) {
          console.warn(`请求失败，状态码: ${response.status}，正在重试 (${attempt + 1}/${MAX_RETRIES})`);
          await new Promise(resolve => setTimeout(resolve, RETRY_DELAY * Math.pow(2, attempt))); // 指数退避
          continue;
        }

        if (!response.ok) {
          throw new Error(`HTTP error! status: ${response.status}`);
        }

        return response;
      } catch (error) {
        // 网络错误也进行重试
        if (!(error instanceof Error && error.name === 'AbortError') && attempt < MAX_RETRIES - 1) {
          console.warn(`网络请求失败，正在重试 (${attempt + 1}/${MAX_RETRIES})`, error);
          await new Promise(resolve => setTimeout(resolve, RETRY_DELAY * Math.pow(2, attempt)));
          continue;
        }
        
        // 最后一次尝试失败，抛出错误
        throw error;
      }
    }
    
    throw new Error('Maximum retry attempts exceeded');
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
      // 先尝试从缓存获取
      const cachedConfig = await this.getCachedMembershipConfig();
      if (cachedConfig) {
        // 后台异步刷新数据，但立即返回缓存
        this._refreshMembershipConfigInBackground();
        return cachedConfig;
      }

      // 调用LunaTV API端点
      const response = await this._fetch("/api/membership/config", {
        headers: {
          'X-Platform': 'tv',
          'X-Client-Version': '1.0.0'
        }
      });
      const lunaConfig = await response.json();
      
      // 验证响应数据格式
      if (!lunaConfig || !Array.isArray(lunaConfig.tiers)) {
        throw new Error('Invalid membership config format');
      }
      
      // 使用适配器转换数据格式
      const config = MembershipAdapter.convertToOneTVMembershipConfig(lunaConfig);
      
      // 缓存转换后的配置
      await this.cacheMembershipConfig(config);
      
      return config;
    } catch (error) {
      console.error("获取会员配置失败:", error);
      
      // 返回默认配置作为降级处理
      const defaultConfig: MembershipConfig = {
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
      
      // 缓存默认配置
      await this.cacheMembershipConfig(defaultConfig);
      
      return defaultConfig;
    }
  }
  
  // 获取缓存的会员配置
  private async getCachedMembershipConfig(): Promise<MembershipConfig | null> {
    try {
      const cached = await AsyncStorage.getItem('cached_membership_config');
      if (cached) {
        const { data, timestamp } = JSON.parse(cached);
        // 检查缓存是否过期（24小时）
        if (Date.now() - timestamp < 24 * 60 * 60 * 1000) {
          return data;
        }
      }
      return null;
    } catch (error) {
      console.error('读取缓存的会员配置失败:', error);
      return null;
    }
  }
  
  // 缓存会员配置
  private async cacheMembershipConfig(config: MembershipConfig): Promise<void> {
    try {
      await AsyncStorage.setItem('cached_membership_config', JSON.stringify({
        data: config,
        timestamp: Date.now()
      }));
    } catch (error) {
      console.error('缓存会员配置失败:', error);
    }
  }
  
  // 后台异步刷新会员配置
  private async _refreshMembershipConfigInBackground(): Promise<void> {
    try {
      const response = await this._fetch("/api/membership/config", {
        headers: {
          'X-Platform': 'tv',
          'X-Client-Version': '1.0.0'
        }
      });
      const lunaConfig = await response.json();
      const config = MembershipAdapter.convertToOneTVMembershipConfig(lunaConfig);
      await this.cacheMembershipConfig(config);
    } catch (error) {
      console.warn("后台刷新会员配置失败:", error);
      // 静默失败，不影响用户体验
    }
  }

  async getUserMembership(): Promise<UserMembership> {
    try {
      // 检查是否已登录
      const authCookies = await AsyncStorage.getItem("authCookies");
      if (!authCookies) {
        return this.getDefaultUserMembership();
      }

      // 先尝试从缓存获取
      const cachedMembership = await this.getCachedUserMembership();
      if (cachedMembership) {
        // 如果缓存未过期，直接返回
        if (cachedMembership.endDate > Date.now() + 5 * 60 * 1000) { // 5分钟内不过期
          return cachedMembership;
        }
        // 缓存即将过期，后台刷新
        this._refreshUserMembershipInBackground(authCookies);
        return cachedMembership;
      }

      const response = await this._fetch("/api/membership/user", {
        headers: {
          'Cookie': authCookies,
          'X-Platform': 'tv'
        }
      });
      
      const lunaMembership = await response.json();
      
      // 验证响应数据
      if (!lunaMembership) {
        throw new Error('Invalid membership data');
      }
      
      // 使用适配器转换数据格式
      const membership = MembershipAdapter.convertToOneTVMembership(lunaMembership);
      
      // 缓存转换后的会员信息
      await this.cacheUserMembership(membership);
      
      return membership;
    } catch (error) {
      console.error("获取会员信息失败:", error);
      
      // 尝试从缓存获取作为降级方案
      const cachedMembership = await this.getCachedUserMembership();
      if (cachedMembership) {
        return cachedMembership;
      }
      
      // 返回默认免费会员
      return this.getDefaultUserMembership();
    }
  }
  
  // 获取缓存的用户会员信息
  private async getCachedUserMembership(): Promise<UserMembership | null> {
    try {
      const cached = await AsyncStorage.getItem('cached_user_membership');
      return cached ? JSON.parse(cached) : null;
    } catch (error) {
      console.error('读取缓存的会员信息失败:', error);
      return null;
    }
  }
  
  // 缓存用户会员信息
  private async cacheUserMembership(membership: UserMembership): Promise<void> {
    try {
      await AsyncStorage.setItem('cached_user_membership', JSON.stringify(membership));
    } catch (error) {
      console.error('缓存会员信息失败:', error);
    }
  }
  
  // 后台异步刷新用户会员信息
  private async _refreshUserMembershipInBackground(authCookies: string): Promise<void> {
    try {
      const response = await this._fetch("/api/membership/user", {
        headers: {
          'Cookie': authCookies,
          'X-Platform': 'tv'
        }
      });
      const lunaMembership = await response.json();
      const membership = MembershipAdapter.convertToOneTVMembership(lunaMembership);
      await this.cacheUserMembership(membership);
    } catch (error) {
      console.warn("后台刷新会员信息失败:", error);
      // 静默失败
    }
  }
  
  // 获取默认会员信息
  private getDefaultUserMembership(): UserMembership {
    return {
      userId: "",
      tier: "default",
      startDate: Date.now(),
      endDate: Date.now(),
      status: "expired"
    };
  }

  // 卡券系统API方法
  async redeemCoupon(code: string): Promise<RedeemResult> {
    // 验证卡券码格式
    if (!code || typeof code !== 'string' || code.trim().length === 0) {
      return {
        success: false,
        message: "请输入有效的卡券码"
      };
    }
    
    try {
      const trimmedCode = code.trim().toUpperCase(); // 标准化卡券码格式
      
      const authCookies = await AsyncStorage.getItem("authCookies");
      if (!authCookies) {
        return {
          success: false,
          message: "请先登录"
        };
      }
      
      // 检查是否已经尝试兑换过此卡券（防止重复提交）
      const recentlyRedeemed = await this.getRecentlyRedeemedCoupons();
      if (recentlyRedeemed.includes(trimmedCode)) {
        return {
          success: false,
          message: "请勿重复提交相同的卡券码"
        };
      }
      
      const response = await this._fetch("/api/coupon/redeem", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          'Cookie': authCookies,
          'X-Platform': 'tv'
        },
        body: JSON.stringify({ code: trimmedCode, platform: 'tv' }),
      });
      
      const result = await response.json();
      
      // 记录最近兑换的卡券
      if (result.success) {
        await this.addRecentlyRedeemedCoupon(trimmedCode);
        // 清除用户卡券缓存，确保下次获取最新数据
        await AsyncStorage.removeItem('cached_user_coupons');
        // 清除用户会员缓存
        await AsyncStorage.removeItem('cached_user_membership');
      }
      
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
        message: error instanceof Error && error.message === 'UNAUTHORIZED' 
          ? "登录已过期，请重新登录" 
          : "兑换失败，请稍后重试"
      };
    }
  }
  
  // 获取最近兑换的卡券列表（用于防重复）
  private async getRecentlyRedeemedCoupons(): Promise<string[]> {
    try {
      const data = await AsyncStorage.getItem('recently_redeemed_coupons');
      if (!data) return [];
      
      const { coupons, timestamp } = JSON.parse(data);
      // 超过30分钟的数据清空
      if (Date.now() - timestamp > 30 * 60 * 1000) {
        await AsyncStorage.removeItem('recently_redeemed_coupons');
        return [];
      }
      
      return coupons;
    } catch (error) {
      console.error('获取最近兑换卡券失败:', error);
      return [];
    }
  }
  
  // 添加最近兑换的卡券
  private async addRecentlyRedeemedCoupon(code: string): Promise<void> {
    try {
      const coupons = await this.getRecentlyRedeemedCoupons();
      coupons.unshift(code); // 添加到开头
      // 只保留最近10个
      const recentCoupons = coupons.slice(0, 10);
      
      await AsyncStorage.setItem('recently_redeemed_coupons', JSON.stringify({
        coupons: recentCoupons,
        timestamp: Date.now()
      }));
    } catch (error) {
      console.error('添加最近兑换卡券失败:', error);
    }
  }

  async getUserCoupons(): Promise<Coupon[]> {
    try {
      const authCookies = await AsyncStorage.getItem("authCookies");
      if (!authCookies) {
        return [];
      }
      
      // 先尝试从缓存获取
      const cachedCoupons = await this.getCachedUserCoupons();
      if (cachedCoupons) {
        // 后台异步刷新数据
        this._refreshUserCouponsInBackground(authCookies);
        return cachedCoupons;
      }

      const response = await this._fetch("/api/coupon/user", {
        headers: {
          'Cookie': authCookies,
          'X-Platform': 'tv'
        }
      });
      const lunaCoupons = await response.json();
      
      // 验证响应数据格式
      if (!Array.isArray(lunaCoupons)) {
        throw new Error('Invalid coupons data format');
      }
      
      // 转换卡券列表
      const coupons = lunaCoupons.map((coupon: any) => CouponAdapter.convertToOneTVCoupon(coupon));
      
      // 缓存卡券列表
      await this.cacheUserCoupons(coupons);
      
      return coupons;
    } catch (error) {
      console.error("获取卡券列表失败:", error);
      
      // 尝试从缓存获取作为降级方案
      const cachedCoupons = await this.getCachedUserCoupons();
      if (cachedCoupons) {
        return cachedCoupons;
      }
      
      return [];
    }
  }
  
  // 获取缓存的用户卡券列表
  private async getCachedUserCoupons(): Promise<Coupon[]> {
    try {
      const cached = await AsyncStorage.getItem('cached_user_coupons');
      if (cached) {
        const { coupons, timestamp } = JSON.parse(cached);
        // 检查缓存是否过期（1小时）
        if (Date.now() - timestamp < 60 * 60 * 1000) {
          return coupons;
        }
      }
      return [];
    } catch (error) {
      console.error('读取缓存的卡券列表失败:', error);
      return [];
    }
  }
  
  // 缓存用户卡券列表
  private async cacheUserCoupons(coupons: Coupon[]): Promise<void> {
    try {
      await AsyncStorage.setItem('cached_user_coupons', JSON.stringify({
        coupons,
        timestamp: Date.now()
      }));
    } catch (error) {
      console.error('缓存卡券列表失败:', error);
    }
  }
  
  // 后台异步刷新用户卡券列表
  private async _refreshUserCouponsInBackground(authCookies: string): Promise<void> {
    try {
      const response = await this._fetch("/api/coupon/user", {
        headers: {
          'Cookie': authCookies,
          'X-Platform': 'tv'
        }
      });
      const lunaCoupons = await response.json();
      const coupons = lunaCoupons.map((coupon: any) => CouponAdapter.convertToOneTVCoupon(coupon));
      await this.cacheUserCoupons(coupons);
    } catch (error) {
      console.warn("后台刷新卡券列表失败:", error);
      // 静默失败
    }
  }

  public async checkCouponStatus(code: string): Promise<CouponStatusInfo> {
    // 验证卡券码格式
    if (!code || typeof code !== 'string' || code.trim().length === 0) {
      return {
        code: code || '',
        isValid: false,
        status: CouponStatus.INVALID,
        message: "请输入有效的卡券码"
      };
    }

    const trimmedCode = code.trim().toUpperCase(); // 移到try外面，确保catch中也能访问

    try {
      // 先尝试从缓存获取卡券状态
      const cachedStatus = await this.getCachedCouponStatus(trimmedCode);
      if (cachedStatus) {
        return cachedStatus;
      }

      const authCookies = await AsyncStorage.getItem("authCookies");
      const response = await this._fetch(`/api/coupon/status?code=${encodeURIComponent(trimmedCode)}`, {
        headers: {
          'Cookie': authCookies || '',
          'X-Platform': 'tv'
        }
      });
      const lunaStatus = await response.json();
      
      // 验证响应数据
      if (!lunaStatus || typeof lunaStatus !== 'object') {
        throw new Error('Invalid coupon status data');
      }
      
      // 转换状态信息
      const status = CouponAdapter.convertToOneTVCouponStatus(lunaStatus);
      
      // 缓存卡券状态（只缓存有效的卡券状态，缓存5分钟）
      if (status.isValid) {
        await this.cacheCouponStatus(trimmedCode, status);
      }
      
      return status;
    } catch (error) {
      console.error("检查卡券状态失败:", error);
      return {
        code: trimmedCode, // 使用已经定义的trimmedCode
        isValid: false,
        status: CouponStatus.INVALID,
        message: (error instanceof Error && error.message === 'UNAUTHORIZED') 
          ? "登录已过期，请重新登录" 
          : "卡券不存在或已失效"
      };
    }
  }
  
  // 获取缓存的卡券状态
  private async getCachedCouponStatus(code: string): Promise<CouponStatusInfo | null> {
    try {
      const cacheKey = `coupon_status_${code}`;
      const cached = await AsyncStorage.getItem(cacheKey);
      if (cached) {
        const { status, timestamp } = JSON.parse(cached);
        // 检查缓存是否过期（5分钟）
        if (Date.now() - timestamp < 5 * 60 * 1000) {
          return status;
        }
        // 过期后清除缓存
        await AsyncStorage.removeItem(cacheKey);
      }
      return null;
    } catch (error) {
      console.error('读取缓存的卡券状态失败:', error);
      return null;
    }
  }
  
  // 缓存卡券状态
  private async cacheCouponStatus(code: string, status: CouponStatusInfo): Promise<void> {
    try {
      const cacheKey = `coupon_status_${code}`;
      await AsyncStorage.setItem(cacheKey, JSON.stringify({
        status,
        timestamp: Date.now()
      }));
    } catch (error) {
      console.error('缓存卡券状态失败:', error);
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
