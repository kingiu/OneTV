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
import { Colors } from '@/constants/Colors';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { useMembershipStore } from '../stores/membershipStore';
import { useAuthStore } from '../stores/authStore';
import MembershipInfoCard from '../components/membership/MembershipInfoCard';
import CouponRedeemCard from '../components/membership/CouponRedeemCard';
import { useResponsiveLayout } from '../hooks/useResponsiveLayout';


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
        

      </ScrollView>
    </SafeAreaView>
  );
}



const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.dark.background,
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

});