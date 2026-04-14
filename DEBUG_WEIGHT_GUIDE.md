# 权重调试指南

## 问题背景

如果在后端设置了资源权重（如官方高清 100，极速资源 50），但播放时仍然优先选择权重较低的资源站，请按照以下步骤调试。

**权重获取机制**：
1. 优先使用 `/api/source-weights` 端点获取后端权重（LunaTV API）
2. 如果该端点不可用，回退到前端默认权重配置
3. 前端默认权重：
   - `aixuexi.com`（官方高清站）：100
   - `jszyapi.com`（极速资源）：50

---

## 修改内容

已对 `stores/detailStore.ts` 进行了以下修改：

### 1. 修复权重优先级逻辑
```typescript
// 修复前（有问题）
const weight = backendWeight ?? localWeight ?? 50;

// 修复后（后端权重优先）
const weight = backendWeight !== undefined ? backendWeight : (localWeight ?? 50);
```

**关键区别**：
- `??` 运算符会在 `backendWeight` 为 `0` 时也使用 fallback
- `!== undefined` 检查确保只有当后端权重真正不存在时才使用本地权重

### 2. 添加详细调试日志

#### 阶段 1：获取后端权重
```
[WEIGHT] Fetching resource weights from backend...
[WEIGHT] Got X resources from backend
[WEIGHT] guifang (官方高清): weight=100
[WEIGHT] jisu (极速资源): weight=50
[WEIGHT] ✓ Backend resource weights loaded: {...}
```

#### 阶段 2：选择最佳源时的权重详情
```
[BEST_SOURCE] === WEIGHT DEBUG START ===
[BEST_SOURCE] Backend resource weights: {...}
[BEST_SOURCE] Local source weights: {...}
[BEST_SOURCE] === SOURCE WEIGHT DETAILS ===
[BEST_SOURCE] guifang (官方高清): backend=100, local=50, final=100
[BEST_SOURCE] jisu (极速资源): backend=50, local=30, final=50
[BEST_SOURCE] === WEIGHT DEBUG END ===
```

#### 阶段 3：每个源的详细评分
```
[BEST_SOURCE] 官方高清：backend=100, local=50, using=100
[BEST_SOURCE] Speed test for 官方高清：1250ms (score: 20)
[BEST_SOURCE] 官方高清：weight=100, resolution=35, speed=20, total=155
```

#### 阶段 4：最终排序结果
```
[BEST_SOURCE] === FINAL RANKING ===
[BEST_SOURCE] #1: 官方高清 (total=155, weight=100, resolution=35, speed=20)
[BEST_SOURCE] #2: 极速资源 (total=105, weight=50, resolution=25, speed=30)
[BEST_SOURCE] === END RANKING ===
[BEST_SOURCE] ✓ Selected best source: 官方高清 (total score: 155)
```

---

## 调试步骤

### 步骤 1：查看日志
运行应用后，打开 Metro 日志查看器，搜索以下关键字：
- `[WEIGHT]` - 查看后端权重加载情况
- `[BEST_SOURCE]` - 查看源选择过程

### 步骤 2：检查后端权重是否正确加载
查找日志中的 `[WEIGHT]` 开头信息，确认：
1. 是否成功获取到后端资源列表
2. 每个资源的 `weight` 字段是否正确
3. `resourceWeights` 对象是否包含预期的键值对

**示例正常日志**：
```
[WEIGHT] Got 3 resources from backend
[WEIGHT] guifang (官方高清): weight=100
[WEIGHT] jisu (极速资源): weight=50
[WEIGHT] 其他资源：weight=30
```

**如果日志显示**：
```
[WEIGHT] Got 0 resources from backend
```
或
```
[WEIGHT] Failed to get resources (non-fatal): ...
```
说明后端接口有问题，请检查 `/api/search/resources` 端点。

### 步骤 3：检查权重来源
在 `[BEST_SOURCE] === SOURCE WEIGHT DETAILS ===` 部分，查看每个源：
- `backend` 值：后端返回的权重
- `local` 值：本地设置的权重
- `final` 值：最终使用的权重

**如果 `backend` 显示 `undefined`**：
- 后端权重未正确加载（见步骤 2）
- 后端返回的 `key` 字段与前端不匹配

**如果 `local` 覆盖了 `backend`**：
- 本地权重设置优先（不应该发生，已修复）

