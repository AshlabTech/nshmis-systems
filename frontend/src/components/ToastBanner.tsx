import React from 'react';
import { Text, StyleSheet, View } from 'react-native';
import { THEME } from '../config/appConfig';

export const ToastBanner: React.FC<{ message: string }> = ({ message }) => {
  if (!message) return null;

  return (
    <View style={styles.toast}>
      <Text style={styles.text}>{message}</Text>
    </View>
  );
};

const styles = StyleSheet.create({
  toast: {
    position: 'absolute',
    top: 12,
    left: 16,
    right: 16,
    zIndex: 1000,
    borderRadius: 16,
    backgroundColor: THEME.text,
    paddingHorizontal: 14,
    paddingVertical: 12,
    shadowColor: '#000',
    shadowOpacity: 0.18,
    shadowRadius: 18,
    shadowOffset: { width: 0, height: 8 },
    elevation: 6,
  },
  text: { color: '#fff', fontWeight: '700' },
});
