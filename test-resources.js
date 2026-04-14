const API_BASE_URL = 'https://onetv.aisxuexi.com';

async function testResources() {
  console.log('=== 测试资源站配置 ===\n');
  
  try {
    // 获取服务器配置
    console.log('1. 获取服务器配置...');
    const configResponse = await fetch(`${API_BASE_URL}/api/server/config`);
    const configData = await configResponse.json();
    console.log('服务器配置:', JSON.stringify(configData, null, 2));
    
    // 获取所有资源
    console.log('\n2. 获取所有资源...');
    const resourcesResponse = await fetch(`${API_BASE_URL}/api/resources`);
    const resourcesData = await resourcesResponse.json();
    console.log(`所有资源列表 (${resourcesData.length} 个):`);
    resourcesData.forEach(r => {
      console.log(`  - ${r.key}: ${r.name} (权重: ${r.weight}, 启用: ${r.enabled})`);
    });
    
    // 检查官方高清站资源
    const officialHdResource = resourcesData.find(r => 
      r.key.includes('official') || r.key.includes('hd') || r.name.includes('官方') || r.name.includes('高清')
    );
    
    if (officialHdResource) {
      console.log(`\n3. 官方高清站资源详情:`);
      console.log(JSON.stringify(officialHdResource, null, 2));
    } else {
      console.log('\n3. 未找到官方高清站资源');
      
      // 显示所有包含"官方"或"高清"的资源
      console.log('\n查找包含"官方"或"高清"的资源:');
      const allResources = JSON.stringify(resourcesData);
      if (allResources.includes('官方') || allResources.includes('高清')) {
        console.log('在资源数据中找到相关关键词');
      }
    }
    
    // 测试搜索
    console.log('\n4. 测试搜索"太平年"...');
    const searchResponse = await fetch(`${API_BASE_URL}/api/search?q=${encodeURIComponent('太平年')}`);
    const searchData = await searchResponse.json();
    console.log(`搜索结果总数: ${searchData.results?.length || 0}`);
    
    if (searchData.results && searchData.results.length > 0) {
      console.log('\n前5个结果:');
      searchData.results.slice(0, 5).forEach((result, index) => {
        console.log(`\n结果 ${index + 1}:`);
        console.log(`  标题: ${result.title}`);
        console.log(`  来源: ${result.source} (${result.source_name})`);
        console.log(`  ID: ${result.id}`);
        console.log(`  年份: ${result.year}`);
        console.log(`  剧集数: ${result.episodes?.length || 0}`);
      });
    }
    
  } catch (error) {
    console.error('错误:', error.message);
  }
}

testResources();
