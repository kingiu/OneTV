import Logger from './Logger';

const logger = Logger.withTag('PerformanceMonitor');

interface PerformanceMetric {
  name: string;
  startTime: number;
  endTime?: number;
  duration?: number;
  metadata?: Record<string, any>;
}

interface PerformanceReport {
  metrics: PerformanceMetric[];
  totalDuration: number;
  timestamp: number;
  metadata?: Record<string, any>;
}

class PerformanceMonitor {
  private static instance: PerformanceMonitor;
  private metrics: Map<string, PerformanceMetric> = new Map();
  private reports: PerformanceReport[] = [];
  private MAX_REPORTS = 100;

  private constructor() {}

  static getInstance(): PerformanceMonitor {
    if (!PerformanceMonitor.instance) {
      PerformanceMonitor.instance = new PerformanceMonitor();
    }
    return PerformanceMonitor.instance;
  }

  /**
   * 开始记录一个性能指标
   * @param name 指标名称
   * @param metadata 元数据
   */
  start(name: string, metadata?: Record<string, any>): void {
    const metric: PerformanceMetric = {
      name,
      startTime: performance.now(),
      metadata,
    };
    this.metrics.set(name, metric);
    logger.info(`[PERF] ${name} started`);
  }

  /**
   * 结束记录一个性能指标
   * @param name 指标名称
   * @param metadata 元数据
   * @returns 指标持续时间
   */
  end(name: string, metadata?: Record<string, any>): number | undefined {
    const metric = this.metrics.get(name);
    if (metric) {
      const endTime = performance.now();
      const duration = endTime - metric.startTime;
      metric.endTime = endTime;
      metric.duration = duration;
      if (metadata) {
        metric.metadata = { ...metric.metadata, ...metadata };
      }
      this.metrics.delete(name);
      logger.info(`[PERF] ${name} completed in ${duration.toFixed(2)}ms`);
      return duration;
    }
    logger.warn(`[PERF] Attempted to end non-existent metric: ${name}`);
    return undefined;
  }

  /**
   * 记录一个立即完成的性能指标
   * @param name 指标名称
   * @param metadata 元数据
   */
  mark(name: string, metadata?: Record<string, any>): void {
    const startTime = performance.now();
    const duration = 0;
    logger.info(`[PERF] ${name} marked at ${startTime.toFixed(2)}ms`);
    
    // 直接添加到报告
    this.addToReport({
      name,
      startTime,
      endTime: startTime,
      duration,
      metadata,
    });
  }

  /**
   * 清除所有未结束的指标
   */
  clear(): void {
    this.metrics.clear();
    logger.info('[PERF] Cleared all metrics');
  }

  /**
   * 生成性能报告
   * @param metadata 报告元数据
   * @returns 性能报告
   */
  generateReport(metadata?: Record<string, any>): PerformanceReport {
    // 将所有未结束的指标标记为已结束
    this.metrics.forEach((metric, name) => {
      this.end(name);
    });

    const metrics = Array.from(this.metrics.values());
    const totalDuration = metrics.length > 0 
      ? (metrics[metrics.length - 1].endTime || 0) - metrics[0].startTime 
      : 0;

    const report: PerformanceReport = {
      metrics,
      totalDuration,
      timestamp: Date.now(),
      metadata,
    };

    // 添加到报告历史
    this.reports.push(report);
    if (this.reports.length > this.MAX_REPORTS) {
      this.reports.shift();
    }

    logger.info(`[PERF] Generated report: ${metrics.length} metrics, total duration: ${totalDuration.toFixed(2)}ms`);
    return report;
  }

  /**
   * 获取最近的报告
   * @param count 报告数量
   * @returns 最近的报告
   */
  getRecentReports(count: number = 10): PerformanceReport[] {
    return this.reports.slice(-count);
  }

  /**
   * 获取平均性能数据
   * @param metricName 指标名称
   * @param count 统计数量
   * @returns 平均时长
   */
  getAverageDuration(metricName: string, count: number = 10): number {
    const recentReports = this.getRecentReports(count);
    let totalDuration = 0;
    let countValid = 0;

    for (const report of recentReports) {
      const metric = report.metrics.find(m => m.name === metricName);
      if (metric?.duration !== undefined) {
        totalDuration += metric.duration;
        countValid++;
      }
    }

    return countValid > 0 ? totalDuration / countValid : 0;
  }

  /**
   * 记录语音命令处理流程
   */
  trackVoiceCommandToDetailFlow(): {
    startSearch: () => void;
    endSearch: (results: number) => void;
    startDetailLoad: () => void;
    endDetailLoad: () => void;
    generateFlowReport: () => PerformanceReport;
  } {
    const flowName = 'voiceCommandToDetail';
    this.start(flowName);

    return {
      startSearch: () => {
        this.start(`${flowName}_search`);
      },
      endSearch: (results: number) => {
        this.end(`${flowName}_search`, { results });
      },
      startDetailLoad: () => {
        this.start(`${flowName}_detailLoad`);
      },
      endDetailLoad: () => {
        this.end(`${flowName}_detailLoad`);
      },
      generateFlowReport: () => {
        this.end(flowName);
        return this.generateReport({ flow: flowName });
      },
    };
  }

  /**
   * 将单个指标添加到报告
   */
  private addToReport(metric: PerformanceMetric): void {
    // 创建一个包含单个指标的报告
    const report: PerformanceReport = {
      metrics: [metric],
      totalDuration: metric.duration || 0,
      timestamp: Date.now(),
    };

    this.reports.push(report);
    if (this.reports.length > this.MAX_REPORTS) {
      this.reports.shift();
    }
  }
}

export default PerformanceMonitor.getInstance();
