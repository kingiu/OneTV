// 测试后端cookie编码
const testCookieEncoding = () => {
  console.log('=== 测试后端cookie编码 ===\n');
  
  // 从登录响应中提取的cookie
  const setCookie = 'user_auth=%257B%2522role%2522%253A%2522owner%2522%252C%2522username%2522%253A%2522admin%2522%252C%2522signature%2522%253A%25223a520c2fe27a7a6646e4cc72351d393819737a69b0dc17e71d7fe72af2938f87%2522%252C%2522timestamp%2522%253A1776149280462%252C%2522loginTime%2522%253A1776149280462%257D; Path=/; Expires=Tue, 21 Apr 2026 06:48:00 GMT; SameSite=lax';
  
  // 提取user_auth值
  const cookieParts = setCookie.split(';');
  let userAuthValue = '';
  for (const part of cookieParts) {
    if (part.trim().startsWith('user_auth=')) {
      userAuthValue = part.trim().substring('user_auth='.length);
      break;
    }
  }
  
  console.log('1. 从Set-Cookie中提取的值:');
  console.log(userAuthValue);
  
  console.log('\n2. 第一次解码:');
  const firstDecode = decodeURIComponent(userAuthValue);
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
  
  console.log('\n5. 问题分析:');
  console.log('后端返回的cookie已经是双重URL编码的');
  console.log('这导致应用保存的cookie也是双重编码的');
  console.log('当应用发送请求时，如果再次编码，就会变成三重编码');
  console.log('后端无法正确解析三重编码的cookie，导致认证失败');
};

testCookieEncoding();
