import AsyncStorage from "@react-native-async-storage/async-storage";
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
  Animated,
} from "react-native";

import { Colors } from "@/constants/Colors";
import { useThemeColor } from "@/hooks/useThemeColor";
import { useAuthStore } from "@/stores/authStore";
import useMembershipStore from "@/stores/membershipStore";
import { useSettingsStore } from "@/stores/settingsStore";

const { width: screenWidth, height: screenHeight } = Dimensions.get('window');

// tvOS design constants
const TVOS_SPACING = 20;
const TVOS_BORDER_RADIUS = 20;
const TVOS_FOCUS_SCALE = 1.08;
const TVOS_CARD_ELEVATION = 10;
const TVOS_SHADOW_OPACITY = 0.4;

const MembershipCenter: React.FC = () => {
  const {
    fetchMembershipInfo,
    fetchUserCoupons,
    redeemCoupon,
    userCoupons,
    isLoadingCoupons,
    membershipInfo,
    isLoadingMembership
  } = useMembershipStore();

  // 根据tierId获取会员等级名称
  const getMembershipLevelName = (tierId: string): string => {
    if (!membershipInfo?.config?.levels) {
      return '普通会员';
    }

    const level = membershipInfo.config.levels.find(level => level.id === tierId);
    return level?.name || '普通会员';
  };

  const { isLoggedIn, autoLogin } = useAuthStore();
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

  // 动画值
  const inputScale = useRef(new Animated.Value(1)).current;
  const redeemButtonScale = useRef(new Animated.Value(1)).current;

  const inputRef = useRef<TextInput>(null);
  const redeemButtonRef = useRef<TouchableOpacity>(null);
  const scrollViewRef = useRef<ScrollView>(null);

  // 获取主题颜色
  const textColor = useThemeColor({}, 'text');
  const grayColor = useThemeColor({}, 'gray');

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

  // 处理焦点动画
  const handleFocus = (animatedValue: Animated.Value) => {
    Animated.spring(animatedValue, {
      toValue: TVOS_FOCUS_SCALE,
      friction: 5,
      tension: 40,
      useNativeDriver: true,
    }).start();
  };

  const handleBlur = (animatedValue: Animated.Value) => {
    Animated.spring(animatedValue, {
      toValue: 1,
      friction: 5,
      tension: 40,
      useNativeDriver: true,
    }).start();
  };

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

  return (
    <View style={styles.container}>
      {/* 顶部用户信息区域 */}
      <View style={styles.userInfoContainer}>
        <View style={styles.userInfoLeft}>
          <View style={styles.avatarContainer}>
            <View style={styles.crownIcon}>
              <Text style={styles.crownText}>👑</Text>
            </View>
          </View>
          <View style={styles.userDetails}>
            <Text style={[styles.userName, { color: textColor }]}>{currentUsername || "王同学"}</Text>
            <View style={styles.membershipBadgeContainer}>
              {isLoadingMembership ? (
                <View style={styles.loadingMembership}>
                  <ActivityIndicator size="small" color="#FFD700" />
                </View>
              ) : membershipInfo?.membership ? (
                <>
                  <View style={styles.membershipBadge}>
                    <Text style={styles.membershipBadgeText}>⭐{getMembershipLevelName(membershipInfo.membership.tierId)}</Text>
                  </View>
                  <Text style={[styles.membershipDays, { color: textColor }]}>
                    剩余 {Math.ceil((membershipInfo.membership.endDate - Date.now()) / (1000 * 60 * 60 * 24))} 天
                  </Text>
                </>
              ) : (
                <View style={styles.noMembership}>
                  <Text style={[styles.noMembershipText, { color: textColor }]}>普通会员</Text>
                </View>
              )}
            </View>
          </View>
        </View>
        <TouchableOpacity style={styles.renewButton}>
          <Text style={styles.renewButtonText}>⭐ 续费会员</Text>
        </TouchableOpacity>
      </View>

      {/* 内容区域 */}
      <ScrollView
        ref={scrollViewRef}
        style={styles.content}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.contentContainer}
      >
        <View style={styles.mainContent}>
          {/* 核心特权 */}
          <View style={styles.privilegesSection}>
            <Text style={[styles.sectionHeader, { color: textColor }]}>核心特权</Text>

            <View style={styles.privilegeCard}>
              <View style={styles.privilegeIcon}>
                <Text style={styles.privilegeIconText}>🎬</Text>
              </View>
              <View style={styles.privilegeInfo}>
                <Text style={[styles.privilegeTitle, { color: textColor }]}>专属4K内容</Text>
                <Text style={[styles.privilegeDesc, { color: grayColor }]}>沉浸式影院级画质 · 杜比全景声</Text>
              </View>
              <Text style={styles.privilegeBadge}>4K</Text>
            </View>

            <View style={styles.privilegeCard}>
              <View style={styles.privilegeIcon}>
                <Text style={styles.privilegeIconText}>⏩</Text>
              </View>
              <View style={styles.privilegeInfo}>
                <Text style={[styles.privilegeTitle, { color: textColor }]}>跳过广告</Text>
                <Text style={[styles.privilegeDesc, { color: grayColor }]}>全站免广告，畅享纯净观影</Text>
              </View>
            </View>

            <View style={styles.privilegeCard}>
              <View style={styles.privilegeIcon}>
                <Text style={styles.privilegeIconText}>📺</Text>
              </View>
              <View style={styles.privilegeInfo}>
                <Text style={[styles.privilegeTitle, { color: textColor }]}>多屏通票</Text>
                <Text style={[styles.privilegeDesc, { color: grayColor }]}>TV/手机/平板 同时在线 · 家庭共享</Text>
              </View>
            </View>
          </View>

          {/* 卡券区域 */}
          <View style={styles.couponsSection}>
            <Text style={[styles.sectionHeader, { color: textColor }]}>我的卡券 (可用券)</Text>

            {isLoadingCoupons ? (
              <View style={styles.loadingContainer}>
                <ActivityIndicator size="large" color="#FFD700" />
                <Text style={[styles.loadingText, { color: textColor }]}>加载中...</Text>
              </View>
            ) : userCoupons.length > 0 ? (
              userCoupons.map((coupon, index) => (
                <View key={index} style={styles.couponCard}>
                  <View style={styles.couponLeft}>
                    <Text style={[styles.couponTitle, { color: textColor }]}>{coupon.type || '卡券'}</Text>
                    <Text style={[styles.couponCode, { color: grayColor }]}>卡券号: {coupon.code}</Text>
                    <Text style={[styles.couponExpiry, { color: grayColor }]}>有效期至 {new Date(coupon.expireTime).toLocaleDateString()}</Text>
                  </View>
                  {coupon.status === 'active' ? (
                    <TouchableOpacity
                      style={styles.couponRedeemButton}
                      onPress={() => {
                        Alert.alert(
                          '兑换卡券',
                          `确定要兑换 ${coupon.type || '卡券'} 吗？`,
                          [
                            { text: '取消', style: 'cancel' },
                            {
                              text: '确定',
                              onPress: async () => {
                                try {
                                  const result = await redeemCoupon(coupon.code);
                                  if (result.success) {
                                    Alert.alert('成功', '卡券兑换成功！');
                                    // 重新获取卡券列表
                                    fetchUserCoupons();
                                  } else {
                                    Alert.alert('失败', result.message || '卡券兑换失败');
                                  }
                                } catch (error) {
                                  Alert.alert('错误', '兑换过程中发生错误');
                                }
                              }
                            }
                          ]
                        );
                      }}
                    >
                      <Text style={styles.couponRedeemButtonText}>兑换</Text>
                    </TouchableOpacity>
                  ) : (
                    <View style={styles.couponStatus}>
                      <Text style={styles.couponStatusText}>{coupon.status === 'used' ? '已使用' : '无效'}</Text>
                    </View>
                  )}
                </View>
              ))
            ) : (
              <View style={styles.emptyContainer}>
                <Text style={[styles.emptyText, { color: textColor }]}>暂无可用卡券</Text>
              </View>
            )}

            {/* 兑换卡券 */}
            <View style={styles.redeemSection}>
              <Text style={[styles.sectionSubHeader, { color: textColor }]}>兑换卡券</Text>
              <TextInput
                ref={inputRef}
                style={[styles.input, { color: textColor }]}
                placeholder="请输入兑换码"
                placeholderTextColor={grayColor}
                value={couponCode}
                onChangeText={setCouponCode}
                autoCapitalize="none"
                autoCorrect={false}
                onFocus={() => {
                  handleFocus(inputScale);
                }}
                onBlur={() => {
                  handleBlur(inputScale);
                }}
              />
              <TouchableOpacity
                ref={redeemButtonRef}
                style={[styles.redeemButton, isRedeeming && styles.redeemButtonDisabled]}
                onPress={handleRedeem}
                disabled={isRedeeming}
                onFocus={() => {
                  handleFocus(redeemButtonScale);
                }}
                onBlur={() => {
                  handleBlur(redeemButtonScale);
                }}
              >
                {isRedeeming ? (
                  <ActivityIndicator color="white" />
                ) : (
                  <Text style={styles.redeemButtonText}>立即兑换</Text>
                )}
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: TVOS_SPACING * 1.2,
    backgroundColor: 'rgba(0, 0, 0, 0.9)'
  },
  content: {
    flex: 1,
    backgroundColor: 'transparent'
  },
  contentContainer: {
    paddingBottom: 40,
    flexGrow: 1,
    paddingTop: 20
  },
  // 顶部用户信息区域
  userInfoContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: TVOS_SPACING,
    borderRadius: TVOS_BORDER_RADIUS,
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    marginBottom: 20,
    borderWidth: 1,
    borderColor: 'rgba(255, 215, 0, 0.3)'
  },
  userInfoLeft: {
    flexDirection: 'row',
    alignItems: 'center'
  },
  avatarContainer: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: '#FFD700',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 20
  },
  crownIcon: {
    alignItems: 'center',
    justifyContent: 'center'
  },
  crownText: {
    fontSize: 40
  },
  userDetails: {
    justifyContent: 'center'
  },
  userName: {
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 8
  },
  membershipBadgeContainer: {
    flexDirection: 'row',
    alignItems: 'center'
  },
  membershipBadge: {
    backgroundColor: '#FFD700',
    paddingHorizontal: 15,
    paddingVertical: 5,
    borderRadius: 15,
    marginRight: 15
  },
  membershipBadgeText: {
    color: '#000',
    fontSize: 14,
    fontWeight: '700'
  },
  membershipDays: {
    fontSize: 16
  },
  loadingMembership: {
    paddingHorizontal: 15,
    paddingVertical: 5
  },
  noMembership: {
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    paddingHorizontal: 15,
    paddingVertical: 5,
    borderRadius: 15
  },
  noMembershipText: {
    fontSize: 14,
    fontWeight: '700'
  },
  renewButton: {
    backgroundColor: '#FF6B00',
    paddingHorizontal: 25,
    paddingVertical: 12,
    borderRadius: TVOS_BORDER_RADIUS,
    shadowColor: '#FF6B00',
    shadowOffset: {
      width: 0,
      height: 4
    },
    shadowOpacity: TVOS_SHADOW_OPACITY,
    shadowRadius: 8,
    elevation: TVOS_CARD_ELEVATION
  },
  renewButtonText: {
    color: 'white',
    fontSize: 18,
    fontWeight: '700'
  },
  // 主内容区域
  mainContent: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    width: '100%'
  },
  // 核心特权区域
  privilegesSection: {
    width: '48%',
    padding: TVOS_SPACING,
    borderRadius: TVOS_BORDER_RADIUS,
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    borderLeftWidth: 4,
    borderLeftColor: '#FFD700'
  },
  sectionHeader: {
    fontSize: 22,
    fontWeight: 'bold',
    marginBottom: 20,
    letterSpacing: 0.8
  },
  privilegeCard: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: TVOS_SPACING * 0.8,
    borderRadius: TVOS_BORDER_RADIUS,
    backgroundColor: 'rgba(255, 255, 255, 0.08)',
    marginBottom: 15,
    borderWidth: 1,
    borderColor: 'rgba(255, 215, 0, 0.2)'
  },
  privilegeIcon: {
    width: 50,
    height: 50,
    borderRadius: 25,
    backgroundColor: 'rgba(255, 215, 0, 0.2)',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 15
  },
  privilegeIconText: {
    fontSize: 20
  },
  privilegeInfo: {
    flex: 1
  },
  privilegeTitle: {
    fontSize: 18,
    fontWeight: '600',
    marginBottom: 5
  },
  privilegeDesc: {
    fontSize: 14,
    lineHeight: 20
  },
  privilegeBadge: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#FFD700'
  },
  // 卡券区域
  couponsSection: {
    width: '48%',
    padding: TVOS_SPACING,
    borderRadius: TVOS_BORDER_RADIUS,
    backgroundColor: 'rgba(255, 255, 255, 0.05)'
  },
  couponCard: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: TVOS_SPACING * 0.8,
    borderRadius: TVOS_BORDER_RADIUS,
    backgroundColor: 'rgba(255, 255, 255, 0.08)',
    marginBottom: 15,
    borderWidth: 1,
    borderColor: 'rgba(255, 215, 0, 0.2)'
  },
  couponLeft: {
    flex: 1
  },
  couponTitle: {
    fontSize: 18,
    fontWeight: '600',
    marginBottom: 5
  },
  couponCode: {
    fontSize: 14,
    marginBottom: 5
  },
  couponExpiry: {
    fontSize: 14
  },
  couponStatus: {
    backgroundColor: 'rgba(52, 199, 89, 0.8)',
    paddingHorizontal: 15,
    paddingVertical: 5,
    borderRadius: 15
  },
  couponStatusText: {
    color: 'white',
    fontSize: 14,
    fontWeight: '700'
  },
  couponRedeemButton: {
    backgroundColor: '#FF6B00',
    paddingHorizontal: 15,
    paddingVertical: 5,
    borderRadius: 15
  },
  couponRedeemButtonText: {
    color: 'white',
    fontSize: 14,
    fontWeight: '700'
  },
  // 兑换卡券区域
  redeemSection: {
    marginTop: 20,
    padding: TVOS_SPACING,
    borderRadius: TVOS_BORDER_RADIUS,
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    borderWidth: 1,
    borderColor: 'rgba(255, 215, 0, 0.2)'
  },
  sectionSubHeader: {
    fontSize: 20,
    fontWeight: '700',
    marginBottom: 20,
    letterSpacing: 0.8
  },
  input: {
    borderWidth: 2,
    borderColor: 'rgba(255, 255, 255, 0.2)',
    borderRadius: TVOS_BORDER_RADIUS,
    padding: 16,
    fontSize: 18,
    marginBottom: 20,
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    minHeight: 80
  },
  redeemButton: {
    backgroundColor: '#FF6B00',
    padding: 16,
    borderRadius: TVOS_BORDER_RADIUS,
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 70,
    shadowColor: '#FF6B00',
    shadowOffset: {
      width: 0,
      height: 4
    },
    shadowOpacity: TVOS_SHADOW_OPACITY,
    shadowRadius: 8,
    elevation: TVOS_CARD_ELEVATION
  },
  redeemButtonText: {
    color: 'white',
    fontSize: 18,
    fontWeight: '700',
    letterSpacing: 0.8
  },
  redeemButtonDisabled: {
    opacity: 0.6
  },
  loadingContainer: {
    padding: 40,
    alignItems: 'center'
  },
  loadingText: {
    marginTop: 20,
    fontSize: 16,
    letterSpacing: 0.5
  },
  errorContainer: {
    padding: 30,
    alignItems: 'center'
  },
  errorText: {
    color: Colors.error,
    fontSize: 18,
    textAlign: 'center',
    letterSpacing: 0.5
  },
  emptyContainer: {
    padding: 40,
    alignItems: 'center'
  },
  emptyText: {
    fontSize: 18,
    textAlign: 'center',
    letterSpacing: 0.5
  }
});

export default MembershipCenter;
