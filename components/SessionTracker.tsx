import AsyncStorage from '@react-native-async-storage/async-storage';
import { useEffect } from 'react';

import { api } from '../services/api';

/**
 * 会话追踪组件
 * 负责检测会话恢复、记录登入时间和认证状态检查
 */
export function SessionTracker() {
  useEffect(() => {
    const checkAuthStatus = async () => {
      try {
        // 获取认证信息
        const credentialsStr = await AsyncStorage.getItem('mytv_login_credentials');
        const authInfo = credentialsStr ? JSON.parse(credentialsStr) : null;

        if (authInfo) {
          console.log('检查认证状态...');

          // 验证认证状态
          try {
            // 使用公开的API方法来检查认证状态
            const response = await fetch(`${api.getBaseUrl()}/api/user/my-stats`, {
              method: 'GET',
              headers: {
                'Content-Type': 'application/json',
                ...(authInfo.password && { 'X-Auth-Password': authInfo.password }),
                ...(authInfo.username && { 'X-Auth-Username': authInfo.username }),
                ...(authInfo.signature && { 'X-Auth-Signature': authInfo.signature }),
                ...(authInfo.timestamp && { 'X-Auth-Timestamp': authInfo.timestamp.toString() }),
              },
            });

            if (response.status === 401) {
              console.log('认证已过期，需要重新登录');
              // 清除认证信息
              try {
                await api.logout();
                await AsyncStorage.removeItem('mytv_login_credentials');
              } catch (error) {
                console.error('注销请求失败:', error);
              }
            }
          } catch (error) {
            console.error('认证状态检查失败:', error);
          }
        }
      } catch (error) {
        console.error('认证状态检查失败:', error);
      }
    };

    const checkSessionResume = async () => {
      try {
        // 检查用户是否已登录
        const credentialsStr = await AsyncStorage.getItem('mytv_login_credentials');
        const authInfo = credentialsStr ? JSON.parse(credentialsStr) : null;

        if (!authInfo) {
          // 用户未登录，不需要记录
          return;
        }

        // 检查认证状态
        await checkAuthStatus();

        // 检查上次记录的登入时间
        const lastRecordedLogin = await AsyncStorage.getItem('lastRecordedLogin');
        const now = Date.now();
        const sessionTimeout = 4 * 60 * 60 * 1000; // 4小时

        const shouldRecordLogin = !lastRecordedLogin ||
          (now - parseInt(lastRecordedLogin)) > sessionTimeout;

        if (shouldRecordLogin) {
          console.log('检测到新会话，记录登入时间');

          // 记录新的登入时间
          try {
            await fetch(`${api.getBaseUrl()}/api/user/my-stats`, {
              method: 'PUT',
              headers: {
                'Content-Type': 'application/json',
                ...(authInfo.password && { 'X-Auth-Password': authInfo.password }),
                ...(authInfo.username && { 'X-Auth-Username': authInfo.username }),
                ...(authInfo.signature && { 'X-Auth-Signature': authInfo.signature }),
                ...(authInfo.timestamp && { 'X-Auth-Timestamp': authInfo.timestamp.toString() }),
              },
              body: JSON.stringify({ loginTime: now })
            });

            await AsyncStorage.setItem('lastRecordedLogin', now.toString());
            console.log('会话恢复登入时间记录成功');
          } catch (error) {
            console.warn('会话恢复登入时间记录失败:', error);
          }
        }
      } catch (error) {
        console.error('会话检测失败:', error);
      }
    };

    // 组件挂载时检查
    checkSessionResume();

    // 页面可见性变化时也检查（用户切换回来时）
    const handleVisibilityChange = () => {
      if (typeof document !== 'undefined' && !document.hidden) {
        // 页面变为可见时，延迟一点再检查
        setTimeout(checkSessionResume, 1000);
      }
    };

    if (typeof document !== 'undefined') {
      document.addEventListener('visibilitychange', handleVisibilityChange);
    }

    return () => {
      if (typeof document !== 'undefined') {
        document.removeEventListener('visibilitychange', handleVisibilityChange);
      }
    };
  }, []);

  // 这个组件不渲染任何UI
  return null;
}
