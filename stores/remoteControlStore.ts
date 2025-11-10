import { create } from 'zustand';
import { remoteControlService } from '../services/remoteControlService';
import Logger from '../utils/Logger';
import { Platform } from 'react-native';

const logger = Logger.withTag('RemoteControlStore');

interface RemoteControlState {
  isServerRunning: boolean;
  serverUrl: string | null;
  error: string | null;
  startServer: () => Promise<void>;
  stopServer: () => void;
  isModalVisible: boolean;
  showModal: (targetPage?: string) => void;
  hideModal: () => void;
  lastMessage: string | null;
  targetPage: string | null;
  setMessage: (message: string, targetPage?: string) => void;
  clearMessage: () => void;
}

export const useRemoteControlStore = create<RemoteControlState>((set, get) => ({
  isServerRunning: false,
  serverUrl: null,
  error: null,
  isModalVisible: false,
  lastMessage: null,
  targetPage: null,

  startServer: async () => {
    if (get().isServerRunning) {
      return;
    }
    
    // 在Web平台上禁用远程输入服务器功能
    if (Platform.OS === 'web') {
      const errorMessage = 'Web平台暂不支持远程输入功能';
      logger.error('Cannot start server on web platform:', errorMessage);
      set({ error: errorMessage });
      return;
    }
    
    remoteControlService.init({
      onMessage: (message: string) => {
        logger.debug('Received message:', message);
        const currentState = get();
        // Use the current targetPage from the store
        set({ lastMessage: message, targetPage: currentState.targetPage });
      },
      onHandshake: () => {
        logger.debug('Handshake successful');
        set({ isModalVisible: false })
      },
    });
    try {
      // 确保服务已正确初始化
      if (!remoteControlService) {
        throw new Error('远程控制服务未正确初始化');
      }
      
      // 检查服务是否已经运行
      if (remoteControlService.isRunning()) {
        logger.debug('Remote control service is already running');
        return;
      }
      
      const url = await remoteControlService.startServer();
      logger.info('Server started, URL:', url);
      set({ isServerRunning: true, serverUrl: url, error: null });
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : '启动失败，请强制退应用后重试。';
      logger.error('Failed to start server:', errorMessage);
      set({ error: errorMessage });
    }
  },

  stopServer: () => {
    if (get().isServerRunning) {
      remoteControlService.stopServer();
      set({ isServerRunning: false, serverUrl: null });
    }
  },

  showModal: (targetPage?: string) => set({ isModalVisible: true, targetPage }),
  hideModal: () => set({ isModalVisible: false, targetPage: null }),

  setMessage: (message: string, targetPage?: string) => {
    set({ lastMessage: `${message}_${Date.now()}`, targetPage });
  },

  clearMessage: () => {
    set({ lastMessage: null, targetPage: null });
  },
}));