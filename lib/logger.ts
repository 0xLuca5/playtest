import fs from 'fs';
import path from 'path';

// 日志级别
export type LogLevel = 'debug' | 'info' | 'warn' | 'error';

// 日志类别
export type LogCategory = 'all' | 'ai' | 'app' | 'db';

// 日志配置
interface LoggerConfig {
  // 是否在控制台输出
  console: boolean;
  // 是否写入文件
  file: boolean;
  // 日志文件根目录
  logDir: string;
  // 最低日志级别
  minLevel: LogLevel;
  // 默认日志类别
  defaultCategory: LogCategory;
  // 每个类别的配置
  categoryConfig: {
    [key in LogCategory]: {
      enabled: boolean;
      minLevel: LogLevel;
    };
  };
}

// 默认配置
const defaultConfig: LoggerConfig = {
  console: true,
  file: true,
  logDir: path.join(process.cwd(), 'logs'),
  minLevel: 'info',
  defaultCategory: 'all',
  categoryConfig: {
    all: { enabled: true, minLevel: 'info' },
    ai: { enabled: true, minLevel: 'info' },
    app: { enabled: true, minLevel: 'info' },
    db: { enabled: true, minLevel: 'info' },
  },
};

// 日志级别映射
const LOG_LEVELS: Record<LogLevel, number> = {
  debug: 0,
  info: 1,
  warn: 2,
  error: 3,
};

/**
 * 统一日志管理类
 */
class Logger {
  private config: LoggerConfig;
  private moduleName: string;
  private category: LogCategory;

  /**
   * 创建日志记录器
   * @param moduleName 模块名称
   * @param category 日志类别
   * @param config 日志配置
   */
  constructor(moduleName: string, category: LogCategory = 'app', config: Partial<LoggerConfig> = {}) {
    this.config = { ...defaultConfig, ...config };
    this.moduleName = moduleName;
    this.category = category;

    // 确保日志目录存在
    if (this.config.file) {
      // 创建所有日志目录
      const categories: LogCategory[] = ['all', 'ai', 'app', 'db'];
      categories.forEach(cat => {
        const logDir = path.join(this.config.logDir, cat);
        if (!fs.existsSync(logDir)) {
          fs.mkdirSync(logDir, { recursive: true });
        }
      });
    }
  }

  /**
   * 格式化日志消息
   */
  private formatMessage(level: LogLevel, message: string): string {
    const timestamp = new Date().toISOString();
    return `[${timestamp}] [${level.toUpperCase()}] [${this.moduleName}] [${this.category}] ${message}`;
  }

  /**
   * 写入日志文件
   */
  private writeToFile(formattedMessage: string): void {
    if (!this.config.file) return;

    const date = new Date().toISOString().split('T')[0]; // YYYY-MM-DD

    // 写入总日志
    if (this.config.categoryConfig.all.enabled) {
      const allLogFile = path.join(this.config.logDir, 'all', `${date}.log`);
      fs.appendFileSync(allLogFile, formattedMessage + '\n');
    }

    // 写入分类日志
    if (this.category !== 'all' && this.config.categoryConfig[this.category].enabled) {
      const categoryLogFile = path.join(this.config.logDir, this.category, `${date}.log`);
      fs.appendFileSync(categoryLogFile, formattedMessage + '\n');
    }
  }

  /**
   * 记录日志
   */
  private log(level: LogLevel, message: string, ...args: any[]): void {
    // 检查总体日志级别
    if (LOG_LEVELS[level] < LOG_LEVELS[this.config.minLevel]) {
      return;
    }

    // 检查分类日志级别
    if (this.category !== 'all' && 
        LOG_LEVELS[level] < LOG_LEVELS[this.config.categoryConfig[this.category].minLevel]) {
      return;
    }

    // 处理参数
    let finalMessage = message;
    if (args.length > 0) {
      try {
        // 尝试格式化消息
        finalMessage = message.replace(/{(\d+)}/g, (match, number) => {
          return typeof args[number] !== 'undefined' ? String(args[number]) : match;
        });
        
        // 添加额外参数
        const extraArgs = args.filter((_, index) => !message.includes(`{${index}}`));
        if (extraArgs.length > 0) {
          const extraArgsStr = extraArgs.map(arg => 
            typeof arg === 'object' ? JSON.stringify(arg) : String(arg)
          ).join(' ');
          
          if (extraArgsStr.trim()) {
            finalMessage += ' ' + extraArgsStr;
          }
        }
      } catch (e) {
        // 如果格式化失败，直接连接所有参数
        finalMessage = [message, ...args.map(arg => 
          typeof arg === 'object' ? JSON.stringify(arg) : String(arg)
        )].join(' ');
      }
    }

    // 格式化消息
    const formattedMessage = this.formatMessage(level, finalMessage);

    // 控制台输出
    if (this.config.console) {
      switch (level) {
        case 'debug':
          console.debug(formattedMessage);
          break;
        case 'info':
          console.info(formattedMessage);
          break;
        case 'warn':
          console.warn(formattedMessage);
          break;
        case 'error':
          console.error(formattedMessage);
          break;
      }
    }

    // 写入文件
    this.writeToFile(formattedMessage);
  }

  /**
   * 调试级别日志
   */
  debug(message: string, ...args: any[]): void {
    this.log('debug', message, ...args);
  }

  /**
   * 信息级别日志
   */
  info(message: string, ...args: any[]): void {
    this.log('info', message, ...args);
  }

  /**
   * 警告级别日志
   */
  warn(message: string, ...args: any[]): void {
    this.log('warn', message, ...args);
  }

  /**
   * 错误级别日志
   */
  error(message: string, ...args: any[]): void {
    this.log('error', message, ...args);
  }

  /**
   * 更改日志类别
   */
  setCategory(category: LogCategory): Logger {
    this.category = category;
    return this;
  }

  /**
   * 创建子日志记录器
   */
  child(subModule: string, category?: LogCategory): Logger {
    const childModuleName = `${this.moduleName}:${subModule}`;
    return new Logger(childModuleName, category || this.category, this.config);
  }
}

/**
 * 创建日志记录器
 * @param moduleName 模块名称
 * @param category 日志类别
 * @param config 日志配置
 */
export function createLogger(
  moduleName: string, 
  category: LogCategory = 'app', 
  config: Partial<LoggerConfig> = {}
): Logger {
  return new Logger(moduleName, category, config);
}

// 创建不同类别的日志记录器
export const appLogger = createLogger('app', 'app');
export const aiLogger = createLogger('ai', 'ai');
export const dbLogger = createLogger('db', 'db');

// 默认日志记录器
export const logger = appLogger;

// 导出默认实例的方法，方便直接使用
export const debug = logger.debug.bind(logger);
export const info = logger.info.bind(logger);
export const warn = logger.warn.bind(logger);
export const error = logger.error.bind(logger); 