import { NativeModules, NativeEventEmitter, Platform } from 'react-native';
import { AICommand, AICommandType } from '../hooks/useAIVoiceHook';

// 动态导入NativeModules，避免在非Android平台报错
let AIVoiceModule: any;
let eventEmitter: NativeEventEmitter | null = null;

// 添加中文语音引擎支持标志
let isChineseVoiceEngineAvailable = false;

// 简化日志，只保留关键信息
console.log('AIVoiceModule: Initializing...');

if (Platform.OS === 'android') {
  console.log('AIVoiceModule: Running on Android platform');
  
  // 安全检查 NativeModules 是否存在
  if (!NativeModules) {
    console.error('AIVoiceModule: NativeModules is not available');
    
    // 创建模拟模块，避免后续调用崩溃
    AIVoiceModule = {
      registerVideoApp: async () => true,
      registerVideoReceiver: async () => {},
      unregisterVideoReceiver: async () => {}
    };
  } else {
    console.log('AIVoiceModule: NativeModules is available');
    
    // 打印所有可用的NativeModules，帮助调试
    const availableModules = Object.keys(NativeModules);
    console.log('AIVoiceModule: Available NativeModules:', availableModules);
    
    try {
      // 尝试获取AIOpenModule或AIOpen
      // 首先检查AIOpen
      const aiOpenModule = NativeModules.AIOpen;
      console.log('AIVoiceModule: AIOpen reference obtained');
      
      // 检查 aiOpenModule 的类型和内容
      const aiOpenModuleType = typeof aiOpenModule;
      console.log('AIVoiceModule: AIOpen typeof:', aiOpenModuleType);
      console.log('AIVoiceModule: AIOpen is null:', aiOpenModule === null);
      console.log('AIVoiceModule: AIOpen is undefined:', aiOpenModule === undefined);
      
      // 原生模块的方法不是可枚举属性，所以Object.keys()会返回空数组
      const aiOpenProperties = aiOpenModule ? Object.keys(aiOpenModule) : [];
      console.log('AIVoiceModule: AIOpen enumerable properties:', aiOpenProperties);
      console.log('AIVoiceModule: AIOpen has enumerable properties:', aiOpenProperties.length > 0);
      
      // 检查AIOpen对象是否有效 - 对于原生模块，即使没有可枚举属性，也是有效的
      const isAIOpenValid = typeof aiOpenModule === 'object' && aiOpenModule !== null;
      
      if (isAIOpenValid) {
        console.log('AIVoiceModule: AIOpen is valid object (native module)');
        console.log('AIVoiceModule: AIOpen enumerable properties:', aiOpenProperties);
        AIVoiceModule = aiOpenModule;
        
        // 尝试创建eventEmitter
        try {
          eventEmitter = new NativeEventEmitter(AIVoiceModule);
          console.log('AIVoiceModule: eventEmitter created successfully');
          
          // 设置中文语音引擎标志
          isChineseVoiceEngineAvailable = true;
          console.log('AIVoiceModule: Chinese voice engine initialized successfully');
        } catch (e) {
          console.error('AIVoiceModule: Failed to create eventEmitter:', e);
          // 即使eventEmitter创建失败，也要继续使用AIVoiceModule
          console.error('AIVoiceModule: This is expected if the module is not properly implemented');
          console.error('AIVoiceModule: Falling back to mock implementation for event handling');
        }
      } else {
        // 尝试检查AIOpenModule
        console.log('AIVoiceModule: AIOpen is not valid, checking for AIOpenModule...');
        
        // 检查AIOpenModule
        const aiOpenModuleLegacy = NativeModules.AIOpenModule;
        console.log('AIVoiceModule: AIOpenModule reference obtained');
        
        // 检查 aiOpenModuleLegacy 的类型和内容
        const aiOpenModuleLegacyType = typeof aiOpenModuleLegacy;
        console.log('AIVoiceModule: AIOpenModule typeof:', aiOpenModuleLegacyType);
        console.log('AIVoiceModule: AIOpenModule is null:', aiOpenModuleLegacy === null);
        console.log('AIVoiceModule: AIOpenModule is undefined:', aiOpenModuleLegacy === undefined);
        
        // 原生模块的方法不是可枚举属性，所以Object.keys()会返回空数组
        const aiOpenModuleLegacyProperties = aiOpenModuleLegacy ? Object.keys(aiOpenModuleLegacy) : [];
        console.log('AIVoiceModule: AIOpenModule enumerable properties:', aiOpenModuleLegacyProperties);
        console.log('AIVoiceModule: AIOpenModule has enumerable properties:', aiOpenModuleLegacyProperties.length > 0);
        
        // 检查AIOpenModule对象是否有效 - 对于原生模块，即使没有可枚举属性，也是有效的
        const isAIOpenModuleValid = typeof aiOpenModuleLegacy === 'object' && aiOpenModuleLegacy !== null;
        
        if (isAIOpenModuleValid) {
          console.log('AIVoiceModule: AIOpenModule is valid object (native module)');
          console.log('AIVoiceModule: AIOpenModule enumerable properties:', aiOpenModuleLegacyProperties);
          AIVoiceModule = aiOpenModuleLegacy;
          
          try {
            eventEmitter = new NativeEventEmitter(AIVoiceModule);
            console.log('AIVoiceModule: eventEmitter created for AIOpenModule');
            isChineseVoiceEngineAvailable = true;
          } catch (e) {
            console.error('AIVoiceModule: Failed to create eventEmitter for AIOpenModule:', e);
            // 即使eventEmitter创建失败，也要继续使用AIVoiceModule
          }
        } else {
          // 检查所有NativeModules中是否有AI相关的模块
          console.log('AIVoiceModule: AIOpenModule is not valid, checking for other AI modules...');
          const aiModules = availableModules.filter(key => 
            key.toLowerCase().includes('ai') || 
            key.toLowerCase().includes('voice') || 
            key.toLowerCase().includes('speech')
          );
          
          console.log('AIVoiceModule: Available modules with AI-related keywords:', aiModules);
          
          if (aiModules.length > 0) {
            console.log('AIVoiceModule: Found AI-related modules:', aiModules);
            // 尝试使用第一个找到的AI模块
            const aiModuleName = aiModules[0];
            AIVoiceModule = NativeModules[aiModuleName];
            console.log('AIVoiceModule: Using AI module:', aiModuleName);
            
            // 原生模块的方法不是可枚举属性，所以Object.keys()会返回空数组
            const aiModuleProperties = Object.keys(AIVoiceModule);
            console.log('AIVoiceModule: Module enumerable properties:', aiModuleProperties);
            console.log('AIVoiceModule: Module has enumerable properties:', aiModuleProperties.length > 0);
            
            try {
              eventEmitter = new NativeEventEmitter(AIVoiceModule);
              console.log('AIVoiceModule: eventEmitter created for module:', aiModules[0]);
            } catch (e) {
              console.error('AIVoiceModule: Failed to create eventEmitter for module:', aiModules[0], e);
              // 即使eventEmitter创建失败，也要继续使用AIVoiceModule
            }
          } else {
            console.error('AIVoiceModule: Neither AIOpenModule nor AIOpen is available');
            console.error('AIVoiceModule: No AI-related NativeModules found');
            
            // 创建模拟模块，避免后续调用崩溃
            AIVoiceModule = {
              registerVideoApp: async () => true,
              registerVideoReceiver: async () => {},
              unregisterVideoReceiver: async () => {}
            };
            console.log('AIVoiceModule: Created mock AI module to prevent crashes');
          }
        }
      }
    } catch (error) {
      console.error('AIVoiceModule: Error during initialization:', error);
      
      // 创建模拟模块，避免后续调用崩溃
      AIVoiceModule = {
        registerVideoApp: async () => true,
        registerVideoReceiver: async () => {},
        unregisterVideoReceiver: async () => {}
      };
    }
  }
} else {
  console.error('AIVoiceModule: Not available on non-Android platform');
  
  // 创建模拟模块，避免后续调用崩溃
  AIVoiceModule = {
    registerVideoApp: async () => true,
    registerVideoReceiver: async () => {},
    unregisterVideoReceiver: async () => {}
  };
}

