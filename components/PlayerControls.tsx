import React from "react";
import { View, Text, StyleSheet, Pressable } from "react-native";
import { ThemedText } from "@/components/ThemedText";
import { MediaButton } from "@/components/MediaButton";

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

  const hasMultipleLines = detail?.play_sources && detail.play_sources.length > 1;

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
          <MediaButton onPress={setIntroEndTime} timeLabel={introEndTime ? formatTime(introEndTime) : undefined}>
            <Text style={styles.controlButtonText}>片头</Text>
          </MediaButton>

          <MediaButton onPress={togglePlayPause} hasTVPreferredFocus={showControls}>
            <Text style={[styles.controlButtonText, {fontSize: 24}]}>{status?.isLoaded && status.isPlaying ? "||" : "▶"}</Text>
          </MediaButton>

          <MediaButton onPress={onPlayNextEpisode} disabled={!hasNextEpisode}>
            <Text style={[styles.controlButtonText, {fontSize: 24, color: hasNextEpisode ? "white" : "#666"}]}>▶▶</Text>
          </MediaButton>

          <MediaButton onPress={setOutroStartTime} timeLabel={outroStartTime ? formatTime(outroStartTime) : undefined}>
            <Text style={styles.controlButtonText}>片尾</Text>
          </MediaButton>

          <MediaButton onPress={() => setShowEpisodeModal(true)}>
            <Text style={styles.controlButtonText}>剧集</Text>
          </MediaButton>

          <MediaButton onPress={() => setShowSpeedModal(true)} timeLabel={playbackRate !== 1.0 ? `${playbackRate}x` : undefined}>
            <Text style={styles.controlButtonText}>倍速</Text>
          </MediaButton>

          <MediaButton onPress={() => setShowSourceModal(true)}>
            <Text style={styles.controlButtonText}>播放源</Text>
          </MediaButton>

          <MediaButton onPress={() => setShowLineModal(true)} disabled={!hasMultipleLines}>
            <Text style={[styles.controlButtonText, {color: hasMultipleLines ? "white" : "#666"}]}>线路</Text>
            {hasMultipleLines && <Text style={styles.timeLabel}>{selectedLineIndex + 1}</Text>}
          </MediaButton>
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
  controlButtonText: {
    color: "white",
    fontSize: 16,
  },
  timeLabel: {
    color: "white",
    fontSize: 10,
    fontWeight: "bold",
    backgroundColor: "rgba(0,0,0,0.6)",
    paddingHorizontal: 4,
    borderRadius: 3,
  },
});
