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
  Alert,
  Image
} from 'react-native';
import { Colors } from '@/constants/Colors';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { useMembershipStore } from '../stores/membershipStore';
import { useAuthStore } from '../stores/authStore';
import MembershipInfoCard from '../components/membership/MembershipInfoCard';
import CouponRedeemCard from '../components/membership/CouponRedeemCard';
import { useResponsiveLayout } from '../hooks/useResponsiveLayout';
import { LinearGradient } from 'expo-linear-gradient';


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
    <SafeAreaView style={[styles.container, isTV && styles.containerTV]}>
      {isTV ? (
        // TV端完整布局
        <View style={styles.tvFullLayout}>
          {/* 顶部导航 */}
          <View style={styles.header}>
            <View style={styles.logoContainer}>
              <View style={styles.logoCircle}><Text style={styles.logoText}>TV</Text></View>
              <Text style={styles.headerTitle}>会员中心</Text>
            </View>
            <View style={styles.headerIcons}>
              <Text style={styles.icon}>🔍</Text>
              <Text style={styles.icon}>⭐</Text>
            </View>
          </View>

          {/* 主内容区域 - 左右分栏 */}
          <View style={styles.content}>
            {/* 左侧：会员信息 */}
            <View style={styles.leftCard}>
              <Text style={styles.sectionTitle}>会员信息</Text>
              <MembershipInfoCard 
                membership={membershipInfo} 
                onRedeemPress={handleRedeemPress}
              />
            </View>

            {/* 右侧：兑换区 */}
            <View style={styles.rightCard}>
              <Text style={styles.redeemTitle}>兑换优惠券</Text>
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
          </View>
        </View>
      ) : (
        // 移动端和平板端布局
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
      )}
    </SafeAreaView>
  );
}



const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.dark.background,
  },
  // TV端容器样式
  containerTV: {
    padding: 60,
    backgroundColor: '#0A0B0D', // 深黑色背景
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
    paddingVertical: 30,
  },
  // TV端完整布局
  tvFullLayout: {
    flex: 1,
    backgroundColor: '#0A0B0D',
  },
  // 顶部导航
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 40,
  },
  logoContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  logoCircle: {
    width: 40,
    height: 40,
    borderRadius: 20,
    borderWidth: 2,
    borderColor: '#F3D58E', // 金色边框
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 15,
  },
  logoText: {
    color: '#F3D58E', // 金色文字
    fontWeight: 'bold',
    fontSize: 16,
  },
  headerTitle: {
    color: '#FFFFFF',
    fontSize: 28,
    fontWeight: '500',
    textShadowColor: 'rgba(243, 213, 142, 0.3)',
    textShadowOffset: { width: 0, height: 0 },
    textShadowRadius: 10,
  },
  headerIcons: {
    flexDirection: 'row',
    gap: 30,
  },
  icon: {
    fontSize: 24,
    color: '#FFFFFF',
  },
  // 主内容区域 - 左右分栏
  content: {
    flex: 1,
    flexDirection: 'row',
    gap: 30,
  },
  // 左侧：会员信息
  leftCard: {
    flex: 1,
    backgroundColor: '#15171A',
    borderRadius: 20,
    padding: 30,
  },
  // 右侧：兑换区
  rightCard: {
    flex: 2,
    backgroundColor: '#15171A',
    borderRadius: 20,
    padding: 40,
    justifyContent: 'center',
  },
  // 左侧卡片标题
  sectionTitle: {
    color: '#AAA',
    fontSize: 18,
    marginBottom: 30,
    fontWeight: '500',
  },
  // 右侧兑换标题
  redeemTitle: {
    color: '#FFF',
    fontSize: 36,
    fontWeight: 'bold',
    marginBottom: 40,
    textAlign: 'center',
    textShadowColor: 'rgba(243, 213, 142, 0.3)',
    textShadowOffset: { width: 0, height: 0 },
    textShadowRadius: 10,
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