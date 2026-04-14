#!/bin/bash

echo "=== ADB Expo AV 专用日志分析器 ==="
echo "用于捕获和分析 Android 设备上 Expo AV 播放器的详细日志"
echo ""

PACKAGE_NAME="com.guozhi.onetv"
LOG_FILE="/tmp/expo_av_detailed_log.txt"
ANALYSIS_FILE="/tmp/expo_av_analysis.txt"

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
echo "=== 5. 开始捕获 Expo AV 相关日志 ==="
echo "正在捕获日志... 请在设备上进行播放操作"
echo "按 Ctrl+C 停止捕获"
echo ""

# 捕获所有日志，然后过滤
echo "正在捕获所有日志..."
adb logcat -v time > "$LOG_FILE" &

LOG_PID=$!

sleep 45  # 捕获45秒日志

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
EXPO_AV_COUNT=$(grep -i "expo.*av" "$LOG_FILE" | wc -l)
AUDIO_FOCUS_COUNT=$(grep -i "AudioManager|MediaFocusControl" "$LOG_FILE" | wc -l)

# 写入统计信息
echo "错误日志数量: $ERROR_COUNT" >> "$ANALYSIS_FILE"
echo "警告日志数量: $WARNING_COUNT" >> "$ANALYSIS_FILE"
echo "Expo AV 相关日志: $EXPO_AV_COUNT" >> "$ANALYSIS_FILE"
echo "音频焦点相关日志: $AUDIO_FOCUS_COUNT" >> "$ANALYSIS_FILE"
echo "" >> "$ANALYSIS_FILE"

# 分类分析
echo "--- 详细分析 ---" >> "$ANALYSIS_FILE"

# Expo AV 相关日志
echo "1. Expo AV 相关日志:" >> "$ANALYSIS_FILE"
grep -i "expo.*av|AVManager" "$LOG_FILE" | head -30 >> "$ANALYSIS_FILE"
echo "" >> "$ANALYSIS_FILE"

# 音频焦点管理
echo "2. 音频焦点管理:" >> "$ANALYSIS_FILE"
grep -i "AudioManager|MediaFocusControl" "$LOG_FILE" | head -20 >> "$ANALYSIS_FILE"
echo "" >> "$ANALYSIS_FILE"

# React Native JS 日志
echo "3. React Native JS 日志:" >> "$ANALYSIS_FILE"
grep -i "ReactNativeJS" "$LOG_FILE" | head -30 >> "$ANALYSIS_FILE"
echo "" >> "$ANALYSIS_FILE"

# 播放器相关日志
echo "4. 播放器相关日志:" >> "$ANALYSIS_FILE"
grep -i "player|video|audio" "$LOG_FILE" | head -30 >> "$ANALYSIS_FILE"
echo "" >> "$ANALYSIS_FILE"

# 网络相关日志
echo "5. 网络相关日志:" >> "$ANALYSIS_FILE"
grep -i "network|http|https|ssl" "$LOG_FILE" | head -20 >> "$ANALYSIS_FILE"
echo "" >> "$ANALYSIS_FILE"

# 错误和异常
echo "6. 错误和异常:" >> "$ANALYSIS_FILE"
grep -E "E/|Exception|Error" "$LOG_FILE" | head -30 >> "$ANALYSIS_FILE"
echo "" >> "$ANALYSIS_FILE"

# 显示分析结果
echo "--- 分析结果摘要 ---"
echo "错误日志数量: $ERROR_COUNT"
echo "警告日志数量: $WARNING_COUNT"
echo "Expo AV 相关日志: $EXPO_AV_COUNT"
echo "音频焦点相关日志: $AUDIO_FOCUS_COUNT"
echo ""
echo "--- 详细分析 ---"
cat "$ANALYSIS_FILE"
echo ""

# 生成解决方案建议
echo "=== 7. 解决方案建议 ==="
echo ""

# 基于日志内容生成建议
if grep -i "expo.*av" "$LOG_FILE" | grep -i "error" > /dev/null; then
    echo "🔧 Expo AV 播放器问题建议:"
    echo "- 检查 Expo AV 版本是否与 React Native 版本兼容"
    echo "- 确保视频格式被设备支持（建议使用 H.264 编码）"
    echo "- 实现播放器错误处理和自动恢复机制"
    echo ""
fi

if grep -i "AudioManager" "$LOG_FILE" | grep -i "error" > /dev/null; then
    echo "🔧 音频焦点问题建议:"
    echo "- 确保正确处理音频焦点的获取和释放"
    echo "- 检查应用在后台时的音频处理逻辑"
    echo ""
fi

if grep -i "network" "$LOG_FILE" | grep -i "error" > /dev/null; then
    echo "🔧 网络问题建议:"
    echo "- 检查网络连接稳定性"
    echo "- 实现网络错误重试机制"
    echo "- 考虑添加缓存机制"
    echo ""
fi

if grep -i "ReactNativeJS" "$LOG_FILE" | grep -i "error" > /dev/null; then
    echo "🔧 JavaScript 错误建议:"
    echo "- 检查应用的 JavaScript 代码是否有错误"
    echo "- 确保所有 Promise 都有正确的错误处理"
    echo "- 检查组件渲染是否有问题"
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
