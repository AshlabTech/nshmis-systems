import React, { useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { THEME } from '../config/appConfig';
import { PendingSyncScreen } from './PendingSyncScreen';
import { SyncHistoryScreen } from './SyncHistoryScreen';

type TabKey = 'pending' | 'history';

export const SyncCenterScreen = () => {
  const [active, setActive] = useState<TabKey>('pending');

  return (
    <View style={styles.container}>
      <View style={styles.segmentWrap}>
        <Segment label="Pending" active={active === 'pending'} onPress={() => setActive('pending')} />
        <Segment label="History" active={active === 'history'} onPress={() => setActive('history')} />
      </View>
      {active === 'pending' ? <PendingSyncScreen /> : <SyncHistoryScreen />}
    </View>
  );
};

const Segment = ({ label, active, onPress }: { label: string; active: boolean; onPress: () => void }) => (
  <Pressable onPress={onPress} style={[styles.segment, active && styles.segmentActive]}>
    <Text style={[styles.segmentText, active && styles.segmentTextActive]}>{label}</Text>
  </Pressable>
);

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: THEME.background },
  segmentWrap: {
    flexDirection: 'row',
    gap: 8,
    marginHorizontal: 16,
    marginTop: 14,
    marginBottom: 2,
    padding: 5,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: THEME.border,
    backgroundColor: '#fff',
  },
  segment: { flex: 1, height: 42, alignItems: 'center', justifyContent: 'center', borderRadius: 12 },
  segmentActive: { backgroundColor: THEME.teal },
  segmentText: { color: THEME.muted, fontWeight: '800' },
  segmentTextActive: { color: '#fff' },
});
