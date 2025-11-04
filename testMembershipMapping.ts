#!/usr/bin/env ts-node

/**
 * 会员信息映射测试脚本
 * 用于测试OneTV系统中从LunaTV获取的会员信息映射是否正确
 */

// LunaTV会员信息接口
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

// OneTV会员信息接口
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
enum MembershipTierType {
  VIP = 'vip',
  PREMIUM = 'premium',
  STANDARD = 'default'
}

// 会员等级映射函数
function testMapLunaToOnetvTier(lunaTierId: string): string {
  const tierIdLower = lunaTierId.toLowerCase();
  
  // VIP匹配规则
  if (tierIdLower.includes('vip') || tierIdLower.includes('至尊') || tierIdLower.includes('至尊会员')) {
    return MembershipTierType.VIP;
  }
  
  // 高级会员匹配规则
  if (tierIdLower.includes('premium') || tierIdLower.includes('高级') || 
      tierIdLower.includes('高级会员') || tierIdLower.includes('黄金') || 
      tierIdLower.includes('黄金会员')) {
    return MembershipTierType.PREMIUM;
  }
  
  // 普通会员匹配规则
  if (tierIdLower.includes('standard') || tierIdLower.includes('default') || 
      tierIdLower.includes('普通') || tierIdLower.includes('普通会员') || 
      tierIdLower.includes('基础') || tierIdLower.includes('基础会员')) {
    return MembershipTierType.STANDARD;
  }
  
  // 默认匹配
  if (tierIdLower === 'vip' || tierIdLower === '至尊') {
    return MembershipTierType.VIP;
  } else if (tierIdLower === 'premium' || tierIdLower === '高级' || tierIdLower === '黄金') {
    return MembershipTierType.PREMIUM;
  } else if (tierIdLower === 'standard' || tierIdLower === 'default' || 
             tierIdLower === '普通' || tierIdLower === '基础') {
    return MembershipTierType.STANDARD;
  }
  
  // 无法识别时默认为普通会员
  return MembershipTierType.STANDARD;
}

