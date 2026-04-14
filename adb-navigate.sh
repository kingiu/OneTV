#!/bin/bash

echo "=== ADB 脚本 - 导航到'危险关系'剧集页面 ==="
echo ""

PACKAGE_NAME="com.guozhi.onetv"

# 检查设备
echo "=== 1. 设备状态 ==="
adb devices
echo ""

# 停止应用
echo "=== 2. 停止应用 ==="
adb shell am force-stop $PACKAGE_NAME
echo "✅ 应用已停止"
echo ""

# 启动应用
echo "=== 3. 启动应用 ==="
adb shell am start -n "$PACKAGE_NAME/.MainActivity" -S
sleep 3
echo "✅ 应用已启动"
echo ""

# 等待主页面加载
echo "=== 4. 等待主页面加载 ==="
sleep 2
echo ""

# 检查当前 Activity
echo "=== 5. 检查当前 Activity ==="
adb shell dumpsys window | grep -A 1 "mCurrentFocus" | grep -o "com.guozhi.onetv/[^ }]*" | head -1
echo ""

# 模拟点击搜索框
echo "=== 6. 模拟点击搜索框 ==="
# 尝试点击屏幕中心附近的搜索框位置（根据实际 UI 调整）
adb shell input tap 500 200
sleep 1
echo "✅ 点击搜索框"
echo ""

# 输入"危险关系"
echo "=== 7. 输入搜索关键词 ==="
adb shell input text "危险关系"
sleep 1
echo "✅ 输入关键词"
echo ""

# 模拟回车搜索
echo "=== 8. 模拟回车搜索 ==="
adb shell input keyevent 66
sleep 3
echo "✅ 已搜索"
echo ""

# 检查搜索结果页面
echo "=== 9. 检查搜索结果页面 ==="
adb shell dumpsys window | grep -A 1 "mCurrentFocus" | grep -o "com.guozhi.onetv/[^ }]*" | head -1
echo ""

# 等待列表加载
echo "=== 10. 等待列表加载 ==="
sleep 2
echo ""

# 模拟点击第一个结果（假设是"危险关系"）
echo "=== 11. 模拟点击第一个结果 ==="
# 点击屏幕中间位置
adb shell input tap 500 500
sleep 3
echo "✅ 点击第一个结果"
echo ""

# 检查详情页面
echo "=== 12. 检查当前页面 ==="
CURRENT_ACTIVITY=$(adb shell dumpsys window | grep -A 1 "mCurrentFocus" | grep -o "com.guozhi.onetv/[^ }]*" | head -1)
echo "当前 Activity: $CURRENT_ACTIVITY"

if echo "$CURRENT_ACTIVITY" | grep -q "detail\|Detail"; then
    echo "✅ 已进入详情页面"
elif echo "$CURRENT_ACTIVITY" | grep -q "play\|Play"; then
    echo "✅ 已进入播放页面"
else
    echo "⚠️  未进入详情或播放页面，尝试其他导航方式"
fi
echo ""

# 等待页面完全加载
echo "=== 13. 等待页面加载完成 ==="
sleep 2
echo ""

# 检查日志
echo "=== 14. 检查相关日志 ==="
adb logcat -d | grep -i "MATCHING\|source\|episode\|detailStore\|playerStore" | tail -30
echo ""

# 检查视频源选择器是否打开
echo "=== 15. 检查视频源选择器状态 ==="
adb shell dumpsys window | grep -i "modal\|dialog\|source" | tail -20
echo ""

echo "=== 操作完成 ==="
echo ""
echo "💡 手动操作建议："
echo "1. 如果未进入详情页面，请手动在应用中搜索'危险关系'"
echo "2. 点击搜索结果进入详情页面"
echo "3. 点击播放按钮进入播放页面"
echo "4. 点击视频源选择器查看是否有重复的视频源"
echo ""
echo "💡 运行以下命令查看实时日志："
echo "adb logcat | grep -i 'MATCHING\|source\|episode'"
