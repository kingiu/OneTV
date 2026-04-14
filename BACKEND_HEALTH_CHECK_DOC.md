# 后端健康检查与代理自动开关功能

## 功能概述

本功能实现了**智能的代理服务管理机制**，能够根据后端服务器的可用性自动开启或关闭代理功能。

### 核心特性

1. **自动检测后端状态**：定期（30 秒）检查后端服务器健康状态
2. **智能代理开关**：
   - 后端关闭时 → 自动禁用代理，直接使用源地址
   - 后端开启时 → 自动启用代理，使用后端加速
3. **无缝切换**：用户无需手动操作，系统自动处理
4. **性能优化**：健康检查结果缓存 30 秒，避免频繁请求

## 技术实现

### 1. ProxyService 增强

**文件**: `services/proxyService.ts`

#### 新增属性
```typescript
private backendAvailable: boolean | null = null;
private backendCheckPromise: Promise<boolean> | null = null;
private lastBackendCheckTime: number = 0;
private readonly BACKEND_CHECK_INTERVAL = 30000; // 30 秒
```

#### 核心方法

##### `checkBackendAvailability()`
检查后端服务器是否可用，带缓存机制：
- 首次调用：发起实际健康检查请求
- 30 秒内：返回缓存结果
- 超时时间：5 秒

```typescript
private async checkBackendAvailability(): Promise<boolean> {
  // 检查缓存
  if (this.backendCheckPromise && 
      (now - this.lastBackendCheckTime) < BACKEND_CHECK_INTERVAL) {
    return this.backendCheckPromise;
  }
  
  // 发起健康检查
  const response = await fetch(`${this.baseURL}/api/health`, {
    method: 'GET',
    signal: controller.signal,
  });
  
  return response.ok;
}
```

##### `buildProxyUrl()`
构建代理 URL 时自动检查后端状态：
```typescript
private async buildProxyUrl(targetUrl: string): Promise<string> {
  if (!this.config.enabled) return targetUrl;

  if (this.config.useBackendProxy && this.baseURL) {
    const isBackendAvailable = await this.checkBackendAvailability();
    
    if (!isBackendAvailable) {
      logger.warn('Backend unavailable, disabling proxy for this request');
      return targetUrl; // 后端不可用，返回原始 URL
    }
    
    return `${this.baseURL}/api/proxy/cdn?url=${encodeURIComponent(targetUrl)}`;
  }
  
  return targetUrl;
}
```

##### `fetch()`
主请求方法，自动处理代理回退：
```typescript
public async fetch(url: string, options: RequestInit = {}, retries = 2): Promise<Response> {
  const targetUrl = await this.buildProxyUrl(url);
  const isProxy = targetUrl !== url;
  
  if (!isProxy) {
    logger.debug('Proxy disabled or backend unavailable, using direct request');
  }
  
  // ... 请求逻辑
}
```

### 2. SettingsStore 增强

**文件**: `stores/settingsStore.ts`

#### 新增方法

##### `checkBackendAndSyncProxyConfig()`
在应用启动时检查后端状态并同步代理配置：

```typescript
checkBackendAndSyncProxyConfig: async () => {
  const state = get();
  const { apiBaseUrl } = state;
  
  try {
    const response = await fetch(`${apiBaseUrl}/api/health`, {
      method: 'GET',
      signal: controller.signal,
    });
    
    const isBackendAvailable = response.ok;
    
    // 后端不可用且当前使用后端代理 → 禁用代理
    if (!isBackendAvailable && state.proxyConfig.useBackendProxy) {
      state.setProxyConfig({ enabled: false });
    } 
    // 后端可用但代理被禁用 → 重新启用
    else if (isBackendAvailable && !state.proxyConfig.enabled && state.vodProxyEnabled) {
      state.setProxyConfig({ enabled: true });
    }
  } catch (error) {
    // 请求失败 → 禁用代理
    if (state.proxyConfig.useBackendProxy && state.proxyConfig.enabled) {
      state.setProxyConfig({ enabled: false });
    }
  }
}
```

##### `setApiBaseUrl()`
当用户修改 API 地址时，自动触发健康检查：
```typescript
setApiBaseUrl: async (url) => {
  set({ apiBaseUrl: url });
  api.setBaseUrl(url);
  proxyService.setBaseUrl(url);
  
  get().checkBackendAndSyncProxyConfig(); // 自动检查新地址的健康状态
}
```

## 工作流程

### 启动流程

