import { create } from "zustand";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { MembershipConfig, UserMembership } from "@/types/membership";
import { api } from "@/services/api";
import Logger from "@/utils/Logger";

const logger = Logger.withTag('MembershipStore');

interface MembershipState {
  // 会员配置
  membershipConfig: MembershipConfig | null;
  // 用户会员信息
  userMembership: UserMembership | null;
  // 加载状态
  isLoading: boolean;
  isLoadingConfig: boolean;
  hasError: boolean;
  errorMessage: string | null;
  
  // 动作
  loadMembershipConfig: () => Promise<void>;
  loadUserMembership: () => Promise<void>;
  refreshUserMembership: () => Promise<void>;
  clearMembershipData: () => Promise<void>;
  checkMembershipStatus: () => boolean;
  getMembershipExpiryDays: () => number;
}

export const useMembershipStore = create<MembershipState>((set, get) => ({
  membershipConfig: null,
  userMembership: null,
  isLoading: false,
  isLoadingConfig: false,
  hasError: false,
  errorMessage: null,

  loadMembershipConfig: async () => {
    set({ isLoadingConfig: true, hasError: false, errorMessage: null });
    try {
      // 先尝试从缓存加载
      const cachedConfig = await AsyncStorage.getItem('membershipConfig');
      if (cachedConfig) {
        set({ membershipConfig: JSON.parse(cachedConfig) });
      }
      
      // 然后从API获取最新配置
      const config = await api.getMembershipConfig();
      if (config) {
        set({ membershipConfig: config });
        await AsyncStorage.setItem('membershipConfig', JSON.stringify(config));
      }
    } catch (error) {
      logger.error("Failed to load membership config:", error);
      set({ hasError: true, errorMessage: '加载会员配置失败' });
    } finally {
      set({ isLoadingConfig: false });
    }
  },

  loadUserMembership: async () => {
    set({ isLoading: true, hasError: false, errorMessage: null });
    try {
      // 先尝试从缓存加载
      const cachedMembership = await AsyncStorage.getItem('userMembership');
      if (cachedMembership) {
        set({ userMembership: JSON.parse(cachedMembership) });
      }
      
      // 然后从API获取最新会员信息
      await get().refreshUserMembership();
    } catch (error) {
      logger.error("Failed to load user membership:", error);
      set({ hasError: true, errorMessage: '加载会员信息失败' });
    } finally {
      set({ isLoading: false });
    }
  },

  refreshUserMembership: async () => {
    try {
      const membership = await api.getUserMembership();
      if (membership) {
        set({ userMembership: membership });
        await AsyncStorage.setItem('userMembership', JSON.stringify(membership));
      }
    } catch (error) {
      logger.error("Failed to refresh user membership:", error);
      // 刷新失败不影响已有数据，仅记录错误
    }
  },

  clearMembershipData: async () => {
    try {
      set({ userMembership: null, membershipConfig: null });
      await AsyncStorage.removeItem('userMembership');
      await AsyncStorage.removeItem('membershipConfig');
    } catch (error) {
      logger.error("Failed to clear membership data:", error);
    }
  },

  checkMembershipStatus: () => {
    const { userMembership } = get();
    if (!userMembership || userMembership.status !== 'active') {
      return false;
    }
    
    // 检查会员是否过期
    const now = Date.now();
    return userMembership.endDate > now;
  },

  getMembershipExpiryDays: () => {
    const { userMembership } = get();
    if (!userMembership || userMembership.status !== 'active' || userMembership.endDate <= Date.now()) {
      return 0;
    }
    
    // 计算剩余天数
    const expiryTime = userMembership.endDate - Date.now();
    return Math.ceil(expiryTime / (1000 * 60 * 60 * 24));
  },
}));

export default useMembershipStore;