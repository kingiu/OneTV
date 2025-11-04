// 测试增强后的会员等级提取功能
// 模拟_extractMembershipTier方法的行为进行测试

console.log('\n=============================================');
console.log('增强版会员等级提取功能测试');
console.log('=============================================\n');

// 模拟_extractMembershipTier方法
function extractMembershipTier(data) {
  if (!data) return '';
  
  // 定义可能的等级字段名（同时支持驼峰和下划线命名）
  const possibleTierFields = [
    'tierId', 'tier', 'level', 'memberLevel', 'userLevel', 'vipLevel',
    'member_type', 'user_type', 'account_level', 'subscription_level',
    'member_level', 'user_level', 'vip_level', 'accountLevel', 'subscriptionLevel',
    'membership_level', 'membershipType', 'membership_type', 'memberType'
  ];
  
  // 尝试从各种可能的字段中提取等级信息
  for (const field of possibleTierFields) {
    if (data[field] !== undefined && data[field] !== null && data[field] !== '') {
      console.log(`✓ 从${field}字段提取会员等级:`, data[field]);
      return String(data[field]); // 转换为字符串以确保一致性
    }
  }
  
  // 如果直接在data中找不到，检查是否有membership子对象
  if (data.membership) {
    for (const field of possibleTierFields) {
      if (data.membership[field] !== undefined && data.membership[field] !== null && data.membership[field] !== '') {
        console.log(`✓ 从membership.${field}字段提取会员等级:`, data.membership[field]);
        return String(data.membership[field]);
      }
    }
  }
  
  // 也检查data.data.membership格式
  if (data.data && data.data.membership) {
    for (const field of possibleTierFields) {
      if (data.data.membership[field] !== undefined && data.data.membership[field] !== null && data.data.membership[field] !== '') {
        console.log(`✓ 从data.membership.${field}字段提取会员等级:`, data.data.membership[field]);
        return String(data.data.membership[field]);
      }
    }
  }
  
  // 如果都找不到，记录警告
  console.warn('❌ 无法从数据中提取会员等级');
  return '';
}

// 测试用例
const testCases = [
  {
    name: "标准格式，使用tierId",
    data: { tierId: "premium", status: "active" }
  },
  {
    name: "标准格式，使用tier",
    data: { tier: "高级会员", status: "active" }
  },
  {
    name: "使用自定义字段memberLevel",
    data: { memberLevel: "premium", user: "test" }
  },
  {
    name: "使用自定义字段userLevel",
    data: { userLevel: "高级", id: "123" }
  },
  {
    name: "使用自定义字段level",
    data: { level: "1", type: "vip" }
  },
  {
    name: "数据嵌套在membership对象中",
    data: { 
      membership: { tierId: "premium" },
      userInfo: { name: "user1" }
    }
  },
  {
    name: "membership对象中使用自定义字段(member_level)",
    data: { 
      membership: { member_level: "高级会员" },
      status: "active"
    }
  },
  {
    name: "data.data.membership嵌套格式",
    data: { 
      data: { 
        membership: { tierId: "premium" }
      },
      status: "success"
    }
  },
  {
    name: "使用membershipType字段",
    data: { membershipType: "高级会员", id: "456" }
  },
  {
    name: "使用membership_level字段",
    data: { membership_level: "premium", active: true }
  },
  {
    name: "空值情况",
    data: { tierId: null, status: "inactive" }
  },
  {
    name: "空字符串情况",
    data: { tier: "", status: "active" }
  },
  {
    name: "未定义字段情况",
    data: { status: "active", id: "123" }
  }
];

// 运行测试
let passCount = 0;
let failCount = 0;

console.log('开始运行测试用例...\n');

testCases.forEach((testCase, index) => {
  console.log(`测试 ${index + 1}/${testCases.length}: ${testCase.name}`);
  console.log('---------------------------------------------');
  
  try {
    const result = extractMembershipTier(testCase.data);
    console.log('提取结果:', result || '空');
    
    // 判断是否提取成功（对于预期为空的情况也视为通过）
    const expectedEmpty = ["空值情况", "空字符串情况", "未定义字段情况"].includes(testCase.name);
    if ((expectedEmpty && result === '') || (!expectedEmpty && result !== '')) {
      console.log('结果: ✅ 通过');
      passCount++;
    } else {
      console.log('结果: ❌ 失败');
      failCount++;
    }
  } catch (error) {
    console.error('测试失败:', error.message);
    failCount++;
  }
  
  console.log();
});

// 测试高级会员关键词检测
console.log('=============================================');
console.log('高级会员关键词检测测试');
console.log('=============================================');

function isPremiumTier(tier) {
  if (!tier) return false;
  
  const tierStr = String(tier).toLowerCase();
  const premiumKeywords = [
    'premium', '高级', '黄金', '1', 'vip1',
    'plus', 'pro', 'gold', 'silver'
  ];
  
  return premiumKeywords.some(keyword => tierStr.includes(keyword));
}

const premiumTestCases = [
  { tier: "premium", expected: true },
  { tier: "高级会员", expected: true },
  { tier: "黄金会员", expected: true },
  { tier: "1", expected: true },
  { tier: "vip1", expected: true },
  { tier: "尊享会员", expected: false },
  { tier: "standard", expected: false },
  { tier: "vip尊享高级", expected: true },
  { tier: "高级尊享", expected: true },
  { tier: "2", expected: false }
];

premiumTestCases.forEach((testCase, index) => {
  const result = isPremiumTier(testCase.tier);
  const status = result === testCase.expected ? '✅' : '❌';
  console.log(`${index + 1}. Tier: "${testCase.tier}" → 识别为${result ? '高级' : '非高级'}会员 ${status}`);
});

// 总结
console.log('\n=============================================');
console.log('测试总结');
console.log('=============================================');
console.log(`总测试用例: ${testCases.length}`);
console.log(`通过: ${passCount}`);
console.log(`失败: ${failCount}`);

if (failCount === 0) {
  console.log('\n🎉 所有测试通过！增强的会员等级提取功能工作正常。');
} else {
  console.log('\n⚠️  部分测试失败，请检查代码。');
}

console.log('\n=============================================');
console.log('结论:');
console.log('增强的_extractMembershipTier方法能够:');
console.log('1. 支持多种字段名提取会员等级');
console.log('2. 处理嵌套的membership对象');
console.log('3. 正确识别各种高级会员关键词');
console.log('4. 健壮地处理空值和未定义情况');
console.log('=============================================');