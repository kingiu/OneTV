// API会员数据诊断脚本
// 目的：检查API是否真的获取到了premium数据，以及完整的数据处理流程

console.log('\n=============================================');
console.log('API会员数据诊断工具');
console.log('=============================================\n');

// 模拟MembershipTier枚举
const MembershipTier = {
  VIP: 'vip',
  PREMIUM: 'premium',
  STANDARD: 'default'
};

// 模拟tierRules规则系统
const tierRules = [
  { regex: /^vip1$/i, tier: MembershipTier.PREMIUM, priority: 1 },
  { regex: /^vip$/i, tier: MembershipTier.VIP, priority: 2 },
  { regex: /^premium$/i, tier: MembershipTier.PREMIUM, priority: 3 },
  { regex: /^standard$|^default$/i, tier: MembershipTier.STANDARD, priority: 4 },
  { regex: /^1$/, tier: MembershipTier.PREMIUM, priority: 5 },
  { regex: /^2$/, tier: MembershipTier.VIP, priority: 6 },
  { regex: /^0$/, tier: MembershipTier.STANDARD, priority: 7 },
  { regex: /高级vip|会员1|vip\s*1/i, tier: MembershipTier.PREMIUM, priority: 8 },
  { regex: /^(高级|黄金|plus|pro)$/, tier: MembershipTier.PREMIUM, priority: 9 },
  { regex: /premium(会员)?|高级(会员)?|黄金(会员)?|plus(会员)?|pro(会员)?/i, tier: MembershipTier.PREMIUM, priority: 10 },
  { regex: /plus|pro/i, tier: MembershipTier.PREMIUM, priority: 11 },
  { regex: /gold|silver/i, tier: MembershipTier.PREMIUM, priority: 12 },
  { regex: /(tier|level)\s*1/i, tier: MembershipTier.PREMIUM, priority: 13 },
  { regex: /高级/i, tier: MembershipTier.PREMIUM, priority: 14 },
  { regex: /^(至尊|尊享)$/, tier: MembershipTier.VIP, priority: 15 },
  { regex: /svip|super\s*vip/i, tier: MembershipTier.VIP, priority: 16 },
  { regex: /至尊(会员)?|尊享(会员)?/i, tier: MembershipTier.VIP, priority: 17 },
  { regex: /尊享/i, tier: MembershipTier.VIP, priority: 18 },
  { regex: /^(普通|基础)$/, tier: MembershipTier.STANDARD, priority: 19 },
  { regex: /普通(会员)?|基础(会员)?/i, tier: MembershipTier.STANDARD, priority: 20 },
];

// 模拟mapLunaToStandardTier函数
function mapLunaToStandardTier(tierId) {
  console.log(`  mapLunaToStandardTier 调用: tierId = '${tierId}'`);
  
  // 确保是字符串类型
  const tierStr = String(tierId || '').toLowerCase();
  console.log(`  tier转换为字符串: '${tierStr}'`);
  
  // 使用规则匹配
  const matchedRules = tierRules
    .filter(rule => {
      const matches = rule.regex.test(tierStr);
      console.log(`  规则测试: /${rule.regex.source}/i → tier='${tierStr}' → ${matches ? '匹配' : '不匹配'}`);
      return matches;
    });
  
  if (matchedRules.length > 0) {
    console.log(`  找到 ${matchedRules.length} 个匹配规则`);
    // 按优先级排序并取第一个匹配
    const sortedRules = matchedRules.sort((a, b) => a.priority - b.priority);
    console.log(`  规则排序:`, sortedRules.map(r => `${r.tier} (优先级:${r.priority})`));
    const matchedRule = sortedRules[0];
    console.log(`  选择规则: tier=${matchedRule.tier}, 优先级=${matchedRule.priority}`);
    return matchedRule.tier;
  }
  
  console.log(`  没有找到匹配规则，检查是否为纯数字`);
  // 特殊处理：如果是纯数字，根据数字直接映射
  if (/^\d+$/.test(tierStr)) {
    const num = parseInt(tierStr, 10);
    console.log(`  纯数字处理: ${num} → ${num > 1 ? 'VIP' : num === 1 ? 'PREMIUM' : 'STANDARD'}`);
    if (num > 1) return MembershipTier.VIP;
    if (num === 1) return MembershipTier.PREMIUM;
    return MembershipTier.STANDARD;
  }
  
  console.log(`  默认返回 STANDARD`);
  // 默认返回普通会员
  return MembershipTier.STANDARD;
}

