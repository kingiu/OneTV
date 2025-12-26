import { useState, useEffect } from "react";
// 使用类型断言来解决找不到react-native声明文件的问题
import { Dimensions, Platform, PixelRatio } from "react-native";

export type DeviceType = "mobile" | "tablet" | "tv";

export interface ResponsiveConfig {
  deviceType: DeviceType;
  columns: number;
  cardWidth: number;
  cardHeight: number;
  spacing: number;
  isPortrait: boolean;
  screenWidth: number;
  screenHeight: number;
  physicalWidth: number;
  physicalHeight: number;
  pixelRatio: number;
}

const getDeviceType = (width: number): DeviceType => {
  if (Platform.isTV) return "tv";

  // 降低TV模式的阈值，确保高分辨率屏幕能被正确识别
  if (width >= 960) return "tv"; // 修改为960以适配960x540的逻辑分辨率
  if (width >= 768) return "tablet";
  return "mobile";
};

const getLayoutConfig = (
  deviceType: DeviceType,
  width: number,
  height: number,
  isPortrait: boolean
): ResponsiveConfig => {
  const spacing = deviceType === "mobile" ? 8 : deviceType === "tablet" ? 12 : 16;

  let columns: number;
  let cardWidth: number;
  let cardHeight: number;

  switch (deviceType) {
    case "mobile":
      columns = isPortrait ? 3 : 4;
      // 使用flex布局，卡片可以更大一些来填充空间
      cardWidth = ((width - spacing) / columns) * 0.85; // 增大到85%
      cardHeight = cardWidth * 1.2; // 5:6 aspect ratio (reduced from 2:3)
      break;

    case "tablet":
      columns = isPortrait ? 3 : 4;
      cardWidth = ((width - spacing) / columns) * 0.85; // 增大到85%
      cardHeight = cardWidth * 1.4; // slightly less tall ratio
      break;

    case "tv":
    default:
      columns = 5;
      cardWidth = 160; // Fixed width for TV
      cardHeight = 240; // Fixed height for TV
      break;
  }

  // 计算物理分辨率
  const pixelRatio = PixelRatio.get();
  const physicalWidth = width * pixelRatio;
  const physicalHeight = height * pixelRatio;

  return {
    deviceType,
    columns,
    cardWidth,
    cardHeight,
    spacing,
    isPortrait,
    screenWidth: width,
    screenHeight: height,
    physicalWidth,
    physicalHeight,
    pixelRatio,
  };
};

export const useResponsiveLayout = (): ResponsiveConfig => {
  const [dimensions, setDimensions] = useState(() => {
    const { width, height } = Dimensions.get("window");
    return { width, height };
  });

  useEffect(() => {
    const subscription = Dimensions.addEventListener("change", (event: { window: { width: number; height: number } }) => {
      setDimensions({ width: event.window.width, height: event.window.height });
    });

    return () => subscription?.remove();
  }, []);

  const { width, height } = dimensions;
  const isPortrait = height > width;
  const deviceType = getDeviceType(width);

  return getLayoutConfig(deviceType, width, height, isPortrait);
};

// Utility hook for responsive values
export const useResponsiveValue = <T>(values: { mobile: T; tablet: T; tv: T }): T => {
  const { deviceType } = useResponsiveLayout();
  return values[deviceType];
};

// Utility hook for responsive styles
export const useResponsiveStyles = (): {
  container: { paddingHorizontal: number };
  cardContainer: { width: number; height: number; marginBottom: number };
  gridContainer: { paddingHorizontal: number };
  titleFontSize: number;
  bodyFontSize: number;
  sectionSpacing: number;
  itemSpacing: number;
} => {
  const config = useResponsiveLayout();

  return {
    // Common responsive styles
    container: {
      paddingHorizontal: config.spacing,
    },

    // Card styles
    cardContainer: {
      width: config.cardWidth,
      height: config.cardHeight,
      marginBottom: config.spacing,
    },

    // Grid styles
    gridContainer: {
      paddingHorizontal: config.spacing / 2,
    },

    // Typography
    titleFontSize: config.deviceType === "mobile" ? 18 : config.deviceType === "tablet" ? 22 : 28,
    bodyFontSize: config.deviceType === "mobile" ? 14 : config.deviceType === "tablet" ? 16 : 18,

    // Spacing
    sectionSpacing: config.deviceType === "mobile" ? 16 : config.deviceType === "tablet" ? 20 : 24,
    itemSpacing: config.spacing,
  };
};
