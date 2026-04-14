// 清除应用中的cookie并测试重新登录
const clearAppCookies = async () => {
  console.log('=== 清除应用中的cookie ===\n');
  
  const { exec } = require('child_process');
  const util = require('util');
  const execPromise = util.promisify(exec);
  
  try {
    // 1. 清除AsyncStorage中的authCookies
    console.log('1. 清除authCookies:');
    await execPromise('adb shell "run-as com.guozhi.onetv rm -f files/AsyncStorage/default/authCookies"');
    console.log('✓ authCookies已清除');
    
    // 2. 清除登录凭证
    console.log('\n2. 清除登录凭证:');
    await execPromise('adb shell "run-as com.guozhi.onetv rm -f files/AsyncStorage/default/mytv_login_credentials"');
    console.log('✓ 登录凭证已清除');
    
    // 3. 重启应用
    console.log('\n3. 重启应用:');
    await execPromise('adb shell "am force-stop com.guozhi.onetv"');
    console.log('✓ 应用已停止');
    
    await new Promise(resolve => setTimeout(resolve, 2000));
    
    await execPromise('adb shell "am start -n com.guozhi.onetv/.MainActivity"');
    console.log('✓ 应用已启动');
    
    console.log('\n=== 完成 ===');
    console.log('请重新登录应用，然后搜索"太平年"查看结果');
    
  } catch (error) {
    console.error('清除cookie时出错:', error.message);
  }
};

clearAppCookies();
