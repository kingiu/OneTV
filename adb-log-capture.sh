#!/bin/bash

echo "=== ADB 日志捕获脚本 - 搜索'危险关系'剧集 ==="
echo ""

PACKAGE_NAME="com.guozhi.onetv"

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
sleep 2
echo ""

# 模拟点击搜索框
echo "=== 4. 模拟点击搜索框 ==="
adb shell input tap 500 200
sleep 1
echo "✅ 点击搜索框"
echo ""

# 输入"危险关系"
echo "=== 5. 输入搜索关键词 ==="
adb shell input text "危险关系"
sleep 1
echo "✅ 输入关键词"
echo ""

# 模拟回车搜索
echo "=== 6. 模拟回车搜索 ==="
adb shell input keyevent 66
sleep 5
echo "✅ 已搜索"
echo ""

# 检查当前页面
echo "=== 7. 检查当前页面 ==="
CURRENT_ACTIVITY=$(adb shell dumpsys window | grep -A 1 "mCurrentFocus" | grep -o "com.guozhi.onetv/[^ }]*" | head -1)
echo "当前 Activity: $CURRENT_ACTIVITY"
echo ""

# 等待页面加载
echo "=== 8. 等待页面加载完成 ==="
sleep 3
echo ""

# 捕获日志
echo "=== 9. 捕获相关日志 ==="
echo "搜索关键词: 危险关系"
echo ""

# 捕获所有日志
adb logcat -d > /tmp/full_log.txt

# 过滤相关日志
echo "=== 10. 过滤相关日志 ==="
echo ""
echo "--- 包含"危险关系"的日志 ---"
grep -i "危险关系" /tmp/full_log.txt | tail -50
echo ""

echo "--- 包含"MATCHING"的日志 ---"
grep -i "MATCHING" /tmp/full_log.txt | tail -30
echo ""

echo "--- 包含"source"的日志 ---"
grep -i "source" /tmp/full_log.txt | tail -30
echo ""

echo "--- 包含"episode"的日志 ---"
grep -i "episode" /tmp/full_log.txt | tail -30
echo ""

echo "--- 包含"dedup"的日志 ---"
grep -i "dedup" /tmp/full_log.txt | tail -30
echo ""

echo "--- 包含"detailStore"的日志 ---"
grep -i "detailStore" /tmp/full_log.txt | tail -30
echo ""

echo "--- 包含"searchVideo"的日志 ---"
grep -i "searchVideo" /tmp/full_log.txt | tail -30
echo ""

echo "--- 包含"Already read"的日志 ---"
grep -i "Already read" /tmp/full_log.txt | tail -20
echo ""

# 检查是否有错误
echo "=== 11. 检查错误日志 ==="
ERROR_COUNT=$(grep -i "error\|exception\|fatal" /tmp/full_log.txt | wc -l)
echo "错误日志数量: $ERROR_COUNT"
if [ $ERROR_COUNT -gt 0 ]; then
    echo "最近的错误日志:"
    grep -i "error\|exception\|fatal" /tmp/full_log.txt | tail -20
fi
echo ""

# 检查性能日志
echo "=== 12. 检查性能日志 ==="
grep -i "PERF" /tmp/full_log.txt | tail -30
echo ""

echo "=== 检查完成 ==="
echo ""
echo "💡 完整日志已保存到: /tmp/full_log.txt"
echo "💡 可以使用以下命令查看完整日志:"
echo "   adb logcat -d | grep -i '危险关系\|MATCHING\|source\|episode' | tail -100"
