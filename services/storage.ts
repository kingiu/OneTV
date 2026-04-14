import AsyncStorage from "@react-native-async-storage/async-storage";

import Logger from "@/utils/Logger";

import { api } from "./api";
import { storageConfig } from "./storageConfig";
import { type PlayRecord, type Favorite } from "./types";

const logger = Logger.withTag("Storage");

// --- Storage Keys ---
const STORAGE_KEYS = {
  SETTINGS: "mytv_settings",
  PLAYER_SETTINGS: "mytv_player_settings",
  FAVORITES: "mytv_favorites",
  LIVE_FAVORITES: "mytv_live_favorites",
  PLAY_RECORDS: "mytv_play_records",
  SEARCH_HISTORY: "mytv_search_history",
} as const;

export interface PlayerSettings {
  introEndTime?: number;
  outroStartTime?: number;
  playbackRate?: number;
  videoQuality?: 'high' | 'medium' | 'low';
}

export interface AppSettings {
  apiBaseUrl: string;
  cronPassword?: string;
  vodProxyEnabled?: boolean;
  remoteInputEnabled: boolean;
  liveAdBlockEnabled: boolean;
  vodAdBlockEnabled: boolean;
  videoSource: {
    enabledAll: boolean;
    sources: {
      [key: string]: boolean;
    };
  };
  sourceWeights?: {
    [key: string]: number;
  };
  m3uUrl: string;
}

export interface LoginCredentials {
  username: string;
  password: string;
}

export interface LiveFavorite {
  source: string;
  channelId: string;
  tvgId?: string;
  name: string;
  logo?: string;
  group?: string;
  url?: string;
  save_time?: number;
}

// --- Helper ---
const generateKey = (source: string, id: string) => `${source}+${id}`;

/**
 * 安全的存储操作函数，处理存储操作中的错误
 * @param operation 存储操作函数
 * @param fallback 出错时的默认返回值
 * @returns 存储操作的结果或默认值
 */
export const safeStorageOperation = async <T>(
  operation: () => Promise<T>,
  fallback: T
): Promise<T> => {
  try {
    return await operation();
  } catch (error) {
    logger.error(`Storage operation failed: ${error}`);
    return fallback;
  }
};

// --- PlayerSettingsManager (Uses AsyncStorage) ---
export class PlayerSettingsManager {
  static async getAll(): Promise<Record<string, PlayerSettings>> {
    return safeStorageOperation(async () => {
      const data = await AsyncStorage.getItem(STORAGE_KEYS.PLAYER_SETTINGS);
      return data ? JSON.parse(data) : {};
    }, {});
  }

  static async get(source: string, id: string): Promise<PlayerSettings | null> {
    const perfStart = performance.now();
    logger.info(`[PERF] PlayerSettingsManager.get START - source: ${source}, id: ${id}`);

    const allSettings = await this.getAll();
    const result = allSettings[generateKey(source, id)] || null;

    const perfEnd = performance.now();
    logger.info(
      `[PERF] PlayerSettingsManager.get END - took ${(perfEnd - perfStart).toFixed(2)}ms, found: ${!!result}`
    );

    return result;
  }

  static async save(source: string, id: string, settings: PlayerSettings): Promise<void> {
    await safeStorageOperation(async () => {
      const allSettings = await this.getAll();
      const key = generateKey(source, id);
      // Only save if there are actual values to save
      if (
        settings.introEndTime !== undefined ||
        settings.outroStartTime !== undefined ||
        settings.playbackRate !== undefined
      ) {
        allSettings[key] = { ...allSettings[key], ...settings };
      } else {
        // If all are undefined, remove the key
        delete allSettings[key];
      }
      await AsyncStorage.setItem(STORAGE_KEYS.PLAYER_SETTINGS, JSON.stringify(allSettings));
    }, undefined);
  }

  static async remove(source: string, id: string): Promise<void> {
    await safeStorageOperation(async () => {
      const allSettings = await this.getAll();
      delete allSettings[generateKey(source, id)];
      await AsyncStorage.setItem(STORAGE_KEYS.PLAYER_SETTINGS, JSON.stringify(allSettings));
    }, undefined);
  }

