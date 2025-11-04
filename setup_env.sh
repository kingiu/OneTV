#!/bin/bash

# OrionTV 环境配置脚本
# 用于快速恢复开发环境，避免重复安装

echo "正在设置OrionTV开发环境..."

# 设置Android SDK路径
export ANDROID_HOME=~/Android/Sdk
export PATH=$PATH:$ANDROID_HOME/cmdline-tools/latest/bin:$ANDROID_HOME/platform-tools:$ANDROID_HOME/build-tools/34.0.0

# 确认环境变量已设置
echo "✅ Android SDK路径: $ANDROID_HOME"

# 创建local.properties文件（如果不存在）
if [ ! -f "android/local.properties" ]; then
    # 使用绝对路径确保能正确创建目录
    mkdir -p "$(pwd)/android"
    echo "sdk.dir=$ANDROID_HOME" > "$(pwd)/android/local.properties"
    echo "✅ 创建了android/local.properties文件"
fi

# 显示环境信息
echo "\n📋 环境信息:"
echo "- Java版本: $(java -version 2>&1 | head -n 1)"
echo "- Android SDK路径: $ANDROID_HOME"
echo "- Gradle版本: $(gradle --version 2>&1 | grep Gradle | head -n 1)"

# 检查必要的SDK组件是否已安装
echo "\n🔍 检查已安装的SDK组件:"
if [ -d "$ANDROID_HOME/platform-tools" ]; then
    echo "✅ platform-tools 已安装"
fi

if [ -d "$ANDROID_HOME/build-tools/34.0.0" ]; then
    echo "✅ build-tools 34.0.0 已安装"
fi

echo "\n🎉 环境配置完成！您现在可以使用以下命令构建应用:"
echo "- 构建Debug版本: npm run build-debug"
echo "- 构建Release版本: npm run build"
echo "- 运行应用: npm start"