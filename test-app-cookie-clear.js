// 通过应用设置清除cookie的测试脚本
const testAppCookieClear = async () => {
  console.log('=== 测试应用cookie清除 ===\n');
  
  const { exec } = require('child_process');
  const util = require('util');
  const execPromise = util.promisify(exec);
  
  try {
    // 1. 检查AsyncStorage中的文件
    console.log('1. 检查AsyncStorage文件:');
    try {
      const { stdout } = await execPromise('adb shell "run-as com.guozhi.onetv ls -la files/AsyncStorage/default/"');
      console.log(stdout);
    } catch (error) {
      console.log('无法访问AsyncStorage目录');
    }
    
    // 2. 检查应用数据目录
    console.log('\n2. 检查应用数据目录:');
    try {
      const { stdout } = await execPromise('adb shell "ls -la /data/data/com.guozhi.onetv/files/"');
      console.log(stdout);
    } catch (error) {
      console.log('无法访问应用数据目录');
    }
    
    // 3. 尝试清除应用数据（需要用户确认）
    console.log('\n3. 清除应用数据选项:');
    console.log('方法1: 在应用设置中清除数据');
    console.log('方法2: 通过系统设置清除应用数据');
    console.log('方法3: 卸载并重新安装应用');
    
    console.log('\n建议操作:');
    console.log('1. 打开应用设置');
    console.log('2. 找到"清除数据"或"清除缓存"选项');
    console.log('3. 清除数据后重新登录');
    console.log('4. 搜索"太平年"查看结果');
    
  } catch (error) {
    console.error('测试时出错:', error.message);
  }
};

testAppCookieClear();
