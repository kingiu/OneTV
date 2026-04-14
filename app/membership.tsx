import React from "react";
import { View, StyleSheet, ScrollView, TouchableOpacity } from "react-native";

import CouponManager from "@/components/CouponManager";
import MembershipCenterTV from "@/components/MembershipCenter.tv";
import MembershipInfo from "@/components/MembershipInfo";
import { ThemedText } from "@/components/ThemedText";
import { ThemedView } from "@/components/ThemedView";
import { useResponsiveLayout } from "@/hooks/useResponsiveLayout";

const MembershipScreen: React.FC = () => {
  const { deviceType } = useResponsiveLayout();
  const [activeTab, setActiveTab] = React.useState<"membership" | "coupon">('membership');

  // 电视端使用专门的TV组件
  if (deviceType === 'tv') {
    return <MembershipCenterTV />;
  }

  // 其他设备使用原始布局
  return (
    <View style={styles.container}>
      <ThemedView style={styles.header}>
        <ThemedText style={styles.headerTitle}>会员中心</ThemedText>
      </ThemedView>

      <View style={styles.tabContainer}>
        <TouchableOpacity
          style={[styles.tab, activeTab === 'membership' && styles.activeTab]}
          onPress={() => setActiveTab('membership')}
        >
          <ThemedText style={[styles.tabText, activeTab === 'membership' && styles.activeTabText]}>
            会员信息
          </ThemedText>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.tab, activeTab === 'coupon' && styles.activeTab]}
          onPress={() => setActiveTab('coupon')}
        >
          <ThemedText style={[styles.tabText, activeTab === 'coupon' && styles.activeTabText]}>
            卡券管理
          </ThemedText>
        </TouchableOpacity>
      </View>

      <ScrollView style={styles.content}>
        {activeTab === 'membership' ? (
          <MembershipInfo />
        ) : (
          <CouponManager />
        )}
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    padding: 16,
    alignItems: "center",
    borderBottomWidth: 1,
    borderBottomColor: "#e0e0e0",
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: "bold",
  },
  tabContainer: {
    flexDirection: "row",
    borderBottomWidth: 1,
    borderBottomColor: "#e0e0e0",
  },
  tab: {
    flex: 1,
    padding: 16,
    alignItems: "center",
  },
  activeTab: {
    borderBottomWidth: 2,
    borderBottomColor: "#34C759",
  },
  tabText: {
    fontSize: 16,
  },
  activeTabText: {
    fontWeight: "bold",
    color: "#34C759",
  },
  content: {
    flex: 1,
  },
});

export default MembershipScreen;
