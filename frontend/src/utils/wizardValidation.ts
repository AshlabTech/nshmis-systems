import { ValidationErrors, WizardData } from '../types/models';

const isNumericAge = (value: string) => /^\d{1,3}$/.test(value.trim()) && Number(value) >= 0 && Number(value) <= 120;

export const validatePatientStep = (data: WizardData): ValidationErrors => {
  const errors: ValidationErrors = {};

  if (data.patient.anonymized && data.patient.full_name.trim()) {
    errors.full_name = 'Full name must be blank for anonymized records.';
  }
  if (!data.patient.anonymized && !data.patient.full_name.trim()) {
    errors.full_name = 'Full name is required.';
  }
  if (!data.patient.age_years.trim() || !isNumericAge(data.patient.age_years)) {
    errors.age_years = 'Age must be a number between 0 and 120.';
  }
  if (!data.patient.sex.trim()) {
    errors.sex = 'Sex is required.';
  }
  if (!data.patient.lga_uuid.trim()) {
    errors.lga_uuid = 'LGA is required.';
  }
  if (!data.patient.ward_uuid.trim()) {
    errors.ward_uuid = 'Ward is required.';
  }
  if (!data.patient.consent_confirmed) {
    errors.consent_confirmed = 'Consent must be confirmed.';
  }

  return errors;
};

export const validateClinicalStep = (data: WizardData): ValidationErrors => {
  const errors: ValidationErrors = {};
  if (!data.clinical.encounter_date.trim()) errors.encounter_date = 'Encounter date is required.';
  if (!data.clinical.outreach_location.trim()) errors.outreach_location = 'Outreach location is required.';
  if (!data.clinical.disease_program_category.trim()) errors.disease_program_category = 'Disease/program category is required.';
  return errors;
};

export const validateServicesStep = (data: WizardData): ValidationErrors => {
  const errors: ValidationErrors = {};
  const serviceFields = [data.services.services_provided, data.services.drugs_commodities_issued, data.services.health_education, data.services.service_notes];
  if (!serviceFields.some((field) => field.trim().length > 0)) {
    errors.services = 'At least one service or note is required.';
  }
  return errors;
};

export const validateOutcomeStep = (data: WizardData): ValidationErrors => {
  const errors: ValidationErrors = {};
  if (data.outcome.referral_required) {
    if (!data.outcome.referral_facility.trim()) errors.referral_facility = 'Referral facility is required.';
    if (!data.outcome.referral_reason.trim()) errors.referral_reason = 'Referral reason is required.';
    if (!data.outcome.urgency_level.trim()) errors.urgency_level = 'Urgency level is required.';
  }
  return errors;
};

export const validateStep = (step: number, data: WizardData) => {
  switch (step) {
    case 1:
      return validatePatientStep(data);
    case 2:
      return validateClinicalStep(data);
    case 3:
      return validateServicesStep(data);
    case 4:
      return validateOutcomeStep(data);
    default:
      return {};
  }
};
