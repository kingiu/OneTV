import { useEffect, useRef, useCallback } from "react";
import { useTVEventHandler, HWEvent } from "react-native";
import usePlayerStore from "@/stores/playerStore";

const SEEK_STEP = 20 * 1000;

const CONTROLS_TIMEOUT = 5000;

export const useTVRemoteHandler = () => {
  const { showControls, setShowControls, showEpisodeModal, togglePlayPause, seek } = usePlayerStore();

  const controlsTimer = useRef<NodeJS.Timeout | null>(null);
  const fastForwardIntervalRef = useRef<NodeJS.Timeout | null>(null);

  const resetTimer = useCallback(() => {
    if (controlsTimer.current) {
      clearTimeout(controlsTimer.current);
    }
    controlsTimer.current = setTimeout(() => {
      setShowControls(false);
    }, CONTROLS_TIMEOUT);
  }, [setShowControls]);

  useEffect(() => {
    if (showControls) {
      resetTimer();
    } else {
      if (controlsTimer.current) {
        clearTimeout(controlsTimer.current);
      }
    }

    return () => {
      if (controlsTimer.current) {
        clearTimeout(controlsTimer.current);
      }
    };
  }, [showControls, resetTimer]);

  useEffect(() => {
    return () => {
      if (fastForwardIntervalRef.current) {
        clearInterval(fastForwardIntervalRef.current);
      }
    };
  }, []);

  const handleTVEvent = useCallback(
    (event: HWEvent) => {
      if (showEpisodeModal) {
        return;
      }

      if (event.eventType === "longRight" || event.eventType === "longLeft") {
        if (event.eventKeyAction === 1) {
          if (fastForwardIntervalRef.current) {
            clearInterval(fastForwardIntervalRef.current);
            fastForwardIntervalRef.current = null;
          }
        }
      }

      resetTimer();

      if (showControls) {
        return;
      }

      switch (event.eventType) {
        case "select":
          togglePlayPause();
          setShowControls(true);
          break;
        case "left":
          seek(-SEEK_STEP);
          break;
        case "longLeft":
          if (!fastForwardIntervalRef.current && event.eventKeyAction === 0) {
            fastForwardIntervalRef.current = setInterval(() => {
              seek(-SEEK_STEP); 
            }, 200);
          }
          break;
        case "right":
          seek(SEEK_STEP);
          break;
        case "longRight":
          if (!fastForwardIntervalRef.current && event.eventKeyAction === 0) {
            fastForwardIntervalRef.current = setInterval(() => {
              seek(SEEK_STEP); 
            }, 200);
          }
          break;
        case "down":
          setShowControls(true);
          break;
      }
    },
    [showControls, showEpisodeModal, setShowControls, resetTimer, togglePlayPause, seek]
  );

  useTVEventHandler(handleTVEvent);

  const onScreenPress = () => {
    const newShowControls = !showControls;
    setShowControls(newShowControls);

    if (newShowControls) {
      resetTimer();
    }
  };

  return { onScreenPress };
};