  static async clearAll(): Promise<void> {
    await safeStorageOperation(async () => {
      await AsyncStorage.removeItem(STORAGE_KEYS.PLAYER_SETTINGS);
    }, undefined);
  }
}

// --- FavoriteManager (Dynamic: API or LocalStorage) ---
export class FavoriteManager {
  private static getStorageType() {
    return storageConfig.getStorageType();
  }

  static async getAll(): Promise<Record<string, Favorite>> {
    const storageType = this.getStorageType();

    // 始终从本地存储获取收藏，确保能够显示
    let favorites: Record<string, Favorite> = {};
    try {
      const data = await AsyncStorage.getItem(STORAGE_KEYS.FAVORITES);
      favorites = data ? JSON.parse(data) : {};
    } catch (error) {
      logger.info("Failed to get all local favorites:", error);
      favorites = {};
    }

    // 如果存储类型不是本地存储，也尝试从 API 获取收藏
    if (storageType && storageType !== "localstorage") {
      try {
        const apiData = await api.getFavorites();
        // 合并 API 数据和本地数据，优先使用 API 数据
        // 只有当 API 数据不为空时才合并，避免覆盖本地数据
        if (Object.keys(apiData).length > 0) {
          favorites = { ...favorites, ...apiData };
        }
      } catch (error) {
        logger.info("Failed to get favorites from API:", error);
        // 继续使用本地数据
      }
    }

    return favorites;
  }

  static async save(source: string, id: string, item: Favorite): Promise<void> {
    const key = generateKey(source, id);
    const storageType = this.getStorageType();

    // 始终保存到本地存储，确保收藏能够显示
    await safeStorageOperation(async () => {
      const allFavorites = await this.getAllLocal();
      allFavorites[key] = { ...item, save_time: Date.now() };
      await AsyncStorage.setItem(STORAGE_KEYS.FAVORITES, JSON.stringify(allFavorites));
    }, undefined);

    // 如果存储类型不是本地存储，也尝试保存到 API
    if (storageType && storageType !== "localstorage") {
      try {
        await api.addFavorite(key, item);
      } catch (error) {
        logger.info("Failed to save favorite to API:", error);
      }
    }
  }

  // 从本地存储获取所有收藏
  static async getAllLocal(): Promise<Record<string, Favorite>> {
    return safeStorageOperation(async () => {
      const data = await AsyncStorage.getItem(STORAGE_KEYS.FAVORITES);
      return data ? JSON.parse(data) : {};
    }, {});
  }

  static async remove(source: string, id: string): Promise<void> {
    const key = generateKey(source, id);
    const storageType = this.getStorageType();
    // 如果 storageType 未设置或不是 "localstorage"，默认使用本地存储
    if (!storageType || storageType === "localstorage") {
      await safeStorageOperation(async () => {
        const allFavorites = await this.getAll();
        delete allFavorites[key];
        await AsyncStorage.setItem(STORAGE_KEYS.FAVORITES, JSON.stringify(allFavorites));
      }, undefined);
      return;
    }
    try {
      await api.deleteFavorite(key);
    } catch (error) {
      logger.info("Failed to delete favorite from API:", error);
    }
  }

  static async isFavorited(source: string, id: string): Promise<boolean> {
    const key = generateKey(source, id);
    const storageType = this.getStorageType();
    // 如果 storageType 未设置或不是 "localstorage"，默认使用本地存储
    if (!storageType || storageType === "localstorage") {
      const allFavorites = await this.getAll();
      return !!allFavorites[key];
    }
    const favorites = await api.getFavorites();
    return !!favorites[key];
  }

  static async toggle(source: string, id: string, item: Favorite): Promise<boolean> {
    const isFav = await this.isFavorited(source, id);
    if (isFav) {
      await this.remove(source, id);
      return false;
    } else {
      await this.save(source, id, item);
      return true;
    }
  }

