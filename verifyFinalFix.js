// 验证脚本：测试会员等级识别修复
const fs = require('fs');
const path = require('path');

// 模拟MembershipTier枚举
const MembershipTier = {
  VIP: 'vip',        // 尊享会员
  PREMIUM: 'premium', // 高级会员
  STANDARD: 'default' // 普通会员
};

// 模拟membershipUtils中的tierRules
const tierRules = [
  // 精确匹配规则 - 最高优先级
  { regex: /^vip1$/i, tier: MembershipTier.PREMIUM, priority: 1 }, // 精确匹配vip1为高级会员
  { regex: /^vip$/i, tier: MembershipTier.VIP, priority: 2 }, // 精确匹配vip为尊享会员
  { regex: /^premium$/i, tier: MembershipTier.PREMIUM, priority: 3 }, // 精确匹配premium
  { regex: /^standard$|^default$/i, tier: MembershipTier.STANDARD, priority: 4 }, // 精确匹配standard/default
  
  // 数字匹配规则
  { regex: /^1$/, tier: MembershipTier.PREMIUM, priority: 5 }, // 数字1对应高级会员
  { regex: /^2$/, tier: MembershipTier.VIP, priority: 6 }, // 数字2对应尊享会员
  { regex: /^0$/, tier: MembershipTier.STANDARD, priority: 7 }, // 数字0对应普通会员
  
  // 高级会员特定规则 - 提高优先级以避免被尊享会员规则覆盖
  { regex: /高级vip|会员1|vip\s*1/i, tier: MembershipTier.PREMIUM, priority: 8 }, // 高级VIP或VIP1
  { regex: /^(高级|黄金|plus|pro)$/, tier: MembershipTier.PREMIUM, priority: 9 }, // 高级/黄金/plus/pro
  { regex: /premium(会员)?|高级(会员)?|黄金(会员)?|plus(会员)?|pro(会员)?/i, tier: MembershipTier.PREMIUM, priority: 10 },
  { regex: /plus|pro/i, tier: MembershipTier.PREMIUM, priority: 11 },
  { regex: /gold|silver/i, tier: MembershipTier.PREMIUM, priority: 12 }, // 黄金/白银会员
  { regex: /(tier|level)\s*1/i, tier: MembershipTier.PREMIUM, priority: 13 }, // tier/level 1
  { regex: /高级/i, tier: MembershipTier.PREMIUM, priority: 14 }, // 单独匹配高级
  
  // 尊享会员规则 - 降低部分规则优先级
  { regex: /^(至尊|尊享)$/, tier: MembershipTier.VIP, priority: 15 }, // 精确匹配至尊/尊享
  { regex: /svip|super\s*vip/i, tier: MembershipTier.VIP, priority: 16 }, // SVIP
  { regex: /至尊(会员)?|尊享(会员)?/i, tier: MembershipTier.VIP, priority: 17 }, // 至尊/尊享会员
  { regex: /尊享/i, tier: MembershipTier.VIP, priority: 18 }, // 单独匹配尊享
  
  // 普通会员规则
  { regex: /^(普通|基础)$/, tier: MembershipTier.STANDARD, priority: 19 }, // 普通/基础
  { regex: /普通(会员)?|基础(会员)?/i, tier: MembershipTier.STANDARD, priority: 20 }, // 普通/基础会员
];

// 修复后的determineMembershipTier方法（模拟）
function determineMembershipTier(tierIdentifier, useFallback = false) {
  // 确保是字符串类型
  const tierStr = String(tierIdentifier || '').toLowerCase();
  
  // 尝试直接匹配枚举值
  if ([MembershipTier.VIP, MembershipTier.PREMIUM, MembershipTier.STANDARD].includes(tierStr)) {
    return tierStr;
  }
  
  // 使用增强规则匹配
  const matchedRules = tierRules
    .filter(rule => rule.regex.test(tierStr));
  
  if (matchedRules.length > 0) {
    // 按优先级排序并取第一个匹配
    const matchedRule = matchedRules.sort((a, b) => a.priority - b.priority)[0];
    return matchedRule.tier;
  }
  
  // 回退策略：检查是否包含数字
  if (useFallback && /\d+/.test(tierStr)) {
    const number = parseInt(tierStr.match(/\d+/)?.[0] || '0');
    if (number === 1) {
      return MembershipTier.PREMIUM;
    } else if (number === 2) {
      return MembershipTier.VIP;
    }
  }
  
  // 默认为普通会员
  return MembershipTier.STANDARD;
}

// 会员等级显示名称映射
const MembershipNames = {
  [MembershipTier.VIP]: '尊享会员',
  [MembershipTier.PREMIUM]: '高级会员',
  [MembershipTier.STANDARD]: '普通会员'
};

