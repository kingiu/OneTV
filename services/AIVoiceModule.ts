import { NativeModules, NativeEventEmitter, Platform } from 'react-native';

class AIVoiceModule {
  private static instance: AIVoiceModule;
  private eventEmitter: NativeEventEmitter | null = null;
  private listeners: Map<string, Function> = new Map();
  private commandCallback: ((command: any) => void) | null = null;
  private AIOpenModule: any = null;
  private isInitialized: boolean = false;
  private isInitializing: boolean = false;

  private constructor() {
    console.log('AIVoiceModule: Constructor called');
    // 延迟初始化，不在构造函数中立即初始化NativeModules
  }

  public static getInstance(): AIVoiceModule {
    if (!AIVoiceModule.instance) {
      AIVoiceModule.instance = new AIVoiceModule();
    }
    return AIVoiceModule.instance;
  }

  // 延迟初始化方法
  private async initialize(): Promise<boolean> {
    if (this.isInitialized) {
      console.log('AIVoiceModule: Already initialized');
      return true;
    }
    
    if (this.isInitializing) {
      console.log('AIVoiceModule: Already initializing');
      return false;
    }
    
    try {
      this.isInitializing = true;
      console.log('AIVoiceModule: Initializing...');
      
      if (Platform.OS !== 'android') {
        console.log('AIVoiceModule: Not running on Android, skipping initialization');
        this.isInitialized = true;
        return true;
      }
      
      console.log('AIVoiceModule: Running on Android platform');
      
      // 安全检查NativeModules是否可用
      if (typeof NativeModules === 'undefined') {
        console.error('AIVoiceModule: NativeModules is undefined');
        return false;
      }
      
      console.log('AIVoiceModule: NativeModules is available');
      
      // 修复模块名称：使用正确的模块名称 AISpeechModule
      // 安全访问，避免直接访问不存在的属性导致崩溃
      this.AIOpenModule = NativeModules.AISpeechModule || null;
      
      if (this.AIOpenModule) {
        console.log('AIVoiceModule: AISpeechModule reference obtained');
        console.log('AIVoiceModule: AISpeechModule typeof:', typeof this.AIOpenModule);
        
        // 检查AISpeechModule模块的方法
        try {
          const methods = Object.keys(this.AIOpenModule);
          console.log('AIVoiceModule: AISpeechModule enumerable properties:', methods);
          console.log('AIVoiceModule: AISpeechModule has enumerable properties:', methods.length > 0);
        } catch (error) {
          console.error('AIVoiceModule: Error getting AISpeechModule methods:', error);
        }
        
        // 创建事件发射器
        try {
          this.eventEmitter = new NativeEventEmitter(this.AIOpenModule);
          console.log('AIVoiceModule: eventEmitter created successfully');
        } catch (error) {
          console.error('AIVoiceModule: Error creating event emitter:', error);
          this.eventEmitter = null;
        }
        
        console.log('AIVoiceModule: Chinese voice engine initialized successfully');
        this.isInitialized = true;
        return true;
      } else {
        console.error('AIVoiceModule: Failed to get AISpeechModule reference');
        return false;
      }
    } catch (error) {
      console.error('AIVoiceModule: Error initializing Chinese voice engine:', error);
      return false;
    } finally {
      this.isInitializing = false;
    }
  }

  // 设置命令回调
  public setCommandCallback(callback: (command: any) => void): void {
    this.commandCallback = callback;
    console.log('AIVoiceModule: Command callback set successfully');
  }

  // 注册视频应用
  public async registerVideoApp(): Promise<boolean> {
    try {
      console.log('AIVoiceModule: registerVideoApp called');
      
      // 首先确保模块已经初始化
      const initialized = await this.initialize();
      if (!initialized) {
        console.error('AIVoiceModule: Failed to initialize, cannot register app');
        return false;
      }
      
      if (!this.AIOpenModule) {
        console.error('AIVoiceModule: AIOpenModule is not available');
        return false;
      }
      
      // 检查AIOpenModule是否有registerApp方法
      if (typeof this.AIOpenModule.registerApp === 'function') {
        console.log('AIVoiceModule: Calling registerApp method');
        try {
          // 修复方法名称和参数：使用registerApp，需要packageName和category参数
          await this.AIOpenModule.registerApp('com.onetv', 'video');
          console.log('AIVoiceModule: registerApp method completed successfully');
        } catch (error) {
          console.error('AIVoiceModule: Error calling registerApp method:', error);
          // 继续执行，不影响后续步骤
        }
      } else {
        console.log('AIVoiceModule: registerApp method not available, skipping');
      }
      
      // 检查AIOpenModule是否有startService方法
      if (typeof this.AIOpenModule.startService === 'function') {
        console.log('AIVoiceModule: Calling startService method');
        try {
          // 调用startService方法启动语音服务
          await this.AIOpenModule.startService();
          console.log('AIVoiceModule: startService method completed successfully');
        } catch (error) {
          console.error('AIVoiceModule: Error calling startService method:', error);
          // 继续执行，不影响后续步骤
        }
      } else {
        console.log('AIVoiceModule: startService method not available, skipping');
      }
      
      // 注册事件监听器
      this.registerEventListeners();
      
      console.log('AIVoiceModule: registerVideoApp completed successfully');
      return true;
    } catch (error) {
      console.error('AIVoiceModule: registerVideoApp failed:', error);
      return false;
    }
  }

