import { create } from "zustand";
import { api } from "@/services/api";
import AsyncStorage from "@react-native-async-storage/async-storage";
import Logger from "@/utils/Logger";
import Constants from 'expo-constants';

const logger = Logger.withTag("AuthStore");

interface AuthState {
  isLoggedIn: boolean;
  isLoading: boolean;
  error: string | null;
  isLoginModalVisible: boolean;
  loginMode: string;
  autoLogin: () => Promise<boolean>;
  login: (username: string, password: string) => Promise<boolean>;
  logout: () => Promise<void>;
  clearError: () => void;
  hideLoginModal: () => void;
  checkLoginStatus: (apiBaseUrl: string) => Promise<void>;
  setLoginMode: (mode: string) => void;
}

export const useAuthStore = create<AuthState>((set, get) => ({
  isLoggedIn: false,
  isLoading: false,
  error: null,
  isLoginModalVisible: false,
  loginMode: 'default',
  autoLogin: async () => {
    set({ isLoading: true, error: null });
    try {
      // 获取保存的登录凭证
      let credentials = null;
      try {
        const credentialsStr = await AsyncStorage.getItem("mytv_login_credentials");
        if (credentialsStr) {
          credentials = JSON.parse(credentialsStr);
        }
      } catch (storageError) {
        logger.error("Failed to get login credentials:", storageError);
      }
      
      if (credentials) {
        // 尝试使用保存的凭证登录
        const response = await api.login(credentials.username, credentials.password);
        if (response.ok) {
          set({ isLoggedIn: true, isLoading: false });
          return true;
        } else {
          // 登录失败，尝试使用相同的凭证重新注册（可能是服务器端问题）
          logger.info("Login failed, attempting to re-register with same credentials");
          try {
            const reRegisterResponse = await api.register(credentials.username, credentials.password);
            if (reRegisterResponse.ok) {
              // 重新注册成功，保存凭证
              try {
                await AsyncStorage.setItem("mytv_login_credentials", JSON.stringify(credentials));
              } catch (storageError) {
                logger.error("Failed to save login credentials:", storageError);
              }
              set({ isLoggedIn: true, isLoading: false });
              return true;
            } else {
              // 重新注册失败，清除保存的凭证
              try {
                await AsyncStorage.removeItem("mytv_login_credentials");
              } catch (storageError) {
                logger.error("Failed to clear login credentials:", storageError);
              }
              await AsyncStorage.setItem("authCookies", "");
            }
          } catch (reRegisterError) {
            // 重新注册失败，清除保存的凭证
            try {
              await AsyncStorage.removeItem("mytv_login_credentials");
            } catch (storageError) {
              logger.error("Failed to clear login credentials:", storageError);
            }
            await AsyncStorage.setItem("authCookies", "");
          }
        }
      }
      
      // 没有保存的凭证或登录失败，尝试自动注册
      logger.info("No saved credentials, attempting auto-register");
      
      // 获取设备唯一标识符（使用 AsyncStorage 存储，确保设备ID稳定）
      let deviceId: string;
      try {
        // 尝试从 AsyncStorage 中获取已存储的设备ID
        let storedDeviceId = await AsyncStorage.getItem('device_id');
        
        // 如果 AsyncStorage 中没有，尝试从备用存储中获取
        if (!storedDeviceId) {
          try {
            // 尝试从 localStorage 中获取（Web平台）
            if (typeof window !== 'undefined' && window.localStorage) {
              storedDeviceId = window.localStorage.getItem('device_id');
            }
          } catch (localStorageError) {
            logger.warn("Failed to get device ID from localStorage:", localStorageError);
          }
        }
        
        if (storedDeviceId) {
          deviceId = storedDeviceId;
        } else {
          // 如果没有存储的设备ID，生成一个新的
          let newDeviceId = '';
          
          // 尝试多种方式获取设备标识符，确保稳定性
          try {
            // 1. 尝试使用 Constants 中的各种设备标识符
            if (Constants.deviceId) {
              newDeviceId = Constants.deviceId;
            } else if (Constants.installationId) {
              newDeviceId = Constants.installationId;
            } else if (Constants.sessionId) {
              newDeviceId = Constants.sessionId;
            } else if (Constants.appOwnership) {
              // 作为备选，使用应用所有权信息
              newDeviceId = Constants.appOwnership + Math.floor(Math.random() * 10000).toString();
            } else if (Constants.expoConfig?.extra?.deviceId) {
              // 从配置中获取设备ID
              newDeviceId = Constants.expoConfig.extra.deviceId;
            } else if (typeof window !== 'undefined' && window.navigator) {
              // 对于Web平台，使用 navigator 信息
              const navigatorInfo = window.navigator.userAgent + window.navigator.platform + window.navigator.language;
              newDeviceId = navigatorInfo;
            }
          } catch (innerError) {
            logger.warn("Failed to get device ID:", innerError);
          }
          
          // 如果所有尝试都失败，使用随机数生成器创建一个唯一ID
          if (!newDeviceId) {
            newDeviceId = Math.random().toString(36).substring(2, 15) + Math.random().toString(36).substring(2, 15);
          }
          
          // 对设备ID进行处理，确保符合用户名要求
          newDeviceId = newDeviceId.replace(/[^a-zA-Z0-9]/g, '');
          
          // 确保设备ID长度为6位
          if (newDeviceId.length > 6) {
            // 提取后6位
            newDeviceId = newDeviceId.slice(-6);
          } else if (newDeviceId.length < 6) {
            // 不足6位，用随机数补足
            const padding = Math.floor(Math.random() * Math.pow(10, 6 - newDeviceId.length)).toString();
            newDeviceId = (newDeviceId + padding).padEnd(6, '0');
          }
          
          // 确保设备ID只包含字母和数字，且长度为6位
          newDeviceId = newDeviceId.replace(/[^a-zA-Z0-9]/g, '').substring(0, 6).padEnd(6, '0');
          
          // 存储生成的设备ID，确保后续启动时使用相同的ID
          try {
            // 主存储：AsyncStorage
            await AsyncStorage.setItem('device_id', newDeviceId);
          } catch (storageError) {
            logger.error("Failed to store device ID in AsyncStorage:", storageError);
            // 备用存储：localStorage（Web平台）
            try {
              if (typeof window !== 'undefined' && window.localStorage) {
                window.localStorage.setItem('device_id', newDeviceId);
              }
            } catch (localStorageError) {
              logger.error("Failed to store device ID in localStorage:", localStorageError);
            }
          }
          
          deviceId = newDeviceId;
        }
      } catch (error) {
        logger.error("Failed to get device ID:", error);
        // 如果获取设备ID失败，使用随机数作为备用方案
        deviceId = Math.floor(Math.random() * 1000000).toString().padStart(6, '0');
      }
      
      // 最后再次验证设备ID格式，确保符合要求
      deviceId = deviceId.replace(/[^a-zA-Z0-9]/g, '').substring(0, 6).padEnd(6, '0');
      
      // 记录设备ID生成结果
      logger.info("Generated device ID:", deviceId);
      
      // 生成基于设备ID后6位的固定用户名和密码
      const username = deviceId;
      // 基于设备ID后6位生成固定的密码，确保每次都是相同的
      const password = `auto_${deviceId}`;
      
      logger.info(`Attempting auto-register with username: ${username}`);
      
      // 先尝试登录，看看是否已经存在该账号
      try {
        const loginResponse = await api.login(username, password);
        if (loginResponse.ok) {
          // 登录成功，保存凭证
          try {
            await AsyncStorage.setItem("mytv_login_credentials", JSON.stringify({ username, password }));
          } catch (storageError) {
            logger.error("Failed to save login credentials:", storageError);
          }
          set({ isLoggedIn: true, isLoading: false });
          return true;
        } else {
          // 登录失败，尝试注册
          try {
            const autoRegisterResponse = await api.register(username, password);
            if (autoRegisterResponse.ok) {
              // 自动注册成功，保存凭证
              try {
                await AsyncStorage.setItem("mytv_login_credentials", JSON.stringify({ username, password }));
              } catch (storageError) {
                logger.error("Failed to save login credentials:", storageError);
              }
              set({ isLoggedIn: true, isLoading: false });
              return true;
            } else {
              // 自动注册失败，清除可能的凭证
              try {
                await AsyncStorage.removeItem("mytv_login_credentials");
              } catch (storageError) {
                logger.error("Failed to clear login credentials:", storageError);
              }
              await AsyncStorage.setItem("authCookies", "");
              set({ isLoggedIn: false, isLoading: false });
              return false;
            }
          } catch (registerError) {
            // 注册失败，尝试直接登录（可能是 localStorage 模式）
            logger.info("Auto-register failed, attempting direct login");
            try {
              const loginResponse = await api.login(undefined, password);
              if (loginResponse.ok) {
                // 登录成功，保存凭证
                try {
                  await AsyncStorage.setItem("mytv_login_credentials", JSON.stringify({ username, password }));
                } catch (storageError) {
                  logger.error("Failed to save login credentials:", storageError);
                }
                set({ isLoggedIn: true, isLoading: false });
                return true;
              } else {
                // 登录失败，清除可能的凭证
                try {
                  await AsyncStorage.removeItem("mytv_login_credentials");
                } catch (storageError) {
                  logger.error("Failed to clear login credentials:", storageError);
                }
                await AsyncStorage.setItem("authCookies", "");
                set({ isLoggedIn: false, isLoading: false });
                return false;
              }
            } catch (loginError) {
              // 登录也失败，清除可能的凭证
              try {
                await AsyncStorage.removeItem("mytv_login_credentials");
              } catch (storageError) {
                logger.error("Failed to clear login credentials:", storageError);
              }
              await AsyncStorage.setItem("authCookies", "");
              set({ isLoggedIn: false, isLoading: false });
              return false;
            }
          }
        }
      } catch (loginError) {
        // 登录失败，尝试注册
        try {
          const autoRegisterResponse = await api.register(username, password);
          if (autoRegisterResponse.ok) {
            // 自动注册成功，保存凭证
            try {
              await AsyncStorage.setItem("mytv_login_credentials", JSON.stringify({ username, password }));
            } catch (storageError) {
              logger.error("Failed to save login credentials:", storageError);
            }
            set({ isLoggedIn: true, isLoading: false });
            return true;
          } else {
            // 自动注册失败，清除可能的凭证
            try {
              await AsyncStorage.removeItem("mytv_login_credentials");
            } catch (storageError) {
              logger.error("Failed to clear login credentials:", storageError);
            }
            await AsyncStorage.setItem("authCookies", "");
            set({ isLoggedIn: false, isLoading: false });
            return false;
          }
        } catch (registerError) {
          // 注册失败，尝试直接登录（可能是 localStorage 模式）
          logger.info("Auto-register failed, attempting direct login");
          try {
            const loginResponse = await api.login(undefined, password);
            if (loginResponse.ok) {
              // 登录成功，保存凭证
              try {
                await AsyncStorage.setItem("mytv_login_credentials", JSON.stringify({ username, password }));
              } catch (storageError) {
                logger.error("Failed to save login credentials:", storageError);
              }
              set({ isLoggedIn: true, isLoading: false });
              return true;
            } else {
              // 登录失败，清除可能的凭证
              try {
                await AsyncStorage.removeItem("mytv_login_credentials");
              } catch (storageError) {
                logger.error("Failed to clear login credentials:", storageError);
              }
              await AsyncStorage.setItem("authCookies", "");
              set({ isLoggedIn: false, isLoading: false });
              return false;
            }
          } catch (loginError) {
            // 登录也失败，清除可能的凭证
            try {
              await AsyncStorage.removeItem("mytv_login_credentials");
            } catch (storageError) {
              logger.error("Failed to clear login credentials:", storageError);
            }
            await AsyncStorage.setItem("authCookies", "");
            set({ isLoggedIn: false, isLoading: false });
            return false;
          }
        }
      }
    } catch (error) {
      logger.error("Auto login/register failed:", error);
      // 登录失败，清除保存的凭证
      try {
        await AsyncStorage.removeItem("mytv_login_credentials");
      } catch (storageError) {
        logger.error("Failed to clear login credentials:", storageError);
      }
      await AsyncStorage.setItem("authCookies", "");
      set({ isLoggedIn: false, isLoading: false, error: "自动登录/注册失败" });
      return false;
    }
  },
  login: async (username: string, password: string) => {
    set({ isLoading: true, error: null });
    try {
      const response = await api.login(username, password);
      if (response.ok) {
        // 保存登录凭证
        try {
          await AsyncStorage.setItem("mytv_login_credentials", JSON.stringify({ username, password }));
        } catch (storageError) {
          logger.error("Failed to save login credentials:", storageError);
        }
        set({ isLoggedIn: true, isLoading: false });
        return true;
      } else {
        set({ isLoggedIn: false, isLoading: false, error: "登录失败" });
        return false;
      }
    } catch (error) {
      logger.error("Login failed:", error);
      set({ isLoggedIn: false, isLoading: false, error: "登录失败，请检查网络连接" });
      return false;
    }
  },
  logout: async () => {
    set({ isLoading: true });
    try {
      await api.logout();
    } catch (error) {
      logger.error("Logout failed:", error);
    } finally {
      // 清除本地存储的凭证和cookie
      try {
        await AsyncStorage.removeItem("mytv_login_credentials");
      } catch (storageError) {
        logger.error("Failed to clear login credentials:", storageError);
      }
      await AsyncStorage.setItem("authCookies", "");
      set({ isLoggedIn: false, isLoading: false });
    }
  },
  clearError: () => {
    set({ error: null });
  },
  hideLoginModal: () => {
    set({ isLoginModalVisible: false });
  },
  checkLoginStatus: async (apiBaseUrl: string) => {
    set({ isLoading: true, error: null });
    try {
      // 尝试获取保存的登录凭证
      let credentials = null;
      try {
        const credentialsStr = await AsyncStorage.getItem("mytv_login_credentials");
        if (credentialsStr) {
          credentials = JSON.parse(credentialsStr);
        }
      } catch (storageError) {
        logger.error("Failed to get login credentials:", storageError);
      }
      
      if (credentials) {
        // 有保存的凭证，使用凭证登录
        const response = await api.login(credentials.username, credentials.password);
        if (response.ok) {
          set({ isLoggedIn: true, isLoading: false });
        } else {
          // 登录失败，清除保存的凭证
          try {
            await AsyncStorage.removeItem("mytv_login_credentials");
          } catch (storageError) {
            logger.error("Failed to clear login credentials:", storageError);
          }
          await AsyncStorage.setItem("authCookies", "");
          set({ isLoggedIn: false, isLoading: false });
        }
      } else {
        // 没有保存的凭证，直接设置为未登录状态
        set({ isLoggedIn: false, isLoading: false });
      }
    } catch (error) {
      logger.error("Check login status failed:", error);
      // 登录失败，清除保存的凭证
      try {
        await AsyncStorage.removeItem("mytv_login_credentials");
      } catch (storageError) {
        logger.error("Failed to clear login credentials:", storageError);
      }
      await AsyncStorage.setItem("authCookies", "");
      set({ isLoggedIn: false, isLoading: false, error: "检查登录状态失败" });
    }
  },
  setLoginMode: (mode: string) => {
    set({ loginMode: mode });
  },
}));
