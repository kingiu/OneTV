import { useEffect, useCallback } from 'react';
import { Platform } from 'react-native';
import { useRouter } from 'expo-router';
import AIVoiceService from '../services/AIVoiceModule';
import { api } from '../services/api';
import { useAIVoiceStore } from '../stores/aiVoiceStore';
import performanceMonitor from '../utils/PerformanceMonitor';

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
  const handleCommand = useCallback(async (command: AICommand) => {
    try {
      console.log('useAIVoiceHook: Received AI command:', command);
      setCurrentCommand(command);
      setIsListening(true);
      
      // 使用PerformanceMonitor跟踪整个语音命令到详情页的流程
      const flow = performanceMonitor.trackVoiceCommandToDetailFlow();
      
      // 处理所有类型的命令
      let keyword = String(command.keyword || '').trim();
      
      if (command.type === 'search' && keyword) {
        console.log('useAIVoiceHook: Handling search command with keyword:', keyword);
        
        // 检查命令是否包含"搜索"关键词
        const hasSearchKeyword = keyword.includes('搜索');
        
        // 提取实际的影视名称
        const actualKeyword = hasSearchKeyword ? keyword.replace(/搜索/g, '').trim() : keyword;
        
        console.log('useAIVoiceHook: Processed keyword:', actualKeyword);
        
        // 确保实际关键词不为空
        if (!actualKeyword) {
          console.log('useAIVoiceHook: Empty keyword after processing, ignoring command');
          setIsListening(false);
          return;
        }
        
        // 更新当前命令到全局状态
        setCurrentCommand({ ...command, keyword: actualKeyword });
        
        try {
          // 开始搜索性能监控
          flow.startSearch();
          
          // 执行搜索
          console.log('useAIVoiceHook: Executing search for:', actualKeyword);
          const { results } = await api.searchVideos(actualKeyword);
          
          // 结束搜索性能监控
          flow.endSearch(results.length);
          
          console.log('useAIVoiceHook: Search results received:', results.length);
          
          // 存储搜索结果到全局状态
          setSearchResults(results);
          
          if (hasSearchKeyword) {
            // 如果包含"搜索"关键词，跳转到搜索页面显示所有结果
            console.log('useAIVoiceHook: Navigating to search page with results');
            router.push({
              pathname: '/search',
              params: {
                q: actualKeyword
              }
            });
          } else {
            // 不包含"搜索"关键词，直接跳转到第一个结果的详情页
            if (results.length > 0) {
              console.log('useAIVoiceHook: Navigating to detail page for:', results[0].title);
              
              // 开始详情页加载性能监控
              flow.startDetailLoad();
              
              router.push({
                pathname: '/detail',
                params: { 
                  source: results[0].source, 
                  q: results[0].title,
                  preLoaded: 'true'
                }
              });
            } else {
              // 没有搜索结果，跳转到搜索页面
              console.log('useAIVoiceHook: No results found, navigating to search page');
              router.push('/search');
            }
          }
        } catch (error) {
          console.error('useAIVoiceHook: Search failed:', error);
          // 搜索失败时处理
          setSearchResults([]);
          setError(`搜索失败: ${error instanceof Error ? error.message : '未知错误'}`);
          router.push('/search');
        } finally {
          // 命令处理完成，延迟关闭监听状态
          setTimeout(() => {
            setIsListening(false);
            flow.generateFlowReport();
          }, 1000);
        }
      } else if (command.type === 'control' && command.action) {
        console.log('useAIVoiceHook: Handling control command:', command.action);
        // 控制命令处理逻辑
        
        // 命令处理完成
        setTimeout(() => {
          setIsListening(false);
        }, 1000);
      } else {
        // 无效命令，直接关闭监听状态
        console.log('useAIVoiceHook: Invalid command, ignoring');
        setTimeout(() => {
          setIsListening(false);
        }, 500);
      }
    } catch (err) {
      console.error('useAIVoiceHook: Error in handleCommand:', err);
      setError(`命令处理失败: ${err instanceof Error ? err.message : '未知错误'}`);
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