import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, ScrollView, ActivityIndicator, RefreshControl } from 'react-native';
import { useMembershipStore } from '../stores/membershipStore';

export default function DebugMembershipScreen() {
  const { 
    membershipInfo, 
    fetchMembershipInfo, 
    isLoading, 
    error,
    getMembershipTierText 
  } = useMembershipStore();
  const [refreshing, setRefreshing] = useState(false);

  useEffect(() => {
    fetchMembershipInfo();
  }, []);

  const onRefresh = async () => {
    setRefreshing(true);
    await fetchMembershipInfo();
    setRefreshing(false);
  };
  
  // 格式化日期
  const formatDate = (timestamp: number | undefined): string => {
    if (!timestamp) return 'N/A';
    const date = new Date(timestamp);
    return date.toLocaleString('zh-CN', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  return (
    <ScrollView
      style={styles.container}
      refreshControl={
        <RefreshControl 
          refreshing={refreshing || isLoading} 
          onRefresh={onRefresh} 
          colors={['#2196F3']}
          tintColor="#2196F3"
        />
      }
    >
      <View style={styles.content}>
        <Text style={styles.title}>会员信息调试面板</Text>
        
        {isLoading && !refreshing && (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color="#2196F3" />
            <Text style={styles.loadingText}>正在获取会员信息...</Text>
          </View>
        )}
        
        {error && (
          <View style={styles.errorContainer}>
            <Text style={styles.errorTitle}>错误信息:</Text>
            <Text style={styles.errorText}>{error}</Text>
            <Text style={styles.errorSubtext}>点击刷新按钮重试</Text>
          </View>
        )}
        
        {membershipInfo && (
          <View style={styles.infoContainer}>
            <Text style={styles.sectionTitle}>会员信息详情</Text>
            
            <View style={styles.infoItem}>
              <Text style={styles.label}>用户名:</Text>
              <Text style={styles.value}>{membershipInfo.userName || '未设置'}</Text>
            </View>
            
            <View style={styles.infoItem}>
              <Text style={styles.label}>会员等级:</Text>
              <Text 
                style={[styles.value, styles.tierText, { color: membershipInfo.tier === 'VIP' ? '#FF9500' : '#2196F3' }]} 
              >
                {getMembershipTierText()}
              </Text>
            </View>
            
            <View style={styles.infoItem}>
              <Text style={styles.label}>原始等级ID:</Text>
              <Text style={[styles.value, styles.monospace]}>
                {membershipInfo.tier}
              </Text>
            </View>
            
            <View style={styles.infoItem}>
              <Text style={styles.label}>激活状态:</Text>
              <Text style={[styles.value, membershipInfo.isActive ? styles.activeStatus : styles.inactiveStatus]}>
                {membershipInfo.isActive ? '已激活' : '未激活'}
              </Text>
            </View>
            
            <View style={styles.infoItem}>
              <Text style={styles.label}>状态:</Text>
              <Text style={styles.value}>{membershipInfo.status}</Text>
            </View>
            
            <View style={styles.infoItem}>
              <Text style={styles.label}>创建时间:</Text>
              <Text style={styles.value}>
                {formatDate(membershipInfo.createdAt)}
              </Text>
            </View>
            
            {membershipInfo.expireTime && (
              <View style={styles.infoItem}>
                <Text style={styles.label}>过期时间:</Text>
                <Text style={styles.value}>
                  {formatDate(membershipInfo.expireTime)}
                </Text>
              </View>
            )}
            
            {membershipInfo.daysRemaining !== undefined && (
              <View style={styles.infoItem}>
                <Text style={styles.label}>剩余天数:</Text>
                <Text style={[styles.value, membershipInfo.daysRemaining > 30 ? styles.goodStatus : {}]}>
                  {membershipInfo.daysRemaining}天
                </Text>
              </View>
            )}
            
            {membershipInfo.lastRenewTime && (
              <View style={styles.infoItem}>
                <Text style={styles.label}>最后续费时间:</Text>
                <Text style={styles.value}>
                  {formatDate(membershipInfo.lastRenewTime)}
                </Text>
              </View>
            )}
            
            <View style={styles.infoItem}>
              <Text style={styles.label}>验证状态:</Text>
              <Text style={[styles.value, styles.verifiedStatus]}>
                ✓ 已验证有效
              </Text>
            </View>
            
            <ScrollView style={styles.rawDataContainer} horizontal={true}>
              <Text style={[styles.rawData, styles.monospace]}>
                {JSON.stringify(membershipInfo, null, 2)}
              </Text>
            </ScrollView>
          </View>
        )}
        
        {!membershipInfo && !isLoading && !error && (
          <View style={styles.emptyContainer}>
            <Text style={styles.emptyText}>暂无会员信息</Text>
          </View>
        )}
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  content: {
    padding: 20,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    textAlign: 'center',
    marginBottom: 20,
    color: '#333',
  },
  loadingContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 40,
  },
  loadingText: {
    marginTop: 16,
    fontSize: 16,
    color: '#666',
  },
  errorContainer: {
    backgroundColor: '#ffebee',
    padding: 15,
    borderRadius: 8,
    marginBottom: 20,
    alignItems: 'center',
  },
  errorTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#c62828',
    marginBottom: 5,
  },
  errorText: {
    fontSize: 16,
    color: '#c62828',
    marginBottom: 8,
  },
  errorSubtext: {
    fontSize: 14,
    color: '#999',
  },
  infoContainer: {
    backgroundColor: 'white',
    borderRadius: 8,
    padding: 15,
    marginBottom: 20,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    marginBottom: 15,
    color: '#333',
    textAlign: 'center',
  },
  infoItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
  },
  label: {
    fontSize: 16,
    fontWeight: '500',
    color: '#666',
    flex: 1,
  },
  value: {
    fontSize: 16,
    color: '#333',
    flex: 1,
    textAlign: 'right',
  },
  tierText: {
    fontWeight: 'bold',
  },
  monospace: {
    fontFamily: 'monospace',
  },
  activeStatus: {
    color: '#4CD964',
    fontWeight: 'bold',
  },
  inactiveStatus: {
    color: '#ff3b30',
  },
  goodStatus: {
    color: '#4CD964',
    fontWeight: 'bold',
  },
  verifiedStatus: {
    color: '#4CD964',
    fontWeight: 'bold',
  },
  rawDataContainer: {
    marginTop: 20,
    maxHeight: 300,
    borderWidth: 1,
    borderColor: '#eee',
    borderRadius: 4,
  },
  rawData: {
    fontSize: 14,
    color: '#666',
    padding: 12,
  },
  emptyContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    padding: 40,
  },
  emptyText: {
    fontSize: 18,
    color: '#999',
  },
});