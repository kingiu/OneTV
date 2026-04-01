import React, { useState, useRef, useEffect } from "react";
import { Modal, View, TextInput, StyleSheet, ActivityIndicator, Keyboard, TouchableOpacity } from "react-native";
import Toast from "react-native-toast-message";
import useAuthStore from "@/stores/authStore";
import useMembershipStore from "@/stores/membershipStore";
import { api } from "@/services/api";
import { ThemedView } from "./ThemedView";
import { ThemedText } from "./ThemedText";
import { StyledButton } from "./StyledButton";

const CardLoginModal = () => {
  const { isLoginModalVisible, hideLoginModal, setLoginMode, setLoginStatus } = useAuthStore();
  const { redeemCoupon } = useMembershipStore();
  const [couponCode, setCouponCode] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [isModalReady, setIsModalReady] = useState(false);
  const couponInputRef = useRef<TextInput>(null);

  // Focus management
  useEffect(() => {
    if (isLoginModalVisible) {
      // 先确保键盘状态清理
      Keyboard.dismiss();

      // 延迟设置 Modal 就绪状态
      const readyTimeout = setTimeout(() => {
        setIsModalReady(true);
      }, 300);

      return () => {
        clearTimeout(readyTimeout);
        setIsModalReady(false);
      };
    }
  }, [isLoginModalVisible]);

  // Focus input when modal is ready
  useEffect(() => {
    if (isModalReady && isLoginModalVisible) {
      const focusTimeout = setTimeout(() => {
        couponInputRef.current?.focus();
      }, 300);

      return () => clearTimeout(focusTimeout);
    }
  }, [isModalReady, isLoginModalVisible]);

  // 清理 effect
  useEffect(() => {
    return () => {
      Keyboard.dismiss();
      setIsModalReady(false);
    };
  }, []);

  const handleRedeemCoupon = async () => {
    if (!couponCode.trim()) {
      Toast.show({ type: "error", text1: "请输入卡券代码" });
      return;
    }
    
    setIsLoading(true);
    try {
      console.log('开始卡券登录流程，卡券代码:', couponCode.trim());
      
      // 使用专门的卡券登录API
      const result = await api.cardLogin(couponCode.trim());
      
      if (result.success) {
        console.log('卡券登录成功:', result);
        Toast.show({ 
          type: "success", 
          text1: "卡券登录成功",
          text2: result.message 
        });
        // 卡券登录成功后，保存用户名到LoginCredentialsManager
        if (result.username) {
          await import("@/services/storage").then(module => 
            module.LoginCredentialsManager.save({ username: result.username, password: "" })
          );
        }
        // 设置登录状态为已登录
        setLoginStatus(true);
        setIsModalReady(false);
        Keyboard.dismiss();
      } else {
        console.log('卡券登录失败:', result);
        Toast.show({ 
          type: "error", 
          text1: "卡券登录失败",
          text2: result.message 
        });
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : "请检查网络连接";
      console.error('卡券登录异常:', error);
      
      let displayMessage = errorMessage;
      if (errorMessage === "UNAUTHORIZED") {
        displayMessage = "卡券代码无效或已过期";
      } else if (errorMessage === "API_URL_NOT_SET") {
        displayMessage = "服务器地址未设置，请检查网络连接";
      } else if (errorMessage.includes("Network")) {
        displayMessage = "网络连接失败，请检查网络设置";
      }
      
      Toast.show({ 
        type: "error", 
        text1: "卡券登录失败",
        text2: displayMessage 
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Modal
      transparent={true}
      visible={isLoginModalVisible}
      animationType="fade"
      onRequestClose={hideLoginModal}
    >
      <View style={styles.overlay}>
        <ThemedView style={styles.container}>
          <ThemedText style={styles.title}>卡券登录</ThemedText>
          <ThemedText style={styles.subtitle}>使用卡券代码兑换会员权限</ThemedText>
          
          <TextInput
            ref={couponInputRef}
            style={styles.input}
            placeholder="请输入卡券代码"
            placeholderTextColor="#888"
            value={couponCode}
            onChangeText={setCouponCode}
            returnKeyType="go"
            onSubmitEditing={handleRedeemCoupon}
            autoCapitalize="characters"
          />
          
          <StyledButton
            text={isLoading ? "" : "兑换卡券"}
            onPress={handleRedeemCoupon}
            disabled={isLoading}
            style={styles.button}
            hasTVPreferredFocus
          >
            {isLoading && <ActivityIndicator color="#fff" />}
          </StyledButton>
          
          <ThemedText style={styles.hint}>
            卡券代码区分大小写，请确保输入正确
          </ThemedText>
          <TouchableOpacity
            style={styles.switchButton}
            onPress={() => setLoginMode('password')}
          >
            <ThemedText style={styles.switchText}>使用密码登录</ThemedText>
          </TouchableOpacity>
        </ThemedView>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: "rgba(0, 0, 0, 0.6)",
    justifyContent: "center",
    alignItems: "center",
  },
  container: {
    width: "80%",
    maxWidth: 400,
    padding: 32,
    borderRadius: 16,
    alignItems: "center",
  },
  title: {
    fontSize: 28,
    fontWeight: "900",
    marginBottom: 12,
    letterSpacing: -0.05,
  },
  subtitle: {
    fontSize: 16,
    color: "#ccc",
    marginBottom: 32,
    textAlign: "center",
    lineHeight: 22,
  },
  input: {
    width: "100%",
    height: 60,
    backgroundColor: "#333",
    borderRadius: 12,
    paddingHorizontal: 20,
    color: "#fff",
    fontSize: 18,
    marginBottom: 24,
    borderWidth: 2,
    borderColor: "#555",
  },
  button: {
    width: "100%",
    height: 56,
    marginBottom: 16,
  },
  hint: {
    fontSize: 14,
    color: "#888",
    textAlign: "center",
  },
  switchButton: {
    marginTop: 16,
    paddingVertical: 12,
  },
  switchText: {
    fontSize: 14,
    color: "#007AFF",
    textDecorationLine: "underline",
  },
});

export default CardLoginModal;