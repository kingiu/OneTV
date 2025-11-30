import React, { useState, useRef, useEffect } from "react";
import { Modal, View, TextInput, StyleSheet, ActivityIndicator, Alert, Keyboard, InteractionManager, TouchableOpacity } from "react-native";
import { usePathname } from "expo-router";
import Toast from "react-native-toast-message";
import useAuthStore from "@/stores/authStore";
import { useSettingsStore } from "@/stores/settingsStore";
import useHomeStore from "@/stores/homeStore";
import { api } from "@/services/api";
import { LoginCredentialsManager } from "@/services/storage";
import { ThemedView } from "./ThemedView";
import { ThemedText } from "./ThemedText";

const LoginModal = () => {
  const { isLoginModalVisible, hideLoginModal, checkLoginStatus } = useAuthStore();
  const { serverConfig, apiBaseUrl } = useSettingsStore();
  const { refreshPlayRecords } = useHomeStore();
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [cardCode, setCardCode] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [loginMode, setLoginMode] = useState<"password" | "card">('password');
  const usernameInputRef = useRef<TextInput>(null);
  const passwordInputRef = useRef<TextInput>(null);
  const cardCodeInputRef = useRef<TextInput>(null);
  const pathname = usePathname();
  const isSettingsPage = pathname.includes("settings");

  const [isModalReady, setIsModalReady] = useState(false);

  // Load saved credentials when modal opens
  useEffect(() => {
    if (isLoginModalVisible && !isSettingsPage) {
            // 先确保键盘状态清理
      Keyboard.dismiss();

      const loadCredentials = async () => {
        const savedCredentials = await LoginCredentialsManager.get();
        if (savedCredentials) {
          setUsername(savedCredentials.username);
          setPassword(savedCredentials.password);
        }
      };
      loadCredentials();

      // 延迟设置 Modal 就绪状态
      const readyTimeout = setTimeout(() => {
        setIsModalReady(true);
      }, 300);

      return () => {
        clearTimeout(readyTimeout);
        setIsModalReady(false);
      };
    }
  }, [isLoginModalVisible, isSettingsPage]);

  // Focus management with better TV remote handling
  useEffect(() => {
    if (isModalReady && isLoginModalVisible && !isSettingsPage) {
      // Use a small delay to ensure the modal is fully rendered
      const focusTimeout = setTimeout(() => {
        if (loginMode === 'password') {
          const isUsernameVisible = serverConfig?.StorageType !== "localstorage";
          if (isUsernameVisible) {
            usernameInputRef.current?.focus();
          } else {
            passwordInputRef.current?.focus();
          }
        } else {
          cardCodeInputRef.current?.focus();
        }
      }, 300);

      return () => clearTimeout(focusTimeout);
    }
  }, [isModalReady, isLoginModalVisible, serverConfig, isSettingsPage, loginMode]);

  // 清理 effect - 确保 Modal 关闭时清理所有状态
  useEffect(() => {
    return () => {
      Keyboard.dismiss();
      setIsModalReady(false);
    };
  }, []);

  const handleLogin = async () => {
    if (loginMode === 'password') {
      const isLocalStorage = serverConfig?.StorageType === "localstorage";
      if (!password || (!isLocalStorage && !username)) {
        Toast.show({ type: "error", text1: "请输入用户名和密码" });
        return;
      }
      setIsLoading(true);
      try {
        await api.login(isLocalStorage ? undefined : username, password);
        await checkLoginStatus(apiBaseUrl);
        await refreshPlayRecords();

        // Save credentials on successful login
        await LoginCredentialsManager.save({ username, password });

        Toast.show({ type: "success", text1: "登录成功" });

        // 在登录成功后清理状态，再显示 Alert
        const hideAndAlert = () => {
          hideLoginModal();
          setIsModalReady(false);
          Keyboard.dismiss();

          setTimeout(() => {
            Alert.alert(
              "免责声明",
              "本应用仅提供影视信息搜索服务，所有内容均来自第三方网站。本站不存储任何视频资源，不对任何内容的准确性、合法性、完整性负责。",
              [{ text: "确定" }]
            );
          }, 100);
        };

        // 使用 InteractionManager 确保 UI 稳定后再执行
        InteractionManager.runAfterInteractions(hideAndAlert);

      } catch (error) {
        Toast.show({
          type: "error",
          text1: "登录失败",
          text2: error instanceof Error ? error.message : "用户名或密码错误",
        });
      } finally {
        setIsLoading(false);
      }
    } else {
      // 卡券登录
      if (!cardCode) {
        Toast.show({ type: "error", text1: "请输入卡券码" });
        return;
      }
      
      // 卡券格式验证：清理后必须是12位大写字母和数字
      const cleanedCode = cardCode.replace(/[^A-Z0-9]/g, '').toUpperCase();
      if (cleanedCode.length !== 12) {
        Toast.show({ type: "error", text1: "卡券码格式不正确", text2: "请输入12位大写字母和数字组合" });
        return;
      }
      
      // 验证卡券码只包含大写字母和数字
      const couponPattern = /^[A-Z0-9]{12}$/;
      if (!couponPattern.test(cleanedCode)) {
        Toast.show({ type: "error", text1: "卡券码格式不正确", text2: "请输入12位大写字母和数字组合" });
        return;
      }
      
      setIsLoading(true);
      try {
        const result = await api.loginWithCard(cleanedCode);
        await checkLoginStatus(apiBaseUrl);
        await refreshPlayRecords();

        Toast.show({ 
          type: result.success ? "success" : "error", 
          text1: result.success ? "卡券登录成功" : "卡券登录失败",
          text2: result.message || (result.success ? 
            (result.redeemMessage || "卡券自动兑换成功") : 
            "卡券码无效或已过期")
        });
        
        // 打印详细的响应信息用于调试
        console.debug('卡券登录响应:', {
          success: result.success,
          message: result.message,
          username: result.username,
          redeemSuccess: result.redeemSuccess,
          redeemMessage: result.redeemMessage,
          cardStatus: result.cardStatus,
          testMode: result.testMode,
          data: result.data
        });

        // 在登录成功后清理状态，再显示 Alert
        if (result.success) {
          const hideAndAlert = () => {
            hideLoginModal();
            setIsModalReady(false);
            Keyboard.dismiss();

            setTimeout(() => {
              Alert.alert(
                "免责声明",
                "本应用仅提供影视信息搜索服务，所有内容均来自第三方网站。本站不存储任何视频资源，不对任何内容的准确性、合法性、完整性负责。",
                [{ text: "确定" }]
              );
            }, 100);
          };

          // 使用 InteractionManager 确保 UI 稳定后再执行
          InteractionManager.runAfterInteractions(hideAndAlert);
        }

      } catch (error) {
        Toast.show({
          type: "error",
          text1: "卡券登录失败",
          text2: error instanceof Error ? error.message : "卡券码无效或已过期",
        });
      } finally {
        setIsLoading(false);
      }
    }
  };

  // Handle navigation between inputs using returnKeyType
  const handleUsernameSubmit = () => {
    passwordInputRef.current?.focus();
  };

  // Toggle login mode between password and card
  const toggleLoginMode = () => {
    setLoginMode(prevMode => prevMode === 'password' ? 'card' : 'password');
    // Clear inputs when switching modes
    if (loginMode === 'password') {
      setCardCode('');
    } else {
      setUsername('');
      setPassword('');
    }
  };

  return (
    <Modal
      transparent={true}
      visible={isLoginModalVisible && !isSettingsPage}
      animationType="fade"
      onRequestClose={hideLoginModal}
    >
      <View style={styles.overlay}>
        <ThemedView style={styles.container}>
          <ThemedText style={styles.title}>需要登录</ThemedText>
          <ThemedText style={styles.subtitle}>服务器需要验证您的身份</ThemedText>
          
          {/* 登录方式切换按钮 */}
          <TouchableOpacity
            onPress={toggleLoginMode}
            style={styles.toggleButton}
          >
            <ThemedText style={styles.toggleButtonText}>
              {loginMode === 'password' ? '使用卡券登录' : '使用账号密码登录'}
            </ThemedText>
          </TouchableOpacity>
          
          {/* 密码登录方式 */}
          {loginMode === 'password' ? (
            <>
              {serverConfig?.StorageType !== "localstorage" && (
                <TextInput
                  ref={usernameInputRef}
                  style={styles.input}
                  placeholder="请输入用户名"
                  placeholderTextColor="#888"
                  value={username}
                  onChangeText={setUsername}
                  returnKeyType="next"
                  onSubmitEditing={handleUsernameSubmit}
                  blurOnSubmit={false}
                />
              )}
              <TextInput
                ref={passwordInputRef}
                style={styles.input}
                placeholder="请输入密码"
                placeholderTextColor="#888"
                secureTextEntry
                value={password}
                onChangeText={setPassword}
                returnKeyType="go"
                onSubmitEditing={handleLogin}
              />
            </>
          ) : (
            /* 卡券登录方式 */
            <TextInput
              ref={cardCodeInputRef}
              style={styles.input}
              placeholder="请输入卡券码"
              placeholderTextColor="#888"
              value={cardCode}
              onChangeText={(text) => {
                // 自动清理卡券码：移除分隔符，转为大写
                const cleanedText = text.replace(/[^A-Z0-9]/g, '').toUpperCase();
                setCardCode(cleanedText);
              }}
              returnKeyType="go"
              onSubmitEditing={handleLogin}
              autoCapitalize="characters"
              autoCorrect={false}
              maxLength={16} // 允许输入带分隔符的格式，实际会被清理为12位
            />
          )}
          
          <TouchableOpacity
            onPress={handleLogin}
            disabled={isLoading}
            style={[styles.button, isLoading && styles.buttonDisabled]}
          >
            {isLoading ? (
              <ActivityIndicator color="#fff" />
            ) : (
              <ThemedText style={styles.buttonText}>
                {loginMode === 'password' ? '登录' : '兑换卡券'}
              </ThemedText>
            )}
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
    padding: 24,
    borderRadius: 12,
    alignItems: "center",
  },
  title: {
    fontSize: 22,
    fontWeight: "bold",
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 16,
    color: "#ccc",
    marginBottom: 20,
    textAlign: "center",
  },
  toggleButton: {
    marginBottom: 16,
    padding: 8,
  },
  toggleButtonText: {
    fontSize: 14,
    color: "#00bb5e",
    textDecorationLine: "underline",
  },
  input: {
    width: "100%",
    height: 50,
    backgroundColor: "#333",
    borderRadius: 8,
    paddingHorizontal: 16,
    color: "#fff",
    fontSize: 16,
    marginBottom: 20,
    borderWidth: 1,
    borderColor: "#555",
  },
  button: {
    width: "100%",
    height: 50,
    backgroundColor: "#00bb5e",
    borderRadius: 8,
    justifyContent: "center",
    alignItems: "center",
  },
  buttonDisabled: {
    opacity: 0.6,
  },
  buttonText: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "600",
  },
});

export default LoginModal;
