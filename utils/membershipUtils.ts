import { format } from 'date-fns';
import { zhCN } from 'date-fns/locale';

// 会员类型枚举
export enum MembershipTier {
  VIP = 'vip',        // 尊享会员
  PREMIUM = 'premium', // 高级会员
  STANDARD = 'default' // 普通会员
}

// 会员类型中文名称映射
export const MembershipNames = {
  [MembershipTier.VIP]: '尊享会员',
  [MembershipTier.PREMIUM]: '高级会员',
  [MembershipTier.STANDARD]: '普通会员'
};

// 会员类型颜色配置（与LunaTV保持一致，VIP金色，Premium蓝色，Standard蓝色）
export const MembershipColors = {
  [MembershipTier.VIP]: '#FFD700', // 金色
  [MembershipTier.PREMIUM]: '#4A90E2', // 蓝色（与LunaTV保持一致）
  [MembershipTier.STANDARD]: '#4A90E2' // 蓝色
}

// 会员类型文字颜色类名（用于React Native组件样式）
export const MembershipTextColorClasses = {
  [MembershipTier.VIP]: 'text-yellow-500',
  [MembershipTier.PREMIUM]: 'text-blue-500', // 蓝色（与LunaTV保持一致）
  [MembershipTier.STANDARD]: 'text-blue-500' // 蓝色
};

// 增强的会员等级匹配规则
interface TierRule {
  regex: RegExp;
  tier: MembershipTier;
  priority: number; // 优先级，数字越小优先级越高
}

const tierRules: TierRule[] = [
  // 精确匹配规则 - 最高优先级
  { regex: /^vip1$/i, tier: MembershipTier.PREMIUM, priority: 1 }, // 精确匹配vip1为高级会员
  { regex: /^vip$/i, tier: MembershipTier.VIP, priority: 2 }, // 精确匹配vip为尊享会员
  { regex: /^premium$/i, tier: MembershipTier.PREMIUM, priority: 3 }, // 精确匹配premium
  { regex: /^standard$|^default$/i, tier: MembershipTier.STANDARD, priority: 4 }, // 精确匹配standard/default
  
  // 数字匹配规则
  { regex: /^1$/, tier: MembershipTier.PREMIUM, priority: 5 }, // 数字1对应高级会员
  { regex: /^2$/, tier: MembershipTier.VIP, priority: 6 }, // 数字2对应尊享会员
  { regex: /^0$/, tier: MembershipTier.STANDARD, priority: 7 }, // 数字0对应普通会员
  
  // 高级会员特定规则 - 提高优先级以避免被尊享会员规则覆盖
  { regex: /高级vip|会员1|vip\s*1/i, tier: MembershipTier.PREMIUM, priority: 8 }, // 高级VIP或VIP1
  { regex: /^(高级|黄金|plus|pro)$/, tier: MembershipTier.PREMIUM, priority: 9 }, // 高级/黄金/plus/pro
  { regex: /premium(会员)?|高级(会员)?|黄金(会员)?|plus(会员)?|pro(会员)?/i, tier: MembershipTier.PREMIUM, priority: 10 },
  { regex: /plus|pro/i, tier: MembershipTier.PREMIUM, priority: 11 },
  { regex: /gold|silver/i, tier: MembershipTier.PREMIUM, priority: 12 }, // 黄金/白银会员
  { regex: /(tier|level)\s*1/i, tier: MembershipTier.PREMIUM, priority: 13 }, // tier/level 1
  { regex: /高级/i, tier: MembershipTier.PREMIUM, priority: 14 }, // 单独匹配高级
  
  // 尊享会员规则 - 降低部分规则优先级
  { regex: /^(至尊|尊享)$/, tier: MembershipTier.VIP, priority: 15 }, // 精确匹配至尊/尊享
  { regex: /svip|super\s*vip/i, tier: MembershipTier.VIP, priority: 16 }, // SVIP
  { regex: /至尊(会员)?|尊享(会员)?/i, tier: MembershipTier.VIP, priority: 17 }, // 至尊/尊享会员
  { regex: /尊享/i, tier: MembershipTier.VIP, priority: 18 }, // 单独匹配尊享
  
  // 普通会员规则
  { regex: /^(普通|基础)$/, tier: MembershipTier.STANDARD, priority: 19 }, // 普通/基础
  { regex: /普通(会员)?|基础(会员)?/i, tier: MembershipTier.STANDARD, priority: 20 }, // 普通/基础会员
];

