import { useRouter } from "expo-router";
import { Search, QrCode } from "lucide-react-native";
import React, { useState, useRef, useEffect } from "react";
import { View, TextInput, StyleSheet, Alert, Keyboard, TouchableOpacity } from "react-native";

import CustomScrollView from "@/components/CustomScrollView";
import ResponsiveHeader from "@/components/navigation/ResponsiveHeader";
import ResponsiveNavigation from "@/components/navigation/ResponsiveNavigation";
import { RemoteControlModal } from "@/components/RemoteControlModal";
import { StyledButton } from "@/components/StyledButton";
import { ThemedText } from "@/components/ThemedText";
import { ThemedView } from "@/components/ThemedView";
import VideoCard from "@/components/VideoCard";
import VideoLoadingAnimation from "@/components/VideoLoadingAnimation";
import { Colors } from "@/constants/Colors";
import { useResponsiveLayout } from "@/hooks/useResponsiveLayout";
import { api, type SearchResult } from "@/services/api";
import { useRemoteControlStore } from "@/stores/remoteControlStore";
import { useSettingsStore } from "@/stores/settingsStore";
import { useDetailStore } from "@/stores/detailStore";
import { DeviceUtils } from "@/utils/DeviceUtils";
import Logger from '@/utils/Logger';
import { getCommonResponsiveStyles } from "@/utils/ResponsiveStyles";

const logger = Logger.withTag('SearchScreen');

