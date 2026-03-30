import React, { useState, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Modal,
  Platform,
  Pressable,
} from 'react-native';
// 暂时注释掉 useTVEventHandler，因为它在当前环境中不可用
// import { useTVEventHandler } from 'react-native-tvos';
import { CouponList } from '@/components/CouponList';
import { CouponRedeem } from '@/components/CouponRedeem';
import { MembershipInfo } from '@/components/MembershipInfo';
import { Coupon } from '@/stores/cardStore';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

export default function CardMembershipPage() {
  const insets = useSafeAreaInsets();
  const [activeTab, setActiveTab] = useState<'membership' | 'coupons'>('membership');
  const [showRedeemModal, setShowRedeemModal] = useState(false);
  const [selectedCoupon, setSelectedCoupon] = useState<Coupon | null>(null);
  const firstTabRef = useRef<any>(null);
  const redeemButtonRef = useRef<any>(null);

  const handleTabChange = (tab: 'membership' | 'coupons') => {
    setActiveTab(tab);
    // 切换标签后，确保焦点移动到相应的区域
    if (tab === 'coupons' && redeemButtonRef.current) {
      setTimeout(() => {
        if (redeemButtonRef.current) {
          redeemButtonRef.current.focus();
        }
      }, 100);
    }
  };

  const handleRedeemSuccess = () => {
    setShowRedeemModal(false);
    // 成功兑换后，将焦点返回到兑换按钮
    if (redeemButtonRef.current) {
      setTimeout(() => {
        if (redeemButtonRef.current) {
          redeemButtonRef.current.focus();
        }
      }, 100);
    }
  };

  const handleCouponPress = (coupon: Coupon) => {
    setSelectedCoupon(coupon);
  };

  // 暂时注释掉 useTVEventHandler，因为它在当前环境中不可用
  // useTVEventHandler((event: any) => {
  //   if (event.eventType === 'back') {
  //     if (showRedeemModal) {
  //       setShowRedeemModal(false);
  //     } else if (selectedCoupon) {
  //       setSelectedCoupon(null);
  //     }
  //   }
  // });

  return (
    <View style={[styles.container, { paddingTop: insets.top + 40 }]}>
      <View style={styles.header}>
        <Text style={styles.title}>卡券与会员</Text>
        
        <View style={styles.tabContainer}>
          <TouchableOpacity
            ref={firstTabRef}
            hasTVPreferredFocus={activeTab === 'membership'}
            style={[
              styles.tab,
              activeTab === 'membership' && styles.activeTab,
            ]}
            onPress={() => handleTabChange('membership')}
            activeOpacity={0.7}
          >
            <Text style={[
              styles.tabText,
              activeTab === 'membership' && styles.activeTabText,
            ]}>
              会员信息
            </Text>
          </TouchableOpacity>
          
          <TouchableOpacity
            hasTVPreferredFocus={activeTab === 'coupons'}
            style={[
              styles.tab,
              activeTab === 'coupons' && styles.activeTab,
            ]}
            onPress={() => handleTabChange('coupons')}
            activeOpacity={0.7}
          >
            <Text style={[
              styles.tabText,
              activeTab === 'coupons' && styles.activeTabText,
            ]}>
              我的卡券
            </Text>
          </TouchableOpacity>
        </View>

        {activeTab === 'coupons' && (
          <TouchableOpacity
            ref={redeemButtonRef}
            style={styles.redeemButton}
            onPress={() => setShowRedeemModal(true)}
            activeOpacity={0.7}
          >
            <Text style={styles.redeemButtonText}>兑换卡券</Text>
          </TouchableOpacity>
        )}
      </View>

      <View style={styles.content}>
        {activeTab === 'membership' ? (
          <MembershipInfo onUpgradePress={() => setShowRedeemModal(true)} />
        ) : (
          <CouponList onCouponPress={handleCouponPress} />
        )}
      </View>

      <Modal
        visible={showRedeemModal}
        transparent
        animationType="fade"
        onRequestClose={() => setShowRedeemModal(false)}
      >
        <CouponRedeem
          onSuccess={handleRedeemSuccess}
          onCancel={() => setShowRedeemModal(false)}
        />
      </Modal>

      {selectedCoupon && (
        <Modal
          visible={!!selectedCoupon}
          transparent
          animationType="fade"
          onRequestClose={() => setSelectedCoupon(null)}
        >
          <View style={styles.modalContainer}>
            <View style={styles.modalContent}>
              <Text style={styles.modalTitle}>卡券详情</Text>
              
              <View style={styles.detailRow}>
                <Text style={styles.detailLabel}>卡券码</Text>
                <Text style={styles.detailValue}>{selectedCoupon.code}</Text>
              </View>
              
              <View style={styles.detailRow}>
                <Text style={styles.detailLabel}>会员等级</Text>
                <Text style={styles.detailValue}>{selectedCoupon.tierName}</Text>
              </View>
              
              <View style={styles.detailRow}>
                <Text style={styles.detailLabel}>有效期</Text>
                <Text style={styles.detailValue}>{selectedCoupon.durationDays}天</Text>
              </View>
              
              <View style={styles.detailRow}>
                <Text style={styles.detailLabel}>状态</Text>
                <Text style={[
                  styles.detailValue,
                  selectedCoupon.status === 'active' && styles.activeText,
                  selectedCoupon.status === 'used' && styles.usedText,
                  selectedCoupon.status === 'expired' && styles.expiredText,
                ]}>
                  {selectedCoupon.status === 'active' ? '可使用' : 
                   selectedCoupon.status === 'used' ? '已使用' : '已过期'}
                </Text>
              </View>
              
              <View style={styles.detailRow}>
                <Text style={styles.detailLabel}>创建时间</Text>
                <Text style={styles.detailValue}>{selectedCoupon.createdAtStr}</Text>
              </View>
              
              {selectedCoupon.redeemedAt && (
                <View style={styles.detailRow}>
                  <Text style={styles.detailLabel}>使用时间</Text>
                  <Text style={styles.detailValue}>{selectedCoupon.redeemedAtStr}</Text>
                </View>
              )}
              
              <View style={styles.detailRow}>
                <Text style={styles.detailLabel}>到期时间</Text>
                <Text style={styles.detailValue}>{selectedCoupon.expireTimeStr}</Text>
              </View>

              <TouchableOpacity
                style={styles.closeButton}
                onPress={() => setSelectedCoupon(null)}
                activeOpacity={0.7}
                hasTVPreferredFocus
              >
                <Text style={styles.closeButtonText}>关闭</Text>
              </TouchableOpacity>
            </View>
          </View>
        </Modal>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#000',
  },
  header: {
    paddingHorizontal: 40,
    paddingBottom: 40,
    borderBottomWidth: 2,
    borderBottomColor: '#333',
  },
  title: {
    color: '#fff',
    fontSize: 56,
    fontWeight: 'bold',
    marginBottom: 32,
  },
  tabContainer: {
    flexDirection: 'row',
    backgroundColor: '#1a1a1a',
    borderRadius: 12,
    padding: 8,
    marginBottom: 24,
  },
  tab: {
    flex: 1,
    paddingVertical: 20,
    paddingHorizontal: 24,
    borderRadius: 8,
    alignItems: 'center',
  },
  activeTab: {
    backgroundColor: '#007AFF',
  },
  tabText: {
    color: '#999',
    fontSize: 32,
    fontWeight: '600',
  },
  activeTabText: {
    color: '#fff',
  },
  redeemButton: {
    backgroundColor: '#007AFF',
    paddingVertical: 20,
    paddingHorizontal: 36,
    borderRadius: 12,
    alignItems: 'center',
    alignSelf: 'flex-end',
  },
  redeemButtonText: {
    color: '#fff',
    fontSize: 32,
    fontWeight: 'bold',
  },
  content: {
    flex: 1,
  },
  modalContainer: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.9)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 40,
  },
  modalContent: {
    backgroundColor: '#1a1a1a',
    borderRadius: 16,
    padding: 48,
    width: '100%',
    maxWidth: 800,
    borderWidth: 2,
    borderColor: '#333',
  },
  modalTitle: {
    color: '#fff',
    fontSize: 48,
    fontWeight: 'bold',
    marginBottom: 32,
    textAlign: 'center',
  },
  detailRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#333',
  },
  detailLabel: {
    color: '#999',
    fontSize: 32,
  },
  detailValue: {
    color: '#fff',
    fontSize: 32,
    fontWeight: '500',
  },
  activeText: {
    color: '#00C853',
  },
  usedText: {
    color: '#FFA000',
  },
  expiredText: {
    color: '#FF5252',
  },
  closeButton: {
    backgroundColor: '#333',
    paddingVertical: 24,
    paddingHorizontal: 48,
    borderRadius: 12,
    marginTop: 32,
    alignItems: 'center',
  },
  closeButtonText: {
    color: '#fff',
    fontSize: 36,
    fontWeight: '600',
  },
});
