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
    setIntroEndTime,
    setOutroStartTime,
    introEndTime,
    outroStartTime,
  } = usePlayerStore();

  const { detail } = useDetailStore();
  const resources = useSources();

  const videoTitle = detail?.title || "";
  const currentEpisode = episodes[currentEpisodeIndex];
  const currentEpisodeTitle = currentEpisode?.title;
  const currentSource = resources.find((r) => r.source === detail?.source);
  const currentSourceName = currentSource?.source_name;
  const hasNextEpisode = currentEpisodeIndex < (episodes.length || 0) - 1;

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
        <Text style={styles.controlTitle}>
          {videoTitle} {currentEpisodeTitle ? `- ${currentEpisodeTitle}` : ""}{" "}
          {currentSourceName ? `(${currentSourceName})` : ""}
        </Text>
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
              <Icon name="search" color="white" size={24} />
              {introEndTime && <Text style={styles.timeLabel}>{formatTime(introEndTime)}</Text>}
            </TouchableOpacity>

            <TouchableOpacity onPress={togglePlayPause} style={styles.controlButton}>
              <Text style={{color: "white", fontSize: 24}}>{status?.isLoaded && status.isPlaying ? "||" : "▶"}</Text>
            </TouchableOpacity>

            <TouchableOpacity onPress={onPlayNextEpisode} style={styles.controlButton} disabled={!hasNextEpisode}>
              <Text style={{color: hasNextEpisode ? "white" : "#666", fontSize: 24}}>▶▶</Text>
            </TouchableOpacity>

            <TouchableOpacity onPress={setOutroStartTime} style={styles.controlButton}>
              <Icon name="search" color="white" size={24} />
              {outroStartTime && <Text style={styles.timeLabel}>{formatTime(outroStartTime)}</Text>}
            </TouchableOpacity>

            <TouchableOpacity onPress={() => setShowEpisodeModal(true)} style={styles.controlButton}>
              <Icon name="menu" color="white" size={24} />
            </TouchableOpacity>

            <TouchableOpacity onPress={() => setShowSpeedModal(true)} style={styles.controlButton}>
              <Icon name="settings" color="white" size={24} />
              {playbackRate !== 1.0 && <Text style={styles.timeLabel}>{playbackRate}x</Text>}
            </TouchableOpacity>

            <TouchableOpacity onPress={() => setShowSourceModal(true)} style={styles.controlButton}>
              <Icon name="settings" color="white" size={24} />
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
