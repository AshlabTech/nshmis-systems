import React, { useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react';
import { Alert, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { ChevronRight, ClipboardList, Clock3, FileText, History, LogOut, Plus, Users } from 'lucide-react-native';
import { CloudSyncIndicator } from '../components/CloudSyncIndicator';
import { FormCard } from '../components/FormCard';
import { PrimaryButton } from '../components/PrimaryButton';
import { THEME } from '../config/appConfig';
import { useAppContext } from '../context/AppContext';
import { listQueueItems, listPatients, listEncounters } from '../database/repository';
import { EncounterRecord, PatientRecord, SyncQueueRecord } from '../types/models';

const quickLinks = [
  { label: 'Drafts', detail: 'Continue incomplete encounters', route: 'Drafts', icon: FileText },
  { label: 'Patients', detail: 'Browse local patient records', route: 'Patients', icon: Users },
  { label: 'Encounters', detail: 'Review captured services', route: 'Encounters', icon: ClipboardList },
  { label: 'Sync History', detail: 'Audit sync attempts and responses', route: 'Sync History', icon: History },
];

const ratio = (value: number, total: number) => `${Math.max(8, total ? Math.round((value / total) * 100) : 8)}%` as const;

export const HomeScreen = () => {
  const navigation = useNavigation<any>();
  const { isOnline, syncInProgress, runSync, lastSyncMessage, signOut, userId } = useAppContext();
  const [queue, setQueue] = useState<SyncQueueRecord[]>([]);
  const [patients, setPatients] = useState<PatientRecord[]>([]);
  const [encounters, setEncounters] = useState<EncounterRecord[]>([]);

  useEffect(() => {
    const load = async () => {
      const [nextQueue, nextPatients, nextEncounters] = await Promise.all([listQueueItems(), listPatients(500, 0), listEncounters(500, 0)]);
      setQueue(nextQueue);
      setPatients(nextPatients);
      setEncounters(nextEncounters);
    };
    void load();
  }, [lastSyncMessage]);

  const pendingCount = queue.filter((item) => item.status !== 'synced').length;
  const failedCount = queue.filter((item) => item.status === 'failed' || item.status === 'conflict').length;
  const syncedRecords = patients.filter((item) => item.sync_status === 'synced').length + encounters.filter((item) => item.sync_status === 'synced').length;
  const draftRecords = patients.filter((item) => item.sync_status === 'draft').length + encounters.filter((item) => item.sync_status === 'draft').length;
  const pendingRecords = patients.filter((item) => ['pending', 'syncing'].includes(item.sync_status)).length + encounters.filter((item) => ['pending', 'syncing'].includes(item.sync_status)).length;
  const totalRecords = patients.length + encounters.length;

  const latestLabel = useMemo(() => {
    const latest = [...encounters].sort((a, b) => String(b.created_at ?? '').localeCompare(String(a.created_at ?? '')))[0];
    return latest?.encounter_date ?? 'No encounters yet';
  }, [encounters]);

  const handleLogout = () => {
    const unsyncedCount = draftRecords + pendingRecords + failedCount;
    const detail =
      unsyncedCount > 0
        ? `You have ${unsyncedCount} unsynced record(s).\n\nYour local data stays on this device — log back in to sync them to the server.\n\nLog out now?`
        : 'Your local data will remain on this device.\n\nLog out?';
    Alert.alert('Log out', detail, [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Log Out', style: 'destructive', onPress: () => void signOut() },
    ]);
  };

  // Use a ref so the header button always calls the latest handler without
  // re-registering headerRight on every state change.
  const handleLogoutRef = useRef(handleLogout);
  handleLogoutRef.current = handleLogout;

  useLayoutEffect(() => {
    navigation.setOptions({
      headerRight: () => (
        <Pressable onPress={() => handleLogoutRef.current()} hitSlop={10} style={styles.logoutBtn}>
          <LogOut size={19} color="#fff" />
        </Pressable>
      ),
    });
  }, [navigation]);

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <View style={styles.hero}>
        <View style={styles.heroCopy}>
          <Text style={styles.eyebrow}>Niger HMIS Outreach</Text>
          <Text style={styles.heading}>Field dashboard</Text>
          <Text style={styles.subheading}>Capture encounters, monitor local workload, and keep sync health visible.</Text>
          {!!userId && <Text style={styles.userPill}>User: {userId}</Text>}
        </View>
        <CloudSyncIndicator isOnline={isOnline} pendingCount={pendingCount} syncing={syncInProgress} />
      </View>

      <View style={styles.kpiGrid}>
        <KpiCard label="Patients" value={patients.length} />
        <KpiCard label="Encounters" value={encounters.length} />
        <KpiCard label="Pending" value={pendingCount} tone={pendingCount ? 'warn' : 'ok'} />
      </View>

      <FormCard style={styles.chartCard}>
        <View style={styles.cardHeader}>
          <View>
            <Text style={styles.sectionTitle}>Activity mix</Text>
            <Text style={styles.sectionCopy}>Local records captured on this device</Text>
          </View>
          <Text style={styles.badge}>{totalRecords} total</Text>
        </View>
        <BarRow label="Patients" value={patients.length} total={Math.max(totalRecords, 1)} color={THEME.teal} />
        <BarRow label="Encounters" value={encounters.length} total={Math.max(totalRecords, 1)} color="#4F46E5" />
      </FormCard>

      <FormCard style={styles.chartCard}>
        <View style={styles.cardHeader}>
          <View>
            <Text style={styles.sectionTitle}>Sync status</Text>
            <Text style={styles.sectionCopy}>Draft, pending, failed, and synced workload</Text>
          </View>
          <Text style={[styles.badge, failedCount ? styles.badgeDanger : null]}>{failedCount} failed</Text>
        </View>
        <View style={styles.segmentTrack}>
          <View style={[styles.segment, { width: ratio(syncedRecords, Math.max(totalRecords, 1)), backgroundColor: THEME.success }]} />
          <View style={[styles.segment, { width: ratio(pendingRecords, Math.max(totalRecords, 1)), backgroundColor: THEME.warning }]} />
          <View style={[styles.segment, { width: ratio(draftRecords, Math.max(totalRecords, 1)), backgroundColor: '#94A3B8' }]} />
        </View>
        <View style={styles.legendRow}>
          <Legend color={THEME.success} label={`Synced ${syncedRecords}`} />
          <Legend color={THEME.warning} label={`Pending ${pendingRecords}`} />
          <Legend color="#94A3B8" label={`Draft ${draftRecords}`} />
        </View>
        <Text style={styles.latestText}>Latest encounter: {latestLabel}</Text>
      </FormCard>

      {!!lastSyncMessage && <Text style={styles.syncMessage}>{lastSyncMessage}</Text>}

      <View style={styles.actionPanel}>
        <PrimaryButton title="New Encounter" onPress={() => navigation.navigate('NewEncounterWizard')} />
        <View style={styles.secondaryActions}>
          <PrimaryButton title="Sync Now" onPress={() => void runSync()} variant="outline" style={styles.actionButton} />
          <PrimaryButton title="Retry Failed" onPress={() => void runSync({ retryFailedOnly: true })} variant="outline" style={styles.actionButton} />
        </View>
      </View>

      <FormCard style={styles.linksCard}>
        <Text style={styles.sectionTitle}>Workspaces</Text>
        {quickLinks.map((item) => {
          const Icon = item.icon;
          return (
            <Pressable key={item.route} onPress={() => navigation.navigate(item.route)} style={({ pressed }) => [styles.linkRow, pressed && styles.linkPressed]}>
              <View style={styles.linkIcon}>
                <Icon size={18} color={THEME.teal} />
              </View>
              <View style={styles.linkCopy}>
                <Text style={styles.linkText}>{item.label}</Text>
                <Text style={styles.linkDetail}>{item.detail}</Text>
              </View>
              <ChevronRight size={18} color={THEME.muted} />
            </Pressable>
          );
        })}
      </FormCard>

      <Pressable style={styles.fab} onPress={() => navigation.navigate('NewEncounterWizard')}>
        <Plus size={22} color="#fff" />
      </Pressable>
    </ScrollView>
  );
};

const KpiCard = ({ label, value, tone }: { label: string; value: number; tone?: 'ok' | 'warn' }) => (
  <View style={[styles.kpiCard, tone === 'ok' && styles.kpiOk, tone === 'warn' && styles.kpiWarn]}>
    <Text style={styles.kpiValue}>{value}</Text>
    <Text style={styles.kpiLabel}>{label}</Text>
  </View>
);

const BarRow = ({ label, value, total, color }: { label: string; value: number; total: number; color: string }) => (
  <View style={styles.barRow}>
    <View style={styles.barMeta}>
      <Text style={styles.barLabel}>{label}</Text>
      <Text style={styles.barValue}>{value}</Text>
    </View>
    <View style={styles.barTrack}>
      <View style={[styles.barFill, { width: ratio(value, total), backgroundColor: color }]} />
    </View>
  </View>
);

const Legend = ({ color, label }: { color: string; label: string }) => (
  <View style={styles.legendItem}>
    <View style={[styles.legendDot, { backgroundColor: color }]} />
    <Text style={styles.legendText}>{label}</Text>
  </View>
);

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: THEME.background },
  content: { padding: 16, paddingBottom: 34 },
  hero: {
    backgroundColor: THEME.text,
    borderRadius: 22,
    padding: 18,
    marginBottom: 14,
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    gap: 12,
  },
  heroCopy: { flex: 1 },
  eyebrow: { color: '#9BE1DD', fontSize: 12, fontWeight: '900', textTransform: 'uppercase', marginBottom: 6 },
  heading: { fontSize: 26, fontWeight: '900', color: '#fff' },
  subheading: { color: '#C9DDDD', marginTop: 8, lineHeight: 20 },
  kpiGrid: { flexDirection: 'row', gap: 10, marginBottom: 12 },
  kpiCard: { flex: 1, backgroundColor: '#fff', borderRadius: 16, borderWidth: 1, borderColor: THEME.border, padding: 14 },
  kpiOk: { borderColor: '#BDE7C9', backgroundColor: '#F6FFF8' },
  kpiWarn: { borderColor: '#F8D996', backgroundColor: '#FFF9EC' },
  kpiValue: { color: THEME.text, fontSize: 22, fontWeight: '900' },
  kpiLabel: { color: THEME.muted, marginTop: 4, fontSize: 12, fontWeight: '800' },
  chartCard: { paddingVertical: 16 },
  cardHeader: { flexDirection: 'row', justifyContent: 'space-between', gap: 12, alignItems: 'flex-start', marginBottom: 14 },
  sectionTitle: { fontSize: 16, fontWeight: '900', color: THEME.text },
  sectionCopy: { color: THEME.muted, marginTop: 3, fontSize: 12 },
  badge: { color: THEME.tealDark, backgroundColor: THEME.tealLight, paddingHorizontal: 10, paddingVertical: 5, borderRadius: 999, fontSize: 12, fontWeight: '900' },
  badgeDanger: { color: THEME.danger, backgroundColor: '#FFF1F1' },
  barRow: { marginTop: 10 },
  barMeta: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 7 },
  barLabel: { color: THEME.text, fontWeight: '800' },
  barValue: { color: THEME.muted, fontWeight: '800' },
  barTrack: { height: 12, borderRadius: 999, backgroundColor: '#E7EFEF', overflow: 'hidden' },
  barFill: { height: '100%', borderRadius: 999 },
  segmentTrack: { height: 18, borderRadius: 999, backgroundColor: '#E7EFEF', overflow: 'hidden', flexDirection: 'row' },
  segment: { height: '100%' },
  legendRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 10, marginTop: 12 },
  legendItem: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  legendDot: { width: 9, height: 9, borderRadius: 5 },
  legendText: { color: THEME.muted, fontSize: 12, fontWeight: '700' },
  latestText: { color: THEME.muted, marginTop: 12, fontSize: 12 },
  syncMessage: { color: THEME.muted, marginBottom: 8, lineHeight: 19 },
  actionPanel: { marginBottom: 6 },
  secondaryActions: { flexDirection: 'row', gap: 10 },
  actionButton: { flex: 1 },
  linksCard: { marginTop: 8, paddingVertical: 14 },
  linkRow: { flexDirection: 'row', alignItems: 'center', paddingVertical: 13, borderTopWidth: StyleSheet.hairlineWidth, borderColor: THEME.border },
  linkPressed: { opacity: 0.75 },
  linkIcon: { width: 36, height: 36, borderRadius: 12, alignItems: 'center', justifyContent: 'center', backgroundColor: THEME.tealLight, marginRight: 12 },
  linkCopy: { flex: 1 },
  linkText: { color: THEME.text, fontWeight: '900', fontSize: 15 },
  linkDetail: { color: THEME.muted, marginTop: 2, fontSize: 12 },
  fab: {
    position: 'absolute',
    right: 20,
    bottom: 22,
    width: 56,
    height: 56,
    borderRadius: 28,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: THEME.teal,
    shadowColor: '#000',
    shadowOpacity: 0.18,
    shadowRadius: 14,
    shadowOffset: { width: 0, height: 8 },
    elevation: 8,
  },
  logoutBtn: { paddingHorizontal: 6, paddingVertical: 4 },
  userPill: {
    marginTop: 10,
    color: '#9BE1DD',
    fontSize: 11,
    fontWeight: '700',
  },
});
