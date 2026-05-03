import AsyncStorage from '@react-native-async-storage/async-storage';
import { useEffect, useMemo, useState } from 'react';
import { Alert, Pressable, ScrollView, StyleSheet, Switch, Text, View } from 'react-native';
import { useNavigation, useRoute } from '@react-navigation/native';
import { v4 as uuidv4 } from 'uuid';
import { DatePickerField } from '../components/DatePickerField';
import { FormCard } from '../components/FormCard';
import { PrimaryButton } from '../components/PrimaryButton';
import { SearchableSelectField } from '../components/SearchableSelectField';
import { Stepper } from '../components/Stepper';
import { TextInputField } from '../components/TextInputField';
import { THEME } from '../config/appConfig';
import { useAppContext } from '../context/AppContext';
import { getLocalDraftByEncounterUuid, listFacilities, listLgas, listWardsByLga, saveEncounterDraft, savePatientDraft, saveReferralDraft, setEntitySyncStatus, upsertSyncQueue } from '../database/repository';
import { FacilityRecord } from '../types/models';
import { validateStep } from '../utils/wizardValidation';
import { WizardData } from '../types/models';

const steps = ['Patient Registration', 'Clinical Information', 'Services Provided', 'Outcome / Referral', 'Review and Submit'];
const LAST_LGA_KEY = 'niger_hmis_last_lga_uuid';
const LAST_WARD_KEY = 'niger_hmis_last_ward_uuid';
const quickServiceChips = ['Deworming', 'Malaria Test', 'ANC Review', 'Vitamin A', 'Immunization', 'Health Talk', 'Wound Dressing'];

const blankWizard = (): WizardData => ({
  patient_uuid: uuidv4(),
  encounter_uuid: uuidv4(),
  referral_uuid: uuidv4(),
  step: 1,
  patient: { anonymized: false, full_name: '', age_years: '', sex: '', phone: '', nhis_status: '', nin: '', lga_uuid: '', ward_uuid: '', primary_facility_uuid: '', consent_confirmed: false },
  clinical: {
    encounter_date: new Date().toISOString().slice(0, 10),
    outreach_location: '',
    presenting_complaint: '',
    symptoms: '',
    disease_program_category: '',
    preliminary_diagnosis: '',
    notes: '',
  },
  services: { services_provided: '', drugs_commodities_issued: '', health_education: '', service_notes: '' },
  outcome: { outcome_status: '', referral_required: false, referral_facility: '', referral_reason: '', urgency_level: '', follow_up_date: '', referral_notes: '' },
});

