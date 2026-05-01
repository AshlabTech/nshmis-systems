import { useEffect, useRef } from 'react';
import { Animated, Image, StyleSheet, Text, View } from 'react-native';
import { THEME } from '../config/appConfig';
import type { Branding } from '../services/brandingService';

export const SplashScreenView: React.FC<{ branding: Branding }> = ({ branding }) => {
  const logoOpacity = useRef(new Animated.Value(0)).current;
  const logoScale = useRef(new Animated.Value(0.72)).current;
  const nameTranslate = useRef(new Animated.Value(18)).current;
  const nameOpacity = useRef(new Animated.Value(0)).current;
  const dot1 = useRef(new Animated.Value(0.2)).current;
  const dot2 = useRef(new Animated.Value(0.2)).current;
  const dot3 = useRef(new Animated.Value(0.2)).current;

  useEffect(() => {
    // Logo fades + scales in
    Animated.parallel([
      Animated.timing(logoOpacity, { toValue: 1, duration: 550, useNativeDriver: true }),
      Animated.spring(logoScale, { toValue: 1, friction: 5, tension: 60, useNativeDriver: true }),
    ]).start();

    // App name slides up after logo settles
    Animated.sequence([
      Animated.delay(350),
      Animated.parallel([
        Animated.timing(nameOpacity, { toValue: 1, duration: 400, useNativeDriver: true }),
        Animated.timing(nameTranslate, { toValue: 0, duration: 400, useNativeDriver: true }),
      ]),
    ]).start();

    // Pulsing loading dots (staggered)
    const pulse = (dot: Animated.Value, delay: number) =>
      Animated.loop(
        Animated.sequence([
          Animated.delay(delay),
          Animated.timing(dot, { toValue: 1, duration: 400, useNativeDriver: true }),
          Animated.timing(dot, { toValue: 0.2, duration: 400, useNativeDriver: true }),
          Animated.delay(400),
        ])
      ).start();

    pulse(dot1, 0);
    pulse(dot2, 180);
    pulse(dot3, 360);
  }, []);

  return (
    <View style={styles.container}>
      {/* Logo */}
      <Animated.View style={[styles.logoWrap, { opacity: logoOpacity, transform: [{ scale: logoScale }] }]}>
        {branding.logoUrl ? (
          <Image source={{ uri: branding.logoUrl }} style={styles.logoImage} resizeMode="contain" />
        ) : (
          <View style={styles.logoFallback}>
            <Text style={styles.logoFallbackText}>
              {branding.appName.split(' ').map((w) => w[0]).join('').slice(0, 3).toUpperCase()}
            </Text>
          </View>
        )}
      </Animated.View>

      {/* App name */}
      <Animated.View style={{ opacity: nameOpacity, transform: [{ translateY: nameTranslate }] }}>
        <Text style={styles.appName}>{branding.appName}</Text>
        <Text style={styles.tagline}>Offline-first field data capture</Text>
      </Animated.View>

      {/* Loading dots */}
      <View style={styles.dotsRow}>
        {[dot1, dot2, dot3].map((dot, i) => (
          <Animated.View key={i} style={[styles.dot, { opacity: dot }]} />
        ))}
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: THEME.background,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 24,
  },
  logoWrap: { alignItems: 'center', justifyContent: 'center' },
  logoImage: { width: 120, height: 120 },
  logoFallback: {
    width: 110,
    height: 110,
    borderRadius: 26,
    backgroundColor: THEME.teal,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: THEME.teal,
    shadowOpacity: 0.35,
    shadowRadius: 18,
    shadowOffset: { width: 0, height: 8 },
    elevation: 10,
  },
  logoFallbackText: { color: '#fff', fontSize: 36, fontWeight: '900', letterSpacing: 2 },
  appName: { fontSize: 22, fontWeight: '800', color: THEME.text, textAlign: 'center' },
  tagline: { fontSize: 13, color: THEME.muted, textAlign: 'center', marginTop: 4 },
  dotsRow: { flexDirection: 'row', gap: 10, marginTop: 8 },
  dot: { width: 9, height: 9, borderRadius: 5, backgroundColor: THEME.teal },
});
