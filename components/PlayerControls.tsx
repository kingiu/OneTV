import React from "react";
import { View, Text, StyleSheet, Pressable, TouchableOpacity } from "react-native";
import Icon from "@/components/Icon";
import { ThemedText } from "@/components/ThemedText";

import usePlayerStore from "@/stores/playerStore";
import useDetailStore from "@/stores/detailStore";
import { useSources } from "@/stores/sourceStore";

interface PlayerControlsProps {
  showControls: boolean;
  setShowControls: (show: boolean) => void;
}

export const PlayerControls: React.FC<PlayerControlsProps> = ({ showControls, setShowControls }) => {
  const {
    currentEpisodeIndex,
    episodes,
    status,
    isSeeking,
    seekPosition,
    progressPosition,
    playbackRate,
    togglePlayPause,
    playEpisode,
    setShowEpisodeModal,
    setShowSourceModal,
    setShowSpeedModal,
    setShowLineModal,
    setIntroEndTime,
    setOutroStartTime,
    introEndTime,
    outroStartTime,
  } = usePlayerStore();

  const { detail, selectedLineIndex } = useDetailStore();
  const resources = useSources();

  const videoTitle = detail?.title || "";
  const currentEpisode = episodes[currentEpisodeIndex];
  const currentEpisodeTitle = currentEpisode?.title;
  const currentSource = resources.find((r) => r.source === detail?.source);
  const currentSourceName = currentSource?.source_name;
  const hasNextEpisode = currentEpisodeIndex < (episodes.length || 0) - 1;
  
  // 线路显示逻辑 - 修复：使用play_sources判断线路数量，而不是episodes
  const hasMultipleLines = detail?.play_sources && detail.play_sources.length > 1;
  const lineLabel = hasMultipleLines ? `线路${selectedLineIndex + 1}` : "";

  const formatTime = (milliseconds: number) => {
    if (!milliseconds) return "00:00";
    const totalSeconds = Math.floor(milliseconds / 1000);
    const minutes = Math.floor(totalSeconds / 60);
    const seconds = totalSeconds % 60;
    return `${minutes.toString().padStart(2, "0")}:${seconds.toString().padStart(2, "0")}`;
  };

  const onPlayNextEpisode = () => {
    if (hasNextEpisode) {
      playEpisode(currentEpisodeIndex + 1);
    }
  };

  return (
    <View style={styles.controlsOverlay}>
      <View style={styles.topControls}>
        <View style={styles.titleContainer}>
          <Text style={styles.controlTitle}>
            {videoTitle} {currentEpisodeTitle ? `- ${currentEpisodeTitle}` : ""}
          </Text>
          {lineLabel ? (
            <Text style={styles.lineLabel}>{lineLabel}</Text>
          ) : null}
        </View>
      </View>

      <View style={styles.bottomControlsContainer}>
        <View style={styles.progressBarContainer}>
          <View style={styles.progressBarBackground} />
          <View
            style={[
              styles.progressBarFilled,
              {
                width: `${(isSeeking ? seekPosition : progressPosition) * 100}%`,
              },
            ]}
          />
          <Pressable style={styles.progressBarTouchable} />
        </View>

        <ThemedText style={{ color: "white", marginTop: 5 }}>
          {status?.isLoaded
            ? `${formatTime(status.positionMillis)} / ${formatTime(status.durationMillis || 0)}`
            : "00:00 / 00:00"}
        </ThemedText>

        <View style={styles.bottomControls}>
            <TouchableOpacity onPress={setIntroEndTime} style={styles.controlButton}>
              <Text style={{color: "white", fontSize: 16}}>片头</Text>
              <Text style={styles.timeLabel}>{formatTime(introEndTime || 0)}</Text>
            </TouchableOpacity>

            <TouchableOpacity onPress={togglePlayPause} style={styles.controlButton}>
              <Text style={{color: "white", fontSize: 24}}>{status?.isLoaded && status.isPlaying ? "||" : "▶"}</Text>
            </TouchableOpacity>

            <TouchableOpacity onPress={onPlayNextEpisode} style={styles.controlButton} disabled={!hasNextEpisode}>
              <Text style={{color: hasNextEpisode ? "white" : "#666", fontSize: 24}}>▶▶</Text>
            </TouchableOpacity>

            <TouchableOpacity onPress={setOutroStartTime} style={styles.controlButton}>
              <Text style={{color: "white", fontSize: 16}}>片尾</Text>
              <Text style={styles.timeLabel}>{formatTime(outroStartTime || 0)}</Text>
            </TouchableOpacity>

            <TouchableOpacity onPress={() => setShowEpisodeModal(true)} style={styles.controlButton}>
              <Icon name="list" color="white" size={24} />
              <Text style={{color: "white", fontSize: 16, marginLeft: 4}}>剧集</Text>
            </TouchableOpacity>

            <TouchableOpacity onPress={() => setShowSpeedModal(true)} style={styles.controlButton}>
              <Icon name="speedometer" color="white" size={24} />
              <Text style={{color: "white", fontSize: 16, marginLeft: 4}}>倍速</Text>
              {playbackRate !== 1.0 && <Text style={styles.timeLabel}>{playbackRate}x</Text>}
            </TouchableOpacity>

            <TouchableOpacity onPress={() => setShowSourceModal(true)} style={styles.controlButton}>
              <Icon name="videocam" color="white" size={24} />
              <Text style={{color: "white", fontSize: 16, marginLeft: 4}}>播放源</Text>
            </TouchableOpacity>

            <TouchableOpacity onPress={() => setShowLineModal(true)} style={styles.controlButton} disabled={!hasMultipleLines}>
              <Icon name="cable" color={hasMultipleLines ? "white" : "#666"} size={24} />
              <Text style={{color: hasMultipleLines ? "white" : "#666", fontSize: 16, marginLeft: 4}}>线路</Text>
              {lineLabel ? <Text style={styles.timeLabel}>{selectedLineIndex + 1}</Text> : null}
            </TouchableOpacity>
          </View>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  controlsOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "rgba(0, 0, 0, 0.4)",
    justifyContent: "space-between",
    padding: 20,
  },
  topControls: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  controlTitle: {
    color: "white",
    fontSize: 16,
    fontWeight: "bold",
    flex: 1,
    textAlign: "center",
    marginHorizontal: 10,
  },
  titleContainer: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    flex: 1,
  },
  lineLabel: {
    color: "#00bb5e",
    fontSize: 14,
    fontWeight: "bold",
    marginLeft: 10,
    backgroundColor: "rgba(0, 187, 94, 0.2)",
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 4,
  },
  bottomControlsContainer: {
    width: "100%",
    alignItems: "center",
  },
  bottomControls: {
    flexDirection: "row",
    justifyContent: "center",
    alignItems: "center",
    gap: 10,
    flexWrap: "wrap",
    marginTop: 15,
  },
  progressBarContainer: {
    width: "100%",
    height: 8,
    position: "relative",
    marginTop: 10,
  },
  progressBarBackground: {
    position: "absolute",
    left: 0,
    right: 0,
    height: 8,
    backgroundColor: "rgba(255, 255, 255, 0.3)",
    borderRadius: 4,
  },
  progressBarFilled: {
    position: "absolute",
    left: 0,
    height: 8,
    backgroundColor: "#fff",
    borderRadius: 4,
  },
  progressBarTouchable: {
    position: "absolute",
    left: 0,
    right: 0,
    height: 30,
    top: -10,
    zIndex: 10,
  },
  controlButton: {
    padding: 10,
    flexDirection: "row",
    alignItems: "center",
    minWidth: 44,
    justifyContent: "center",
  },
  timeLabel: {
    color: "white",
    fontSize: 12,
    marginLeft: 4,
  },
  topRightContainer: {
    padding: 10,
    alignItems: "center",
    justifyContent: "center",
    minWidth: 44,
  },
  resolutionText: {
    color: "white",
    fontSize: 16,
    fontWeight: "bold",
    backgroundColor: "rgba(0,0,0,0.5)",
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
  },
});