```
应用启动
    ↓
loadSettings()
    ↓
设置默认 API 地址
    ↓
checkBackendAndSyncProxyConfig()
    ↓
发起 /api/health 请求
    ↓
┌─────────────────┬─────────────────┐
│  后端可用 (200)  │  后端不可用     │
└─────────────────┴─────────────────┘
    ↓                    ↓
保持 enabled: true   设置 enabled: false
    ↓                    ↓
正常使用代理        直接请求源地址
```

### 运行时流程

```
用户请求视频资源
    ↓
proxyService.fetch(url)
    ↓
buildProxyUrl(url)
    ↓
checkBackendAvailability()
    ↓
┌─────────────────┬─────────────────┐
│  后端可用        │  后端不可用     │
└─────────────────┴─────────────────┘
    ↓                    ↓
返回代理 URL        返回原始 URL
    ↓                    ↓
通过后端加速        直接访问源地址
```

## 后端 API 要求

### 健康检查端点

后端需要实现 `/api/health` 端点：

```typescript
// 后端示例（Node.js + Express）
app.get('/api/health', (req, res) => {
  res.json({
    status: 'ok',
    timestamp: Date.now(),
    version: '1.0.0'
  });
});
```

**要求**：
- 路径：`/api/health`
- 方法：`GET`
- 响应码：200 表示健康
- 超时：5 秒
- 无需认证

## 配置说明

### ProxyConfig 配置项

```typescript
interface ProxyConfig {
  enabled: boolean;          // 是否启用代理（自动管理）
  useBackendProxy: boolean;  // 是否使用后端代理
  proxyUrl?: string;         // Cloudflare Worker URL（可选）
  cacheEnabled: boolean;     // 是否启用缓存
  cacheTTL: number;          // 缓存时间（秒）
}
```

### 默认配置

```typescript
proxyConfig: {
  enabled: true,             // 默认启用
  useBackendProxy: true,     // 默认使用后端代理
  cacheEnabled: true,        // 默认启用缓存
  cacheTTL: 3600,            // 缓存 1 小时
}
```

## 日志输出

### 正常情况
```
Backend health check: available
Proxy fetch error: ... (仅在实际请求失败时)
```

### 后端关闭时
```
Backend health check failed: socket hang up
Auto-disabling proxy due to backend error
Proxy disabled or backend unavailable, using direct request
```

### 后端重启后
```
Backend health check: available
Backend available, re-enabling proxy
```

## 测试方法

### 单元测试
```bash
node test-backend-health-check.js
```

### 手动测试

1. **启动后端**：
   ```bash
   npm start  # 或 yarn start
   ```

2. **启动前端**：
   ```bash
   cd OneTV
   npm start
   ```

3. **观察日志**：
   - 应该看到 "Backend health check: available"
   - 代理功能正常启用

4. **关闭后端**：
   ```bash
   # 停止后端服务
   ```

5. **刷新前端**：
   - 应该看到 "Backend unavailable, auto-disabling proxy"
   - 视频请求直接访问源地址

6. **重启后端**：
   - 应该看到 "Backend available, re-enabling proxy"
   - 代理功能自动恢复

## 优势

1. **用户体验**：无需手动开关，系统自动处理
2. **容错性**：后端故障不影响基本功能
3. **性能**：健康检查结果缓存，减少开销
4. **可维护性**：清晰的日志输出，便于调试
5. **灵活性**：支持后端代理和 Cloudflare Worker 两种模式

## 注意事项

1. **首次请求延迟**：首次检查后端状态可能增加 5 秒延迟
2. **缓存时效**：30 秒内状态不会更新，适合稳定网络环境
3. **超时设置**：健康检查超时 5 秒，不会阻塞太久
4. **日志级别**：生产环境建议调高日志级别

## 故障排查

### 问题 1：代理一直禁用
**检查**：
- 后端 `/api/health` 端点是否正常
- 网络连接是否稳定
- 防火墙是否阻止请求

### 问题 2：代理一直启用（后端已关闭）
**检查**：
- 是否使用了 Cloudflare Worker 模式
- 缓存是否未过期（等待 30 秒）

### 问题 3：频繁切换代理状态
**解决**：
- 检查网络稳定性
- 增加 `BACKEND_CHECK_INTERVAL` 值
- 检查后端服务是否稳定

## 未来优化

1. **指数退避**：连续失败时增加检查间隔
2. **多端点检查**：检查多个端点确保后端真正可用
3. **用户通知**：后端状态变化时通知用户
4. **手动覆盖**：允许用户手动强制开启/关闭代理