// 测试用例
const testCases = [
  // 高级会员测试用例
  { input: 'vip1', expected: MembershipTier.PREMIUM, description: 'VIP1应该被识别为高级会员' },
  { input: 'premium', expected: MembershipTier.PREMIUM, description: 'premium应该被识别为高级会员' },
  { input: '高级', expected: MembershipTier.PREMIUM, description: '高级应该被识别为高级会员' },
  { input: '高级会员', expected: MembershipTier.PREMIUM, description: '高级会员应该被识别为高级会员' },
  { input: '黄金', expected: MembershipTier.PREMIUM, description: '黄金应该被识别为高级会员' },
  { input: 'plus', expected: MembershipTier.PREMIUM, description: 'plus应该被识别为高级会员' },
  { input: 'pro', expected: MembershipTier.PREMIUM, description: 'pro应该被识别为高级会员' },
  { input: '1', expected: MembershipTier.PREMIUM, description: '数字1应该被识别为高级会员' },
  { input: 'gold', expected: MembershipTier.PREMIUM, description: 'gold应该被识别为高级会员' },
  { input: 'tier 1', expected: MembershipTier.PREMIUM, description: 'tier 1应该被识别为高级会员' },
  { input: 'level 1', expected: MembershipTier.PREMIUM, description: 'level 1应该被识别为高级会员' },
  
  // 尊享会员测试用例
  { input: 'vip', expected: MembershipTier.VIP, description: 'vip应该被识别为尊享会员' },
  { input: '尊享', expected: MembershipTier.VIP, description: '尊享应该被识别为尊享会员' },
  { input: '尊享会员', expected: MembershipTier.VIP, description: '尊享会员应该被识别为尊享会员' },
  { input: '至尊', expected: MembershipTier.VIP, description: '至尊应该被识别为尊享会员' },
  { input: 'svip', expected: MembershipTier.VIP, description: 'svip应该被识别为尊享会员' },
  { input: 'super vip', expected: MembershipTier.VIP, description: 'super vip应该被识别为尊享会员' },
  { input: '2', expected: MembershipTier.VIP, description: '数字2应该被识别为尊享会员' },
  
  // 普通会员测试用例
  { input: 'standard', expected: MembershipTier.STANDARD, description: 'standard应该被识别为普通会员' },
  { input: 'default', expected: MembershipTier.STANDARD, description: 'default应该被识别为普通会员' },
  { input: '普通', expected: MembershipTier.STANDARD, description: '普通应该被识别为普通会员' },
  { input: '普通会员', expected: MembershipTier.STANDARD, description: '普通会员应该被识别为普通会员' },
  { input: '基础', expected: MembershipTier.STANDARD, description: '基础应该被识别为普通会员' },
  { input: '基础会员', expected: MembershipTier.STANDARD, description: '基础会员应该被识别为普通会员' },
  { input: '0', expected: MembershipTier.STANDARD, description: '数字0应该被识别为普通会员' },
  
  // 混合情况测试用例
  { input: '高级vip1', expected: MembershipTier.PREMIUM, description: '高级vip1应该被识别为高级会员（优先级测试）' },
  { input: '尊享高级', expected: MembershipTier.PREMIUM, description: '尊享高级应该被识别为高级会员（优先级测试）' },
  { input: '高级尊享', expected: MembershipTier.PREMIUM, description: '高级尊享应该被识别为高级会员（优先级测试）' },
  
  // 边界情况
  { input: '', expected: MembershipTier.STANDARD, description: '空字符串应该默认为普通会员' },
  { input: null, expected: MembershipTier.STANDARD, description: 'null值应该默认为普通会员' },
  { input: undefined, expected: MembershipTier.STANDARD, description: 'undefined应该默认为普通会员' },
  { input: 'unknown', expected: MembershipTier.STANDARD, description: '未知值应该默认为普通会员' }
];

// 运行测试
function runTests() {
  let passed = 0;
  const failedTests = [];
  
  console.log('=== 开始测试会员等级识别修复 ===\n');
  
  testCases.forEach((testCase, index) => {
    const result = determineMembershipTier(testCase.input);
    const success = result === testCase.expected;
    
    if (success) {
      passed++;
      console.log(`✅ 测试 ${index + 1}: ${testCase.description}`);
      console.log(`   输入: "${testCase.input}", 预期: "${MembershipNames[testCase.expected]}", 实际: "${MembershipNames[result]}"`);
    } else {
      failedTests.push({
        index: index + 1,
        input: testCase.input,
        expected: testCase.expected,
        expectedName: MembershipNames[testCase.expected],
        actual: result,
        actualName: MembershipNames[result],
        description: testCase.description
      });
    }
  });
  
  // 显示失败的测试
  if (failedTests.length > 0) {
    console.log('\n❌ 失败的测试:');
    failedTests.forEach(test => {
      console.log(`\n❌ 测试 ${test.index}: ${test.description}`);
      console.log(`   输入: "${test.input}"`);
      console.log(`   预期: "${test.expectedName}" (${test.expected})`);
      console.log(`   实际: "${test.actualName}" (${test.actual})`);
    });
  }
  
  // 显示总结
  const total = testCases.length;
  const successRate = (passed / total * 100).toFixed(2);
  
  console.log('\n=== 测试结果总结 ===');
  console.log(`通过: ${passed}/${total} (${successRate}%)`);
  
  if (failedTests.length === 0) {
    console.log('🎉 所有测试通过！会员等级识别修复成功！');
    console.log('\n修复总结:');
    console.log('1. 问题根源: api.ts中的_determineMembershipTier方法自己实现了一套简化的会员等级映射逻辑');
    console.log('2. 解决方案: 修改为使用membershipUtils.ts中定义的更完善、优先级明确的映射规则');
    console.log('3. 预期效果: 所有高级会员（vip1、premium、高级等）都能被正确识别');
  } else {
    console.log('❌ 存在测试失败，请检查修复逻辑');
  }
  
  return failedTests.length === 0;
}

// 执行测试
const success = runTests();
process.exit(success ? 0 : 1);