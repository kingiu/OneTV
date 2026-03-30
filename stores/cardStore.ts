import { create } from 'zustand';
import { api } from '@/services/api';
import Logger from '@/utils/Logger';
import { handleAPIError, CouponError } from '@/utils/errorHandler';

const logger = Logger.withTag('CardStore');

export interface Coupon {
  id: string;
  code: string;
  type: 'membership' | 'discount' | 'trial';
  tier: string;
  tierName: string;
  durationDays: number;
  status: 'active' | 'used' | 'expired';
  createdAt: number;
  createdAtStr: string;
  redeemedAt?: number;
  redeemedAtStr: string;
  redeemedBy?: string;
  expireTime: number;
  expireTimeStr: string;
  isExpired: boolean;
}

export interface CouponBatch {
  id: string;
  name: string;
  tier: string;
  tierName: string;
  count: number;
  durationDays: number;
  createdAt: number;
  createdBy: string;
  status: 'pending' | 'completed';
}

interface CardState {
  coupons: Coupon[];
  isLoading: boolean;
  error: string | null;
  fetchUserCoupons: () => Promise<void>;
  redeemCoupon: (code: string) => Promise<{ success: boolean; message: string }>;
  clearError: () => void;
}

export const useCardStore = create<CardState>((set, get) => ({
  coupons: [],
  isLoading: false,
  error: null,

  fetchUserCoupons: async () => {
    set({ isLoading: true, error: null });
    try {
      const response = await api.getUserCoupons();
      set({ coupons: response, isLoading: false });
      logger.info('成功获取用户卡券列表', { count: response.length });
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : '获取卡券失败';
      set({ error: errorMessage, isLoading: false });
      logger.error('获取用户卡券失败', error);
      throw error;
    }
  },

  redeemCoupon: async (code: string) => {
    set({ isLoading: true, error: null });
    try {
      const result = await api.redeemCoupon(code);
      if (result.success) {
        await get().fetchUserCoupons();
      }
      set({ isLoading: false });
      return result;
    } catch (error) {
      const handledError = handleAPIError(error);
      const errorMessage = handledError.message || '兑换卡券失败';
      set({ error: errorMessage, isLoading: false });
      logger.error('兑换卡券失败', { code, error });
      return { success: false, message: errorMessage };
    }
  },

  clearError: () => set({ error: null }),
}));
