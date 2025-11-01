import { MembershipConfig, UserMembership } from '@/types/membership';
import { Coupon, CouponStatusInfo, RedeemResult, CouponType, CouponStatus } from '@/types/coupon';

class MembershipAdapter {
  // 转换LunaTV会员数据为OneTV格式
  static convertToOneTVMembership(lunaMembership: any): UserMembership {
    return {
      userId: lunaMembership.userId || '',
      tier: (lunaMembership.tierId as any) || 'default',
      startDate: lunaMembership.startDate,
      endDate: lunaMembership.endDate,
      status: lunaMembership.status,
      devices: []
    };
  }

  // 转换LunaTV会员配置为OneTV格式
  static convertToOneTVMembershipConfig(lunaConfig: any): MembershipConfig {
    return {
      tiers: lunaConfig.tiers.map((tier: any) => ({
        name: (tier.name as any) || 'default',
        price: tier.price || 0,
        features: tier.features || [],
        duration: tier.durationDays || 30,
        priority: tier.priority || 0,
        displayName: tier.displayName
      })),
      defaultTier: (lunaConfig.defaultTierId as any) || 'default',
      upgradeOptions: {}
    };
  }
}

class CouponAdapter {
  // 转换LunaTV卡券为OneTV格式
  static convertToOneTVCoupon(lunaCoupon: any): Coupon {
    const statusMap: Record<string, CouponStatus> = {
      'active': CouponStatus.ACTIVE,
      'used': CouponStatus.REDEEMED,
      'expired': CouponStatus.EXPIRED
    };

    return {
      code: lunaCoupon.code,
      type: (lunaCoupon.type === 'membership' ? CouponType.MEMBERSHIP : 
             lunaCoupon.type === 'feature' ? CouponType.DISCOUNT : CouponType.FREE_TRIAL),
      value: lunaCoupon.value,
      status: statusMap[lunaCoupon.status] || CouponStatus.INVALID,
      expireDate: lunaCoupon.expireDate,
      createDate: lunaCoupon.createDate,
      batchId: lunaCoupon.batchId || '',
      usageLimit: lunaCoupon.usageLimit,
      usedCount: lunaCoupon.usedCount
    };
  }
  
  // 转换LunaTV卡券状态信息
  static convertToOneTVCouponStatus(lunaStatus: any): CouponStatusInfo {
    const statusMap: Record<string, CouponStatus> = {
      'active': CouponStatus.ACTIVE,
      'used': CouponStatus.REDEEMED,
      'expired': CouponStatus.EXPIRED
    };
    
    return {
      code: lunaStatus.code,
      isValid: lunaStatus.isValid,
      status: statusMap[lunaStatus.status] || CouponStatus.INVALID,
      message: lunaStatus.message,
      details: lunaStatus.details
    };
  }
}

export { MembershipAdapter, CouponAdapter };
