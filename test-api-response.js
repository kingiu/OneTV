const fetch = require('node-fetch');

async function testApiResponse() {
  console.log('=== 测试实际 API 响应 ===\n');

  const query = '危险关系 2026';
  const variants = ['危险关系 2026', '危险关系2026'];

  for (const variant of variants) {
    console.log(`搜索变体: "${variant}"`);
    const url = 'http://localhost:3000/api/search?q=' + encodeURIComponent(variant);
    
    try {
      const response = await fetch(url, {
        headers: {
          'Cookie': 'username=test; password=test' // 添加认证信息
        }
      });
      
      console.log(`状态码: ${response.status}`);
      
      if (response.ok) {
        const data = await response.json();
        console.log(`结果数量: ${data.results?.length || 0}`);
        
        if (data.results && data.results.length > 0) {
          console.log('前5个结果:');
          data.results.slice(0, 5).forEach((item, index) => {
            console.log(`  ${index + 1}. ${item.title} (${item.source_name || item.source}) - 年份: ${item.year || 'unknown'}`);
          });
        }
      } else {
        const errorData = await response.json();
        console.log(`错误: ${errorData.error || '未知错误'}`);
      }
    } catch (error) {
      console.error('请求失败:', error.message);
    }
    console.log('---');
  }
}

testApiResponse().catch(console.error);
