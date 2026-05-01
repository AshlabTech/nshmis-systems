import React from 'react';
import { Text, StyleSheet, View } from 'react-native';
import { SyncStatus } from '../types/models';
import { THEME } from '../config/appConfig';

const COLORS: Record<SyncStatus, string> = {
  draft: '#64748B',
  pending: THEME.warning,
  syncing: '#0EA5E9',
  synced: THEME.success,
  failed: THEME.danger,
  conflict: '#7C3AED',
};

const LABELS: Record<SyncStatus, string> = {
  draft: 'Draft',
  pending: 'Pending',
  syncing: 'Syncing',
  synced: 'Synced',
  failed: 'Failed sync',
  conflict: 'Conflict',
};

export const StatusBadge: React.FC<{ status: SyncStatus }> = ({ status }) => (
  <View style={[styles.badge, { backgroundColor: `${COLORS[status]}18`, borderColor: COLORS[status] }]}>
    <Text style={[styles.label, { color: COLORS[status] }]}>{LABELS[status]}</Text>
  </View>
);

const styles = StyleSheet.create({
  badge: {
    borderWidth: 1,
    borderRadius: 999,
    paddingHorizontal: 12,
    paddingVertical: 6,
    alignSelf: 'flex-start',
  },
  label: { fontWeight: '700', fontSize: 12 },
});
