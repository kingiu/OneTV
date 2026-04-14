#!/bin/bash

echo "=== ADB Expo AV 播放器日志分析器 ==="
echo "用于捕获和分析 Android 设备上 Expo AV 播放器的错误和警告日志"
echo ""

PACKAGE_NAME="com.guozhi.onetv"
LOG_FILE="/tmp/expo_player_log.txt"
ANALYSIS_FILE="/tmp/expo_player_analysis.txt"

# 清除旧日志
echo "=== 1. 清除旧日志 ==="
adb logcat -c
echo "✅ 日志已清除"
echo ""

# 启动应用
echo "=== 2. 启动应用 ==="
adb shell am start -n "$PACKAGE_NAME/.MainActivity"
sleep 3
echo "✅ 应用已启动"
echo ""

# 等待主页面加载
echo "=== 3. 等待主页面加载 ==="
sleep 5
echo ""

# 提示用户开始播放媒体
echo "=== 4. 准备开始捕获播放日志 ==="
echo "请在设备上选择一个视频并开始播放..."
echo ""
echo "3秒后开始捕获日志..."
sleep 1
echo "2秒后开始捕获日志..."
sleep 1
echo "1秒后开始捕获日志..."
sleep 1
echo ""

# 开始捕获日志
echo "=== 5. 开始捕获播放相关日志 ==="
echo "正在捕获日志... 请在设备上进行播放操作"
echo "按 Ctrl+C 停止捕获"
echo ""

# 捕获日志（实时监控）
adb logcat -v time "*:E" "*:W" | grep -i -E "expo-av|avplayer|video|audio|mediacodec|decode|encode|render|network|ssl|error|exception" > "$LOG_FILE" &

LOG_PID=$!

sleep 30  # 捕获30秒日志

# 停止捕获
kill $LOG_PID 2>/dev/null
sleep 2
echo ""
echo "✅ 日志捕获完成"
echo ""

# 分析日志
echo "=== 6. 分析捕获的日志 ==="
echo ""

# 清空分析文件
> "$ANALYSIS_FILE"

# 统计错误和警告数量
echo "--- 日志统计 ---" >> "$ANALYSIS_FILE"
ERROR_COUNT=$(grep -E "E/" "$LOG_FILE" | wc -l)
WARNING_COUNT=$(grep -E "W/" "$LOG_FILE" | wc -l)
echo "错误日志数量: $ERROR_COUNT" >> "$ANALYSIS_FILE"
echo "警告日志数量: $WARNING_COUNT" >> "$ANALYSIS_FILE"
echo "" >> "$ANALYSIS_FILE"

# 分类分析
echo "--- 错误类型分析 ---" >> "$ANALYSIS_FILE"

# Expo AV 相关问题
echo "1. Expo AV 播放器问题:" >> "$ANALYSIS_FILE"
grep -i "expo-av" "$LOG_FILE" | head -20 >> "$ANALYSIS_FILE"
echo "" >> "$ANALYSIS_FILE"

# 编解码问题
echo "2. 编解码问题:" >> "$ANALYSIS_FILE"
grep -i -E "mediacodec|decode|encode|codec" "$LOG_FILE" | head -20 >> "$ANALYSIS_FILE"
echo "" >> "$ANALYSIS_FILE"

# 网络问题
echo "3. 网络问题:" >> "$ANALYSIS_FILE"
grep -i -E "network|http|https|timeout|connection" "$LOG_FILE" | head -20 >> "$ANALYSIS_FILE"
echo "" >> "$ANALYSIS_FILE"

# SSL 问题
echo "4. SSL 证书问题:" >> "$ANALYSIS_FILE"
grep -i -E "ssl|certificate|tls" "$LOG_FILE" | head -20 >> "$ANALYSIS_FILE"
echo "" >> "$ANALYSIS_FILE"

# 硬件加速问题
echo "5. 硬件加速问题:" >> "$ANALYSIS_FILE"
grep -i -E "hardware|accel|gpu|render" "$LOG_FILE" | head -20 >> "$ANALYSIS_FILE"
echo "" >> "$ANALYSIS_FILE"

# 内存问题
echo "6. 内存问题:" >> "$ANALYSIS_FILE"
grep -i -E "memory|oom|heap" "$LOG_FILE" | head -20 >> "$ANALYSIS_FILE"
echo "" >> "$ANALYSIS_FILE"

