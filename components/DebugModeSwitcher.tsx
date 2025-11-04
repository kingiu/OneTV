import React, { useState, useEffect } from 'react';
import { View, Switch, StyleSheet, Platform } from 'react-native';
import { ThemedView } from './ThemedView';
import { ThemedText } from './ThemedText';
import { DEBUG_MODE, FEATURE_FLAGS, LogLevel, CURRENT_LOG_LEVEL, DEBUG_TOOLS_CONFIG, ERROR_MONITORING_CONFIG } from '@/constants/DebugConfig';
import { debug, info } from '@/utils/debugUtils';

interface DebugModeSwitcherProps {
  onDebugModeChange?: (enabled: boolean) => void;
}

const DebugModeSwitcher: React.FC<DebugModeSwitcherProps> = ({ onDebugModeChange }) => {
  // 在实际应用中，这些设置应该保存在AsyncStorage中
  const [isDebugModeEnabled, setIsDebugModeEnabled] = useState(DEBUG_MODE);
  const [isApiLoggingEnabled, setIsApiLoggingEnabled] = useState(FEATURE_FLAGS.ENABLE_API_LOGGING);
  const [isPerformanceMonitoringEnabled, setIsPerformanceMonitoringEnabled] = useState(FEATURE_FLAGS.ENABLE_PERFORMANCE_MONITORING);
  const [isDebugUiEnabled, setIsDebugUiEnabled] = useState(FEATURE_FLAGS.ENABLE_DEBUG_UI);
  const [showNetworkStats, setShowNetworkStats] = useState(DEBUG_TOOLS_CONFIG.SHOW_NETWORK_STATS);
  const [captureErrors, setCaptureErrors] = useState(ERROR_MONITORING_CONFIG.CAPTURE_JS_ERRORS);

  useEffect(() => {
    info('调试模式组件已加载', 'DEBUG_MODE');
  }, []);

  const handleDebugModeToggle = (value: boolean) => {
    setIsDebugModeEnabled(value);
    debug(`调试模式已${value ? '开启' : '关闭'}`, 'DEBUG_MODE');
    if (onDebugModeChange) {
      onDebugModeChange(value);
    }
    
    // 当调试模式关闭时，禁用所有子功能
    if (!value) {
      setIsApiLoggingEnabled(false);
      setIsPerformanceMonitoringEnabled(false);
      setIsDebugUiEnabled(false);
      setShowNetworkStats(false);
      setCaptureErrors(false);
    } else {
      // 当调试模式开启时，恢复默认设置
      setIsApiLoggingEnabled(FEATURE_FLAGS.ENABLE_API_LOGGING);
      setIsPerformanceMonitoringEnabled(FEATURE_FLAGS.ENABLE_PERFORMANCE_MONITORING);
      setIsDebugUiEnabled(FEATURE_FLAGS.ENABLE_DEBUG_UI);
      setShowNetworkStats(DEBUG_TOOLS_CONFIG.SHOW_NETWORK_STATS);
      setCaptureErrors(ERROR_MONITORING_CONFIG.CAPTURE_JS_ERRORS);
    }
  };

  const handleFeatureToggle = (featureName: string, value: boolean) => {
    debug(`${featureName} 已${value ? '开启' : '关闭'}`, 'DEBUG_MODE');
    
    switch (featureName) {
      case 'API_LOGGING':
        setIsApiLoggingEnabled(value);
        break;
      case 'PERFORMANCE_MONITORING':
        setIsPerformanceMonitoringEnabled(value);
        break;
      case 'DEBUG_UI':
        setIsDebugUiEnabled(value);
        break;
      case 'NETWORK_STATS':
        setShowNetworkStats(value);
        break;
      case 'CAPTURE_ERRORS':
        setCaptureErrors(value);
        break;
    }
  };

  const FeatureSwitch = ({ 
    title, 
    description, 
    value, 
    onValueChange, 
    disabled = false 
  }: {
    title: string;
    description?: string;
    value: boolean;
    onValueChange: (value: boolean) => void;
    disabled?: boolean;
  }) => (
    <View style={styles.featureContainer}>
      <View style={styles.featureInfo}>
        <ThemedText style={styles.featureTitle}>{title}</ThemedText>
        {description && (
          <ThemedText style={styles.featureDescription}>{description}</ThemedText>
        )}
      </View>
      <Switch
        value={value}
        onValueChange={onValueChange}
        disabled={disabled}
        trackColor={{ false: '#767577', true: '#81b0ff' }}
        thumbColor={value ? '#007aff' : '#f4f3f4'}
        ios_backgroundColor="#3e3e3e"
      />
    </View>
  );

  return (
    <ThemedView style={styles.container}>
      <ThemedText style={styles.sectionTitle}>调试模式</ThemedText>
      
      <View style={styles.mainSwitchContainer}>
        <ThemedText style={styles.mainSwitchTitle}>
          启用调试模式 {__DEV__ ? '(开发环境)' : '(生产环境)'}
        </ThemedText>
        <Switch
          value={isDebugModeEnabled}
          onValueChange={handleDebugModeToggle}
          trackColor={{ false: '#767577', true: '#81b0ff' }}
          thumbColor={isDebugModeEnabled ? '#007aff' : '#f4f3f4'}
          ios_backgroundColor="#3e3e3e"
        />
      </View>

      {isDebugModeEnabled && (
        <View style={styles.featuresContainer}>
          <FeatureSwitch
            title="API请求日志"
            description="记录所有API请求和响应的详细信息"
            value={isApiLoggingEnabled}
            onValueChange={(value) => handleFeatureToggle('API_LOGGING', value)}
          />
          
          <FeatureSwitch
            title="性能监控"
            description="监控和记录关键操作的执行时间"
            value={isPerformanceMonitoringEnabled}
            onValueChange={(value) => handleFeatureToggle('PERFORMANCE_MONITORING', value)}
          />
          
          <FeatureSwitch
            title="调试界面"
            description="在应用中显示调试信息覆盖层"
            value={isDebugUiEnabled}
            onValueChange={(value) => handleFeatureToggle('DEBUG_UI', value)}
          />
          
          <FeatureSwitch
            title="网络统计"
            description="显示网络请求的统计信息"
            value={showNetworkStats}
            onValueChange={(value) => handleFeatureToggle('NETWORK_STATS', value)}
          />
          
          <FeatureSwitch
            title="错误捕获"
            description="捕获并记录所有JavaScript错误"
            value={captureErrors}
            onValueChange={(value) => handleFeatureToggle('CAPTURE_ERRORS', value)}
          />
        </View>
      )}

      <View style={styles.infoContainer}>
        <ThemedText style={styles.infoText}>
          当前日志级别: {CURRENT_LOG_LEVEL.toUpperCase()}
        </ThemedText>
        {Platform.OS === 'web' && (
          <ThemedText style={styles.infoText}>
            提示: 请在浏览器控制台查看详细日志
          </ThemedText>
        )}
        {Platform.OS !== 'web' && (
          <ThemedText style={styles.infoText}>
            提示: 请在开发工具控制台查看详细日志
          </ThemedText>
        )}
      </View>
    </ThemedView>
  );
};

const styles = StyleSheet.create({
  container: {
    padding: 16,
    borderRadius: 8,
    marginVertical: 8,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 16,
  },
  mainSwitchContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 8,
  },
  mainSwitchTitle: {
    fontSize: 16,
    fontWeight: '500',
  },
  featuresContainer: {
    marginTop: 16,
    paddingTop: 16,
    borderTopWidth: 1,
    borderTopColor: 'rgba(255, 255, 255, 0.1)',
  },
  featureContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 12,
  },
  featureInfo: {
    flex: 1,
    marginRight: 16,
  },
  featureTitle: {
    fontSize: 15,
    fontWeight: '500',
  },
  featureDescription: {
    fontSize: 12,
    opacity: 0.7,
    marginTop: 4,
  },
  infoContainer: {
    marginTop: 16,
    paddingTop: 16,
    borderTopWidth: 1,
    borderTopColor: 'rgba(255, 255, 255, 0.1)',
  },
  infoText: {
    fontSize: 12,
    opacity: 0.7,
    marginBottom: 4,
  },
});

export default DebugModeSwitcher;
