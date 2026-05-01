import 'react-native-gesture-handler';
import 'react-native-get-random-values';

import { useEffect, useRef, useState } from 'react';
import { Animated, StyleSheet } from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { NavigationContainer } from '@react-navigation/native';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { AppProvider } from './src/context/AppContext';
import { AppNavigator } from './src/navigation/AppNavigator';
import { SplashScreenView } from './src/components/SplashScreenView';
import { useAppContext } from './src/context/AppContext';

/** Inner shell — needs AppProvider context */
const AppShell = () => {
  const { ready, branding } = useAppContext();
  const [splashVisible, setSplashVisible] = useState(true);
  const splashOpacity = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    if (!ready) return;
    // Give the app a brief moment to paint before fading the splash away
    Animated.timing(splashOpacity, {
      toValue: 0,
      duration: 520,
      delay: 300,
      useNativeDriver: true,
    }).start(() => setSplashVisible(false));
  }, [ready]);

  return (
    <>
      <NavigationContainer>
        <StatusBar style="dark" />
        <AppNavigator />
      </NavigationContainer>

      {splashVisible && (
        <Animated.View
          style={[StyleSheet.absoluteFillObject, { opacity: splashOpacity }]}
          pointerEvents="none"
        >
          <SplashScreenView branding={branding} />
        </Animated.View>
      )}
    </>
  );
};

export default function App() {
  return (
    <SafeAreaProvider>
      <AppProvider>
        <AppShell />
      </AppProvider>
    </SafeAreaProvider>
  );
}