export default function SearchScreen() {
  const [keyword, setKeyword] = useState("");
  const [results, setResults] = useState<SearchResult[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const textInputRef = useRef<TextInput>(null);
  const [isInputFocused, setIsInputFocused] = useState(false);
  const { showModal: showRemoteModal, lastMessage, targetPage, clearMessage } = useRemoteControlStore();
  const { remoteInputEnabled } = useSettingsStore();
  const router = useRouter();

  // 响应式布局配置
  const responsiveConfig = useResponsiveLayout();
  const commonStyles = getCommonResponsiveStyles(responsiveConfig);
  const { deviceType, spacing } = responsiveConfig;

  useEffect(() => {
    if (lastMessage && targetPage === 'search') {
      logger.debug("Received remote input:", lastMessage);
      const realMessage = lastMessage.split("_")[0];
      setKeyword(realMessage);
      handleSearch(realMessage);
      clearMessage(); // Clear the message after processing
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [lastMessage, targetPage]);

  // useEffect(() => {
  //   // Focus the text input when the screen loads
  //   const timer = setTimeout(() => {
  //     textInputRef.current?.focus();
  //   }, 200);
  //   return () => clearTimeout(timer);
  // }, []);

  const handleSearch = async (searchText?: string) => {
    const term = typeof searchText === "string" ? searchText : keyword;
    if (!term.trim()) {
      Keyboard.dismiss();
      return;
    }
    Keyboard.dismiss();
    setLoading(true);
    setError(null);
    try {
      const response = await api.searchVideos(term);
      if (response.results.length > 0) {
        // 聚合相同标题的结果，计算源数量
        const aggregatedResults = aggregateSearchResults(response.results);
        setResults(aggregatedResults);
      } else {
        setError("没有找到相关内容");
      }
    } catch (err) {
      setError("搜索失败，请稍后重试。");
      logger.info("Search failed:", err);
    } finally {
      setLoading(false);
    }
  };

  // 聚合搜索结果，将相同标题和年份的结果合并，使用最高权重源的 poster
  const aggregateSearchResults = (results: SearchResult[]): SearchResult[] => {
    const titleMap = new Map<string, SearchResult & { sourceCount: number; sources: string[]; bestPoster: string }>();
    const { sourceWeights } = useSettingsStore.getState();
    
    // 安全获取后端权重，如果 store 未初始化则使用空对象
    let resourceWeights: { [key: string]: number } = {};
    try {
      resourceWeights = useDetailStore.getState().resourceWeights || {};
    } catch (error) {
      logger.warn(`[SEARCH] Failed to get resourceWeights from detailStore, using empty object`);
    }

    results.forEach(item => {
      const uniqueKey = `${item.title}_${item.year || ''}`;
      // 优先使用后端权重，其次使用前端配置权重，最后使用默认值 50
      const itemWeight = resourceWeights[item.source] ?? sourceWeights[item.source] ?? 50;

      if (titleMap.has(uniqueKey)) {
        // 如果标题 + 年份已存在，增加源数量
        const existingItem = titleMap.get(uniqueKey)!;
        existingItem.sourceCount += 1;
        existingItem.sources.push(item.source);
        
        // 如果当前源的权重更高，更新 poster
        const existingWeight = resourceWeights[existingItem.source] ?? sourceWeights[existingItem.source] ?? 50;
        if (itemWeight > existingWeight && item.poster) {
          existingItem.poster = item.poster;
          existingItem.source = item.source; // 同时更新为最高权重的源
          existingItem.source_name = item.source_name;
        }
      } else {
        // 如果标题 + 年份不存在，创建新条目
        titleMap.set(uniqueKey, {
          ...item,
          sourceCount: 1,
          sources: [item.source],
          bestPoster: item.poster
        });
      }
    });

    // 转换为数组
    const aggregatedArray = Array.from(titleMap.values());

    // 按权重排序：权重高的排在前面
    const sortedResults = aggregatedArray.sort((a, b) => {
      // 优先使用后端权重，其次使用前端配置权重，最后使用默认值 50
      const aSourceWeight = resourceWeights[a.source] ?? sourceWeights[a.source] ?? 50;
      const bSourceWeight = resourceWeights[b.source] ?? sourceWeights[b.source] ?? 50;
      
      return bSourceWeight - aSourceWeight;
    });

    logger.info(`[SEARCH] Aggregated ${results.length} results to ${aggregatedArray.length}, sorted by weight`);
    sortedResults.forEach((r, idx) => {
      const weight = resourceWeights[r.source] ?? sourceWeights[r.source] ?? 50;
      logger.info(`[SEARCH] #${idx + 1}: ${r.title} - source: ${r.source} (${r.source_name}), weight: ${weight}`);
    });

    return sortedResults;
  };

  const onSearchPress = () => handleSearch();

  const handleQrPress = () => {
    if (!remoteInputEnabled) {
      Alert.alert("远程输入未启用", "请先在设置页面中启用远程输入功能", [
        { text: "取消", style: "cancel" },
        { text: "去设置", onPress: () => router.push("/settings") },
      ]);
      return;
    }
    showRemoteModal('search');
  };

  const renderItem = ({ item }: { item: SearchResult & { sourceCount?: number }; index: number }) => (
    <VideoCard
      id={item.id.toString()}
      source={item.source}
      title={item.title}
      poster={item.poster}
      year={item.year}
      sourceName={item.source_name}
      sourceCount={item.sourceCount}
      api={api}
    />
  );

  // 动态样式
  const dynamicStyles = createResponsiveStyles(deviceType, spacing);

  const renderSearchContent = () => (
    <>
      <View style={dynamicStyles.searchContainer}>
        <TouchableOpacity
          activeOpacity={1}
          style={[
            dynamicStyles.inputContainer,
            {
              borderColor: isInputFocused ? Colors.dark.primary : "transparent",
            },
          ]}
          onPress={() => textInputRef.current?.focus()}
        >
          <TextInput
            ref={textInputRef}
            style={dynamicStyles.input}
            placeholder="搜索电影、剧集..."
            placeholderTextColor="#888"
            value={keyword}
            onChangeText={setKeyword}
            onSubmitEditing={onSearchPress}
            onFocus={() => setIsInputFocused(true)}
            onBlur={() => setIsInputFocused(false)}
            returnKeyType="search"
          />
        </TouchableOpacity>
        <StyledButton style={dynamicStyles.searchButton} onPress={onSearchPress}>
          <Search size={deviceType === 'mobile' ? 20 : 24} color="white" />
        </StyledButton>
        {deviceType !== 'mobile' && (
          <StyledButton style={dynamicStyles.qrButton} onPress={handleQrPress}>
            <QrCode size={deviceType === 'tv' ? 24 : 20} color="white" />
          </StyledButton>
        )}
      </View>

      {loading ? (
        <VideoLoadingAnimation showProgressBar={false} />
      ) : error ? (
        <View style={[commonStyles.center, { flex: 1 }]}>
          <ThemedText style={dynamicStyles.errorText}>{error}</ThemedText>
        </View>
      ) : (
        <CustomScrollView
          data={results}
          renderItem={renderItem}
          loading={loading}
          error={error}
          emptyMessage="输入关键词开始搜索"
        />
      )}
      <RemoteControlModal />
    </>
  );

  const content = (
    <ThemedView style={[commonStyles.container, dynamicStyles.container]}>
      {renderSearchContent()}
    </ThemedView>
  );

  // 根据设备类型决定是否包装在响应式导航中
  if (deviceType === 'tv') {
    return content;
  }

  return (
    <ResponsiveNavigation>
      <ResponsiveHeader title="搜索" showBackButton />
      {content}
    </ResponsiveNavigation>
  );
}

const createResponsiveStyles = (deviceType: string, spacing: number) => {
  const isMobile = deviceType === 'mobile';
  const minTouchTarget = DeviceUtils.getMinTouchTargetSize();

  return StyleSheet.create({
    container: {
      flex: 1,
      paddingTop: deviceType === 'tv' ? 50 : 0,
    },
    searchContainer: {
      flexDirection: "row",
      paddingHorizontal: spacing,
      marginBottom: spacing,
      alignItems: "center",
      paddingTop: isMobile ? spacing / 2 : 0,
    },
    inputContainer: {
      flex: 1,
      height: isMobile ? minTouchTarget : 50,
      backgroundColor: "#2c2c2e",
      borderRadius: isMobile ? 8 : 8,
      marginRight: spacing / 2,
      borderWidth: 2,
      borderColor: "transparent",
      justifyContent: "center",
    },
    input: {
      flex: 1,
      paddingHorizontal: spacing,
      color: "white",
      fontSize: isMobile ? 16 : 18,
    },
    searchButton: {
      width: isMobile ? minTouchTarget : 50,
      height: isMobile ? minTouchTarget : 50,
      justifyContent: "center",
      alignItems: "center",
      borderRadius: isMobile ? 8 : 8,
      marginRight: deviceType !== 'mobile' ? spacing / 2 : 0,
    },
    qrButton: {
      width: isMobile ? minTouchTarget : 50,
      height: isMobile ? minTouchTarget : 50,
      justifyContent: "center",
      alignItems: "center",
      borderRadius: isMobile ? 8 : 8,
    },
    errorText: {
      color: "red",
      fontSize: isMobile ? 14 : 16,
      textAlign: "center",
    },
  });
};
