import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  KeyboardAvoidingView,
  Platform,
  ActivityIndicator,
} from 'react-native';
import { useTVRemoteHandler } from 'react-native-tvos';
import { useCardStore } from '@/stores/cardStore';

interface CouponRedeemProps {
  onSuccess?: () => void;
  onCancel?: () => void;
}

export function CouponRedeem({ onSuccess, onCancel }: CouponRedeemProps) {
  const [code, setCode] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const { redeemCoupon, error, clearError } = useCardStore();

  const handleSubmit = async () => {
    if (!code.trim()) {
      return;
    }

    setIsSubmitting(true);
    clearError();

    try {
      const result = await redeemCoupon(code.trim());
      if (result.success) {
        onSuccess?.();
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleCancel = () => {
    setCode('');
    clearError();
    onCancel?.();
  };

  useTVEventHandler((event: any) => {
    if (event.eventType === 'select') {
      handleSubmit();
    } else if (event.eventType === 'back') {
      handleCancel();
    }
  });

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      <View style={styles.content}>
        <Text style={styles.title}>兑换卡券</Text>
        <Text style={styles.subtitle}>请输入12位卡券码</Text>

        <TextInput
          style={styles.input}
          value={code}
          onChangeText={setCode}
          placeholder="输入卡券码"
          placeholderTextColor="#666"
          autoCapitalize="characters"
          autoCorrect={false}
          maxLength={12}
          editable={!isSubmitting}
          selectTextOnFocus
        />

        {error && (
          <Text style={styles.errorText}>{error}</Text>
        )}

        <View style={styles.buttonContainer}>
          <TouchableOpacity
            style={[styles.button, styles.cancelButton]}
            onPress={handleCancel}
            disabled={isSubmitting}
          >
            <Text style={styles.cancelButtonText}>取消</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.button, styles.submitButton, !code.trim() && styles.disabledButton]}
            onPress={handleSubmit}
            disabled={isSubmitting || !code.trim()}
          >
            {isSubmitting ? (
              <ActivityIndicator color="#fff" />
            ) : (
              <Text style={styles.submitButtonText}>兑换</Text>
            )}
          </TouchableOpacity>
        </View>

        <Text style={styles.hintText}>
          卡券码由12位字符组成，不包含易混淆字符
        </Text>
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.9)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  content: {
    backgroundColor: '#1a1a1a',
    borderRadius: 16,
    padding: 48,
    width: '80%',
    maxWidth: 800,
    borderWidth: 2,
    borderColor: '#333',
  },
  title: {
    color: '#fff',
    fontSize: 52,
    fontWeight: 'bold',
    textAlign: 'center',
    marginBottom: 16,
  },
  subtitle: {
    color: '#999',
    fontSize: 31,
    textAlign: 'center',
    marginBottom: 40,
  },
  input: {
    backgroundColor: '#2a2a2a',
    color: '#fff',
    fontSize: 42,
    fontWeight: '600',
    padding: 24,
    borderRadius: 12,
    borderWidth: 2,
    borderColor: '#444',
    textAlign: 'center',
    letterSpacing: 8,
    marginBottom: 24,
    minHeight: 100,
  },
  errorText: {
    color: '#ff4444',
    fontSize: 29,
    textAlign: 'center',
    marginBottom: 24,
  },
  buttonContainer: {
    flexDirection: 'row',
    gap: 20,
    marginBottom: 32,
  },
  button: {
    flex: 1,
    paddingVertical: 20,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 100,
  },
  cancelButton: {
    backgroundColor: '#333',
    borderWidth: 2,
    borderColor: '#444',
  },
  cancelButtonText: {
    color: '#fff',
    fontSize: 35,
    fontWeight: '600',
  },
  submitButton: {
    backgroundColor: '#007AFF',
  },
  disabledButton: {
    backgroundColor: '#333',
    opacity: 0.5,
  },
  submitButtonText: {
    color: '#fff',
    fontSize: 35,
    fontWeight: '600',
  },
  hintText: {
    color: '#666',
    fontSize: 25,
    textAlign: 'center',
    lineHeight: 36,
  },
});