/**
 * 获取会员等级显示名称
 * @param tier 会员等级标识符
 * @returns 会员等级显示名称
 */
export const getMembershipTierText = (tier: string): string => {
  // 确保tier是字符串类型
  const tierStr = typeof tier === 'string' ? tier : String(tier);
  console.debug(`getMembershipTierText: 输入tier值: '${tierStr}'`);
  
  // 尝试直接匹配枚举值
  if (MembershipNames.hasOwnProperty(tierStr)) {
    console.debug(`getMembershipTierText: 直接匹配枚举值: '${tierStr}' -> '${MembershipNames[tierStr as MembershipTier]}'`);
    return MembershipNames[tierStr as MembershipTier];
  }
  
  // 使用增强的规则匹配
  const matchedRules = tierRules
    .filter(rule => rule.regex.test(tierStr.toLowerCase()));
  
  console.debug(`getMembershipTierText: 匹配到的规则数量: ${matchedRules.length}`);
  
  if (matchedRules.length > 0) {
    // 按优先级排序并取第一个匹配
    const matchedRule = matchedRules.sort((a, b) => a.priority - b.priority)[0];
    const result = MembershipNames[matchedRule.tier];
    console.debug(`getMembershipTierText: 规则匹配成功: '${tierStr}' -> '${result}' (规则优先级: ${matchedRule.priority})`);
    return result;
  }
  
  // 特殊处理：如果是纯数字，尝试直接映射
  if (/^\d+$/.test(tierStr)) {
    console.debug(`getMembershipTierText: 检测到数字tier值: '${tierStr}'，尝试数字映射`);
    // 这里实际上已经在tierRules中处理了数字匹配，这里作为额外保障
  }
  
  const result = tierStr || '未知等级';
  console.debug(`getMembershipTierText: 无匹配规则，返回原值: '${result}'`);
  return result;
};

/**
 * 获取会员等级颜色
 * @param tier 会员等级标识符
 * @returns 会员等级颜色代码
 */
export const getMembershipTierColor = (tier: string): string => {
  // 确保tier是字符串类型
  const tierStr = typeof tier === 'string' ? tier : String(tier);
  console.debug(`getMembershipTierColor: 输入tier值: '${tierStr}'`);
  
  // 尝试直接匹配枚举值
  if (MembershipColors.hasOwnProperty(tierStr)) {
    const result = MembershipColors[tierStr as MembershipTier];
    console.debug(`getMembershipTierColor: 直接匹配枚举值: '${tierStr}' -> '${result}'`);
    return result;
  }
  
  // 使用增强的规则匹配
  const matchedRules = tierRules
    .filter(rule => rule.regex.test(tierStr.toLowerCase()));
  
  console.debug(`getMembershipTierColor: 匹配到的规则数量: ${matchedRules.length}`);
  
  if (matchedRules.length > 0) {
    // 按优先级排序并取第一个匹配
    const matchedRule = matchedRules.sort((a, b) => a.priority - b.priority)[0];
    const result = MembershipColors[matchedRule.tier];
    console.debug(`getMembershipTierColor: 规则匹配成功: '${tierStr}' -> '${result}' (规则优先级: ${matchedRule.priority})`);
    return result;
  }
  
  console.debug(`getMembershipTierColor: 无匹配规则，返回默认灰色`);
  return '#999999'; // 默认灰色
};

/**
 * 精确映射会员等级
 * @param tierId LunaTV的tierId
 * @returns 标准化的会员等级
 */
