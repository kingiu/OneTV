import NetInfo from '@react-native-community/netinfo';
import Logger from './Logger';

const logger = Logger.withTag('NetworkMonitor');

export class NetworkMonitor {
  private static instance: NetworkMonitor;
  private isConnected: boolean = true;
  private connectionType: string | null = null;
  private listeners: Array<(isConnected: boolean, connectionType: string | null) => void> = [];

  private constructor() {
    this.setupListeners();
  }

  static getInstance(): NetworkMonitor {
    if (!NetworkMonitor.instance) {
      NetworkMonitor.instance = new NetworkMonitor();
    }
    return NetworkMonitor.instance;
  }

  private setupListeners() {
    NetInfo.addEventListener(state => {
      const wasConnected = this.isConnected;
      const oldConnectionType = this.connectionType;
      
      this.isConnected = state.isConnected || false;
      this.connectionType = state.type;
      
      // 只有当网络状态发生变化时才通知监听器
      if (wasConnected !== this.isConnected || oldConnectionType !== this.connectionType) {
        logger.info(`[NETWORK] Status changed: connected=${this.isConnected}, type=${this.connectionType}`);
        this.notifyListeners();
      }
    });
  }

  private notifyListeners() {
    this.listeners.forEach(listener => {
      try {
        listener(this.isConnected, this.connectionType);
      } catch (error) {
        logger.error('[NETWORK] Error in network status listener:', error);
      }
    });
  }

  /**
   * 获取当前网络连接状态
   * @returns 是否连接到网络
   */
  getIsConnected(): boolean {
    return this.isConnected;
  }

  /**
   * 获取当前网络连接类型
   * @returns 网络连接类型 (wifi, cellular, none, etc.)
   */
  getConnectionType(): string | null {
    return this.connectionType;
  }

  /**
   * 根据网络类型获取推荐的播放质量
   * @returns 推荐的播放质量
   */
  getOptimalPlaybackQuality(): 'high' | 'medium' | 'low' {
    if (!this.isConnected) {
      return 'low';
    }
    
    switch (this.connectionType) {
      case 'wifi':
        return 'high';
      case 'cellular':
        // 可以根据网络强度进一步调整
        return 'medium';
      default:
        return 'low';
    }
  }

  /**
   * 添加网络状态变化监听器
   * @param listener 网络状态变化时的回调函数
   * @returns 用于移除监听器的函数
   */
  addListener(listener: (isConnected: boolean, connectionType: string | null) => void): () => void {
    this.listeners.push(listener);
    
    // 立即通知监听器当前网络状态
    listener(this.isConnected, this.connectionType);
    
    // 返回移除监听器的函数
    return () => {
      this.listeners = this.listeners.filter(l => l !== listener);
    };
  }

  /**
   * 检查网络连接是否稳定
   * @returns 网络连接是否稳定
   */
  async isNetworkStable(): Promise<boolean> {
    try {
      const state = await NetInfo.fetch();
      return state.isConnected || false;
    } catch (error) {
      logger.error('[NETWORK] Error checking network stability:', error);
      return false;
    }
  }
}

export default NetworkMonitor.getInstance();
