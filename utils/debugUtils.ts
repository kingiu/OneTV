import { DEBUG_MODE, CURRENT_LOG_LEVEL, LogLevel, FEATURE_FLAGS } from '../constants/DebugConfig';

// 添加PropertyDescriptor类型导入
interface PropertyDescriptor {
  configurable?: boolean;
  enumerable?: boolean;
  value?: any;
  writable?: boolean;
  get?(): any;
  set?(v: any): void;
}

// 获取全局performance对象
const globalPerformance = typeof performance !== 'undefined' ? performance : {
  now: () => Date.now(),
};

/**
 * 调试日志工具类
 * 用于在应用中记录不同级别的日志信息
 */
export class DebugLogger {
  private static logLevelValues = {
    [LogLevel.ERROR]: 0,
    [LogLevel.WARN]: 1,
    [LogLevel.INFO]: 2,
    [LogLevel.DEBUG]: 3,
    [LogLevel.VERBOSE]: 4,
  };

  /**
   * 检查是否应该记录指定级别的日志
   */
  private static shouldLog(level: LogLevel): boolean {
    if (!DEBUG_MODE) return false;
    return this.logLevelValues[level] <= this.logLevelValues[CURRENT_LOG_LEVEL];
  }

  /**
   * 格式化日志消息
   */
  private static formatMessage(level: LogLevel, message: string, context?: string): string {
    const timestamp = new Date().toLocaleTimeString();
    const levelStr = `[${level.toUpperCase()}]`;
    const contextStr = context ? `[${context}]` : '';
    return `${timestamp} ${levelStr} ${contextStr}: ${message}`;
  }

  /**
   * 记录错误日志
   */
  static error(message: string, error?: Error, context?: string): void {
    if (this.shouldLog(LogLevel.ERROR)) {
      const formattedMessage = this.formatMessage(LogLevel.ERROR, message, context);
      console.error(formattedMessage, error);
    }
  }

  /**
   * 记录警告日志
   */
  static warn(message: string, context?: string): void {
    if (this.shouldLog(LogLevel.WARN)) {
      const formattedMessage = this.formatMessage(LogLevel.WARN, message, context);
      console.warn(formattedMessage);
    }
  }

  /**
   * 记录信息日志
   */
  static info(message: string, context?: string): void {
    if (this.shouldLog(LogLevel.INFO)) {
      const formattedMessage = this.formatMessage(LogLevel.INFO, message, context);
      console.info(formattedMessage);
    }
  }

  /**
   * 记录调试日志
   */
  static debug(message: string, data?: any, context?: string): void {
    if (this.shouldLog(LogLevel.DEBUG)) {
      const formattedMessage = this.formatMessage(LogLevel.DEBUG, message, context);
      console.debug(formattedMessage, data);
    }
  }

  /**
   * 记录详细日志
   */
  static verbose(message: string, data?: any, context?: string): void {
    if (this.shouldLog(LogLevel.VERBOSE)) {
      const formattedMessage = this.formatMessage(LogLevel.VERBOSE, message, context);
      console.log(formattedMessage, data);
    }
  }

  /**
   * 记录API请求日志
   */
  static apiRequest(method: string, url: string, params?: any): void {
    if (FEATURE_FLAGS.ENABLE_API_LOGGING && this.shouldLog(LogLevel.DEBUG)) {
      const message = `API Request: ${method} ${url}`;
      this.debug(message, params, 'API');
    }
  }

  /**
   * 记录API响应日志
   */
  static apiResponse(method: string, url: string, status: number, response?: any): void {
    if (FEATURE_FLAGS.ENABLE_API_LOGGING && this.shouldLog(LogLevel.DEBUG)) {
      const message = `API Response: ${method} ${url} (Status: ${status})`;
      this.debug(message, response, 'API');
    }
  }

  /**
   * 记录性能指标
   */
  static performance(name: string, durationMs: number): void {
    if (FEATURE_FLAGS.ENABLE_PERFORMANCE_MONITORING && this.shouldLog(LogLevel.INFO)) {
      const message = `${name} took ${durationMs.toFixed(2)}ms`;
      this.info(message, 'PERFORMANCE');
    }
  }
}

// 导出便捷方法 - 使用函数声明语法
export function error(message: string, error?: Error, context?: string): void {
  DebugLogger.error(message, error, context);
}

export function warn(message: string, context?: string): void {
  DebugLogger.warn(message, context);
}

export function info(message: string, context?: string): void {
  DebugLogger.info(message, context);
}

export function debug(message: string, data?: any, context?: string): void {
  DebugLogger.debug(message, data, context);
}

export function verbose(message: string, data?: any, context?: string): void {
  DebugLogger.verbose(message, data, context);
}

export function apiRequest(method: string, url: string, params?: any): void {
  DebugLogger.apiRequest(method, url, params);
}

export function apiResponse(method: string, url: string, status: number, response?: any): void {
  DebugLogger.apiResponse(method, url, status, response);
}

// 创建logPerformance函数并添加now属性
export function logPerformance(name: string, durationMs: number): void {
  DebugLogger.performance(name, durationMs);
}

// 添加now属性防止访问错误
Object.defineProperty(logPerformance, 'now', {
  value: (): number => globalPerformance.now(),
  writable: false,
  configurable: false,
  enumerable: false
});

/**
 * 测量函数执行时间的装饰器
 */
export function measurePerformance<T extends (...args: any[]) => any>(
  target: Record<string, any>,
  propertyKey: string,
  descriptor: PropertyDescriptor
): PropertyDescriptor {
  const originalMethod = descriptor.value;
  
  descriptor.value = function(...args: any[]) {
    const startTime = globalPerformance.now();
    const className = target.constructor?.name || 'UnknownClass';
    try {
      const result = originalMethod.apply(this, args);
      
      // 处理同步函数
      if (!(result instanceof Promise)) {
        const duration = globalPerformance.now() - startTime;
        DebugLogger.performance(`${className}.${propertyKey}`, duration);
        return result;
      }
      
      // 处理异步函数
      return result.then((asyncResult: any) => {
        const duration = globalPerformance.now() - startTime;
        DebugLogger.performance(`${className}.${propertyKey}`, duration);
        return asyncResult;
      });
    } catch (error) {
      const duration = globalPerformance.now() - startTime;
      DebugLogger.performance(`${className}.${propertyKey} (FAILED)`, duration);
      throw error;
    }
  };
  
  return descriptor;
}