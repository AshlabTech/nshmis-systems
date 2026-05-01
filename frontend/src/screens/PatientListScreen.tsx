import React, { useEffect, useState } from 'react';
import { ScrollView, Text, StyleSheet } from 'react-native';
import { FormCard } from '../components/FormCard';
import { StatusBadge } from '../components/StatusBadge';
import { PrimaryButton } from '../components/PrimaryButton';
import { THEME } from '../config/appConfig';
import { listPatients } from '../database/repository';
import { PatientRecord } from '../types/models';

export const PatientListScreen = () => {
  const [items, setItems] = useState<PatientRecord[]>([]);
  const [page, setPage] = useState(1);
  const pageSize = 20;

  useEffect(() => {
    const load = async () => setItems(await listPatients(pageSize, 0));
    void load();
  }, []);

  const loadMore = async () => {
    const nextPage = page + 1;
    const next = await listPatients(pageSize, (nextPage - 1) * pageSize);
    setItems((current) => [...current, ...next]);
    setPage(nextPage);
  };

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      {items.map((item) => (
        <FormCard key={item.uuid}>
          <Text style={styles.title}>{item.full_name}</Text>
          <Text style={styles.meta}>{item.sex || 'Sex not set'} • {item.age_years ?? 'Age not set'} years</Text>
          <Text style={styles.meta}>{item.phone || 'No phone'}</Text>
          <StatusBadge status={item.sync_status} />
        </FormCard>
      ))}
      {!items.length ? <Text style={styles.empty}>No patients recorded locally.</Text> : null}
      {items.length >= page * pageSize ? <PrimaryButton title="Load More" onPress={() => void loadMore()} variant="outline" /> : null}
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: THEME.background },
  content: { padding: 16 },
  title: { fontSize: 16, fontWeight: '800', color: THEME.text },
  meta: { marginTop: 6, color: THEME.muted },
  empty: { padding: 16, color: THEME.muted },
});