# 权限问题
echo "7. 权限问题:" >> "$ANALYSIS_FILE"
grep -i -E "permission|denied|access" "$LOG_FILE" | head -20 >> "$ANALYSIS_FILE"
echo "" >> "$ANALYSIS_FILE"

# 显示分析结果
echo "--- 分析结果摘要 ---"
echo "错误日志数量: $ERROR_COUNT"
echo "警告日志数量: $WARNING_COUNT"
echo ""
echo "--- 详细分析 ---"
cat "$ANALYSIS_FILE"
echo ""

# 生成解决方案建议
echo "=== 7. 解决方案建议 ==="
echo ""

# 基于日志内容生成建议
if grep -i "expo-av" "$LOG_FILE" | grep -i "error" > /dev/null; then
    echo "🔧 Expo AV 播放器问题建议:"
    echo "- 检查 Expo AV 版本是否与 React Native 版本兼容"
    echo "- 确保视频格式被设备支持（建议使用 H.264 编码）"
    echo "- 实现播放器错误处理和自动恢复机制"
    echo ""
fi

if grep -i "mediacodec" "$LOG_FILE" | grep -i "error" > /dev/null; then
    echo "🔧 编解码问题建议:"
    echo "- 检查视频编码格式是否被设备支持"
    echo "- 考虑添加软解码 fallback 机制"
    echo "- 检查媒体文件是否损坏"
    echo "- 尝试降低视频分辨率或比特率"
    echo ""
fi

if grep -i "network" "$LOG_FILE" | grep -i "error" > /dev/null; then
    echo "🔧 网络问题建议:"
    echo "- 检查网络连接稳定性"
    echo "- 实现网络错误重试机制"
    echo "- 考虑添加缓存机制"
    echo "- 增加网络超时时间（建议 10-15 秒）"
    echo ""
fi

if grep -i "ssl" "$LOG_FILE" | grep -i "error" > /dev/null; then
    echo "🔧 SSL 证书问题建议:"
    echo "- 检查视频源的 SSL 证书是否有效"
    echo "- 考虑添加 SSL 证书验证跳过选项（仅用于测试）"
    echo "- 确保使用 HTTPS 协议的视频源"
    echo ""
fi

if grep -i "hardware" "$LOG_FILE" | grep -i "error" > /dev/null; then
    echo "🔧 硬件加速问题建议:"
    echo "- 尝试禁用硬件加速进行测试"
    echo "- 检查设备 GPU 驱动是否最新"
    echo "- 考虑降低视频分辨率"
    echo ""
fi

if grep -i "memory" "$LOG_FILE" | grep -i "error" > /dev/null; then
    echo "🔧 内存问题建议:"
    echo "- 检查内存使用情况，避免内存泄漏"
    echo "- 优化媒体资源加载和释放"
    echo "- 考虑降低视频分辨率或比特率"
    echo "- 实现视频预加载和释放机制"
    echo ""
fi

if grep -i "permission" "$LOG_FILE" | grep -i "denied" > /dev/null; then
    echo "🔧 权限问题建议:"
    echo "- 确保应用有必要的权限（如网络、存储）"
    echo "- 检查运行时权限请求逻辑"
    echo ""
fi

# 通用建议
echo "🔧 通用优化建议:"
echo "- 实现播放器状态监控和错误上报"
echo "- 优化媒体文件格式和编码参数"
echo "- 考虑使用预加载和缓冲机制"
echo "- 定期清理应用缓存"
echo "- 实现多线路自动切换机制"
echo "- 添加用户可选择的视频质量选项"
echo ""

# 验证方案
echo "=== 8. 解决方案验证方法 ==="
echo "1. 应用上述建议后，重新运行此脚本"
echo "2. 对比分析前后的错误和警告数量"
echo "3. 测试不同视频格式和网络条件下的播放效果"
echo "4. 监控应用在长时间播放后的稳定性"
echo "5. 测试不同设备型号的兼容性"
echo ""

echo "=== 分析完成 ==="
echo "💡 原始日志已保存到: $LOG_FILE"
echo "💡 分析报告已保存到: $ANALYSIS_FILE"
echo ""
echo "可以使用以下命令查看详细日志:"
echo "   cat $LOG_FILE | grep -i 'error'"
echo ""
echo "可以使用以下命令查看分析报告:"
echo "   cat $ANALYSIS_FILE"
