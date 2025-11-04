import { create } from 'zustand';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { api } from '../services/api';
import { MembershipTier, getMembershipTierText } from '../utils/membershipUtils';

// 会员信息接口（与LunaTV匹配）
export interface UserMembershipInfo {
  userName: string;
  tier: string;
  isActive: boolean;
  status: string;
  createdAt: number;
  expireTime?: number;
  lastRenewTime?: number;
  daysRemaining?: number;
  couponHistory?: string[];
}

// 会员状态store接口
interface MembershipStore {
  // 状态
  membershipInfo: UserMembershipInfo | null;
  isLoading: boolean;
  error: string | null;
  
  // 操作
  fetchMembershipInfo: (retryCount?: number) => Promise<void>;
  updateMembershipInfo: (info: UserMembershipInfo | null) => void;
  redeemCoupon: (code: string) => Promise<{ success: boolean; message: string }>;
  clearMembershipInfo: () => void;
  isVip: () => boolean;
  isPremium: () => boolean;
  isStandard: () => boolean;
  getMembershipTierText: () => string;
  _loadCachedMembershipInfo: () => Promise<void>;
}

// 创建会员状态store
export const useMembershipStore = create<MembershipStore>((set, get) => ({
  // 初始状态
  membershipInfo: null,
  isLoading: false,
  error: null,
  
  // 加载缓存的会员信息
  _loadCachedMembershipInfo: async () => {
    try {
      const cachedInfo = await AsyncStorage.getItem('membershipInfo');
      if (cachedInfo) {
        const parsedInfo = JSON.parse(cachedInfo);
        console.debug('从缓存加载会员信息成功');
        set({ membershipInfo: parsedInfo, isLoading: false });
      }
      console.debug('缓存中没有会员信息');
    } catch (error) {
      console.error('从缓存加载会员信息失败:', error);
    }
  },
  
  // 获取会员信息，带重试机制
  fetchMembershipInfo: async (retryCount = 0) => {
    set({ isLoading: true, error: null });
    try {
      // 检查是否已登录
      const authCookies = await AsyncStorage.getItem('authCookies');
      console.debug('获取会员信息: 检查认证状态', { hasAuthCookies: !!authCookies });
      
      if (!authCookies) {
        console.debug('获取会员信息: 用户未登录，跳过获取会员信息');
        set({ isLoading: false });
        return;
      }
      
      // 使用API服务获取会员信息
      console.debug('获取会员信息: 调用API获取会员信息');
      const response = await api.getMembershipInfo();
      console.debug('获取会员信息: API响应 (原始)', JSON.stringify(response));
      
      if (response.membership) {
        // 打印详细的原始会员数据，特别关注tier值
        console.debug('获取会员信息: 原始会员信息数据', {
          tier: response.membership.tier,
          tierType: typeof response.membership.tier,
          status: response.membership.status,
          isActive: response.membership.isActive
        });
        
        // 增强的会员信息验证逻辑
        const membership = response.membership;
        const tierText = getMembershipTierText(membership.tier);
        
        // 验证会员信息完整性和有效性 - 放宽验证，确保我们能处理各种tier值
        const isComplete = !!(membership.tier && membership.status);
        
        // 记录tier映射过程
        console.debug('获取会员信息: tier映射信息', {
          originalTier: membership.tier,
          mappedTierText: tierText,
          isComplete
        });
        
        // 即使tier不是有效的枚举值，我们也接受它，因为我们有映射函数
        if (isComplete) {
          // 直接更新store，不依赖枚举验证
          set({ 
            membershipInfo: membership,
            isLoading: false 
          });
          // 缓存会员信息到本地
          await AsyncStorage.setItem('membershipInfo', JSON.stringify(membership));
        } else {
          console.warn('获取会员信息: 会员信息不完整', membership);
          set({ 
            error: '获取到的会员信息不完整',
            isLoading: false 
          });
          
          // 尝试使用本地缓存的会员信息
          await get()._loadCachedMembershipInfo();
        }
      } else {
        console.warn('获取会员信息: API返回空的会员信息');
        
        // 尝试使用本地缓存的会员信息
        await get()._loadCachedMembershipInfo();
        
        // 如果缓存也没有，设置错误
        const { membershipInfo } = get();
        if (!membershipInfo) {
          set({ 
            error: '获取会员信息失败',
            isLoading: false 
          });
        } else {
          set({ isLoading: false });
        }
      }
    } catch (error) {
      console.error(`获取会员信息失败 (尝试 ${retryCount + 1}/3):`, error);
      
      // 重试机制 - 最多重试2次，每次间隔1秒
      if (retryCount < 2) {
        console.debug(`将在1秒后重试获取会员信息 (尝试 ${retryCount + 2}/3)`);
        await new Promise(resolve => setTimeout(resolve, 1000));
        return get().fetchMembershipInfo(retryCount + 1);
      }
      
      // 重试失败后，尝试使用本地缓存的会员信息
      await get()._loadCachedMembershipInfo();
      
      // 提供更具体的错误信息
      if (error instanceof Error) {
        if (error.message.includes('HTTP error')) {
          set({ 
            error: '网络请求失败，请检查网络连接',
            isLoading: false 
          });
        } else if (error.message.includes('UNAUTHORIZED')) {
          set({ 
            error: '认证失败，请重新登录',
            isLoading: false 
          });
        } else {
          set({ 
            error: '获取会员信息失败，请稍后重试',
            isLoading: false 
          });
        }
      } else {
        set({ 
          error: '获取会员信息失败，请稍后重试',
          isLoading: false 
        });
      }
    }
  },
  
  // 重复定义的实现已删除
  
  // 更新会员信息
  updateMembershipInfo: (info) => {
    // 验证会员信息
    if (info) {
      const isComplete = !!(info.tier && info.status);
      const isValidTier = Object.values(MembershipTier).includes(info.tier as MembershipTier);
      
      if (isComplete && isValidTier) {
        console.debug('更新会员信息', info);
        set({ membershipInfo: info });
        // 缓存到本地存储
        AsyncStorage.setItem('membershipInfo', JSON.stringify(info));
      } else {
        console.warn('尝试更新无效的会员信息', info);
      }
    } else {
      console.debug('清除会员信息');
      set({ membershipInfo: null });
      AsyncStorage.removeItem('membershipInfo');
    }
  },
  
  // 兑换优惠券
  redeemCoupon: async (code: string) => {
    try {
      const authCookies = await AsyncStorage.getItem('authCookies');
      if (!authCookies) {
        return { success: false, message: '请先登录' };
      }
      
      // 使用API服务兑换优惠券
      const response = await api.redeemCoupon(code);
      console.debug('兑换卡券: API响应', JSON.stringify(response, null, 2));
      
      if (response.membership) {
        // 更新会员信息
        set({ membershipInfo: response.membership });
        await AsyncStorage.setItem('membershipInfo', JSON.stringify(response.membership));
        return { success: true, message: '卡券兑换成功！' };
      } else {
        // 检查响应中是否有错误信息
        if (response && (response as any).message) {
          return { success: false, message: (response as any).message };
        }
        return { success: false, message: '卡券兑换失败' };
      }
    } catch (error) {
      console.error('兑换卡券失败:', error);
      // 提供更具体的错误信息
      if (error instanceof Error) {
        if (error.message.includes('HTTP error')) {
          return { success: false, message: '网络请求失败，请检查网络连接' };
        } else if (error.message.includes('UNAUTHORIZED')) {
          return { success: false, message: '认证失败，请重新登录' };
        }
      }
      return { success: false, message: '兑换卡券失败，请稍后重试' };
    }
  },
  
  // 清除会员信息
  clearMembershipInfo: async () => {
    console.debug('清除会员信息');
    set({ membershipInfo: null, error: null });
    await AsyncStorage.removeItem('membershipInfo');
  },
  
  // 判断用户是否为VIP会员（尊享会员）
  isVip: () => {
    const { membershipInfo } = get();
    console.debug('isVip: 检查会员信息', { hasMembership: !!membershipInfo, isActive: membershipInfo?.isActive });
    
    if (!membershipInfo || !membershipInfo.isActive) return false;
    
    // 特殊处理: 确保tier值始终为字符串类型
    const tier = String(membershipInfo.tier || '').toLowerCase();
    console.debug(`isVip: 当前tier值: '${tier}'`);
    
    // 先排除所有可能是高级会员的值
    if (tier === 'vip1' || 
        tier.includes('高级') || 
        tier === 'premium' ||
        tier.includes('plus') || 
        tier.includes('pro') ||
        tier.includes('gold') ||
        tier.includes('silver') ||
        tier === '1') {
      console.debug(`isVip: tier值 '${tier}' 被识别为高级会员，不是尊享会员`);
      return false;
    }
    
    // 尊享会员判断逻辑
    const isVip = tier === 'vip' || 
                 tier.includes('尊享') || 
                 tier.includes('至尊') ||
                 tier === 'svip' || 
                 tier.includes('supervip') ||
                 tier === '2'; // 数字2对应尊享会员
    
    console.debug(`isVip: 判断结果: ${isVip}`);
    return isVip;
  },
  
  // 判断用户是否为高级会员 - 直接判断，不再依赖isVip
  isPremium: () => {
    const { membershipInfo } = get();
    console.debug('isPremium: 检查会员信息', { hasMembership: !!membershipInfo, isActive: membershipInfo?.isActive });
    
    if (!membershipInfo || !membershipInfo.isActive) return false;
    
    // 特殊处理: 确保tier值始终为字符串类型
    const tier = String(membershipInfo.tier || '').toLowerCase();
    console.debug(`isPremium: 当前tier值: '${tier}' (原始类型: ${typeof membershipInfo.tier})`);
    
    // 直接判断是否为高级会员，不依赖isVip方法，避免循环依赖
    const isPremium = 
      tier === 'premium' || 
      tier === 'vip1' || // 精确匹配vip1
      tier.includes('高级') || 
      tier.includes('黄金') ||
      tier.includes('plus') || 
      tier.includes('pro') ||
      tier === '1' || // 数字1对应高级会员
      tier.includes('gold') || // 英文黄金会员
      tier.includes('silver') || // 英文白银会员
      tier.includes('高级vip') || // 高级VIP
      tier.includes('会员1') || // 会员1
      tier.match(/(tier|level)\s*1/i) !== null; // tier/level 1
    
    console.debug(`isPremium: 判断结果: ${isPremium}`);
    return isPremium;
  },
  
  // 判断用户是否为普通会员
  isStandard: () => {
    const { membershipInfo } = get();
    console.debug('isStandard: 检查会员信息', { hasMembership: !!membershipInfo, isActive: membershipInfo?.isActive });
    
    if (!membershipInfo || !membershipInfo.isActive) return false;
    
    // 先检查是否为VIP或高级会员
    if (get().isVip() || get().isPremium()) {
      console.debug('isStandard: 用户是VIP或高级会员，不是普通会员');
      return false;
    }
    
    const tier = membershipInfo.tier.toLowerCase() || '';
    console.debug(`isStandard: 当前tier值: '${tier}'`);
    
    // 增强的普通会员判断逻辑，包括数字匹配
    const isStandard = tier === 'standard' || 
                       tier === 'default' || 
                       tier.includes('普通') || 
                       tier.includes('基础') ||
                       tier === '0'; // 数字0对应普通会员
    
    console.debug(`isStandard: 判断结果: ${isStandard}`);
    return isStandard;
  },
  
  // 获取当前会员等级文本
  getMembershipTierText: () => {
    const { membershipInfo } = get();
    if (!membershipInfo || !membershipInfo.isActive) {
      return '未激活';
    }
    
    // 使用更新后的isVip和isPremium方法来确定显示文本
    // 不再直接调用utils中的getMembershipTierText函数，确保与isVip/isPremium方法逻辑一致
    if (get().isVip()) {
      return '尊享会员';
    } else if (get().isPremium()) {
      return '高级会员';
    } else if (get().isStandard()) {
      return '普通会员';
    }
    
    // 作为最后的回退，返回原始tier值
    return membershipInfo.tier || '未知等级';
  }
}));

export default useMembershipStore;
// 为了兼容现有代码，保留旧的导出
const membershipStore = useMembershipStore;
export { membershipStore };
