import AsyncStorage from '@react-native-async-storage/async-storage';

async function checkSettings() {
  try {
    console.log('=== 检查设置 ===\n');
    
    // 检查保存的设置
    const settingsJson = await AsyncStorage.getItem('mytv_settings');
    console.log('保存的设置:', settingsJson ? settingsJson : '未找到');
    
    if (settingsJson) {
      const settings = JSON.parse(settingsJson);
      console.log('\n解析后的设置:');
      console.log('  API URL:', settings.apiBaseUrl);
      console.log('  视频源设置:', JSON.stringify(settings.videoSource, null, 2));
    }
    
    // 检查 API URL
    const apiBaseUrl = await AsyncStorage.getItem('apiBaseUrl');
    console.log('\nAPI URL (直接读取):', apiBaseUrl);
    
    // 检查认证 cookie
    const authCookie = await AsyncStorage.getItem('authCookies');
    console.log('\n认证 cookie:', authCookie ? '存在' : '不存在');
    
    // 检查登录凭证
    const credentials = await AsyncStorage.getItem('mytv_login_credentials');
    console.log('登录凭证:', credentials ? '存在' : '不存在');
    
  } catch (error) {
    console.error('错误:', error);
  }
}

checkSettings();
