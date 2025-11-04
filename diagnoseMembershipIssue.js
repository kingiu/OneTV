// 诊断会员等级识别问题的脚本
// 重点测试高级会员被错误识别为尊享会员的情况

// 模拟MembershipTier枚举
const MembershipTier = {
  VIP: 'vip',
  PREMIUM: 'premium',
  STANDARD: 'default'
};

// 模拟会员等级映射规则
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
  console.log(`mapLunaToStandardTier: 输入tierId: '${tierId}' -> 转换为: '${tierStr}'`);
  
  // 使用增强的规则匹配
  const matchedRules = tierRules
    .filter(rule => {
      const matches = rule.regex.test(tierStr);
      console.log(`  测试规则: ${rule.regex}, 优先级: ${rule.priority}, 匹配结果: ${matches}`);
      return matches;
    });
  
  console.log(`mapLunaToStandardTier: 匹配到的规则数量: ${matchedRules.length}`);
  
  if (matchedRules.length > 0) {
    // 按优先级排序并取第一个匹配
    const sortedRules = matchedRules.sort((a, b) => a.priority - b.priority);
    console.log(`mapLunaToStandardTier: 规则排序结果:`, sortedRules.map(r => ({tier: r.tier, priority: r.priority, regex: r.regex.toString()})));
    
    const matchedRule = sortedRules[0];
    console.log(`mapLunaToStandardTier: 最终匹配规则: tier=${matchedRule.tier}, priority=${matchedRule.priority}, regex=${matchedRule.regex}`);
    return matchedRule.tier;
  }
  
  // 特殊处理：如果是纯数字，根据数字直接映射
  if (/^\d+$/.test(tierStr)) {
    const num = parseInt(tierStr, 10);
    console.log(`mapLunaToStandardTier: 检测到数字tierId: '${tierId}' = ${num}`);
    if (num > 1) return MembershipTier.VIP;
    if (num === 1) return MembershipTier.PREMIUM;
    return MembershipTier.STANDARD;
  }
  
  console.log(`mapLunaToStandardTier: 无匹配规则，返回默认普通会员`);
  return MembershipTier.STANDARD;
}

// 模拟_determineMembershipTier函数（简化版本，主要用于测试规则匹配）
function determineMembershipTier(tierIdentifier) {
  // 确保是字符串类型
  const tierStr = String(tierIdentifier || '').toLowerCase();
  console.log(`\ndetermineMembershipTier: 输入tierIdentifier: '${tierIdentifier}' -> 转换为: '${tierStr}'`);
  
  // 尝试直接匹配枚举值
  if ([MembershipTier.VIP, MembershipTier.PREMIUM, MembershipTier.STANDARD].includes(tierStr)) {
    console.log(`determineMembershipTier: 直接匹配枚举值`, tierStr);
    return tierStr;
  }
  
  // 使用增强规则匹配
  const matchedRules = tierRules
    .filter(rule => {
      const matches = rule.regex.test(tierStr);
      console.log(`  测试规则: ${rule.regex}, 优先级: ${rule.priority}, 匹配结果: ${matches}`);
      return matches;
    });
  
  console.log(`determineMembershipTier: 匹配到的规则数量: ${matchedRules.length}`);
  
  if (matchedRules.length > 0) {
    // 按优先级排序并取第一个匹配
    const sortedRules = matchedRules.sort((a, b) => a.priority - b.priority);
    console.log(`determineMembershipTier: 规则排序结果:`, sortedRules.map(r => ({tier: r.tier, priority: r.priority, regex: r.regex.toString()})));
    
    const matchedRule = sortedRules[0];
    console.log(`determineMembershipTier: 最终匹配规则: tier=${matchedRule.tier}, priority=${matchedRule.priority}, regex=${matchedRule.regex}`);
    return matchedRule.tier;
  }
  
  // 回退策略：检查是否包含数字
  if (/\d+/.test(tierStr)) {
    const number = parseInt(tierStr.match(/\d+/)?.[0] || '0');
    if (number === 1) {
      console.log(`determineMembershipTier: 回退策略 - 数字1映射为高级会员`, { tierIdentifier, number });
      return MembershipTier.PREMIUM;
    } else if (number === 2) {
      console.log(`determineMembershipTier: 回退策略 - 数字2映射为尊享会员`, { tierIdentifier, number });
      return MembershipTier.VIP;
    }
  }
  
  // 默认为普通会员
  console.log(`determineMembershipTier: 无匹配规则，使用默认值普通会员`, { tierIdentifier, tierStr });
  return MembershipTier.STANDARD;
}