// 存储事件监听器，避免直接修改原生模块对象
let _eventListeners: { remove: () => void }[] | null = null;

// 定义AI语音模块接口
interface IAIVoiceModule {
  // 注册视频应用
  registerVideoApp: () => Promise<boolean>;
  
  // 注册视频接收器
  registerVideoReceiver: () => Promise<void>;
  
  // 取消注册视频接收器
  unregisterVideoReceiver: () => Promise<void>;
  
  // 设置命令回调
  setCommandCallback: (callback: (command: AICommand) => void) => void;
  
  // 清理事件监听器
  cleanupEventListeners: () => void;
  
  // 注册广播接收器
  registerBroadcastReceiver: () => Promise<void>;
  
  // 取消注册广播接收器
  unregisterBroadcastReceiver: () => Promise<void>;
}

// 实现AI语音模块
const AIVoiceService: IAIVoiceModule = {
  /**
   * 注册视频应用到夏杰语音服务
   * @returns Promise<boolean> 注册结果
   */
  registerVideoApp: async (): Promise<boolean> => {
    console.log('AIVoiceModule: registerVideoApp called');
    
    if (Platform.OS !== 'android') {
      console.warn('AIVoiceModule: Not available on non-Android platform');
      return false;
    }
    
    if (!AIVoiceModule) {
      console.warn('AIVoiceModule: AIVoiceModule reference is null or undefined');
      // 即使模块不可用，也返回true以避免应用崩溃
      return true;
    }

    try {
      // 检查并调用registerVideoApp方法
      if (typeof AIVoiceModule.registerVideoApp === 'function') {
        console.log('AIVoiceModule: Calling registerVideoApp method');
        await AIVoiceModule.registerVideoApp();
        console.log('AIVoiceModule: registerVideoApp method completed successfully');
      } else {
        console.warn('AIVoiceModule: registerVideoApp method not available in AIVoiceModule');
        
        // 尝试使用register方法（可能的别名）
        if (typeof AIVoiceModule.register === 'function') {
          console.log('AIVoiceModule: Calling register method as fallback');
          await AIVoiceModule.register();
          console.log('AIVoiceModule: register method completed successfully');
        } else {
          console.warn('AIVoiceModule: No register method available');
        }
      }
      
      // 检查并调用registerVideoReceiver方法
      if (typeof AIVoiceModule.registerVideoReceiver === 'function') {
        console.log('AIVoiceModule: Calling registerVideoReceiver method');
        await AIVoiceModule.registerVideoReceiver();
        console.log('AIVoiceModule: registerVideoReceiver method completed successfully');
      } else {
        console.warn('AIVoiceModule: registerVideoReceiver method not available in AIVoiceModule');
        
        // 尝试使用registerReceiver方法（可能的别名）
        if (typeof AIVoiceModule.registerReceiver === 'function') {
          console.log('AIVoiceModule: Calling registerReceiver method as fallback');
          await AIVoiceModule.registerReceiver();
          console.log('AIVoiceModule: registerReceiver method completed successfully');
        } else {
          console.warn('AIVoiceModule: No register receiver method available');
        }
      }
      
      // 添加中文语音识别配置
      if (typeof AIVoiceModule.setLanguage === 'function') {
        console.log('AIVoiceModule: Setting language to Chinese');
        await AIVoiceModule.setLanguage('zh-CN');
        console.log('AIVoiceModule: Language set to Chinese successfully');
      }
      
      console.log('AIVoiceModule: registerVideoApp completed successfully');
      return true;
    } catch (error) {
      console.error('AIVoiceModule: Failed to register video app:', error);
      // 返回false表示注册失败，但不导致应用崩溃
      return false;
    }
  },

  /**
   * 注册视频接收器
   * @returns Promise<void>
   */
  registerVideoReceiver: async (): Promise<void> => {
    if (Platform.OS !== 'android' || !AIVoiceModule) {
      return;
    }

    try {
      if (typeof AIVoiceModule.registerVideoReceiver === 'function') {
        await AIVoiceModule.registerVideoReceiver();
      } else {
        console.warn('registerVideoReceiver method not available in AIVoiceModule');
      }
    } catch (error) {
      console.error('Failed to register video receiver:', error);
    }
  },

  /**
   * 取消注册视频接收器
   * @returns Promise<void>
   */
  unregisterVideoReceiver: async (): Promise<void> => {
    if (Platform.OS !== 'android' || !AIVoiceModule) {
      return;
    }

    try {
      if (typeof AIVoiceModule.unregisterVideoReceiver === 'function') {
        await AIVoiceModule.unregisterVideoReceiver();
      } else {
        console.warn('unregisterVideoReceiver method not available in AIVoiceModule');
      }
    } catch (error) {
      console.error('Failed to unregister video receiver:', error);
    }
  },

  /**
     * 设置命令回调
     * @param callback 命令回调函数
     */
    setCommandCallback: (callback: (command: AICommand) => void): void => {
        if (Platform.OS !== 'android') {
            console.warn('AIVoiceModule: Not available on non-Android platform, skipping event listener setup');
            return;
        }

        // 内部处理函数，用于统一处理接收到的命令
        const handleVoiceCommand = (commandData: any): void => {
            try {
                console.log('AIVoiceModule: Processing voice command data:', commandData);
                
                // 处理命令格式，支持多种输入类型
                let processedCommand: AICommand;
                
                if (typeof commandData === 'string') {
                    // 直接字符串命令，默认为搜索类型
                    processedCommand = {
                        type: 'search',
                        keyword: commandData.trim(),
                    };
                } else if (commandData && typeof commandData === 'object') {
                    // 对象类型命令，解析各字段
                    processedCommand = {
                        type: (commandData?.type || 'search') as AICommandType,
                        action: commandData?.action as any,
                        keyword: String(commandData?.keyword || commandData?.text || commandData?.aiSearch || commandData?.search || '').trim(),
                        playIndex: commandData?.playIndex,
                        fastForward: commandData?.fastForward,
                        fastBackward: commandData?.fastBackward,
                        seekTo: commandData?.seekTo,
                    };
                } else {
                    // 其他类型，转换为字符串
                    processedCommand = {
                        type: 'search',
                        keyword: String(commandData || '').trim(),
                    };
                }
                
                // 只有当关键词不为空时才传递命令
                if (processedCommand.keyword || processedCommand.action) {
                    console.log('AIVoiceModule: Final processed command:', processedCommand);
                    callback(processedCommand);
                } else {
                    console.log('AIVoiceModule: Ignoring empty voice command');
                }
            } catch (error) {
                console.error('AIVoiceModule: Error processing voice command:', error);
            }
        };

        try {
            // 先清理之前的监听器，避免泄漏
            if (_eventListeners) {
                console.log('AIVoiceModule: Cleaning up previous event listeners');
                _eventListeners.forEach(listener => {
                    try {
                        listener.remove();
                    } catch (error) {
                        console.error('AIVoiceModule: Error removing previous listener:', error);
                    }
                });
                _eventListeners = null;
            }
            
            // 尝试多种方式注册回调，确保语音命令能被接收
            let callbackSet = false;
            
            // 方式1：使用eventEmitter监听事件
            if (eventEmitter) {
                console.log('AIVoiceModule: Setting up event listeners');
                
                // 定义所有事件监听器
                const eventListeners: { remove: () => void }[] = [];
                
                // 监听所有可能的语音事件
                const eventNames = [
                    'aiSearch', 'aiControl', 'AIOpenSearch', 'AIOpenControl', 
                    'chineseSearch', 'voiceCommand', 'voice', 'search', 'control'
                ];
                
                eventNames.forEach(eventName => {
                    const listener = eventEmitter.addListener(eventName, (event: any) => {
                        console.log(`AIVoiceModule: Received event '${eventName}':`, event);
                        handleVoiceCommand(event);
                    });
                    eventListeners.push(listener);
                });
                
                // 监听错误事件
                const errorEventListener = eventEmitter.addListener('AIOpenError', (error: any) => {
                    console.error('AIVoiceModule: AI Voice Error:', error);
                });
                eventListeners.push(errorEventListener);
                
                const aiErrorEventListener = eventEmitter.addListener('aiError', (error: any) => {
                    console.error('AIVoiceModule: AI Error:', error);
                });
                eventListeners.push(aiErrorEventListener);
                
                // 存储监听器引用，以便后续清理
                _eventListeners = eventListeners;
                
                console.log('AIVoiceModule: Event listeners registered successfully for events:', eventNames);
                callbackSet = true;
            }
            
            // 方式2：直接使用AIVoiceModule的方法注册回调
            if (AIVoiceModule) {
                // 尝试多种可能的回调方法名
                const callbackMethods = [
                    'setVoiceCommandCallback', 
                    'setCommandCallback', 
                    'setCallback',
                    'registerCallback',
                    'onVoiceCommand'
                ];
                
                for (const methodName of callbackMethods) {
                    if (typeof AIVoiceModule[methodName] === 'function') {
                        console.log(`AIVoiceModule: Using direct method '${methodName}' to set callback`);
                        AIVoiceModule[methodName](handleVoiceCommand);
                        callbackSet = true;
                        break;
                    }
                }
                
                // 额外检查是否有setVoiceCallback方法
                if (typeof AIVoiceModule.setVoiceCallback === 'function') {
                    console.log('AIVoiceModule: Using setVoiceCallback method to set callback');
                    AIVoiceModule.setVoiceCallback(handleVoiceCommand);
                    callbackSet = true;
                }
            }
            
            if (callbackSet) {
                console.log('AIVoiceModule: Voice command callback set successfully using at least one method');
            } else {
                console.error('AIVoiceModule: No valid method to set voice command callback');
                console.error('AIVoiceModule: Voice functionality may be limited');
            }
            
        } catch (error) {
            console.error('AIVoiceModule: Error setting up voice functionality:', error);
            console.error('AIVoiceModule: Voice functionality may be limited, but app will continue to run');
        }
    },
    
    /**
     * 清理事件监听器，避免泄漏
     */
    cleanupEventListeners: (): void => {
        if (Platform.OS !== 'android') {
            return;
        }
        
        try {
            if (_eventListeners) {
                console.log('AIVoiceModule: Cleaning up event listeners');
                _eventListeners.forEach(listener => {
                    try {
                        listener.remove();
                    } catch (error) {
                        console.error('AIVoiceModule: Error removing listener:', error);
                    }
                });
                _eventListeners = null;
            }
        } catch (error) {
            console.error('AIVoiceModule: Error cleaning up event listeners:', error);
        }
    },

  /**
   * 注册广播接收器
   * @returns Promise<void>
   */
  registerBroadcastReceiver: async (): Promise<void> => {
    if (Platform.OS !== 'android' || !AIVoiceModule) {
      return;
    }

    try {
      await AIVoiceModule.registerVideoReceiver();
    } catch (error) {
      console.error('Failed to register broadcast receiver:', error);
    }
  },

  /**
   * 取消注册广播接收器
   * @returns Promise<void>
   */
  unregisterBroadcastReceiver: async (): Promise<void> => {
    if (Platform.OS !== 'android' || !AIVoiceModule) {
      return;
    }

    try {
      await AIVoiceModule.unregisterVideoReceiver();
    } catch (error) {
      console.error('Failed to unregister broadcast receiver:', error);
    }
  },
};

export default AIVoiceService;
