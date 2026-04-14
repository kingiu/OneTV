#!/bin/bash

echo "=== ADB 脚本 - 从热门剧集进入"危险关系"并分析重复视频源 ==="
echo ""

PACKAGE_NAME="com.guozhi.onetv"

# 清除日志
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

# 检查当前页面
echo "=== 4. 检查当前页面 ==="
CURRENT_ACTIVITY=$(adb shell dumpsys window | grep -A 1 "mCurrentFocus" | grep -o "com.guozhi.onetv/[^ }]*" | head -1)
echo "当前 Activity: $CURRENT_ACTIVITY"
echo ""

# 模拟点击"热门剧集"按钮（底部导航栏）
echo "=== 5. 模拟点击底部导航栏的"热门剧集"按钮 ==="
# 假设底部导航栏在屏幕底部，点击中间位置
adb shell input tap 500 1850
sleep 4
echo "✅ 点击热门剧集"
echo ""

# 检查热门剧集页面
echo "=== 6. 检查热门剧集页面 ==="
CURRENT_ACTIVITY=$(adb shell dumpsys window | grep -A 1 "mCurrentFocus" | grep -o "com.guozhi.onetv/[^ }]*" | head -1)
echo "当前 Activity: $CURRENT_ACTIVITY"
echo ""

# 等待列表加载
echo "=== 7. 等待列表加载 ==="
sleep 2
echo ""

# 模拟下滑加载更多剧集
echo "=== 8. 模拟下滑加载更多剧集 ==="
adb shell input swipe 500 1500 500 500 500
sleep 2
adb shell input swipe 500 1500 500 500 500
sleep 2
echo "✅ 下滑加载"
echo ""

# 模拟下滑加载更多（继续加载）
echo "=== 9. 继续下滑加载 ==="
adb shell input swipe 500 1500 500 500 500
sleep 2
echo "✅ 继续下滑"
echo ""

# 模拟点击"危险关系"剧集（假设在屏幕中间位置）
echo "=== 10. 模拟点击"危险关系"剧集 ==="
# 点击屏幕中间偏上位置（假设"危险关系"在列表中）
adb shell input tap 500 800
sleep 4
echo "✅ 点击"危险关系"剧集"
echo ""

# 检查详情页面
echo "=== 11. 检查详情页面 ==="
CURRENT_ACTIVITY=$(adb shell dumpsys window | grep -A 1 "mCurrentFocus" | grep -o "com.guozhi.onetv/[^ }]*" | head -1)
echo "当前 Activity: $CURRENT_ACTIVITY"

if echo "$CURRENT_ACTIVITY" | grep -q "detail\|Detail"; then
    echo "✅ 已进入详情页面"
elif echo "$CURRENT_ACTIVITY" | grep -q "play\|Play"; then
    echo "✅ 已进入播放页面"
else
    echo "⚠️  未进入详情或播放页面"
fi
echo ""

# 等待页面完全加载
echo "=== 12. 等待页面完全加载 ==="
sleep 3
echo ""

# 捕获完整日志
echo "=== 13. 捕获完整日志 ==="
adb logcat -d > /tmp/dangerous_liaisons_full_log.txt
echo "✅ 日志已保存到: /tmp/dangerous_liaisons_full_log.txt"
echo ""

# 分析日志
echo "=== 14. 分析日志 ==="
echo ""

echo "--- 14.1 包含"危险关系"的日志 ---"
grep -i "危险关系" /tmp/dangerous_liaisons_full_log.txt | tail -30
echo ""

echo "--- 14.2 包含"MATCHING"的日志（关键！） ---"
grep -i "MATCHING" /tmp/dangerous_liaisons_full_log.txt | tail -50
echo ""

echo "--- 14.3 包含"source"的日志（关键！） ---"
grep -i "source" /tmp/dangerous_liaisons_full_log.txt | tail -50
echo ""

echo "--- 14.4 包含"episode"的日志 ---"
grep -i "episode" /tmp/dangerous_liaisons_full_log.txt | tail -30
echo ""

echo "--- 14.5 包含"detailStore"的日志（关键！） ---"
grep -i "detailStore" /tmp/dangerous_liaisons_full_log.txt | tail -50
echo ""

echo "--- 14.6 包含"searchVideo"的日志（关键！） ---"
grep -i "searchVideo" /tmp/dangerous_liaisons_full_log.txt | tail -50
echo ""

echo "--- 14.7 包含"dedup"的日志（关键！） ---"
grep -i "dedup" /tmp/dangerous_liaisons_full_log.txt | tail -30
echo ""

echo "--- 14.8 包含"After"的日志（关键！） ---"
grep -i "After" /tmp/dangerous_liaisons_full_log.txt | tail -50
echo ""

echo "--- 14.9 包含"Before"的日志（关键！） ---"
grep -i "Before" /tmp/dangerous_liaisons_full_log.txt | tail -50
echo ""

echo "--- 14.10 包含"unique"的日志（关键！） ---"
grep -i "unique" /tmp/dangerous_liaisons_full_log.txt | tail -30
echo ""

# 检查是否有错误
echo "=== 15. 检查错误日志 ==="
ERROR_COUNT=$(grep -i "error\|exception\|fatal\|Already read" /tmp/dangerous_liaisons_full_log.txt | wc -l)
echo "错误日志数量: $ERROR_COUNT"
if [ $ERROR_COUNT -gt 0 ]; then
    echo "最近的错误日志:"
    grep -i "error\|exception\|fatal\|Already read" /tmp/dangerous_liaisons_full_log.txt | tail -30
fi
echo ""

# 检查性能日志
echo "=== 16. 检查性能日志 ==="
grep -i "PERF" /tmp/dangerous_liaisons_full_log.txt | tail -30
echo ""

# 检查 API 调用
echo "=== 17. 检查 API 调用 ==="
grep -i "api/search" /tmp/dangerous_liaisons_full_log.txt | tail -30
echo ""

echo "=== 分析完成 ==="
echo ""
echo "💡 关键日志文件:"
echo "   完整日志: /tmp/dangerous_liaisons_full_log.txt"
echo ""
echo "💡 重点关注:"
echo "   1. MATCHING 日志（去重逻辑）"
echo "   2. detailStore 日志（store 处理）"
echo "   3. searchVideo 日志（API 调用）"
echo "   4. Before/After 日志（数量变化）"
echo ""
echo "💡 如果未进入详情页面，请手动在 TV 上:"
echo "   1. 从主页面点击底部导航栏的"热门剧集"按钮"
echo "   2. 在热门剧集列表中找到"危险关系"并点击"
echo "   3. 进入详情页面后，点击播放按钮"
echo "   4. 在播放页面，点击视频源选择器"
echo ""
echo "💡 然后运行以下命令查看实时日志:"
echo "   adb logcat | grep -i 'MATCHING\|source\|episode\|detailStore'"
