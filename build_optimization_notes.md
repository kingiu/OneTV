# OneTV 应用构建优化说明

本文件记录了 OneTV 项目 Android 构建过程中的优化配置和问题解决方案，供后续参考使用。

## 一、主要问题及解决方案

### 1. JavaScript 堆内存溢出问题
**错误信息**: `FATAL ERROR: Reached heap limit Allocation failed - JavaScript heap out of memory`

**解决方案**:
- 增加 Node.js 内存限制：使用 `NODE_OPTIONS=--max-old-space-size=8192`
- 修改 Gradle JVM 内存配置
- 优化 Metro 配置，减少文件处理数量

### 2. Promise.all 参数过多问题
**错误信息**: `Too many elements passed to Promise.all`

**解决方案**:
- 优化 Metro 配置，限制监视目录范围
- 设置最大工作线程数

### 3. 插件解析失败
**错误信息**: `Failed to resolve plugin for module 'expo-optimize'`

**解决方案**:
- 从 app.json 中移除不存在的插件引用

## 二、关键配置文件修改

### 1. gradle.properties 优化

**文件**: `/root/OneTV/android/gradle.properties`

**主要修改**:
```properties
# 增加 JVM 内存和优化垃圾回收
org.gradle.jvmargs=-Xmx4096m -XX:MaxMetaspaceSize=1024m -XX:+UseG1GC -XX:MaxGCPauseMillis=200

# 增加内存相关配置
org.gradle.processResources.useAnt=true
org.gradle.caching=true
org.gradle.configureondemand=true
org.gradle.parallel=true

# 优化构建性能
export NODE_OPTIONS=--max-old-space-size=8192
```

### 2. metro.config.js 优化

**文件**: `/root/OneTV/metro.config.js`

**主要修改**:
- 启用 TV 特定扩展处理
- 限制监视目录为当前项目，避免处理过多文件
- 优化解析路径，减少依赖查找深度
- 设置最大工作线程数为 4
- 添加缓存优化配置

```javascript
// 启用 TV 特定扩展
if (process.env?.EXPO_TV === '1') {
  const originalSourceExts = config.resolver.sourceExts;
  const tvSourceExts = [
    ...originalSourceExts.map((e) => `tv.${e}`),
    ...originalSourceExts,
  ];
  config.resolver.sourceExts = tvSourceExts;
}

// 优化内存使用和性能
config.resolver.resolverMainFields = ['react-native', 'browser', 'main'];
config.resolver.platforms = ['android', 'ios', 'web'];
config.resolver.useWatchman = false;
config.maxWorkers = 4;

// 限制监视范围
config.watchFolders = [projectRoot];

// 优化解析路径
config.resolver.nodeModulesPaths = [
  path.resolve(projectRoot, "node_modules")
];
```

### 3. app.json 配置

**文件**: `/root/OneTV/app.json`

**注意事项**:
- 移除不存在的插件引用（如 `expo-optimize`）
- 确保插件配置正确，避免构建失败

## 三、构建命令

### 正式版构建命令
```bash
cd /root/OneTV/android && NODE_OPTIONS=--max-old-space-size=8192 ./gradlew assembleRelease
```

### Debug 版构建命令
```bash
cd /root/OneTV/android && NODE_OPTIONS=--max-old-space-size=4096 ./gradlew assembleDebug
```

## 四、APK 输出位置

- **正式版**: `/root/OneTV/android/app/build/outputs/apk/release/app-release.apk`
- **Debug 版**: `/root/OneTV/android/app/build/outputs/apk/debug/app-debug.apk`

## 五、其他优化建议

1. **预构建优化**：构建前执行 `yarn cache clean` 清理缓存
2. **Gradle 清理**：构建前执行 `./gradlew clean` 清理构建目录
3. **环境变量**：确保设置 `EXPO_TV=1` 环境变量以启用 TV 特定功能
4. **内存配置**：根据构建环境调整内存参数，避免过高或过低

## 六、常见问题排查

1. **内存溢出**：增加 NODE_OPTIONS 中的 max-old-space-size 值
2. **构建缓慢**：检查是否启用了 Gradle 缓存和并行构建
3. **插件错误**：确保所有引用的插件都已正确安装
4. **Metro 错误**：检查 metro.config.js 配置是否正确，移除不必要的配置项

---

最后更新时间: 2024年
