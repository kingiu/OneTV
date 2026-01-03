import { NativeModules, NativeEventEmitter } from 'react-native';

// 检查AIVoice原生模块是否存在
const isAIVoiceAvailable = NativeModules.AIVoice !== undefined;
const AIVoice = NativeModules.AIVoice;

// 只有在原生模块存在时才创建事件发射器
const eventEmitter = isAIVoiceAvailable ? new NativeEventEmitter(AIVoice) : null;

interface VoiceCommand {
  type: string;
  keyword: string;
}

class AIVoiceModule {
  private static instance: AIVoiceModule;
  private commandListeners: ((command: VoiceCommand) => void)[] = [];
  private isInitialized: boolean = false;
  private isAvailable: boolean = isAIVoiceAvailable;

  private constructor() {
    if (!this.isAvailable) {
      console.warn('AIVoiceModule: AIVoice native module is not available');
      return;
    }

    // 注册原生事件监听器
    eventEmitter?.addListener('AISpeechCommand', (event: any) => {
      this.handleVoiceCommand(event);
    });
    console.log('AIVoiceModule initialized successfully');
  }

  public static getInstance(): AIVoiceModule {
    if (!AIVoiceModule.instance) {
      AIVoiceModule.instance = new AIVoiceModule();
    }
    return AIVoiceModule.instance;
  }

  /**
   * 初始化夏杰语音SDK
   * @param appId 应用ID
   */
  public initSDK = async (appId: string): Promise<string> => {
    if (!this.isAvailable) {
      const errorMsg = 'AIVoiceModule: AIVoice native module is not available, cannot initialize SDK';
      console.warn(errorMsg);
      this.isInitialized = false;
      return errorMsg;
    }

    try {
      const result = await AIVoice.initSDK(appId);
      console.log('AIVoice SDK initialized successfully:', result);
      this.isInitialized = true;
      return result;
    } catch (error) {
      console.error('Failed to initialize AIVoice SDK:', error);
      this.isInitialized = false;
      throw error;
    }
  };

  /**
   * 开始语音识别
   */
  public startListening = async (): Promise<string> => {
    if (!this.isAvailable) {
      const errorMsg = 'AIVoiceModule: AIVoice native module is not available, cannot start listening';
      console.warn(errorMsg);
      return errorMsg;
    }

    if (!this.isInitialized) {
      const errorMsg = 'AIVoiceModule: SDK not initialized, cannot start listening';
      console.warn(errorMsg);
      return errorMsg;
    }

    try {
      const result = await AIVoice.startListening();
      console.log('Start listening successfully:', result);
      return result;
    } catch (error) {
      console.error('Failed to start listening:', error);
      throw error;
    }
  };

  /**
   * 停止语音识别
   */
  public stopListening = async (): Promise<string> => {
    if (!this.isAvailable) {
      const errorMsg = 'AIVoiceModule: AIVoice native module is not available, cannot stop listening';
      console.warn(errorMsg);
      return errorMsg;
    }

    try {
      const result = await AIVoice.stopListening();
      console.log('Stop listening successfully:', result);
      return result;
    } catch (error) {
      console.error('Failed to stop listening:', error);
      throw error;
    }
  };

  /**
   * 取消语音识别
   */
  public cancelListening = async (): Promise<string> => {
    if (!this.isAvailable) {
      const errorMsg = 'AIVoiceModule: AIVoice native module is not available, cannot cancel listening';
      console.warn(errorMsg);
      return errorMsg;
    }

    try {
      const result = await AIVoice.cancelListening();
      console.log('Cancel listening successfully:', result);
      return result;
    } catch (error) {
      console.error('Failed to cancel listening:', error);
      throw error;
    }
  };

  /**
   * 添加语音命令监听器
   * @param listener 监听器函数
   */
  public addCommandListener = (listener: (command: VoiceCommand) => void): void => {
    this.commandListeners.push(listener);
    console.log('Added voice command listener. Total listeners:', this.commandListeners.length);
  };

  /**
   * 移除语音命令监听器
   * @param listener 要移除的监听器函数
   */
  public removeCommandListener = (listener: (command: VoiceCommand) => void): void => {
    this.commandListeners = this.commandListeners.filter(l => l !== listener);
    console.log('Removed voice command listener. Total listeners:', this.commandListeners.length);
  };

  /**
   * 处理来自原生模块的语音命令
   * @param event 语音命令事件
   */
  private handleVoiceCommand = (event: any): void => {
    const command: VoiceCommand = {
      type: event.type || '',
      keyword: event.keyword || ''
    };

    console.log('Received voice command from native:', command);
    
    // 通知所有监听器
    if (this.commandListeners.length === 0) {
      console.warn('No listeners for voice command:', command);
    }
    
    this.commandListeners.forEach(listener => {
      try {
        listener(command);
      } catch (error) {
        console.error('Error in voice command listener:', error);
      }
    });
  };
}

// 初始化单例实例
const instance = AIVoiceModule.getInstance();
console.log('AIVoiceModule exported instance:', instance);

export default instance;