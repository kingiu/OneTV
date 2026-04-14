import AsyncStorage from "@react-native-async-storage/async-storage";
import { create } from "zustand";

import { api } from "@/services/api";
import { proxyService } from "@/services/proxyService";
import { SettingsManager } from "@/services/storage";
import { storageConfig } from "@/services/storageConfig";
import { type ServerConfig } from "@/services/types";
import Logger from "@/utils/Logger";

const logger = Logger.withTag("SettingsStore");
const DEFAULT_CRON_PASSWORD = "cron_secure_password";

interface ProxyConfig {
  enabled: boolean;
  useBackendProxy: boolean;
  proxyUrl?: string;
  cacheEnabled: boolean;
  cacheTTL: number;
}

interface SourceWeight {
  [sourceKey: string]: number;
}

interface SettingsState {
  apiBaseUrl: string;
  cronPassword: string;
  m3uUrl: string;
  remoteInputEnabled: boolean;
  vodProxyEnabled: boolean;
  liveAdBlockEnabled: boolean;
  vodAdBlockEnabled: boolean;
  videoSource: {
    enabledAll: boolean;
    sources: {
      [key: string]: boolean;
    };
  };
  sourceWeights: SourceWeight;
  proxyConfig: ProxyConfig;
  isModalVisible: boolean;
  serverConfig: ServerConfig | null;
  isLoadingServerConfig: boolean;
  loadSettings: () => Promise<void>;
  checkBackendAndSyncProxyConfig: () => Promise<void>;
  fetchServerConfig: () => Promise<void>;
  setApiBaseUrl: (url: string) => void;
  setCronPassword: (password: string) => void;
  setM3uUrl: (url: string) => void;
  setRemoteInputEnabled: (enabled: boolean) => void;
  setVodProxyEnabled: (enabled: boolean) => void;
  setLiveAdBlockEnabled: (enabled: boolean) => void;
  setVodAdBlockEnabled: (enabled: boolean) => void;
  setProxyConfig: (config: Partial<ProxyConfig>) => void;
  saveSettings: () => Promise<void>;
  setVideoSource: (config: { enabledAll: boolean; sources: { [key: string]: boolean } }) => void;
  setSourceWeight: (sourceKey: string, weight: number) => void;
  showModal: () => void;
  hideModal: () => void;
}

