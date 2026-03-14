import { useRef, useEffect, useCallback } from 'react';
import { Animated } from 'react-native';

export const useButtonAnimation = (isFocused: boolean, size: number = 1.1) => {
  const scaleValue = useRef(new Animated.Value(1)).current;
  const animationRef = useRef<Animated.CompositeAnimation | null>(null);
  const isMountedRef = useRef(true);

  useEffect(() => {
    isMountedRef.current = true;

    const startAnimation = () => {
      if (!isMountedRef.current) return;
      
      animationRef.current = Animated.spring(scaleValue, {
        toValue: isFocused ? size : 1,
        friction: 5,
        useNativeDriver: true,
      });
      
      animationRef.current.start((result) => {
        if (!isMountedRef.current) return;
      });
    };

    startAnimation();

    return () => {
      isMountedRef.current = false;
      // 清理动画，防止组件卸载后继续运行
      if (animationRef.current) {
        animationRef.current.stop();
        animationRef.current = null;
      }
    };
  }, [isFocused, scaleValue, size]);

  return {
    transform: [{ scale: scaleValue }],
  };
};