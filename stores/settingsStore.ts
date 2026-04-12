import { create } from "zustand";
import { SettingsManager } from "@/services/storage";
import { api, ServerConfig } from "@/services/api";
import { storageConfig } from "@/services/storageConfig";
import { proxyService } from "@/services/proxyService";
import AsyncStorage from "@react-native-async-storage/async-storage";
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
      // 根据环境区分API地址
      const defaultUrl = __DEV__ ? "http://192.168.100.101:3000" : "https://onetv.aisxuexi.com";
      api.setBaseUrl(defaultUrl);
      proxyService.setBaseUrl(defaultUrl);
      
      const settings = await SettingsManager.get();
      console.log('Loaded settings:', settings);
      
      // 加载代理配置
      const proxyConfig = await proxyService.getConfig();
      
      set({
        apiBaseUrl: defaultUrl,
        cronPassword: settings.cronPassword || DEFAULT_CRON_PASSWORD,
        m3uUrl: settings.m3uUrl,
        remoteInputEnabled: settings.remoteInputEnabled || false,
        vodProxyEnabled: settings.vodProxyEnabled ?? settings.vodAdBlockEnabled ?? true,
        liveAdBlockEnabled: settings.liveAdBlockEnabled ?? true,
        vodAdBlockEnabled: settings.vodAdBlockEnabled ?? settings.vodProxyEnabled ?? true,
        videoSource: settings.videoSource || {
          enabledAll: true,
          sources: {},
        },
        sourceWeights: settings.sourceWeights || {},
        proxyConfig,
      });
      
      // 尝试获取服务器配置（异步执行，不阻塞主流程）
      get().fetchServerConfig().catch((error) => {
        logger.error("Failed to fetch server config:", error);
      });
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
  setApiBaseUrl: (url) => {
    set({ apiBaseUrl: url });
    api.setBaseUrl(url);
    proxyService.setBaseUrl(url);
  },
  setCronPassword: (password) => set({ cronPassword: password }),
  setM3uUrl: (url) => set({ m3uUrl: url }),
  setRemoteInputEnabled: (enabled) => set({ remoteInputEnabled: enabled }),
  setVodProxyEnabled: (enabled) => set({ vodProxyEnabled: enabled, vodAdBlockEnabled: enabled }),
  setLiveAdBlockEnabled: (enabled) => set({ liveAdBlockEnabled: enabled }),
  setVodAdBlockEnabled: (enabled) => set({ vodAdBlockEnabled: enabled, vodProxyEnabled: enabled }),
  setVideoSource: (config) => set({ videoSource: config }),
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
    
    // 保存代理配置
    await proxyService.saveConfig(proxyConfig);
    
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
