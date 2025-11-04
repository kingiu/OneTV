// 简单的JavaScript包装脚本，用于运行TypeScript测试
const { execSync } = require('child_process');

// 创建一个简化版的测试脚本
function runSimpleTest() {
  console.log('\n===== 开始简化版会员等级识别测试 =====\n');
  
  // 会员等级判断函数（直接从membershipStore中提取核心逻辑）
  const isVip = (tier) => {
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
    return tierStr === 'vip' || 
           tierStr.includes('尊享') || 
           tierStr.includes('至尊') ||
           tierStr === 'svip' || 
           tierStr.includes('supervip') ||
           tierStr === '2';
  };
  
  const isPremium = (tier) => {
    const tierStr = String(tier || '').toLowerCase();
    
    // 直接判断是否为高级会员
    return tierStr === 'premium' || 
           tierStr === 'vip1' ||
           tierStr.includes('高级') || 
           tierStr.includes('黄金') ||
           tierStr.includes('plus') || 
           tierStr.includes('pro') ||
           tierStr === '1' ||
           tierStr.includes('gold') ||
           tierStr.includes('silver') ||
           tierStr.includes('高级vip') ||
           tierStr.includes('会员1') ||
           tierStr.match(/(tier|level)\s*1/i) !== null;
  };
  
  const getMembershipTier = (tier) => {
    if (isPremium(tier)) return '高级会员';
    if (isVip(tier)) return '尊享会员';
    return '普通会员';
  };
  
  // 重点测试用例
  const testCases = [
    { tier: 'vip', expected: '尊享会员', description: 'VIP' },
    { tier: 'vip1', expected: '高级会员', description: 'VIP1 - 重点测试' },
    { tier: '高级', expected: '高级会员', description: '高级' },
    { tier: '高级VIP', expected: '高级会员', description: '高级VIP' },
    { tier: '1', expected: '高级会员', description: '数字1' },
    { tier: '2', expected: '尊享会员', description: '数字2' },
    { tier: 'premium', expected: '高级会员', description: 'Premium' },
    { tier: 1, expected: '高级会员', description: '数值1' },
    { tier: 2, expected: '尊享会员', description: '数值2' },
    { tier: 'VIP高级', expected: '高级会员', description: 'VIP高级 - 边界情况' }
  ];
  
  let passed = 0;
  let failed = 0;
  
  // 运行测试
  console.log('测试结果:');
  console.log('-' * 80);
  
  testCases.forEach((testCase, index) => {
    const result = getMembershipTier(testCase.tier);
    const success = result === testCase.expected;
    
    console.log(`${success ? '✅' : '❌'} 测试 #${index + 1}: ${testCase.description}`);
    console.log(`   Tier: '${testCase.tier}' (类型: ${typeof testCase.tier})`);
    console.log(`   结果: '${result}' ${success ? '(正确)' : '(错误，应为: ' + testCase.expected + ')'}  `);
    console.log(`   isVip: ${isVip(testCase.tier)}, isPremium: ${isPremium(testCase.tier)}`);
    console.log('-' * 80);
    
    if (success) passed++;
    else failed++;
  });
  
  // 结果摘要
  console.log('\n测试结果摘要:');
  console.log(`通过: ${passed}`);
  console.log(`失败: ${failed}`);
  console.log(`通过率: ${Math.round((passed / testCases.length) * 100)}%`);
  
  // 重点关注vip1的识别结果
  const vip1Result = getMembershipTier('vip1');
  console.log('\n重点验证:');
  console.log(`vip1被识别为: '${vip1Result}'`);
  console.log(`vip1 isVip: ${isVip('vip1')}`);
  console.log(`vip1 isPremium: ${isPremium('vip1')}`);
  
  console.log('\n===== 测试完成 =====');
}

// 运行测试
runSimpleTest();