  static async clearAll(): Promise<void> {
    const storageType = this.getStorageType();
    // 如果 storageType 未设置或不是 "localstorage"，默认使用本地存储
    if (!storageType || storageType === "localstorage") {
      await safeStorageOperation(async () => {
        await AsyncStorage.removeItem(STORAGE_KEYS.FAVORITES);
      }, undefined);
      return;
    }
    try {
      await api.deleteFavorite();
    } catch (error) {
      logger.info("Failed to clear all favorites from API:", error);
    }
  }
}

// --- LiveFavoriteManager (Uses AsyncStorage) ---
export class LiveFavoriteManager {
  static async getAll(): Promise<Record<string, LiveFavorite>> {
    return safeStorageOperation(async () => {
      const data = await AsyncStorage.getItem(STORAGE_KEYS.LIVE_FAVORITES);
      return data ? JSON.parse(data) : {};
    }, {});
  }

  static async getBySource(source: string): Promise<Record<string, LiveFavorite>> {
    const allFavorites = await this.getAll();
    return Object.fromEntries(Object.entries(allFavorites).filter(([key]) => key.startsWith(`${source}+`)));
  }

  static async isFavorited(source: string, channelId: string): Promise<boolean> {
    const allFavorites = await this.getAll();
    return !!allFavorites[generateKey(source, channelId)];
  }

  static async save(source: string, channelId: string, item: Omit<LiveFavorite, "save_time">): Promise<void> {
    await safeStorageOperation(async () => {
      const allFavorites = await this.getAll();
      allFavorites[generateKey(source, channelId)] = { ...item, save_time: Date.now() };
      await AsyncStorage.setItem(STORAGE_KEYS.LIVE_FAVORITES, JSON.stringify(allFavorites));
    }, undefined);
  }

  static async remove(source: string, channelId: string): Promise<void> {
    await safeStorageOperation(async () => {
      const allFavorites = await this.getAll();
      delete allFavorites[generateKey(source, channelId)];
      await AsyncStorage.setItem(STORAGE_KEYS.LIVE_FAVORITES, JSON.stringify(allFavorites));
    }, undefined);
  }

  static async toggle(source: string, channelId: string, item: Omit<LiveFavorite, "save_time">): Promise<boolean> {
    const isFav = await this.isFavorited(source, channelId);
    if (isFav) {
      await this.remove(source, channelId);
      return false;
    }
    await this.save(source, channelId, item);
    return true;
  }

  static async clearAll(): Promise<void> {
    await safeStorageOperation(async () => {
      await AsyncStorage.removeItem(STORAGE_KEYS.LIVE_FAVORITES);
    }, undefined);
  }
}

// --- PlayRecordManager (Dynamic: API or LocalStorage) ---
export class PlayRecordManager {
  private static getStorageType() {
    return storageConfig.getStorageType();
  }

  static async getAll(): Promise<Record<string, PlayRecord>> {
    const perfStart = performance.now();
    const storageType = this.getStorageType();
    logger.info(`[PERF] PlayRecordManager.getAll START - storageType: ${storageType}`);

    let apiRecords: Record<string, PlayRecord> = {};

    // 始终从本地存储获取播放记录，确保能够显示
    try {
      const data = await AsyncStorage.getItem(STORAGE_KEYS.PLAY_RECORDS);
      apiRecords = data ? JSON.parse(data) : {};
      logger.info(`[DEBUG] PlayRecordManager.getAll - local storage records: ${Object.keys(apiRecords).length}`);
      if (Object.keys(apiRecords).length > 0) {
        logger.info(`[DEBUG] PlayRecordManager.getAll - local storage keys: ${Object.keys(apiRecords).join(', ')}`);
      }
    } catch (error) {
      logger.info("Failed to get all local play records:", error);
      apiRecords = {};
    }

    // 如果存储类型不是本地存储，也尝试从 API 获取播放记录
    if (storageType && storageType !== "localstorage") {
      const apiStart = performance.now();
      logger.info(`[PERF] API getPlayRecords START`);

      try {
        const apiData = await api.getPlayRecords();
        // 合并 API 数据和本地数据，优先使用 API 数据
        // 只有当 API 数据不为空时才合并，避免覆盖本地数据
        logger.info(`[DEBUG] PlayRecordManager.getAll - API records: ${Object.keys(apiData).length}`);
        if (Object.keys(apiData).length > 0) {
          apiRecords = { ...apiRecords, ...apiData };
          logger.info(`[DEBUG] PlayRecordManager.getAll - merged records: ${Object.keys(apiRecords).length}`);
        }
      } catch (error) {
        logger.info("Failed to get play records from API:", error);
        // 继续使用本地数据
      }

      const apiEnd = performance.now();
      logger.info(
        `[PERF] API getPlayRecords END - took ${(apiEnd - apiStart).toFixed(2)}ms, records: ${
          Object.keys(apiRecords).length
        }`
      );
    }

    const localSettings = await PlayerSettingsManager.getAll();
    const mergedRecords: Record<string, PlayRecord> = {};
    for (const key in apiRecords) {
      mergedRecords[key] = {
        ...apiRecords[key],
        ...localSettings[key],
      };
    }

    const perfEnd = performance.now();
    logger.info(
      `[PERF] PlayRecordManager.getAll END - took ${(perfEnd - perfStart).toFixed(2)}ms, total records: ${
        Object.keys(mergedRecords).length
      }`
    );

    return mergedRecords;
  }

