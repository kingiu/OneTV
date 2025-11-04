#!/usr/bin/env ts-node

/**
 * 会员信息对比脚本
 * 用于对比虚拟机中登录用户获取的会员信息与LunaTV中的会员信息
 */

// 模拟LunaTV的会员信息结构
interface LunaTVUserMembership {
  tierId: string;
  startDate: number;
  endDate: number;
  status: 'active' | 'expired' | 'pending';
  autoRenew: boolean;
  source?: 'manual' | 'coupon' | 'system';
  renewInfo?: {
    enabled: boolean;
    renewalTierId: string;
    nextRenewalDate: number;
  } | null;
  userName?: string;
}

// OneTV的会员信息结构
interface OneTVUserMembership {
  userName: string;
  tier: string;
  isActive: boolean;
  status: string;
  createdAt: number;
  expireTime?: number;
  lastRenewTime?: number;
  daysRemaining?: number;
}

// 会员等级枚举
enum MembershipTier {
  VIP = 'vip',
  PREMIUM = 'premium',
  STANDARD = 'default'
}

// 会员等级中文名称映射
const MembershipNames = {
  [MembershipTier.VIP]: 'VIP会员',
  [MembershipTier.PREMIUM]: '高级会员',
  [MembershipTier.STANDARD]: '普通会员'
};

// 会员等级颜色配置
const MembershipColors = {
  [MembershipTier.VIP]: '#FFD700', // 金色
  [MembershipTier.PREMIUM]: '#9370DB', // 紫色
  [MembershipTier.STANDARD]: '#4A90E2' // 蓝色
};

// 会员等级映射函数
function mapLunaToOnetvTier(lunaTierId: string): string {
  const tierIdLower = lunaTierId.toLowerCase();
  
  // VIP匹配规则
  if (tierIdLower.includes('vip') || tierIdLower.includes('至尊') || tierIdLower.includes('至尊会员')) {
    return MembershipTier.VIP;
  }
  
  // 高级会员匹配规则
  if (tierIdLower.includes('premium') || tierIdLower.includes('高级') || 
      tierIdLower.includes('高级会员') || tierIdLower.includes('黄金') || 
      tierIdLower.includes('黄金会员')) {
    return MembershipTier.PREMIUM;
  }
  
  // 普通会员匹配规则
  if (tierIdLower.includes('standard') || tierIdLower.includes('default') || 
      tierIdLower.includes('普通') || tierIdLower.includes('普通会员') || 
      tierIdLower.includes('基础') || tierIdLower.includes('基础会员')) {
    return MembershipTier.STANDARD;
  }
  
  // 默认匹配
  if (tierIdLower === 'vip' || tierIdLower === '至尊') {
    return MembershipTier.VIP;
  } else if (tierIdLower === 'premium' || tierIdLower === '高级' || tierIdLower === '黄金') {
    return MembershipTier.PREMIUM;
  } else if (tierIdLower === 'standard' || tierIdLower === 'default' || 
             tierIdLower === '普通' || tierIdLower === '基础') {
    return MembershipTier.STANDARD;
  }
  
  // 无法识别时默认为普通会员
  return MembershipTier.STANDARD;
}

// 日期格式化函数
function formatMembershipDate(timestamp: number): string {
  if (!timestamp || timestamp <= 0) {
    return '未知';
  }
  
  const date = new Date(timestamp);
  if (isNaN(date.getTime())) {
    return '未知';
  }
  
  return date.toLocaleDateString('zh-CN', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit'
  });
}

// 计算剩余天数
function calculateRemainingDays(expireTime: number): number {
  if (!expireTime || expireTime <= 0) {
    return 0;
  }
  
  const now = Date.now();
  const diff = expireTime - now;
  return Math.ceil(diff / (1000 * 60 * 60 * 24));
}

// 映射LunaTV会员信息到OneTV格式
function mapLunaToOnetvMembership(lunaMembership: LunaTVUserMembership): OneTVUserMembership {
  const mappedTier = mapLunaToOnetvTier(lunaMembership.tierId);
  
  const mappedMembership: OneTVUserMembership = {
    userName: lunaMembership.userName || "",
    tier: mappedTier,
    isActive: lunaMembership.status === 'active',
    status: lunaMembership.status,
    createdAt: lunaMembership.startDate || Date.now(),
    expireTime: lunaMembership.endDate,
    lastRenewTime: lunaMembership.renewInfo?.nextRenewalDate || undefined,
    daysRemaining: lunaMembership.endDate ? calculateRemainingDays(lunaMembership.endDate) : 0
  };
  
  return mappedMembership;
}

