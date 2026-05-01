import React, { useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { THEME } from '../config/appConfig';
import { EncounterListScreen } from './EncounterListScreen';
import { PatientListScreen } from './PatientListScreen';

type TabKey = 'patients' | 'encounters';

export const RecordsScreen = () => {
  const [active, setActive] = useState<TabKey>('patients');

  return (
    <View style={styles.container}>
      <View style={styles.segmentWrap}>
        <Segment label="Patients" active={active === 'patients'} onPress={() => setActive('patients')} />
        <Segment label="Encounters" active={active === 'encounters'} onPress={() => setActive('encounters')} />
      </View>
      {active === 'patients' ? <PatientListScreen /> : <EncounterListScreen />}
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
