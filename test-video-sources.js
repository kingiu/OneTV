const { API } = require('./services/api');
const AsyncStorage = require('@react-native-async-storage/async-storage').default;

// 模拟AsyncStorage
AsyncStorage.getItem = async (key) => {
  if (key === 'authCookies') {
    // 这里添加实际的认证Cookie
    return '';
  }
  return null;
};

AsyncStorage.setItem = async (key, value) => {
  console.log(`Stored ${key}: ${value}`);
};

// 创建API实例
const api = new API('http://localhost:3000'); // 替换为实际的API地址

// 测试函数
async function testVideoSources() {
  try {
    console.log('Testing video sources...');
    
    // 测试获取资源
    console.log('\n1. Testing getResources...');
    const resources = await api.getResources();
    console.log(`Found ${resources.length} resources:`);
    resources.forEach(resource => {
      console.log(`  - ${resource.name} (${resource.key})`);
    });
    
    // 测试搜索视频
    const testQuery = '测试视频'; // 替换为实际的测试视频名称
    console.log(`\n2. Testing searchVideos for "${testQuery}"...`);
    const searchResults = await api.searchVideos(testQuery);
    console.log(`Found ${searchResults.results.length} results from searchVideos:`);
    searchResults.results.forEach((result, index) => {
      console.log(`  ${index + 1}. ${result.source_name}: ${result.title}`);
    });
    
    // 测试单个视频源搜索
    if (resources.length > 0) {
      for (const resource of resources) {
        console.log(`\n3. Testing searchVideo for ${resource.name}...`);
        try {
          const singleResult = await api.searchVideo(testQuery, resource.key);
          console.log(`Found ${singleResult.results.length} results from ${resource.name}:`);
          singleResult.results.forEach((result, index) => {
            console.log(`  ${index + 1}. ${result.title} (${result.source_name})`);
          });
        } catch (error) {
          console.error(`Error searching ${resource.name}:`, error);
        }
      }
    }
    
    console.log('\nVideo sources test completed!');
  } catch (error) {
    console.error('Video sources test failed:', error);
  }
}

// 运行测试
testVideoSources();
