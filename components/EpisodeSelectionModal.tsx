import React, { useState, useRef, useEffect } from "react";
import { View, Text, StyleSheet, Modal, FlatList } from "react-native";
import { StyledButton } from "./StyledButton";
import usePlayerStore from "@/stores/playerStore";

interface EpisodeSelectionModalProps {}

export const EpisodeSelectionModal: React.FC<EpisodeSelectionModalProps> = () => {
  const { showEpisodeModal, episodes, currentEpisodeIndex, playEpisode, setShowEpisodeModal } = usePlayerStore();

  const episodeGroupSize = 30;
  const [selectedEpisodeGroup, setSelectedEpisodeGroup] = useState(Math.floor(currentEpisodeIndex / episodeGroupSize));
  const flatListRef = useRef<FlatList>(null);

  // 当模态框打开时，重置选中的分组到当前播放集数所在分组
  useEffect(() => {
    if (showEpisodeModal) {
      setSelectedEpisodeGroup(Math.floor(currentEpisodeIndex / episodeGroupSize));
    }
  }, [showEpisodeModal, currentEpisodeIndex]);

  const onSelectEpisode = (index: number) => {
    playEpisode(index);
    setShowEpisodeModal(false);
  };

  const onClose = () => {
    setShowEpisodeModal(false);
  };

  const getItemLayout = (_: any, index: number) => ({
    length: 40,
    offset: 40 * Math.floor(index / 5),
    index,
  });

  // 计算当前分组的剧集
  const currentGroupEpisodes = episodes.slice(
    selectedEpisodeGroup * episodeGroupSize,
    (selectedEpisodeGroup + 1) * episodeGroupSize
  );

  return (
    <Modal visible={showEpisodeModal} transparent={true} animationType="slide" onRequestClose={onClose}>
      <View style={styles.modalContainer}>
        <View style={styles.modalContent}>
          <Text style={styles.modalTitle}>选择剧集 (共 {episodes.length} 集)</Text>

          {episodes.length > episodeGroupSize && (
            <View style={styles.episodeGroupContainer}>
              {Array.from({ length: Math.ceil(episodes.length / episodeGroupSize) }, (_, groupIndex) => (
                <StyledButton
                  key={groupIndex}
                  text={`${groupIndex * episodeGroupSize + 1}-${Math.min(
                    (groupIndex + 1) * episodeGroupSize,
                    episodes.length
                  )}`}
                  onPress={() => setSelectedEpisodeGroup(groupIndex)}
                  isSelected={selectedEpisodeGroup === groupIndex}
                  style={styles.episodeGroupButton}
                  textStyle={styles.episodeGroupButtonText}
                />
              ))}
            </View>
          )}
          <FlatList
            ref={flatListRef}
            data={currentGroupEpisodes}
            numColumns={5}
            contentContainerStyle={styles.episodeList}
            keyExtractor={(_, index) => `episode-${selectedEpisodeGroup * episodeGroupSize + index}`}
            getItemLayout={getItemLayout}
            renderItem={({ item, index }) => {
              const absoluteIndex = selectedEpisodeGroup * episodeGroupSize + index;
              return (
                <StyledButton
                  text={item.title || `第 ${absoluteIndex + 1} 集`}
                  onPress={() => onSelectEpisode(absoluteIndex)}
                  isSelected={currentEpisodeIndex === absoluteIndex}
                  hasTVPreferredFocus={currentEpisodeIndex === absoluteIndex}
                  style={styles.episodeItem}
                  textStyle={styles.episodeItemText}
                />
              );
            }}
          />
        </View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  modalContainer: {
    flex: 1,
    flexDirection: "row",
    justifyContent: "flex-end",
    backgroundColor: "transparent",
  },
  modalContent: {
    width: 600,
    height: "100%",
    backgroundColor: "rgba(0, 0, 0, 0.85)",
    padding: 20,
  },
  modalTitle: {
    color: "white",
    marginBottom: 12,
    textAlign: "center",
    fontSize: 18,
    fontWeight: "bold",
  },
  episodeList: {
    justifyContent: "flex-start",
  },
  episodeItem: {
    paddingVertical: 2,
    margin: 4,
    width: "18%",
  },
  episodeItemText: {
    fontSize: 14,
  },
  episodeGroupContainer: {
    flexDirection: "row",
    flexWrap: "wrap",
    justifyContent: "center",
    paddingHorizontal: 10,
    marginBottom: 10,
  },
  episodeGroupButton: {
    paddingHorizontal: 6,
    margin: 8,
  },
  episodeGroupButtonText: {
    fontSize: 12,
  },
});
