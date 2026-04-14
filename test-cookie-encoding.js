// 测试cookie编码问题
const testCookieEncoding = () => {
  console.log('=== 测试Cookie编码问题 ===\n');
  
  // 从日志中提取的编码后的cookie值
  const encodedCookie = '%257B%2522role%2522%253A%2522user%2522%252C%2522username%2522%253A%252220b122%2522%252C%2522signature%2522%253A%25227ce82ad8493d790856f6e9824a537d69e0e8df3479c8babe336bcad6d4b1b8f1%2522%252C%2522timestamp%2522%253A1776148670354%257D';
  
  console.log('1. 原始编码值:');
  console.log(encodedCookie);
  
  console.log('\n2. 第一次解码:');
  const firstDecode = decodeURIComponent(encodedCookie);
  console.log(firstDecode);
  
  console.log('\n3. 第二次解码:');
  const secondDecode = decodeURIComponent(firstDecode);
  console.log(secondDecode);
  
  console.log('\n4. 解析为JSON:');
  try {
    const parsed = JSON.parse(secondDecode);
    console.log(JSON.stringify(parsed, null, 2));
  } catch (error) {
    console.log('解析失败:', error.message);
  }
  
  console.log('\n5. 测试正确的编码方式:');
  const correctValue = { role: 'user', username: '20b122', signature: '7ce82ad8493d790856f6e9824a537d69e0e8df3479c8babe336bcad6d4b1b8f1', timestamp: 1776148670354 };
  const correctEncoded = encodeURIComponent(JSON.stringify(correctValue));
  console.log('正确编码:', correctEncoded);
  
  console.log('\n6. 对比:');
  console.log('日志中的编码:', encodedCookie);
  console.log('正确编码:', correctEncoded);
  console.log('是否相等:', encodedCookie === correctEncoded);
};

testCookieEncoding();
