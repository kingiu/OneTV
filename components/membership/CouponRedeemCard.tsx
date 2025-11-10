import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  Platform,
  Alert
} from 'react-native';
import { Colors } from '@/constants/Colors';
import { membershipStore } from '../../stores/membershipStore';

interface CouponRedeemCardProps {
  onSuccess?: () => void;
}

const CouponRedeemCard: React.FC<CouponRedeemCardProps> = ({ onSuccess }) => {
  const [couponCode, setCouponCode] = useState('');
  const [isRedeeming, setIsRedeeming] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const handleRedeemCoupon = async () => {
    if (!couponCode.trim()) {
      console.debug('兑换卡券: 未输入卡券码');
      setError('请输入卡券码');
      return;
    }

    // 卡券码格式验证 (12位字母数字组合)
    const couponPattern = /^[A-Z0-9]{12}$/;
    if (!couponPattern.test(couponCode.trim())) {
      console.debug('兑换卡券: 卡券码格式不正确', { code: couponCode });
      setError('卡券码格式不正确，请输入12位字母数字组合');
      return;
    }

    try {
      setIsRedeeming(true);
      setError(null);
      setSuccess(null);

      console.debug('兑换卡券: 开始兑换', { code: couponCode });
      console.debug('兑换卡券: 检查用户登录状态');
      
      // 打印当前store状态
      const currentState = membershipStore.getState();
      console.debug('兑换卡券: 当前store状态', { 
        hasMembershipInfo: !!currentState.membershipInfo,
        membershipInfo: currentState.membershipInfo 
      });
      
      const result = await membershipStore.getState().redeemCoupon(couponCode);
      console.debug('兑换卡券: 兑换结果', JSON.stringify(result, null, 2));
      
      if (result.success) {
        setSuccess(result.message);
        setCouponCode('');
        onSuccess?.();
        // 3秒后清除成功提示
        setTimeout(() => {
          setSuccess(null);
        }, 3000);
      } else {
        setError(result.message);
      }
    } catch (err) {
      console.error('兑换卡券失败:', err);
      // 提供更具体的错误信息
      if (err instanceof Error) {
        if (err.message.includes('Network request failed')) {
          setError('网络请求失败，请检查网络连接');
        } else {
          setError('兑换卡券失败，请稍后重试');
        }
      } else {
        setError('兑换卡券失败，请稍后重试');
      }
    } finally {
      setIsRedeeming(false);
    }
  };

  const handleClearError = () => {
    setError(null);
  };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>兑换优惠券</Text>
      
      {error && (
        <View style={styles.errorContainer}>
          <Text style={styles.errorText}>{error}</Text>
          <TouchableOpacity onPress={handleClearError}>
            <Text style={styles.clearErrorText}>✕</Text>
          </TouchableOpacity>
        </View>
      )}
      
      {success && (
        <View style={styles.successContainer}>
          <Text style={styles.successText}>{success}</Text>
        </View>
      )}
      
      <View style={styles.inputContainer}>
        <Text style={styles.label}>卡券码</Text>
        <TextInput
          style={styles.input}
          value={couponCode}
          onChangeText={(text) => {
            // 自动转换为大写并移除非字母数字字符
            const formattedText = text.toUpperCase().replace(/[^A-Z0-9]/g, '');
            setCouponCode(formattedText);
            setError(null);
          }}
          placeholder="请输入卡券码"
          placeholderTextColor="#9CA3AF"
          editable={!isRedeeming}
          autoCapitalize="characters"
          autoCorrect={false}
          maxLength={12} // 限制最大长度为12位
        />
      </View>
      
      <TouchableOpacity
        style={[
          styles.redeemButton,
          (!couponCode.trim() || isRedeeming) && styles.redeemButtonDisabled
        ]}
        onPress={handleRedeemCoupon}
        disabled={!couponCode.trim() || isRedeeming}
        activeOpacity={0.7}
      >
        {isRedeeming ? (
          <ActivityIndicator color="#FFFFFF" size="small" />
        ) : (
          <Text style={styles.redeemButtonText}>立即兑换</Text>
        )}
      </TouchableOpacity>
      
      <View style={styles.benefitsContainer}>
        <Text style={styles.benefitsTitle}>会员特权</Text>
        <View style={styles.benefitsList}>
          <BenefitItem text="解锁高级视频资源" />
          <BenefitItem text="无广告观影体验" />
          <BenefitItem text="高清画质优先访问" />
          <BenefitItem text="专属客服支持" />
        </View>
      </View>
    </View>
  );
};

// 会员特权项组件
const BenefitItem: React.FC<{ text: string }> = ({ text }) => (
  <View style={styles.benefitItem}>
    <View style={styles.checkmark}>
      <Text style={styles.checkmarkText}>✓</Text>
    </View>
    <Text style={styles.benefitText}>{text}</Text>
  </View>
);

const styles = StyleSheet.create({
  container: {
    backgroundColor: '#2c2c2e',
    borderRadius: 16,
    padding: 20,
    marginHorizontal: 16,
    marginVertical: 8,
    borderWidth: 1,
    borderColor: Colors.dark.border,
  },
  title: {
    fontSize: 20,
    fontWeight: '600',
    color: Colors.dark.text,
    marginBottom: 16,
  },
  errorContainer: {
    backgroundColor: 'rgba(220, 38, 38, 0.1)',
    padding: 12,
    borderRadius: 8,
    marginBottom: 16,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  errorText: {
    color: '#DC2626',
    fontSize: 14,
    flex: 1,
  },
  clearErrorText: {
    color: 'rgba(255, 255, 255, 0.5)',
    fontSize: 18,
    fontWeight: '500',
    marginLeft: 8,
  },
  successContainer: {
    backgroundColor: 'rgba(22, 163, 74, 0.1)',
    padding: 12,
    borderRadius: 8,
    marginBottom: 16,
  },
  successText: {
    color: '#22C55E',
    fontSize: 14,
    textAlign: 'center',
  },
  inputContainer: {
    marginBottom: 16,
  },
  label: {
    fontSize: 14,
    fontWeight: '500',
    color: 'rgba(255, 255, 255, 0.7)',
    marginBottom: 8,
  },
  input: {
    height: 48,
    borderWidth: 1,
    borderColor: Colors.dark.border,
    borderRadius: 8,
    paddingHorizontal: 16,
    paddingVertical: 12,
    fontSize: 16,
    color: Colors.dark.text,
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    ...Platform.select({
      ios: {
        paddingVertical: 12,
      },
    }),
  },
  redeemButton: {
    backgroundColor: Colors.dark.primary,
    height: 48,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 24,
  },
  redeemButtonDisabled: {
    backgroundColor: 'rgba(0, 187, 94, 0.5)',
  },
  redeemButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '500',
  },
  benefitsContainer: {
    borderTopWidth: 1,
    borderTopColor: Colors.dark.border,
    paddingTop: 16,
  },
  benefitsTitle: {
    fontSize: 14,
    fontWeight: '500',
    color: Colors.dark.text,
    marginBottom: 12,
  },
  benefitsList: {
    gap: 8,
  },
  benefitItem: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 8,
  },
  checkmark: {
    width: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: Colors.dark.primary,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 1,
  },
  checkmarkText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '600',
  },
  benefitText: {
    fontSize: 14,
    color: 'rgba(255, 255, 255, 0.7)',
    flex: 1,
  },
});

export default CouponRedeemCard;