// 测试用例 - 重点测试高级会员被错误识别为尊享会员的情况
const testCases = [
  // 测试高级会员类型
  { tier: 'premium', expected: MembershipTier.PREMIUM },
  { tier: '高级', expected: MembershipTier.PREMIUM },
  { tier: '高级会员', expected: MembershipTier.PREMIUM },
  { tier: '黄金', expected: MembershipTier.PREMIUM },
  { tier: '黄金会员', expected: MembershipTier.PREMIUM },
  { tier: 'vip1', expected: MembershipTier.PREMIUM },
  { tier: '高级vip', expected: MembershipTier.PREMIUM },
  { tier: '1', expected: MembershipTier.PREMIUM },
  
  // 测试尊享会员类型
  { tier: 'vip', expected: MembershipTier.VIP },
  { tier: '尊享', expected: MembershipTier.VIP },
  { tier: '尊享会员', expected: MembershipTier.VIP },
  { tier: 'svip', expected: MembershipTier.VIP },
  { tier: '2', expected: MembershipTier.VIP },
  
  // 测试可能导致混淆的混合情况
  { tier: '高级尊享', expected: MembershipTier.PREMIUM }, // 应该优先识别为高级
  { tier: '尊享高级', expected: MembershipTier.PREMIUM }, // 应该优先识别为高级
  { tier: 'vip高级', expected: MembershipTier.PREMIUM }, // 应该优先识别为高级
  { tier: 'vip_premium', expected: MembershipTier.PREMIUM }, // 应该优先识别为高级
  { tier: '高级会员vip', expected: MembershipTier.PREMIUM }, // 应该优先识别为高级
  
  // 测试特殊情况
  { tier: '', expected: MembershipTier.STANDARD },
  { tier: null, expected: MembershipTier.STANDARD },
  { tier: undefined, expected: MembershipTier.STANDARD },
];

// 运行诊断测试
console.log('\n=============================================');
console.log('开始诊断会员等级识别问题');
console.log('=============================================\n');

let passedCount = 0;
let failedCount = 0;

console.log('\n1. 测试determineMembershipTier函数:');
console.log('---------------------------------------------');

testCases.forEach((testCase, index) => {
  console.log(`\n测试用例 #${index + 1}: tier='${testCase.tier}'`);
  console.log('---------------------------------------------');
  
  try {
    const result = determineMembershipTier(testCase.tier);
    const passed = result === testCase.expected;
    
    if (passed) {
      passedCount++;
      console.log(`✅ 通过: '${testCase.tier}' -> '${result}' (预期: '${testCase.expected}')`);
    } else {
      failedCount++;
      console.log(`❌ 失败: '${testCase.tier}' -> '${result}' (预期: '${testCase.expected}')`);
    }
  } catch (error) {
    failedCount++;
    console.log(`❌ 错误: '${testCase.tier}' -> 抛出异常:`, error);
  }
});

console.log('\n2. 测试mapLunaToStandardTier函数:');
console.log('---------------------------------------------');

let mapPassedCount = 0;
let mapFailedCount = 0;

testCases.forEach((testCase, index) => {
  console.log(`\n测试用例 #${index + 1}: tier='${testCase.tier}'`);
  console.log('---------------------------------------------');
  
  try {
    const result = mapLunaToStandardTier(testCase.tier);
    const passed = result === testCase.expected;
    
    if (passed) {
      mapPassedCount++;
      console.log(`✅ 通过: '${testCase.tier}' -> '${result}' (预期: '${testCase.expected}')`);
    } else {
      mapFailedCount++;
      console.log(`❌ 失败: '${testCase.tier}' -> '${result}' (预期: '${testCase.expected}')`);
    }
  } catch (error) {
    mapFailedCount++;
    console.log(`❌ 错误: '${testCase.tier}' -> 抛出异常:`, error);
  }
});

console.log('\n=============================================');
console.log('诊断结果总结:');
console.log(`determineMembershipTier: 通过 ${passedCount}/${testCases.length}, 失败 ${failedCount}/${testCases.length}`);
console.log(`mapLunaToStandardTier: 通过 ${mapPassedCount}/${testCases.length}, 失败 ${mapFailedCount}/${testCases.length}`);
console.log('=============================================\n');

// 输出详细规则分析
console.log('\n=============================================');
console.log('详细规则分析:');
console.log('=============================================');

console.log('\n当前规则优先级排序:');
tierRules
  .sort((a, b) => a.priority - b.priority)
  .forEach((rule, index) => {
    console.log(`${index + 1}. 优先级: ${rule.priority}, 等级: ${rule.tier}, 规则: ${rule.regex}`);
  });

// 测试常见的问题模式
console.log('\n=============================================');
console.log('问题模式测试:');
console.log('=============================================');

// 测试可能导致问题的高级会员类型
const problematicTypes = ['premium', '高级', '高级会员', '黄金', 'vip1'];
console.log('\n测试高级会员类型:');

problematicTypes.forEach(type => {
  console.log(`\n测试类型: '${type}'`);
  
  // 找出所有可能匹配的规则
  const allMatchingRules = tierRules.filter(rule => rule.regex.test(String(type).toLowerCase()));
  console.log(`匹配的所有规则 (${allMatchingRules.length}个):`);
  
  allMatchingRules.forEach(rule => {
    console.log(`  - 优先级: ${rule.priority}, 等级: ${rule.tier}, 规则: ${rule.regex}`);
  });
  
  // 按优先级排序并查看最终结果
  const sortedRules = [...allMatchingRules].sort((a, b) => a.priority - b.priority);
  if (sortedRules.length > 0) {
    console.log(`\n最终匹配规则:`);
    console.log(`  - 优先级: ${sortedRules[0].priority}, 等级: ${sortedRules[0].tier}, 规则: ${sortedRules[0].regex}`);
    console.log(`  最终结果: ${sortedRules[0].tier}`);
  } else {
    console.log('  无匹配规则，使用默认值');
  }
});

console.log('\n诊断完成!');