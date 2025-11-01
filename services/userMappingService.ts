import AsyncStorage from '@react-native-async-storage/async-storage';

class UserMappingService {
  private static readonly USER_MAPPING_KEY = 'user_platform_mapping';
  
  // 保存用户平台映射关系
  static async saveUserMapping(localUserId: string, externalUserId: string, platform: 'luna'): Promise<void> {
    try {
      const mappings = await this.getUserMappings();
      mappings[platform] = {
        localUserId,
        externalUserId,
        lastSynced: Date.now()
      };
      await AsyncStorage.setItem(this.USER_MAPPING_KEY, JSON.stringify(mappings));
    } catch (error) {
      console.error('保存用户映射失败:', error);
    }
  }
  
  // 获取用户平台映射关系
  static async getUserMappings(): Promise<Record<string, { localUserId: string; externalUserId: string; lastSynced: number }>> {
    try {
      const mappings = await AsyncStorage.getItem(this.USER_MAPPING_KEY);
      return mappings ? JSON.parse(mappings) : {};
    } catch (error) {
      console.error('获取用户映射失败:', error);
      return {};
    }
  }
  
  // 获取特定平台的用户映射
  static async getPlatformUser(platform: 'luna'): Promise<{ localUserId: string; externalUserId: string } | null> {
    try {
      const mappings = await this.getUserMappings();
      return mappings[platform] || null;
    } catch (error) {
      console.error('获取平台用户映射失败:', error);
      return null;
    }
  }
  
  // 清除用户映射
  static async clearUserMappings(): Promise<void> {
    try {
      await AsyncStorage.removeItem(this.USER_MAPPING_KEY);
    } catch (error) {
      console.error('清除用户映射失败:', error);
    }
  }
}

export { UserMappingService };
