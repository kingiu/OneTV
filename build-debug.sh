#!/bin/bash

# OneTV 应用开发构建脚本
# 遵循规范的 Expo 构建流程：prebuild -> build -> run

# 配置项
DEVICE_IP="192.168.100.247"
PLATFORM="android"
VARIANT="debug"

# 颜色定义
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

echo -e "${BLUE}========================================${NC}"
echo -e "${BLUE}OneTV 开发构建脚本${NC}"
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

# 4. 运行开发构建
echo -e "\n${BLUE}4. 运行 ${VARIANT} 版本构建...${NC}"
# 使用 --device 直接在设备上运行
echo -e "${YELLOW}注意: 开发构建会启动 Metro 服务器，按 Ctrl+C 停止${NC}"
npx expo run:${PLATFORM} --device --variant ${VARIANT}

# 开发构建会保持运行，直到用户手动停止
