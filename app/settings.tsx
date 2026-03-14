import React, { useState, useEffect, useRef } from "react";
import { View, StyleSheet, Alert, Platform } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useRouter } from "expo-router";
import { ThemedText } from "@/components/ThemedText";
import { ThemedView } from "@/components/ThemedView";
import { StyledButton } from "@/components/StyledButton";
import { useThemeColor } from "@/hooks/useThemeColor";
import { useSettingsStore } from "@/stores/settingsStore";
import { useRemoteControlStore } from "@/stores/remoteControlStore";
import { APIConfigSection } from "@/components/settings/APIConfigSection";
import { LiveStreamSection } from "@/components/settings/LiveStreamSection";
import { RemoteInputSection } from "@/components/settings/RemoteInputSection";
import { UpdateSection } from "@/components/settings/UpdateSection";
import Toast from "react-native-toast-message";
import { useResponsiveLayout } from "@/hooks/useResponsiveLayout";
import { getCommonResponsiveStyles } from "@/utils/ResponsiveStyles";
import ResponsiveNavigation from "@/components/navigation/ResponsiveNavigation";
import ResponsiveHeader from "@/components/navigation/ResponsiveHeader";
import { DeviceUtils } from "@/utils/DeviceUtils";
import { KeyboardAwareScrollView } from 'react-native-keyboard-aware-scroll-view';

export default function SettingsScreen() {
  const router = useRouter();
  const { loadSettings, saveSettings } = useSettingsStore();
  const { lastMessage, targetPage, clearMessage } = useRemoteControlStore();
  const backgroundColor = useThemeColor({}, "background");
  const insets = useSafeAreaInsets();

  // 响应式布局配置
  const responsiveConfig = useResponsiveLayout();
  const commonStyles = getCommonResponsiveStyles(responsiveConfig);
  const { deviceType, spacing } = responsiveConfig;

  const [hasChanges, setHasChanges] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  const apiSectionRef = useRef<any>(null);
  const liveStreamSectionRef = useRef<any>(null);

  useEffect(() => {
    loadSettings();
  }, [loadSettings]);

  const handleSave = async () => {
    setIsLoading(true);
    try {
      await saveSettings();
      setHasChanges(false);
      Toast.show({
        type: "success",
        text1: "保存成功",
      });
    } catch {
      Alert.alert("错误", "保存设置失败");
    } finally {
      setIsLoading(false);
    }
  };

  const markAsChanged = () => {
    setHasChanges(true);
  };

  const createResponsiveStyles = (deviceType: string, spacing: number, insets: any) => {
    const isMobile = deviceType === "mobile";
    const isTablet = deviceType === "tablet";
    const isTV = deviceType === "tv";
    const minTouchTarget = DeviceUtils.getMinTouchTargetSize();

    return StyleSheet.create({
      container: {
        flex: 1,
        padding: spacing,
        paddingTop: isTV ? spacing * 2 : isMobile ? insets.top + spacing : insets.top + spacing * 1.5,
      },
      header: {
        flexDirection: "row",
        justifyContent: "space-between",
        alignItems: "center",
        marginBottom: spacing,
      },
      title: {
        fontSize: isMobile ? 24 : isTablet ? 28 : 32,
        fontWeight: "bold",
        paddingTop: spacing,
        color: "white",
      },
      scrollView: {
        flex: 1,
      },
      listContent: {
        paddingBottom: spacing,
      },
      footer: {
        paddingTop: spacing,
        alignItems: isMobile ? "center" : "flex-end",
      },
      saveButton: {
        minHeight: isMobile ? minTouchTarget : isTablet ? 50 : 50,
        width: isMobile ? "100%" : isTablet ? 140 : 120,
        maxWidth: isMobile ? 280 : undefined,
      },
      disabledButton: {
        opacity: 0.5,
      },
      itemWrapper: {
        marginBottom: spacing,
      },
    });
  };

  // 动态样式
  const dynamicStyles = createResponsiveStyles(deviceType, spacing, insets);

  const renderSettingsContent = () => (
    <KeyboardAwareScrollView
      enableOnAndroid={true}
      extraScrollHeight={20}
      keyboardOpeningTime={0}
      keyboardShouldPersistTaps="always"
      scrollEnabled={true}
      style={{ flex: 1, backgroundColor }}
    >
      <ThemedView style={[commonStyles.container, dynamicStyles.container]}>
        {deviceType === "tv" && (
          <View style={dynamicStyles.header}>
            <ThemedText style={dynamicStyles.title}>设置</ThemedText>
          </View>
        )}

        <View style={dynamicStyles.scrollView}>
          {deviceType !== "mobile" && (
            <View style={dynamicStyles.itemWrapper}>
              <RemoteInputSection
                onChanged={markAsChanged}
              />
            </View>
          )}
          <View style={dynamicStyles.itemWrapper}>
            <APIConfigSection
              ref={apiSectionRef}
              onChanged={markAsChanged}
              hideDescription={deviceType === "mobile"}
            />
          </View>
          {deviceType !== "mobile" && (
            <View style={dynamicStyles.itemWrapper}>
              <LiveStreamSection
                ref={liveStreamSectionRef}
                onChanged={markAsChanged}
              />
            </View>
          )}
          {Platform.OS === "android" && (
            <View style={dynamicStyles.itemWrapper}>
              <UpdateSection />
            </View>
          )}
        </View>

        <View style={dynamicStyles.footer}>
          <StyledButton
            text={isLoading ? "保存中..." : "保存设置"}
            onPress={handleSave}
            variant="primary"
            disabled={!hasChanges || isLoading}
            style={[dynamicStyles.saveButton, (!hasChanges || isLoading) && dynamicStyles.disabledButton]}
          />
        </View>
      </ThemedView>
    </KeyboardAwareScrollView>
  );

  // 根据设备类型决定是否包装在响应式导航中
  if (deviceType === "tv") {
    return renderSettingsContent();
  }

  return (
    <ResponsiveNavigation>
      <ResponsiveHeader title="设置" showBackButton />
      {renderSettingsContent()}
    </ResponsiveNavigation>
  );
}
