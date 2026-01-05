import React, { useState, useRef, useEffect } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  Platform,
  Alert,
  AccessibilityInfo,
  FocusEvent,
  NativeSyntheticEvent,
  Animated
} from 'react-native';
import { Colors } from '@/constants/Colors';
import { membershipStore } from '../../stores/membershipStore';
import { useResponsiveLayout } from '../../hooks/useResponsiveLayout';

interface CouponRedeemCardProps {
  onSuccess?: () => void;
}

const CouponRedeemCard: React.FC<CouponRedeemCardProps> = ({ onSuccess }) => {
  const { deviceType } = useResponsiveLayout();
  const [couponCode, setCouponCode] = useState('');
  const [isRedeeming, setIsRedeeming] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [isFocused, setIsFocused] = useState(false);
  const [showTvKeyboard, setShowTvKeyboard] = useState(false);
  const [inputWrapperFocused, setInputWrapperFocused] = useState(false);
  const inputRef = useRef<TextInput>(null);
  const redeemButtonRef = useRef<TouchableOpacity>(null);
  
  // 焦点动画
  const inputScale = useRef(new Animated.Value(1)).current;
  const buttonScale = useRef(new Animated.Value(1)).current;
  
  // TV端设备判断
  const isTVDevice = deviceType === 'tv' || Platform.isTV;
  
  // 焦点管理 - 移除了TV键盘显示逻辑
  const handleInputFocus = () => {
    setIsFocused(true);
    setInputWrapperFocused(true);
    if (isTVDevice) {
      // 焦点动画 - 放大
      Animated.spring(inputScale, {
        toValue: 1.05,
        useNativeDriver: true,
      }).start();
    }
  };
  
  const handleInputBlur = () => {
    setIsFocused(false);
    setInputWrapperFocused(false);
    // TV端保留键盘显示，直到用户完成输入
    // 焦点动画 - 恢复
    Animated.spring(inputScale, {
      toValue: 1,
      useNativeDriver: true,
    }).start();
  };
  
  // 焦点导航处理
  const handleRedeemButtonFocus = () => {
    setShowTvKeyboard(false);
    // 按钮焦点动画 - 放大
    Animated.spring(buttonScale, {
      toValue: 1.1,
      useNativeDriver: true,
    }).start();
  };
  
  const handleRedeemButtonBlur = () => {
    // 按钮焦点动画 - 恢复
    Animated.spring(buttonScale, {
      toValue: 1,
      useNativeDriver: true,
    }).start();
  };

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

  // TV键盘处理
  const handleTvKeyPress = (key: string) => {
    if (couponCode.length >= 12) return;
    
    const formattedKey = key.toUpperCase();
    const newCode = couponCode + formattedKey;
    setCouponCode(newCode);
    setError(null);
  };
  
  const handleTvDelete = () => {
    if (couponCode.length > 0) {
      setCouponCode(couponCode.slice(0, -1));
      setError(null);
    }
  };
  
  const handleTvClear = () => {
    setCouponCode('');
    setError(null);
  };
  
  const handleClearError = () => {
    setError(null);
  };
  
  // TV键盘组件 - 移除了"输入卡券码"标题
  const TVKeyboard = () => {
    const keys = ['1', '2', '3', '4', '5', '6', '7', '8', '9', '0', 'A', 'B', 'C', 'D', 'E', 'F', 'G', 'H', 'I', 'J', 'K', 'L', 'M', 'N', 'O', 'P', 'Q', 'R', 'S', 'T', 'U', 'V', 'W', 'X', 'Y', 'Z'];
    
    return (
      <View style={styles.tvKeyboardContainer}>
        {/* 移除了"输入卡券码"标题 */}
        <View style={styles.tvKeyboardGrid}>
          {keys.map((key) => (
            <TouchableOpacity
              key={key}
              style={styles.tvKeyboardKey}
              onPress={() => handleTvKeyPress(key)}
              activeOpacity={0.7}
            >
              <Text style={styles.tvKeyboardKeyText}>{key}</Text>
            </TouchableOpacity>
          ))}
          <TouchableOpacity
            style={styles.tvKeyboardKey}
            onPress={handleTvDelete}
            activeOpacity={0.7}
          >
            <Text style={styles.tvKeyboardKeyText}>删除</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.tvKeyboardKey}
            onPress={handleTvClear}
            activeOpacity={0.7}
          >
            <Text style={styles.tvKeyboardKeyText}>清空</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  };

  return (
    <View style={styles.container}>
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
        <Text style={styles.label}>输入兑换码</Text>
        {/* 使用TouchableOpacity包裹，确保TV端可以点击聚焦 */}
        <TouchableOpacity
          onPress={() => inputRef.current?.focus()}
          activeOpacity={1}
          hasTVPreferredFocus={isTVDevice}
          tvParallaxProperties={isTVDevice ? { magnification: 1.05, shiftDistanceX: 0, shiftDistanceY: 0 } : undefined}
          style={[styles.inputWrapper, inputWrapperFocused && styles.inputWrapperFocused]}
          onFocus={handleInputFocus}
          onBlur={handleInputBlur}
        >
          <Animated.View style={[styles.inputContainerAnimated, { transform: [{ scale: inputScale }] }]}>
            <TextInput
              ref={inputRef}
              style={[
                styles.input,
                isTVDevice && styles.tvInput,
                isFocused && styles.inputFocused
              ]}
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
              onFocus={handleInputFocus}
              onBlur={handleInputBlur}
              accessibilityLabel="卡券码输入框"
              accessibilityHint="请输入12位字母数字组合的卡券码"
            />
          </Animated.View>
        </TouchableOpacity>
        
        {/* 输入提示 */}
        {isTVDevice && (
          <Text style={styles.tvInputHint}>
            当前输入: {couponCode} ({couponCode.length}/12)
          </Text>
        )}
      </View>
      
      <Animated.View style={{ transform: [{ scale: buttonScale }] }}>
        <TouchableOpacity
          ref={redeemButtonRef}
          style={[
            styles.redeemButton,
            (!couponCode.trim() || isRedeeming) && styles.redeemButtonDisabled,
            isTVDevice && styles.tvRedeemButton
          ]}
          onPress={handleRedeemCoupon}
          disabled={!couponCode.trim() || isRedeeming}
          activeOpacity={0.7}
          onFocus={handleRedeemButtonFocus}
          onBlur={handleRedeemButtonBlur}
          // TV端焦点管理
          hasTVPreferredFocus={!isTVDevice}
          tvParallaxProperties={isTVDevice ? { magnification: 1.1, shiftDistanceX: 0, shiftDistanceY: 0 } : undefined}
          accessibilityLabel="立即兑换按钮"
          accessibilityHint="点击兑换卡券"
        >
          {isRedeeming ? (
            <ActivityIndicator color="#FFFFFF" size={isTVDevice ? "large" : "small"} />
          ) : (
            <Text style={[styles.redeemButtonText, isTVDevice && styles.tvButtonText]}>立即兑换</Text>
          )}
        </TouchableOpacity>
      </Animated.View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    backgroundColor: 'transparent',
    borderRadius: Platform.isTV ? 0 : 16,
    padding: Platform.isTV ? 0 : 20,
    marginHorizontal: Platform.isTV ? 0 : 16,
    marginVertical: Platform.isTV ? 0 : 8,
    borderWidth: 0,
    borderColor: 'transparent',
  },
  errorContainer: {
    backgroundColor: 'rgba(220, 38, 38, 0.1)',
    padding: 16,
    borderRadius: 12,
    marginBottom: 24,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  errorText: {
    color: '#DC2626',
    fontSize: 16,
    flex: 1,
  },
  clearErrorText: {
    color: 'rgba(255, 255, 255, 0.5)',
    fontSize: 20,
    fontWeight: '500',
    marginLeft: 12,
  },
  successContainer: {
    backgroundColor: 'rgba(22, 163, 74, 0.1)',
    padding: 16,
    borderRadius: 12,
    marginBottom: 24,
  },
  successText: {
    color: '#22C55E',
    fontSize: 16,
    textAlign: 'center',
  },
  inputContainer: {
    marginBottom: 24,
  },
  label: {
    fontSize: 20,
    fontWeight: '500',
    color: '#FFFFFF',
    marginBottom: 12,
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
  // 输入框选中状态样式
  inputFocused: {
    borderColor: '#F3D58E',
    borderWidth: 2,
    shadowColor: '#F3D58E',
    shadowOffset: {
      width: 0,
      height: 0,
    },
    shadowOpacity: 0.4,
    shadowRadius: 10,
    elevation: 8,
  },
  // TV端输入框样式
  tvInput: {
    height: 64,
    fontSize: 24,
    paddingHorizontal: 24,
    borderRadius: 12,
    borderWidth: 2,
    borderColor: '#3B82F6',
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    color: '#FFFFFF',
    shadowColor: 'rgba(59, 130, 246, 0.4)',
    shadowOffset: {
      width: 0,
      height: 0,
    },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 4,
  },
  // TV端输入提示
  tvInputHint: {
    fontSize: 16,
    color: 'rgba(255, 255, 255, 0.5)',
    marginTop: 8,
    marginLeft: 8,
  },
  // 输入框包裹容器，用于TV端聚焦
  inputWrapper: {
    borderRadius: 12,
    borderWidth: 2,
    borderColor: '#F3D58E',
    overflow: 'hidden',
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    shadowColor: '#F3D58E',
    shadowOffset: {
      width: 0,
      height: 0,
    },
    shadowOpacity: 0.4,
    shadowRadius: 10,
    elevation: 6,
  },
  // 输入框包裹容器聚焦样式
  inputWrapperFocused: {
    borderColor: '#F3D58E', // 金色边框
    boxShadow: '0 0 15px rgba(243, 213, 142, 0.6)',
    backgroundColor: 'rgba(255, 255, 255, 0.15)',
  },
  // 输入框容器动画
  inputContainerAnimated: {
    // 用于包裹输入框，实现缩放动画
  },
  // TV端兑换按钮样式
  tvRedeemButton: {
    height: 72,
    borderRadius: 12,
    paddingHorizontal: 60,
    backgroundColor: '#3B82F6',
    borderWidth: 2,
    borderColor: '#F3D58E',
    shadowColor: '#F3D58E',
    shadowOffset: {
      width: 0,
      height: 0,
    },
    shadowOpacity: 0.4,
    shadowRadius: 10,
    elevation: 8,
  },
  redeemButton: {
    backgroundColor: '#3B82F6',
    height: 48,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 24,
  },
  redeemButtonDisabled: {
    backgroundColor: 'rgba(59, 130, 246, 0.5)',
    borderColor: 'transparent',
    shadowOpacity: 0,
    elevation: 0,
  },
  redeemButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '500',
  },
  // TV端按钮文字
  tvButtonText: {
    fontSize: 24,
    fontWeight: '700',
    color: '#FFFFFF',
    textShadowColor: 'rgba(0, 0, 0, 0.2)',
    textShadowOffset: {
      width: 0,
      height: 2,
    },
    textShadowRadius: 4,
  },
});

export default CouponRedeemCard;
