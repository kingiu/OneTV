import React, { useEffect, useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TextInput,
  TouchableOpacity,
  Alert,
  ActivityIndicator,
} from "react-native";
import useMembershipStore from "@/stores/membershipStore";
import { ThemedText } from "./ThemedText";
import { ThemedView } from "./ThemedView";
import { Colors } from "@/constants/Colors";

const CouponManager: React.FC = () => {
  const { userCoupons, isLoadingCoupons, couponsError, fetchUserCoupons, redeemCoupon } = useMembershipStore();
  const [couponCode, setCouponCode] = useState("");
  const [isRedeeming, setIsRedeeming] = useState(false);

  useEffect(() => {
    fetchUserCoupons();
  }, []);

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

  return (
    <ScrollView style={styles.container}>
      {/* 卡券兑换 */}
      <ThemedView style={styles.redeemSection}>
        <ThemedText style={styles.sectionTitle}>兑换卡券</ThemedText>
        <TextInput
          style={styles.input}
          placeholder="请输入卡券码"
          value={couponCode}
          onChangeText={setCouponCode}
          autoCapitalize="none"
          autoCorrect={false}
        />
        <TouchableOpacity
          style={[styles.redeemButton, isRedeeming && styles.redeemButtonDisabled]}
          onPress={handleRedeem}
          disabled={isRedeeming}
        >
          {isRedeeming ? (
            <ActivityIndicator color="white" />
          ) : (
            <ThemedText style={styles.redeemButtonText}>立即兑换</ThemedText>
          )}
        </TouchableOpacity>
      </ThemedView>

      {/* 卡券列表 */}
      <ThemedView style={styles.listSection}>
        <ThemedText style={styles.sectionTitle}>我的卡券</ThemedText>
        
        {isLoadingCoupons ? (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" />
          </View>
        ) : couponsError ? (
          <ThemedText style={styles.errorText}>{couponsError}</ThemedText>
        ) : userCoupons.length === 0 ? (
          <ThemedText style={styles.emptyText}>暂无卡券</ThemedText>
        ) : (
          userCoupons.map((coupon, index) => (
            <ThemedView key={index} style={styles.couponCard}>
              <ThemedView style={styles.couponHeader}>
                <ThemedText style={styles.couponCode}>卡券码：{coupon.code}</ThemedText>
                <ThemedText style={[styles.couponStatus, { color: getStatusColor(coupon.status, coupon.isExpired) }]}>
                  {getStatusText(coupon.status, coupon.isExpired)}
                </ThemedText>
              </ThemedView>
              
              <ThemedView style={styles.couponInfo}>
                <ThemedText style={styles.couponType}>类型：{coupon.type || "会员卡"}</ThemedText>
                <ThemedText style={styles.couponTier}>等级：{coupon.tier}</ThemedText>
                <ThemedText style={styles.couponDuration}>有效期：{coupon.durationDays} 天</ThemedText>
              </ThemedView>
              
              <ThemedView style={styles.couponFooter}>
                <ThemedText style={styles.couponDate}>创建时间：{formatDate(coupon.createdAt)}</ThemedText>
                {coupon.redeemedAt && (
                  <ThemedText style={styles.couponRedeemed}>使用时间：{formatDate(coupon.redeemedAt)}</ThemedText>
                )}
                {coupon.expireTime && (
                  <ThemedText style={[styles.couponExpire, { color: getStatusColor(coupon.status, coupon.isExpired) }]}>
                    过期时间：{formatDate(coupon.expireTime)}
                  </ThemedText>
                )}
              </ThemedView>
            </ThemedView>
          ))
        )}
      </ThemedView>
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 16,
  },
  redeemSection: {
    padding: 16,
    borderRadius: 8,
    marginBottom: 16,
  },
  listSection: {
    padding: 16,
    borderRadius: 8,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: "bold",
    marginBottom: 16,
    textAlign: "center",
  },
  input: {
    borderWidth: 1,
    borderColor: "#e0e0e0",
    borderRadius: 4,
    padding: 12,
    fontSize: 16,
    marginBottom: 12,
  },
  redeemButton: {
    backgroundColor: Colors.success,
    padding: 12,
    borderRadius: 4,
    alignItems: "center",
  },
  redeemButtonDisabled: {
    opacity: 0.6,
  },
  redeemButtonText: {
    color: "white",
    fontSize: 16,
    fontWeight: "500",
  },
  loadingContainer: {
    padding: 40,
    alignItems: "center",
  },
  errorText: {
    color: Colors.error,
    textAlign: "center",
    padding: 20,
  },
  emptyText: {
    textAlign: "center",
    padding: 20,
  },
  couponCard: {
    padding: 12,
    borderRadius: 8,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: "#e0e0e0",
  },
  couponHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 8,
  },
  couponCode: {
    fontSize: 16,
    fontWeight: "500",
  },
  couponStatus: {
    fontSize: 14,
    fontWeight: "500",
  },
  couponInfo: {
    marginBottom: 8,
  },
  couponType: {
    fontSize: 14,
    marginBottom: 4,
  },
  couponTier: {
    fontSize: 14,
    marginBottom: 4,
  },
  couponDuration: {
    fontSize: 14,
  },
  couponFooter: {
    borderTopWidth: 1,
    borderTopColor: "#e0e0e0",
    paddingTop: 8,
  },
  couponDate: {
    fontSize: 12,
    marginBottom: 4,
  },
  couponRedeemed: {
    fontSize: 12,
    marginBottom: 4,
  },
  couponExpire: {
    fontSize: 12,
  },
});

export default CouponManager;