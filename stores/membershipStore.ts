import AsyncStorage from "@react-native-async-storage/async-storage";
import { create } from "zustand";

import { api, type MembershipResponse, type Coupon, type RedeemResult } from "@/services/api";
import Logger from "@/utils/Logger";

import { useSettingsStore } from "./settingsStore";

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
      logger.debug("Failed to fetch membership info:", error);
      // 提供更友好的错误信息
      let errorMessage = "获取会员信息失败";
      if (error instanceof Error) {
        if (error.message.includes("401") || error.message.includes("UNAUTHORIZED")) {
          errorMessage = "未登录或登录已过期";
        } else if (error.message.includes("404")) {
          errorMessage = "会员系统暂未启用";
        }
      }
      set({
        membershipError: errorMessage,
        isLoadingMembership: false
      });
    }
  },

  fetchUserCoupons: async () => {
    set({ isLoadingCoupons: true, couponsError: null });
    try {
      const userCoupons = await api.getUserCoupons();
      // 过滤卡券列表，只显示已激活的卡券
      const filteredCoupons = userCoupons.filter(coupon => coupon.status === 'active');
      // 按过期时间排序，最近过期的排在前面
      const sortedCoupons = filteredCoupons.sort((a, b) => a.expireTime - b.expireTime);
      // 只保留前3张卡券
      const limitedCoupons = sortedCoupons.slice(0, 3);

      set({ userCoupons: limitedCoupons, isLoadingCoupons: false });
    } catch (error) {
      logger.debug("Failed to fetch user coupons:", error);
      // 提供更友好的错误信息
      let errorMessage = "获取卡券列表失败";
      if (error instanceof Error) {
        if (error.message.includes("401") || error.message.includes("UNAUTHORIZED")) {
          errorMessage = "未登录或登录已过期";
        } else if (error.message.includes("404")) {
          errorMessage = "卡券系统暂未启用";
        }
      }
      set({
        couponsError: errorMessage,
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
