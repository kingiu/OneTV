import { useEffect, useCallback } from 'react';
import { Platform } from 'react-native';
import { useRouter } from 'expo-router';
import AIVoiceService from '../services/AIVoiceModule';
import { api } from '../services/api';
import { useAIVoiceStore } from '../stores/aiVoiceStore';

// 定义命令类型
export type AICommandType = 'search' | 'control';

export type AIControlAction = 
  | 'ToNext' 
  | 'ToPre' 
  | 'Replay' 
  | 'Play' 
  | 'Pause' 
  | 'Fullscreen' 
  | 'ExitFullscreen' 
  | 'Exit' 
  | 'Return' 
  | 'PlayIndex' 
  | 'PrePage' 
  | 'NextPage';

// 定义AI命令接口
export interface AICommand {
  type: AICommandType;
  action?: AIControlAction;
  keyword?: string;
  playIndex?: string;
  fastForward?: number;
  fastBackward?: number;
  seekTo?: number;
}

// 定义错误类型
export type AIErrorType = 
  | 'network_error' 
  | 'param_error' 
  | 'server_error' 
  | 'permission_error' 
  | 'unknown_error';

// 定义错误接口
export interface AIError {
  type: AIErrorType;
  message: string;
}

// 定义hook返回值接口
export interface UseAIVoiceHookReturn {
  isRegistered: boolean;
  isListening: boolean;
  currentCommand: AICommand | null;
  error: string | null;
  searchResults: any[];
  registerApp: () => Promise<boolean>;
  unregisterApp: () => Promise<void>;
  handleCommand: (command: AICommand) => void;
}

