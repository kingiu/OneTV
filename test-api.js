const fetch = require('node-fetch');

const API_BASE_URL = 'https://cloudtv.aisxuexi.com';

async function testSearch() {
  try {
    // 测试搜索接口
    const query = '复仇之渊';
    const searchUrl = `${API_BASE_URL}/api/search?q=${encodeURIComponent(query)}`;
    console.log('Testing search API:', searchUrl);
    
    const searchResponse = await fetch(searchUrl, {
      headers: {
        'Cookie': 'user=eyJ1c2VySWQiOjAsInVzZXJuYW1lIjoiIiwiaXNTdW5kZW50IjpmYWxzZSwidG9rZW4iOiIifQ==; Authorization=Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1c2VySWQiOjAsInVzZXJuYW1lIjoiIiwiaWF0IjoxNzczNTc2MTQzLCJleHAiOjE3NzQxODE5NDN9.b8cE8GzT6oF3X9s8f6q6q6q6q6q6q6q6q6q6q6q6q6q6q6q6'
      }
    });
    
    const searchData = await searchResponse.json();
    console.log('Search results:', searchData);
    console.log('Number of results:', searchData.results ? searchData.results.length : 0);
    
    if (searchData.results && searchData.results.length > 0) {
      console.log('First result:', searchData.results[0]);
    }
    
    // 测试搜索单个资源接口
    const resourcesUrl = `${API_BASE_URL}/api/search/resources`;
    console.log('\nTesting resources API:', resourcesUrl);
    
    const resourcesResponse = await fetch(resourcesUrl, {
      headers: {
        'Cookie': 'user=eyJ1c2VySWQiOjAsInVzZXJuYW1lIjoiIiwiaXNTdW5kZW50IjpmYWxzZSwidG9rZW4iOiIifQ==; Authorization=Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1c2VySWQiOjAsInVzZXJuYW1lIjoiIiwiaWF0IjoxNzczNTc2MTQzLCJleHAiOjE3NzQxODE5NDN9.b8cE8GzT6oF3X9s8f6q6q6q6q6q6q6q6q6q6q6q6q6q6q6'
      }
    });
    
    const resourcesData = await resourcesResponse.json();
    console.log('Resources:', resourcesData);
    console.log('Number of resources:', resourcesData.length);
    
    if (resourcesData.length > 0) {
      const firstResource = resourcesData[0];
      console.log('Testing search for first resource:', firstResource.name, firstResource.key);
      
      const resourceSearchUrl = `${API_BASE_URL}/api/search/one?q=${encodeURIComponent(query)}&resourceId=${encodeURIComponent(firstResource.key)}`;
      const resourceSearchResponse = await fetch(resourceSearchUrl, {
        headers: {
          'Cookie': 'user=eyJ1c2VySWQiOjAsInVzZXJuYW1lIjoiIiwiaXNTdW5kZW50IjpmYWxzZSwidG9rZW4iOiIifQ==; Authorization=Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1c2VySWQiOjAsInVzZXJuYW1lIjoiIiwiaWF0IjoxNzczNTc2MTQzLCJleHAiOjE3NzQxODE5NDN9.b8cE8GzT6oF3X9s8f6q6q6q6q6q6q6q6q6q6q6q6q6q6q6'
        }
      });
      
      const resourceSearchData = await resourceSearchResponse.json();
      console.log('Resource search results:', resourceSearchData);
      console.log('Number of resource search results:', resourceSearchData.results ? resourceSearchData.results.length : 0);
      
      if (resourceSearchData.results && resourceSearchData.results.length > 0) {
        console.log('First resource search result:', resourceSearchData.results[0]);
      }
    }
    
  } catch (error) {
    console.error('Error:', error);
  }
}

testSearch();