// 模拟_determineMembershipTier方法
function determineMembershipTier(tierIdentifier) {
  console.log(`\n1. determineMembershipTier 开始处理: tierIdentifier = '${tierIdentifier}'`);
  
  // 确保是字符串类型
  const tierStr = String(tierIdentifier || '').toLowerCase();
  console.log(`   tierIdentifier转换为小写: '${tierStr}'`);
  
  // 尝试直接匹配枚举值
  const isDirectMatch = [MembershipTier.VIP, MembershipTier.PREMIUM, MembershipTier.STANDARD].includes(tierStr);
  console.log(`   是否直接匹配枚举值: ${isDirectMatch ? '是' : '否'}`);
  
  if (isDirectMatch) {
    console.log(`   直接返回匹配的枚举值: '${tierStr}'`);
    return tierStr;
  }
  
  // 检查高级会员关键词
  const premiumKeywords = ['premium', '高级', '黄金', 'plus', 'pro', 'vip1', 'gold', 'silver'];
  const hasPremiumKeyword = premiumKeywords.some(keyword => {
    const includes = tierStr.includes(keyword.toLowerCase());
    console.log(`   关键词检查: '${keyword}' → ${includes ? '包含' : '不包含'}`);
    return includes;
  });
  
  console.log(`   包含高级会员关键词: ${hasPremiumKeyword ? '是' : '否'}`);
  
  // 使用mapLunaToStandardTier函数
  console.log(`\n2. 调用 mapLunaToStandardTier 函数...`);
  const mappedTier = mapLunaToStandardTier(tierIdentifier);
  
  console.log(`\n3. 关键词优先级检查`);
  console.log(`   mappedTier = '${mappedTier}'`);
  console.log(`   hasPremiumKeyword = ${hasPremiumKeyword}`);
  
  // 特殊处理：确保高级会员关键词总是优先于尊享会员关键词
  if (hasPremiumKeyword && mappedTier === MembershipTier.VIP) {
    console.log(`   ⚠️  修正: 检测到高级会员关键词但映射为尊享会员，强制修正为高级会员`);
    return MembershipTier.PREMIUM;
  }
  
  console.log(`   最终返回: '${mappedTier}'`);
  return mappedTier;
}

// 模拟API响应数据测试用例
const testCases = [
  // 测试用例1: 明确的高级会员数据
  {
    name: "测试用例1: 明确的高级会员数据",
    apiResponse: {
      success: true,
      data: {
        membership: {
          userName: "test_user",
          tierId: "premium",
          status: "active",
          endDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString()
        }
      }
    }
  },
  
  // 测试用例2: 中文高级会员
  {
    name: "测试用例2: 中文高级会员",
    apiResponse: {
      success: true,
      data: {
        membership: {
          userName: "test_user",
          tierId: "高级会员",
          status: "active",
          endDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString()
        }
      }
    }
  },
  
  // 测试用例3: 数字1会员
  {
    name: "测试用例3: 数字1会员",
    apiResponse: {
      success: true,
      data: {
        membership: {
          userName: "test_user",
          tierId: "1",
          status: "active",
          endDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString()
        }
      }
    }
  },
  
  // 测试用例4: 尊享会员
  {
    name: "测试用例4: 尊享会员",
    apiResponse: {
      success: true,
      data: {
        membership: {
          userName: "test_user",
          tierId: "vip",
          status: "active",
          endDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString()
        }
      }
    }
  },
  
  // 测试用例5: 混合情况 - 高级尊享
  {
    name: "测试用例5: 混合情况 - 高级尊享",
    apiResponse: {
      success: true,
      data: {
        membership: {
          userName: "test_user",
          tierId: "高级尊享",
          status: "active",
          endDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString()
        }
      }
    }
  },
  
  // 测试用例6: 可能的问题情况 - API返回非预期的值
  {
    name: "测试用例6: API返回非预期值",
    apiResponse: {
      success: true,
      data: {
        membership: {
          userName: "test_user",
          tierId: "vip高级", // 混合关键词
          status: "active",
          endDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString()
        }
      }
    }
  },
  
  // 测试用例7: API可能没有返回premium的情况
  {
    name: "测试用例7: API返回tier而不是tierId",
    apiResponse: {
      success: true,
      data: {
        membership: {
          userName: "test_user",
          tier: "premium", // 注意这里使用的是tier而不是tierId
          status: "active",
          endDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString()
        }
      }
    }
  },
  
  // 测试用例8: 空tierId
  {
    name: "测试用例8: 空tierId",
    apiResponse: {
      success: true,
      data: {
        membership: {
          userName: "test_user",
          tierId: "",
          status: "active",
          endDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString()
        }
      }
    }
  },
  
  // 测试用例9: tierId为null
  {
    name: "测试用例9: tierId为null",
    apiResponse: {
      success: true,
      data: {
        membership: {
          userName: "test_user",
          tierId: null,
          status: "active",
          endDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString()
        }
      }
    }
  },
  
  // 测试用例10: 不同的数据结构
  {
    name: "测试用例10: 不同的数据结构",
    apiResponse: {
      userName: "test_user",
      tier: "premium", // 直接在顶层
      status: "active",
      endDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString()
    }
  }
];

