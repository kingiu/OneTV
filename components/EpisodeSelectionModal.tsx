import React, { useState, useEffect } from "react";
import { View, Text, StyleSheet, Modal, FlatList, ScrollView } from "react-native";
import { StyledButton } from "./StyledButton";
import usePlayerStore from "@/stores/playerStore";
import useDetailStore from "@/stores/detailStore";

interface EpisodeSelectionModalProps {}

export const EpisodeSelectionModal: React.FC<EpisodeSelectionModalProps> = () => {
  const { showEpisodeModal, currentEpisodeIndex, playEpisode, setShowEpisodeModal, currentPlaySourceIndex, onLineChange, episodeModalInitialTab } = usePlayerStore();
  const { detail } = useDetailStore();
  
  const episodes = detail?.play_sources && detail.play_sources.length > 0 ? detail.play_sources[0].episodes : [];

  const [episodeGroupSize] = useState(30);
  const [selectedEpisodeGroup, setSelectedEpisodeGroup] = useState(Math.floor(currentEpisodeIndex / episodeGroupSize));
  const [activeTab, setActiveTab] = useState<'episodes' | 'lines'>(episodeModalInitialTab);
  
  // 当 currentEpisodeIndex 变化时，更新选中的剧集分组
  useEffect(() => {
    setSelectedEpisodeGroup(Math.floor(currentEpisodeIndex / episodeGroupSize));
  }, [currentEpisodeIndex, episodeGroupSize]);
  
  // Update activeTab when episodeModalInitialTab changes
  useEffect(() => {
    setActiveTab(episodeModalInitialTab);
  }, [episodeModalInitialTab]);
  
  console.log('[DEBUG] EpisodeSelectionModal rendered, initialTab:', episodeModalInitialTab, 'activeTab:', activeTab);

  const onSelectEpisode = (index: number) => {
    playEpisode(index);
    setShowEpisodeModal(false);
  };

  const onClose = () => {
    setShowEpisodeModal(false);
  };

  const playSources = detail?.play_sources || [];

  return (
    <Modal visible={showEpisodeModal} transparent={true} animationType="slide" onRequestClose={onClose}>
      <View style={styles.modalContainer}>
        <View style={styles.modalContent}>
          <Text style={styles.modalTitle}>{activeTab === 'episodes' ? '选择剧集' : '选择线路'}</Text>

          {/* 标签页切换 - 完全隐藏 */}
          {/* 现在通过不同按钮直接打开不同标签页，不需要标签切换 */}

          {activeTab === 'episodes' ? (
            <>
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
                data={episodes.slice(
                  selectedEpisodeGroup * episodeGroupSize,
                  (selectedEpisodeGroup + 1) * episodeGroupSize
                )}
                numColumns={5}
                contentContainerStyle={styles.episodeList}
                keyExtractor={(_, index) => `episode-${selectedEpisodeGroup * episodeGroupSize + index}`}
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
            </>
          ) : (
            <ScrollView contentContainerStyle={styles.linesList}>
              {playSources.map((source, index) => (
                <StyledButton
                  key={index}
                  text={`线路${index + 1}`}
                  onPress={() => onLineChange(index)}
                  isSelected={currentPlaySourceIndex === index}
                  style={styles.lineItem}
                  textStyle={styles.lineItemText}
                />
              ))}
            </ScrollView>
          )}
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
  tabContainer: {
    flexDirection: "row",
    marginBottom: 20,
    justifyContent: "center",
  },
  tabButton: {
    paddingHorizontal: 20,
    paddingVertical: 8,
    marginHorizontal: 10,
  },
  tabButtonText: {
    fontSize: 16,
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
  },
  episodeGroupButton: {
    paddingHorizontal: 6,
    margin: 8,
  },
  episodeGroupButtonText: {
    fontSize: 12,
  },
  linesList: {
    paddingHorizontal: 20,
  },
  lineItem: {
    paddingVertical: 12,
    marginVertical: 4,
    width: "100%",
  },
  lineItemText: {
    fontSize: 16,
  },
});
