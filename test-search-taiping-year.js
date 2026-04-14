// 测试后端直接搜索"太平年"
const fetch = require('node-fetch');

const testSearchTaipingYear = async () => {
  console.log('=== 测试后端直接搜索"太平年" ===\n');
  
  const baseUrl = 'http://192.168.100.101:3000';
  
  try {
    // 1. 不使用认证直接搜索
    console.log('1. 不使用认证直接搜索:');
    const searchResponse1 = await fetch(`${baseUrl}/api/search?q=%E5%A4%AA%E5%B9%B3%E5%B9%B4`);
    console.log('搜索状态:', searchResponse1.status);
    const searchData1 = await searchResponse1.json();
    console.log('搜索结果数量:', searchData1.results ? searchData1.results.length : 0);
    console.log('搜索结果:', JSON.stringify(searchData1, null, 2));
    
  } catch (error) {
    console.error('测试错误:', error.message);
  }
};

testSearchTaipingYear();
