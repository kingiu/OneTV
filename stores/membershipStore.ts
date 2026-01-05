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
  points?: number;
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
        console.debug('从缓存加载会员信息成功', {
          hasCacheTimestamp: !!parsedInfo._cacheTimestamp,
          tier: parsedInfo.tier,
          status: parsedInfo.status
        });
        
        // 检查缓存是否过期（超过24小时）
        const cacheTimestamp = parsedInfo._cacheTimestamp || 0;
        const now = Date.now();
        const cacheAge = now - cacheTimestamp;
        const cacheExpired = cacheTimestamp > 0 && cacheAge > 24 * 60 * 60 * 1000; // 24小时
        
        console.debug('缓存信息检查', {
          cacheAge: `${Math.floor(cacheAge / (1000 * 60))} 分钟`,
          cacheExpired
        });
        
        // 即使缓存过期，也先加载缓存数据以提高用户体验
        // 但设置isLoading为true，以便后台刷新最新数据
        set({ 
          membershipInfo: parsedInfo, 
          isLoading: cacheExpired // 缓存过期时标记为加载中
        });
        
        // 如果缓存过期，触发后台刷新
        if (cacheExpired) {
          console.debug('缓存已过期，触发后台刷新');
          // 不等待刷新完成，让UI先显示缓存数据
          get().fetchMembershipInfo().catch(err => {
            console.debug('后台刷新会员信息失败', err);
          });
        }
      } else {
        console.debug('缓存中没有会员信息');
      }
    } catch (error) {
      console.error('从缓存加载会员信息失败:', error);
      set({ isLoading: false }); // 确保加载状态被重置
    }
  },
  
  // 获取会员信息，带重试机制
  fetchMembershipInfo: async (retryCount = 0) => {
    set({ isLoading: true, error: null });
    try {
      // 增强: 在获取会员信息前清除所有相关缓存
      try {
        // 清除store的缓存
        await AsyncStorage.removeItem('membershipInfo');
        // 清除API层的缓存
        await AsyncStorage.removeItem('cached_membership');
        console.debug('已清除所有会员信息缓存');
      } catch (cacheError) {
        console.debug('清除缓存时出错', cacheError);
      }
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
          // 从本地存储获取登录用户名
          const loginUsername = await AsyncStorage.getItem('loginUsername');
          
          // 如果有本地存储的登录用户名，优先使用它
          const updatedMembership = loginUsername ? { ...membership, userName: loginUsername } : membership;
          
          // 直接更新store，不依赖枚举验证
          set({ 
            membershipInfo: updatedMembership,
            isLoading: false 
          });
          // 缓存更新后的会员信息到本地
          await AsyncStorage.setItem('membershipInfo', JSON.stringify(updatedMembership));
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
  
  // 更新会员信息 - 放宽验证，确保任何有效格式的会员信息都能被接受
  updateMembershipInfo: (info) => {
    if (info) {
      // 只检查基本完整性，不再要求tier必须是MembershipTier枚举的值
      const isComplete = !!(info.tier && info.status);
      
      if (isComplete) {
        console.debug('更新会员信息', info);
        set({ membershipInfo: info });
        // 缓存到本地存储
        AsyncStorage.setItem('membershipInfo', JSON.stringify(info));
      } else {
        console.warn('尝试更新不完整的会员信息', info);
      }
    } else {
      console.debug('清除会员信息');
      set({ membershipInfo: null });
      AsyncStorage.removeItem('membershipInfo');
    }
  },
  
  // 兑换优惠券
  redeemCoupon: async (code: string) => {
    console.debug('兑换卡券: 开始处理兑换请求', { code });
    try {
      // 输入验证
      if (!code || typeof code !== 'string' || code.trim().length !== 12) {
        console.debug('兑换卡券: 无效的卡券码格式', { code, length: code?.length });
        return { success: false, message: '卡券码格式不正确，请输入12位字母数字组合' };
      }

      console.debug('兑换卡券: 检查认证状态');
      const authCookies = await AsyncStorage.getItem('authCookies');
      console.debug('兑换卡券: 认证状态检查结果', { hasAuthCookies: !!authCookies });
      
      if (!authCookies) {
        console.debug('兑换卡券: 用户未登录，兑换失败');
        return { success: false, message: '请先登录' };
      }
      
      // 清除缓存以确保获取最新数据
      console.debug('兑换卡券: 清除会员信息缓存');
      try {
        await AsyncStorage.removeItem('membershipInfo');
        await AsyncStorage.removeItem('cached_membership');
        console.debug('兑换卡券: 缓存清除成功');
      } catch (cacheError) {
        console.debug('兑换卡券: 清除缓存时出错', cacheError);
        // 即使缓存清除失败，也继续执行兑换流程
      }
      
      // 使用API服务兑换优惠券
      console.debug('兑换卡券: 调用API兑换卡券');
      const response = await api.redeemCoupon(code);
      console.debug('兑换卡券: API响应', JSON.stringify(response, null, 2));
      
      if (response.membership) {
        console.debug('兑换卡券: API返回会员信息，更新store');
        // 增强的会员信息验证
        const membership = response.membership;
        const isMembershipValid = 
          membership && 
          typeof membership === 'object' &&
          membership.tier && 
          membership.status &&
          typeof membership.tier === 'string' &&
          typeof membership.status === 'string';
          
        console.debug('兑换卡券: 会员信息验证结果', { 
          isMembershipValid, 
          tier: membership?.tier,
          status: membership?.status
        });
        
        if (isMembershipValid) {
          // 规范化会员数据
          const normalizedMembership = {
            ...membership,
            tier: String(membership.tier), // 确保tier是字符串
            status: String(membership.status), // 确保status是字符串
            isActive: membership.status.toLowerCase() === 'active' || 
                     membership.isActive === true
          };
          
          // 更新会员信息
          set({ membershipInfo: normalizedMembership });
          
          // 缓存更新后的会员信息
          try {
            await AsyncStorage.setItem('membershipInfo', JSON.stringify(normalizedMembership));
            console.debug('兑换卡券: 会员信息更新和缓存成功');
          } catch (cacheError) {
            console.error('兑换卡券: 会员信息缓存失败', cacheError);
            // 缓存失败不影响兑换结果
          }
          
          // 根据会员等级返回不同的成功消息
          const tierText = get().getMembershipTierText();
          const successMessage = tierText === '未激活' 
            ? '卡券兑换成功！' 
            : `卡券兑换成功！您现在是${tierText}。`;
            
          return { success: true, message: successMessage };
        } else {
          console.warn('兑换卡券: 返回的会员信息不完整或无效', response.membership);
          return { success: false, message: '兑换成功，但会员信息异常，请刷新页面重试' };
        }
      } else {
        console.debug('兑换卡券: API未返回会员信息');
        // 检查响应中是否有错误信息
        if (response && (response as any).message) {
          const errorMsg = (response as any).message;
          console.debug('兑换卡券: API返回错误信息', errorMsg);
          // 提供更友好的错误信息
          if (errorMsg.includes('invalid') || errorMsg.includes('无效')) {
            return { success: false, message: '卡券码无效，请检查后重新输入' };
          } else if (errorMsg.includes('expired') || errorMsg.includes('过期')) {
            return { success: false, message: '卡券已过期' };
          } else if (errorMsg.includes('used') || errorMsg.includes('已使用')) {
            return { success: false, message: '卡券已被使用' };
          }
          return { success: false, message: errorMsg };
        }
        return { success: false, message: '卡券兑换失败，请稍后重试' };
      }
    } catch (error) {
      console.error('兑换卡券失败:', error);
      // 提供更具体的错误信息
      if (error instanceof Error) {
        if (error.message.includes('HTTP error')) {
          return { success: false, message: '网络请求失败，请检查网络连接' };
        } else if (error.message.includes('UNAUTHORIZED')) {
          return { success: false, message: '认证失败，请重新登录' };
        } else {
          return { success: false, message: `兑换失败: ${error.message}` };
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
