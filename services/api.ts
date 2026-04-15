import AsyncStorage from "@react-native-async-storage/async-storage";
import Logger from "../utils/Logger";

const logger = Logger.withTag("ApiService");

import { resourceMatcher } from "./resourceMatcher";
import {
  MembershipTier,
  UserMembership,
  type MembershipConfig,
  type MembershipResponse,
  type Coupon,
  CouponBatch,
  type RedeemResult,
  type LiveApiResponse,
  type LiveSource,
  type SearchResult,
  type VideoDetail,
  type ApiSite,
  type DoubanResponse,
  type PlayRecord,
  type Favorite,
  type ServerConfig
} from "./types";

// 主 API 类
export class Api {
  private baseURL: string;
  private searchCache: Map<string, { results: SearchResult[]; timestamp: number }> = new Map(); // 搜索结果缓存

  constructor(baseURL?: string) {
    // 默认使用本地 LunaTV 后端服务
    this.baseURL = baseURL || "http://192.168.100.101:3000";
    console.log('API constructor called with baseURL:', this.baseURL);
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

    // 检查是否是登录请求，如果是，不添加认证头
    const isLoginRequest = requestHeaders.has('X-Login-Request');
    console.log('Building headers, isLoginRequest:', isLoginRequest);

    if (!isLoginRequest) {
      // 添加认证 cookie
      try {
        console.log('Attempting to get auth cookie from AsyncStorage');
        let authCookieValue = await AsyncStorage.getItem("authCookies");
        console.log('Auth cookie value from AsyncStorage:', authCookieValue);

        if (!authCookieValue) {
          console.warn('No auth cookie found in AsyncStorage, attempting to login...');
          // 尝试登录获取 cookie
          try {
            const credentialsStr = await AsyncStorage.getItem("mytv_login_credentials");
            console.log('Saved credentials:', credentialsStr);

            // 只有在有保存的凭证时才尝试登录
            if (!credentialsStr) {
              console.warn('No saved credentials found, skipping auto-login');
            } else {
              const authInfo = JSON.parse(credentialsStr);
              const username = authInfo.username;
              const password = authInfo.password;

              if (!username || !password) {
                console.warn('Invalid saved credentials, skipping auto-login');
              } else {
                console.log('Attempting login with username:', username);

                // 直接使用 fetch 发送登录请求，避免递归调用 _fetch
                const loginResponse = await fetch(`${this.baseURL}/api/login`, {
                  method: "POST",
                  headers: {
                    "Content-Type": "application/json",
                    "X-Login-Request": "true"
                  },
                  body: JSON.stringify({ username, password }),
                });

                console.log('Login response status:', loginResponse.status);

                if (loginResponse.ok) {
                  // 保存认证 cookie
                  const loginSetCookie = loginResponse.headers.get('Set-Cookie');
                  console.log('Login Set-Cookie header:', loginSetCookie);

                  if (loginSetCookie) {
                    // 提取 user_auth cookie
                    const cookieParts = loginSetCookie.split(';');
                    for (const part of cookieParts) {
                      if (part.trim().startsWith('user_auth=')) {
                        // 提取 user_auth 的值（不包含键名）
                        authCookieValue = part.trim().substring('user_auth='.length);
                        console.log('Extracted login user_auth value:', authCookieValue);
                        break;
                      }
                    }

                    if (authCookieValue) {
                      // 对后端返回的cookie进行解码，避免双重编码问题
                      let decodedCookieValue = authCookieValue;
                      try {
                        // 尝试解码一次（处理双重编码的情况）
                        decodedCookieValue = decodeURIComponent(authCookieValue);
                        console.log('Decoded cookie value:', decodedCookieValue);

                        // 再次尝试解码（确保处理双重编码）
                        if (decodedCookieValue.startsWith('%')) {
                          decodedCookieValue = decodeURIComponent(decodedCookieValue);
                          console.log('Double decoded cookie value:', decodedCookieValue);
                        }
                      } catch (decodeError) {
                        console.warn('Failed to decode cookie, using original value:', decodeError);
                      }

                      // 保存解码后的值
                      await AsyncStorage.setItem("authCookies", decodedCookieValue);
                      console.log('Auth cookie value saved successfully after login:', decodedCookieValue);
                    }
                  }
                }
              }
            }
          } catch (loginError) {
            console.warn("Login failed:", loginError);
          }
        }

        if (authCookieValue) {
          // 组合完整的 cookie 字符串
          const cookieString = `user_auth=${authCookieValue}`;
          requestHeaders.set('Cookie', cookieString);
          console.log('Added auth cookie to request:', cookieString);
        } else {
          console.warn('No auth cookie found in AsyncStorage');
          // 尝试从 AsyncStorage 中获取所有键值，看看是否有其他相关的 cookie
          try {
            const keys = await AsyncStorage.getAllKeys();
            console.log('All keys in AsyncStorage:', keys);
            for (const key of keys) {
              if (key.includes('auth') || key.includes('cookie')) {
                const value = await AsyncStorage.getItem(key);
                console.log(`AsyncStorage key ${key}:`, value);
              }
            }
          } catch (error) {
            console.error('Failed to get AsyncStorage keys:', error);
          }
        }
      } catch (error) {
        console.error('Failed to add auth cookies:', error);
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

    console.log('===== Starting _fetch =====');
    console.log('URL:', url);
    console.log('Options:', options);
    console.log('Retry count:', retryCount);
    console.log('Avoid re-login:', avoidReLogin);

    const headers = await this.buildHeaders(options.headers);

    try {
      const fullUrl = `${this.baseURL}${url}`;
      console.log('Full URL:', fullUrl);
      console.log('Request headers:', headers);

      // 定义处理响应的通用函数
      const handleResponse = async (response: Response, isProxy: boolean): Promise<Response> => {
        console.log(`${isProxy ? 'Proxy' : 'Direct'} response status:`, response.status);

        // 尝试获取所有响应头部，以便更好地调试
        const responseHeaders: Record<string, string> = {};
        response.headers.forEach((value, key) => {
          responseHeaders[key] = value;
        });
        console.log(`${isProxy ? 'Proxy' : 'Direct'} response headers:`, responseHeaders);

        // 保存服务端返回的 cookie（无论状态码是什么）
        const setCookie = response.headers.get('Set-Cookie');
        console.log('Set-Cookie header:', setCookie);

        if (setCookie) {
          try {
            console.log('Processing Set-Cookie header:', setCookie);
            // 提取 user_auth cookie
            const cookieParts = setCookie.split(';');
            console.log('Cookie parts:', cookieParts);

            let userAuthValue = '';
            for (const part of cookieParts) {
              console.log('Checking cookie part:', part);
              if (part.trim().startsWith('user_auth=')) {
                // 提取 user_auth 的值（不包含键名）
                userAuthValue = part.trim().substring('user_auth='.length);
                console.log('Extracted user_auth value:', userAuthValue);
                break;
              }
            }

            if (userAuthValue) {
              // 对后端返回的cookie进行解码，避免双重编码问题
              let decodedCookieValue = userAuthValue;
              try {
                // 尝试解码一次（处理双重编码的情况）
                decodedCookieValue = decodeURIComponent(userAuthValue);
                console.log('Decoded cookie value:', decodedCookieValue);

                // 再次尝试解码（确保处理双重编码）
                if (decodedCookieValue.startsWith('%')) {
                  decodedCookieValue = decodeURIComponent(decodedCookieValue);
                  console.log('Double decoded cookie value:', decodedCookieValue);
                }
              } catch (decodeError) {
                console.warn('Failed to decode cookie, using original value:', decodeError);
              }

              // 保存解码后的值
              console.log('Attempting to save auth cookie to AsyncStorage:', decodedCookieValue);
              try {
                await AsyncStorage.setItem("authCookies", decodedCookieValue);
                console.log('Auth cookie value saved successfully:', decodedCookieValue);

                // 验证保存是否成功
                const savedCookie = await AsyncStorage.getItem("authCookies");
                console.log('Saved cookie in AsyncStorage:', savedCookie);

                // 尝试获取所有 AsyncStorage 键，确认保存成功
                const allKeys = await AsyncStorage.getAllKeys();
                console.log('All AsyncStorage keys:', allKeys);
                for (const key of allKeys) {
                  const value = await AsyncStorage.getItem(key);
                  console.log(`AsyncStorage ${key}:`, value);
                }
              } catch (saveError) {
                console.error('Failed to save auth cookie to AsyncStorage:', saveError);
              }
            } else {
              console.warn('No user_auth cookie found in Set-Cookie header');
            }
          } catch (storageError) {
            console.error('Failed to process auth cookies:', storageError);
          }
        } else {
          console.warn('No Set-Cookie header found in response');
        }

        if (response.status === 401 && retryCount < 1 && !avoidReLogin) {
          console.log('Received 401 error, attempting to re-login');

          // 尝试自动重新登录
          try {
            const credentialsStr = await AsyncStorage.getItem("mytv_login_credentials");
            console.log('Saved credentials:', credentialsStr);

            // 只有在有保存的凭证时才尝试重新登录
            if (!credentialsStr) {
              console.warn('No saved credentials found, skipping re-login');
            } else {
              const authInfo = JSON.parse(credentialsStr);
              const username = authInfo.username;
              const password = authInfo.password;

              if (!username || !password) {
                console.warn('Invalid saved credentials, skipping re-login');
              } else {
                console.log('Attempting re-login with username:', username);

                // 直接使用 fetch 发送登录请求，避免递归调用 _fetch
                const loginResponse = await fetch(`${this.baseURL}/api/login`, {
                  method: "POST",
                  headers: {
                    "Content-Type": "application/json",
                    "X-Login-Request": "true"
                  },
                  body: JSON.stringify({ username, password }),
                });

                console.log('Re-login response status:', loginResponse.status);

                if (loginResponse.ok) {
                  // 保存认证 cookie
                  const loginSetCookie = loginResponse.headers.get('Set-Cookie');
                  console.log('Re-login Set-Cookie header:', loginSetCookie);

                  if (loginSetCookie) {
                    try {
                      // 提取 user_auth cookie
                      const cookieParts = loginSetCookie.split(';');
                      let userAuthValue = '';
                      for (const part of cookieParts) {
                        if (part.trim().startsWith('user_auth=')) {
                          // 提取 user_auth 的值（不包含键名）
                          userAuthValue = part.trim().substring('user_auth='.length);
                          break;
                        }
                      }
                      console.log('Extracted re-login user_auth value:', userAuthValue);

                      if (userAuthValue) {
                        // 对后端返回的cookie进行解码，避免双重编码问题
                        let decodedCookieValue = userAuthValue;
                        try {
                          // 尝试解码一次（处理双重编码的情况）
                          decodedCookieValue = decodeURIComponent(userAuthValue);
                          console.log('Decoded cookie value:', decodedCookieValue);

                          // 再次尝试解码（确保处理双重编码）
                          if (decodedCookieValue.startsWith('%')) {
                            decodedCookieValue = decodeURIComponent(decodedCookieValue);
                            console.log('Double decoded cookie value:', decodedCookieValue);
                          }
                        } catch (decodeError) {
                          console.warn('Failed to decode cookie, using original value:', decodeError);
                        }

                        // 保存解码后的值
                        await AsyncStorage.setItem("authCookies", decodedCookieValue);
                        console.log('Auth cookie value saved successfully after re-login:', decodedCookieValue);
                      }
                    } catch (storageError) {
                      console.error('Failed to save auth cookies after re-login:', storageError);
                    }
                  }

                  console.log('重新登录成功，重试原请求...');
                  // 重新尝试原请求
                  return this._fetch(url, options, retryCount + 1);
                }
              }
            }
          } catch (loginError) {
            console.warn("Auto re-login failed:", loginError);
          }
          // 重新登录失败，不抛出错误，继续执行后续逻辑
          console.log('Re-login failed, continuing with original response');
        }

        if (!response.ok) {
          // 尝试获取错误响应的内容，以便更好地理解问题
          // 先检查响应是否已经被读取过
          try {
            const errorText = await response.clone().text();
            console.log('Error response text:', errorText);
          } catch (cloneError) {
            console.log('Could not clone response for error logging');
          }
          // 即使出错也要保存 cookie，所以不在这里抛出错误
          // 而是让调用者处理错误
        }

        return response;
      };

      // 直接使用 fetch 发送请求，避免代理服务可能导致的头部丢失问题
      try {
        console.log('Sending direct fetch request to:', fullUrl);
        const response = await fetch(fullUrl, {
          ...options,
          headers,
          signal: options.signal,
        });
        console.log('Direct fetch response received, status:', response.status);
        return await handleResponse(response, false);
      } catch (directError) {
        console.error('Direct fetch failed:', directError);
        
        // 网络错误重试逻辑
        if (retryCount < 2) { // 最多重试2次
          const isNetworkError = directError instanceof TypeError && 
            (directError.message.includes('network') || 
             directError.message.includes('connect') || 
             directError.message.includes('timeout') ||
             directError.name === 'AbortError');
          
          if (isNetworkError) {
            console.log(`Network error detected, retrying (${retryCount + 1}/3)...`);
            // 指数退避策略
            const delay = Math.pow(2, retryCount) * 1000; // 1s, 2s, 4s
            await new Promise(resolve => setTimeout(resolve, delay));
            return this._fetch(url, options, retryCount + 1, avoidReLogin);
          }
        }
        
        throw directError;
      }
    } catch (error) {
      console.error('Fetch error:', error);
      throw error;
    }
  }

  async login(username?: string | undefined, password?: string): Promise<{ ok: boolean }> {
    try {
      // 使用用户提供的用户名和密码
      if (!username || !password) {
        throw new Error("用户名和密码不能为空");
      }

      console.log('Login with username:', username);

      // 保存用户凭证到 AsyncStorage，以便自动重新登录时使用
      try {
        await AsyncStorage.setItem("mytv_login_credentials", JSON.stringify({ username, password }));
        console.log('User credentials saved to AsyncStorage');
      } catch (saveError) {
        console.error('Failed to save user credentials:', saveError);
      }

      // 直接使用 fetch 发送登录请求，避免递归调用 _fetch
      const fullUrl = `${this.baseURL}/api/login`;
      console.log('Sending login request to:', fullUrl);

      const response = await fetch(fullUrl, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "X-Login-Request": "true"
        },
        body: JSON.stringify({ username, password }),
      });

      console.log('Login response status:', response.status);

      // 尝试获取所有响应头部
      const responseHeaders: Record<string, string> = {};
      response.headers.forEach((value, key) => {
        responseHeaders[key] = value;
      });
      console.log('Login response headers:', responseHeaders);

      // 保存认证 cookie（无论登录是否成功，都保存 cookie）
      const setCookie = response.headers.get('Set-Cookie');
      console.log('Login Set-Cookie header:', setCookie);

      if (setCookie) {
        try {
          // 提取 user_auth cookie
          const cookieParts = setCookie.split(';');
          console.log('Login cookie parts:', cookieParts);

          let userAuthValue = '';
          for (const part of cookieParts) {
            console.log('Checking login cookie part:', part);
            if (part.trim().startsWith('user_auth=')) {
              // 提取 user_auth 的值（不包含键名）
              userAuthValue = part.trim().substring('user_auth='.length);
              console.log('Extracted login user_auth value:', userAuthValue);
              break;
            }
          }

          if (userAuthValue) {
            // 对后端返回的cookie进行解码，避免双重编码问题
            // 后端可能返回双重编码的cookie，需要解码后再保存
            let decodedCookieValue = userAuthValue;
            try {
              // 尝试解码一次（处理双重编码的情况）
              decodedCookieValue = decodeURIComponent(userAuthValue);
              console.log('Decoded cookie value:', decodedCookieValue);

              // 再次尝试解码（确保处理双重编码）
              if (decodedCookieValue.startsWith('%')) {
                decodedCookieValue = decodeURIComponent(decodedCookieValue);
                console.log('Double decoded cookie value:', decodedCookieValue);
              }
            } catch (decodeError) {
              console.warn('Failed to decode cookie, using original value:', decodeError);
            }

            // 保存解码后的值
            console.log('Attempting to save login auth cookie to AsyncStorage:', decodedCookieValue);
            await AsyncStorage.setItem("authCookies", decodedCookieValue);
            console.log('Login auth cookie value saved successfully:', decodedCookieValue);

            // 验证保存是否成功
            const savedCookie = await AsyncStorage.getItem("authCookies");
            console.log('Saved login cookie in AsyncStorage:', savedCookie);

            // 尝试获取所有 AsyncStorage 键，确认保存成功
            const allKeys = await AsyncStorage.getAllKeys();
            console.log('All AsyncStorage keys after save:', allKeys);
            for (const key of allKeys) {
              if (key.includes('auth') || key.includes('cookie')) {
                const value = await AsyncStorage.getItem(key);
                console.log(`AsyncStorage key ${key}:`, value);
              }
            }
          } else {
            console.warn('No user_auth cookie found in Set-Cookie header:', setCookie);
          }
        } catch (storageError) {
          console.error('Failed to save auth cookies:', storageError);
        }
      } else {
        console.warn('No Set-Cookie header found in login response');
      }

      const responseData = await response.json();
      console.log('Login response data:', responseData);
      return responseData;
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

      // 保存认证 cookie（无论注册是否成功，都保存 cookie）
      const setCookie = response.headers.get('Set-Cookie');
      console.log('Register Set-Cookie header:', setCookie);

      if (setCookie) {
        try {
          // 提取 user_auth cookie
          const cookieParts = setCookie.split(';');
          console.log('Register cookie parts:', cookieParts);

          let userAuthValue = '';
          for (const part of cookieParts) {
            console.log('Checking register cookie part:', part);
            if (part.trim().startsWith('user_auth=')) {
              // 提取 user_auth 的值（不包含键名）
              userAuthValue = part.trim().substring('user_auth='.length);
              console.log('Extracted register user_auth value:', userAuthValue);
              break;
            }
          }

          if (userAuthValue) {
            // 对后端返回的cookie进行解码，避免双重编码问题
            let decodedCookieValue = userAuthValue;
            try {
              // 尝试解码一次（处理双重编码的情况）
              decodedCookieValue = decodeURIComponent(userAuthValue);
              console.log('Decoded cookie value:', decodedCookieValue);

              // 再次尝试解码（确保处理双重编码）
              if (decodedCookieValue.startsWith('%')) {
                decodedCookieValue = decodeURIComponent(decodedCookieValue);
                console.log('Double decoded cookie value:', decodedCookieValue);
              }
            } catch (decodeError) {
              console.warn('Failed to decode cookie, using original value:', decodeError);
            }

            // 保存解码后的值
            console.log('Attempting to save register auth cookie to AsyncStorage:', decodedCookieValue);
            await AsyncStorage.setItem("authCookies", decodedCookieValue);
            console.log('Register auth cookie value saved successfully:', decodedCookieValue);

            // 验证保存是否成功
            const savedCookie = await AsyncStorage.getItem("authCookies");
            console.log('Saved register cookie in AsyncStorage:', savedCookie);
          } else {
            console.warn('No user_auth cookie found in Set-Cookie header:', setCookie);
          }
        } catch (storageError) {
          console.error('Failed to save auth cookies:', storageError);
        }
      } else {
        console.warn('No Set-Cookie header found in register response');
      }

      const responseData = await response.json();
      console.log('Register response data:', responseData);
      return responseData;
    } catch (error) {
      console.error('Register error:', error);
      throw error;
    }
  }