export function mapLunaToStandardTier(tierId: string): MembershipTier {
  // 确保是字符串类型
  const tierStr = String(tierId || '').toLowerCase();
  console.debug(`mapLunaToStandardTier: 输入tierId: '${tierId}' -> 转换为: '${tierStr}'`);
  
  // 使用增强的规则匹配
  const matchedRules = tierRules
    .filter(rule => rule.regex.test(tierStr));
  
  console.debug(`mapLunaToStandardTier: 匹配到的规则数量: ${matchedRules.length}`);
  
  if (matchedRules.length > 0) {
    // 按优先级排序并取第一个匹配
    const matchedRule = matchedRules.sort((a, b) => a.priority - b.priority)[0];
    console.debug(`mapLunaToStandardTier: 规则匹配成功: '${tierId}' -> '${matchedRule.tier}' (规则优先级: ${matchedRule.priority})`);
    return matchedRule.tier;
  }
  
  // 特殊处理：如果是纯数字，根据数字直接映射
  if (/^\d+$/.test(tierStr)) {
    const num = parseInt(tierStr, 10);
    console.debug(`mapLunaToStandardTier: 检测到数字tierId: '${tierId}' = ${num}`);
    if (num > 1) return MembershipTier.VIP;
    if (num === 1) return MembershipTier.PREMIUM;
    return MembershipTier.STANDARD;
  }
  
  console.debug(`mapLunaToStandardTier: 无匹配规则，返回默认普通会员`);
  // 默认返回普通会员
  return MembershipTier.STANDARD;
}

/**
 * 获取会员等级状态颜色
 * @param isActive 是否激活
 * @returns 状态颜色
 */
export const getMembershipStatusColor = (isActive: boolean): string => {
  return isActive ? '#22C55E' : '#6B7280'; // 激活为绿色，未激活为灰色
};

/**
 * 格式化日期显示
 * @param date 日期对象、时间戳或日期字符串
 * @param formatString 格式化字符串
 * @returns 格式化的日期字符串
 */
export const formatMembershipDate = (date: number | Date | string | undefined, formatString: string = 'yyyy-MM-dd HH:mm'): string => {
  try {
    if (!date) return '未知';
    
    // 确保是 Date 对象
    let dateObj: Date;
    if (date instanceof Date) {
      dateObj = date;
    } else if (typeof date === 'string') {
      dateObj = new Date(date);
    } else {
      dateObj = new Date(date);
    }
    
    // 检查日期是否有效
    if (isNaN(dateObj.getTime())) {
      console.warn('无效的日期值:', date);
      return '未知';
    }
    
    // 使用 date-fns 格式化日期
    return format(dateObj, formatString, { locale: zhCN });
  } catch (error) {
    console.error('格式化日期失败:', error, 'date:', date);
    return '未知';
  }
};

/**
 * 计算会员剩余天数
 * @param expireTime 过期时间戳或日期字符串
 * @returns 剩余天数
 */
export const calculateRemainingDays = (expireTime: any): number => {
  // 处理undefined或null
  if (!expireTime) {
    return 0;
  }
  
  // 确保是数字
  let end: number;
  if (typeof expireTime === 'number') {
    end = expireTime;
  } else if (typeof expireTime === 'string') {
    // 尝试解析字符串日期
    const parsed = Date.parse(expireTime);
    end = isNaN(parsed) ? 0 : parsed;
  } else {
    end = 0;
  }
  
  const now = Date.now();
  const diff = end - now;
  // 转换为天数（向上取整）
  return Math.ceil(diff / (1000 * 60 * 60 * 24));
};

/**
 * 验证会员信息的有效性
 * @param membership 会员信息对象
 * @returns 是否有效
 */
export function validateMembershipInfo(membership: any): boolean {
  if (!membership) return false;
  
  // 检查必要字段
  const hasRequiredFields = membership.tier && membership.status;
  if (!hasRequiredFields) {
    console.warn('会员信息缺少必要字段', membership);
    return false;
  }
  
  // 验证tier是否为有效枚举值
  const isValidTier = Object.values(MembershipTier).includes(membership.tier as MembershipTier);
  if (!isValidTier) {
    console.warn('会员等级无效', membership.tier);
    return false;
  }
  
  // 验证时间戳（如果存在）
  if (membership.createdAt && isNaN(new Date(membership.createdAt).getTime())) {
    console.warn('创建时间无效', membership.createdAt);
    return false;
  }
  
  if (membership.expireTime && isNaN(new Date(membership.expireTime).getTime())) {
    console.warn('过期时间无效', membership.expireTime);
    return false;
  }
  
  return true;
}

/**
 * 会员信息接口（与LunaTV匹配）
 */
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