// 模拟映射函数
function simulateApiProcessing(apiResponse) {
  console.log('\n=============================================');
  console.log('模拟API数据处理流程');
  console.log('=============================================\n');
  
  console.log('原始API响应数据:', JSON.stringify(apiResponse, null, 2));
  
  // 提取tierId或tier
  let tierId = null;
  
  // 检查常见的数据结构
  if (apiResponse.success && apiResponse.data && apiResponse.data.membership) {
    console.log('\n检测到标准响应格式: {success: true, data: {membership: {...}}}');
    const membership = apiResponse.data.membership;
    tierId = membership.tierId || membership.tier || '';
    console.log(`从 membership 中提取 tierId/tier: '${tierId}'`);
  } 
  // 检查直接的会员数据格式
  else if (apiResponse.tierId) {
    console.log('\n检测到直接会员数据格式');
    tierId = apiResponse.tierId || apiResponse.tier || '';
    console.log(`从顶层提取 tierId/tier: '${tierId}'`);
  }
  // 检查其他可能的格式
  else if (apiResponse.tier) {
    console.log('\n检测到tier在顶层的数据格式');
    tierId = apiResponse.tier;
    console.log(`从顶层提取 tier: '${tierId}'`);
  } else {
    console.log('\n无法识别的数据格式');
    tierId = '';
  }
  
  console.log(`\n最终用于映射的tier标识符: '${tierId}'`);
  
  // 调用会员等级映射函数
  const finalTier = determineMembershipTier(tierId);
  
  console.log('\n=============================================');
  console.log('处理结果总结:');
  console.log(`原始API tier标识符: '${tierId}'`);
  console.log(`最终映射会员等级: '${finalTier}'`);
  
  if (finalTier === MembershipTier.PREMIUM) {
    console.log('✅ 成功识别为高级会员');
  } else if (finalTier === MembershipTier.VIP) {
    console.log('🎖️  识别为尊享会员');
  } else {
    console.log('📋 识别为普通会员');
  }
  
  return finalTier;
}

// 运行所有测试用例
console.log('开始运行所有测试用例...\n');

testCases.forEach((testCase, index) => {
  console.log('\n=============================================');
  console.log(`测试用例 ${index + 1}/${testCases.length}: ${testCase.name}`);
  console.log('=============================================');
  
  try {
    simulateApiProcessing(testCase.apiResponse);
  } catch (error) {
    console.error('❌ 测试用例执行出错:', error.message);
    console.error(error.stack);
  }
});

// 创建一个交互式的诊断工具，允许用户输入任意的tier值进行测试
function interactiveDiagnostics() {
  console.log('\n=============================================');
  console.log('交互式会员等级诊断工具');
  console.log('=============================================');
  console.log('此工具将帮助诊断任意tier值的映射过程');
  console.log('\n示例输入:');
  console.log('- "premium"');
  console.log('- "高级会员"');
  console.log('- "1"');
  console.log('- "vip"');
  console.log('- "高级尊享"');
  console.log('- "" (空字符串)');
  console.log('- null');
  console.log('\n分析要点:');
  console.log('1. API是否返回了正确的tier标识符');
  console.log('2. tier标识符是否包含premium相关关键词');
  console.log('3. 规则匹配是否按预期工作');
  console.log('4. 关键词优先级检查是否生效');
  console.log('=============================================\n');
  
  // 测试几个关键值
  const criticalTestValues = ['premium', '高级会员', '1', 'vip', '高级尊享', 'vip高级', '', null, undefined];
  
  criticalTestValues.forEach(value => {
    console.log(`\n🔍 诊断特定值: '${value}'`);
    determineMembershipTier(value);
  });
}

// 运行交互式诊断
interactiveDiagnostics();

console.log('\n=============================================');
console.log('诊断完成!');
console.log('请检查以下几点:');
console.log('1. API返回的原始数据中tierId/tier字段的值');
console.log('2. 该值是否包含premium相关关键词');
console.log('3. 映射过程中是否有规则被匹配');
console.log('4. 关键词优先级检查是否按预期工作');
console.log('=============================================');