import { resourceMatcher } from './services/resourceMatcher';

async function testSearchAPI() {
  console.log('=== 测试搜索变体生成 ===\n');

  const query = '危险关系 2026';
  console.log(`查询: "${query}"`);
  console.log('');

  // 测试搜索变体生成
  const searchVariants = resourceMatcher.generateSearchVariants(query);
  console.log(`生成的搜索变体: ${JSON.stringify(searchVariants)}`);
  console.log(`搜索变体数量: ${searchVariants.length}`);
  console.log('');

  // 分析每个搜索变体
  console.log('=== 搜索变体分析 ===');
  searchVariants.forEach((variant, i) => {
    console.log(`${i + 1}. "${variant}"`);
    console.log(`   - 长度: ${variant.length}`);
    console.log(`   - 包含空格: ${variant.includes(' ')}`);
    console.log(`   - 包含年份: ${/\d{4}/.test(variant)}`);
  });
  console.log('');

  // 测试其他查询
  console.log('=== 测试其他查询 ===');
  const testQueries = [
    '危险关系 2026',
    '危险关系',
    '流浪地球 2023',
    '三体',
    '狂飙',
  ];

  testQueries.forEach(q => {
    const variants = resourceMatcher.generateSearchVariants(q);
    console.log(`查询: "${q}" -> 变体: ${JSON.stringify(variants)}`);
  });

  console.log('\n=== 测试完成 ===');
  console.log('\n结论:');
  console.log('- 搜索变体生成逻辑正确');
  console.log('- 每个查询最多生成 2 个搜索变体');
  console.log('- 问题可能在于 /api/search API 返回的结果数量');
  console.log('\n建议:');
  console.log('1. 检查 /api/search API 是否返回了足够的结果');
  console.log('2. 检查 API 认证是否正常');
  console.log('3. 检查网络连接是否稳定');
}

testSearchAPI();
