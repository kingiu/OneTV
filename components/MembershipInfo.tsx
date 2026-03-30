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
import { useMembershipStore, UserMembership } from '@/stores/membershipStore';
import { useResponsiveLayout } from '@/hooks/useResponsiveLayout';

interface MembershipInfoProps {
  onUpgradePress?: () => void;
}

export function MembershipInfo({ onUpgradePress }: MembershipInfoProps) {
  const { membership, config, isLoading, error, fetchUserMembership, getDaysRemaining, getTierDisplayName } = useMembershipStore();
  const responsiveConfig = useResponsiveLayout();
  const { deviceType } = responsiveConfig;
  const upgradeButtonRef = useRef<any>(null);
  const firstTierRef = useRef<any>(null);

  useEffect(() => {
    fetchUserMembership();
  }, []);

  useEffect(() => {
    // 加载完成后，将焦点设置到相应的区域
    if (!isLoading && !error) {
      if (!membership?.isActive && upgradeButtonRef.current) {
        setTimeout(() => {
          if (upgradeButtonRef.current) {
            upgradeButtonRef.current.focus();
          }
        }, 100);
      } else if (config?.tiers && config.tiers.length > 0 && firstTierRef.current) {
        setTimeout(() => {
          if (firstTierRef.current) {
            firstTierRef.current.focus();
          }
        }, 100);
      }
    }
  }, [isLoading, error, membership, config]);

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
        <Text style={styles.loadingText}>加载会员信息...</Text>
      </View>
    );
  }

  if (error) {
    return (
      <View style={styles.centerContainer}>
        <Text style={styles.errorText}>{error}</Text>
        <TouchableOpacity 
          style={styles.retryButton} 
          onPress={fetchUserMembership}
          activeOpacity={0.7}
        >
          <Text style={styles.retryButtonText}>重试</Text>
        </TouchableOpacity>
      </View>
    );
  }

  const daysRemaining = getDaysRemaining();
  const tierDisplayName = getTierDisplayName();
  const isActive = membership?.isActive && membership?.status === 'active';

  return (
    <ScrollView 
      style={styles.container} 
      contentContainerStyle={styles.contentContainer}
      showsVerticalScrollIndicator={false}
    >
      <View style={[styles.membershipCard, isActive && styles.activeMembership]}>
        <View style={styles.membershipHeader}>
          <Text style={styles.membershipTitle}>会员信息</Text>
          <View style={[
            styles.statusBadge,
            isActive ? styles.activeBadge : styles.inactiveBadge
          ]}>
            <Text style={[
              styles.statusText,
              isActive ? styles.activeText : styles.inactiveText
            ]}>
              {isActive ? '活跃' : '未激活'}
            </Text>
          </View>
        </View>

        <View style={styles.membershipBody}>
          <Text style={styles.tierName}>{tierDisplayName}</Text>
          
          {isActive ? (
            <>
              <View style={styles.infoRow}>
                <Text style={styles.infoLabel}>剩余天数</Text>
                <Text style={styles.infoValue}>{daysRemaining}天</Text>
              </View>
              
              <View style={styles.infoRow}>
                <Text style={styles.infoLabel}>开始时间</Text>
                <Text style={styles.infoValue}>
                  {new Date(membership?.startDate || 0).toLocaleDateString('zh-CN')}
                </Text>
              </View>
              
              <View style={styles.infoRow}>
                <Text style={styles.infoLabel}>到期时间</Text>
                <Text style={styles.infoValue}>
                  {new Date(membership?.endDate || 0).toLocaleDateString('zh-CN')}
                </Text>
              </View>

              {membership?.tags && membership.tags.length > 0 && (
                <View style={styles.tagsContainer}>
                  {membership.tags.map((tag, index) => (
                    <View key={index} style={styles.tag}>
                      <Text style={styles.tagText}>{tag}</Text>
                    </View>
                  ))}
                </View>
              )}
            </>
          ) : (
            <View style={styles.upgradeContainer}>
              <Text style={styles.upgradeText}>升级会员享受更多权益</Text>
              <TouchableOpacity 
                ref={upgradeButtonRef}
                hasTVPreferredFocus
                style={styles.upgradeButton}
                onPress={onUpgradePress}
                activeOpacity={0.7}
              >
                <Text style={styles.upgradeButtonText}>立即升级</Text>
              </TouchableOpacity>
            </View>
          )}
        </View>
      </View>

      {config?.enabled && config.tiers && config.tiers.length > 0 && (
        <View style={styles.tiersSection}>
          <Text style={styles.sectionTitle}>会员等级</Text>
          {config.tiers.map((tier, index) => (
            <TouchableOpacity
              key={tier.id}
              ref={index === 0 ? firstTierRef : null}
              hasTVPreferredFocus={isActive && index === 0}
              style={[
                styles.tierCard,
                membership?.tierId === tier.id && styles.currentTier
              ]}
              activeOpacity={0.7}
            >
              <Text style={styles.tierCardTitle}>{tier.displayName || tier.name}</Text>
              {tier.benefits && tier.benefits.length > 0 && (
                <View style={styles.benefitsList}>
                  {tier.benefits.map((benefit, index) => (
                    <Text key={index} style={styles.benefitItem}>• {benefit}</Text>
                  ))}
                </View>
              )}
              {membership?.tierId === tier.id && (
                <View style={styles.currentBadge}>
                  <Text style={styles.currentBadgeText}>当前等级</Text>
                </View>
              )}
            </TouchableOpacity>
          ))}
        </View>
      )}
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
    gap: 36,
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
  membershipCard: {
    backgroundColor: '#1a1a1a',
    borderRadius: 16,
    padding: 44,
    borderWidth: 2,
    borderColor: '#333',
  },
  activeMembership: {
    borderColor: '#007AFF',
    backgroundColor: 'rgba(0, 122, 255, 0.05)',
  },
  membershipHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 36,
  },
  membershipTitle: {
    color: '#fff',
    fontSize: 44,
    fontWeight: 'bold',
  },
  statusBadge: {
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 8,
  },
  activeBadge: {
    backgroundColor: 'rgba(0, 200, 83, 0.2)',
  },
  inactiveBadge: {
    backgroundColor: 'rgba(255, 82, 82, 0.2)',
  },
  statusText: {
    fontSize: 30,
    fontWeight: '600',
  },
  activeText: {
    color: '#00C853',
  },
  inactiveText: {
    color: '#FF5252',
  },
  membershipBody: {
    gap: 24,
  },
  tierName: {
    color: '#fff',
    fontSize: 52,
    fontWeight: 'bold',
    marginBottom: 28,
  },
  infoRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#333',
  },
  infoLabel: {
    color: '#999',
    fontSize: 32,
  },
  infoValue: {
    color: '#fff',
    fontSize: 32,
    fontWeight: '500',
  },
  tagsContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 16,
    marginTop: 20,
  },
  tag: {
    backgroundColor: '#333',
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 8,
  },
  tagText: {
    color: '#fff',
    fontSize: 28,
  },
  upgradeContainer: {
    alignItems: 'center',
    paddingVertical: 28,
  },
  upgradeText: {
    color: '#999',
    fontSize: 32,
    marginBottom: 28,
    textAlign: 'center',
  },
  upgradeButton: {
    backgroundColor: '#007AFF',
    paddingHorizontal: 56,
    paddingVertical: 24,
    borderRadius: 12,
    minWidth: 300,
  },
  upgradeButtonText: {
    color: '#fff',
    fontSize: 36,
    fontWeight: 'bold',
    textAlign: 'center',
  },
  tiersSection: {
    gap: 24,
  },
  sectionTitle: {
    color: '#fff',
    fontSize: 40,
    fontWeight: 'bold',
    marginBottom: 12,
  },
  tierCard: {
    backgroundColor: '#1a1a1a',
    borderRadius: 16,
    padding: 36,
    borderWidth: 2,
    borderColor: '#333',
    minHeight: 160,
  },
  currentTier: {
    borderColor: '#007AFF',
    backgroundColor: 'rgba(0, 122, 255, 0.05)',
  },
  tierCardTitle: {
    color: '#fff',
    fontSize: 36,
    fontWeight: 'bold',
    marginBottom: 20,
  },
  benefitsList: {
    gap: 12,
  },
  benefitItem: {
    color: '#999',
    fontSize: 30,
    lineHeight: 44,
  },
  currentBadge: {
    position: 'absolute',
    top: 20,
    right: 20,
    backgroundColor: '#007AFF',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 8,
  },
  currentBadgeText: {
    color: '#fff',
    fontSize: 25,
    fontWeight: '600',
  },
});