// 日期格式化函数
function testFormatMembershipDate(timestamp: number): string {
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
function testCalculateRemainingDays(expireTime: number): number {
  if (!expireTime || expireTime <= 0) {
    return 0;
  }
  
  const now = Date.now();
  const diff = expireTime - now;
  return Math.ceil(diff / (1000 * 60 * 60 * 24));
}

// 映射LunaTV会员信息到OneTV格式
function testMapLunaToOnetvMembership(lunaMembership: LunaTVUserMembership): OneTVUserMembership {
  const mappedTier = testMapLunaToOnetvTier(lunaMembership.tierId);
  
  const mappedMembership: OneTVUserMembership = {
    userName: lunaMembership.userName || "",
    tier: mappedTier,
    isActive: lunaMembership.status === 'active',
    status: lunaMembership.status,
    createdAt: lunaMembership.startDate || Date.now(),
    expireTime: lunaMembership.endDate,
    lastRenewTime: lunaMembership.renewInfo?.nextRenewalDate || undefined,
    daysRemaining: lunaMembership.endDate ? testCalculateRemainingDays(lunaMembership.endDate) : 0
  };
  
  return mappedMembership;
}

// 测试各种会员等级映射
function testMembershipTierMapping() {
  console.log('========== 会员等级映射测试 ==========\n');
  
  const testCases = [
    { lunaTierId: 'vip', expected: MembershipTierType.VIP, description: 'VIP会员' },
    { lunaTierId: 'vip_monthly', expected: MembershipTierType.VIP, description: 'VIP月度会员' },
    { lunaTierId: '至尊会员', expected: MembershipTierType.VIP, description: '至尊会员' },
    { lunaTierId: 'premium', expected: MembershipTierType.PREMIUM, description: '高级会员' },
    { lunaTierId: 'premium_yearly', expected: MembershipTierType.PREMIUM, description: '高级年费会员' },
    { lunaTierId: '黄金会员', expected: MembershipTierType.PREMIUM, description: '黄金会员' },
    { lunaTierId: 'standard', expected: MembershipTierType.STANDARD, description: '标准会员' },
    { lunaTierId: 'default', expected: MembershipTierType.STANDARD, description: '默认会员' },
    { lunaTierId: '普通会员', expected: MembershipTierType.STANDARD, description: '普通会员' },
    { lunaTierId: 'basic', expected: MembershipTierType.STANDARD, description: '基础会员' },
    { lunaTierId: 'unknown_tier', expected: MembershipTierType.STANDARD, description: '未知会员等级' },
  ];
  
  let passedTests = 0;
  testCases.forEach((testCase, index) => {
    const result = testMapLunaToOnetvTier(testCase.lunaTierId);
    const passed = result === testCase.expected;
    if (passed) passedTests++;
    
    console.log(`${index + 1}. ${testCase.description}`);
    console.log(`   LunaTV等级ID: ${testCase.lunaTierId}`);
    console.log(`   映射结果: ${result}`);
    console.log(`   预期结果: ${testCase.expected}`);
    console.log(`   结果: ${passed ? '✓ 通过' : '✗ 失败'}\n`);
  });
  
  console.log(`测试总结: ${passedTests}/${testCases.length} 个测试通过\n`);
}

// 测试完整会员信息映射
function testFullMembershipMapping() {
  console.log('========== 完整会员信息映射测试 ==========\n');
  
  const testCases: LunaTVUserMembership[] = [
    {
      tierId: 'vip_monthly',
      startDate: Date.now() - 30 * 24 * 60 * 60 * 1000,
      endDate: Date.now() + 30 * 24 * 60 * 60 * 1000,
      status: 'active',
      autoRenew: true,
      userName: 'testuser1'
    },
    {
      tierId: 'premium',
      startDate: Date.now() - 15 * 24 * 60 * 60 * 1000,
      endDate: Date.now() + 15 * 24 * 60 * 60 * 1000,
      status: 'active',
      autoRenew: false,
      userName: 'testuser2',
      renewInfo: {
        enabled: false,
        renewalTierId: '',
        nextRenewalDate: 0
      }
    },
    {
      tierId: 'standard',
      startDate: Date.now() - 5 * 24 * 60 * 60 * 1000,
      endDate: Date.now() + 5 * 24 * 60 * 60 * 1000,
      status: 'expired',
      autoRenew: false,
      userName: 'testuser3'
    }
  ];
  
  testCases.forEach((lunaMembership, index) => {
    console.log(`${index + 1}. 测试用例`);
    console.log(`   LunaTV会员信息:`);
    console.log(`     用户名: ${lunaMembership.userName}`);
    console.log(`     会员等级ID: ${lunaMembership.tierId}`);
    console.log(`     状态: ${lunaMembership.status}`);
    console.log(`     开通时间: ${testFormatMembershipDate(lunaMembership.startDate)}`);
    console.log(`     到期时间: ${testFormatMembershipDate(lunaMembership.endDate)}`);
    
    const onetvMembership = testMapLunaToOnetvMembership(lunaMembership);
    const expectedTier = testMapLunaToOnetvTier(lunaMembership.tierId);
    
    console.log(`   映射后OneTV会员信息:`);
    console.log(`     用户名: ${onetvMembership.userName}`);
    console.log(`     会员等级: ${onetvMembership.tier} (预期: ${expectedTier})`);
    console.log(`     激活状态: ${onetvMembership.isActive ? '已激活' : '未激活'}`);
    console.log(`     状态: ${onetvMembership.status}`);
    console.log(`     开通时间: ${testFormatMembershipDate(onetvMembership.createdAt)}`);
    console.log(`     到期时间: ${onetvMembership.expireTime ? testFormatMembershipDate(onetvMembership.expireTime) : '未提供'}`);
    console.log(`     剩余天数: ${onetvMembership.daysRemaining}`);
    
    // 验证映射结果
    const tierCorrect = onetvMembership.tier === expectedTier;
    const statusCorrect = onetvMembership.status === lunaMembership.status;
    const activeCorrect = onetvMembership.isActive === (lunaMembership.status === 'active');
    const datesCorrect = onetvMembership.createdAt === lunaMembership.startDate && 
                         onetvMembership.expireTime === lunaMembership.endDate;
    
    const allCorrect = tierCorrect && statusCorrect && activeCorrect && datesCorrect;
    
    console.log(`   映射验证: ${allCorrect ? '✓ 正确' : '✗ 错误'}`);
    if (!tierCorrect) console.log(`     - 会员等级映射错误`);
    if (!statusCorrect) console.log(`     - 状态字符串映射错误`);
    if (!activeCorrect) console.log(`     - 激活状态映射错误`);
    if (!datesCorrect) console.log(`     - 日期映射错误`);
    console.log('');
  });
}

// 主函数
async function testMain() {
  console.log('开始会员信息映射测试...\n');
  
  // 测试会员等级映射
  testMembershipTierMapping();
  
  // 测试完整会员信息映射
  testFullMembershipMapping();
  
  console.log('========== 测试完成 ==========\n');
}

// 执行主函数
testMain();