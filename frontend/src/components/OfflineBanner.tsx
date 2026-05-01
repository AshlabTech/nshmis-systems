import React from 'react';
import { Text, StyleSheet, View } from 'react-native';
import { WifiOff } from 'lucide-react-native';
import { THEME } from '../config/appConfig';

export const OfflineBanner: React.FC<{ visible: boolean }> = ({ visible }) => {
  if (!visible) return null;

  return (
    <View style={styles.banner}>
      <WifiOff size={16} color="#fff" />
      <Text style={styles.text}>Offline mode – data will sync when connection is restored</Text>
    </View>
  );
};

const styles = StyleSheet.create({
  banner: {
    backgroundColor: THEME.warning,
    paddingHorizontal: 14,
    paddingVertical: 10,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  text: { color: '#fff', fontWeight: '700', flex: 1 },
});
