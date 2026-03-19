import React from "react";
import { View, Text, StyleSheet, Modal, FlatList } from "react-native";
import { StyledButton } from "./StyledButton";
import useDetailStore, { episodesSelectorBySource } from "@/stores/detailStore";
import usePlayerStore from "@/stores/playerStore";
import Logger from '@/utils/Logger';

const logger = Logger.withTag('LineSelectionModal');

export const LineSelectionModal: React.FC = () => {
  const { showLineModal, setShowLineModal, loadVideo, currentEpisodeIndex, status } = usePlayerStore();
  const { detail, setDetail, selectedLineIndex } = useDetailStore();

  // 确定线路列表
  let lineList = [];
  let detailWithPlaySources = detail;
  if (detail) {
    logger.debug("LineSelectionModal - Current detail:", {
      title: detail.title,
      source: detail.source,
      hasPlaySources: !!detail.play_sources,
      playSourcesCount: detail.play_sources?.length || 0
    });
    
    // 优先检查detail是否有play_sources
    if (detail.play_sources && detail.play_sources.length > 0) {
      // 使用play_sources作为线路列表
      lineList = detail.play_sources;
      logger.debug("LineSelectionModal - Using play_sources from detail:", lineList.map(l => l.name));
    } else {
      // 尝试从searchResults中获取包含play_sources的结果
      const searchResults = useDetailStore.getState().searchResults;
      logger.debug("LineSelectionModal - Search results count:", searchResults.length);
      
      // 首先查找与当前source匹配的结果
      let currentSourceResult = searchResults.find(r => r.source === detail.source);
      logger.debug("LineSelectionModal - Current source result:", currentSourceResult?.source);
      
      // 如果找到的结果没有play_sources，尝试查找其他包含play_sources的结果
      if (!currentSourceResult || !currentSourceResult.play_sources || currentSourceResult.play_sources.length === 0) {
        currentSourceResult = searchResults.find(r => r.play_sources && r.play_sources.length > 0);
        logger.debug("LineSelectionModal - Fallback source result:", currentSourceResult?.source);
      }
      
      // 如果找到包含play_sources的结果
      if (currentSourceResult && currentSourceResult.play_sources && currentSourceResult.play_sources.length > 0) {
        lineList = currentSourceResult.play_sources;
        detailWithPlaySources = currentSourceResult;
        logger.debug("LineSelectionModal - Using play_sources from searchResults:", lineList.map(l => l.name));
        
        // 立即更新detailStore中的detail，确保后续操作使用包含play_sources的完整数据
        // 使用setTimeout避免在渲染过程中调用setState
        setTimeout(() => {
          setDetail(detailWithPlaySources, selectedLineIndex);
          logger.debug("LineSelectionModal - Updated detail with play_sources");
        }, 0);
      } else {
        // 兼容旧版本，使用episodes字段作为单个线路
        const allEpisodes = episodesSelectorBySource(detail.source)(useDetailStore.getState());
        logger.debug("LineSelectionModal - All episodes count:", allEpisodes.length);
        if (allEpisodes && allEpisodes.length > 0) {
          lineList = [{ name: "线路 1", episodes: allEpisodes }];
          logger.debug("LineSelectionModal - Using episodes as single line");
        }
      }
    }
    logger.debug("LineSelectionModal - Final line list:", lineList.map(l => l.name));
  }

  const onSelectLine = (lineIndex: number) => {
    logger.debug("onSelectLine", lineIndex);
    if (detailWithPlaySources) {
      // 更新选中的线路索引
      setDetail(detailWithPlaySources, lineIndex);
      
      // 重新加载视频，保持当前位置
      const currentPosition = status?.isLoaded ? status.positionMillis : undefined;
      loadVideo({
        source: detailWithPlaySources.source,
        id: detailWithPlaySources.id.toString(),
        episodeIndex: currentEpisodeIndex,
        title: detailWithPlaySources.title,
        position: currentPosition
      });
    }
    setShowLineModal(false);
  };

  const onClose = () => {
    setShowLineModal(false);
  };

  if (!detail) {
    return null;
  }

  if (!lineList || lineList.length === 0) {
    return null;
  }

  return (
    <Modal visible={showLineModal} transparent={true} animationType="slide" onRequestClose={onClose}>
      <View style={styles.modalContainer}>
        <View style={styles.modalContent}>
          <Text style={styles.modalTitle}>选择线路</Text>
          <FlatList
            data={lineList}
            numColumns={3}
            contentContainerStyle={styles.lineList}
            keyExtractor={(item, index) => `line-${index}`}
            renderItem={({ item, index }) => (
              <StyledButton
                text={item.name}
                onPress={() => onSelectLine(index)}
                isSelected={selectedLineIndex === index}
                hasTVPreferredFocus={selectedLineIndex === index}
                style={styles.lineItem}
                textStyle={styles.lineItemText}
              />
            )}
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
    width: 400,
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
  lineList: {
    justifyContent: "flex-start",
  },
  lineItem: {
    paddingVertical: 8,
    margin: 4,
    marginLeft: 10,
    marginRight: 8,
    width: "30%",
  },
  lineItemText: {
    fontSize: 14,
  },
});
