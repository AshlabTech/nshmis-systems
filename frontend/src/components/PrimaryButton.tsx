import React from 'react';
import { Pressable, Text, StyleSheet, ActivityIndicator, ViewStyle } from 'react-native';
import { THEME } from '../config/appConfig';

export const PrimaryButton: React.FC<{
  title: string;
  onPress: () => void;
  loading?: boolean;
  variant?: 'solid' | 'outline';
  style?: ViewStyle;
  disabled?: boolean;
}> = ({ title, onPress, loading, variant = 'solid', style, disabled }) => {
  const isOutline = variant === 'outline';
  return (
    <Pressable
      onPress={onPress}
      disabled={disabled || loading}
      style={({ pressed }) => [
        styles.button,
        isOutline ? styles.outline : styles.solid,
        pressed && !(disabled || loading) && { opacity: 0.85 },
        (disabled || loading) && styles.dimmed,
        style,
      ]}
    >
      {loading ? (
        <ActivityIndicator color={isOutline ? THEME.teal : '#fff'} size="small" />
      ) : (
        <Text style={[styles.label, isOutline && styles.outlineLabel]}>{title}</Text>
      )}
    </Pressable>
  );
};

const styles = StyleSheet.create({
  button: {
    height: 52,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 20,
    marginVertical: 5,
  },
  solid: { backgroundColor: THEME.teal },
  outline: { backgroundColor: '#fff', borderWidth: 1.5, borderColor: THEME.teal },
  label: { color: '#fff', fontWeight: '700', fontSize: 15, letterSpacing: 0.3 },
  outlineLabel: { color: THEME.teal },
  dimmed: { opacity: 0.5 },
});
