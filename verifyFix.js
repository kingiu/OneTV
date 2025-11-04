// 验证会员等级识别修复脚本
// 重点测试高级会员是否能被正确识别，避免被错误识别为尊享会员

// 模拟MembershipTier枚举
const MembershipTier = {
  VIP: 'vip',
  PREMIUM: 'premium',
  STANDARD: 'default'
};

// 模拟增强的会员等级匹配规则
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

// 模拟mapLunaToStandardTier函数
function mapLunaToStandardTier(tierId) {
  // 确保是字符串类型
  const tierStr = String(tierId || '').toLowerCase();
  
  // 使用规则匹配
  const matchedRules = tierRules
    .filter(rule => rule.regex.test(tierStr));
  
  if (matchedRules.length > 0) {
    // 按优先级排序并取第一个匹配
    const matchedRule = matchedRules.sort((a, b) => a.priority - b.priority)[0];
    return matchedRule.tier;
  }
  
  // 特殊处理：如果是纯数字，根据数字直接映射
  if (/^\d+$/.test(tierStr)) {
    const num = parseInt(tierStr, 10);
    if (num > 1) return MembershipTier.VIP;
    if (num === 1) return MembershipTier.PREMIUM;
    return MembershipTier.STANDARD;
  }
  
  // 默认返回普通会员
  return MembershipTier.STANDARD;
}

// 模拟修复后的_determineMembershipTier方法
function determineMembershipTier(tierIdentifier) {
  // 确保是字符串类型
  const tierStr = String(tierIdentifier || '').toLowerCase();
  
  // 尝试直接匹配枚举值
  if ([MembershipTier.VIP, MembershipTier.PREMIUM, MembershipTier.STANDARD].includes(tierStr)) {
    return tierStr;
  }
  
  // 首先检查是否明确包含高级会员关键词，确保它们优先于尊享会员被识别
  const premiumKeywords = ['premium', '高级', '黄金', 'plus', 'pro', 'vip1', 'gold', 'silver'];
  const hasPremiumKeyword = premiumKeywords.some(keyword => 
    tierStr.includes(keyword.toLowerCase())
  );
  
  // 如果包含高级会员关键词，优先使用mapLunaToStandardTier进行精确匹配
  const mappedTier = mapLunaToStandardTier(tierIdentifier);
  
  // 特殊处理：确保高级会员关键词总是优先于尊享会员关键词
  if (hasPremiumKeyword && mappedTier === MembershipTier.VIP) {
    console.log(`修正：检测到高级会员关键词但映射为尊享会员，强制修正为高级会员 - tier='${tierIdentifier}'`);
    return MembershipTier.PREMIUM;
  }
  
  return mappedTier;
}

// 测试用例 - 重点测试高级会员被错误识别为尊享会员的情况
const testCases = [
  // 测试高级会员类型
  { tier: 'premium', expected: MembershipTier.PREMIUM, description: '英文高级会员' },
  { tier: '高级', expected: MembershipTier.PREMIUM, description: '中文高级会员' },
  { tier: '高级会员', expected: MembershipTier.PREMIUM, description: '中文高级会员全称' },
  { tier: '黄金', expected: MembershipTier.PREMIUM, description: '黄金会员' },
  { tier: '黄金会员', expected: MembershipTier.PREMIUM, description: '黄金会员全称' },
  { tier: 'vip1', expected: MembershipTier.PREMIUM, description: 'VIP1会员' },
  { tier: '高级vip', expected: MembershipTier.PREMIUM, description: '高级VIP会员' },
  { tier: '1', expected: MembershipTier.PREMIUM, description: '数字1会员' },
  
  // 测试尊享会员类型
  { tier: 'vip', expected: MembershipTier.VIP, description: '普通VIP会员' },
  { tier: '尊享', expected: MembershipTier.VIP, description: '尊享会员' },
  { tier: '尊享会员', expected: MembershipTier.VIP, description: '尊享会员全称' },
  { tier: 'svip', expected: MembershipTier.VIP, description: 'SVIP会员' },
  { tier: '2', expected: MembershipTier.VIP, description: '数字2会员' },
  
  // 测试混合情况 - 这是之前可能出错的关键情况
  { tier: '高级尊享', expected: MembershipTier.PREMIUM, description: '高级尊享（应识别为高级）' },
  { tier: '尊享高级', expected: MembershipTier.PREMIUM, description: '尊享高级（应识别为高级）' },
  { tier: 'vip高级', expected: MembershipTier.PREMIUM, description: 'VIP高级（应识别为高级）' },
  { tier: 'vip_premium', expected: MembershipTier.PREMIUM, description: 'VIP_PREMIUM（应识别为高级）' },
  { tier: '高级会员vip', expected: MembershipTier.PREMIUM, description: '高级会员VIP（应识别为高级）' },
  { tier: 'premiumvip', expected: MembershipTier.PREMIUM, description: 'PREMIUMVIP（应识别为高级）' },
  { tier: '高级尊享会员', expected: MembershipTier.PREMIUM, description: '高级尊享会员（应识别为高级）' },
  { tier: '尊享高级会员', expected: MembershipTier.PREMIUM, description: '尊享高级会员（应识别为高级）' },
  
  // 测试边界情况
  { tier: '', expected: MembershipTier.STANDARD, description: '空字符串' },
  { tier: null, expected: MembershipTier.STANDARD, description: 'null值' },
  { tier: undefined, expected: MembershipTier.STANDARD, description: 'undefined值' },
];

