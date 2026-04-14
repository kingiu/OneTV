import { resourceMatcher } from './services/resourceMatcher';

async function testActualSearch() {
  console.log('=== 测试实际 API 搜索 ===\n');

  const query = '危险关系 2026';
  const variants = resourceMatcher.generateSearchVariants(query);
  console.log(`查询: "${query}"`);
  console.log(`变体: ${JSON.stringify(variants)}\n`);

  // 测试 LunaTV 的 API
  const apiUrl = 'http://localhost:3000/api/search?q=' + encodeURIComponent(query);

  console.log(`请求 URL: ${apiUrl}\n`);

  try {
    const response = await fetch(apiUrl);
    const data = await response.json();
    console.log(`API 响应状态: ${response.status}`);
    console.log(`结果数量: ${data.results?.length || 0}`);

    if (data.results) {
      data.results.forEach((item: any, index: number) => {
        console.log(`${index + 1}. ${item.title} (${item.source_name}) - 年份: ${item.year || 'unknown'}`);
      });
    }

    if (data.error) {
      console.log(`错误: ${data.error}`);
    }
  } catch (error) {
    console.error('请求失败:', error);
  }
}

testActualSearch();
