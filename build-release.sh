#!/bin/bash

# OneTV 应用构建脚本
# 遵循规范的 Expo 构建流程：prebuild -> build -> install

# 配置项
DEVICE_IP="192.168.100.247"
PLATFORM="android"
VARIANT="release"

# 颜色定义
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

echo -e "${BLUE}========================================${NC}"
echo -e "${BLUE}OneTV 应用构建脚本${NC}"
echo -e "${BLUE}========================================${NC}"
echo -e "构建设备: ${YELLOW}${DEVICE_IP}${NC}"
echo -e "构建平台: ${YELLOW}${PLATFORM}${NC}"
echo -e "构建变体: ${YELLOW}${VARIANT}${NC}"
echo -e "${BLUE}========================================${NC}"

# 1. 检查依赖
echo -e "\n${BLUE}1. 检查依赖环境...${NC}"
if ! command -v npx &> /dev/null; then
    echo -e "${RED}错误: npx 命令未找到，请确保已安装 Node.js 和 npm${NC}"
    exit 1
fi

if ! command -v adb &> /dev/null; then
    echo -e "${RED}错误: adb 命令未找到，请确保已安装 Android SDK${NC}"
    exit 1
fi

# 2. 检查设备连接
echo -e "\n${BLUE}2. 检查设备连接...${NC}"
adb connect ${DEVICE_IP}

if ! adb devices | grep -q "${DEVICE_IP}:5555\s*device"; then
    echo -e "${RED}错误: 设备 ${DEVICE_IP} 未连接或不可用${NC}"
    exit 1
fi

echo -e "${GREEN}✓ 设备 ${DEVICE_IP} 已成功连接${NC}"

# 3. 运行 prebuild
echo -e "\n${BLUE}3. 运行 prebuild 生成原生文件...${NC}"
npx expo prebuild --platform ${PLATFORM}

if [ $? -ne 0 ]; then
    echo -e "${RED}错误: prebuild 失败${NC}"
    exit 1
fi

echo -e "${GREEN}✓ prebuild 成功完成${NC}"

# 4. 构建应用
echo -e "\n${BLUE}4. 构建 ${VARIANT} 版本...${NC}"
npx expo run:${PLATFORM} --variant ${VARIANT}

if [ $? -ne 0 ]; then
    echo -e "${RED}错误: 构建失败${NC}"
    exit 1
fi

echo -e "${GREEN}✓ 构建成功完成${NC}"

# 5. 安装到设备
echo -e "\n${BLUE}5. 安装应用到设备 ${DEVICE_IP}...${NC}"
APK_PATH="android/app/build/outputs/apk/${VARIANT}/app-${VARIANT}.apk"

if [ ! -f "${APK_PATH}" ]; then
    echo -e "${RED}错误: APK 文件未找到: ${APK_PATH}${NC}"
    exit 1
fi

adb -s ${DEVICE_IP}:5555 install -r "${APK_PATH}"

if [ $? -ne 0 ]; then
    echo -e "${RED}错误: 安装失败${NC}"
    exit 1
fi

echo -e "${GREEN}✓ 应用已成功安装到设备 ${DEVICE_IP}${NC}"

# 6. 清理临时文件（可选）
echo -e "\n${BLUE}6. 清理临时文件...${NC}"
# 这里可以添加清理命令，例如：
# rm -rf node_modules/.cache/

# 7. 完成总结
echo -e "\n${BLUE}========================================${NC}"
echo -e "${GREEN}构建流程已成功完成！${NC}"
echo -e "${BLUE}========================================${NC}"
echo -e "应用已构建并安装到设备: ${YELLOW}${DEVICE_IP}${NC}"
echo -e "构建变体: ${YELLOW}${VARIANT}${NC}"
echo -e "APK 文件位置: ${YELLOW}${APK_PATH}${NC}"
echo -e "${BLUE}========================================${NC}"
