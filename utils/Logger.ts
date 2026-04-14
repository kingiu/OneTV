/**
 * 统一日志管理器
 * 在开发环境输出完整日志，生产环境移除所有日志代码
 */

export enum LogLevel {
  DEBUG = 0,
  INFO = 1,
  WARN = 2,
  ERROR = 3,
}

interface LoggerOptions {
  tag?: string;
  level?: LogLevel;
}

class LoggerClass {
  private minLevel: LogLevel = LogLevel.DEBUG;

  /**
   * 设置最小日志级别
   */
  setMinLevel(level: LogLevel): void {
    if (__DEV__) {
      this.minLevel = level;
    }
  }

  /**
   * 格式化日志输出
   */
  private formatMessage(level: string, tag: string | undefined, message: unknown, ...args: unknown[]): void {
    if (!__DEV__) return;

    const timestamp = new Date().toISOString().substr(11, 12);
    const prefix = tag ? `[${timestamp}][${level}][${tag}]` : `[${timestamp}][${level}]`;

    switch (level) {
    case 'DEBUG':
      console.log(prefix, message, ...args);
      break;
    case 'INFO':
      console.info(prefix, message, ...args);
      break;
    case 'WARN':
      console.warn(prefix, message, ...args);
      break;
    case 'ERROR':
      console.error(prefix, message, ...args);
      break;
    }
  }

  /**
   * 调试级别日志
   */
  debug(message: unknown, ...args: unknown[]): void;
  debug(options: LoggerOptions, message: unknown, ...args: unknown[]): void;
  debug(optionsOrMessage: LoggerOptions | unknown, message?: unknown, ...args: unknown[]): void {
    if (!__DEV__) return;

    if (this.minLevel > LogLevel.DEBUG) return;

    if (typeof optionsOrMessage === 'object' && optionsOrMessage !== null && 'tag' in optionsOrMessage) {
      const options = optionsOrMessage as LoggerOptions;
      this.formatMessage('DEBUG', options.tag, message, ...args);
    } else {
      this.formatMessage('DEBUG', undefined, optionsOrMessage, message, ...args);
    }
  }

  /**
   * 信息级别日志
   */
  info(message: unknown, ...args: unknown[]): void;
  info(options: LoggerOptions, message: unknown, ...args: unknown[]): void;
  info(optionsOrMessage: LoggerOptions | unknown, message?: unknown, ...args: unknown[]): void {
    if (!__DEV__) return;

    if (this.minLevel > LogLevel.INFO) return;

    if (typeof optionsOrMessage === 'object' && optionsOrMessage !== null && 'tag' in optionsOrMessage) {
      const options = optionsOrMessage as LoggerOptions;
      this.formatMessage('INFO', options.tag, message, ...args);
    } else {
      this.formatMessage('INFO', undefined, optionsOrMessage, message, ...args);
    }
  }

  /**
   * 警告级别日志
   */
  warn(message: unknown, ...args: unknown[]): void;
  warn(options: LoggerOptions, message: unknown, ...args: unknown[]): void;
  warn(optionsOrMessage: LoggerOptions | unknown, message?: unknown, ...args: unknown[]): void {
    if (!__DEV__) return;

    if (this.minLevel > LogLevel.WARN) return;

    if (typeof optionsOrMessage === 'object' && optionsOrMessage !== null && 'tag' in optionsOrMessage) {
      const options = optionsOrMessage as LoggerOptions;
      this.formatMessage('WARN', options.tag, message, ...args);
    } else {
      this.formatMessage('WARN', undefined, optionsOrMessage, message, ...args);
    }
  }

  /**
   * 错误级别日志
   */
  error(message: unknown, ...args: unknown[]): void;
  error(options: LoggerOptions, message: unknown, ...args: unknown[]): void;
  error(optionsOrMessage: LoggerOptions | unknown, message?: unknown, ...args: unknown[]): void {
    if (!__DEV__) return;

    if (this.minLevel > LogLevel.ERROR) return;

    if (typeof optionsOrMessage === 'object' && optionsOrMessage !== null && 'tag' in optionsOrMessage) {
      const options = optionsOrMessage as LoggerOptions;
      this.formatMessage('ERROR', options.tag, message, ...args);
    } else {
      this.formatMessage('ERROR', undefined, optionsOrMessage, message, ...args);
    }
  }

  /**
   * 创建带标签的日志实例
   */
  withTag(tag: string): LoggerClass {
    const taggedLogger = new LoggerClass();
    taggedLogger.minLevel = this.minLevel;

    const originalDebug = taggedLogger.debug.bind(taggedLogger);
    const originalInfo = taggedLogger.info.bind(taggedLogger);
    const originalWarn = taggedLogger.warn.bind(taggedLogger);
    const originalError = taggedLogger.error.bind(taggedLogger);

    taggedLogger.debug = (message: unknown, ...args: unknown[]) => originalDebug({ tag }, message, ...args);
    taggedLogger.info = (message: unknown, ...args: unknown[]) => originalInfo({ tag }, message, ...args);
    taggedLogger.warn = (message: unknown, ...args: unknown[]) => originalWarn({ tag }, message, ...args);
    taggedLogger.error = (message: unknown, ...args: unknown[]) => originalError({ tag }, message, ...args);

    return taggedLogger;
  }
}

export const Logger = new LoggerClass();
export default Logger;
