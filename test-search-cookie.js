const fetch = require('node-fetch');

async function testSearchWithCookie() {
  console.log('=== 测试搜索 API（带 cookie）===\n');

  // 从 AsyncStorage 读取 cookie
  const cookie = '%257B%2522role%2522%253A%2522owner%2522%252C%2522username%2522%253A%2522admin%2522%252C%2522signature%2522%253A%25223a520c2fe27a7a6646e4cc72351d393819737a69b0dc17e71d7fe72af2938f87%2522%252C%2522timestamp%2522%253A1776086265332%252C%2522loginTime%2522%253A1776086265332%257D';
  
  console.log('Cookie:', cookie);
  
  // 解码 cookie
  const decodedCookie = decodeURIComponent(cookie);
  console.log('Decoded cookie:', decodedCookie);
  
  const headers = {
    'Cookie': `user_auth=${cookie}`,
    'Content-Type': 'application/json'
  };
  
  console.log('Headers:', headers);
  
  // 搜索
  console.log('\n搜索 "危险关系"...');
  const searchResponse = await fetch('http://192.168.100.101:3000/api/search?q=%E5%8D%B1%E9%99%A9%E5%85%B3%E7%B3%BB', {
    headers
  });
  
  console.log('HTTP Status:', searchResponse.status);
  
  const searchData = await searchResponse.json();
  console.log(`搜索结果数量: ${searchData.results?.length || 0}`);
  
  if (searchData.results && searchData.results.length > 0) {
    const sources = new Set(searchData.results.map(r => r.source));
    console.log(`去重后的源数量: ${sources.size}`);
    
    const sourceNames = new Set(searchData.results.map(r => r.source_name));
    console.log(`去重后的源名称数量: ${sourceNames.size}`);
    console.log(`源名称列表:`, Array.from(sourceNames).join(', '));
  }
}

testSearchWithCookie().catch(console.error);