export const useSettingsStore = create<SettingsState>((set, get) => ({
  apiBaseUrl: "https://onetv.aisxuexi.com",
  cronPassword: DEFAULT_CRON_PASSWORD,
  m3uUrl: "",
  remoteInputEnabled: false,
  vodProxyEnabled: true,
  liveAdBlockEnabled: true,
  vodAdBlockEnabled: true,
  isModalVisible: false,
  serverConfig: null,
  isLoadingServerConfig: false,
  videoSource: {
    enabledAll: true,
    sources: {},
  },
  sourceWeights: {},
  proxyConfig: {
    enabled: true,
    useBackendProxy: true,
    cacheEnabled: true,
    cacheTTL: 3600,
  },
  loadSettings: async () => {
    const defaultUrl = __DEV__ ? "http://192.168.100.101:3000" : "https://onetv.aisxuexi.com";

    // 检查是否有保存的设置
    try {
      const settingsJson = await AsyncStorage.getItem('mytv_settings');
      if (settingsJson) {
        const settings = JSON.parse(settingsJson);
        console.log('Loaded settings from storage:', settings);

        // 使用保存的 API 地址
        const apiUrl = settings.apiBaseUrl || defaultUrl;
        api.setBaseUrl(apiUrl);
        proxyService.setBaseUrl(apiUrl);

        // 使用默认的代理配置
        const proxyConfig = {
          enabled: true,
          useBackendProxy: true,
          cacheEnabled: true,
          cacheTTL: 3600,
        };

        set({
          apiBaseUrl: apiUrl,
          cronPassword: settings.cronPassword || DEFAULT_CRON_PASSWORD,
          m3uUrl: settings.m3uUrl || '',
          remoteInputEnabled: settings.remoteInputEnabled || false,
          vodProxyEnabled: settings.vodProxyEnabled ?? settings.vodAdBlockEnabled ?? true,
          liveAdBlockEnabled: settings.liveAdBlockEnabled ?? true,
          vodAdBlockEnabled: settings.vodAdBlockEnabled ?? settings.vodProxyEnabled ?? true,
          videoSource: settings.videoSource || {
            enabledAll: true,
            sources: {},
          },
          sourceWeights: settings.sourceWeights || {},
          proxyConfig: proxyConfig,
        });
      } else {
        // 没有保存的设置，使用当前环境的默认值
        console.log('No saved settings, using default for environment:', defaultUrl);
        api.setBaseUrl(defaultUrl);
        proxyService.setBaseUrl(defaultUrl);

        // 使用默认的代理配置
        const proxyConfig = {
          enabled: true,
          useBackendProxy: true,
          cacheEnabled: true,
          cacheTTL: 3600,
        };

        set({
          apiBaseUrl: defaultUrl,
          cronPassword: DEFAULT_CRON_PASSWORD,
          m3uUrl: '',
          remoteInputEnabled: false,
          vodProxyEnabled: true,
          liveAdBlockEnabled: true,
          vodAdBlockEnabled: true,
          videoSource: {
            enabledAll: true,
            sources: {},
          },
          sourceWeights: {},
          proxyConfig: proxyConfig,
        });
      }
    } catch (error) {
      // 读取设置失败，使用当前环境的默认值
      console.error('Failed to load settings:', error);
      api.setBaseUrl(defaultUrl);
      proxyService.setBaseUrl(defaultUrl);

      // 使用默认的代理配置
      const proxyConfig = {
        enabled: true,
        useBackendProxy: true,
        cacheEnabled: true,
        cacheTTL: 3600,
      };

      set({
        apiBaseUrl: defaultUrl,
        cronPassword: DEFAULT_CRON_PASSWORD,
        m3uUrl: '',
        remoteInputEnabled: false,
        vodProxyEnabled: true,
        liveAdBlockEnabled: true,
        vodAdBlockEnabled: true,
        videoSource: {
          enabledAll: true,
          sources: {},
        },
        sourceWeights: {},
        proxyConfig: proxyConfig,
      });
    }

    get().checkBackendAndSyncProxyConfig();

    get().fetchServerConfig().catch((error) => {
      logger.error("Failed to fetch server config:", error);
    });
  },
  checkBackendAndSyncProxyConfig: async () => {
    const state = get();
    const { apiBaseUrl } = state;

    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 5000);

      const response = await fetch(`${apiBaseUrl}/api/health`, {
        method: 'GET',
        signal: controller.signal,
      });

      clearTimeout(timeoutId);

      const isBackendAvailable = response.ok;
      console.log(`Backend health check: ${isBackendAvailable ? 'available' : 'unavailable'}`);

      if (!isBackendAvailable && state.proxyConfig.useBackendProxy) {
        console.warn('Backend unavailable, auto-disabling proxy');
        state.setProxyConfig({ enabled: false });
      } else if (isBackendAvailable && !state.proxyConfig.enabled && state.vodProxyEnabled) {
        console.log('Backend available, re-enabling proxy');
        state.setProxyConfig({ enabled: true });
      }
    } catch (error) {
      console.log('Backend health check failed:', error instanceof Error ? error.message : String(error));
      if (state.proxyConfig.useBackendProxy && state.proxyConfig.enabled) {
        console.warn('Auto-disabling proxy due to backend error');
        state.setProxyConfig({ enabled: false });
      }
    }
  },
  fetchServerConfig: async () => {
    set({ isLoadingServerConfig: true });
    try {
      const config = await api.getServerConfig();
      if (config) {
        storageConfig.setStorageType(config.StorageType);
        set({ serverConfig: config });
      } else {
        throw new Error("Server config is null");
      }
    } catch (error) {
      set({ serverConfig: null });
      logger.error("Failed to fetch server config:", error);
      throw error; // 重新抛出错误，让调用者知道发生了错误
    } finally {
      set({ isLoadingServerConfig: false });
    }
  },
  setApiBaseUrl: async (url) => {
    set({ apiBaseUrl: url });
    api.setBaseUrl(url);
    proxyService.setBaseUrl(url);

    get().checkBackendAndSyncProxyConfig();
  },
  setCronPassword: (password) => set({ cronPassword: password }),
  setM3uUrl: (url) => set({ m3uUrl: url }),
  setRemoteInputEnabled: (enabled) => set({ remoteInputEnabled: enabled }),
  setVodProxyEnabled: (enabled) => set({ vodProxyEnabled: enabled, vodAdBlockEnabled: enabled }),
  setLiveAdBlockEnabled: (enabled) => set({ liveAdBlockEnabled: enabled }),
  setVodAdBlockEnabled: (enabled) => set({ vodAdBlockEnabled: enabled, vodProxyEnabled: enabled }),
  setVideoSource: async (config) => {
    set({ videoSource: config });

    // 同步视频源设置到后端
    try {
      const { enabledAll, sources } = config;

      if (!enabledAll && Object.keys(sources).length > 0) {
        // 如果不是启用所有源，则将启用的源转换为 enabledApis 数组
        const enabledApis = Object.keys(sources).filter(key => sources[key] === true);
        console.log('Syncing video source to backend, enabledApis:', enabledApis);

        await api.updateVideoSource(enabledApis);
        logger.info('Successfully synced video source to backend');
      } else {
        // 如果启用所有源，清空 enabledApis（表示无限制）
        console.log('Syncing video source to backend, enabledAll=true, clearing enabledApis');

        await api.updateVideoSource([]);
        logger.info('Successfully synced video source to backend (all sources enabled)');
      }
    } catch (error) {
      logger.error('Failed to sync video source to backend:', error);
      // 不抛出错误，避免影响前端设置
    }
  },
  setSourceWeight: (sourceKey: string, weight: number) => {
    set((state) => ({
      sourceWeights: { ...state.sourceWeights, [sourceKey]: weight },
    }));
  },
  setProxyConfig: (config) => {
    set((state) => ({
      proxyConfig: { ...state.proxyConfig, ...config },
    }));
  },
  saveSettings: async () => {
    const {
      apiBaseUrl,
      cronPassword,
      m3uUrl,
      remoteInputEnabled,
      vodProxyEnabled,
      liveAdBlockEnabled,
      vodAdBlockEnabled,
      videoSource,
      sourceWeights,
      proxyConfig,
    } = get();
    const currentSettings = await SettingsManager.get();
    const currentApiBaseUrl = currentSettings.apiBaseUrl;
    let processedApiBaseUrl = apiBaseUrl.trim();
    if (processedApiBaseUrl) {
      if (processedApiBaseUrl.endsWith("/")) {
        processedApiBaseUrl = processedApiBaseUrl.slice(0, -1);
      }

      if (!/^https?:\/\//i.test(processedApiBaseUrl)) {
        const hostPart = processedApiBaseUrl.split("/")[0];
        // Simple check for IP address format.
        const isIpAddress = /^((\d{1,3}\.){3}\d{1,3})(:\d+)?$/.test(hostPart);
        // Check if the domain includes a port.
        const hasPort = /:\d+/.test(hostPart);

        if (isIpAddress || hasPort) {
          processedApiBaseUrl = "http://" + processedApiBaseUrl;
        } else {
          processedApiBaseUrl = "https://" + processedApiBaseUrl;
        }
      }
    }

    await SettingsManager.save({
      apiBaseUrl: processedApiBaseUrl,
      cronPassword: cronPassword.trim(),
      m3uUrl,
      remoteInputEnabled,
      vodProxyEnabled,
      liveAdBlockEnabled,
      vodAdBlockEnabled,
      videoSource,
      sourceWeights,
    });

    // 代理配置不需要单独保存，因为 proxyService 是内存中的单例
    // 如果需要持久化代理配置，可以将其添加到 SettingsManager 中

    if (currentApiBaseUrl !== processedApiBaseUrl) {
      // 清除登录凭证，但不清除 authCookies，因为服务端可能已经返回了有效的 cookie
      try {
        await AsyncStorage.removeItem("mytv_login_credentials");
      } catch (storageError) {
        logger.error("Failed to clear login credentials:", storageError);
      }
      // 不再清除 authCookies，因为服务端可能已经返回了有效的 cookie
    }
    api.setBaseUrl(processedApiBaseUrl);
    proxyService.setBaseUrl(processedApiBaseUrl);
    // Also update the URL in the state so the input field shows the processed URL
    set({ isModalVisible: false, apiBaseUrl: processedApiBaseUrl });
    // 尝试获取服务器配置，但即使失败也不影响设置保存
    try {
      await get().fetchServerConfig();
    } catch (error) {
      logger.error("Failed to fetch server config after saving settings:", error);
      // 不抛出错误，允许设置保存成功
    }
  },
  showModal: () => set({ isModalVisible: true }),
  hideModal: () => set({ isModalVisible: false }),
}));
