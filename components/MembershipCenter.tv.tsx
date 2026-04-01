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
} from "react-native";
import useMembershipStore from "@/stores/membershipStore";
import { ThemedView } from "./ThemedView";
import { Colors } from "@/constants/Colors";
import { useThemeColor } from "@/hooks/useThemeColor";

const { width: screenWidth, height: screenHeight } = Dimensions.get('window');

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
    fetchMembershipInfo();
    fetchUserCoupons();
  }, []);

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
    const currentTier = config?.tiers?.find((tier) => tier.name === membership.tierId) || {
      displayName: membership.tierId || '未知',
      features: [],
    };

    return (
      <ThemedView style={styles.membershipCard}>
        <Text style={[styles.membershipTitle, { color: textColor }]}>会员信息</Text>
        
        <View style={styles.membershipHeader}>
          <Text style={[styles.tierName, { color: textColor }]}>{currentTier.displayName}</Text>
          <Text style={[styles.statusText, { color: membership.status === "active" ? Colors.success : Colors.error }]}>
            {membership.status === "active" ? "活跃" : "已过期"}
          </Text>
        </View>

        <View style={styles.infoGrid}>
          <ThemedView style={styles.infoItem}>
            <Text style={[styles.infoLabel, { color: grayColor }]}>开始日期</Text>
            <Text style={[styles.infoValue, { color: textColor }]}>{formatDate(membership.startDate || 0)}</Text>
          </ThemedView>
          
          <ThemedView style={styles.infoItem}>
            <Text style={[styles.infoLabel, { color: grayColor }]}>到期日期</Text>
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
    padding: screenWidth * 0.03,
  },
  tabContainer: {
    flexDirection: 'row',
    marginBottom: screenHeight * 0.02,
    borderRadius: 10,
    overflow: 'hidden',
    borderWidth: 2,
    borderColor: Colors.success,
    maxWidth: screenWidth * 0.6,
    alignSelf: 'center',
  },
  tabButton: {
    flex: 1,
    paddingVertical: screenHeight * 0.015,
    alignItems: 'center',
    justifyContent: 'center',
  },
  tabButtonActive: {
    backgroundColor: Colors.success,
  },
  tabButtonFocused: {
    borderWidth: 3,
    borderColor: Colors.success,
  },
  tabText: {
    fontSize: screenWidth * 0.022,
    fontWeight: '500',
  },
  tabTextActive: {
    color: '#FFFFFF',
  },
  content: {
    flex: 1,
  },
  contentContainer: {
    paddingBottom: screenHeight * 0.03,
  },
  membershipCard: {
    padding: screenWidth * 0.03,
    borderRadius: 16,
    borderWidth: 2,
    borderColor: Colors.success,
    backgroundColor: 'rgba(52, 199, 89, 0.05)',
  },
  membershipTitle: {
    fontSize: screenWidth * 0.03,
    fontWeight: 'bold',
    marginBottom: screenHeight * 0.02,
    textAlign: 'center',
  },
  membershipHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: screenHeight * 0.03,
    paddingBottom: screenHeight * 0.01,
    borderBottomWidth: 2,
    borderBottomColor: Colors.success,
  },
  tierName: {
    fontSize: screenWidth * 0.035,
    fontWeight: 'bold',
  },
  statusText: {
    fontSize: screenWidth * 0.025,
    fontWeight: '600',
    paddingHorizontal: screenWidth * 0.015,
    paddingVertical: screenHeight * 0.008,
    borderRadius: 8,
    backgroundColor: 'rgba(0, 122, 255, 0.1)',
  },
  infoGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    marginBottom: screenHeight * 0.03,
  },
  infoItem: {
    width: '31%',
    marginBottom: screenHeight * 0.02,
    padding: screenWidth * 0.02,
    borderRadius: 8,
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
  },
  infoLabel: {
    fontSize: screenWidth * 0.022,
    marginBottom: screenHeight * 0.005,
    color: Colors.gray,
  },
  infoValue: {
    fontSize: screenWidth * 0.025,
    fontWeight: '600',
  },
  featuresSection: {
    marginTop: screenHeight * 0.02,
  },
  featuresTitle: {
    fontSize: screenWidth * 0.025,
    fontWeight: '600',
    marginBottom: screenHeight * 0.015,
    paddingBottom: screenHeight * 0.01,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
  },
  featuresGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
  },
  featureItem: {
    width: '31%',
    marginBottom: screenHeight * 0.015,
    padding: screenWidth * 0.02,
    borderRadius: 6,
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
  },
  featureText: {
    fontSize: screenWidth * 0.022,
  },
  couponContainer: {
    width: '100%',
  },
  redeemSection: {
    padding: screenWidth * 0.03,
    borderRadius: 16,
    marginBottom: screenHeight * 0.02,
    borderWidth: 2,
    borderColor: Colors.success,
    backgroundColor: 'rgba(0, 122, 255, 0.05)',
  },
  listSection: {
    padding: screenWidth * 0.03,
    borderRadius: 16,
    borderWidth: 2,
    borderColor: Colors.success,
    backgroundColor: 'rgba(0, 122, 255, 0.05)',
  },
  sectionTitle: {
    fontSize: screenWidth * 0.03,
    fontWeight: 'bold',
    marginBottom: screenHeight * 0.02,
    textAlign: 'center',
  },
  input: {
    borderWidth: 2,
    borderColor: Colors.border,
    borderRadius: 8,
    padding: screenWidth * 0.025,
    fontSize: screenWidth * 0.025,
    marginBottom: screenHeight * 0.02,
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
  },
  inputFocused: {
    borderColor: Colors.success,
    borderWidth: 3,
  },
  redeemButton: {
    backgroundColor: Colors.success,
    padding: screenWidth * 0.025,
    borderRadius: 8,
    alignItems: 'center',
  },
  redeemButtonDisabled: {
    opacity: 0.6,
  },
  buttonFocused: {
    borderWidth: 3,
    borderColor: Colors.success,
  },
  redeemButtonText: {
    color: 'white',
    fontSize: screenWidth * 0.025,
    fontWeight: '600',
  },
  loadingContainer: {
    padding: screenHeight * 0.05,
    alignItems: 'center',
  },
  loadingText: {
    marginTop: screenHeight * 0.01,
    fontSize: screenWidth * 0.022,
  },
  errorContainer: {
    padding: screenHeight * 0.03,
    alignItems: 'center',
  },
  errorText: {
    color: Colors.error,
    fontSize: screenWidth * 0.025,
    textAlign: 'center',
  },
  emptyContainer: {
    padding: screenHeight * 0.05,
    alignItems: 'center',
  },
  emptyText: {
    fontSize: screenWidth * 0.025,
    textAlign: 'center',
  },
  couponList: {
    width: '100%',
  },
  couponCard: {
    padding: screenWidth * 0.03,
    borderRadius: 12,
    marginBottom: screenHeight * 0.02,
    borderWidth: 1,
    borderColor: Colors.success,
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
  },
  couponHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: screenHeight * 0.015,
    paddingBottom: screenHeight * 0.01,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
  },
  couponCode: {
    fontSize: screenWidth * 0.025,
    fontWeight: '600',
  },
  couponStatus: {
    fontSize: screenWidth * 0.022,
    fontWeight: '600',
    paddingHorizontal: screenWidth * 0.015,
    paddingVertical: screenHeight * 0.005,
    borderRadius: 6,
    backgroundColor: 'rgba(0, 122, 255, 0.1)',
  },
  couponInfo: {
    marginBottom: screenHeight * 0.015,
  },
  couponType: {
    fontSize: screenWidth * 0.022,
    marginBottom: screenHeight * 0.005,
  },
  couponTier: {
    fontSize: screenWidth * 0.022,
    marginBottom: screenHeight * 0.005,
  },
  couponDuration: {
    fontSize: screenWidth * 0.022,
  },
  couponFooter: {
    borderTopWidth: 1,
    borderTopColor: Colors.border,
    paddingTop: screenHeight * 0.015,
  },
  couponDate: {
    fontSize: screenWidth * 0.02,
    marginBottom: screenHeight * 0.005,
  },
  couponRedeemed: {
    fontSize: screenWidth * 0.02,
    marginBottom: screenHeight * 0.005,
  },
  couponExpire: {
    fontSize: screenWidth * 0.02,
  },
});

export default MembershipCenter;