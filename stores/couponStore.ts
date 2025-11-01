import { create } from "zustand";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { Coupon, CouponStatus, CouponStatusInfo, RedeemResult } from "@/types/coupon";
import { api } from "@/services/api";
import Logger from "@/utils/Logger";

const logger = Logger.withTag('CouponStore');

interface CouponState {
  // 用户卡券列表
  userCoupons: Coupon[];
  // 最近兑换的卡券
  lastRedeemedCoupon: Coupon | null;
  // 加载状态
  isLoading: boolean;
  isRedeeming: boolean;
  hasError: boolean;
  errorMessage: string | null;
  
  // 动作
  loadUserCoupons: () => Promise<void>;
  refreshUserCoupons: () => Promise<void>;
  redeemCoupon: (code: string) => Promise<RedeemResult>;
  checkCouponStatus: (code: string) => Promise<CouponStatusInfo>;
  clearCouponData: () => Promise<void>;
  getActiveCoupons: () => Coupon[];
  getExpiredCoupons: () => Coupon[];
}

export const useCouponStore = create<CouponState>((set, get) => ({
  userCoupons: [],
  lastRedeemedCoupon: null,
  isLoading: false,
  isRedeeming: false,
  hasError: false,
  errorMessage: null,

  loadUserCoupons: async () => {
    set({ isLoading: true, hasError: false, errorMessage: null });
    try {
      // 先尝试从缓存加载
      const cachedCoupons = await AsyncStorage.getItem('userCoupons');
      if (cachedCoupons) {
        set({ userCoupons: JSON.parse(cachedCoupons) });
      }
      
      // 然后从API获取最新卡券列表
      await get().refreshUserCoupons();
    } catch (error) {
      logger.error("Failed to load user coupons:", error);
      set({ hasError: true, errorMessage: '加载卡券列表失败' });
    } finally {
      set({ isLoading: false });
    }
  },

  refreshUserCoupons: async () => {
    try {
      const coupons = await api.getUserCoupons();
      if (coupons && Array.isArray(coupons)) {
        set({ userCoupons: coupons });
        await AsyncStorage.setItem('userCoupons', JSON.stringify(coupons));
      }
    } catch (error) {
      logger.error("Failed to refresh user coupons:", error);
      // 刷新失败不影响已有数据，仅记录错误
    }
  },

  redeemCoupon: async (code: string): Promise<RedeemResult> => {
    set({ isRedeeming: true, hasError: false, errorMessage: null });
    try {
      const result = await api.redeemCoupon(code);
      
      if (result.success && result.coupon) {
        // 更新本地卡券列表
        const currentCoupons = get().userCoupons;
        const updatedCoupons = [result.coupon, ...currentCoupons];
        set({ userCoupons: updatedCoupons, lastRedeemedCoupon: result.coupon });
        
        // 更新缓存
        await AsyncStorage.setItem('userCoupons', JSON.stringify(updatedCoupons));
      }
      
      return result;
    } catch (error) {
      logger.error("Failed to redeem coupon:", error);
      const errorResult: RedeemResult = {
        success: false,
        message: error instanceof Error ? error.message : '兑换失败，请稍后重试'
      };
      set({ hasError: true, errorMessage: errorResult.message });
      return errorResult;
    } finally {
      set({ isRedeeming: false });
    }
  },

  checkCouponStatus: async (code: string): Promise<CouponStatusInfo> => {
    try {
      return await api.checkCouponStatus(code);
    } catch (error) {
      logger.error("Failed to check coupon status:", error);
      return {
        code: code || '',
        isValid: false,
        status: CouponStatus.INVALID,
        message: '查询卡券状态失败，请稍后重试'
      };
    }
  },

  clearCouponData: async () => {
    try {
      set({ userCoupons: [], lastRedeemedCoupon: null });
      await AsyncStorage.removeItem('userCoupons');
      
      // 清除卡券状态缓存
      const keys = await AsyncStorage.getAllKeys();
      const couponStatusKeys = keys.filter(key => key.startsWith('coupon_status_'));
      if (couponStatusKeys.length > 0) {
        await AsyncStorage.multiRemove(couponStatusKeys);
      }
    } catch (error) {
      logger.error("Failed to clear coupon data:", error);
    }
  },

  getActiveCoupons: () => {
    const { userCoupons } = get();
    const now = Date.now();
    return userCoupons.filter(coupon => 
      coupon.status === 'ACTIVE' && 
      (!coupon.expireDate || coupon.expireDate > now)
    );
  },

  getExpiredCoupons: () => {
    const { userCoupons } = get();
    const now = Date.now();
    return userCoupons.filter(coupon => 
      coupon.status === 'EXPIRED' || 
      (coupon.expireDate && coupon.expireDate <= now)
    );
  },
}));

export default useCouponStore;