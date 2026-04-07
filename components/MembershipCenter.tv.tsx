import React, { useEffect, useState, useRef } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TextInput,
  TouchableOpacity,
  Alert,
  ActivityIndicator,
  Dimensions,
  Platform,
} from "react-native";
import useMembershipStore from "@/stores/membershipStore";
import { useAuthStore } from "@/stores/authStore";
import { useSettingsStore } from "@/stores/settingsStore";
import { ThemedView } from "./ThemedView";
import { Colors } from "@/constants/Colors";
import { useThemeColor } from "@/hooks/useThemeColor";
import AsyncStorage from "@react-native-async-storage/async-storage";

const { width: screenWidth, height: screenHeight } = Dimensions.get('window');

// tvOS design constants
const TVOS_SPACING = screenWidth * 0.04;
const TVOS_BORDER_RADIUS = 12;
const TVOS_FOCUS_SCALE = 1.05;
const TVOS_FOCUS_BORDER_WIDTH = 3;
const TVOS_FOCUS_ANIMATION_DURATION = 200;

const MembershipCenter: React.FC = () => {
  const { 
    membershipInfo, 
    isLoadingMembership, 
    membershipError, 
    fetchMembershipInfo,
    userCoupons, 
    isLoadingCoupons, 
    couponsError, 
    fetchUserCoupons, 
    redeemCoupon 
  } = useMembershipStore();
  
  const { isLoggedIn, autoLogin, isLoading: isAuthLoading } = useAuthStore();
  const { serverConfig } = useSettingsStore();
  
  // 获取当前登录用户的用户名
  const [currentUsername, setCurrentUsername] = useState<string>('');
  
  useEffect(() => {
    const getUsername = async () => {
      try {
        const credentialsStr = await AsyncStorage.getItem("mytv_login_credentials");
        if (credentialsStr) {
          const credentials = JSON.parse(credentialsStr);
          setCurrentUsername(credentials.username);
        }
      } catch (error) {
        console.error('Failed to get username:', error);
      }
    };
    
    getUsername();
  }, [isLoggedIn]);
  
  const [couponCode, setCouponCode] = useState("");
  const [isRedeeming, setIsRedeeming] = useState(false);
  const [selectedTab, setSelectedTab] = useState<'membership' | 'coupons'>('membership');
  const [focusedElement, setFocusedElement] = useState<string | null>('membership');
  
  const membershipRef = useRef<TouchableOpacity>(null);
  const couponsRef = useRef<TouchableOpacity>(null);
  const inputRef = useRef<TextInput>(null);
  const redeemButtonRef = useRef<TouchableOpacity>(null);
  const scrollViewRef = useRef<ScrollView>(null);
  
  // 获取主题颜色
  const textColor = useThemeColor({}, 'text');
  const grayColor = useThemeColor({}, 'gray');
  const borderColor = useThemeColor({}, 'border');

  useEffect(() => {
    const initMembership = async () => {
      // 确保用户已登录
      if (!isLoggedIn) {
        await autoLogin();
      }
      // 检查服务器是否启用了会员系统
      // 适配 LunaTV 服务器 - 如果没有 ApiConfig 字段，默认启用会员系统
      const isMembershipEnabled = serverConfig?.ApiConfig?.EnableMembership || serverConfig?.MembershipConfig?.Enable || !serverConfig?.ApiConfig;
      if (isMembershipEnabled) {
        // 登录后获取会员信息和卡券
        fetchMembershipInfo();
        fetchUserCoupons();
      }
    };
    
    initMembership();
  }, [isLoggedIn, autoLogin, serverConfig, fetchMembershipInfo, fetchUserCoupons]);

  // 处理遥控器导航
  const handleKeyDown = (event: any) => {
    const { keyCode } = event.nativeEvent;
    
    switch (keyCode) {
      case 37: // 左箭头
        if (selectedTab === 'coupons' && focusedElement === 'redeem') {
          setFocusedElement('input');
          inputRef.current?.focus();
        } else if (focusedElement === 'coupons') {
          setFocusedElement('membership');
          membershipRef.current?.focus();
        }
        break;
      case 39: // 右箭头
        if (selectedTab === 'coupons' && focusedElement === 'input') {
          setFocusedElement('redeem');
          redeemButtonRef.current?.focus();
        } else if (focusedElement === 'membership') {
          setFocusedElement('coupons');
          couponsRef.current?.focus();
        }
        break;
      case 40: // 下箭头
        if (selectedTab === 'coupons' && (focusedElement === 'membership' || focusedElement === 'coupons')) {
          setFocusedElement('input');
          inputRef.current?.focus();
        }
        break;
      case 38: // 上箭头
        if (selectedTab === 'coupons' && (focusedElement === 'input' || focusedElement === 'redeem')) {
          setFocusedElement(selectedTab === 'membership' ? 'membership' : 'coupons');
          if (selectedTab === 'membership') {
            membershipRef.current?.focus();
          } else {
            couponsRef.current?.focus();
          }
        }
        break;
    }
  };
  
  // 初始焦点设置
  useEffect(() => {
    setTimeout(() => {
      membershipRef.current?.focus();
    }, 100);
  }, []);
  
  // 标签切换时重置焦点
  useEffect(() => {
    if (selectedTab === 'membership') {
      setFocusedElement('membership');
      membershipRef.current?.focus();
    } else {
      setFocusedElement('input');
      inputRef.current?.focus();
    }
  }, [selectedTab]);

  const handleRedeem = async () => {
    if (!couponCode.trim()) {
      Alert.alert("提示", "请输入卡券码");
      return;
    }

    setIsRedeeming(true);
    try {
      const result = await redeemCoupon(couponCode.trim());
      if (result.success) {
        Alert.alert("成功", result.message || "卡券兑换成功");
        setCouponCode("");
      } else {
        Alert.alert("失败", result.message || "卡券兑换失败");
      }
    } catch (error) {
      Alert.alert("错误", error instanceof Error ? error.message : "兑换过程中出现错误");
    } finally {
      setIsRedeeming(false);
    }
  };

  const formatDate = (timestamp: number) => {
    if (!timestamp) return "无";
    const date = new Date(timestamp);
    return date.toLocaleDateString("zh-CN", {
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
    });
  };

  const getStatusColor = (status: string, isExpired?: boolean) => {
    if (isExpired) return Colors.error;
    switch (status) {
      case "active":
        return Colors.success;
      case "used":
        return Colors.gray;
      case "expired":
        return Colors.error;
      default:
        return Colors.gray;
    }
  };

  const getStatusText = (status: string, isExpired?: boolean) => {
    if (isExpired) return "已过期";
    switch (status) {
      case "active":
        return "未使用";
      case "used":
        return "已使用";
      case "expired":
        return "已过期";
      default:
        return "未知";
    }
  };

  const renderMembershipInfo = () => {
    // 检查服务器是否启用了会员系统
    // 适配 LunaTV 服务器 - 如果没有 ApiConfig 字段，默认启用会员系统
    const isMembershipEnabled = serverConfig?.ApiConfig?.EnableMembership || serverConfig?.MembershipConfig?.Enable || !serverConfig?.ApiConfig;
    
    if (!isMembershipEnabled) {
      return (
        <ThemedView style={styles.errorContainer}>
          <Text style={[styles.errorText, { color: textColor }]}>会员系统暂未启用</Text>
        </ThemedView>
      );
    }

    if (isLoadingMembership) {
      return (
        <ThemedView style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={Colors.success} />
          <Text style={[styles.loadingText, { color: textColor }]}>加载会员信息中...</Text>
        </ThemedView>
      );
    }

    if (membershipError) {
      return (
        <ThemedView style={styles.errorContainer}>
          <Text style={[styles.errorText, { color: textColor }]}>{membershipError}</Text>
        </ThemedView>
      );
    }

    if (!membershipInfo || !membershipInfo.membership) {
      return (
        <ThemedView style={styles.emptyContainer}>
          <Text style={[styles.emptyText, { color: textColor }]}>暂无会员信息</Text>
        </ThemedView>
      );
    }

    const { membership, config } = membershipInfo;
    // 添加日志，查看membership对象的具体内容
    console.log('Membership object:', membership);
    console.log('Config:', config);
    
    const currentTier = config?.levels?.find((tier) => tier.name === membership.tierId || tier.id === membership.tierId) || {
      displayName: membership.tierName || (membership.tierId === "0" || !membership.tierId ? '普通用户' : 
                  membership.tierId === "1" ? '高级会员' : 
                  membership.tierId === "2" ? 'VIP会员' : 
                  membership.tierId === "3" ? '超级会员' : membership.tierId),
      features: [],
    };
    
    // 添加日志，查看currentTier的具体内容
    console.log('Current tier:', currentTier);

    return (
      <ThemedView style={styles.membershipCard}>
        <Text style={[styles.membershipTitle, { color: textColor }]}>会员信息</Text>
        
        <View style={styles.membershipHeader}>
          <Text style={[styles.tierName, { color: textColor }]}>{currentTier.displayName}</Text>
          <Text style={[styles.statusText, { color: membership.status === "active" ? Colors.success : Colors.error }]}>
            {membership.status === "active" ? "活跃" : "已过期"}
          </Text>
        </View>
        
        <View style={[styles.infoGrid, { marginBottom: 16 }]}>
          <ThemedView style={styles.infoItem}>
            <Text style={[styles.infoLabel, { color: grayColor }]}>用户名</Text>
            <Text style={[styles.infoValue, { color: textColor }]}>{currentUsername || "未知"}</Text>
          </ThemedView>
        </View>

        <View style={styles.infoGrid}>
          <ThemedView style={styles.infoItem}>
            <Text style={[styles.infoLabel, { color: grayColor }]}>有效期至</Text>
            <Text style={[styles.infoValue, { color: membership.status === "active" ? Colors.success : Colors.error }]}>
              {formatDate(membership.endDate || 0)}
            </Text>
          </ThemedView>
          
          <ThemedView style={styles.infoItem}>
            <Text style={[styles.infoLabel, { color: grayColor }]}>自动续费</Text>
            <Text style={[styles.infoValue, { color: textColor }]}>{membership.autoRenew ? "开启" : "关闭"}</Text>
          </ThemedView>
        </View>

        {currentTier.features && currentTier.features.length > 0 && (
          <ThemedView style={styles.featuresSection}>
            <Text style={[styles.featuresTitle, { color: textColor }]}>会员特权</Text>
            <View style={styles.featuresGrid}>
              {currentTier.features.map((feature, index) => (
                <ThemedView key={index} style={styles.featureItem}>
                  <Text style={[styles.featureText, { color: textColor }]}>• {feature}</Text>
                </ThemedView>
              ))}
            </View>
          </ThemedView>
        )}
      </ThemedView>
    );
  };

  const renderCouponManager = () => {
    // 检查服务器是否启用了卡券系统
    // 适配 LunaTV 服务器 - 如果没有 ApiConfig 字段，默认启用卡券系统
    const isCouponEnabled = serverConfig?.ApiConfig?.EnableCoupon || !serverConfig?.ApiConfig;
    
    if (!isCouponEnabled) {
      return (
        <ThemedView style={styles.errorContainer}>
          <Text style={[styles.errorText, { color: textColor }]}>卡券系统暂未启用</Text>
        </ThemedView>
      );
    }

    if (isLoadingCoupons) {
      return (
        <ThemedView style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={Colors.success} />
          <Text style={[styles.loadingText, { color: textColor }]}>加载卡券列表中...</Text>
        </ThemedView>
      );
    }

    if (couponsError) {
      return (
        <ThemedView style={styles.errorContainer}>
          <Text style={[styles.errorText, { color: textColor }]}>{couponsError}</Text>
        </ThemedView>
      );
    }

    return (
      <View style={styles.couponContainer}>
        {/* 卡券兑换 */}
        <ThemedView style={styles.redeemSection}>
          <Text style={[styles.sectionTitle, { color: textColor }]}>兑换卡券</Text>
          <TextInput
            ref={inputRef}
            style={[styles.input, focusedElement === 'input' && styles.inputFocused, { color: textColor }]}
            placeholder="请输入卡券码"
            placeholderTextColor={grayColor}
            value={couponCode}
            onChangeText={setCouponCode}
            autoCapitalize="none"
            autoCorrect={false}
            onFocus={() => setFocusedElement('input')}
            onBlur={() => setFocusedElement(null)}
          />
          <TouchableOpacity
            ref={redeemButtonRef}
            style={[
              styles.redeemButton, 
              isRedeeming && styles.redeemButtonDisabled,
              focusedElement === 'redeem' && styles.buttonFocused
            ]}
            onPress={handleRedeem}
            disabled={isRedeeming}
            onFocus={() => setFocusedElement('redeem')}
            onBlur={() => setFocusedElement(null)}
          >
            {isRedeeming ? (
              <ActivityIndicator color="white" />
            ) : (
              <Text style={styles.redeemButtonText}>立即兑换</Text>
            )}
          </TouchableOpacity>
        </ThemedView>

        {/* 卡券列表 */}
        <ThemedView style={styles.listSection}>
          <Text style={[styles.sectionTitle, { color: textColor }]}>我的卡券</Text>
          
          {isLoadingCoupons ? (
            <View style={styles.loadingContainer}>
              <ActivityIndicator size="large" color={Colors.success} />
            </View>
          ) : couponsError ? (
            <Text style={[styles.errorText, { color: textColor }]}>{couponsError}</Text>
          ) : userCoupons.length === 0 ? (
            <Text style={[styles.emptyText, { color: textColor }]}>暂无卡券</Text>
          ) : (
            <View style={styles.couponList}>
              {userCoupons.map((coupon, index) => (
                <ThemedView key={index} style={styles.couponCard}>
                  <View style={[styles.couponHeader, { borderBottomColor: borderColor }]}>
                    <Text style={[styles.couponCode, { color: textColor }]}>卡券码：{coupon.code}</Text>
                    <Text style={[styles.couponStatus, { color: getStatusColor(coupon.status, coupon.isExpired) }]}>
                      {getStatusText(coupon.status, coupon.isExpired)}
                    </Text>
                  </View>
                  
                  <View style={styles.couponInfo}>
                    <Text style={[styles.couponType, { color: textColor }]}>类型：{coupon.type || "会员卡"}</Text>
                    <Text style={[styles.couponTier, { color: textColor }]}>等级：{coupon.tier}</Text>
                    <Text style={[styles.couponDuration, { color: textColor }]}>有效期：{coupon.durationDays} 天</Text>
                  </View>
                  
                  <View style={[styles.couponFooter, { borderTopColor: borderColor }]}>
                    <Text style={[styles.couponDate, { color: textColor }]}>创建时间：{formatDate(coupon.createdAt)}</Text>
                    {coupon.redeemedAt && (
                      <Text style={[styles.couponRedeemed, { color: textColor }]}>使用时间：{formatDate(coupon.redeemedAt)}</Text>
                    )}
                    {coupon.expireTime && (
                      <Text style={[styles.couponExpire, { color: getStatusColor(coupon.status, coupon.isExpired) }]}>
                        过期时间：{formatDate(coupon.expireTime)}
                      </Text>
                    )}
                  </View>
                </ThemedView>
              ))}
            </View>
          )}
        </ThemedView>
      </View>
    );
  };

  return (
    <View style={styles.container} onKeyDown={handleKeyDown}>
      {/* 标签切换 */}
      <View style={[styles.tabContainer, { borderColor: borderColor }]}>
        <TouchableOpacity
          ref={membershipRef}
          style={[
            styles.tabButton, 
            selectedTab === 'membership' && styles.tabButtonActive,
            focusedElement === 'membership' && styles.tabButtonFocused
          ]}
          onPress={() => setSelectedTab('membership')}
          onFocus={() => setFocusedElement('membership')}
          onBlur={() => {}}
          accessible={true}
          accessibilityLabel="会员信息"
        >
          <Text style={[
            styles.tabText, 
            selectedTab === 'membership' && styles.tabTextActive,
            { color: selectedTab === 'membership' ? '#FFFFFF' : textColor }
          ]}>会员信息</Text>
        </TouchableOpacity>
        
        <TouchableOpacity
          ref={couponsRef}
          style={[
            styles.tabButton, 
            selectedTab === 'coupons' && styles.tabButtonActive,
            focusedElement === 'coupons' && styles.tabButtonFocused
          ]}
          onPress={() => setSelectedTab('coupons')}
          onFocus={() => setFocusedElement('coupons')}
          onBlur={() => {}}
          accessible={true}
          accessibilityLabel="卡券管理"
        >
          <Text style={[
            styles.tabText, 
            selectedTab === 'coupons' && styles.tabTextActive,
            { color: selectedTab === 'coupons' ? '#FFFFFF' : textColor }
          ]}>卡券管理</Text>
        </TouchableOpacity>
      </View>

      {/* 内容区域 */}
      <ScrollView 
        ref={scrollViewRef}
        style={styles.content} 
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.contentContainer}
      >
        {selectedTab === 'membership' ? renderMembershipInfo() : renderCouponManager()}
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: TVOS_SPACING,
  },
  tabContainer: {
    flexDirection: 'row',
    marginBottom: screenHeight * 0.03,
    borderRadius: TVOS_BORDER_RADIUS,
    overflow: 'hidden',
    borderWidth: 2,
    borderColor: Colors.success,
    maxWidth: screenWidth * 0.7,
    alignSelf: 'center',
  },
  tabButton: {
    flex: 1,
    paddingVertical: screenHeight * 0.025,
    paddingHorizontal: screenWidth * 0.05,
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 60,
  },
  tabButtonActive: {
    backgroundColor: Colors.success,
  },
  tabButtonFocused: {
    borderWidth: TVOS_FOCUS_BORDER_WIDTH,
    borderColor: Colors.success,
    transform: [{ scale: TVOS_FOCUS_SCALE }],
  },
  tabText: {
    fontSize: screenWidth * 0.03,
    fontWeight: '600',
    letterSpacing: 0.5,
  },
  tabTextActive: {
    color: '#FFFFFF',
  },
  content: {
    flex: 1,
  },
  contentContainer: {
    paddingBottom: screenHeight * 0.05,
  },
  membershipCard: {
    padding: TVOS_SPACING,
    borderRadius: TVOS_BORDER_RADIUS,
    borderWidth: 2,
    borderColor: Colors.success,
    backgroundColor: 'rgba(52, 199, 89, 0.05)',
    marginBottom: screenHeight * 0.03,
  },
  membershipTitle: {
    fontSize: screenWidth * 0.04,
    fontWeight: 'bold',
    marginBottom: screenHeight * 0.03,
    textAlign: 'center',
    letterSpacing: 1,
  },
  membershipHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: screenHeight * 0.04,
    paddingBottom: screenHeight * 0.02,
    borderBottomWidth: 2,
    borderBottomColor: Colors.success,
  },
  tierName: {
    fontSize: screenWidth * 0.045,
    fontWeight: 'bold',
    letterSpacing: 0.5,
  },
  statusText: {
    fontSize: screenWidth * 0.03,
    fontWeight: '700',
    paddingHorizontal: screenWidth * 0.03,
    paddingVertical: screenHeight * 0.015,
    borderRadius: 10,
    backgroundColor: 'rgba(0, 122, 255, 0.1)',
  },
  infoGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    marginBottom: screenHeight * 0.04,
  },
  infoItem: {
    width: '48%',
    marginBottom: screenHeight * 0.03,
    padding: TVOS_SPACING,
    borderRadius: TVOS_BORDER_RADIUS,
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
  },
  infoLabel: {
    fontSize: screenWidth * 0.028,
    marginBottom: screenHeight * 0.01,
    color: Colors.gray,
    letterSpacing: 0.3,
  },
  infoValue: {
    fontSize: screenWidth * 0.035,
    fontWeight: '600',
    letterSpacing: 0.3,
  },
  featuresSection: {
    marginTop: screenHeight * 0.03,
  },
  featuresTitle: {
    fontSize: screenWidth * 0.035,
    fontWeight: '700',
    marginBottom: screenHeight * 0.02,
    paddingBottom: screenHeight * 0.015,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
    letterSpacing: 0.5,
  },
  featuresGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
  },
  featureItem: {
    width: '48%',
    marginBottom: screenHeight * 0.02,
    padding: TVOS_SPACING,
    borderRadius: TVOS_BORDER_RADIUS,
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
  },
  featureText: {
    fontSize: screenWidth * 0.03,
    letterSpacing: 0.3,
  },
  couponContainer: {
    width: '100%',
  },
  redeemSection: {
    padding: TVOS_SPACING,
    borderRadius: TVOS_BORDER_RADIUS,
    marginBottom: screenHeight * 0.03,
    borderWidth: 2,
    borderColor: Colors.success,
    backgroundColor: 'rgba(0, 122, 255, 0.05)',
  },
  listSection: {
    padding: TVOS_SPACING,
    borderRadius: TVOS_BORDER_RADIUS,
    borderWidth: 2,
    borderColor: Colors.success,
    backgroundColor: 'rgba(0, 122, 255, 0.05)',
  },
  sectionTitle: {
    fontSize: screenWidth * 0.04,
    fontWeight: 'bold',
    marginBottom: screenHeight * 0.03,
    textAlign: 'center',
    letterSpacing: 1,
  },
  input: {
    borderWidth: 2,
    borderColor: Colors.border,
    borderRadius: TVOS_BORDER_RADIUS,
    padding: screenWidth * 0.035,
    fontSize: screenWidth * 0.035,
    marginBottom: screenHeight * 0.03,
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    minHeight: 60,
  },
  inputFocused: {
    borderColor: Colors.success,
    borderWidth: TVOS_FOCUS_BORDER_WIDTH,
    transform: [{ scale: TVOS_FOCUS_SCALE }],
  },
  redeemButton: {
    backgroundColor: Colors.success,
    padding: screenWidth * 0.035,
    borderRadius: TVOS_BORDER_RADIUS,
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 60,
  },
  redeemButtonDisabled: {
    opacity: 0.6,
  },
  buttonFocused: {
    borderWidth: TVOS_FOCUS_BORDER_WIDTH,
    borderColor: Colors.success,
    transform: [{ scale: TVOS_FOCUS_SCALE }],
  },
  redeemButtonText: {
    color: 'white',
    fontSize: screenWidth * 0.035,
    fontWeight: '700',
    letterSpacing: 0.5,
  },
  loadingContainer: {
    padding: screenHeight * 0.08,
    alignItems: 'center',
  },
  loadingText: {
    marginTop: screenHeight * 0.02,
    fontSize: screenWidth * 0.03,
    letterSpacing: 0.3,
  },
  errorContainer: {
    padding: screenHeight * 0.05,
    alignItems: 'center',
  },
  errorText: {
    color: Colors.error,
    fontSize: screenWidth * 0.035,
    textAlign: 'center',
    letterSpacing: 0.3,
  },
  emptyContainer: {
    padding: screenHeight * 0.08,
    alignItems: 'center',
  },
  emptyText: {
    fontSize: screenWidth * 0.035,
    textAlign: 'center',
    letterSpacing: 0.3,
  },
  couponList: {
    width: '100%',
  },
  couponCard: {
    padding: TVOS_SPACING,
    borderRadius: TVOS_BORDER_RADIUS,
    marginBottom: screenHeight * 0.03,
    borderWidth: 1,
    borderColor: Colors.success,
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
  },
  couponHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: screenHeight * 0.02,
    paddingBottom: screenHeight * 0.015,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
  },
  couponCode: {
    fontSize: screenWidth * 0.035,
    fontWeight: '600',
    letterSpacing: 0.3,
  },
  couponStatus: {
    fontSize: screenWidth * 0.03,
    fontWeight: '700',
    paddingHorizontal: screenWidth * 0.025,
    paddingVertical: screenHeight * 0.01,
    borderRadius: 8,
    backgroundColor: 'rgba(0, 122, 255, 0.1)',
  },
  couponInfo: {
    marginBottom: screenHeight * 0.02,
  },
  couponType: {
    fontSize: screenWidth * 0.03,
    marginBottom: screenHeight * 0.01,
    letterSpacing: 0.3,
  },
  couponTier: {
    fontSize: screenWidth * 0.03,
    marginBottom: screenHeight * 0.01,
    letterSpacing: 0.3,
  },
  couponDuration: {
    fontSize: screenWidth * 0.03,
    letterSpacing: 0.3,
  },
  couponFooter: {
    borderTopWidth: 1,
    borderTopColor: Colors.border,
    paddingTop: screenHeight * 0.02,
  },
  couponDate: {
    fontSize: screenWidth * 0.028,
    marginBottom: screenHeight * 0.01,
    letterSpacing: 0.2,
  },
  couponRedeemed: {
    fontSize: screenWidth * 0.028,
    marginBottom: screenHeight * 0.01,
    letterSpacing: 0.2,
  },
  couponExpire: {
    fontSize: screenWidth * 0.028,
    letterSpacing: 0.2,
  },
});

export default MembershipCenter;