  static async save(source: string, id: string, record: Omit<PlayRecord, "save_time">): Promise<void> {
    const key = generateKey(source, id);
    const { introEndTime, outroStartTime, ...apiRecord } = record;

    logger.info(`[DEBUG] PlayRecordManager.save START - key: ${key}, record: ${JSON.stringify(apiRecord)}`);

    // Player settings are always saved locally
    await PlayerSettingsManager.save(source, id, { introEndTime, outroStartTime });

    // 始终保存到本地存储，确保播放记录能够显示
    await safeStorageOperation(async () => {
      // 直接从本地存储获取播放记录，避免 API 数据覆盖本地数据
      const data = await AsyncStorage.getItem(STORAGE_KEYS.PLAY_RECORDS);
      const allRecords = data ? JSON.parse(data) : {};
      const fullRecord = { ...apiRecord, save_time: Date.now() };
      allRecords[key] = { ...allRecords[key], ...fullRecord };
      await AsyncStorage.setItem(STORAGE_KEYS.PLAY_RECORDS, JSON.stringify(allRecords));
      logger.info(`[DEBUG] PlayRecordManager.save SUCCESS - saved to local storage, total records: ${Object.keys(allRecords).length}`);
    }, undefined);

    // 如果存储类型不是本地存储，也尝试保存到 API
    const storageType = this.getStorageType();
    if (storageType && storageType !== "localstorage") {
      try {
        await api.savePlayRecord(key, apiRecord);
        logger.info(`[DEBUG] PlayRecordManager.save SUCCESS - saved to API`);
      } catch (error) {
        logger.info("Failed to save play record to API:", error);
      }
    }

    logger.info(`[DEBUG] PlayRecordManager.save END`);
  }

  static async get(source: string, id: string): Promise<PlayRecord | null> {
    const perfStart = performance.now();
    const key = generateKey(source, id);
    const storageType = this.getStorageType();
    logger.info(`[PERF] PlayRecordManager.get START - source: ${source}, id: ${id}, storageType: ${storageType}`);

    const records = await this.getAll();
    const result = records[key] || null;

    const perfEnd = performance.now();
    logger.info(`[PERF] PlayRecordManager.get END - took ${(perfEnd - perfStart).toFixed(2)}ms, found: ${!!result}`);

    return result;
  }

  static async remove(source: string, id: string): Promise<void> {
    const key = generateKey(source, id);
    await PlayerSettingsManager.remove(source, id); // Always remove local settings

    const storageType = this.getStorageType();
    // 如果 storageType 未设置或不是 "localstorage"，默认使用本地存储
    if (!storageType || storageType === "localstorage") {
      await safeStorageOperation(async () => {
        const allRecords = await this.getAll();
        delete allRecords[key];
        await AsyncStorage.setItem(STORAGE_KEYS.PLAY_RECORDS, JSON.stringify(allRecords));
      }, undefined);
    } else {
      try {
        await api.deletePlayRecord(key);
      } catch (error) {
        logger.info("Failed to delete play record from API:", error);
      }
    }
  }