export const NewEncounterWizard = () => {
  const navigation = useNavigation<any>();
  const route = useRoute<any>();
  const { isOnline, runSync, showToast } = useAppContext();
  const [data, setData] = useState<WizardData>(blankWizard());
  const [saving, setSaving] = useState(false);
  const [syncing, setSyncing] = useState(false);
  const [lgaItems, setLgaItems] = useState<{ label: string; value: string }[]>([]);
  const [wardItems, setWardItems] = useState<{ label: string; value: string }[]>([]);
  const [facilitiesData, setFacilitiesData] = useState<FacilityRecord[]>([]);

  useEffect(() => {
    const load = async () => {
      const [lgas, facilities, lastLga, lastWard] = await Promise.all([listLgas(), listFacilities(), AsyncStorage.getItem(LAST_LGA_KEY), AsyncStorage.getItem(LAST_WARD_KEY)]);
      setLgaItems(lgas.map((item) => ({ label: item.name, value: item.uuid })));
      setFacilitiesData(facilities);

      const draftUuid = route.params?.draftUuid as string | undefined;
      if (draftUuid) {
        const draft = await getLocalDraftByEncounterUuid(draftUuid);
        if (draft) {
          setData((current) => ({
            ...current,
            patient_uuid: draft.patient?.uuid ?? current.patient_uuid,
            encounter_uuid: draft.encounter?.uuid ?? current.encounter_uuid,
            referral_uuid: draft.referral?.uuid ?? current.referral_uuid,
            patient: {
              ...current.patient,
              anonymized: Boolean(draft.patient?.is_anonymized),
              full_name: draft.patient?.full_name ?? '',
              age_years: String(draft.patient?.age_years ?? ''),
              sex: draft.patient?.sex ?? '',
              phone: draft.patient?.phone ?? '',
              nhis_status: draft.patient?.nhis_status ?? '',
              nin: draft.patient?.nin ?? '',
              lga_uuid: draft.patient?.lga_uuid ?? lastLga ?? '',
              ward_uuid: draft.patient?.ward_uuid ?? lastWard ?? '',
              primary_facility_uuid: (draft.patient as any)?.primary_facility_uuid ?? '',
              consent_confirmed: Boolean(draft.patient?.consent_confirmed),
            },
            clinical: {
              ...current.clinical,
              encounter_date: draft.encounter?.encounter_date ?? current.clinical.encounter_date,
              outreach_location: draft.encounter?.outreach_location ?? '',
              presenting_complaint: draft.encounter?.presenting_complaint ?? '',
              symptoms: draft.encounter?.symptoms_json ?? '',
              disease_program_category: draft.encounter?.disease_program_category ?? '',
              preliminary_diagnosis: draft.encounter?.preliminary_diagnosis ?? '',
              notes: draft.encounter?.notes ?? '',
            },
            services: {
              ...current.services,
              services_provided: draft.encounter?.services_provided_json ?? '',
              drugs_commodities_issued: draft.encounter?.drugs_commodities_json ?? '',
              health_education: draft.encounter?.health_education_json ?? '',
              service_notes: draft.encounter?.service_notes ?? '',
            },
            outcome: {
              ...current.outcome,
              outcome_status: draft.encounter?.outcome_status ?? '',
              referral_required: Boolean(draft.encounter?.referral_required),
              referral_facility: draft.encounter?.referral_facility ?? '',
              referral_reason: draft.encounter?.referral_reason ?? '',
              urgency_level: draft.encounter?.urgency_level ?? '',
              follow_up_date: draft.encounter?.follow_up_date ?? '',
              referral_notes: draft.encounter?.referral_notes ?? '',
            },
          }));
          return;
        }
      }

      setData((current) => ({
        ...current,
        patient: { ...current.patient, lga_uuid: current.patient.lga_uuid || lastLga || lgas[0]?.uuid || '', ward_uuid: current.patient.ward_uuid || lastWard || '' },
      }));
    };
    void load();
  }, [route.params]);

  useEffect(() => {
    const loadWards = async () => {
      if (!data.patient.lga_uuid) {
        setWardItems([]);
        return;
      }
      const wards = await listWardsByLga(data.patient.lga_uuid);
      const nextWardItems = wards.map((item) => ({ label: item.name, value: item.uuid }));
      setWardItems(nextWardItems);
      if (data.patient.ward_uuid && !nextWardItems.some((item) => item.value === data.patient.ward_uuid)) {
        setPatientField({ ward_uuid: '' });
      }
    };
    void loadWards();
  }, [data.patient.lga_uuid]);

  const stepErrors = useMemo(() => validateStep(data.step, data), [data]);
  const canProceed = Object.keys(stepErrors).length === 0;

  // All facilities (used on the referral step where any facility can be targeted)
  const facilityItems = useMemo(
    () => facilitiesData.map((f) => ({ label: f.name, value: f.uuid })),
    [facilitiesData]
  );

  // Facilities strictly scoped to the selected LGA — empty when no LGA is chosen.
  const lgaFacilityItems = useMemo(
    () =>
      data.patient.lga_uuid
        ? facilitiesData
            .filter((f) => f.lga_uuid === data.patient.lga_uuid)
            .map((f) => ({ label: f.name, value: f.uuid }))
        : [],
    [facilitiesData, data.patient.lga_uuid]
  );

  const setPatientField = (patch: Partial<WizardData['patient']>) => setData((current) => ({ ...current, patient: { ...current.patient, ...patch } }));
  const setClinicalField = (patch: Partial<WizardData['clinical']>) => setData((current) => ({ ...current, clinical: { ...current.clinical, ...patch } }));
  const setServicesField = (patch: Partial<WizardData['services']>) => setData((current) => ({ ...current, services: { ...current.services, ...patch } }));
  const setOutcomeField = (patch: Partial<WizardData['outcome']>) => setData((current) => ({ ...current, outcome: { ...current.outcome, ...patch } }));

  const patientPayload = useMemo(
    () => ({
      uuid: data.patient_uuid,
      full_name: data.patient.anonymized ? null : data.patient.full_name.trim(),
      is_anonymized: data.patient.anonymized,
      age_years: data.patient.age_years ? Number(data.patient.age_years) : null,
      is_estimated_age: Boolean(data.patient.age_years),
      sex: data.patient.sex || null,
      phone: data.patient.phone || null,
      nhis_status: data.patient.nhis_status || null,
      nin: data.patient.nin.trim() || null,
      lga_uuid: data.patient.lga_uuid || null,
      ward_uuid: data.patient.ward_uuid || null,
      primary_facility_uuid: data.patient.primary_facility_uuid || null,
      consent_confirmed: data.patient.consent_confirmed,
      sync_status: 'draft' as const,
    }),
    [data]
  );

  const encounterPayload = useMemo(
    () => ({
      uuid: data.encounter_uuid,
      patient_uuid: data.patient_uuid,
      version_stamp: 1,
      encounter_date: data.clinical.encounter_date,
      outreach_location: data.clinical.outreach_location,
      presenting_complaint: data.clinical.presenting_complaint,
      symptoms_json: data.clinical.symptoms,
      disease_program_category: data.clinical.disease_program_category,
      preliminary_diagnosis: data.clinical.preliminary_diagnosis,
      notes: data.clinical.notes,
      services_provided_json: data.services.services_provided,
      drugs_commodities_json: data.services.drugs_commodities_issued,
      health_education_json: data.services.health_education,
      service_notes: data.services.service_notes,
      outcome_status: data.outcome.outcome_status,
      referral_required: data.outcome.referral_required,
      referral_uuid: data.referral_uuid,
      referral_facility: data.outcome.referral_facility,
      referral_reason: data.outcome.referral_reason,
      urgency_level: data.outcome.urgency_level,
      follow_up_date: data.outcome.follow_up_date,
      referral_notes: data.outcome.referral_notes,
      sync_status: 'draft' as const,
      current_step: data.step,
    }),
    [data]
  );

  const referralPayload = useMemo(
    () => ({
      uuid: data.referral_uuid,
      patient_uuid: data.patient_uuid,
      encounter_uuid: data.encounter_uuid,
      referral_facility: data.outcome.referral_facility || null,
      referral_reason: data.outcome.referral_reason,
      urgency_level: data.outcome.urgency_level,
      follow_up_date: data.outcome.follow_up_date || null,
      notes: data.outcome.referral_notes || null,
      status: 'active' as const,
      sync_status: 'draft' as const,
    }),
    [data]
  );

  const saveStep = async () => {
    setSaving(true);
    try {
      await savePatientDraft(patientPayload as any);
      await saveEncounterDraft(encounterPayload as any);
      if (data.outcome.referral_required) {
        await saveReferralDraft(referralPayload as any);
      }
      await AsyncStorage.setItem(LAST_LGA_KEY, data.patient.lga_uuid || '');
      await AsyncStorage.setItem(LAST_WARD_KEY, data.patient.ward_uuid || '');
      showToast('Saved locally');
    } finally {
      setSaving(false);
    }
  };

  const queueForSync = async () => {
    await upsertSyncQueue({ entity_type: 'patient', entity_uuid: data.patient_uuid, payload_json: JSON.stringify(patientToBackend(data)), status: 'pending', retry_count: 0, last_error: null });
    await setEntitySyncStatus('patient', data.patient_uuid, 'pending');
    await upsertSyncQueue({ entity_type: 'encounter', entity_uuid: data.encounter_uuid, payload_json: JSON.stringify(encounterToBackend(data)), status: 'pending', retry_count: 0, last_error: null });
    await setEntitySyncStatus('encounter', data.encounter_uuid, 'pending');
    if (data.outcome.referral_required && data.outcome.referral_reason && data.outcome.urgency_level) {
      await upsertSyncQueue({ entity_type: 'referral', entity_uuid: data.referral_uuid, payload_json: JSON.stringify(referralToBackend(data)), status: 'pending', retry_count: 0, last_error: null });
      await setEntitySyncStatus('referral', data.referral_uuid, 'pending');
    }
  };

  const saveCurrentStep = async () => {
    await saveStep();
  };

  const goToStep = async (nextStep: number) => {
    if (nextStep === data.step) return;
    if (nextStep > data.step && !canProceed) {
      Alert.alert('Complete required fields', 'Resolve the highlighted fields before continuing.');
      return;
    }
    await saveCurrentStep();
    setData((current) => ({ ...current, step: nextStep }));
  };

  const handleNext = async () => {
    if (!canProceed) {
      Alert.alert('Complete required fields', 'Resolve the highlighted fields before continuing.');
      return;
    }
    await saveCurrentStep();
    setData((current) => ({ ...current, step: Math.min(current.step + 1, 5) }));
  };

  const handleBack = async () => {
    await saveCurrentStep();
    setData((current) => ({ ...current, step: Math.max(current.step - 1, 1) }));
  };

  const handleSaveDraft = async () => {
    await saveCurrentStep();
    showToast('Draft saved');
    navigation.navigate('Drafts');
  };

  const handlePendingSync = async () => {
    if (!canProceed) {
      Alert.alert('Complete required fields', 'Resolve the highlighted fields before queuing sync.');
      return;
    }
    setSyncing(true);
    try {
      await saveCurrentStep();
      await queueForSync();
      showToast('Queued for sync');
      navigation.navigate('Pending Sync');
    } finally {
      setSyncing(false);
    }
  };

  const handleAttemptSync = async () => {
    if (!canProceed) {
      Alert.alert('Complete required fields', 'Resolve the highlighted fields before syncing.');
      return;
    }
    setSyncing(true);
    try {
      await saveCurrentStep();
      await queueForSync();
      if (isOnline) {
        await runSync();
      } else {
        showToast('Saved locally; offline mode');
      }
      navigation.navigate('Home');
    } finally {
      setSyncing(false);
    }
  };

  const appendQuickService = (service: string) => {
    setServicesField({
      services_provided: data.services.services_provided.includes(service)
        ? data.services.services_provided
        : [data.services.services_provided, service].filter(Boolean).join(', '),
    });
  };

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <Stepper steps={steps} currentStep={data.step} onStepPress={(step) => void goToStep(step)} />

      {data.step === 1 && (
        <FormCard>
          <Text style={styles.section}>Step 1: Patient Registration</Text>

          {lgaItems.length === 0 && (
            <View style={styles.noLgaBanner}>
              <Text style={styles.noLgaText}>
                No LGA has been assigned to your account. Please contact your supervisor/admin before enrolling patients.
              </Text>
            </View>
          )}

          <View style={styles.switchRow}>
            <Text style={styles.switchLabel}>Record as anonymized</Text>
            <Switch value={data.patient.anonymized} onValueChange={(value) => setPatientField({ anonymized: value, full_name: value ? '' : data.patient.full_name })} trackColor={{ false: '#C7DADA', true: THEME.teal }} thumbColor="#fff" />
          </View>
          <TextInputField label="Full name" value={data.patient.full_name} onChangeText={(value) => setPatientField({ full_name: value })} error={stepErrors.full_name} disabled={data.patient.anonymized} />
          <TextInputField label="Age" value={data.patient.age_years} onChangeText={(value) => setPatientField({ age_years: value })} keyboardType="numeric" error={stepErrors.age_years} />
          <SearchableSelectField label="Sex" value={data.patient.sex} onValueChange={(value) => setPatientField({ sex: value })} items={[{ label: 'Male', value: 'male' }, { label: 'Female', value: 'female' }, { label: 'Other', value: 'other' }]} error={stepErrors.sex} />
          <TextInputField label="Phone" value={data.patient.phone} onChangeText={(value) => setPatientField({ phone: value })} keyboardType="phone-pad" />
          <SearchableSelectField label="NHIS status" value={data.patient.nhis_status} onValueChange={(value) => setPatientField({ nhis_status: value })} items={[{ label: 'Active', value: 'active' }, { label: 'Inactive', value: 'inactive' }, { label: 'Unknown', value: 'unknown' }]} />
          <TextInputField label="NIN (optional)" value={data.patient.nin} onChangeText={(value) => setPatientField({ nin: value })} keyboardType="numeric" />
          <SearchableSelectField
            label="LGA"
            value={data.patient.lga_uuid}
            onValueChange={(value) => setPatientField({ lga_uuid: value, ward_uuid: '', primary_facility_uuid: '' })}
            items={lgaItems}
            error={stepErrors.lga_uuid}
            placeholder="Select LGA"
            emptyText="No LGAs assigned to your account"
          />
          <SearchableSelectField
            label="Ward"
            value={data.patient.ward_uuid}
            onValueChange={(value) => setPatientField({ ward_uuid: value })}
            items={wardItems}
            error={stepErrors.ward_uuid}
            placeholder="Select Ward"
            disabled={!data.patient.lga_uuid}
            disabledText="Select LGA first"
            emptyText="No wards available for this LGA"
          />
          <SearchableSelectField
            label="Primary Facility"
            value={data.patient.primary_facility_uuid}
            onValueChange={(value) => setPatientField({ primary_facility_uuid: value })}
            items={lgaFacilityItems}
            placeholder="Select primary facility (optional)"
            disabled={!data.patient.lga_uuid}
            disabledText="Select LGA first"
            emptyText="No facilities for this LGA"
          />
          <View style={styles.switchRow}>
            <Text style={styles.switchLabel}>Consent confirmed</Text>
            <Switch value={data.patient.consent_confirmed} onValueChange={(value) => setPatientField({ consent_confirmed: value })} trackColor={{ false: '#C7DADA', true: THEME.teal }} thumbColor="#fff" />
          </View>
          {stepErrors.consent_confirmed ? <Text style={styles.inlineError}>{stepErrors.consent_confirmed}</Text> : null}
        </FormCard>
      )}

      {data.step === 2 && (
        <FormCard>
          <Text style={styles.section}>Step 2: Clinical Information</Text>
          <DatePickerField label="Encounter date" value={data.clinical.encounter_date} onChange={(value) => setClinicalField({ encounter_date: value })} maximumDate={new Date()} error={stepErrors.encounter_date} />
          <TextInputField label="Outreach location" value={data.clinical.outreach_location} onChangeText={(value) => setClinicalField({ outreach_location: value })} error={stepErrors.outreach_location} />
          <TextInputField label="Presenting complaint" value={data.clinical.presenting_complaint} onChangeText={(value) => setClinicalField({ presenting_complaint: value })} multiline />
          <TextInputField label="Symptoms" value={data.clinical.symptoms} onChangeText={(value) => setClinicalField({ symptoms: value })} multiline />
          <SearchableSelectField label="Disease/program category" value={data.clinical.disease_program_category} onValueChange={(value) => setClinicalField({ disease_program_category: value })} items={[{ label: 'Malaria', value: 'malaria' }, { label: 'Maternal & Child Health', value: 'mch' }, { label: 'Nutrition', value: 'nutrition' }, { label: 'Immunization', value: 'immunization' }, { label: 'NCD', value: 'ncd' }]} error={stepErrors.disease_program_category} />
          <TextInputField label="Preliminary diagnosis" value={data.clinical.preliminary_diagnosis} onChangeText={(value) => setClinicalField({ preliminary_diagnosis: value })} />
          <TextInputField label="Notes" value={data.clinical.notes} onChangeText={(value) => setClinicalField({ notes: value })} multiline />
        </FormCard>
      )}

      {data.step === 3 && (
        <FormCard>
          <Text style={styles.section}>Step 3: Services Provided</Text>
          <Text style={styles.chipLabel}>Quick-select services</Text>
          <View style={styles.chipWrap}>
            {quickServiceChips.map((service) => (
              <Pressable
                key={service}
                onPress={() => appendQuickService(service)}
                style={({ pressed }) => [styles.chip, pressed && { opacity: 0.7 }]}
              >
                <Text style={styles.chipText}>{service}</Text>
              </Pressable>
            ))}
          </View>
          <TextInputField label="Services provided" value={data.services.services_provided} onChangeText={(value) => setServicesField({ services_provided: value })} multiline error={stepErrors.services} />
          <TextInputField label="Drugs/commodities issued" value={data.services.drugs_commodities_issued} onChangeText={(value) => setServicesField({ drugs_commodities_issued: value })} multiline />
          <TextInputField label="Health education/counselling" value={data.services.health_education} onChangeText={(value) => setServicesField({ health_education: value })} multiline />
          <TextInputField label="Service notes" value={data.services.service_notes} onChangeText={(value) => setServicesField({ service_notes: value })} multiline />
        </FormCard>
      )}

      {data.step === 4 && (
        <FormCard>
          <Text style={styles.section}>Step 4: Outcome / Referral</Text>
          <SearchableSelectField label="Outcome status" value={data.outcome.outcome_status} onValueChange={(value) => setOutcomeField({ outcome_status: value })} items={[{ label: 'Resolved', value: 'resolved' }, { label: 'Improved', value: 'improved' }, { label: 'Unchanged', value: 'unchanged' }, { label: 'Referred', value: 'referred' }]} />
          <View style={styles.switchRow}>
            <Text style={styles.switchLabel}>Referral required</Text>
            <Switch value={data.outcome.referral_required} onValueChange={(value) => setOutcomeField({ referral_required: value })} trackColor={{ false: '#C7DADA', true: THEME.teal }} thumbColor="#fff" />
          </View>
          <SearchableSelectField label="Referral facility" value={data.outcome.referral_facility} onValueChange={(value) => setOutcomeField({ referral_facility: value })} items={facilityItems} error={stepErrors.referral_facility} disabled={!data.outcome.referral_required} placeholder="Select facility" emptyText="No facilities available — sync after login to populate list." />
          <TextInputField label="Referral reason" value={data.outcome.referral_reason} onChangeText={(value) => setOutcomeField({ referral_reason: value })} multiline error={stepErrors.referral_reason} disabled={!data.outcome.referral_required} />
          <SearchableSelectField label="Urgency level" value={data.outcome.urgency_level} onValueChange={(value) => setOutcomeField({ urgency_level: value })} items={[{ label: 'Low', value: 'low' }, { label: 'Medium', value: 'medium' }, { label: 'High', value: 'high' }, { label: 'Critical', value: 'critical' }]} error={stepErrors.urgency_level} disabled={!data.outcome.referral_required} />
          <DatePickerField label="Follow-up date" value={data.outcome.follow_up_date} onChange={(value) => setOutcomeField({ follow_up_date: value })} minimumDate={new Date()} />
          <TextInputField label="Referral notes" value={data.outcome.referral_notes} onChangeText={(value) => setOutcomeField({ referral_notes: value })} multiline />
        </FormCard>
      )}

      {data.step === 5 && (
        <FormCard>
          <Text style={styles.section}>Step 5: Review and Submit</Text>
          <Text style={styles.summaryLabel}>Patient</Text>
          <Text style={styles.summaryText}>{data.patient.anonymized ? 'Anonymized record' : data.patient.full_name || 'Unnamed patient'}</Text>
          <Text style={styles.summaryLabel}>Clinical</Text>
          <Text style={styles.summaryText}>{data.clinical.presenting_complaint || 'No complaint captured'}</Text>
          <Text style={styles.summaryLabel}>Services</Text>
          <Text style={styles.summaryText}>{data.services.services_provided || 'No service captured'}</Text>
          <Text style={styles.summaryLabel}>Outcome</Text>
          <Text style={styles.summaryText}>{data.outcome.outcome_status || 'Outcome not set'}</Text>
          <PrimaryButton title="Save as Draft" onPress={() => void handleSaveDraft()} variant="outline" />
          <PrimaryButton title="Mark as Pending Sync" onPress={() => void handlePendingSync()} />
          <PrimaryButton title={isOnline ? 'Attempt Sync Now' : 'Offline - Save Pending'} onPress={() => void handleAttemptSync()} loading={syncing} variant={isOnline ? 'solid' : 'outline'} />
        </FormCard>
      )}

      <View style={styles.actionRow}>
        <PrimaryButton title="Back" onPress={() => void handleBack()} variant="outline" disabled={data.step === 1} style={{ flex: 1 }} />
        {data.step < 5 ? <PrimaryButton title="Next" onPress={() => void handleNext()} loading={saving} disabled={!canProceed} style={{ flex: 1 }} /> : null}
      </View>
      <Text style={[styles.hint, canProceed && styles.hintValid]}>
        {canProceed ? '✓ Step complete' : 'Complete the highlighted fields to continue.'}
      </Text>
    </ScrollView>
  );
};

