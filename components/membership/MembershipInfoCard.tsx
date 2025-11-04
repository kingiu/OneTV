import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Platform,
  ActivityIndicator
} from 'react-native';
import { UserMembershipInfo } from '../../stores/membershipStore';
import {
  getMembershipTierText,
  getMembershipTierColor,
  formatMembershipDate,
  calculateRemainingDays,
  MembershipTier,
  validateMembershipInfo
} from '../../utils/membershipUtils';

interface MembershipInfoCardProps {
  membership: UserMembershipInfo | null;
  onRedeemPress?: () => void;
  isLoading?: boolean;
}

const MembershipInfoCard: React.FC<MembershipInfoCardProps> = ({ 
  membership, 
  onRedeemPress,
  isLoading = false
}) => {
  console.debug('MembershipInfoCard 渲染', { hasMembership: !!membership, membership });
  
  // 添加详细日志记录，帮助调试会员等级映射问题
  React.useEffect(() => {
    console.debug('MembershipInfoCard 接收到的会员信息:', membership);
    if (membership?.tier) {
      console.debug(`MembershipInfoCard: 会员等级映射 - tier: '${membership.tier}' -> text: '${getMembershipTierText(membership.tier)}'`);
    }
  }, [membership]);

  // 获取会员状态文本（更健壮的状态判断）
  const getStatusText = (isActive: boolean, status: string): string => {
    console.debug('MembershipInfoCard: 获取状态文本', { isActive, status });
    
    if (!status) return '未设置';
    
    const statusStr = String(status).toLowerCase();
    
    if (isActive || statusStr === 'active' || statusStr === 'activated' || statusStr === '有效的' || statusStr === 'valid') {
      return '已激活';
    }
    if (statusStr === 'expired' || statusStr === '过期') {
      return '已过期';
    }
    return '未激活';
  };

  // 获取会员状态颜色（更健壮的状态判断）
  const getStatusColor = (isActive: boolean, status: string): string => {
    console.debug('MembershipInfoCard: 获取状态颜色', { isActive, status });
    
    if (!status) return '#999999';
    
    const statusStr = String(status).toLowerCase();
    
    if (isActive || statusStr === 'active' || statusStr === 'activated' || statusStr === '有效的' || statusStr === 'valid') {
      return '#22C55E'; // 激活为绿色
    }
    if (statusStr === 'expired' || statusStr === '过期') {
      return '#EF4444'; // 过期为红色
    }
    return '#6B7280'; // 未激活为灰色
  };

  // 检查会员信息是否完整
  const isMembershipComplete = (membership: UserMembershipInfo | null): boolean => {
    if (!membership) return false;
    console.debug('MembershipInfoCard: 检查会员信息完整性', {
      hasUserName: !!membership.userName,
      hasTier: !!membership.tier,
      hasStatus: !!membership.status,
      membership
    });
    // 会员信息只需要tier和status即可显示，userName可以为空
    return !!(membership.tier && membership.status);
  };
  
  // 检查会员信息是否有效
  const isValidMembership = membership ? validateMembershipInfo(membership) : false;

  const membershipComplete = isMembershipComplete(membership);
  console.debug('MembershipInfoCard: 会员信息完整性检查结果', { membershipComplete });
  
  // 处理加载状态
  if (isLoading) {
    return (
      <View style={[styles.container, styles.loadingContainer]}>
        <ActivityIndicator size="large" color="#3B82F6" />
        <Text style={styles.loadingText}>加载会员信息中...</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <Text style={styles.title}>会员信息</Text>
      
      {membership && membershipComplete ? (
        <View style={styles.infoContainer}>
          {/* 会员信息验证提示（仅在开发模式显示） */}
          {__DEV__ && (
            <View style={[
              styles.validationBanner,
              { backgroundColor: isValidMembership ? '#E8F5E9' : '#FFEBEE' }
            ]}>
              <Text style={[
                styles.validationText,
                { color: isValidMembership ? '#2E7D32' : '#C62828' }
              ]}>
                {isValidMembership ? '会员信息有效' : '会员信息验证失败'}
              </Text>
            </View>
          )}
          <View style={styles.infoRow}>
            <Text style={styles.label}>账号：</Text>
            <Text style={styles.value}>{membership.userName || '未知'}</Text>
          </View>
          
          <View style={styles.infoRow}>
            <Text style={styles.label}>会员等级：</Text>
            <View style={styles.tierContainer}>
              <View 
                style={[
                  styles.tierBadge, 
                  { backgroundColor: getMembershipTierColor(membership.tier) }
                ]} 
              />
              <Text 
                style={[
                  styles.tierText, 
                  { color: getMembershipTierColor(membership.tier) }
                ]} 
              >
                {getMembershipTierText(membership.tier)}
              </Text>
            </View>
          </View>
          
          <View style={styles.infoRow}>
            <Text style={styles.label}>会员状态：</Text>
            <Text style={[styles.statusText, { color: getStatusColor(!!membership.isActive, membership.status) }]}>
              {getStatusText(!!membership.isActive, membership.status)}
            </Text>
          </View>
          
          <View style={styles.infoRow}>
            <Text style={styles.label}>开通时间：</Text>
            <Text style={styles.value}>{membership.createdAt ? formatMembershipDate(membership.createdAt) : '未知'}</Text>
          </View>
          
          {membership.expireTime && (
            <View style={styles.infoRow}>
              <Text style={styles.label}>到期时间：</Text>
              <Text 
                style={[
                  styles.value, 
                  membership.expireTime < Date.now() && styles.expiredText
                ]} 
              >
                {formatMembershipDate(membership.expireTime)}
                {membership.expireTime < Date.now() && ' (已过期)'}
              </Text>
            </View>
          )}
          
          {membership.lastRenewTime && (
            <View style={styles.infoRow}>
              <Text style={styles.label}>最后续费：</Text>
              <Text style={styles.value}>{formatMembershipDate(membership.lastRenewTime)}</Text>
            </View>
          )}
          
          {/* 会员有效期进度条 */}
          {membership.isActive && membership.expireTime && (
            <View style={styles.progressContainer}>
              <View style={styles.progressHeader}>
                <Text style={styles.progressLabel}>会员有效期</Text>
                <Text style={styles.progressDays}>
                  {membership.daysRemaining || (membership.expireTime ? calculateRemainingDays(membership.expireTime) : 0)} 天剩余
                </Text>
              </View>
              <View style={styles.progressBar}>
                <View 
                  style={[
                    styles.progressFill,
                    {
                      width: `${Math.max(0, Math.min(100, 
                        membership.createdAt && membership.expireTime ? 
                        100 - ((Date.now() - membership.createdAt) / 
                        (membership.expireTime - membership.createdAt) * 100) : 0))}%`,
                      backgroundColor: getMembershipTierColor(membership.tier) // 使用会员等级对应的颜色
                    }
                  ]} 
                />
              </View>
            </View>
          )}
          {/* 额外信息提示 */}
          {membership && membershipComplete && !isValidMembership && (
            <View style={styles.warningSection}>
              <Text style={styles.warningText}>会员信息可能不完整，部分功能可能受限</Text>
            </View>
          )}
        </View>
      ) : (
        <View style={styles.noMembershipContainer}>
          <Text style={styles.noMembershipText}>您还不是会员</Text>
          <Text style={styles.noMembershipSubtext}>兑换会员卡券以解锁更多优质内容</Text>
          <TouchableOpacity 
            style={styles.redeemButton} 
            onPress={onRedeemPress}
            activeOpacity={0.7}
          >
            <Text style={styles.redeemButtonText}>兑换卡券</Text>
          </TouchableOpacity>
        </View>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 16,
    marginHorizontal: 16,
    marginVertical: 8,
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 4,
      },
      android: {
        elevation: 3,
      },
    }),
  },
  loadingContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 200,
  },
  loadingText: {
    marginTop: 12,
    fontSize: 14,
    color: '#6B7280',
  },
  validationBanner: {
    padding: 8,
    borderRadius: 6,
    marginBottom: 12,
  },
  validationText: {
    fontSize: 12,
    textAlign: 'center',
    fontWeight: '500',
  },
  warningSection: {
    marginTop: 16,
    padding: 12,
    backgroundColor: '#FFF3E0',
    borderRadius: 8,
    borderLeftWidth: 4,
    borderLeftColor: '#FF9800',
  },
  warningText: {
    fontSize: 12,
    color: '#E65100',
    textAlign: 'center',
  },
  title: {
    fontSize: 18,
    fontWeight: '600',
    marginBottom: 16,
    color: '#1F2937',
  },
  infoContainer: {
    gap: 12,
  },
  infoRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  label: {
    fontSize: 14,
    color: '#6B7280',
  },
  value: {
    fontSize: 14,
    fontWeight: '500',
    color: '#1F2937',
  },
  tierContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  tierBadge: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  tierText: {
    fontSize: 14,
    fontWeight: '600',
  },
  statusText: {
    fontSize: 14,
    fontWeight: '500',
  },
  expiredText: {
    color: '#EF4444',
    fontWeight: '600',
  },
  progressContainer: {
    marginTop: 16,
    paddingTop: 16,
    borderTopWidth: 1,
    borderTopColor: '#E5E7EB',
  },
  progressHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  progressLabel: {
    fontSize: 12,
    color: '#6B7280',
  },
  progressDays: {
    fontSize: 12,
    color: '#6B7280',
  },
  progressBar: {
    height: 8,
    backgroundColor: '#E5E7EB',
    borderRadius: 4,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    borderRadius: 4,
  },
  noMembershipContainer: {
    alignItems: 'center',
    paddingVertical: 24,
  },
  noMembershipText: {
    fontSize: 16,
    color: '#6B7280',
    marginBottom: 8,
  },
  noMembershipSubtext: {
    fontSize: 14,
    color: '#9CA3AF',
    marginBottom: 16,
  },
  redeemButton: {
    backgroundColor: '#3B82F6',
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 8,
  },
  redeemButtonText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '500',
  },
});

export default MembershipInfoCard;
