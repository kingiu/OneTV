# 性能优化规则

## 资源加载
- 图片/视频使用懒加载（`loading="lazy"`）。
- 首屏关键 CSS 内联，非关键 CSS 异步加载。
- 第三方脚本使用 `defer` 或 `async`。

## 代码执行
- 避免在循环中调用同步 I/O（如 `fs.readFileSync`）。
- 高频事件（scroll、resize）必须节流/防抖（延迟 ≤ 100ms）。
- 数组/对象遍历优先使用 `for...of` / `for`，`forEach` 可能比 `for` 慢（但可读性优先）。

## 内存管理
- 全局变量/单例中存储大量数据时必须设置上限和过期策略。
- 监听器（addEventListener）必须在组件卸载时移除。
- 定时器（setInterval）必须在页面/服务关闭时清除。

## 数据库/API
- 列表查询必须分页（`limit` + `offset` 或游标）。
- 避免 N+1 查询，使用 `IN` 或 JOIN 或 DataLoader。
- 外部 API 调用必须设置超时（默认 5s）和重试（最多 3 次，指数退避）。