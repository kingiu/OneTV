import React, { useEffect, useState, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  ActivityIndicator,
  TouchableOpacity,
  Platform,
  RefreshControl,
  Alert
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { useMembershipStore } from '../stores/membershipStore';
import { useAuthStore } from '../stores/authStore';
import MembershipInfoCard from '../components/membership/MembershipInfoCard';
import CouponRedeemCard from '../components/membership/CouponRedeemCard';
import { useResponsiveLayout } from '../hooks/useResponsiveLayout';
import { validateMembershipInfo, mapLunaToStandardTier, MembershipNames } from '../utils/membershipUtils';

export default function MembershipScreen() {
  console.debug('MembershipScreen 渲染');
  
  const router = useRouter();
  const { isLoggedIn, showLoginModal } = useAuthStore();
  const { membershipInfo, isLoading, error, fetchMembershipInfo } = useMembershipStore();
  
  console.debug('MembershipScreen 状态', { 
    isLoggedIn, 
    hasMembershipInfo: !!membershipInfo, 
    isLoading, 
    hasError: !!error 
  });
  
  const { deviceType } = useResponsiveLayout();
  const isMobile = deviceType === 'mobile';
  const isTablet = deviceType === 'tablet';
  const isTV = deviceType === 'tv';
  
  const [refreshing, setRefreshing] = useState(false);
  const [localError, setLocalError] = useState<string | null>(null);

  // 用于跟踪页面是否已经初始化加载过
  const hasInitialLoaded = useRef(false);

  useEffect(() => {
    // 页面首次加载时获取会员信息
    if (isLoggedIn && !hasInitialLoaded.current) {
      hasInitialLoaded.current = true;
      loadMembershipInfo();
    }
  }, [isLoggedIn, fetchMembershipInfo]);

  // 监听页面焦点变化，当页面重新获得焦点时自动核对会员信息
  useEffect(() => {
    if (!isLoggedIn) return;

    const handleFocus = () => {
      console.debug('页面获得焦点，自动核对会员信息...');
      // 当页面获得焦点时自动核对，但不显示刷新指示器
      checkAndUpdateMembershipInfo().catch(err => {
        console.error('自动核对会员信息失败:', err);
        // 自动核对失败不显示错误，避免干扰用户体验
      });
    };

    // 添加焦点事件监听器
    if (Platform.OS === 'web') {
      window.addEventListener('focus', handleFocus);
    } else {
      // React Native 环境中使用 AppState 监听应用状态变化
      import('react-native').then(({ AppState }) => {
        const subscription = AppState.addEventListener('change', (nextAppState) => {
          if (nextAppState === 'active') {
            handleFocus();
          }
        });

        return () => {
          subscription.remove();
        };
      });
    }

    // 清理监听器
    return () => {
      if (Platform.OS === 'web') {
        window.removeEventListener('focus', handleFocus);
      }
    };
  }, [isLoggedIn, membershipInfo]); // 依赖 membershipInfo 以确保使用最新的信息进行比较

  const loadMembershipInfo = async () => {
    console.log('加载会员信息');
    setLocalError(null);
    try {
      // 直接调用store的fetchMembershipInfo方法，它现在包含完整的缓存清除逻辑
      await fetchMembershipInfo();
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : '获取会员信息失败';
      setLocalError(errorMessage);
      console.error('获取会员信息失败:', err);
    }
  };

  // 核对会员信息并在不一致时更新的函数
  const checkAndUpdateMembershipInfo = async () => {
    if (!isLoggedIn || !membershipInfo) return;
    
    try {
      // 在刷新前保存当前会员信息用于比较
      const previousMembershipInfo = { ...membershipInfo };
      // 获取当前映射后的标准化等级
      const previousStandardTier = mapLunaToStandardTier(previousMembershipInfo.tier);
      
      console.debug('开始核对会员信息...');
      await fetchMembershipInfo();
      
      // 核对完成后，检查是否有变更
      if (membershipInfo && previousMembershipInfo) {
        // 获取新的映射后的标准化等级
        const newStandardTier = mapLunaToStandardTier(membershipInfo.tier);
        
        // 扩展比较字段，确保捕获所有重要变更
        const hasTierChanged = previousMembershipInfo.tier !== membershipInfo.tier;
        const hasStandardTierChanged = previousStandardTier !== newStandardTier; // 增加对映射后等级的比较
        const hasStatusChanged = previousMembershipInfo.status !== membershipInfo.status;
        const hasIsActiveChanged = previousMembershipInfo.isActive !== membershipInfo.isActive;
        const hasExpireTimeChanged = previousMembershipInfo.expireTime !== membershipInfo.expireTime;
        const hasDaysRemainingChanged = previousMembershipInfo.daysRemaining !== membershipInfo.daysRemaining;
        const hasLastRenewTimeChanged = previousMembershipInfo.lastRenewTime !== membershipInfo.lastRenewTime;
        
        // 检查是否有任何重要字段发生变更
        const hasAnyChange = hasTierChanged || hasStandardTierChanged || hasStatusChanged || hasIsActiveChanged || 
                           hasExpireTimeChanged || hasDaysRemainingChanged || hasLastRenewTimeChanged;
        
        // 如果有重要信息变更，记录详细日志并更新数据
        if (hasAnyChange) {
          // 创建变更详情对象用于日志记录
          const changes = {
            tierChanged: hasTierChanged,
            standardTierChanged: hasStandardTierChanged,
            statusChanged: hasStatusChanged,
            isActiveChanged: hasIsActiveChanged,
            expireTimeChanged: hasExpireTimeChanged,
            daysRemainingChanged: hasDaysRemainingChanged,
            lastRenewTimeChanged: hasLastRenewTimeChanged,
            previousData: {
              tier: previousMembershipInfo.tier,
              standardTier: previousStandardTier,
              status: previousMembershipInfo.status,
              isActive: previousMembershipInfo.isActive,
              expireTime: previousMembershipInfo.expireTime,
              daysRemaining: previousMembershipInfo.daysRemaining,
              lastRenewTime: previousMembershipInfo.lastRenewTime
            },
            newData: {
              tier: membershipInfo.tier,
              standardTier: newStandardTier,
              status: membershipInfo.status,
              isActive: membershipInfo.isActive,
              expireTime: membershipInfo.expireTime,
              daysRemaining: membershipInfo.daysRemaining,
              lastRenewTime: membershipInfo.lastRenewTime
            }
          };
          
          console.info('会员信息数据不一致，已自动更新:', changes);
          
          // 构建用户友好的变更消息
          let changeMessage = '您的会员信息已更新:\n\n';
          
          // 优先显示标准化等级变化（用户友好的等级名称）
          if (hasStandardTierChanged) {
            const previousTierName = MembershipNames[previousStandardTier] || previousMembershipInfo.tier;
            const newTierName = MembershipNames[newStandardTier] || membershipInfo.tier;
            changeMessage += `会员等级: ${previousTierName} → ${newTierName}\n`;
          } else if (hasTierChanged) {
            // 如果标准化等级没变但原始tier变了，也显示
            changeMessage += `会员等级: ${previousMembershipInfo.tier} → ${membershipInfo.tier}\n`;
          }
          if (hasStatusChanged) {
            changeMessage += `会员状态: ${previousMembershipInfo.status} → ${membershipInfo.status}\n`;
          }
          if (hasIsActiveChanged) {
            const previousActive = previousMembershipInfo.isActive ? '激活' : '未激活';
            const newActive = membershipInfo.isActive ? '激活' : '未激活';
            changeMessage += `激活状态: ${previousActive} → ${newActive}\n`;
          }
          if (hasDaysRemainingChanged) {
            changeMessage += `剩余天数: ${previousMembershipInfo.daysRemaining || 'N/A'} → ${membershipInfo.daysRemaining || 'N/A'}\n`;
          }
          
          // 在所有环境下都显示重要变更的提示，但优化用户体验
          if (!refreshing) {
            // 对于生产环境，在等级变更或激活状态变更时显示提示
            const shouldShowAlert = __DEV__ || hasStandardTierChanged || hasTierChanged || hasIsActiveChanged;
            if (shouldShowAlert) {
              Alert.alert(
                '会员信息已更新',
                changeMessage,
                [{ text: '确定', style: 'default' }],
                { cancelable: true }
              );
            }
          }
        }
      }
    } catch (err) {
      console.error('核对会员信息失败:', err);
      
      // 提供更详细的错误信息
      if (err instanceof Error) {
        console.error(`核对失败详情: ${err.name}: ${err.message}`);
        if (err.stack) {
          console.error('错误堆栈:', err.stack);
        }
      }
      
      throw err;
    }
  };

  const handleRefresh = async () => {
    if (!isLoggedIn) {
      showLoginModal();
      return;
    }
    setRefreshing(true);
    setLocalError(null);
    try {
      // 直接调用store的fetchMembershipInfo方法
      await fetchMembershipInfo();
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : '刷新失败，请重试';
      setLocalError(errorMessage);
      console.error('刷新会员信息失败:', err);
    } finally {
      setRefreshing(false);
    }
  };

  const handleRedeemPress = () => {
    if (!isLoggedIn) {
      showLoginModal();
      return;
    }
    // 滚动到兑换卡券部分
    // 这里可以通过ref实现精确滚动
  };

  const handleLoginPress = () => {
    showLoginModal();
  };

  // 根据设备类型调整布局
  const contentStyle = isTV 
    ? styles.contentTV 
    : isTablet 
      ? styles.contentTablet 
      : styles.contentMobile;

  // 合并错误信息
  const displayError = localError || error;

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView 
        style={styles.scrollView}
        contentContainerStyle={[styles.contentContainer, contentStyle]}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl 
            refreshing={refreshing} 
            onRefresh={handleRefresh}
            colors={['#3B82F6']}
            tintColor="#3B82F6"
          />
        }
      >
        <Text style={styles.headerTitle}>会员中心</Text>
        
        {!isLoggedIn && (
          <View style={styles.loginPromptContainer}>
            <Text style={styles.loginPromptText}>请先登录查看会员信息</Text>
            <TouchableOpacity 
              style={styles.loginButton}
              onPress={handleLoginPress}
              activeOpacity={0.7}
            >
              <Text style={styles.loginButtonText}>去登录</Text>
            </TouchableOpacity>
          </View>
        )}
        
        {isLoading && !refreshing && (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color="#3B82F6" />
            <Text style={styles.loadingText}>加载中...</Text>
          </View>
        )}
        
        {displayError && !isLoading && (
          <View style={styles.errorContainer}>
            <Text style={styles.errorText}>{displayError}</Text>
            <TouchableOpacity 
              style={styles.retryButton}
              onPress={handleRefresh}
              activeOpacity={0.7}
            >
              <Text style={styles.retryButtonText}>重试</Text>
            </TouchableOpacity>
          </View>
        )}
        
        {!isLoading && isLoggedIn && membershipInfo && (
          <View style={styles.cardsContainer}>
            {/* 会员信息卡片 */}
            <MembershipInfoCard 
              membership={membershipInfo} 
              onRedeemPress={handleRedeemPress}
            />
            
            {/* 卡券兑换卡片 */}
            <CouponRedeemCard 
              onSuccess={() => {
                // 兑换成功后可以执行一些操作，比如显示提示
                console.log('卡券兑换成功');
                // 兑换成功后刷新会员信息
                handleRefresh();
                Alert.alert('成功', '优惠券兑换成功！');
              }}
            />
          </View>
        )}
        
        {/* 会员特权展示 */}
        <View style={styles.privilegesSection}>
          <Text style={styles.sectionTitle}>会员等级权益</Text>
          
          <View style={styles.tierPrivileges}>
            <TierPrivilege 
              tier="VIP会员"
              color="#FFD700"
              privileges={[
                '全部高级视频资源',
                '4K超高清画质',
                '无广告观影体验',
                '专属客服支持',
                '多设备同时登录'
              ]}
            />
            
            <TierPrivilege 
              tier="高级会员"
              color="#9370DB"
              privileges={[
                '大部分高级视频资源',
                '1080P高清画质',
                '无广告观影体验',
                '标准客服支持'
              ]}
            />
            
            <TierPrivilege 
              tier="普通会员"
              color="#4A90E2"
              privileges={[
                '基础视频资源访问',
                '720P高清画质',
                '有限广告体验'
              ]}
            />
          </View>
        </View>

        {/* 验证状态信息，仅在开发模式显示 */}
        {__DEV__ && membershipInfo && (
          <View style={styles.debugInfo}>
            <Text style={styles.debugTitle}>会员信息验证状态：</Text>
            <Text style={[
              styles.debugStatus,
              { color: validateMembershipInfo(membershipInfo) ? '#4CAF50' : '#F44336' }
            ]}>
              {validateMembershipInfo(membershipInfo) ? '有效' : '无效'}
            </Text>
            {membershipInfo.tier && (
              <Text style={styles.debugTier}>标准化等级：{mapLunaToStandardTier(membershipInfo.tier)}</Text>
            )}
          </View>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

// 会员等级特权组件
interface TierPrivilegeProps {
  tier: string;
  color: string;
  privileges: string[];
}

const TierPrivilege: React.FC<TierPrivilegeProps> = ({ tier, color, privileges }) => (
  <View style={styles.tierPrivilegeCard}>
    <View style={[styles.tierHeader, { backgroundColor: color + '20' }]}>
      <View style={[styles.tierIndicator, { backgroundColor: color }]} />
      <Text style={[styles.tierTitle, { color }]}>{tier}</Text>
    </View>
    <View style={styles.privilegesList}>
      {privileges.map((privilege, index) => (
        <View key={index} style={styles.privilegeItem}>
          <Text style={styles.privilegeDot}>•</Text>
          <Text style={styles.privilegeText}>{privilege}</Text>
        </View>
      ))}
    </View>
  </View>
);

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F9FAFB',
  },
  scrollView: {
    flex: 1,
  },
  contentContainer: {
    paddingBottom: 32,
  },
  contentMobile: {
    paddingHorizontal: 0,
  },
  contentTablet: {
    paddingHorizontal: 16,
  },
  contentTV: {
    paddingHorizontal: 32,
  },
  headerTitle: {
    fontSize: 28,
    fontWeight: '700',
    color: '#1F2937',
    marginHorizontal: 16,
    marginTop: 16,
    marginBottom: 24,
  },
  loginPromptContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    padding: 32,
  },
  loginPromptText: {
    fontSize: 16,
    color: '#6B7280',
    marginBottom: 16,
  },
  loginButton: {
    backgroundColor: '#3B82F6',
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 8,
  },
  loginButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '500',
  },
  loadingContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    padding: 32,
  },
  loadingText: {
    marginTop: 16,
    fontSize: 14,
    color: '#6B7280',
  },
  errorContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    padding: 32,
  },
  errorText: {
    fontSize: 14,
    color: '#EF4444',
    marginBottom: 16,
    textAlign: 'center',
  },
  retryButton: {
    backgroundColor: '#3B82F6',
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 8,
  },
  retryButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '500',
  },
  cardsContainer: {
    gap: 16,
  },
  privilegesSection: {
    marginTop: 32,
    marginHorizontal: 16,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: '600',
    color: '#1F2937',
    marginBottom: 16,
  },
  tierPrivileges: {
    gap: 16,
  },
  tierPrivilegeCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    overflow: 'hidden',
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.05,
        shadowRadius: 2,
      },
      android: {
        elevation: 2,
      },
    }),
  },
  tierHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    gap: 8,
  },
  tierIndicator: {
    width: 12,
    height: 12,
    borderRadius: 6,
  },
  tierTitle: {
    fontSize: 16,
    fontWeight: '600',
  },
  privilegesList: {
    padding: 12,
  },
  privilegeItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 8,
  },
  privilegeDot: {
    fontSize: 12,
    color: '#6B7280',
  },
  privilegeText: {
    fontSize: 14,
    color: '#6B7280',
    flex: 1,
  },
  debugInfo: {
    backgroundColor: '#f0f0f0',
    padding: 15,
    margin: 16,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#e0e0e0',
  },
  debugTitle: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#666666',
    marginBottom: 5,
  },
  debugStatus: {
    fontSize: 14,
    fontWeight: 'bold',
    marginBottom: 5,
  },
  debugTier: {
    fontSize: 12,
    color: '#888888',
  },
});