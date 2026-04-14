# Cookie双重编码问题修复

## 问题描述

应用搜索"太平年"时返回0结果，无法获取到任何视频源数据。

## 根本原因

**后端返回的cookie是双重URL编码的，导致认证失败**

### 问题表现

1. **后端API需要认证**：搜索API需要有效的认证cookie才能返回结果
2. **双重编码问题**：后端在Set-Cookie中返回的cookie值已经是双重URL编码
   - 原始值：`{"role":"owner","username":"admin",...}`
   - 第一次编码：`%7B%22role%22%3A%22owner%22...`
   - 后端返回：`%257B%2522role%2522%253A%2522owner%2522...`（双重编码）
3. **应用保存了双重编码的cookie**：应用直接保存了后端返回的值，没有进行解码
4. **认证失败**：当应用发送请求时，浏览器再次对cookie进行编码，变成三重编码，后端无法正确解析

### 证据

1. **后端API测试**：
   - 不使用认证：返回401 Unauthorized
   - 使用admin登录后搜索：返回200，有1个结果

2. **Cookie编码分析**：
   - 后端返回：`%257B%2522role%2522%253A%2522owner%2522...`
   - 第一次解码：`%7B%22role%22%3A%22owner%22...`
   - 第二次解码：`{"role":"owner","username":"admin",...}`

3. **应用日志**：
   - 搜索"太平年"所有变体都返回0结果
   - 认证cookie被双重编码

## 修复方案

在应用中添加cookie解码逻辑，确保保存的是原始未编码的cookie值。

### 修改文件

`/root/OneTV/services/api.ts`

### 修改内容

在所有保存cookie的地方添加解码逻辑：

```typescript
if (userAuthValue) {
  // 对后端返回的cookie进行解码，避免双重编码问题
  let decodedCookieValue = userAuthValue;
  try {
    // 尝试解码一次（处理双重编码的情况）
    decodedCookieValue = decodeURIComponent(userAuthValue);
    console.log('Decoded cookie value:', decodedCookieValue);
    
    // 再次尝试解码（确保处理双重编码）
    if (decodedCookieValue.startsWith('%')) {
      decodedCookieValue = decodeURIComponent(decodedCookieValue);
      console.log('Double decoded cookie value:', decodedCookieValue);
    }
  } catch (decodeError) {
    console.warn('Failed to decode cookie, using original value:', decodeError);
  }
  
  // 保存解码后的值
  await AsyncStorage.setItem("authCookies", decodedCookieValue);
  console.log('Auth cookie value saved successfully:', decodedCookieValue);
}
```

### 修改位置

1. `buildHeaders`方法中的自动登录逻辑（第107行）
2. `_fetch`方法中的Set-Cookie处理（第245行）
3. `_fetch`方法中的401错误重新登录逻辑（第342行）
4. `login`方法中的登录处理（第479行）
5. `register`方法中的注册处理（第561行）

## 预期效果

修复后，应用的cookie处理流程：

1. **后端返回**：`%257B%2522role%2522%253A%2522owner%2522...`（双重编码）
2. **应用解码**：`{"role":"owner","username":"admin",...}`（原始值）
3. **保存到AsyncStorage**：原始未编码的值
4. **发送请求时**：浏览器自动编码一次 → `%7B%22role%22%3A%22owner%22...`
5. **后端接收**：正确解析认证cookie，返回搜索结果

## 验证步骤

1. **清除应用数据**：
   - 打开设备设置
   - 找到OneTV应用
   - 清除数据

2. **重新登录**：
   - 打开应用
   - 使用admin/admin123登录
   - 检查日志中是否有"Decoded cookie value"和"Double decoded cookie value"

3. **测试搜索**：
   - 搜索"太平年"
   - 应该返回1个结果
   - 检查日志中应该有"Variant ... found X results"（X > 0）

## 注意事项

1. **兼容性**：解码逻辑会自动检测是否需要解码，兼容单次编码和未编码的情况
2. **错误处理**：如果解码失败，会使用原始值并记录警告日志
3. **日志输出**：添加了详细的日志输出，便于调试和问题排查

## 后续建议

1. **联系后端团队**：建议后端修复cookie编码问题，返回未编码的值
2. **添加单元测试**：为cookie解码逻辑添加单元测试
3. **监控日志**：在生产环境中监控cookie解码相关的日志，确保解码正常工作