// 打印会员信息对比
function printMembershipComparison(lunaMembership: LunaTVUserMembership, onetvMembership: OneTVUserMembership) {
  console.log('\n========== 会员信息对比 ==========\n');
  
  console.log('LunaTV 会员信息:');
  console.log('  用户名:', lunaMembership.userName || '未提供');
  console.log('  会员等级ID:', lunaMembership.tierId);
  console.log('  状态:', lunaMembership.status);
  console.log('  开通时间:', formatMembershipDate(lunaMembership.startDate));
  console.log('  到期时间:', formatMembershipDate(lunaMembership.endDate));
  console.log('  自动续费:', lunaMembership.autoRenew ? '是' : '否');
  if (lunaMembership.renewInfo) {
    console.log('  续费信息:');
    console.log('    启用:', lunaMembership.renewInfo.enabled ? '是' : '否');
    console.log('    续费等级:', lunaMembership.renewInfo.renewalTierId);
    console.log('    下次续费时间:', formatMembershipDate(lunaMembership.renewInfo.nextRenewalDate));
  }
  
  console.log('\nOneTV 会员信息:');
  console.log('  用户名:', onetvMembership.userName || '未提供');
  console.log('  会员等级:', onetvMembership.tier);
  console.log('  激活状态:', onetvMembership.isActive ? '已激活' : '未激活');
  console.log('  状态:', onetvMembership.status);
  console.log('  开通时间:', formatMembershipDate(onetvMembership.createdAt));
  console.log('  到期时间:', onetvMembership.expireTime ? formatMembershipDate(onetvMembership.expireTime) : '未提供');
  console.log('  剩余天数:', onetvMembership.daysRemaining !== undefined ? onetvMembership.daysRemaining : '未提供');
  if (onetvMembership.lastRenewTime) {
    console.log('  最后续费时间:', formatMembershipDate(onetvMembership.lastRenewTime));
  }
  
  console.log('\n========== 对比结果 ==========\n');
  
  // 对比用户名
  if (lunaMembership.userName === onetvMembership.userName) {
    console.log('✓ 用户名匹配');
  } else {
    console.log('✗ 用户名不匹配');
    console.log('  LunaTV:', lunaMembership.userName || '未提供');
    console.log('  OneTV:', onetvMembership.userName || '未提供');
  }
  
  // 对比会员等级
  const expectedTier = mapLunaToOnetvTier(lunaMembership.tierId);
  if (expectedTier === onetvMembership.tier) {
    console.log('✓ 会员等级映射正确');
  } else {
    console.log('✗ 会员等级映射错误');
    console.log('  LunaTV等级ID:', lunaMembership.tierId);
    console.log('  预期映射结果:', expectedTier);
    console.log('  实际映射结果:', onetvMembership.tier);
  }
  
  // 对比状态
  const expectedActive = lunaMembership.status === 'active';
  if (expectedActive === onetvMembership.isActive) {
    console.log('✓ 激活状态匹配');
  } else {
    console.log('✗ 激活状态不匹配');
    console.log('  LunaTV状态:', lunaMembership.status);
    console.log('  预期激活状态:', expectedActive ? '已激活' : '未激活');
    console.log('  OneTV激活状态:', onetvMembership.isActive ? '已激活' : '未激活');
  }
  
  // 对比状态字符串
  if (lunaMembership.status === onetvMembership.status) {
    console.log('✓ 状态字符串匹配');
  } else {
    console.log('✗ 状态字符串不匹配');
    console.log('  LunaTV状态:', lunaMembership.status);
    console.log('  OneTV状态:', onetvMembership.status);
  }
  
  // 对比开通时间
  if (lunaMembership.startDate === onetvMembership.createdAt) {
    console.log('✓ 开通时间匹配');
  } else {
    console.log('✗ 开通时间不匹配');
    console.log('  LunaTV开通时间:', lunaMembership.startDate, '(', formatMembershipDate(lunaMembership.startDate), ')');
    console.log('  OneTV开通时间:', onetvMembership.createdAt, '(', formatMembershipDate(onetvMembership.createdAt), ')');
  }
  
  // 对比到期时间
  if (lunaMembership.endDate === onetvMembership.expireTime) {
    console.log('✓ 到期时间匹配');
  } else {
    console.log('✗ 到期时间不匹配');
    console.log('  LunaTV到期时间:', lunaMembership.endDate, '(', formatMembershipDate(lunaMembership.endDate), ')');
    console.log('  OneTV到期时间:', onetvMembership.expireTime, '(', onetvMembership.expireTime ? formatMembershipDate(onetvMembership.expireTime) : '未提供', ')');
  }
  
  // 对比续费时间
  const lunaRenewTime = lunaMembership.renewInfo?.nextRenewalDate;
  if (lunaRenewTime === onetvMembership.lastRenewTime) {
    console.log('✓ 续费时间匹配');
  } else {
    console.log('ℹ 续费时间对比');
    console.log('  LunaTV续费时间:', lunaRenewTime, '(', lunaRenewTime ? formatMembershipDate(lunaRenewTime) : '未提供', ')');
    console.log('  OneTV续费时间:', onetvMembership.lastRenewTime, '(', onetvMembership.lastRenewTime ? formatMembershipDate(onetvMembership.lastRenewTime) : '未提供', ')');
  }
}

// 主函数
async function main() {
  try {
    // 这里需要模拟LunaTV的会员信息
    // 在实际应用中，这些数据应该从LunaTV系统获取
    const mockLunaMembership: LunaTVUserMembership = {
      tierId: "vip_monthly", // 示例数据
      startDate: Date.now() - 30 * 24 * 60 * 60 * 1000, // 30天前
      endDate: Date.now() + 30 * 24 * 60 * 60 * 1000, // 30天后
      status: 'active',
      autoRenew: true,
      source: 'manual',
      renewInfo: {
        enabled: true,
        renewalTierId: "vip_monthly",
        nextRenewalDate: Date.now() + 30 * 24 * 60 * 60 * 1000
      },
      userName: "testuser"
    };
    
    const mappedMembership = mapLunaToOnetvMembership(mockLunaMembership);
    printMembershipComparison(mockLunaMembership, mappedMembership);
    
    console.log('\n========== 映射测试 ==========\n');
    console.log('LunaTV会员信息:');
    console.log(JSON.stringify(mockLunaMembership, null, 2));
    console.log('\n映射后的OneTV会员信息:');
    console.log(JSON.stringify(mappedMembership, null, 2));
    
  } catch (error) {
    console.error('处理会员信息时出错:', error);
  }
}

// 执行主函数
main();