  static async clearAll(): Promise<void> {
    await PlayerSettingsManager.clearAll(); // Always clear local settings

    const storageType = this.getStorageType();
    // 如果 storageType 未设置或不是 "localstorage"，默认使用本地存储
    if (!storageType || storageType === "localstorage") {
      await safeStorageOperation(async () => {
        await AsyncStorage.removeItem(STORAGE_KEYS.PLAY_RECORDS);
      }, undefined);
    } else {
      try {
        await api.deletePlayRecord();
      } catch (error) {
        logger.info("Failed to clear all play records from API:", error);
      }
    }
  }
}

// --- SearchHistoryManager (Dynamic: API or LocalStorage) ---
export class SearchHistoryManager {
  private static getStorageType() {
    return storageConfig.getStorageType();
  }

  static async get(): Promise<string[]> {
    const storageType = this.getStorageType();
    // 如果 storageType 未设置或不是 "localstorage"，默认使用本地存储
    if (!storageType || storageType === "localstorage") {
      return safeStorageOperation(async () => {
        const data = await AsyncStorage.getItem(STORAGE_KEYS.SEARCH_HISTORY);
        return data ? JSON.parse(data) : [];
      }, []);
    }
    try {
      return await api.getSearchHistory();
    } catch (error) {
      logger.info("Failed to get search history from API:", error);
      return [];
    }
  }

  static async add(keyword: string): Promise<void> {
    const trimmed = keyword.trim();
    if (!trimmed) return;

    const storageType = this.getStorageType();
    // 如果 storageType 未设置或不是 "localstorage"，默认使用本地存储
    if (!storageType || storageType === "localstorage") {
      await safeStorageOperation(async () => {
        let history = await this.get();
        history = [trimmed, ...history.filter((k) => k !== trimmed)].slice(0, 20); // Keep latest 20
        await AsyncStorage.setItem(STORAGE_KEYS.SEARCH_HISTORY, JSON.stringify(history));
      }, undefined);
      return;
    }
    try {
      await api.addSearchHistory(trimmed);
    } catch (error) {
      logger.info("Failed to add search history to API:", error);
    }
  }

  static async clear(): Promise<void> {
    const storageType = this.getStorageType();
    // 如果 storageType 未设置或不是 "localstorage"，默认使用本地存储
    if (!storageType || storageType === "localstorage") {
      await safeStorageOperation(async () => {
        await AsyncStorage.removeItem(STORAGE_KEYS.SEARCH_HISTORY);
      }, undefined);
      return;
    }
    try {
      await api.deleteSearchHistory();
    } catch (error) {
      logger.info("Failed to clear search history from API:", error);
    }
  }
}

// --- SettingsManager (Uses AsyncStorage) ---
export class SettingsManager {
  static async get(): Promise<AppSettings> {
    // 根据环境设置默认 API 地址
    const defaultApiBaseUrl = __DEV__ ? "http://192.168.100.101:3000" : "https://onetv.aisxuexi.com";

    const defaultSettings: AppSettings = {
      apiBaseUrl: defaultApiBaseUrl,
      cronPassword: "cron_secure_password",
      vodProxyEnabled: true,
      remoteInputEnabled: true,
      liveAdBlockEnabled: true,
      vodAdBlockEnabled: true,
      videoSource: {
        enabledAll: true,
        sources: {},
      },
      m3uUrl: "",
    };
    return safeStorageOperation(async () => {
      const data = await AsyncStorage.getItem(STORAGE_KEYS.SETTINGS);
      return data ? JSON.parse(data) : defaultSettings;
    }, defaultSettings);
  }

  static async save(settings: Partial<AppSettings>): Promise<void> {
    await safeStorageOperation(async () => {
      const currentSettings = await this.get();
      const updatedSettings = { ...currentSettings, ...settings };
      await AsyncStorage.setItem(STORAGE_KEYS.SETTINGS, JSON.stringify(updatedSettings));
    }, undefined);
  }

  static async reset(): Promise<void> {
    await safeStorageOperation(async () => {
      await AsyncStorage.removeItem(STORAGE_KEYS.SETTINGS);
    }, undefined);
  }
}


