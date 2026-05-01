import { useEffect, useRef } from 'react';
import { Animated } from 'react-native';

/**
 * Returns an Animated.Value that animates from 0 → 1 on mount.
 * Wrap your screen root in <Animated.View style={{ flex: 1, opacity }} />.
 */
export const useFadeIn = (duration = 320, delay = 0): Animated.Value => {
  const opacity = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.timing(opacity, {
      toValue: 1,
      duration,
      delay,
      useNativeDriver: true,
    }).start();
  }, []);

  return opacity;
};
