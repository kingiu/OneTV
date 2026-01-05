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
  Alert,
} from 'react-native';
import { Colors } from '@/constants/Colors';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useMembershipStore } from '../stores/membershipStore';
import { useAuthStore } from '../stores/authStore';
import MembershipInfoCard from '../components/membership/MembershipInfoCard';
import CouponRedeemCard from '../components/membership/CouponRedeemCard';
import { useResponsiveLayout } from '../hooks/useResponsiveLayout';
import { getMembershipTierText } from '../utils/membershipUtils';


export default function MembershipScreen() {
  console.debug('MembershipScreen 渲染');
  
  const { isLoggedIn, showLoginModal } = useAuthStore();
  const { membershipInfo, isLoading, error, fetchMembershipInfo } = useMembershipStore();
  
  console.debug('MembershipScreen 状态', { 
    isLoggedIn, 
    hasMembershipInfo: !!membershipInfo, 
    isLoading, 
    hasError: !!error 
  });
  
  const { screenWidth } = useResponsiveLayout();
  // 修复平板设备被错误识别为TV的问题
  // 仅当Platform.isTV为true时才判定为TV设备，否则根据屏幕宽度判断
  const isTVDevice = Platform.isTV;
  const isTabletDevice = !isTVDevice && screenWidth >= 768;
  
  const isTablet = isTabletDevice;
  const isTV = isTVDevice;
  // 平板设备也使用左右结构
  const useLeftRightLayout = isTVDevice || isTabletDevice;
  
  const [refreshing, setRefreshing] = useState(false);
  const [localError, setLocalError] = useState<string | null>(null);
  const [initialLoaded, setInitialLoaded] = useState(false);

  useEffect(() => {
    // 页面首次加载时获取会员信息
    if (isLoggedIn && !initialLoaded) {
      setInitialLoaded(true);
      loadMembershipInfo();
    }
  }, [isLoggedIn, fetchMembershipInfo, initialLoaded, loadMembershipInfo]);



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
    <SafeAreaView style={[styles.container, useLeftRightLayout && styles.containerTV]}>
      {useLeftRightLayout ? (
        // TV端和平板端完整布局 - 左侧导航+右侧内容
        <View style={styles.tvFullLayout}>
          {/* 主内容区域 - 左侧导航+右侧内容 */}
          <View style={styles.tvMainContent}>
            {/* 左侧导航栏 */}
            <View style={styles.tvSidebar}>
              {/* 会员中心标题 */}
              <Text style={styles.tvSidebarTitle}>会员中心</Text>
              
              {/* 会员信息 */}
              <View style={styles.tvMemberInfo}>
                <View style={styles.tvMemberAvatar}>
                  <Text style={styles.tvAvatarText}>👤</Text>
                </View>
                <View style={styles.tvMemberDetails}>
                  <Text style={styles.tvMemberName}>{membershipInfo?.userName || '访客'}</Text>
                  <Text style={styles.tvMemberTier}>会员等级: {getMembershipTierText(membershipInfo?.tier || '')}</Text>
                  <Text style={styles.tvMemberPoints}>积分: {membershipInfo?.points || 0}</Text>
                </View>
              </View>
              
              {/* 导航菜单 */}
              <View style={styles.tvNavigation}>
                <TouchableOpacity 
                  style={[styles.tvNavItem, styles.tvNavItemActive]}
                  activeOpacity={0.7}
                >
                  <Text style={[styles.tvNavItemText, styles.tvNavItemTextActive]}>卡券兑换</Text>
                  <Text style={[styles.tvNavItemArrow, styles.tvNavItemArrowActive]}>›</Text>
                </TouchableOpacity>
                <TouchableOpacity 
                  style={styles.tvNavItem}
                  activeOpacity={0.7}
                >
                  <Text style={styles.tvNavItemText}>我的信息</Text>
                  <Text style={styles.tvNavItemArrow}>›</Text>
                </TouchableOpacity>
                <TouchableOpacity 
                  style={styles.tvNavItem}
                  activeOpacity={0.7}
                >
                  <Text style={styles.tvNavItemText}>消费记录</Text>
                  <Text style={styles.tvNavItemArrow}>›</Text>
                </TouchableOpacity>
                <TouchableOpacity 
                  style={styles.tvNavItem}
                  activeOpacity={0.7}
                >
                  <Text style={styles.tvNavItemText}>登录</Text>
                  <Text style={styles.tvNavItemArrow}>›</Text>
                </TouchableOpacity>
              </View>
            </View>
            
            {/* 右侧内容区域 */}
                <View style={styles.tvContentArea}>
                  <ScrollView 
                    style={styles.tvContentScroll}
                    contentContainerStyle={styles.tvContentScrollContainer}
                    showsVerticalScrollIndicator={false}
                  >
                    {/* 兑换区域 */}
                    <View style={styles.tvRedeemSection}>
                      {!isLoggedIn && (
                        // 未登录状态 - 显示登录提示
                        <View style={styles.tvLoginPrompt}>
                          <Text style={styles.loginPromptText}>请先登录查看会员信息</Text>
                          <TouchableOpacity 
                            style={styles.tvLoginButton}
                            onPress={handleLoginPress}
                            activeOpacity={0.7}
                          >
                            <Text style={styles.loginButtonText}>去登录</Text>
                          </TouchableOpacity>
                        </View>
                      )}
                      
                      {isLoading && !refreshing && (
                        // 加载状态 - 显示加载指示器
                        <View style={styles.tvLoadingContainer}>
                          <ActivityIndicator size="large" color="#00bb5e" />
                          <Text style={styles.loadingText}>加载中...</Text>
                        </View>
                      )}
                      
                      {displayError && !isLoading && (
                        // 错误状态 - 显示错误信息
                        <View style={styles.tvErrorContainer}>
                          <Text style={styles.errorText}>{displayError}</Text>
                          <TouchableOpacity 
                            style={styles.tvRetryButton}
                            onPress={handleRefresh}
                            activeOpacity={0.7}
                          >
                            <Text style={styles.retryButtonText}>重试</Text>
                          </TouchableOpacity>
                        </View>
                      )}
                      
                      {!isLoading && isLoggedIn && membershipInfo && (
                        // 登录成功且有会员信息 - 显示兑换优惠券
                        <View style={styles.tvRedeemContent}>
                          {/* 卡券兑换标题 */}
                          <Text style={styles.tvRedeemTitle}>卡券兑换</Text>
                          
                          {/* 优惠券卡片 */}
                          <View style={styles.tvCouponCards}>
                            <View style={styles.tvCouponCard}>
                              <Text style={styles.tvCouponCardTitle}>满200减50</Text>
                              <Text style={styles.tvCouponCardSubtitle}>立即兑换</Text>
                            </View>
                            <View style={styles.tvCouponCardGreen}>
                              <Text style={styles.tvCouponCardTitle}>免费观影券</Text>
                              <Text style={styles.tvCouponCardSubtitle}>立即兑换</Text>
                            </View>
                            <View style={styles.tvCouponCardPurple}>
                              <Text style={styles.tvCouponCardTitle}>会员专属折扣</Text>
                              <Text style={styles.tvCouponCardSubtitle}>立即兑换</Text>
                            </View>
                          </View>
                          
                          {/* 卡券兑换组件 */}
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
                    </View>
                  </ScrollView>
                </View>
          </View>
        </View>
      ) : (
        // 移动端布局 - 上下结构
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
    padding: 0,
    backgroundColor: '#0F172A',
  },
  scrollView: {
    flex: 1,
  },
  contentContainer: {
    paddingBottom: 32,
  },
  contentMobile: {
    paddingHorizontal: 16,
  },
  contentTablet: {
    paddingHorizontal: 24,
  },
  contentTV: {
    paddingHorizontal: 32,
    paddingVertical: 30,
  },
  // TV端完整布局
  tvFullLayout: {
    flex: 1,
    backgroundColor: '#0A1128', // 深色主题背景
    minHeight: '100%',
  },
  // TV端主内容区域 - 左侧导航+右侧内容
  tvMainContent: {
    flex: 1,
    flexDirection: 'row',
    borderRadius: 0,
    overflow: 'hidden',
    backgroundColor: 'transparent',
    borderWidth: 0,
    borderColor: 'transparent',
  },
  // 会员中心标题
  tvSidebarTitle: {
    fontSize: 26,
    fontWeight: '700',
    color: '#FFFFFF',
    marginBottom: 40,
    alignSelf: 'center',
  },
  // 左侧导航栏
  tvSidebar: {
    width: 280,
    backgroundColor: '#1E3A8A', // 深蓝色背景
    paddingVertical: 30,
    paddingHorizontal: 20,
    borderRightWidth: 1,
    borderRightColor: '#3B82F6',
  },
  // 会员信息
  tvMemberInfo: {
    alignItems: 'center',
    marginBottom: 40,
    paddingBottom: 20,
  },
  // 会员头像
  tvMemberAvatar: {
    width: 100,
    height: 100,
    borderRadius: 50,
    backgroundColor: '#2563EB',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 16,
    borderWidth: 3,
    borderColor: '#FFFFFF',
  },
  // 头像文字
  tvAvatarText: {
    fontSize: 40,
  },
  // 会员详情
  tvMemberDetails: {
    alignItems: 'center',
  },
  // 会员名称
  tvMemberName: {
    fontSize: 22,
    fontWeight: '600',
    color: '#FFFFFF',
    marginBottom: 6,
  },
  // 会员等级
  tvMemberTier: {
    fontSize: 14,
    color: '#FFFFFF',
    marginBottom: 6,
    fontWeight: '500',
  },
  // 会员积分
  tvMemberPoints: {
    fontSize: 14,
    color: '#FFFFFF',
  },
  // 导航菜单
  tvNavigation: {
    gap: 8,
  },
  // 导航项
  tvNavItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 16,
    paddingHorizontal: 20,
    borderRadius: 8,
    backgroundColor: 'transparent',
    borderWidth: 2,
    borderColor: 'transparent',
  },
  // 导航项激活状态
  tvNavItemActive: {
    backgroundColor: '#2563EB',
    borderColor: 'transparent',
    shadowColor: 'transparent',
    shadowOffset: {
      width: 0,
      height: 0,
    },
    shadowOpacity: 0,
    elevation: 0,
  },
  // 导航项文字
  tvNavItemText: {
    fontSize: 18,
    fontWeight: '500',
    color: '#FFFFFF',
    opacity: 0.8,
  },
  // 导航项文字激活状态
  tvNavItemTextActive: {
    color: '#FFFFFF',
    fontWeight: '700',
    opacity: 1,
  },
  // 导航项箭头
  tvNavItemArrow: {
    fontSize: 24,
    color: '#FFFFFF',
    opacity: 0.5,
  },
  // 导航项箭头激活状态
  tvNavItemArrowActive: {
    color: '#FFFFFF',
    opacity: 1,
  },
  // 右侧内容区域
  tvContentArea: {
    flex: 1,
    padding: 40,
    backgroundColor: '#0F172A',
  },
  // 右侧内容滚动视图
  tvContentScroll: {
    flex: 1,
  },
  // 右侧内容滚动视图容器
  tvContentScrollContainer: {
    flexGrow: 1,
  },
  // 兑换区域
  tvRedeemSection: {
    flex: 1,
    justifyContent: 'flex-start',
    alignItems: 'stretch',
  },
  // 卡券兑换标题
  tvRedeemTitle: {
    fontSize: 42,
    fontWeight: '700',
    color: '#FFFFFF',
    marginBottom: 40,
  },
  // 优惠券卡片容器
  tvCouponCards: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 40,
    gap: 20,
  },
  // 优惠券卡片基础样式
  tvCouponCard: {
    flex: 1,
    height: 180,
    borderRadius: 12,
    padding: 20,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#F97316',
    shadowOffset: {
      width: 0,
      height: 8,
    },
    shadowOpacity: 0.4,
    shadowRadius: 16,
    elevation: 10,
    backgroundImage: 'linear-gradient(135deg, #FF9A00 0%, #FF5722 100%)',
    borderWidth: 1,
    borderColor: '#FFFFFF',
  },
  // 优惠券卡片绿色样式
  tvCouponCardGreen: {
    flex: 1,
    height: 180,
    borderRadius: 12,
    padding: 20,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#00bb5e',
    shadowOffset: {
      width: 0,
      height: 8,
    },
    shadowOpacity: 0.4,
    shadowRadius: 16,
    elevation: 10,
    backgroundImage: 'linear-gradient(135deg, #4CAF50 0%, #8BC34A 100%)',
    borderWidth: 1,
    borderColor: '#FFFFFF',
  },
  // 优惠券卡片紫色样式
  tvCouponCardPurple: {
    flex: 1,
    height: 180,
    borderRadius: 12,
    padding: 20,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#A855F7',
    shadowOffset: {
      width: 0,
      height: 8,
    },
    shadowOpacity: 0.4,
    shadowRadius: 16,
    elevation: 10,
    backgroundImage: 'linear-gradient(135deg, #9C27B0 0%, #673AB7 100%)',
    borderWidth: 1,
    borderColor: '#FFFFFF',
  },
  // 优惠券卡片标题
  tvCouponCardTitle: {
    fontSize: 24,
    fontWeight: '700',
    color: '#FFFFFF',
    marginBottom: 12,
    textShadowColor: 'rgba(0, 0, 0, 0.3)',
    textShadowOffset: {
      width: 0,
      height: 1,
    },
    textShadowRadius: 2,
  },
  // 优惠券卡片副标题
  tvCouponCardSubtitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#FFFFFF',
    opacity: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.3)',
    paddingHorizontal: 20,
    paddingVertical: 8,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: '#FFFFFF',
  },
  // TV端登录提示
  tvLoginPrompt: {
    backgroundColor: '#151B26',
    borderRadius: 24,
    padding: 60,
    alignItems: 'center',
    borderWidth: 2,
    borderColor: 'rgba(0, 187, 94, 0.4)',
    shadowColor: '#00bb5e',
    shadowOffset: {
      width: 0,
      height: 12,
    },
    shadowOpacity: 0.4,
    shadowRadius: 20,
    elevation: 12,
    minWidth: 600,
  },
  // TV端登录按钮
  tvLoginButton: {
    backgroundColor: '#00bb5e',
    paddingHorizontal: 60,
    paddingVertical: 24,
    borderRadius: 16,
    shadowColor: '#00bb5e',
    shadowOffset: {
      width: 0,
      height: 8,
    },
    shadowOpacity: 0.6,
    shadowRadius: 16,
    elevation: 10,
    borderWidth: 2,
    borderColor: '#4ade80',
  },
  // TV端加载容器
  tvLoadingContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    padding: 60,
    backgroundColor: '#151B26',
    borderRadius: 24,
    borderWidth: 2,
    borderColor: 'rgba(0, 187, 94, 0.3)',
    shadowColor: '#00bb5e',
    shadowOffset: {
      width: 0,
      height: 8,
    },
    shadowOpacity: 0.3,
    shadowRadius: 16,
    elevation: 10,
    minWidth: 500,
  },
  // TV端错误容器
  tvErrorContainer: {
    backgroundColor: 'rgba(239, 68, 68, 0.2)',
    padding: 40,
    borderRadius: 24,
    borderWidth: 2,
    borderColor: 'rgba(239, 68, 68, 0.4)',
    borderLeftWidth: 8,
    borderLeftColor: '#EF4444',
    alignItems: 'center',
    minWidth: 500,
    shadowColor: '#EF4444',
    shadowOffset: {
      width: 0,
      height: 8,
    },
    shadowOpacity: 0.3,
    shadowRadius: 16,
    elevation: 8,
  },
  // TV端重试按钮
  tvRetryButton: {
    backgroundColor: '#00bb5e',
    paddingHorizontal: 60,
    paddingVertical: 24,
    borderRadius: 16,
    marginTop: 24,
    shadowColor: '#00bb5e',
    shadowOffset: {
      width: 0,
      height: 8,
    },
    shadowOpacity: 0.6,
    shadowRadius: 16,
    elevation: 10,
    borderWidth: 2,
    borderColor: '#4ade80',
  },
  // 兑换内容
  tvRedeemContent: {
    width: '100%',
    maxWidth: '100%',
  },
  loginPromptContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    padding: 40,
    backgroundColor: '#1F2937',
    borderRadius: 16,
    margin: 16,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
  },
  loginPromptText: {
    fontSize: 18,
    color: '#9CA3AF',
    marginBottom: 20,
  },
  loginButton: {
    backgroundColor: '#00bb5e',
    paddingHorizontal: 32,
    paddingVertical: 14,
    borderRadius: 12,
    shadowColor: '#00bb5e',
    shadowOffset: {
      width: 0,
      height: 4,
    },
    shadowOpacity: 0.4,
    shadowRadius: 12,
    elevation: 8,
  },
  loginButtonText: {
    color: '#FFFFFF',
    fontSize: 18,
    fontWeight: '600',
  },
  loadingContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    padding: 40,
    backgroundColor: '#1F2937',
    borderRadius: 16,
    margin: 16,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
  },
  loadingText: {
    marginTop: 20,
    fontSize: 16,
    color: '#9CA3AF',
  },
  errorContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    padding: 40,
    backgroundColor: '#1F2937',
    borderRadius: 16,
    margin: 16,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
  },
  errorText: {
    fontSize: 16,
    color: '#EF4444',
    marginBottom: 20,
    textAlign: 'center',
    lineHeight: 24,
  },
  retryButton: {
    backgroundColor: '#00bb5e',
    paddingHorizontal: 32,
    paddingVertical: 14,
    borderRadius: 12,
    shadowColor: '#00bb5e',
    shadowOffset: {
      width: 0,
      height: 4,
    },
    shadowOpacity: 0.4,
    shadowRadius: 12,
    elevation: 8,
  },
  retryButtonText: {
    color: '#FFFFFF',
    fontSize: 18,
    fontWeight: '600',
  },
  cardsContainer: {
    gap: 24,
    flexDirection: 'column',
    justifyContent: 'flex-start',
    alignItems: 'stretch',
    flexWrap: 'wrap',
    paddingHorizontal: 16,
    paddingVertical: 20,
  },
  // 卡片容器样式，根据设备类型调整宽度
  cardWrapper: {
    width: '100%',
  },
});