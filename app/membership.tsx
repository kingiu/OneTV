import React, { useEffect, useState } from 'react';
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
import { validateMembershipInfo, mapLunaToStandardTier } from '../utils/membershipUtils';

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

  useEffect(() => {
    // 页面加载时获取会员信息
    if (isLoggedIn) {
      loadMembershipInfo();
    }
  }, [isLoggedIn, fetchMembershipInfo]);

  const loadMembershipInfo = async () => {
    setLocalError(null);
    try {
      await fetchMembershipInfo();
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : '获取会员信息失败';
      setLocalError(errorMessage);
      console.error('获取会员信息失败:', err);
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