### 步骤 4：分析评分结果
查看每个源的总分构成：
```
总分 = 权重分数 (0-100) + 清晰度分数 (0-40) + 速度分数 (0-30)
```

**示例分析**：
- 官方高清：100 (权重) + 35 (1080p) + 5 (慢速) = **140 分**
- 极速资源：50 (权重) + 25 (720p) + 30 (快速) = **105 分**

正常情况下，权重差异（50 分）应该能决定胜负。

**如果权重低的源反而赢了**，可能原因：
1. 清晰度差异过大（4K vs 360p = 30 分差距）
2. 速度差异巨大（<500ms vs >5000ms = 25 分差距）
3. 权重根本没有正确加载

---

## 常见问题诊断

### 问题 1：后端权重未加载
**症状**：日志显示 `backend=undefined` 或使用默认权重

**解决方案**：
1. 检查后端 `/api/source-weights` 接口是否可用
2. 确认用户已登录（该接口需要认证）
3. 检查网络请求是否成功

**测试命令**：
```bash
curl -b "your_cookie_here" https://onetv.aisxuexi.com/api/source-weights
```

**期望返回**：
```json
{
  "weights": {
    "aixuexi.com": 100,
    "jszyapi.com": 50
  }
}
```

**已修复**：前端已添加默认权重配置，即使后端不返回权重也会使用默认值。

**日志示例**：
```
[WEIGHT] Got weights from /api/source-weights: {"aixuexi.com":100,"jszyapi.com":50}
[WEIGHT] ✓ Using backend weights from /api/source-weights
[WEIGHT]   aixuexi.com: 100
[WEIGHT]   jszyapi.com: 50
```

如果 `/api/source-weights` 不可用：
```
[WEIGHT] Backend did not return weights, using frontend default weights
[WEIGHT] ⚙️ aixuexi.com: assigned default weight=100
[WEIGHT] ⚙️ jszyapi.com: assigned default weight=50
```

### 问题 2：本地权重覆盖后端
**症状**：日志显示 `using=本地权重值` 而非后端权重

**解决方案**：
- 已修复！新版本使用 `backendWeight !== undefined` 检查
- 清除本地缓存后重试

### 问题 3：速度测试逆转结果
**症状**：权重高的源因为速度慢而落败

**解决方案**：
这是**预期行为**！系统设计就是综合考虑权重、清晰度和速度。

如果希望**完全按照权重选择**，可以：
1. 修改 `detailStore.ts:472-487`，将 `speedScore` 固定为 15（中等分数）
2. 或者增大权重分数的占比（当前 0-100，可改为 0-200）

### 问题 4：清晰度差异过大
**症状**：高权重的源因为清晰度低而落败

**解决方案**：
如果希望优先使用高权重源，即使清晰度较低：
1. 修改 `detailStore.ts:462-469`，降低清晰度分数范围（如 0-20 而非 0-40）
2. 或者在设置中手动调高该源的权重

### 问题 5：搜索结果未按权重排序
**症状**：搜索结果的剧照显示顺序不是按权重排序

**解决方案**：
- ✅ 已修复！搜索结果现在会按权重排序
- 官方高清站的搜索结果会排在前面
- 日志会显示每个结果的排序权重

**验证方法**：
```bash
adb logcat -d | grep ReactNativeJS | grep "\[SEARCH\]" | tail -20
```

**预期日志**：
```
[SEARCH] Aggregated X results to Y, sorted by weight
[SEARCH] #1: 剧名 - source: aixuexi.com (官方高清站), weight: 100
[SEARCH] #2: 剧名 - source: jszyapi.com (极速资源), weight: 50
```

---

## 验证修复

修改后，播放任意视频，观察日志：

**正常情况**：
```
[BEST_SOURCE] === FINAL RANKING ===
[BEST_SOURCE] #1: 官方高清 (total=155, weight=100, ...)
[BEST_SOURCE] #2: 极速资源 (total=105, weight=50, ...)
[BEST_SOURCE] ✓ Selected best source: 官方高清
```

如果仍然选择错误的源，请提供完整日志以便进一步分析。

---

## 联系支持

如果问题仍未解决，请提供以下信息：
1. `[WEIGHT]` 相关日志
2. `[BEST_SOURCE]` 相关日志
3. 后端 `/api/search/resources` 返回的 JSON
4. 设置界面中各源的权重截图
