import React, { useState, useEffect, useRef } from 'react';
import { View, Text, StyleSheet, Dimensions, Platform, Animated } from 'react-native';
import { FEATURE_FLAGS, DEBUG_TOOLS_CONFIG } from '@/constants/DebugConfig';
import { debug } from '@/utils/debugUtils';
import { useResponsiveLayout, ResponsiveConfig } from '@/hooks/useResponsiveLayout';
import { Colors } from '@/constants/Colors';
import { useResponsiveStyles } from '@/utils/ResponsiveStyles';

interface DebugOverlayProps {
  visible?: boolean;
  position?: 'top-left' | 'top-right' | 'bottom-left' | 'bottom-right';
}

interface NetworkStats {
  requests: number;
  successful: number;
  failed: number;
  totalTime: number;
  avgTime: number;
}

interface PerformanceData {
  fps: number;
  memory?: number;
  cpu?: number;
}

// 创建响应式样式
const createDebugOverlayStyles = (config: ResponsiveConfig) => {
  const { deviceType } = config;
  const fontSize = deviceType === 'mobile' ? 10 : deviceType === 'tablet' ? 11 : 12;
  const titleSize = deviceType === 'mobile' ? 11 : deviceType === 'tablet' ? 12 : 13;
  
  return StyleSheet.create({
    container: {
      position: 'absolute',
      zIndex: 9999,
      padding: deviceType === 'mobile' ? 6 : deviceType === 'tablet' ? 8 : 10,
    },
    topLeft: {
      top: deviceType === 'mobile' ? 30 : deviceType === 'tablet' ? 40 : 50,
      left: deviceType === 'mobile' ? 8 : deviceType === 'tablet' ? 10 : 15,
    },
    topRight: {
      top: deviceType === 'mobile' ? 30 : deviceType === 'tablet' ? 40 : 50,
      right: deviceType === 'mobile' ? 8 : deviceType === 'tablet' ? 10 : 15,
    },
    bottomLeft: {
      bottom: deviceType === 'mobile' ? 30 : deviceType === 'tablet' ? 40 : 50,
      left: deviceType === 'mobile' ? 8 : deviceType === 'tablet' ? 10 : 15,
    },
    bottomRight: {
      bottom: deviceType === 'mobile' ? 30 : deviceType === 'tablet' ? 40 : 50,
      right: deviceType === 'mobile' ? 8 : deviceType === 'tablet' ? 10 : 15,
    },
    debugPanel: {
      backgroundColor: 'rgba(0, 0, 0, 0.85)',
      borderRadius: deviceType === 'mobile' ? 6 : deviceType === 'tablet' ? 8 : 10,
      padding: deviceType === 'mobile' ? 8 : deviceType === 'tablet' ? 10 : 12,
      borderWidth: 1,
      borderColor: Colors.dark.border,
      minWidth: deviceType === 'mobile' ? 120 : deviceType === 'tablet' ? 140 : 160,
    },
    panelHeader: {
      flexDirection: 'row',
      alignItems: 'center',
      marginBottom: 6,
      paddingBottom: 6,
      borderBottomWidth: 1,
      borderBottomColor: Colors.dark.border,
    },
    debugDot: {
      width: deviceType === 'mobile' ? 6 : deviceType === 'tablet' ? 8 : 10,
      height: deviceType === 'mobile' ? 6 : deviceType === 'tablet' ? 8 : 10,
      borderRadius: deviceType === 'mobile' ? 3 : deviceType === 'tablet' ? 4 : 5,
      backgroundColor: Colors.dark.primary,
      marginRight: deviceType === 'mobile' ? 4 : deviceType === 'tablet' ? 6 : 8,
    },
    debugTitle: {
      color: Colors.dark.text,
      fontSize: titleSize,
      fontWeight: 'bold',
      letterSpacing: 0.8,
    },
    statsRow: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      marginBottom: 3,
    },
    label: {
      color: 'rgba(255, 255, 255, 0.7)',
      fontSize: fontSize,
    },
    value: {
      color: Colors.dark.text,
      fontSize: fontSize,
      fontWeight: 'bold',
    },
  });
};

