// 卡券类型
export enum CouponType {
  MEMBERSHIP = 'MEMBERSHIP',
  DISCOUNT = 'DISCOUNT',
  FREE_TRIAL = 'FREE_TRIAL'
}

// 卡券状态
export enum CouponStatus {
  ACTIVE = 'ACTIVE',
  REDEEMED = 'REDEEMED',
  EXPIRED = 'EXPIRED',
  INVALID = 'INVALID'
}

// 卡券信息
export interface Coupon {
  code: string;
  type: CouponType;
  value: string | number;
  status: CouponStatus;
  expireDate?: number;
  createDate?: number;
  batchId?: string;
  usageLimit?: number;
  usedCount?: number;
}

// 卡券状态信息
export interface CouponStatusInfo {
  code: string;
  isValid: boolean;
  status: CouponStatus;
  message?: string;
  details?: Record<string, unknown>;
}

// 卡券兑换结果
export interface RedeemResult {
  success: boolean;
  message: string;
  coupon?: Coupon;
  membershipInfo?: {
    tier: string;
    endDate: number;
  };
}
