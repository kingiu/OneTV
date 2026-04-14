#!/bin/bash

echo "=== ADB 脚本 - 从热门剧集进入'危险关系' ==="
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

# 模拟点击"热门剧集"按钮（根据实际 UI 调整坐标）
echo "=== 5. 模拟点击热门剧集 ==="
# 点击屏幕底部的"热门剧集"按钮（假设在底部导航栏）
adb shell input tap 200 1800
sleep 3
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

# 模拟下滑加载更多
echo "=== 8. 模拟下滑加载更多 ==="
adb shell input swipe 500 1500 500 500 500
sleep 2
adb shell input swipe 500 1500 500 500 500
sleep 2
echo "✅ 下滑加载"
echo ""

# 查找"危险关系"剧集（假设在列表中）
echo "=== 9. 模拟点击'危险关系'剧集 ==="
# 点击屏幕中间位置（假设"危险关系"在列表中间）
adb shell input tap 500 800
sleep 3
echo "✅ 点击'危险关系'剧集"
echo ""

# 检查详情页面
echo "=== 10. 检查详情页面 ==="
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

# 等待页面加载
echo "=== 11. 等待页面加载完成 ==="
sleep 3
echo ""

# 捕获日志
echo "=== 12. 捕获相关日志 ==="
adb logcat -d > /tmp/dangerous_liaisons_log.txt

echo "--- 包含"危险关系"的日志 ---"
grep -i "危险关系" /tmp/dangerous_liaisons_log.txt | tail -50
echo ""

echo "--- 包含"MATCHING"的日志 ---"
grep -i "MATCHING" /tmp/dangerous_liaisons_log.txt | tail -30
echo ""

echo "--- 包含"source"的日志 ---"
grep -i "source" /tmp/dangerous_liaisons_log.txt | tail -30
echo ""

echo "--- 包含"episode"的日志 ---"
grep -i "episode" /tmp/dangerous_liaisons_log.txt | tail -30
echo ""

echo "--- 包含"detailStore"的日志 ---"
grep -i "detailStore" /tmp/dangerous_liaisons_log.txt | tail -30
echo ""

echo "--- 包含"searchVideo"的日志 ---"
grep -i "searchVideo" /tmp/dangerous_liaisons_log.txt | tail -30
echo ""

echo "=== 检查完成 ==="
echo ""
echo "💡 完整日志已保存到: /tmp/dangerous_liaisons_log.txt"
echo "💡 如果未进入详情页面，请手动在应用中从热门剧集进入'危险关系'"