const DebugOverlay: React.FC<DebugOverlayProps> = ({ 
  visible = FEATURE_FLAGS.ENABLE_DEBUG_UI && __DEV__, 
  position = 'top-left' 
}) => {
  const responsiveConfig = useResponsiveLayout();
  const styles = useResponsiveStyles(createDebugOverlayStyles);
  const [performanceData, setPerformanceData] = useState<PerformanceData>({
    fps: 0,
    memory: 0,
    cpu: 0
  });
  const [networkStats, setNetworkStats] = useState<NetworkStats>({
    requests: 0,
    successful: 0,
    failed: 0,
    totalTime: 0,
    avgTime: 0
  });
  const [visibleSections, setVisibleSections] = useState({
    fps: DEBUG_TOOLS_CONFIG.SHOW_FPS_COUNTER,
    memory: DEBUG_TOOLS_CONFIG.SHOW_MEMORY_USAGE,
    network: DEBUG_TOOLS_CONFIG.SHOW_NETWORK_STATS
  });
  
  const fpsCounterRef = useRef({
    lastFrameTime: 0,
    frameCount: 0,
    fps: 0
  });
  
  const networkStatsRef = useRef<NetworkStats>({
    requests: 0,
    successful: 0,
    failed: 0,
    totalTime: 0,
    avgTime: 0
  });
  
  const fadeAnim = useRef(new Animated.Value(visible ? 1 : 0)).current;
  const rotateAnim = useRef(new Animated.Value(0)).current;

  // 处理可见性变化的动画
  useEffect(() => {
    Animated.timing(fadeAnim, {
      toValue: visible ? 1 : 0,
      duration: 200,
      useNativeDriver: true
    }).start();
  }, [visible, fadeAnim]);

  // 模拟FPS计算
  useEffect(() => {
    if (!visible || !visibleSections.fps) return;
    
    const calculateFPS = () => {
      const now = performance.now();
      const deltaTime = now - fpsCounterRef.current.lastFrameTime;
      
      fpsCounterRef.current.frameCount++;
      
      if (deltaTime >= 1000) {
        const fps = Math.round((fpsCounterRef.current.frameCount * 1000) / deltaTime);
        fpsCounterRef.current.fps = fps;
        fpsCounterRef.current.frameCount = 0;
        fpsCounterRef.current.lastFrameTime = now;
        
        setPerformanceData(prev => ({ ...prev, fps }));
      }
      
      requestAnimationFrame(calculateFPS);
    };
    
    fpsCounterRef.current.lastFrameTime = performance.now();
    const animationId = requestAnimationFrame(calculateFPS);
    
    return () => cancelAnimationFrame(animationId);
  }, [visible, visibleSections.fps]);

  // 模拟内存使用情况
  useEffect(() => {
    if (!visible || !visibleSections.memory) return;
    
    const updateMemory = () => {
      // 在React Native中，我们可以使用memoryInfo获取内存信息
      // 这里使用模拟数据
      const memoryUsage = Math.random() * 100 + 50; // 模拟50-150MB内存使用
      
      setPerformanceData(prev => ({ ...prev, memory: memoryUsage }));
    };
    
    updateMemory();
    const interval = setInterval(updateMemory, 5000);
    
    return () => clearInterval(interval);
  }, [visible, visibleSections.memory]);

  // 模拟网络统计
  useEffect(() => {
    if (!visible || !visibleSections.network) return;
    
    // 模拟网络请求
    const simulateNetworkActivity = () => {
      const requests = Math.floor(Math.random() * 5);
      const successful = requests - Math.floor(Math.random() * 2);
      const failed = requests - successful;
      const totalTime = requests * (Math.random() * 500 + 100); // 100-600ms per request
      const avgTime = requests > 0 ? totalTime / requests : 0;
      
      networkStatsRef.current = {
        requests: networkStatsRef.current.requests + requests,
        successful: networkStatsRef.current.successful + successful,
        failed: networkStatsRef.current.failed + failed,
        totalTime: networkStatsRef.current.totalTime + totalTime,
        avgTime: networkStatsRef.current.requests + requests > 0 
          ? (networkStatsRef.current.totalTime + totalTime) / (networkStatsRef.current.requests + requests)
          : 0
      };
      
      setNetworkStats(networkStatsRef.current);
    };
    
    const interval = setInterval(simulateNetworkActivity, 3000);
    
    return () => clearInterval(interval);
  }, [visible, visibleSections.network]);

  // 旋转动画
  useEffect(() => {
    if (!visible) return;
    
    Animated.loop(
      Animated.timing(rotateAnim, {
        toValue: 1,
        duration: 10000,
        useNativeDriver: true
      })
    ).start();
    
    return () => rotateAnim.stopAnimation();
  }, [visible, rotateAnim]);

  // 根据位置计算样式
  const getPositionStyle = () => {
    switch (position) {
      case 'top-right':
        return styles.topRight;
      case 'bottom-left':
        return styles.bottomLeft;
      case 'bottom-right':
        return styles.bottomRight;
      default:
        return styles.topLeft;
    }
  };

  // FPS指示器颜色
  const getFpsColor = (fps: number) => {
    if (fps >= 55) return '#4CAF50';
    if (fps >= 30) return '#FFC107';
    return '#F44336';
  };

  // 内存使用颜色
  const getMemoryColor = (memory?: number) => {
    if (!memory) return '#9E9E9E';
    if (memory <= 100) return '#4CAF50';
    if (memory <= 200) return '#FFC107';
    return '#F44336';
  };

  // 网络请求成功率颜色
  const getSuccessRateColor = () => {
    const total = networkStats.requests;
    if (total === 0) return '#9E9E9E';
    const rate = networkStats.successful / total;
    if (rate >= 0.9) return '#4CAF50';
    if (rate >= 0.7) return '#FFC107';
    return '#F44336';
  };

  if (!visible) return null;

  return (
    <Animated.View 
      style={[
        styles.container, 
        getPositionStyle(),
        { opacity: fadeAnim }
      ]}
      pointerEvents="none"
    >
      <View style={styles.debugPanel}>
        <View style={styles.panelHeader}>
          <Animated.View 
            style={[
              styles.debugDot,
              { transform: [{ rotate: rotateAnim.interpolate({ inputRange: [0, 1], outputRange: ['0deg', '360deg'] }) }] }
            ]}
          />
          <Text style={styles.debugTitle}>DEBUG</Text>
        </View>
        
        {visibleSections.fps && (
          <View style={styles.statsRow}>
            <Text style={styles.label}>FPS:</Text>
            <Text style={[styles.value, { color: getFpsColor(performanceData.fps) }]}>
              {performanceData.fps}
            </Text>
          </View>
        )}
        
        {visibleSections.memory && performanceData.memory !== undefined && (
          <View style={styles.statsRow}>
            <Text style={styles.label}>内存:</Text>
            <Text style={[styles.value, { color: getMemoryColor(performanceData.memory) }]}>
              {performanceData.memory.toFixed(1)}MB
            </Text>
          </View>
        )}
        
        {visibleSections.network && (
          <>
            <View style={styles.statsRow}>
              <Text style={styles.label}>请求:</Text>
              <Text style={styles.value}>{networkStats.requests}</Text>
            </View>
            <View style={styles.statsRow}>
              <Text style={styles.label}>成功率:</Text>
              <Text style={[styles.value, { color: getSuccessRateColor() }]}>
                {networkStats.requests > 0 
                  ? `${Math.round((networkStats.successful / networkStats.requests) * 100)}%` 
                  : '0%'
                }
              </Text>
            </View>
            <View style={styles.statsRow}>
              <Text style={styles.label}>平均时间:</Text>
              <Text style={styles.value}>{networkStats.avgTime.toFixed(0)}ms</Text>
            </View>
          </>
        )}
        
        <View style={styles.statsRow}>
          <Text style={styles.label}>环境:</Text>
          <Text style={styles.value}>{__DEV__ ? '开发' : '生产'}</Text>
        </View>
        
        <View style={styles.statsRow}>
          <Text style={styles.label}>平台:</Text>
          <Text style={styles.value}>{Platform.OS}</Text>
        </View>
        
        <View style={styles.statsRow}>
          <Text style={styles.label}>设备类型:</Text>
          <Text style={styles.value}>{responsiveConfig.deviceType}</Text>
        </View>
        
        <View style={styles.statsRow}>
          <Text style={styles.label}>逻辑尺寸:</Text>
          <Text style={styles.value}>
            {responsiveConfig.screenWidth}x{responsiveConfig.screenHeight}
          </Text>
        </View>
        <View style={styles.statsRow}>
          <Text style={styles.label}>物理尺寸:</Text>
          <Text style={styles.value}>
            {Math.round(responsiveConfig.physicalWidth)}x{Math.round(responsiveConfig.physicalHeight)}
          </Text>
        </View>
        <View style={styles.statsRow}>
          <Text style={styles.label}>像素密度:</Text>
          <Text style={styles.value}>
            {responsiveConfig.pixelRatio}x
          </Text>
        </View>
      </View>
    </Animated.View>
  );
};



export default DebugOverlay;

// 导出网络统计跟踪方法，供API服务使用
export const trackNetworkRequest = (success: boolean, duration: number) => {
  // 这里可以实现真实的网络统计跟踪逻辑
  // 在实际应用中，这会更新全局的网络统计数据
  debug(`网络请求跟踪: 成功=${success}, 耗时=${duration.toFixed(2)}ms`, 'DEBUG_OVERLAY');
};
