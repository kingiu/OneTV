#!/bin/bash

echo "=== ADB 检查脚本 - 验证"危险关系"剧集视频源数据 ==="
echo ""

# 检查 ADB 是否可用
if ! command -v adb &> /dev/null; then
    echo "❌ ADB 未安装或未在 PATH 中"
    exit 1
fi

echo "✅ ADB 可用"
echo ""

# 检查连接的设备
echo "=== 1. 检查连接的设备 ==="
adb devices
if [ $? -ne 0 ]; then
    echo "❌ 无法连接到设备，请检查 USB 连接或 ADB 服务"
    exit 1
fi

echo ""
echo "=== 2. 检查 OneTV 应用是否安装 ==="
PACKAGE_NAME="com.guozhi.onetv"
if adb shell pm list packages | grep -q "$PACKAGE_NAME"; then
    echo "✅ OneTV 已安装"
    
    # 获取应用版本
    VERSION=$(adb shell dumpsys package $PACKAGE_NAME | grep -A 1 "Version" | tail -1 | awk '{print $2}')
    echo "   版本: $VERSION"
else
    echo "❌ OneTV 未安装"
    exit 1
fi

echo ""
echo "=== 3. 检查应用数据目录 ==="
DATA_DIR="/data/data/$PACKAGE_NAME"
if adb shell test -d "$DATA_DIR" && echo "exists"; then
    echo "✅ 应用数据目录存在"
    
    echo ""
    echo "=== 4. 检查 AsyncStorage 数据 ==="
    ASYNC_STORAGE="$DATA_DIR/shared_prefs"
    if adb shell test -d "$ASYNC_STORAGE" && echo "exists"; then
        echo "✅ AsyncStorage 目录存在"
        
        echo ""
        echo "=== 5. 检查设置相关数据 ==="
        adb shell "run-as $PACKAGE_NAME ls shared_prefs/" 2>/dev/null || \
        adb shell "run-as $PACKAGE_NAME ls /data/data/$PACKAGE_NAME/shared_prefs/" 2>/dev/null
        
        echo ""
        echo "=== 6. 提取 settingsStore 数据 ==="
        SETTINGS_FILE=$(adb shell "run-as $PACKAGE_NAME ls /data/data/$PACKAGE_NAME/shared_prefs/" 2>/dev/null | grep settings)
        if [ -n "$SETTINGS_FILE" ]; then
            echo "找到设置文件: $SETTINGS_FILE"
            adb shell "run-as $PACKAGE_NAME cat /data/data/$PACKAGE_NAME/shared_prefs/$SETTINGS_FILE" 2>/dev/null | head -100
        else
            echo "⚠️  未找到 settingsStore 文件"
        fi
    else
        echo "❌ AsyncStorage 目录不存在"
    fi
else
    echo "❌ 应用数据目录不存在"
fi

echo ""
echo "=== 7. 检查应用日志（最近 100 行） ==="
echo "搜索与"危险关系"或视频源相关的日志..."
LOGS=$(adb logcat -d | grep -i "危险关系\|video.*source\|source.*dedup\|MATCHING" | tail -100)
if [ -n "$LOGS" ]; then
    echo "$LOGS"
else
    echo "⚠️  未找到相关日志，尝试搜索更广泛的关键词..."
    adb logcat -d | grep -i "detail\|source\|episode" | tail -50
fi

echo ""
echo "=== 8. 检查应用是否正在运行 ==="
RUNNING=$(adb shell ps | grep "$PACKAGE_NAME")
if [ -n "$RUNNING" ]; then
    echo "✅ 应用正在运行"
    echo "$RUNNING"
else
    echo "⚠️  应用未运行"
fi

echo ""
echo "=== 9. 检查设备信息 ==="
DEVICE_MODEL=$(adb shell getprop ro.product.model)
DEVICE_ANDROID=$(adb shell getprop ro.build.version.release)
echo "设备型号: $DEVICE_MODEL"
echo "Android 版本: $DEVICE_ANDROID"

echo ""
echo "=== 10. 检查存储权限 ==="
PERMISSIONS=$(adb shell pm list permissions -g -d $PACKAGE_NAME 2>/dev/null | grep -A 5 "Storage")
if [ -n "$PERMISSIONS" ]; then
    echo "$PERMISSIONS"
else
    echo "⚠️  无法获取权限信息"
fi

echo ""
echo "=== 检查完成 ==="
echo ""
echo "💡 建议操作："
echo "1. 确保 OneTV 应用已启动并导航到"危险关系"剧集页面"
echo "2. 打开视频源选择器（点击播放源按钮）"
echo "3. 观察视频源列表是否重复"
echo "4. 运行此脚本查看相关日志和数据"
