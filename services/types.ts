// --- Type Definitions ---

// 登录凭证相关类型
export interface LoginCredentials {
  username: string;
  password: string;
}

// 播放记录相关类型
export interface PlayRecord {
  key: string;
  title: string;
  cover: string;
  currentTime: number;
  totalTime: number;
  lastPlayed: number;
  save_time: number;
  introEndTime?: number;
  outroStartTime?: number;
  playbackRate?: number;
}

// 收藏相关类型
export interface Favorite {
  key: string;
  title: string;
  cover: string;
  type: string;
  save_time: number;
}

// 服务器配置相关类型
export interface ServerConfig {
  Version: string;
  StorageType: string;
  SiteName: string;
  DownloadEnabled: boolean;
  requireInviteCode: boolean;
  TelegramAuthConfig?: {
    enabled: boolean;
    botUsername: string;
    buttonSize: string;
    showAvatar: boolean;
    requestWriteAccess: boolean;
  };
  OIDCProviders?: Array<{
    id: string;
    name: string;
    buttonText: string;
    issuer: string;
  }>;
  OIDCConfig?: {
    enabled: boolean;
    buttonText: string;
    issuer: string;
  };
  // 保持向后兼容的字段
  AuthConfig?: {
    Enable: boolean;
    Password: string;
  };
  SiteConfig?: {
    Name: string;
    Logo: string;
    Favicon: string;
  };
  UserConfig?: {
    Enable: boolean;
    Users: Array<{
      username: string;
      password: string;
      role: 'admin' | 'user';
      group: string;
      expiredAt: number;
      createdAt: number;
      updatedAt: number;
      banned: boolean;
    }>;
  };
  ApiConfig?: {
    EnableSearch: boolean;
    EnableLive: boolean;
    EnableDouban: boolean;
    EnableMembership: boolean;
    EnableCoupon: boolean;
    EnablePlayRecord: boolean;
    EnableFavorite: boolean;
    EnableSearchHistory: boolean;
  };
  MembershipConfig?: {
    Enable: boolean;
    Tiers: Array<{
      id: string;
      name: string;
      displayName: string;
      price: number;
      description: string;
      features: string[];
      durationDays: number;
      priority: number;
      permissions: string[];
    }>;
  };
}

// 会员相关类型
export interface MembershipTier {
  id?: string;
  name: string;
  displayName: string;
  price: number;
  description?: string;
  features: string[];
  durationDays?: number;
  priority?: number;
  permissions?: string[];
  isDefault?: boolean;
  userGroup?: string;
}

export interface UserMembership {
  tierId: string;
  tierName?: string;
  startDate: number;
  endDate: number;
  status: 'active' | 'expired' | 'pending';
  autoRenew: boolean;
  source?: 'manual' | 'coupon' | 'system';
  renewInfo?: {
    enabled: boolean;
    renewalTierId: string;
    nextRenewalDate: number;
  } | null;
  lastUpdated?: number;
  activationHistory?: Array<{
    tierId: string;
    startDate: number;
    durationDays: number;
    source: 'manual' | 'coupon' | 'system';
    transactionId: string;
  }>;
}

export interface MembershipConfig {
  tiers: MembershipTier[];
  levels?: MembershipTier[];
  defaultTierId?: string;
  enableMembershipSystem?: boolean;
  lastUpdated?: number;
  defaultDurationDays?: number;
  enable?: boolean;
}

export interface MembershipResponse {
  membership: UserMembership;
  config: MembershipConfig;
}

// 卡券相关类型
export interface Coupon {
  code: string;
  batchId: string;
  type: string;
  tier: string;
  durationDays: number;
  status: 'active' | 'used' | 'expired' | 'invalid';
  createdAt: number;
  redeemedAt?: number;
  redeemedBy?: string;
  expireTime: number;
  expireDate?: number;
  expireTimeStr?: string;
  usedAt?: number;
  usedBy?: string;
  createDate?: number;
  isExpired?: boolean;
}

export interface CouponBatch {
  id: string;
  name: string;
  type: string;
  tier: string;
  durationDays: number;
  quantity: number;
  prefix: string;
  status: 'active' | 'inactive';
  createdAt: number;
  expiredAt?: number;
  startAt?: number;
  endAt?: number;
  totalRedeemed: number;
  totalCreated: number;
  createdBy?: string;
  description?: string;
}

export interface RedeemResult {
  success: boolean;
  message: string;
  data?: {
    membership: UserMembership;
    config: MembershipConfig;
  };
  error?: string;
}

// 直播源相关类型
export interface LiveApiResponse<T> {
  code: number;
  data: T;
  message: string;
  total?: number;
}

export interface LiveSource {
  id: string;
  name: string;
  url: string;
  logo: string;
  group: string;
  delay?: number;
  filter?: string;
  sort?: number;
  isOk?: boolean;
  lastCheck?: number;
}

// 搜索相关类型
export interface SearchResult {
  id: string;
  title: string;
  type: string;
  cover: string;
  rating?: number;
  year?: number | string;
  doubanId?: string;
  imdbId?: string;
  tmdbId?: string;
  overview?: string;
  genres?: string[];
  tags?: string[];
  actors?: string[];
  directors?: string[];
  countries?: string[];
  languages?: string[];
  releaseDate?: string;
  runtime?: number;
  status?: string;
  network?: string;
  seasons?: number;
  episodes?: string[];
  episodes_titles?: string[];
  play_sources?: Array<{
    name: string;
    episodes: string[];
    episodes_titles: string[];
  }>;
  vod_play_from?: string;
  vod_play_url?: string;
  source?: string;
}

// 视频详情相关类型
export interface VideoDetail {
  id: string;
  title: string;
  type: string;
  cover: string;
  rating?: number;
  year?: number | string;
  doubanId?: string;
  imdbId?: string;
  tmdbId?: string;
  overview?: string;
  genres?: string[];
  tags?: string[];
  actors?: string[];
  directors?: string[];
  countries?: string[];
  languages?: string[];
  releaseDate?: string;
  runtime?: number;
  status?: string;
  network?: string;
  seasons?: number;
  episodes?: string[];
  episodes_titles?: string[];
  play_sources?: Array<{
    name: string;
    episodes: string[];
    episodes_titles: string[];
  }>;
  vod_play_from?: string;
  vod_play_url?: string;
  source?: string;
}

// 搜索资源相关类型
export interface ApiSite {
  id: string;
  name: string;
  key: string;
  type: string;
  api: string;
  search: string;
  quickSearch?: string;
  categories?: Array<{
    key: string;
    name: string;
  }>;
  filters?: Array<{
    key: string;
    name: string;
    values: Array<{
      key: string;
      name: string;
    }>;
  }>;
  weight: number;
  enabled: boolean;
  searchable: boolean;
  quickSearchable: boolean;
  lang: string;
}

// 豆瓣相关类型
export interface DoubanResponse {
  items: Array<{
    id: string;
    title: string;
    cover: string;
    rating: number;
    year: number;
    type: string;
  }>;
  total: number;
  page: number;
  pageSize: number;
  hasMore: boolean;
}