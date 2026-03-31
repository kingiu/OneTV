import { create } from "zustand";
import { api, MembershipResponse, Coupon, RedeemResult } from "@/services/api";
import Logger from "@/utils/Logger";

const logger = Logger.withTag("MembershipStore");

interface MembershipState {
  // 会员相关状态
  membershipInfo: MembershipResponse | null;
  isLoadingMembership: boolean;
  membershipError: string | null;
  
  // 卡券相关状态
  userCoupons: Coupon[];
  isLoadingCoupons: boolean;
  couponsError: string | null;
  
  // 操作方法
  fetchMembershipInfo: () => Promise<void>;
  fetchUserCoupons: () => Promise<void>;
  redeemCoupon: (code: string) => Promise<RedeemResult>;
  clearErrors: () => void;
}

const useMembershipStore = create<MembershipState>((set, get) => ({
  // 会员相关状态
  membershipInfo: null,
  isLoadingMembership: false,
  membershipError: null,
  
  // 卡券相关状态
  userCoupons: [],
  isLoadingCoupons: false,
  couponsError: null,
  
  // 操作方法
  fetchMembershipInfo: async () => {
    set({ isLoadingMembership: true, membershipError: null });
    try {
      const membershipInfo = await api.getMembershipInfo();
      set({ membershipInfo, isLoadingMembership: false });
    } catch (error) {
      logger.error("Failed to fetch membership info:", error);
      set({ 
        membershipError: error instanceof Error ? error.message : "获取会员信息失败", 
        isLoadingMembership: false 
      });
    }
  },
  
  fetchUserCoupons: async () => {
    set({ isLoadingCoupons: true, couponsError: null });
    try {
      const userCoupons = await api.getUserCoupons();
      set({ userCoupons, isLoadingCoupons: false });
    } catch (error) {
      logger.error("Failed to fetch user coupons:", error);
      set({ 
        couponsError: error instanceof Error ? error.message : "获取卡券列表失败", 
        isLoadingCoupons: false 
      });
    }
  },
  
  redeemCoupon: async (code: string) => {
    try {
      const result = await api.redeemCard(code);
      if (result.success) {
        // 兑换成功后更新会员信息和卡券列表
        await get().fetchMembershipInfo();
        await get().fetchUserCoupons();
      }
      return result;
    } catch (error) {
      logger.error("Failed to redeem coupon:", error);
      throw error;
    }
  },
  
  clearErrors: () => {
    set({ membershipError: null, couponsError: null });
  },
}));

export default useMembershipStore;