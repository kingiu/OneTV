import { create } from "zustand";
import AsyncStorage from "@react-native-async-storage/async-storage";

// 兼容性检查
const safeAsyncStorage = {
  getItem: async (key: string) => {
    try {
      return await AsyncStorage.getItem(key);
    } catch (error) {
      console.warn('AsyncStorage getItem error:', error);
      return null;
    }
  },
  setItem: async (key: string, value: string) => {
    try {
      await AsyncStorage.setItem(key, value);
    } catch (error) {
      console.warn('AsyncStorage setItem error:', error);
    }
  },
  removeItem: async (key: string) => {
    try {
      await AsyncStorage.removeItem(key);
    } catch (error) {
      console.warn('AsyncStorage removeItem error:', error);
    }
  }
};
import { api } from "../services/api";
import { useSettingsStore } from "./settingsStore";
import Toast from "react-native-toast-message";
import Logger from "../utils/Logger";
import { membershipStore } from "./membershipStore";

const logger = Logger.withTag('AuthStore');

interface AuthState {
  isLoggedIn: boolean;
  isLoginModalVisible: boolean;
  showLoginModal: () => void;
  hideLoginModal: () => void;
  checkLoginStatus: (apiBaseUrl?: string) => Promise<void>;
  logout: () => Promise<void>;
  handleUnauthorized: () => Promise<void>;
}

// 创建认证状态store
export const useAuthStore = create<AuthState>((set) => ({
  isLoggedIn: false,
  isLoginModalVisible: false,
  showLoginModal: () => set({ isLoginModalVisible: true }),
  hideLoginModal: () => set({ isLoginModalVisible: false }),
  checkLoginStatus: async (apiBaseUrl?: string) => {
    console.debug('AuthStore: checkLoginStatus被调用', { apiBaseUrl });
    if (!apiBaseUrl) {
      console.debug('AuthStore: apiBaseUrl为空，返回未登录状态');
      set({ isLoggedIn: false, isLoginModalVisible: false });
      membershipStore.getState().clearMembershipInfo();
      return;
    }
    console.debug('AuthStore: 开始检查登录状态流程');
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

      const authToken = await safeAsyncStorage.getItem('authCookies');
      console.debug('AuthStore: 检查登录状态', { hasAuthToken: !!authToken });
      
      if (!authToken) {
        console.debug('AuthStore: 没有认证令牌');
        if (serverConfig && serverConfig.StorageType === "localstorage") {
          const loginResult = await api.login().catch(() => {
            set({ isLoggedIn: false, isLoginModalVisible: true });
            membershipStore.getState().clearMembershipInfo();
          });
          if (loginResult && loginResult.ok) {
            set({ isLoggedIn: true });
            await membershipStore.getState().fetchMembershipInfo().catch(err => {
              console.debug('AuthStore: 获取会员信息失败但登录状态保持为true', err);
            });
          }
        } else {
          set({ isLoggedIn: false, isLoginModalVisible: true });
          membershipStore.getState().clearMembershipInfo();
        }
      } else {
        console.debug('AuthStore: 有认证令牌，设置登录状态为true');
        set({ isLoggedIn: true, isLoginModalVisible: false });
        // 即使获取会员信息失败，也保持登录状态为true
        await membershipStore.getState().fetchMembershipInfo().catch(err => {
          console.debug('AuthStore: 获取会员信息失败但登录状态保持为true', err);
        });
      }
    } catch (error) {
      logger.error("Failed to check login status:", error);
      // 只有在认证失败时才清除登录状态
      if (error instanceof Error && error.message === "UNAUTHORIZED") {
        set({ isLoggedIn: false, isLoginModalVisible: true });
        membershipStore.getState().clearMembershipInfo();
      } else {
        // 其他错误不影响登录状态，只清除会员信息
        membershipStore.getState().clearMembershipInfo();
        // 保持登录状态为true（如果有认证令牌）
        const authToken = await safeAsyncStorage.getItem('authCookies');
        if (authToken) {
          set({ isLoggedIn: true, isLoginModalVisible: false });
        } else {
          set({ isLoggedIn: false });
        }
      }
    }
  },
  logout: async () => {
    try {
      await api.logout();
      set({ isLoggedIn: false, isLoginModalVisible: true });
      membershipStore.getState().clearMembershipInfo();
    } catch (error) {
      logger.error("Failed to logout:", error);
    }
  },
  handleUnauthorized: async () => {
    logger.error("[AUTH] 检测到401未授权错误，清除登录状态并显示登录弹窗");
    // 清除认证信息
    await safeAsyncStorage.removeItem('authCookies');
    await safeAsyncStorage.removeItem('cached_membership');
    await safeAsyncStorage.removeItem('loginUsername');
    // 更新状态为未登录并显示登录弹窗
    set({ isLoggedIn: false, isLoginModalVisible: true });
    membershipStore.getState().clearMembershipInfo();
    // 显示提示信息
    Toast.show({
      type: "error",
      text1: "登录已过期",
      text2: "请重新登录以继续使用"
    });
  },
}));

export default useAuthStore;
// 为了兼容现有代码，保留旧的导出
const authStore = useAuthStore;
export { authStore };
