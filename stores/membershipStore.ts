import { create } from 'zustand';
import { api } from '@/services/api';
import Logger from '@/utils/Logger';
import { handleAPIError, MembershipError } from '@/utils/errorHandler';

const logger = Logger.withTag('MembershipStore');

export interface MembershipTier {
  id: string;
  name: string;
  displayName: string;
  userGroup: string;
  benefits: string[];
  price?: number;
  durationDays?: number;
}

export interface UserMembership {
  tierId: string;
  tierName: string;
  status: 'active' | 'expired' | 'pending';
  startDate: number;
  endDate: number;
  autoRenew: boolean;
  source: string;
  isActive: boolean;
  tags: string[];
}

export interface MembershipConfig {
  enabled: boolean;
  tiers?: MembershipTier[];
  levels?: Array<{
    level: number;
    name: string;
    price: number;
    duration: number;
  }>;
  benefits?: Record<string, string[]>;
}

interface MembershipState {
  membership: UserMembership | null;
  config: MembershipConfig | null;
  isLoading: boolean;
  error: string | null;
  fetchUserMembership: () => Promise<void>;
  fetchMembershipConfig: () => Promise<void>;
  clearError: () => void;
  isMembershipActive: () => boolean;
  getDaysRemaining: () => number;
  getTierDisplayName: () => string;
}

export const useMembershipStore = create<MembershipState>((set, get) => ({
  membership: null,
  config: null,
  isLoading: false,
  error: null,

  fetchUserMembership: async () => {
    set({ isLoading: true, error: null });
    try {
      const response = await api.getUserMembership();
      set({ 
        membership: response.membership, 
        config: response.config,
        isLoading: false 
      });
      logger.info('成功获取用户会员信息', { 
        tier: response.membership?.tierId,
        status: response.membership?.status 
      });
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : '获取会员信息失败';
      set({ error: errorMessage, isLoading: false });
      logger.error('获取用户会员信息失败', error);
      throw error;
    }
  },

  fetchMembershipConfig: async () => {
    set({ isLoading: true, error: null });
    try {
      const config = await api.getMembershipConfig();
      set({ config, isLoading: false });
      logger.info('成功获取会员配置', { enabled: config.enabled });
    } catch (error) {
      const handledError = handleAPIError(error);
      const errorMessage = handledError.message || '获取会员配置失败';
      set({ error: errorMessage, isLoading: false });
      logger.error('获取会员配置失败', error);
      throw handledError;
    }
  },

  clearError: () => set({ error: null }),

  isMembershipActive: () => {
    const { membership } = get();
    if (!membership) return false;
    return membership.isActive && membership.status === 'active';
  },

  getDaysRemaining: () => {
    const { membership } = get();
    if (!membership || !membership.isActive) return 0;
    const now = Date.now();
    const remaining = membership.endDate - now;
    return Math.max(0, Math.floor(remaining / (1000 * 60 * 60 * 24)));
  },

  getTierDisplayName: () => {
    const { membership, config } = get();
    if (!membership) return '普通会员';
    
    const tiers = config?.tiers || config?.levels || [];
    const tier = tiers.find(t => t.id === membership.tierId || t.name === membership.tierId || t.level === membership.tierId);
    return tier?.displayName || tier?.name || membership.tierName || '普通会员';
  },
}));
