// 测试会员等级映射逻辑
console.log('===== 测试会员等级映射逻辑 =====');

// 模拟MembershipTier枚举
const MembershipTier = {
  VIP: 'vip',        // 尊享会员
  PREMIUM: 'premium', // 高级会员
  STANDARD: 'default' // 普通会员
};

// 修复后的会员等级判断逻辑
function determineMembershipTier(tierIdentifier, useFallback = false) {
  // 确保是字符串类型
  const tierStr = String(tierIdentifier || '').toLowerCase();
  console.log(`检查tier值: '${tierIdentifier}' -> '${tierStr}'`);
  
  // 定义映射规则，优先级从高到低
  const tierRules = {
    'premium': [
      { regex: /^(premium|高级|黄金)$/, tier: MembershipTier.PREMIUM },
      { regex: /(premium|高级|黄金)/i, tier: MembershipTier.PREMIUM }
    ],
    'vip': [
      { regex: /^(vip|至尊|尊享)$/, tier: MembershipTier.VIP },
      { regex: /(vip|至尊|尊享)/i, tier: MembershipTier.VIP }
    ],
    'standard': [
      { regex: /^(standard|default|普通|基础)$/, tier: MembershipTier.STANDARD },
      { regex: /(standard|default|普通|基础)/i, tier: MembershipTier.STANDARD }
    ]
  };
  
  // 调整匹配顺序：先检查premium，再检查VIP
  if (tierRules.premium.some(rule => rule.regex.test(tierStr))) {
    console.log(`  -> 映射为高级会员`);
    return MembershipTier.PREMIUM;
  }
  
  if (tierRules.vip.some(rule => rule.regex.test(tierStr))) {
    console.log(`  -> 映射为尊享会员`);
    return MembershipTier.VIP;
  }
  
  if (tierRules.standard.some(rule => rule.regex.test(tierStr))) {
    console.log(`  -> 映射为普通会员`);
    return MembershipTier.STANDARD;
  }
  
  // 如果使用回退策略，尝试使用更多的启发式规则
  if (useFallback) {
    // 检查是否包含数字（可能表示不同的会员级别）
    if (/\d+/.test(tierStr)) {
      const number = parseInt(tierStr.match(/\d+/)?.[0] || '0');
      if (number > 2) {
        console.log(`  -> 回退策略 - 基于数字映射为尊享会员`);
        return MembershipTier.VIP;
      } else if (number === 2) {
        console.log(`  -> 回退策略 - 基于数字映射为高级会员`);
        return MembershipTier.PREMIUM;
      }
    }
    
    // 检查是否包含特殊关键词
    if (/plus|pro|尊享|svip|super/i.test(tierStr)) {
      console.log(`  -> 回退策略 - 特殊关键词映射为尊享会员`);
      return MembershipTier.VIP;
    }
    
    if (/regular|basic/i.test(tierStr)) {
      console.log(`  -> 回退策略 - 基本关键词映射为普通会员`);
      return MembershipTier.STANDARD;
    }
  }
  
  // 默认为普通会员
  console.log(`  -> 使用默认值普通会员`);
  return MembershipTier.STANDARD;
}

// 测试用例
const testCases = [
  { tier: 'premium', expected: MembershipTier.PREMIUM, description: '精确匹配premium' },
  { tier: '高级', expected: MembershipTier.PREMIUM, description: '精确匹配高级' },
  { tier: '黄金', expected: MembershipTier.PREMIUM, description: '精确匹配黄金' },
  { tier: '高级会员', expected: MembershipTier.PREMIUM, description: '包含高级' },
  { tier: 'premium会员', expected: MembershipTier.PREMIUM, description: '包含premium' },
  { tier: 'vip', expected: MembershipTier.VIP, description: '精确匹配vip' },
  { tier: '尊享', expected: MembershipTier.VIP, description: '精确匹配尊享' },
  { tier: '至尊', expected: MembershipTier.VIP, description: '精确匹配至尊' },
  { tier: '尊享会员', expected: MembershipTier.VIP, description: '包含尊享' },
  { tier: 'default', expected: MembershipTier.STANDARD, description: '精确匹配default' },
  { tier: '普通', expected: MembershipTier.STANDARD, description: '精确匹配普通' },
  { tier: '基础', expected: MembershipTier.STANDARD, description: '精确匹配基础' },
  { tier: 'premiumvip', expected: MembershipTier.PREMIUM, description: '同时包含premium和vip（应优先匹配premium）' },
  { tier: '高级vip', expected: MembershipTier.PREMIUM, description: '同时包含高级和vip（应优先匹配高级）' }
];

// 运行测试
let passedTests = 0;
const totalTests = testCases.length;

console.log('\n开始运行测试...');

testCases.forEach((testCase, index) => {
  console.log(`\n测试 ${index + 1}/${totalTests}: ${testCase.description} (tier='${testCase.tier}')`);
  
  const result = determineMembershipTier(testCase.tier);
  const passed = result === testCase.expected;
  
  console.log(`  预期: '${testCase.expected}'`);
  console.log(`  实际: '${result}'`);
  console.log(`  结果: ${passed ? '✓ 通过' : '✗ 失败'}`);
  
  if (passed) {
    passedTests++;
  }
});

// 输出测试结果摘要
console.log('\n===== 测试结果摘要 =====');
console.log(`通过测试: ${passedTests}/${totalTests}`);
console.log(`通过率: ${(passedTests / totalTests * 100).toFixed(0)}%`);

if (passedTests === totalTests) {
  console.log('✓ 所有测试通过！会员等级映射逻辑已修复。');
  console.log('\n修复说明:');
  console.log('1. 移除了VIP规则中错误包含的premium、高级、黄金等关键词');
  console.log('2. 调整了匹配顺序，确保premium相关规则优先于VIP规则执行');
  console.log('3. 现在高级会员能够被正确识别，不会被错误地映射为尊享会员');
} else {
  console.log('✗ 部分测试失败，请检查会员等级映射逻辑。');
}
