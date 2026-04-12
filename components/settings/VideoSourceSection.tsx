import React, { useState, useCallback } from "react";
import { StyleSheet, Switch, FlatList, Pressable, Animated, View, TouchableOpacity } from "react-native";
import { useTVEventHandler } from "react-native";
import { ThemedText } from "@/components/ThemedText";
import { SettingsSection } from "./SettingsSection";
import { useSettingsStore } from "@/stores/settingsStore";
import useSourceStore, { useSources } from "@/stores/sourceStore";
import { FontAwesome } from "@expo/vector-icons";

interface VideoSourceSectionProps {
  onChanged: () => void;
  onFocus?: () => void;
  onBlur?: () => void;
}

export const VideoSourceSection: React.FC<VideoSourceSectionProps> = ({ onChanged, onFocus, onBlur }) => {
  const [focusedIndex, setFocusedIndex] = useState<number | null>(null);
  const [isSectionFocused, setIsSectionFocused] = useState(false);
  const { videoSource, sourceWeights, setSourceWeight } = useSettingsStore();
  const resources = useSources();
  const { toggleResourceEnabled } = useSourceStore();

  const handleToggle = useCallback(
    (resourceKey: string) => {
      toggleResourceEnabled(resourceKey);
      onChanged();
    },
    [onChanged, toggleResourceEnabled]
  );

  const handleWeightChange = useCallback(
    (resourceKey: string, weight: number) => {
      setSourceWeight(resourceKey, weight);
      onChanged();
    },
    [onChanged, setSourceWeight]
  );

  const handleSectionFocus = () => {
    setIsSectionFocused(true);
    onFocus?.();
  };

  const handleSectionBlur = () => {
    setIsSectionFocused(false);
    setFocusedIndex(null);
    onBlur?.();
  };

  // TV遥控器事件处理
  const handleTVEvent = useCallback(
    (event: any) => {
      if (event.eventType === "select") {
        if (focusedIndex !== null) {
          const resource = resources[focusedIndex];
          if (resource) {
            handleToggle(resource.source);
          }
        } else if (isSectionFocused) {
          setFocusedIndex(0);
        }
      }
    },
    [isSectionFocused, focusedIndex, resources, handleToggle]
  );

  useTVEventHandler(handleTVEvent);

  const renderResourceItem = ({ item, index }: { item: { source: string; source_name: string }; index: number }) => {
    const isEnabled = videoSource.enabledAll || videoSource.sources[item.source];
    const isFocused = focusedIndex === index;
    const weight = sourceWeights[item.source] ?? 50;

    return (
      <Animated.View style={[styles.resourceItem]}>
        <Pressable
          hasTVPreferredFocus={isFocused}
          style={[styles.resourcePressable, isFocused && styles.resourceFocused]}
          onFocus={() => setFocusedIndex(index)}
          onBlur={() => setFocusedIndex(null)}
        >
          <View style={styles.resourceHeader}>
            <ThemedText style={styles.resourceName}>{item.source_name}</ThemedText>
            <Switch
              value={isEnabled}
              onValueChange={() => {}} // 禁用Switch的直接交互
              trackColor={{ false: "#767577", true: "#34C759" }}
              thumbColor={isEnabled ? "#ffffff" : "#f4f3f4"}
              pointerEvents="none"
            />
          </View>
          <View style={styles.weightContainer}>
            <ThemedText style={styles.weightLabel}>优先级</ThemedText>
            <TouchableOpacity
              style={styles.weightButton}
              onPress={() => handleWeightChange(item.source, Math.max(0, weight - 10))}
            >
              <FontAwesome name="minus" size={12} color="#fff" />
            </TouchableOpacity>
            <ThemedText style={styles.weightValue}>{weight}</ThemedText>
            <TouchableOpacity
              style={styles.weightButton}
              onPress={() => handleWeightChange(item.source, Math.min(100, weight + 10))}
            >
              <FontAwesome name="plus" size={12} color="#fff" />
            </TouchableOpacity>
          </View>
        </Pressable>
      </Animated.View>
    );
  };

  return (
    <SettingsSection focusable onFocus={handleSectionFocus} onBlur={handleSectionBlur}>
      <ThemedText style={styles.sectionTitle}>播放源配置</ThemedText>
      <ThemedText style={styles.sectionDescription}>
        权重越高，自动选择时优先级越高。系统会根据权重、清晰度和速度综合选择最佳播放源。
      </ThemedText>

      {resources.length > 0 && (
        <FlatList
          data={resources}
          renderItem={renderResourceItem}
          keyExtractor={(item) => item.source}
          numColumns={2}
          columnWrapperStyle={styles.row}
          contentContainerStyle={styles.flatListContainer}
          scrollEnabled={false}
        />
      )}
    </SettingsSection>
  );
};

const styles = StyleSheet.create({
  sectionTitle: {
    fontSize: 20,
    fontWeight: "bold",
    marginBottom: 8,
  },
  sectionDescription: {
    fontSize: 12,
    color: "#888",
    marginBottom: 16,
  },
  flatListContainer: {
    gap: 12,
  },
  row: {
    justifyContent: "flex-start",
  },
  resourceItem: {
    width: "48%",
    marginHorizontal: 4,
    marginVertical: 6,
    borderRadius: 8,
    overflow: "hidden",
    justifyContent: "flex-start",
  },
  resourcePressable: {
    paddingVertical: 12,
    paddingHorizontal: 16,
    backgroundColor: "#2a2a2a",
    borderRadius: 8,
    minHeight: 100,
  },
  resourceFocused: {
    backgroundColor: "#3a3a3c",
    borderWidth: 2,
    borderColor: "#34C759",
    shadowColor: "#34C759",
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.8,
    shadowRadius: 10,
    elevation: 5,
  },
  resourceHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 8,
  },
  resourceName: {
    fontSize: 14,
    fontWeight: "600",
    flex: 1,
    marginRight: 8,
  },
  weightContainer: {
    flexDirection: "row",
    alignItems: "center",
    marginTop: 4,
  },
  weightLabel: {
    fontSize: 12,
    color: "#888",
    marginRight: 8,
    width: 50,
  },
  weightButton: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: "#444",
    justifyContent: "center",
    alignItems: "center",
    marginHorizontal: 4,
  },
  weightValue: {
    fontSize: 14,
    color: "#34C759",
    width: 30,
    textAlign: "center",
    fontWeight: "bold",
  },
});
