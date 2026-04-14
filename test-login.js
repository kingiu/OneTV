const fetch = require('node-fetch');
const tough = require('tough-cookie');
const { CookieJar } = tough;

async function testLoginAndSearch() {
  console.log('=== 测试登录和搜索 API ===\n');

  const jar = new CookieJar();
  const fetchWithJar = (url, options) => fetch(url, { ...options, jar });

  // 1. 登录
  console.log('1. 登录 LunaTV 后端...');
  const loginResponse = await fetchWithJar('http://192.168.100.101:3000/api/login', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ username: 'admin', password: 'admin123' })
  });
  
  const loginData = await loginResponse.json();
  console.log(`登录结果:`, loginData);
  
  if (!loginData.ok) {
    console.error('登录失败！');
    return;
  }
  
  console.log('✅ 登录成功！\n');
  
  // 2. 搜索
  console.log('2. 搜索 "危险关系"...');
  const searchResponse = await fetchWithJar('http://192.168.100.101:3000/api/search?q=%E5%8D%B1%E9%99%A9%E5%85%B3%E7%B3%BB');
  
  const searchData = await searchResponse.json();
  console.log(`搜索结果数量: ${searchData.results?.length || 0}`);
  
  if (searchData.results && searchData.results.length > 0) {
    const sources = new Set(searchData.results.map(r => r.source));
    console.log(`去重后的源数量: ${sources.size}`);
    console.log(`源列表:`, Array.from(sources).join(', '));
    
    const sourceNames = new Set(searchData.results.map(r => r.source_name));
    console.log(`去重后的源名称数量: ${sourceNames.size}`);
    console.log(`源名称列表:`, Array.from(sourceNames).join(', '));
  }
}

testLoginAndSearch().catch(console.error);
