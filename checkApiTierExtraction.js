// API会员等级字段提取检查脚本
// 目的：验证API数据处理过程中tierId/tier字段是否被正确提取

console.log('\n=============================================');
console.log('API会员等级字段提取检查');
console.log('=============================================\n');

// 模拟可能的API响应数据格式
const possibleApiResponses = [
  // 情况1: 标准格式，包含tierId
  {
    name: "情况1: 标准格式，包含tierId",
    response: {
      success: true,
      data: {
        membership: {
          userName: "user1",
          tierId: "premium",
          status: "active"
        }
      }
    }
  },
  
  // 情况2: 标准格式，包含tier而非tierId
  {
    name: "情况2: 标准格式，包含tier而非tierId",
    response: {
      success: true,
      data: {
        membership: {
          userName: "user2",
          tier: "premium",
          status: "active"
        }
      }
    }
  },
  
  // 情况3: 直接会员数据格式，包含tierId
  {
    name: "情况3: 直接会员数据格式，包含tierId",
    response: {
      userName: "user3",
      tierId: "高级会员",
      status: "active"
    }
  },
  
  // 情况4: 直接会员数据格式，包含tier
  {
    name: "情况4: 直接会员数据格式，包含tier",
    response: {
      userName: "user4",
      tier: "高级会员",
      status: "active"
    }
  },
  
  // 情况5: 包含membership字段但结构不同
  {
    name: "情况5: 包含membership字段但结构不同",
    response: {
      membership: {
        level: "premium", // 注意这里用的是level而不是tierId/tier
        user: "user5"
      }
    }
  },
  
  // 情况6: 空值情况
  {
    name: "情况6: 空值情况",
    response: {
      success: true,
      data: {
        membership: {
          userName: "user6",
          tierId: null,
          status: "active"
        }
      }
    }
  },
  
  // 情况7: 未定义tierId/tier
  {
    name: "情况7: 未定义tierId/tier",
    response: {
      success: true,
      data: {
        membership: {
          userName: "user7",
          status: "active"
          // 没有tierId或tier字段
        }
      }
    }
  },
  
  // 情况8: 高级会员但是使用了数字
  {
    name: "情况8: 高级会员但是使用了数字",
    response: {
      success: true,
      data: {
        membership: {
          userName: "user8",
          tierId: "1",
          status: "active"
        }
      }
    }
  },
  
  // 情况9: 混合关键词情况
  {
    name: "情况9: 混合关键词情况",
    response: {
      success: true,
      data: {
        membership: {
          userName: "user9",
          tierId: "vip高级",
          status: "active"
        }
      }
    }
  },
  
  // 情况10: 自定义字段名
  {
    name: "情况10: 自定义字段名",
    response: {
      success: true,
      data: {
        membership: {
          userName: "user10",
          memberLevel: "premium", // 自定义字段名
          status: "active"
        }
      }
    }
  }
];

// 模拟API中提取tier的逻辑
function extractTierFromApiResponse(response) {
  console.log('原始响应数据结构:', JSON.stringify(response, null, 2));
  
  // 情况1: 标准格式 {success: true, data: {membership: {...}}}
  if (response.success && response.data && response.data.membership) {
    console.log('✓ 检测到标准响应格式');
    const membership = response.data.membership;
    
    // 提取tierId或tier
    if (membership.tierId !== undefined) {
      console.log(`✓ 从 membership.tierId 提取: '${membership.tierId}'`);
      return membership.tierId;
    } else if (membership.tier !== undefined) {
      console.log(`✓ 从 membership.tier 提取: '${membership.tier}'`);
      return membership.tier;
    } else {
      // 检查是否有其他可能的等级字段
      const possibleFields = ['level', 'memberLevel', 'userLevel', 'vipLevel'];
      for (const field of possibleFields) {
        if (membership[field] !== undefined) {
          console.log(`⚠️  从 membership.${field} 提取: '${membership[field]}'`);
          console.log(`   警告: 这是一个非标准字段名!`);
          return membership[field];
        }
      }
      console.log('❌ 在标准格式中未找到tierId/tier字段');
      return null;
    }
  }
  
  // 情况2: 直接会员数据格式
  if (response.tierId !== undefined) {
    console.log('✓ 检测到直接会员数据格式，从 tierId 提取');
    return response.tierId;
  } else if (response.tier !== undefined) {
    console.log('✓ 检测到直接会员数据格式，从 tier 提取');
    return response.tier;
  }
  
  // 情况3: 检查是否有membership字段在顶层
  if (response.membership) {
    console.log('⚠️  检测到顶层membership字段');
    const membership = response.membership;
    if (membership.tierId !== undefined) {
      console.log(`✓ 从 membership.tierId 提取: '${membership.tierId}'`);
      return membership.tierId;
    } else if (membership.tier !== undefined) {
      console.log(`✓ 从 membership.tier 提取: '${membership.tier}'`);
      return membership.tier;
    }
  }
  
  console.log('❌ 无法从响应中提取tier信息');
  console.log('   可能的原因:');
  console.log('   1. API返回的数据格式不符合预期');
  console.log('   2. tierId/tier字段名可能不是标准名称');
  console.log('   3. 会员等级信息可能存储在其他字段中');
  
  // 返回所有可能的字段，帮助诊断
  console.log('\n📊 响应中的所有字段:');
  function logFields(obj, prefix = '') {
    Object.keys(obj).forEach(key => {
      const value = obj[key];
      const path = prefix ? `${prefix}.${key}` : key;
      console.log(`   ${path}: ${typeof value}${typeof value === 'object' ? ' (对象)' : ` = '${value}'`}`);
      if (typeof value === 'object' && value !== null) {
        logFields(value, path);
      }
    });
  }
  logFields(response);
  
  return null;
}