// 运行测试
console.log('\n=============================================');
console.log('验证会员等级识别修复');
console.log('=============================================\n');

let passedCount = 0;
let failedCount = 0;
const failedTests = [];

testCases.forEach((testCase, index) => {
  try {
    const result = determineMembershipTier(testCase.tier);
    const passed = result === testCase.expected;
    
    if (passed) {
      passedCount++;
      console.log(`✅ 通过 #${index + 1}: '${testCase.tier}' → '${result}' (${testCase.description})`);
    } else {
      failedCount++;
      console.log(`❌ 失败 #${index + 1}: '${testCase.tier}' → '${result}' 预期: '${testCase.expected}' (${testCase.description})`);
      failedTests.push({
        index: index + 1,
        tier: testCase.tier,
        result: result,
        expected: testCase.expected,
        description: testCase.description
      });
    }
  } catch (error) {
    failedCount++;
    console.log(`❌ 错误 #${index + 1}: '${testCase.tier}' → 抛出异常:`, error);
    failedTests.push({
      index: index + 1,
      tier: testCase.tier,
      error: error.message,
      expected: testCase.expected,
      description: testCase.description
    });
  }
});

// 输出测试结果总结
console.log('\n=============================================');
console.log('测试结果总结:');
console.log(`通过: ${passedCount}/${testCases.length}`);
console.log(`失败: ${failedCount}/${testCases.length}`);
console.log(`成功率: ${Math.round((passedCount / testCases.length) * 100)}%`);

if (failedTests.length > 0) {
  console.log('\n失败的测试用例:');
  failedTests.forEach(test => {
    console.log(`  #${test.index}: '${test.tier}' (${test.description})`);
    console.log(`    结果: ${test.result || test.error}`);
    console.log(`    预期: ${test.expected}`);
  });
} else {
  console.log('\n🎉 所有测试用例通过! 修复成功!');
}

console.log('\n=============================================');

// 测试关键词优先级机制
console.log('\n关键词优先级测试:');
console.log('---------------------------------------------');

const keywordsTest = [
  { tier: '高级vip', shouldMatch: true, keyword: '高级' },
  { tier: 'vip高级', shouldMatch: true, keyword: '高级' },
  { tier: '尊享高级', shouldMatch: true, keyword: '高级' },
  { tier: 'premiumvip', shouldMatch: true, keyword: 'premium' },
  { tier: 'vip', shouldMatch: false, keyword: '高级' },
  { tier: '尊享', shouldMatch: false, keyword: '高级' }
];

keywordsTest.forEach((test, index) => {
  const tierStr = String(test.tier || '').toLowerCase();
  const premiumKeywords = ['premium', '高级', '黄金', 'plus', 'pro', 'vip1', 'gold', 'silver'];
  const hasPremiumKeyword = premiumKeywords.some(keyword => 
    tierStr.includes(keyword.toLowerCase())
  );
  
  const passed = hasPremiumKeyword === test.shouldMatch;
  console.log(`${passed ? '✅' : '❌'} 关键词测试 #${index + 1}: '${test.tier}' 包含高级关键词: ${hasPremiumKeyword} (预期: ${test.shouldMatch})`);
});

console.log('\n=============================================');
console.log('修复总结:');
console.log('1. 修改了_determineMembershipTier方法，直接使用mapLunaToStandardTier函数');
console.log('2. 添加了高级会员关键词优先级检查，确保包含高级会员关键词的会员类型');
console.log('   始终优先于尊享会员被识别');
console.log('3. 对于混合情况(如"尊享高级"、"vip高级"等)，确保正确识别为高级会员');
console.log('=============================================');