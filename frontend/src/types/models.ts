export type SyncStatus = 'draft' | 'pending' | 'syncing' | 'synced' | 'failed' | 'conflict';
export type QueueStatus = 'pending' | 'syncing' | 'synced' | 'failed' | 'conflict';

export type PatientRecord = {
  id?: number;
  uuid: string;
  server_id?: number | null;
  device_id?: string | null;
  user_id?: string | null;
  created_offline_at?: string | null;
  full_name?: string | null;
  first_name?: string;
  middle_name?: string;
  last_name?: string;
  is_anonymized: boolean;
  age_years?: number | null;
  is_estimated_age: boolean;
  sex?: string | null;
  phone?: string | null;
  nhis_status?: string | null;
  nin?: string | null;
  lga_uuid?: string | null;
  ward_uuid?: string | null;
  primary_facility_uuid?: string | null;
  consent_confirmed: boolean;
  temporary_id_hash?: string | null;
  sync_status: SyncStatus;
  synced_at?: string | null;
  created_at?: string;
  updated_at?: string;
};

export type EncounterRecord = {
  id?: number;
  uuid: string;
  server_id?: number | null;
  patient_uuid: string;
  version_stamp: number;
  encounter_date?: string | null;
  outreach_location?: string | null;
  presenting_complaint?: string | null;
  symptoms_json?: string | null;
  disease_program_category?: string | null;
  preliminary_diagnosis?: string | null;
  notes?: string | null;
  services_provided_json?: string | null;
  drugs_commodities_json?: string | null;
  health_education_json?: string | null;
  service_notes?: string | null;
  outcome_status?: string | null;
  referral_required: boolean;
  referral_uuid?: string | null;
  referral_facility?: string | null;
  referral_reason?: string | null;
  urgency_level?: string | null;
  follow_up_date?: string | null;
  referral_notes?: string | null;
  device_id?: string | null;
  user_id?: string | null;
  created_offline_at?: string | null;
  sync_status: SyncStatus;
  synced_at?: string | null;
  current_step: number;
  created_at?: string;
  updated_at?: string;
};

export type ReferralRecord = {
  id?: number;
  uuid: string;
  server_id?: number | null;
  patient_uuid: string;
  encounter_uuid: string;
  referral_facility?: string | null;
  referral_reason: string;
  urgency_level: string;
  follow_up_date?: string | null;
  notes?: string | null;
  status: 'active' | 'completed' | 'cancelled';
  device_id?: string | null;
  user_id?: string | null;
  created_offline_at?: string | null;
  sync_status: SyncStatus;
  synced_at?: string | null;
  created_at?: string;
  updated_at?: string;
};

export type SyncQueueRecord = {
  id?: number;
  entity_type: 'patient' | 'encounter' | 'referral';
  entity_uuid: string;
  payload_json: string;
  status: QueueStatus;
  retry_count: number;
  next_retry_at?: string | null;
  last_error?: string | null;
  backend_response_json?: string | null;
  synced_at?: string | null;
  device_id?: string | null;
  user_id?: string | null;
  created_at?: string;
  updated_at?: string;
};

export type SyncLogRecord = {
  id?: number;
  queue_id?: number | null;
  entity_type: 'patient' | 'encounter' | 'referral';
  entity_uuid: string;
  action: 'queued' | 'sync_attempt' | 'synced' | 'failed';
  status: QueueStatus | 'queued';
  request_json?: string | null;
  response_json?: string | null;
  error_message?: string | null;
  device_id?: string | null;
  user_id?: string | null;
  created_at?: string;
};

export type LgaRecord = { id?: number; uuid: string; name: string };
export type WardRecord = { id?: number; uuid: string; lga_uuid: string; name: string };
export type FacilityRecord = {
  id?: number;
  uuid: string;
  name: string;
  facility_type?: string | null;
  type?: string | null;
  lga_uuid?: string | null;
  ward_uuid?: string | null;
  status?: string | null;
  created_at?: string;
  updated_at?: string;
};

export type WizardData = {
  patient_uuid: string;
  encounter_uuid: string;
  referral_uuid: string;
  step: number;
  patient: {
    anonymized: boolean;
    full_name: string;
    age_years: string;
    sex: string;
    phone: string;
    nhis_status: string;
    nin: string;
    lga_uuid: string;
    ward_uuid: string;
    primary_facility_uuid: string;
    consent_confirmed: boolean;
  };
  clinical: {
    encounter_date: string;
    outreach_location: string;
    presenting_complaint: string;
    symptoms: string;
    disease_program_category: string;
    preliminary_diagnosis: string;
    notes: string;
  };
  services: {
    services_provided: string;
    drugs_commodities_issued: string;
    health_education: string;
    service_notes: string;
  };
  outcome: {
    outcome_status: string;
    referral_required: boolean;
    referral_facility: string;
    referral_reason: string;
    urgency_level: string;
    follow_up_date: string;
    referral_notes: string;
  };
};

export type ValidationErrors = Record<string, string>;
