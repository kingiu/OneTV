#!/bin/bash

echo "=== ADB 检查脚本 - 详细提取 OneTV 应用数据 ==="
echo ""

PACKAGE_NAME="com.guozhi.onetv"

# 检查 ADB
if ! command -v adb &> /dev/null; then
    echo "❌ ADB 未安装"
    exit 1
fi

# 检查设备
echo "=== 1. 设备信息 ==="
adb devices
DEVICE=$(adb shell getprop ro.product.model)
ANDROID=$(adb shell getprop ro.build.version.release)
echo "设备: $DEVICE, Android: $ANDROID"
echo ""

# 检查应用状态
echo "=== 2. 应用状态 ==="
if adb shell pm list packages | grep -q "$PACKAGE_NAME"; then
    echo "✅ 应用已安装"
    VERSION=$(adb shell dumpsys package $PACKAGE_NAME | grep -A 1 "Version" | tail -1 | awk '{print $2}')
    echo "版本: $VERSION"
else
    echo "❌ 应用未安装"
    exit 1
fi

RUNNING=$(adb shell ps | grep "$PACKAGE_NAME")
if [ -n "$RUNNING" ]; then
    echo "✅ 应用正在运行"
else
    echo "⚠️  应用未运行"
fi
echo ""

# 提取日志
echo "=== 3. 提取最近日志（包含"危险关系"或视频源相关） ==="
adb logcat -d | grep -i "危险关系\|video.*source\|source.*dedup\|MATCHING\|detailStore\|playerStore" | tail -50
echo ""

# 尝试提取应用数据
echo "=== 4. 尝试提取应用数据 ==="
echo "尝试使用 run-as 提取数据..."
adb shell "run-as $PACKAGE_NAME ls /data/data/$PACKAGE_NAME/" 2>/dev/null

if [ $? -eq 0 ]; then
    echo ""
    echo "=== 5. 提取 AsyncStorage 数据 ==="
    adb shell "run-as $PACKAGE_NAME cat /data/data/$PACKAGE_NAME/shared_prefs/settings.json" 2>/dev/null | head -200
    
    echo ""
    echo "=== 6. 提取 detailStore 数据 ==="
    # 尝试查找 store 相关文件
    adb shell "run-as $PACKAGE_NAME ls /data/data/$PACKAGE_NAME/shared_prefs/" 2>/dev/null | grep -i "store\|detail\|player"
else
    echo "❌ 无法使用 run-as 提取数据（需要 debug 版本或 root 权限）"
    echo ""
    echo "尝试使用 adb backup..."
    # 尝试备份
    adb backup -f /tmp/onetv.ab -noapk $PACKAGE_NAME 2>&1 | head -20
    if [ -f /tmp/onetv.ab ]; then
        echo "✅ 备份文件已创建: /tmp/onetv.ab"
        # 解压 backup 文件
        (dd if=/dev/zero bs=1 count=8 2>/dev/null; cat /tmp/onetv.ab) | zlib-flate -uncompress > /tmp/onetv.tar 2>/dev/null
        if [ -f /tmp/onetv.tar ]; then
            echo "✅ 备份已解压: /tmp/onetv.tar"
            tar -tf /tmp/onetv.tar | grep -i "store\|detail\|player" | head -20
        fi
    fi
fi

echo ""
echo "=== 7. 检查当前 Activity ==="
CURRENT_ACTIVITY=$(adb shell dumpsys window | grep -A 1 "mCurrentFocus" | grep -o "com.guozhi.onetv/[^ ]*" | head -1)
echo "当前 Activity: $CURRENT_ACTIVITY"

if echo "$CURRENT_ACTIVITY" | grep -q "detail"; then
    echo "✅ 当前在详情页面"
elif echo "$CURRENT_ACTIVITY" | grep -q "play"; then
    echo "✅ 当前在播放页面"
else
    echo "⚠️  当前不在详情或播放页面"
fi
echo ""

# 检查内存 dump
echo "=== 8. 检查内存状态 ==="
adb shell dumpsys meminfo $PACKAGE_NAME 2>/dev/null | grep -i "view\|activity\|store" | head -20
echo ""

echo "=== 检查完成 ==="
echo ""
echo "💡 如果需要进一步分析，请:"
echo "1. 确保应用正在运行并导航到'危险关系'剧集页面"
echo "2. 打开视频源选择器"
echo "3. 运行: adb logcat -d | grep -i 'MATCHING\|source\|episode' | tail -100"