const patientToBackend = (data: WizardData) => {
  const parts = data.patient.full_name.trim().split(/\s+/).filter(Boolean);
  return {
    first_name: parts[0] ?? null,
    middle_name: parts.length > 2 ? parts.slice(1, -1).join(' ') : null,
    last_name: parts.length > 1 ? parts[parts.length - 1] ?? null : null,
    sex: data.patient.sex || null,
    date_of_birth: null,
    estimated_age_years: data.patient.age_years ? Number(data.patient.age_years) : null,
    is_estimated_age: Boolean(data.patient.age_years),
    temporary_id_hash: data.patient.anonymized ? data.patient_uuid.replace(/-/g, '') : null,
    phone_number: data.patient.phone || null,
    nin: data.patient.nin.trim() || null,
    address_line: null,
    lga_uuid: data.patient.lga_uuid || null,
    ward_uuid: data.patient.ward_uuid || null,
    primary_facility_uuid: data.patient.primary_facility_uuid || null,
    is_anonymized: data.patient.anonymized,
    consent_confirmed: data.patient.consent_confirmed,
  };
};

const encounterToBackend = (data: WizardData) => ({
  patient_uuid: data.patient_uuid,
  encounter_type: data.outcome.outcome_status || 'outreach',
  service_point: data.clinical.outreach_location || null,
  encounter_date: data.clinical.encounter_date || null,
  version_stamp: 1,
  supersedes_uuid: null,
  findings: {
    presenting_complaint: data.clinical.presenting_complaint,
    symptoms: data.clinical.symptoms,
    disease_program_category: data.clinical.disease_program_category,
    preliminary_diagnosis: data.clinical.preliminary_diagnosis,
    services_provided: data.services.services_provided,
    drugs_commodities_issued: data.services.drugs_commodities_issued,
    health_education: data.services.health_education,
    service_notes: data.services.service_notes,
    outcome_status: data.outcome.outcome_status,
    referral_required: data.outcome.referral_required,
  },
  notes: data.clinical.notes,
  referral_status: data.outcome.referral_required ? 'referred' : 'none',
  referral_reason: data.outcome.referral_reason || null,
  urgency: data.outcome.urgency_level || null,
  referred_to_facility: data.outcome.referral_facility || null,
  lga_uuid: data.patient.lga_uuid || null,
  ward_uuid: data.patient.ward_uuid || null,
});

