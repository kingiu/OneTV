import React, { useEffect } from "react";
import { View, Text, StyleSheet, ScrollView } from "react-native";
import useMembershipStore from "@/stores/membershipStore";
import { useAuthStore } from "@/stores/authStore";
import { useSettingsStore } from "@/stores/settingsStore";
import { ThemedText } from "./ThemedText";
import { ThemedView } from "./ThemedView";
import { Colors } from "@/constants/Colors";

const MembershipInfo: React.FC = () => {
  const { membershipInfo, isLoadingMembership, membershipError, fetchMembershipInfo } = useMembershipStore();
  const { isLoggedIn, autoLogin } = useAuthStore();
  const { serverConfig } = useSettingsStore();

  useEffect(() => {
    const initMembership = async () => {
      // 确保用户已登录
      if (!isLoggedIn) {
        await autoLogin();
      }
      // 检查服务器是否启用了会员系统
      const isMembershipEnabled = serverConfig?.ApiConfig?.EnableMembership || serverConfig?.MembershipConfig?.Enable;
      if (isMembershipEnabled) {
        // 登录后获取会员信息
        fetchMembershipInfo();
      }
    };
    
    initMembership();
  }, [isLoggedIn, autoLogin, serverConfig]);

  // 检查服务器是否启用了会员系统
  const isMembershipEnabled = serverConfig?.ApiConfig?.EnableMembership || serverConfig?.MembershipConfig?.Enable;
  
  if (!isMembershipEnabled) {
    return (
      <ThemedView style={styles.container}>
        <ThemedText style={styles.errorText}>会员系统暂未启用</ThemedText>
      </ThemedView>
    );
  }

  if (isLoadingMembership) {
    return (
      <ThemedView style={styles.container}>
        <ThemedText>加载会员信息中...</ThemedText>
      </ThemedView>
    );
  }

  if (membershipError) {
    return (
      <ThemedView style={styles.container}>
        <ThemedText style={styles.errorText}>{membershipError}</ThemedText>
      </ThemedView>
    );
  }

  if (!membershipInfo || !membershipInfo.membership) {
    return (
      <ThemedView style={styles.container}>
        <ThemedText>暂无会员信息</ThemedText>
      </ThemedView>
    );
  }

  const { membership, config } = membershipInfo;
  const currentTier = config?.tiers?.find((tier) => tier.name === membership.tierId) || {
    displayName: membership.tierId || '未知',
    features: [],
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

  return (
    <ScrollView style={styles.container}>
      <ThemedView style={styles.card}>
        <ThemedText style={styles.title}>会员信息</ThemedText>
        
        <ThemedView style={styles.infoRow}>
          <ThemedText style={styles.label}>会员等级：</ThemedText>
          <ThemedText style={[styles.value, { color: membership.status === "active" ? Colors.success : Colors.error }]}>
            {currentTier.displayName}
          </ThemedText>
        </ThemedView>

        <ThemedView style={styles.infoRow}>
          <ThemedText style={styles.label}>会员状态：</ThemedText>
          <ThemedText style={[styles.value, { color: membership.status === "active" ? Colors.success : Colors.error }]}>
            {membership.status === "active" ? "活跃" : "已过期"}
          </ThemedText>
        </ThemedView>

        <ThemedView style={styles.infoRow}>
          <ThemedText style={styles.label}>开始日期：</ThemedText>
          <ThemedText style={styles.value}>{formatDate(membership.startDate || 0)}</ThemedText>
        </ThemedView>

        <ThemedView style={styles.infoRow}>
          <ThemedText style={styles.label}>到期日期：</ThemedText>
          <ThemedText style={[styles.value, { color: membership.status === "active" ? Colors.success : Colors.error }]}>
            {formatDate(membership.endDate || 0)}
          </ThemedText>
        </ThemedView>

        <ThemedView style={styles.infoRow}>
          <ThemedText style={styles.label}>自动续费：</ThemedText>
          <ThemedText style={styles.value}>{membership.autoRenew ? "开启" : "关闭"}</ThemedText>
        </ThemedView>

        {currentTier.features && currentTier.features.length > 0 && (
          <ThemedView style={styles.featuresSection}>
            <ThemedText style={styles.featuresTitle}>会员特权：</ThemedText>
            {currentTier.features.map((feature, index) => (
              <ThemedText key={index} style={styles.featureItem}>• {feature}</ThemedText>
            ))}
          </ThemedView>
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
  card: {
    padding: 16,
    borderRadius: 8,
    marginBottom: 16,
  },
  title: {
    fontSize: 20,
    fontWeight: "bold",
    marginBottom: 16,
    textAlign: "center",
  },
  infoRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: "#e0e0e0",
  },
  label: {
    fontSize: 16,
    fontWeight: "500",
  },
  value: {
    fontSize: 16,
  },
  errorText: {
    color: Colors.error,
    textAlign: "center",
  },
  featuresSection: {
    marginTop: 16,
  },
  featuresTitle: {
    fontSize: 16,
    fontWeight: "500",
    marginBottom: 8,
  },
  featureItem: {
    fontSize: 14,
    marginLeft: 8,
    marginBottom: 4,
  },
});

export default MembershipInfo;