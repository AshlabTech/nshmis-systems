import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Cloud, CloudOff, CloudCog } from 'lucide-react-native';
import { THEME } from '../config/appConfig';

export const CloudSyncIndicator: React.FC<{ isOnline: boolean; pendingCount: number; syncing?: boolean }> = ({ isOnline, pendingCount, syncing }) => {
  const color = !isOnline ? THEME.danger : syncing ? THEME.warning : pendingCount > 0 ? THEME.warning : THEME.success;
  const Icon = !isOnline ? CloudOff : syncing ? CloudCog : Cloud;

  return (
    <View style={styles.container}>
      <Icon size={22} color={color} />
      <Text style={[styles.text, { color }]}>
        {!isOnline ? 'Offline' : syncing ? 'Syncing' : pendingCount > 0 ? `${pendingCount} pending` : 'Synced'}
      </Text>
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  text: { fontWeight: '700' },
});
