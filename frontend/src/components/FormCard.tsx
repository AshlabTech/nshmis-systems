import React from 'react';
import { View, StyleSheet } from 'react-native';
import { THEME } from '../config/appConfig';

export const FormCard: React.FC<React.PropsWithChildren<{ style?: object }>> = ({ children, style }) => (
  <View style={[styles.card, style]}>{children}</View>
);

const styles = StyleSheet.create({
  card: {
    backgroundColor: THEME.white,
    borderRadius: 20,
    padding: 20,
    borderWidth: 1,
    borderColor: THEME.border,
    shadowColor: THEME.teal,
    shadowOpacity: 0.08,
    shadowRadius: 16,
    shadowOffset: { width: 0, height: 4 },
    elevation: 3,
    marginBottom: 14,
  },
});