const referralToBackend = (data: WizardData) => ({
  patient_uuid: data.patient_uuid,
  encounter_uuid: data.encounter_uuid,
  referred_to_facility: data.outcome.referral_facility || null,
  referral_reason: data.outcome.referral_reason,
  urgency: data.outcome.urgency_level,
  status: 'active',
  completed_at: null,
  completed_by: null,
  lga_uuid: data.patient.lga_uuid || null,
  ward_uuid: data.patient.ward_uuid || null,
});

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: THEME.background },
  content: { padding: 16, paddingBottom: 40 },
  section: {
    fontSize: 16,
    fontWeight: '800',
    color: THEME.teal,
    marginBottom: 16,
    paddingBottom: 10,
    borderBottomWidth: 1.5,
    borderColor: THEME.tealLight,
    letterSpacing: 0.2,
  },
  switchRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: THEME.background,
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 12,
    marginBottom: 14,
    borderWidth: 1,
    borderColor: THEME.border,
  },
  switchLabel: { fontWeight: '600', color: THEME.text, fontSize: 14, flex: 1, marginRight: 12 },
  actionRow: { flexDirection: 'row', gap: 10, marginTop: 8 },
  hint: {
    marginTop: 8,
    marginBottom: 4,
    color: THEME.muted,
    fontSize: 12,
    textAlign: 'center',
  },
  hintValid: { color: THEME.success, fontWeight: '600' },
  inlineError: { color: THEME.danger, marginBottom: 10, fontSize: 12, fontWeight: '500' },
  summaryLabel: { marginTop: 12, color: THEME.muted, fontWeight: '700', fontSize: 12, textTransform: 'uppercase', letterSpacing: 0.5 },
  summaryText: { color: THEME.text, marginTop: 4, lineHeight: 22, fontSize: 15 },
  summaryDivider: { height: 1, backgroundColor: THEME.border, marginTop: 10 },
  chipLabel: { fontWeight: '600', color: THEME.text, marginBottom: 8, fontSize: 13 },
  chipWrap: { flexDirection: 'row', flexWrap: 'wrap', marginBottom: 14, gap: 8 },
  chip: {
    backgroundColor: THEME.tealLight,
    borderColor: THEME.teal,
    borderWidth: 1,
    borderRadius: 999,
    paddingHorizontal: 14,
    paddingVertical: 8,
    overflow: 'hidden',
  },
  chipText: { color: THEME.teal, fontSize: 13, fontWeight: '600' },
  noLgaBanner: {
    backgroundColor: '#fff3cd',
    borderColor: '#ffc107',
    borderWidth: 1,
    borderRadius: 8,
    padding: 12,
    marginBottom: 14,
  },
  noLgaText: {
    color: '#856404',
    fontSize: 13,
    fontWeight: '600',
    lineHeight: 20,
  },
});
