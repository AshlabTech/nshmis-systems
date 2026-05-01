import React, { useEffect, useState } from 'react';
import { ScrollView, Text, StyleSheet, View } from 'react-native';
import { FormCard } from '../components/FormCard';
import { StatusBadge } from '../components/StatusBadge';
import { PrimaryButton } from '../components/PrimaryButton';
import { THEME } from '../config/appConfig';
import { listQueueItems } from '../database/repository';
import { SyncQueueRecord } from '../types/models';
import { useAppContext } from '../context/AppContext';
import { formatDateTime, shortRef, titleCase } from '../utils/display';

export const PendingSyncScreen = () => {
  const [items, setItems] = useState<SyncQueueRecord[]>([]);
  const { runSync, lastSyncMessage } = useAppContext();

  useEffect(() => {
    const load = async () => setItems(await listQueueItems());
    void load();
  }, [lastSyncMessage]);

  const grouped = {
    patients: items.filter((item) => item.entity_type === 'patient'),
    encounters: items.filter((item) => item.entity_type === 'encounter'),
    referrals: items.filter((item) => item.entity_type === 'referral'),
  };

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <View style={styles.actions}>
        <PrimaryButton title="Retry Failed" onPress={() => void runSync({ retryFailedOnly: true })} variant="outline" style={styles.actionButton} />
        <PrimaryButton title="Sync All" onPress={() => void runSync({ forceFull: true })} style={styles.actionButton} />
      </View>

      <Section title="Patients" items={grouped.patients} />
      <Section title="Encounters" items={grouped.encounters} />
      <Section title="Referrals" items={grouped.referrals} />

      {!items.length ? <Text style={styles.empty}>No queued sync items.</Text> : null}
    </ScrollView>
  );
};

const Section = ({ title, items }: { title: string; items: SyncQueueRecord[] }) => {
  if (!items.length) return null;
  return (
    <View style={styles.sectionWrap}>
      <Text style={styles.sectionTitle}>{title} ({items.length})</Text>
      {items.map((item) => (
        <FormCard key={`${item.entity_type}-${item.entity_uuid}`} style={styles.card}>
          <View style={styles.cardHead}>
            <View>
              <Text style={styles.title}>{titleCase(item.entity_type)} record</Text>
              <Text style={styles.refText}>{shortRef(item.entity_uuid)}</Text>
            </View>
            <StatusBadge status={item.status === 'synced' ? 'synced' : item.status === 'failed' ? 'failed' : item.status === 'conflict' ? 'conflict' : item.status === 'syncing' ? 'syncing' : 'pending'} />
          </View>
          <Text style={styles.meta}>Retries: {item.retry_count}</Text>
          <Text style={styles.meta}>Queued: {formatDateTime(item.created_at)}</Text>
          {item.last_error ? <Text style={styles.error}>{friendlyError(item.last_error)}</Text> : null}
        </FormCard>
      ))}
    </View>
  );
};

const friendlyError = (message: string) => {
  if (message.includes('patient_uuid')) return 'Patient details were missing. Save the encounter again, then retry sync.';
  return message;
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: THEME.background },
  content: { padding: 16 },
  actions: { flexDirection: 'row', gap: 10, marginBottom: 10 },
  actionButton: { flex: 1 },
  sectionWrap: { marginBottom: 12 },
  sectionTitle: { color: THEME.text, fontSize: 17, fontWeight: '900', marginBottom: 8 },
  card: { paddingVertical: 16 },
  cardHead: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', gap: 12 },
  title: { fontSize: 16, fontWeight: '900', color: THEME.text },
  refText: { color: THEME.muted, marginTop: 5, fontWeight: '700' },
  meta: { color: THEME.muted, marginTop: 8 },
  error: { color: THEME.danger, marginTop: 10, lineHeight: 19, fontWeight: '600' },
  empty: { padding: 16, color: THEME.muted },
});
