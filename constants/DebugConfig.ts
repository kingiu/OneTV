// 调试模式配置文件
// 注意：在生产环境中应将DEBUG_MODE设置为false

export const DEBUG_MODE = true; // 根据环境自动判断

// 调试日志级别
export enum LogLevel {
  ERROR = 'error',
  WARN = 'warn', 
  INFO = 'info',
  DEBUG = 'debug',
  VERBOSE = 'verbose'
}

// 当前日志级别
export const CURRENT_LOG_LEVEL = LogLevel.DEBUG;

// 功能标志 - 用于控制特定功能的启用/禁用
export const FEATURE_FLAGS = {
  ENABLE_API_LOGGING: true,
  ENABLE_PERFORMANCE_MONITORING: true,
  ENABLE_MOCK_DATA: false,
  ENABLE_DEV_TOOLS: true,
  ENABLE_VERSION_DISPLAY: true,
  ENABLE_DEBUG_UI: true,
};

// 调试工具配置
export const DEBUG_TOOLS_CONFIG = {
  // 性能监控更新间隔（毫秒）
  PERFORMANCE_UPDATE_INTERVAL: 5000,
  // 是否显示FPS计数器
  SHOW_FPS_COUNTER: true,
  // 是否显示内存使用情况
  SHOW_MEMORY_USAGE: true,
  // 是否显示网络请求统计
  SHOW_NETWORK_STATS: true,
};

// 错误监控配置
export const ERROR_MONITORING_CONFIG = {
  // 是否捕获所有JS错误
  CAPTURE_JS_ERRORS: true,
  // 是否捕获未处理的Promise拒绝
  CAPTURE_UNHANDLED_PROMISES: true,
  // 是否在UI中显示错误详情
  SHOW_ERROR_DETAILS: true,
};