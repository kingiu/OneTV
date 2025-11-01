import { create } from "zustand";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { api } from "@/services/api";
import { useSettingsStore } from "./settingsStore";
import { useMembershipStore } from "./membershipStore";
import { useCouponStore } from "./couponStore";
import { UserMappingService } from "@/services/userMappingService";
import Toast from "react-native-toast-message";
import Logger from "@/utils/Logger";

const logger = Logger.withTag('AuthStore');

interface AuthState {
  isLoggedIn: boolean;
  isLoginModalVisible: boolean;
  showLoginModal: () => void;
  hideLoginModal: () => void;
  checkLoginStatus: (apiBaseUrl?: string) => Promise<void>;
  login: (username: string, password: string) => Promise<boolean>;
  logout: () => Promise<void>;
  checkAuthStatus: () => Promise<boolean>;
}

const useAuthStore = create<AuthState>((set, get) => ({
  isLoggedIn: false,
  isLoginModalVisible: false,
  showLoginModal: () => set({ isLoginModalVisible: true }),
  hideLoginModal: () => set({ isLoginModalVisible: false }),
  checkLoginStatus: async (apiBaseUrl?: string) => {
    if (!apiBaseUrl) {
      set({ isLoggedIn: false, isLoginModalVisible: false });
      return;
    }
    try {
      // Wait for server config to be loaded if it's currently loading
      const settingsState = useSettingsStore.getState();
      let serverConfig = settingsState.serverConfig;

      // If server config is loading, wait a bit for it to complete
      if (settingsState.isLoadingServerConfig) {
        // Wait up to 3 seconds for server config to load
        const maxWaitTime = 3000;
        const checkInterval = 100;
        let waitTime = 0;

        while (waitTime < maxWaitTime) {
          await new Promise(resolve => setTimeout(resolve, checkInterval));
          waitTime += checkInterval;
          const currentState = useSettingsStore.getState();
          if (!currentState.isLoadingServerConfig) {
            serverConfig = currentState.serverConfig;
            break;
          }
        }
      }

      if (!serverConfig?.StorageType) {
        // Only show error if we're not loading and have tried to fetch the config
        if (!settingsState.isLoadingServerConfig) {
          Toast.show({ type: "error", text1: "请检查网络或者服务器地址是否可用" });
        }
        return;
      }

      const authToken = await AsyncStorage.getItem('authCookies');
      if (!authToken) {
        if (serverConfig && serverConfig.StorageType === "localstorage") {
          const loginResult = await api.login().catch(() => {
            set({ isLoggedIn: false, isLoginModalVisible: true });
          });
          if (loginResult && loginResult.ok) {
            set({ isLoggedIn: true });
            // 登录成功后同步会员/卡券数据
            await syncUserData();
          }
        } else {
          set({ isLoggedIn: false, isLoginModalVisible: true });
        }
      } else {
        set({ isLoggedIn: true, isLoginModalVisible: false });
        // 验证cookie有效性并同步数据
        const isValid = await useAuthStore.getState().checkAuthStatus();
        if (isValid) {
          await syncUserData();
        } else {
          set({ isLoggedIn: false, isLoginModalVisible: true });
        }
      }
    } catch (error) {
      logger.error("Failed to check login status:", error);
      if (error instanceof Error && error.message === "UNAUTHORIZED") {
        set({ isLoggedIn: false, isLoginModalVisible: true });
      } else {
        set({ isLoggedIn: false });
      }
    }
  },
  login: async (username: string, password: string): Promise<boolean> => {
    try {
      const result = await api.login(username, password);
      if (result.ok) {
        set({ isLoggedIn: true, isLoginModalVisible: false });
        // 保存用户映射关系
        const userInfo = await api.getUserInfo();
        if (userInfo && userInfo.id) {
          await UserMappingService.saveUserMapping(userInfo.id, userInfo.id, 'luna');
        }
        // 同步会员/卡券数据
        await syncUserData();
        // 启动定时同步任务
        startPeriodicSync();
        return true;
      }
      return false;
    } catch (error) {
      logger.error("Login failed:", error);
      return false;
    }
  },
  logout: async () => {
    try {
      await api.logout();
      // 停止定时同步任务
      stopPeriodicSync();
      // 清除用户映射关系
      await UserMappingService.clearUserMappings();
      // 清除会员和卡券数据
      await Promise.all([
        useMembershipStore.getState().clearMembershipData(),
        useCouponStore.getState().clearCouponData()
      ]);
      set({ isLoggedIn: false, isLoginModalVisible: false });
    } catch (error) {
      logger.error("Failed to logout:", error);
    }
  },
  checkAuthStatus: async (): Promise<boolean> => {
    try {
      // 验证cookie是否有效
      const response = await api.validateCookie();
      return response.ok;
    } catch (error) {
      logger.error("Auth status check failed:", error);
      // 如果验证失败，清除cookie
      await AsyncStorage.removeItem('authCookies');
      return false;
    }
  },
}));

// 同步用户会员和卡券数据（完整加载，包括缓存读取和API请求）
async function syncUserData() {
  try {
    // 并行加载会员配置和用户数据
    await Promise.all([
      useMembershipStore.getState().loadMembershipConfig(),
      useMembershipStore.getState().loadUserMembership(),
      useCouponStore.getState().loadUserCoupons()
    ]);
  } catch (error) {
    logger.error("Failed to sync user data:", error);
  }
}

// 刷新用户数据（仅API请求，不读取缓存）
async function refreshUserData() {
  try {
    // 并行刷新会员和卡券数据
    await Promise.all([
      useMembershipStore.getState().refreshUserMembership(),
      useCouponStore.getState().refreshUserCoupons()
    ]);
  } catch (error) {
    logger.error("Failed to refresh user data:", error);
  }
}

// 定时同步任务相关
let syncIntervalId: NodeJS.Timeout | null = null;

function startPeriodicSync() {
  // 每10分钟同步一次数据
  stopPeriodicSync(); // 先停止现有任务
  // 初始同步
  syncUserData();
  // 设置定时刷新（使用refresh而不是完整加载，更轻量）
  syncIntervalId = setInterval(refreshUserData, 10 * 60 * 1000);
}

function stopPeriodicSync() {
  if (syncIntervalId) {
    clearInterval(syncIntervalId);
    syncIntervalId = null;
  }
}

export default useAuthStore;
