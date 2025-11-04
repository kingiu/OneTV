import { MembershipTier, getMembershipTierText, mapLunaToStandardTier } from './membershipUtils';

/**
 * 测试会员等级识别功能
 * 验证不同tier值的映射结果，特别是高级会员和尊享会员的区分
 */
export const testMembershipRecognition = () => {
  console.log('\n===== 开始测试会员等级识别功能... =====\n');
  
  // 模拟membershipStore中的方法实现 - 用于调试和验证识别逻辑
  const membershipStore = {
    isVip: (tier: string | number | null) => {
      // 特殊处理: 确保tier值始终为字符串类型
      const tierStr = String(tier || '').toLowerCase();
      
      // 先排除所有可能是高级会员的值
      if (tierStr === 'vip1' || 
          tierStr.includes('高级') || 
          tierStr === 'premium' ||
          tierStr.includes('plus') || 
          tierStr.includes('pro') ||
          tierStr.includes('gold') ||
          tierStr.includes('silver') ||
          tierStr === '1') {
        return false;
      }
      
      // 尊享会员判断逻辑
      const isVip = tierStr === 'vip' || 
                   tierStr.includes('尊享') || 
                   tierStr.includes('至尊') ||
                   tierStr === 'svip' || 
                   tierStr.includes('supervip') ||
                   tierStr === '2'; // 数字2对应尊享会员
      
      return isVip;
    },
    
    isPremium: (tier: string | number | null) => {
      // 特殊处理: 确保tier值始终为字符串类型
      const tierStr = String(tier || '').toLowerCase();
      
      // 直接判断是否为高级会员
      const isPremium = 
        tierStr === 'premium' || 
        tierStr === 'vip1' || // 精确匹配vip1
        tierStr.includes('高级') || 
        tierStr.includes('黄金') ||
        tierStr.includes('plus') || 
        tierStr.includes('pro') ||
        tierStr === '1' || // 数字1对应高级会员
        tierStr.includes('gold') || // 英文黄金会员
        tierStr.includes('silver') || // 英文白银会员
        tierStr.includes('高级vip') || // 高级VIP
        tierStr.includes('会员1') || // 会员1
        tierStr.match(/(tier|level)\s*1/i) !== null; // tier/level 1
      
      return isPremium;
    },
    
    isStandard: (tier: string | number | null) => {
      // 特殊处理: 确保tier值始终为字符串类型
      const tierStr = String(tier || '').toLowerCase();
      
      // 普通会员判断逻辑
      const isStandard = tierStr === 'standard' || 
                         tierStr.includes('普通') || 
                         tierStr === '0' || // 数字0对应普通会员
                         tierStr === 'normal';
      
      return isStandard;
    }
  };

  // 定义测试用例接口
  interface TestCase {
    tier: string | number | null;
    expectedTier: MembershipTier;
    expectedText: string;
  }

  // 测试用例 - 增强版，重点验证高级会员和尊享会员的区分
  const testCases: TestCase[] = [
    // 尊享会员测试用例
    { tier: 'vip', expectedTier: MembershipTier.VIP, expectedText: '尊享会员' },
    { tier: 'VIP', expectedTier: MembershipTier.VIP, expectedText: '尊享会员' },
    { tier: 'svip', expectedTier: MembershipTier.VIP, expectedText: '尊享会员' },
    { tier: 'supervip', expectedTier: MembershipTier.VIP, expectedText: '尊享会员' },
    { tier: '尊享', expectedTier: MembershipTier.VIP, expectedText: '尊享会员' },
    { tier: '尊享会员', expectedTier: MembershipTier.VIP, expectedText: '尊享会员' },
    { tier: '至尊', expectedTier: MembershipTier.VIP, expectedText: '尊享会员' },
    { tier: '2', expectedTier: MembershipTier.VIP, expectedText: '尊享会员' },
    
    // 高级会员测试用例 - 扩展了更多可能的形式
    { tier: 'premium', expectedTier: MembershipTier.PREMIUM, expectedText: '高级会员' },
    { tier: '高级', expectedTier: MembershipTier.PREMIUM, expectedText: '高级会员' },
    { tier: '高级会员', expectedTier: MembershipTier.PREMIUM, expectedText: '高级会员' },
    { tier: '黄金', expectedTier: MembershipTier.PREMIUM, expectedText: '高级会员' },
    { tier: '黄金会员', expectedTier: MembershipTier.PREMIUM, expectedText: '高级会员' },
    { tier: 'plus', expectedTier: MembershipTier.PREMIUM, expectedText: '高级会员' },
    { tier: 'pro', expectedTier: MembershipTier.PREMIUM, expectedText: '高级会员' },
    { tier: '1', expectedTier: MembershipTier.PREMIUM, expectedText: '高级会员' },
    { tier: 'gold', expectedTier: MembershipTier.PREMIUM, expectedText: '高级会员' },
    { tier: 'silver', expectedTier: MembershipTier.PREMIUM, expectedText: '高级会员' },
    { tier: 'vip1', expectedTier: MembershipTier.PREMIUM, expectedText: '高级会员' },
    { tier: '高级vip', expectedTier: MembershipTier.PREMIUM, expectedText: '高级会员' },
    { tier: '会员1', expectedTier: MembershipTier.PREMIUM, expectedText: '高级会员' },
    { tier: 'tier 1', expectedTier: MembershipTier.PREMIUM, expectedText: '高级会员' },
    { tier: 'level1', expectedTier: MembershipTier.PREMIUM, expectedText: '高级会员' },
    { tier: 'level 1', expectedTier: MembershipTier.PREMIUM, expectedText: '高级会员' },
    
    // 普通会员测试用例
    { tier: 'standard', expectedTier: MembershipTier.STANDARD, expectedText: '普通会员' },
    { tier: 'default', expectedTier: MembershipTier.STANDARD, expectedText: '普通会员' },
    { tier: '普通', expectedTier: MembershipTier.STANDARD, expectedText: '普通会员' },
    { tier: '普通会员', expectedTier: MembershipTier.STANDARD, expectedText: '普通会员' },
    { tier: '基础', expectedTier: MembershipTier.STANDARD, expectedText: '普通会员' },
    { tier: '基础会员', expectedTier: MembershipTier.STANDARD, expectedText: '普通会员' },
    { tier: '0', expectedTier: MembershipTier.STANDARD, expectedText: '普通会员' },
    { tier: 'normal', expectedTier: MembershipTier.STANDARD, expectedText: '普通会员' },
    
    // 未知/无效会员测试用例
    { tier: 'unknown', expectedTier: MembershipTier.STANDARD, expectedText: 'unknown' },
    { tier: '', expectedTier: MembershipTier.STANDARD, expectedText: '未知等级' },
    { tier: null, expectedTier: MembershipTier.STANDARD, expectedText: '未知等级' },
    
    // 边界情况测试 - 新增测试用例验证高级会员和尊享会员的区分
    { tier: 'vip2', expectedTier: MembershipTier.STANDARD, expectedText: 'unknown' },
    { tier: 'premiumvip', expectedTier: MembershipTier.STANDARD, expectedText: 'unknown' },
    { tier: 1, expectedTier: MembershipTier.PREMIUM, expectedText: '高级会员' },
    { tier: 2, expectedTier: MembershipTier.VIP, expectedText: '尊享会员' },
    { tier: 'VIP高级', expectedTier: MembershipTier.PREMIUM, expectedText: '高级会员' },
    { tier: 'vip plus', expectedTier: MembershipTier.PREMIUM, expectedText: '高级会员' },
    { tier: '尊享会员1', expectedTier: MembershipTier.STANDARD, expectedText: 'unknown' },
  ];

  let passedCount = 0;
  let failedCount = 0;

  // 运行测试用例
  testCases.forEach((testCase, index) => {
    try {
      // 测试文本映射
      const textResult = getMembershipTierText(testCase.tier as string);
      
      // 测试等级映射
      const tierResult = mapLunaToStandardTier(testCase.tier as string);
      
      // 同时使用模拟的membershipStore进行交叉验证
      const isVip = membershipStore.isVip(testCase.tier);
      const isPremium = membershipStore.isPremium(testCase.tier);
      const isStandard = membershipStore.isStandard(testCase.tier);
      
      // 判断是否通过
      const textPassed = textResult === testCase.expectedText;
      const tierPassed = tierResult === testCase.expectedTier;
      const passed = textPassed && tierPassed;
      
      if (passed) {
        passedCount++;
        console.log(`✅ 测试 #${index + 1}: tier='${testCase.tier}' → 文本='${textResult}', 等级='${tierResult}'`);
        
        // 对于重要的测试用例，显示交叉验证结果 - 修复null值比较问题
        if (testCase.tier !== null && ['vip', 'vip1', '高级', '高级vip', '1', '2'].includes(String(testCase.tier))) {
          console.log(`   交叉验证: isVip=${isVip}, isPremium=${isPremium}, isStandard=${isStandard}`);
        }
      } else {
        failedCount++;
        console.error(`❌ 测试 #${index + 1}: tier='${testCase.tier}'`);
        console.error(`   预期文本: '${testCase.expectedText}', 实际文本: '${textResult}'`);
        console.error(`   预期等级: '${testCase.expectedTier}', 实际等级: '${tierResult}'`);
        console.error(`   交叉验证: isVip=${isVip}, isPremium=${isPremium}, isStandard=${isStandard}`);
      }
    } catch (error) {
      failedCount++;
      console.error(`❌ 测试 #${index + 1} 异常: tier='${testCase.tier}'`);
      console.error(error);
    }
  });

  // 打印测试结果摘要
  console.log('\n===== 测试结果摘要 =====');
  console.log(`通过: ${passedCount}`);
  console.log(`失败: ${failedCount}`);
  console.log(`总计: ${testCases.length}`);
  console.log(`通过率: ${Math.round((passedCount / testCases.length) * 100)}%`);

  return {
    passed: passedCount,
    failed: failedCount,
    total: testCases.length,
    passRate: Math.round((passedCount / testCases.length) * 100)
  };
};

// 导出为CommonJS兼容格式
if (typeof module !== 'undefined' && typeof module.exports !== 'undefined') {
  module.exports = { testMembershipRecognition };
  // 如果直接运行此脚本，则执行测试
  if (require.main === module) {
    testMembershipRecognition();
  }
}