  // 注销视频接收器
  public async unregisterVideoReceiver(): Promise<void> {
    try {
      if (!this.isInitialized) {
        console.log('AIVoiceModule: Not initialized, skipping unregister');
        return;
      }
      
      if (!this.AIOpenModule) {
        console.error('AIVoiceModule: AIOpenModule is not available');
        return;
      }
      
      // 检查unregisterVideoReceiver方法是否存在
      if (typeof this.AIOpenModule.unregisterVideoReceiver === 'function') {
        console.log('AIVoiceModule: Calling unregisterVideoReceiver method');
        try {
          await this.AIOpenModule.unregisterVideoReceiver();
          console.log('AIVoiceModule: unregisterVideoReceiver method completed successfully');
        } catch (error) {
          console.error('AIVoiceModule: Error calling unregisterVideoReceiver method:', error);
          // 继续执行，不影响后续步骤
        }
      } else {
        console.log('AIVoiceModule: unregisterVideoReceiver method not available, skipping');
      }
      
      // 检查是否有stopService方法
      if (typeof this.AIOpenModule.stopService === 'function') {
        console.log('AIVoiceModule: Calling stopService method');
        try {
          await this.AIOpenModule.stopService();
          console.log('AIVoiceModule: stopService method completed successfully');
        } catch (error) {
          console.error('AIVoiceModule: Error calling stopService method:', error);
          // 继续执行，不影响后续步骤
        }
      } else {
        console.log('AIVoiceModule: stopService method not available, skipping');
      }
    } catch (error) {
      console.error('AIVoiceModule: unregisterVideoReceiver failed:', error);
    }
  }

  // 注册事件监听器
  private registerEventListeners(): void {
    if (!this.eventEmitter) {
      console.error('AIVoiceModule: eventEmitter is not available');
      return;
    }
    
    // 先清理现有的监听器，避免重复注册
    this.cleanupEventListeners();
    
    // 监听的事件类型 - 匹配原生代码发送的事件名称
    const events = ['AISpeechCommand', 'aiSearch', 'aiControl', 'AIOpenSearch', 'AIOpenControl', 'chineseSearch', 'voiceCommand', 'AIOpenError', 'aiError'];
    
    events.forEach(event => {
      try {
        const listener = this.eventEmitter!.addListener(event, (data: any) => {
          console.log(`AIVoiceModule: Received event ${event} with data:`, data);
          this.handleEvent(event, data);
        });
        this.listeners.set(event, listener.remove);
      } catch (error) {
        console.error(`AIVoiceModule: Error adding listener for event ${event}:`, error);
      }
    });
    
    console.log('AIVoiceModule: Event listeners registered successfully');
    console.log('AIVoiceModule: Listening for events:', events);
  }

  // 处理事件
  private handleEvent(event: string, data: any): void {
    try {
      if (!this.commandCallback) {
        console.log('AIVoiceModule: No command callback set, ignoring event');
        return;
      }
      
      let command = null;
      
      // 根据事件类型处理数据
      switch (event) {
        case 'AISpeechCommand':
          // 处理原生代码发送的AISpeechCommand事件
          console.log('AIVoiceModule: Handling AISpeechCommand event with data:', data);
          if (typeof data === 'string') {
            // 处理"search:关键词"格式的数据
            if (data.startsWith('search:')) {
              // 提取关键词，例如："search:变形金刚" -> "变形金刚"
              const keyword = data.substring(7).trim();
              command = {
                type: 'search',
                keyword: keyword
              };
            } else if (data.includes('搜索') || data.includes('找') || data.includes('播放')) {
              // 提取关键词，例如："搜索电影" -> "电影"
              const keyword = data.replace(/搜索|找|播放/g, '').trim();
              command = {
                type: 'search',
                keyword: keyword
              };
            } else {
              // 其他命令作为control类型
              command = {
                type: 'control',
                action: data
              };
            }
          } else if (typeof data === 'object') {
            // 如果是对象，直接使用
            command = data;
          }
          break;
        case 'aiSearch':
        case 'AIOpenSearch':
        case 'chineseSearch':
          // 处理搜索事件，data可能是字符串或对象
          let searchKeyword = '';
          if (typeof data === 'string') {
            // 直接使用字符串作为关键词
            searchKeyword = data;
          } else if (typeof data === 'object') {
            // 从对象中提取关键词
            searchKeyword = data.keyword || data.content || '';
          }
          command = {
            type: 'search',
            keyword: searchKeyword
          };
          break;
        case 'aiControl':
        case 'AIOpenControl':
          // 处理控制事件，data可能是字符串或对象
          let controlAction = '';
          if (typeof data === 'string') {
            // 直接使用字符串作为动作
            controlAction = data;
          } else if (typeof data === 'object') {
            // 从对象中提取动作
            controlAction = data.action || data.command || '';
          }
          command = {
            type: 'control',
            action: controlAction
          };
          break;
        case 'voiceCommand':
          // 处理通用语音命令
          command = typeof data === 'string' ? { type: 'control', action: data } : data;
          break;
        case 'AIOpenError':
        case 'aiError':
          console.error('AIVoiceModule: Received error event:', event, data);
          return;
        default:
          console.log('AIVoiceModule: Unknown event type:', event);
          return;
      }
      
      if (command) {
        console.log('AIVoiceModule: Calling command callback with command:', command);
        this.commandCallback(command);
      }
    } catch (error) {
      console.error('AIVoiceModule: Error handling event:', error);
    }
  }

  // 清理事件监听器
  public cleanupEventListeners(): void {
    console.log('AIVoiceModule: Cleaning up event listeners');
    this.listeners.forEach((removeListener, event) => {
      try {
        removeListener();
        console.log(`AIVoiceModule: Removed listener for event:`, event);
      } catch (error) {
        console.error(`AIVoiceModule: Error removing listener for event ${event}:`, error);
      }
    });
    this.listeners.clear();
    // 不要清除commandCallback，避免后续事件无法处理
    // this.commandCallback = null;
    console.log('AIVoiceModule: Event listeners cleanup completed');
  }
}

export default AIVoiceModule.getInstance();