// 会员等级类型
export type MembershipTierName = 'default' | 'basic' | 'standard' | 'premium' | 'vip';

// 会员等级信息
export interface MembershipTier {
  name: MembershipTierName;
  price: number;
  features: string[];
  duration: number;
  priority: number;
  displayName?: string;
}

// 会员配置
export interface MembershipConfig {
  tiers: MembershipTier[];
  defaultTier: MembershipTierName;
  upgradeOptions: Record<string, unknown>;
}

// 用户会员信息
export interface UserMembership {
  userId: string;
  tier: MembershipTierName;
  startDate: number;
  endDate: number;
  status: 'active' | 'expired' | 'pending';
  devices?: string[];
}
