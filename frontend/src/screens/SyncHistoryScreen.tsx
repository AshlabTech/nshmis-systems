import React, { useEffect, useState } from 'react';
import { ScrollView, Text, StyleSheet, View } from 'react-native';
import { FormCard } from '../components/FormCard';
import { THEME } from '../config/appConfig';
import { listSyncLogs } from '../database/repository';
import { SyncLogRecord } from '../types/models';
import { formatDateTime, shortRef, titleCase } from '../utils/display';

export const SyncHistoryScreen = () => {
  const [items, setItems] = useState<SyncLogRecord[]>([]);

  useEffect(() => {
    const load = async () => setItems(await listSyncLogs());
    void load();
  }, []);

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      {items.map((item) => (
        <View key={item.id} style={styles.timelineRow}>
          <View style={[styles.dot, item.status === 'failed' ? styles.dotFailed : item.status === 'synced' ? styles.dotSuccess : styles.dotPending]} />
          <FormCard style={styles.card}>
            <View style={styles.cardHead}>
              <View>
                <Text style={styles.title}>{titleCase(item.action)}</Text>
                <Text style={styles.meta}>{titleCase(item.entity_type)} record</Text>
              </View>
              <Text style={[styles.statusPill, item.status === 'failed' ? styles.failedPill : item.status === 'synced' ? styles.successPill : styles.pendingPill]}>
                {titleCase(item.status)}
              </Text>
            </View>
            <Text style={styles.refText}>{shortRef(item.entity_uuid)}</Text>
            <Text style={styles.timeText}>{formatDateTime(item.created_at)}</Text>
            {item.error_message ? <Text style={styles.error}>{friendlyError(item.error_message)}</Text> : null}
          </FormCard>
        </View>
      ))}
      {!items.length ? <Text style={styles.empty}>No sync history yet.</Text> : null}
    </ScrollView>
  );
};

const friendlyError = (message: string) => {
  if (message.includes('patient_uuid')) return 'Patient details were missing from this encounter sync. Retry after saving the patient record.';
  return message;
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: THEME.background },
  content: { padding: 16 },
  timelineRow: { flexDirection: 'row', gap: 12, alignItems: 'flex-start' },
  dot: { width: 12, height: 12, borderRadius: 6, marginTop: 24 },
  dotSuccess: { backgroundColor: THEME.success },
  dotFailed: { backgroundColor: THEME.danger },
  dotPending: { backgroundColor: THEME.warning },
  card: { flex: 1, paddingVertical: 16 },
  cardHead: { flexDirection: 'row', justifyContent: 'space-between', gap: 10, alignItems: 'flex-start' },
  title: { fontSize: 16, fontWeight: '900', color: THEME.text },
  meta: { marginTop: 4, color: THEME.muted, fontWeight: '600' },
  refText: { marginTop: 12, color: THEME.text, fontWeight: '800' },
  timeText: { marginTop: 5, color: THEME.muted, fontSize: 12 },
  statusPill: { paddingHorizontal: 10, paddingVertical: 5, borderRadius: 999, fontSize: 11, fontWeight: '900', overflow: 'hidden' },
  successPill: { color: THEME.success, backgroundColor: '#ECFDF3' },
  failedPill: { color: THEME.danger, backgroundColor: '#FFF1F1' },
  pendingPill: { color: '#B7791F', backgroundColor: '#FFF8E1' },
  error: { color: THEME.danger, marginTop: 10, lineHeight: 19, fontWeight: '600' },
  empty: { padding: 16, color: THEME.muted },
});