// 运行所有检查
console.log('开始检查各种API响应格式...\n');

possibleApiResponses.forEach((testCase, index) => {
  console.log('\n=============================================');
  console.log(`检查 ${index + 1}/${possibleApiResponses.length}: ${testCase.name}`);
  console.log('=============================================');
  
  try {
    const extractedTier = extractTierFromApiResponse(testCase.response);
    
    console.log('\n🔍 提取结果:');
    if (extractedTier !== null) {
      console.log(`   ✓ 成功提取: '${extractedTier}'`);
      
      // 检查提取的tier是否可能是高级会员
      const isPotentialPremium = checkIfPotentialPremium(extractedTier);
      console.log(`   📋 是否可能是高级会员: ${isPotentialPremium ? '是' : '否'}`);
    } else {
      console.log('   ❌ 提取失败');
    }
  } catch (error) {
    console.error('❌ 检查过程中出错:', error.message);
  }
});

// 辅助函数: 检查提取的tier是否可能是高级会员
function checkIfPotentialPremium(tier) {
  if (!tier) return false;
  
  const tierStr = String(tier).toLowerCase();
  const premiumIndicators = [
    'premium', '高级', '黄金', '1', 'vip1', 
    'plus', 'pro', 'gold', 'silver'
  ];
  
  return premiumIndicators.some(indicator => tierStr.includes(indicator));
}

// 特别检查：API可能没有返回premium数据的情况分析
console.log('\n=============================================');
console.log('特别分析：API可能没有返回premium数据的原因');
console.log('=============================================');

const potentialIssues = [
  {
    issue: "1. API返回的字段名不是标准的tierId/tier",
    example: "可能使用了memberLevel、userLevel、level等自定义字段名",
    solution: "修改代码以支持更多可能的字段名"
  },
  {
    issue: "2. API返回的数据结构与预期不符",
    example: "数据可能嵌套在不同的层级，或者格式完全不同",
    solution: "增强代码的格式检测和适配能力"
  },
  {
    issue: "3. tierId/tier值为空或未定义",
    example: "API返回了null、空字符串或完全没有这个字段",
    solution: "添加更健壮的空值处理逻辑"
  },
  {
    issue: "4. 高级会员使用了非标准的值表示",
    example: "可能使用了数字1、自定义代码或其他标识符",
    solution: "扩展识别规则以覆盖更多可能的值"
  },
  {
    issue: "5. API权限或认证问题",
    example: "API可能因为认证问题没有返回完整的会员信息",
    solution: "检查API调用的认证机制和权限设置"
  }
];

potentialIssues.forEach((item, index) => {
  console.log(`\n${item.issue}`);
  console.log(`   示例: ${item.example}`);
  console.log(`   解决方案: ${item.solution}`);
});

// 修复建议
console.log('\n=============================================');
console.log('代码修复建议');
console.log('=============================================');

console.log(`\n建议修改 _mapLunaTVMembership 方法，增强tier字段提取的健壮性:`);
console.log(`\n1. 扩展提取逻辑以支持更多可能的字段名:`);
console.log(`   - tierId, tier, level, memberLevel, userLevel, vipLevel`);
console.log(`\n2. 添加日志记录以便诊断:`);
console.log(`   - 记录提取到的原始tier值`);
console.log(`   - 记录最终映射的会员等级`);
console.log(`\n3. 增加对特殊情况的处理:`);
console.log(`   - 空值、undefined、null的安全处理`);
console.log(`   - 非标准数据结构的适配`);

console.log('\n=============================================');
console.log('诊断完成!');
console.log('请根据检查结果确定API是否真的返回了premium数据，以及是否需要修改');
console.log('代码以正确提取和处理会员等级信息。');
console.log('=============================================');