  async cardLogin(code: string): Promise<{ success: boolean; message: string; username?: string; redeemSuccess?: boolean; redeemMessage?: string; data?: unknown; cardStatus?: string }> {
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

      // 不再清除认证cookie，因为服务端可能已经返回了有效的 cookie
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

  async searchVideos(query: string, doubanId?: string): Promise<{ results: SearchResult[] }> {
    console.log(`[SEARCH] Starting search for "${query}" with doubanId: ${doubanId || 'none'}`);
    
    // 1. 生成搜索变体（参考 LunaTV 实现）
    const searchVariants = resourceMatcher.generateSearchVariants(query);
    console.log('Search variants (searchVideos):', searchVariants);

    // 2. 检查缓存（优化：添加搜索结果缓存）
    const cacheKey = `search:${query}:${doubanId || 'none'}`;
    const cached = this.searchCache.get(cacheKey);
    if (cached && Date.now() - cached.timestamp < 5 * 60 * 1000) { // 5 分钟缓存（缩短缓存时间）
      console.log(`[CACHE HIT] Returning cached results for "${query}"`);
      return { results: cached.results };
    }

    // 3. 并行搜索所有变体，合并所有结果（参考 LunaTV）
    // 优化：限制并发数为 10，避免过多同时请求
    const MAX_CONCURRENT = 10;
    
    // 创建带超时的请求函数 - 增加超时时间到15秒，给所有资源站更多响应时间
    const fetchWithTimeout = async (variant: string, timeoutMs = 15000): Promise<SearchResult[]> => {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), timeoutMs);
      
      try {
        const url = `/api/search?q=${encodeURIComponent(variant)}`;
        const response = await this._fetch(url, { signal: controller.signal });
        clearTimeout(timeoutId);
        const data = await response.json();
        const variantResults = data.results || [];

        console.log(`Variant "${variant}" found ${variantResults.length} results`);
        
        // 处理 vod_play_from 和 vod_play_url 字段，转换为 play_sources
        const processedResults = variantResults.map((item: any) => {
          // 优先使用 API 返回的 lines 字段（LunaTV 格式）
          if (item.lines && Array.isArray(item.lines) && item.lines.length > 0) {
            console.log('Using lines from API:', item.lines.length);
            item.play_sources = item.lines.map((line: any) => ({
              name: line.name || '未知线路',
              episodes: line.episodes || [],
              episodes_titles: line.episodes_titles || [],
            }));
          } else if (item.vod_play_from && item.vod_play_url) {
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
                console.log('Processing episode pairs:', episodePairs.length);
                
                episodePairs.forEach((pair: string) => {
                  const parts = pair.split('$');
                  if (parts.length >= 2) {
                    episodes_titles.push(parts[0].trim());
                    episodes.push(parts[1].trim());
                  }
                });
                
                // 即使没有剧集，也添加线路信息
                play_sources.push({ name: sourceName, episodes, episodes_titles });
              }
            });
            
            console.log('Parsed play_sources:', play_sources.length);
            
            if (play_sources.length > 0) {
              item.play_sources = play_sources;
            }
          }
          
          // 如果没有 episodes 和 episodes_titles 字段，使用第一个播放源的内容
          if ((!item.episodes || item.episodes.length === 0) && item.play_sources && item.play_sources.length > 0) {
            item.episodes = item.play_sources[0].episodes;
            item.episodes_titles = item.play_sources[0].episodes_titles;
          }
          
          return item;
        });
        
        return processedResults;
      } catch (error) {
        clearTimeout(timeoutId);
        console.warn(`Search variant "${variant}" failed:`, error);
        return [];
      }
    };

    // 分批并发搜索（优化：限制搜索站点数量）
    const variantPromises = searchVariants.map((variant) => fetchWithTimeout(variant));
    
    // 等待所有搜索完成
    const variantResultsArray = await Promise.all(variantPromises);

    // 合并所有结果
    const allResults = variantResultsArray.flat();

    // 如果没有匹配结果，返回所有结果并去重
    if (allResults.length === 0) {
      console.log(`[SEARCH] No results found for "${query}" (doubanId: ${doubanId || 'none'})`);
      return { results: [] };
    }

    console.log(`[SEARCH] Total results from all variants: ${allResults.length}`);

    // 使用智能匹配过滤所有结果（参考 LunaTV）
    const filteredResults = this.filterSearchResults(allResults, query, doubanId);

    console.log(`[SEARCH] After filterSearchResults: ${filteredResults.length} results`);

    // 如果有匹配结果，返回匹配结果；否则返回所有结果
    const finalResults = filteredResults.length > 0 ? filteredResults : allResults;

    // 对最终结果进行去重
    const seenIds = new Set<string>();
    const deduplicatedResults = finalResults.filter((result) => {
      // 生成唯一键：优先使用 source + id，如果 id 为空则使用 title + year + source_name
      let uniqueKey;
      if (result.source && result.id) {
        uniqueKey = `${result.source}_${result.id}`;
      } else {
        // 当 id 为空时，使用 title + year + source_name 作为唯一标识
        const title = result.title || 'unknown';
        const year = result.year || 'unknown';
        const sourceName = result.source_name || 'unknown';
        uniqueKey = `${result.source || 'unknown'}_${title}_${year}_${sourceName}`;
      }
      
      if (seenIds.has(uniqueKey)) {
        return false;
      }
      seenIds.add(uniqueKey);
      return true;
    });

    // 不再限制返回结果数量，后端会持续增加新的视频源
    console.log(`Final results: ${deduplicatedResults.length} (no limit)`);

    // 保存到缓存
    this.searchCache.set(cacheKey, {
      results: deduplicatedResults,
      timestamp: Date.now(),
    });

    return { results: deduplicatedResults };
  }

  /**
   * 智能过滤搜索结果（参考 LunaTV 实现）
   */
  private filterSearchResults(results: SearchResult[], query: string, doubanId?: string): SearchResult[] {
    // 首先对结果进行去重
    const seenIds = new Set<string>();
    const deduplicatedResults = results.filter((result) => {
      // 生成唯一键：优先使用 source + id，如果 id 为空则使用 title + year + source_name
      let uniqueKey;
      if (result.source && result.id) {
        uniqueKey = `${result.source}_${result.id}`;
      } else {
        // 当 id 为空时，使用 title + year + source_name 作为唯一标识
        const title = result.title || 'unknown';
        const year = result.year || 'unknown';
        const sourceName = result.source_name || 'unknown';
        uniqueKey = `${result.source || 'unknown'}_${title}_${year}_${sourceName}`;
      }
      
      if (seenIds.has(uniqueKey)) {
        return false;
      }
      seenIds.add(uniqueKey);
      return true;
    });

    console.log(`After deduplication: ${deduplicatedResults.length} results`);

    // 为每个结果创建 play_sources（如果没有的话）
    const processedResults = deduplicatedResults.map((result) => {
      // 如果没有 play_sources 但有 episodes，创建一个默认的播放源
      if ((!result.play_sources || result.play_sources.length === 0) && result.episodes && result.episodes.length > 0) {
        result.play_sources = [{
          name: '默认线路',
          episodes: result.episodes,
          episodes_titles: result.episodes_titles || [],
        }];
        console.log(`[FALLBACK] Created default play_source for ${result.title} (${result.source_name})`);
      }
      return result;
    });

    // 如果有豆瓣 ID，优先返回匹配豆瓣 ID 的结果，但保留官方资源站
    if (doubanId) {
      const doubanMatches = processedResults.filter(r => 
        r.doubanId === doubanId || r.douban_id?.toString() === doubanId ||
        r.source === 'aixuexi.com' // 保留官方资源站
      );
      if (doubanMatches.length > 0) {
        console.log(`Found ${doubanMatches.length} results with matching doubanId: ${doubanId} (including official source)`);
        return doubanMatches;
      } else {
        console.log(`No exact doubanId matches found for ${doubanId}, falling back to smart matching`);
      }
    }

    // 直接返回所有去重后的结果，不使用匹配引擎排序
    // 因为匹配引擎无法访问后端权重，排序将在 detailStore 中使用后端权重进行
    console.log(`Skipping resourceMatcher sorting - will sort with backend weights in detailStore`);
    console.log(`Returning ${processedResults.length} deduplicated results`);
    return processedResults;
  }

  async searchVideo(query: string, resourceId: string, signal?: AbortSignal): Promise<{ results: SearchResult[] }> {
    // 1. 生成搜索变体（参考 LunaTV 实现）
    const searchVariants = resourceMatcher.generateSearchVariants(query);
    console.log('Search variants:', searchVariants);

    // 2. 并行搜索所有变体
    const variantPromises = searchVariants.map(async (variant, index) => {
      try {
        const url = `/api/search/one?q=${encodeURIComponent(variant)}&resourceId=${encodeURIComponent(resourceId)}`;
        const response = await this._fetch(url, { signal });
        const { results } = await response.json();
        return { variant, index, results };
      } catch (error) {
        console.warn(`Search variant "${variant}" failed:`, error);
        return { variant, index, results: [] };
      }
    });

    // 3. 等待所有搜索完成
    const variantResults = await Promise.all(variantPromises);

    // 4. 合并结果
    interface Line {
      name?: string;
      episodes?: string[];
      episodes_titles?: string[];
    }

    interface PlaySource {
      name: string;
      episodes: string[];
      episodes_titles: string[];
    }

    interface SearchItem {
      lines?: Line[];
      play_sources?: PlaySource[];
      vod_play_from?: string;
      vod_play_url?: string;
      year?: number | string;
      vod_year?: number | string;
      release_date?: string;
      info?: string;
      doubanId?: string;
      episodes?: string[];
      episodes_titles?: string[];
      [key: string]: unknown;
    }

    const allResults: SearchItem[] = [];

    // 按原始顺序处理结果（保持优先级）
    variantResults.sort((a, b) => a.index - b.index);

    for (const { variant, results: variantData } of variantResults) {
      if (variantData.length > 0) {
        console.log(`Variant "${variant}" found ${variantData.length} results`);

        // 处理每个结果
        const processedVariantData = variantData.map((item: SearchItem) => {
          // 调试：打印原始数据的所有键名
          console.log(`[DEBUG] Raw item keys for ${item.title}:`, Object.keys(item));
          console.log(`[DEBUG] Raw item episodes:`, item.episodes?.length || 0);
          console.log(`[DEBUG] Raw item play_sources:`, item.play_sources?.length || 0);
          console.log(`[DEBUG] Raw item vod_play_from:`, item.vod_play_from ? 'exists' : 'undefined');
          console.log(`[DEBUG] Raw item vod_play_url:`, item.vod_play_url ? 'exists' : 'undefined');
          console.log(`[DEBUG] Raw item lines:`, item.lines?.length || 0);

          // 优先使用 API 返回的 lines 字段（LunaTV 格式）
          if (item.lines && Array.isArray(item.lines) && item.lines.length > 0) {
            item.play_sources = item.lines.map((line: Line) => ({
              name: line.name || '未知线路',
              episodes: line.episodes || [],
              episodes_titles: line.episodes_titles || [],
            }));
          } else if (item.vod_play_from && item.vod_play_url) {
            const play_sources: Array<{ name: string; episodes: string[]; episodes_titles: string[] }> = [];
            const sources = item.vod_play_from.split('$$$');
            const urls = item.vod_play_url.split('$$$');

            sources.forEach((source: string, index: number) => {
              if (urls[index]) {
                const sourceName = source.replace(/\(.*\)/, '').trim();
                const episodePairs = urls[index].split('#');
                const episodes: string[] = [];
                const episodes_titles: string[] = [];

                episodePairs.forEach((pair: string) => {
                  const parts = pair.split('$');
                  if (parts.length >= 2) {
                    episodes_titles.push(parts[0].trim());
                    episodes.push(parts[1].trim());
                  }
                });

                // 即使没有剧集，也添加线路信息
                play_sources.push({ name: sourceName, episodes, episodes_titles });
              }
            });

            if (play_sources.length > 0) {
              item.play_sources = play_sources;
            }
          }

          // 处理年份字段
          if (item.year) {
            // 已经有 year 字段，保持不变
          } else if (item.vod_year) {
            // 兼容 vod_year 字段
            item.year = item.vod_year;
          } else if (item.release_date) {
            // 从发布日期中提取年份
            const releaseYear = item.release_date.match(/\d{4}/);
            if (releaseYear) {
              item.year = parseInt(releaseYear[0]);
            }
          } else if (item.info) {
            // 从 info 字段中提取年份
            const infoYear = item.info.match(/\d{4}/);
            if (infoYear) {
              item.year = parseInt(infoYear[0]);
            }
          }

          // 设置 doubanId 字段
          item.doubanId = resourceId;

          // 如果没有 episodes 和 episodes_titles 字段，使用第一个播放源的内容
          if ((!item.episodes || item.episodes.length === 0) && item.play_sources && item.play_sources.length > 0) {
            item.episodes = item.play_sources[0].episodes;
            item.episodes_titles = item.play_sources[0].episodes_titles;
          }

          // 如果没有 play_sources 但有 episodes，创建一个默认的播放源
          if ((!item.play_sources || item.play_sources.length === 0) && item.episodes && item.episodes.length > 0) {
            item.play_sources = [{
              name: '默认线路',
              episodes: item.episodes,
              episodes_titles: item.episodes_titles || [],
            }];
            console.log(`[FALLBACK] Created default play_source from episodes for ${item.title}`);
          }

          return item;
        });

        // 添加结果
        allResults.push(...processedVariantData);
      }
    }

    console.log(`Total results from all variants: ${allResults.length}`);

    // 使用智能匹配过滤所有结果（参考 LunaTV）
    const filteredResults = this.filterSearchResults(allResults, query, resourceId);

    console.log(`After filterSearchResults: ${filteredResults.length}`);

    // 如果有匹配结果，返回匹配结果；否则返回所有结果
    const finalResults = filteredResults.length > 0 ? filteredResults : allResults;

    // 对最终结果进行去重
    const seenIds = new Set<string>();
    const deduplicatedResults = finalResults.filter((r) => {
      // 生成唯一键：优先使用 source + id，如果 id 为空则使用 title + year + source_name
      let uniqueKey;
      if (r.source && r.id) {
        uniqueKey = `${r.source}_${r.id}`;
      } else {
        // 当 id 为空时，使用 title + year + source_name 作为唯一标识
        const title = r.title || 'unknown';
        const year = r.year || 'unknown';
        const sourceName = r.source_name || 'unknown';
        uniqueKey = `${r.source || 'unknown'}_${title}_${year}_${sourceName}`;
      }
      
      if (seenIds.has(uniqueKey)) return false;
      seenIds.add(uniqueKey);
      return true;
    });

    // 不再限制返回结果数量，后端会持续增加新的视频源
    console.log(`Final results: ${deduplicatedResults.length} (no limit)`);

    return { results: deduplicatedResults };
  }

  async getResources(signal?: AbortSignal): Promise<ApiSite[]> {
    const url = `/api/search/resources`;
    const response = await this._fetch(url, { signal });
    return response.json();
  }

  // 获取视频源权重 - LunaTV API 端点
  async getSourceWeights(signal?: AbortSignal): Promise<{ [key: string]: number }> {
    const url = `/api/source-weights`;
    try {
      const response = await this._fetch(url, { signal });
      const data = await response.json();
      // 兼容两种格式：{ weights: {...} } 或直接返回 {...}
      return typeof data === 'object' && data !== null && 'weights' in data ? data.weights : data;
    } catch (error) {
      logger.warn(`[API] getSourceWeights failed:`, error);
      return {};
    }
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
      interface LunaTVLevel {
        id: string | number;
        name: string;
        description?: string;
        userGroupId: string | number;
        [key: string]: unknown;
      }

      const response = await this._fetch("/api/member/level");
      const data = await response.json();
      // 转换为前端期望的格式
      const tiers = (data.data || []).map((level: LunaTVLevel) => ({
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
      }));
      return {
        tiers,
        levels: tiers,
        enable: true // 假设 LunaTV 总是启用会员系统
      };
    } catch (error) {
      // 如果 API 调用失败，返回默认配置
      return {
        tiers: [],
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
            tiers: [],
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
          tiers: [],
          levels: [],
          enable: true
        }));

        // 处理 tierId，确保它是合理的等级标识符
        const tierId = membershipData.levelId || membershipData.memberLevelId || membershipData.tierId || "0";
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
          tiers: [],
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
      tiers: [],
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
      interface LunaTVCoupon {
        id: string | number;
        name: string;
        value: number;
        expiryTime?: string | number;
        validityDays?: number;
        minSpend?: number;
        [key: string]: unknown;
      }

      const response = await this._fetch("/api/coupon");
      const data = await response.json();
      const now = Date.now();

      // 转换为前端期望的格式
      const coupons = (data.data || []).map((coupon: LunaTVCoupon) => {
        // 计算过期时间
        const expireTime = coupon.expiryTime ? new Date(coupon.expiryTime).getTime() : coupon.validityDays ? new Date(Date.now() + coupon.validityDays * 24 * 60 * 60 * 1000).getTime() : Date.now() + 30 * 24 * 60 * 60 * 1000;
        // 检查是否过期
        const isExpired = expireTime < now;
        // 确定卡券状态
        let status: 'active' | 'used' | 'expired' | 'invalid' = 'invalid';

        if (isExpired) {
          status = 'expired';
        } else if (coupon.status === 0) {
          status = 'invalid';
        } else if (coupon.status === 1) {
          status = 'active';
        } else {
          status = 'used';
        }

        return {
          code: coupon.code,
          batchId: coupon.batchId || "",
          type: coupon.typeName || coupon.typeId || coupon.type || coupon.name || "卡券", // 使用 LunaTV 返回的类型名称
          tier: coupon.levelName || coupon.memberLevelId || coupon.tier || "", // 使用 LunaTV 返回的等级名称
          durationDays: coupon.validityDays || coupon.durationDays || 30,
          status,
          createdAt: coupon.createdAt ? new Date(coupon.createdAt).getTime() : Date.now(),
          expireTime
        };
      });
      return coupons;
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
  async getFavorites(): Promise<Record<string, Favorite>> {
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
    // 使用 /api/douban/categories API，它能正确返回年份信息
    // 参数映射逻辑
    let category: string;
    let categoryType: string;

    if (type === "movie") {
      // 电影分类
      category = "热门";
      categoryType = tag === "热门" ? "全部" : tag;
    } else {
      // 电视剧分类
      if (tag === "热门") {
        category = "tv";
        categoryType = "tv";
      } else if (tag === "综艺") {
        category = "show";
        categoryType = "show";
      } else if (tag === "日本动画" || tag === "动画") {
        category = "tv";
        categoryType = "tv_animation";
      } else {
        // 其他电视剧分类（国产剧、美剧、英剧、韩剧、日剧、港剧等）
        category = "tv";
        categoryType = tag;
      }
    }

    const url = `/api/douban/categories?kind=${type}&category=${encodeURIComponent(category)}&type=${encodeURIComponent(categoryType)}&limit=${pageSize}&start=${pageStart}`;
    const response = await this._fetch(url);
    return response.json();
  }

  async triggerCron(password: string): Promise<{ success: boolean }> {
    const url = `/api/cron?password=${encodeURIComponent(password)}`;
    const response = await this._fetch(url);
    return response.json();
  }

  async updateVideoSource(enabledApis: string[]): Promise<{ ok: boolean }> {
    try {
      console.log('Updating video source with enabledApis:', enabledApis);

      const url = `/api/admin/user`;
      const response = await this._fetch(url, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          action: "updateUserApis",
          enabledApis,
        }),
      });

      console.log('Update video source response status:', response.status);

      if (!response.ok) {
        const errorText = await response.clone().text();
        console.error('Update video source error response:', errorText);
        throw new Error(`Failed to update video source: ${response.status}`);
      }

      const result = await response.json();
      console.log('Update video source result:', result);
      return result;
    } catch (error) {
      console.error('Failed to update video source:', error);
      throw error;
    }
  }
}

// 导出单例
export const api = new Api();
