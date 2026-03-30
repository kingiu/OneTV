import React, { useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  Platform,
} from 'react-native';
// 暂时注释掉 useTVEventHandler，因为它在当前环境中不可用
// import { useTVEventHandler } from 'react-native-tvos';
import { useCardStore, Coupon } from '@/stores/cardStore';
import { useResponsiveLayout } from '@/hooks/useResponsiveLayout';

interface CouponListProps {
  onCouponPress?: (coupon: Coupon) => void;
}

export function CouponList({ onCouponPress }: CouponListProps) {
  const { coupons, isLoading, error, fetchUserCoupons } = useCardStore();
  const responsiveConfig = useResponsiveLayout();
  const { deviceType } = responsiveConfig;
  const firstCouponRef = useRef<any>(null);

  useEffect(() => {
    fetchUserCoupons();
  }, []);

  useEffect(() => {
    // 加载完成后，将焦点设置到第一个卡券
    if (coupons.length > 0 && firstCouponRef.current) {
      setTimeout(() => {
        if (firstCouponRef.current) {
          firstCouponRef.current.focus();
        }
      }, 100);
    }
  }, [coupons]);

  // 暂时注释掉 useTVEventHandler，因为它在当前环境中不可用
  // useTVEventHandler((event: any) => {
  //   if (event.eventType === 'back') {
  //     // 可以在这里处理返回逻辑
  //   }
  // });

  if (isLoading) {
    return (
      <View style={styles.centerContainer}>
        <ActivityIndicator size="large" color="#fff" />
        <Text style={styles.loadingText}>加载卡券...</Text>
      </View>
    );
  }

  if (error) {
    return (
      <View style={styles.centerContainer}>
        <Text style={styles.errorText}>{error}</Text>
        <TouchableOpacity 
          style={styles.retryButton} 
          onPress={fetchUserCoupons}
          activeOpacity={0.7}
        >
          <Text style={styles.retryButtonText}>重试</Text>
        </TouchableOpacity>
      </View>
    );
  }

  if (coupons.length === 0) {
    return (
      <View style={styles.centerContainer}>
        <Text style={styles.emptyText}>暂无卡券</Text>
        <Text style={styles.emptySubText}>您可以通过兑换码获取卡券</Text>
      </View>
    );
  }

  return (
    <ScrollView 
      style={styles.container} 
      contentContainerStyle={styles.contentContainer}
      showsVerticalScrollIndicator={false}
    >
      {coupons.map((coupon, index) => (
        <TouchableOpacity
          key={coupon.id}
          ref={index === 0 ? firstCouponRef : null}
          hasTVPreferredFocus={index === 0}
          style={[
            styles.couponCard,
            coupon.status === 'used' && styles.usedCoupon,
            coupon.status === 'expired' && styles.expiredCoupon,
          ]}
          onPress={() => onCouponPress?.(coupon)}
          activeOpacity={0.7}
        >
          <View style={styles.couponHeader}>
            <Text style={styles.couponTier}>{coupon.tierName}</Text>
            <Text style={[
              styles.couponStatus,
              coupon.status === 'active' && styles.activeStatus,
              coupon.status === 'used' && styles.usedStatus,
              coupon.status === 'expired' && styles.expiredStatus,
            ]}>
              {coupon.status === 'active' ? '可使用' : 
               coupon.status === 'used' ? '已使用' : '已过期'}
            </Text>
          </View>
          
          <View style={styles.couponBody}>
            <Text style={styles.couponCode}>{coupon.code}</Text>
            <Text style={styles.couponDuration}>有效期: {coupon.durationDays}天</Text>
          </View>

          <View style={styles.couponFooter}>
            <Text style={styles.couponDate}>
              {coupon.status === 'used' 
                ? `使用时间: ${coupon.redeemedAtStr}`
                : `到期时间: ${coupon.expireTimeStr}`}
            </Text>
          </View>
        </TouchableOpacity>
      ))}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#000',
  },
  contentContainer: {
    padding: 40,
    gap: 28,
  },
  centerContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 40,
  },
  loadingText: {
    color: '#fff',
    fontSize: 32,
    marginTop: 24,
  },
  errorText: {
    color: '#ff4444',
    fontSize: 32,
    textAlign: 'center',
    marginBottom: 24,
  },
  retryButton: {
    backgroundColor: '#007AFF',
    paddingHorizontal: 48,
    paddingVertical: 20,
    borderRadius: 12,
    minWidth: 200,
  },
  retryButtonText: {
    color: '#fff',
    fontSize: 36,
    fontWeight: '600',
    textAlign: 'center',
  },
  emptyText: {
    color: '#fff',
    fontSize: 52,
    fontWeight: 'bold',
    marginBottom: 20,
  },
  emptySubText: {
    color: '#999',
    fontSize: 32,
    textAlign: 'center',
  },
  couponCard: {
    backgroundColor: '#1a1a1a',
    borderRadius: 16,
    padding: 36,
    borderWidth: 2,
    borderColor: '#333',
    minHeight: 200,
  },
  usedCoupon: {
    opacity: 0.6,
  },
  expiredCoupon: {
    opacity: 0.4,
  },
  couponHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 24,
  },
  couponTier: {
    color: '#fff',
    fontSize: 36,
    fontWeight: 'bold',
  },
  couponStatus: {
    fontSize: 30,
    fontWeight: '600',
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 8,
  },
  activeStatus: {
    color: '#00C853',
    backgroundColor: 'rgba(0, 200, 83, 0.1)',
  },
  usedStatus: {
    color: '#FFA000',
    backgroundColor: 'rgba(255, 160, 0, 0.1)',
  },
  expiredStatus: {
    color: '#FF5252',
    backgroundColor: 'rgba(255, 82, 82, 0.1)',
  },
  couponBody: {
    marginBottom: 20,
  },
  couponCode: {
    color: '#fff',
    fontSize: 44,
    fontWeight: 'bold',
    letterSpacing: 4,
    marginBottom: 16,
  },
  couponDuration: {
    color: '#999',
    fontSize: 30,
  },
  couponFooter: {
    borderTopWidth: 1,
    borderTopColor: '#333',
    paddingTop: 20,
  },
  couponDate: {
    color: '#666',
    fontSize: 28,
  },
});
