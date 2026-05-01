import React, { useEffect, useState } from 'react';
import { ScrollView, Text, StyleSheet, Pressable } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { listDraftEncounters } from '../database/repository';
import { FormCard } from '../components/FormCard';
import { StatusBadge } from '../components/StatusBadge';
import { THEME } from '../config/appConfig';
import { EncounterRecord } from '../types/models';
import { formatDateTime, shortRef } from '../utils/display';

export const DraftsScreen = () => {
  const navigation = useNavigation<any>();
  const [items, setItems] = useState<EncounterRecord[]>([]);

  useEffect(() => {
    const load = async () => setItems(await listDraftEncounters());
    void load();
  }, []);

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      {items.map((item) => (
        <Pressable key={item.uuid} onPress={() => navigation.navigate('NewEncounterWizard', { draftUuid: item.uuid })}>
          <FormCard>
            <Text style={styles.title}>{item.presenting_complaint || 'Draft encounter'}</Text>
            <Text style={styles.meta}>Patient {shortRef(item.patient_uuid)}</Text>
            <Text style={styles.meta}>Updated {formatDateTime(item.updated_at)}</Text>
            <StatusBadge status={item.sync_status} />
          </FormCard>
        </Pressable>
      ))}
      {!items.length ? <Text style={styles.empty}>No drafts available.</Text> : null}
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: THEME.background },
  content: { padding: 16 },
  title: { fontSize: 16, fontWeight: '800', color: THEME.text, marginBottom: 6 },
  meta: { color: THEME.muted, marginBottom: 8 },
  empty: { padding: 16, color: THEME.muted },
});