export const useAIVoiceHook = (): UseAIVoiceHookReturn => {
  // 使用全局状态管理
  const {
    isRegistered,
    isListening,
    currentCommand,
    searchResults,
    error,
    setIsRegistered,
    setIsListening,
    setCurrentCommand,
    setSearchResults,
    setError,
    clearSearchResults,
    clearError
  } = useAIVoiceStore();
  
  // 导航钩子
  const router = useRouter();

  // 注册应用到语音服务
  const registerApp = useCallback(async (): Promise<boolean> => {
    try {
      if (Platform.OS !== 'android') {
        setError('AI Voice is only supported on Android');
        return false;
      }

      // 使用AI语音服务注册应用
      console.log('useAIVoiceHook: Calling registerVideoApp');
      const result = await AIVoiceService.registerVideoApp();
      console.log('useAIVoiceHook: registerVideoApp result:', result);
      setIsRegistered(result);
      clearError();
      return result;
    } catch (err) {
      console.error('useAIVoiceHook: Error in registerApp:', err);
      setError(`Failed to register app: ${err instanceof Error ? err.message : 'Unknown error'}`);
      // 即使注册失败，也返回true以避免应用崩溃
      return true;
    }
  }, [setIsRegistered, setError, clearError]);

  // 注销应用
  const unregisterApp = useCallback(async (): Promise<void> => {
    try {
      if (Platform.OS === 'android') {
        console.log('useAIVoiceHook: Calling unregisterVideoReceiver');
        await AIVoiceService.unregisterVideoReceiver();
      }
      setIsRegistered(false);
      setCurrentCommand(null);
      clearError();
      clearSearchResults();
    } catch (err) {
      console.error('useAIVoiceHook: Error in unregisterApp:', err);
      setError(`Failed to unregister app: ${err instanceof Error ? err.message : 'Unknown error'}`);
    }
  }, [setIsRegistered, setCurrentCommand, setError, clearError, clearSearchResults]);

  // 处理接收到的命令
  const handleCommand = useCallback((command: AICommand) => {
    try {
      console.log('useAIVoiceHook: Received AI command:', command);
      setCurrentCommand(command);
      setIsListening(true);
      
      // 处理中文语音命令
      if (command.type === 'search' && command.keyword) {
        console.log('useAIVoiceHook: Handling Chinese search command:', command.keyword);
        // 确保关键词是中文
        const isChinese = /[\u4e00-\u9fa5]/.test(command.keyword);
        console.log('useAIVoiceHook: Is Chinese keyword:', isChinese);
        
        // 检查命令是否包含"搜索"关键词
        const hasSearchKeyword = command.keyword.includes('搜索');
        // 提取实际的影视名称
        const actualKeyword = hasSearchKeyword ? command.keyword.replace(/搜索/g, '').trim() : command.keyword;
        
        console.log('useAIVoiceHook: Actual keyword after processing:', actualKeyword);
        
        // 更新当前命令到全局状态
        setCurrentCommand({ ...command, keyword: actualKeyword });
        
        // 执行搜索
        api.searchVideos(actualKeyword)
          .then(({ results }) => {
            console.log('useAIVoiceHook: Search results received:', results.length);
            // 存储搜索结果到全局状态
            setSearchResults(results);
            
            if (results.length > 0) {
              // 如果不包含"搜索"关键词，直接跳转到第一个结果的详情页
              if (!hasSearchKeyword) {
                console.log('useAIVoiceHook: No "search" keyword, navigating directly to first detail page');
                router.push({
                  pathname: '/detail',
                  params: { 
                    source: results[0].source, 
                    q: results[0].title 
                  }
                });
              } else if (results.length === 1) {
                // 如果包含"搜索"关键词且只有一个结果，直接跳转到详情页
                console.log('useAIVoiceHook: With "search" keyword and only one result, navigating directly to detail page');
                router.push({
                  pathname: '/detail',
                  params: { 
                    source: results[0].source, 
                    q: results[0].title 
                  }
                });
              } else {
                // 如果包含"搜索"关键词且有多个结果，导航到搜索页面
                console.log('useAIVoiceHook: With "search" keyword and multiple results, navigating to search page');
                router.push('/search');
              }
            } else {
              // 没有搜索结果，导航到搜索页面显示
              console.log('useAIVoiceHook: No results, navigating to search page');
              router.push('/search');
            }
          })
          .catch((error) => {
            console.error('useAIVoiceHook: Search failed:', error);
            // 搜索失败时清空搜索结果
            setSearchResults([]);
            // 设置错误信息
            setError(`搜索失败: ${error instanceof Error ? error.message : '未知错误'}`);
            // 导航到搜索页面显示错误
            router.push('/search');
          })
          .finally(() => {
            // 命令处理完成
            setTimeout(() => {
              setIsListening(false);
            }, 1000);
          });
      } else if (command.type === 'control' && command.action) {
        console.log('useAIVoiceHook: Handling control command:', command.action);
        // 这里可以添加控制命令的处理逻辑，例如：
        // 1. 播放/暂停视频
        // 2. 快进/快退
        // 3. 切换到下一集/上一集
        
        // 命令处理完成
        setTimeout(() => {
          setIsListening(false);
        }, 1000);
      } else {
        // 命令处理完成
        setTimeout(() => {
          setIsListening(false);
        }, 1000);
      }
    } catch (err) {
      console.error('useAIVoiceHook: Error in handleCommand:', err);
      setError(`Failed to handle command: ${err instanceof Error ? err.message : 'Unknown error'}`);
      setIsListening(false);
    }
  }, [setCurrentCommand, setIsListening, setSearchResults, setError, router]);

  useEffect(() => {
    // 只在Android平台上初始化
    if (Platform.OS !== 'android') {
      console.log('useAIVoiceHook: Not on Android, skipping initialization');
      return;
    }

    try {
      console.log('useAIVoiceHook: Initializing AI voice service');
      // 设置命令回调
      AIVoiceService.setCommandCallback(handleCommand);
      
      // 自动注册应用
      const registerVoice = async () => {
        try {
          await registerApp();
        } catch (error) {
          console.error('useAIVoiceHook: Failed to register voice service:', error);
          // 忽略错误，避免应用崩溃
        }
      };
      registerVoice();

      // 清理函数
            return () => {
                const unregisterVoice = async () => {
                    try {
                        await unregisterApp();
                        // 清理事件监听器，避免泄漏
                        AIVoiceService.cleanupEventListeners();
                    } catch (error) {
                        console.error('useAIVoiceHook: Failed to unregister voice service:', error);
                        // 忽略错误，避免应用崩溃
                    }
                };
                unregisterVoice();
            };
    } catch (error) {
      console.error('useAIVoiceHook: Error in useEffect:', error);
      // 忽略错误，避免应用崩溃
    }
  }, [registerApp, unregisterApp, handleCommand]);

  return {
    isRegistered,
    isListening,
    currentCommand,
    error,
    searchResults,
    registerApp,
    unregisterApp,
    handleCommand
  };
};

export default useAIVoiceHook;