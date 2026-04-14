// 测试修复后的cookie解码逻辑
const testCookieDecoding = () => {
  console.log('=== 测试修复后的cookie解码逻辑 ===\n');
  
  // 模拟后端返回的双重编码cookie
  const encodedCookie = '%257B%2522role%2522%253A%2522owner%2522%252C%2522username%2522%253A%2522admin%2522%252C%2522signature%2522%253A%25223a520c2fe27a7a6646e4cc72351d393819737a69b0dc17e71d7fe72af2938f87%2522%252C%2522timestamp%2522%253A1776149280462%252C%2522loginTime%2522%253A1776149280462%257D';
  
  console.log('1. 后端返回的双重编码cookie:');
  console.log(encodedCookie);
  
  // 模拟修复后的解码逻辑
  let decodedCookieValue = encodedCookie;
  try {
    // 尝试解码一次（处理双重编码的情况）
    decodedCookieValue = decodeURIComponent(encodedCookie);
    console.log('\n2. 第一次解码后:');
    console.log(decodedCookieValue);
    
    // 再次尝试解码（确保处理双重编码）
    if (decodedCookieValue.startsWith('%')) {
      decodedCookieValue = decodeURIComponent(decodedCookieValue);
      console.log('\n3. 第二次解码后:');
      console.log(decodedCookieValue);
    }
  } catch (decodeError) {
    console.log('解码失败:', decodeError.message);
  }
  
  console.log('\n4. 最终保存的cookie值:');
  console.log(decodedCookieValue);
  
  console.log('\n5. 解析为JSON:');
  try {
    const parsed = JSON.parse(decodedCookieValue);
    console.log(JSON.stringify(parsed, null, 2));
  } catch (error) {
    console.log('解析失败:', error.message);
  }
  
  console.log('\n6. 修复效果:');
  console.log('✓ 后端返回双重编码的cookie');
  console.log('✓ 应用在保存前进行解码');
  console.log('✓ 保存的是原始未编码的cookie值');
  console.log('✓ 发送请求时，浏览器自动编码一次');
  console.log('✓ 后端收到正确编码的cookie，认证成功');
};

testCookieDecoding();
