import { useState } from 'react';
import { useTranslation } from 'react-i18next';
/** @import { FormState } from '../utils' */
/** @import { RequestType } from '../components/RequestTypeSelector' */
import {
  emptyForm,
  validateAgreements,
  validateBankStep,
  validateStep1,
  validateStep2
} from '../utils';

/**
 * The registration wizard's state and handlers: the two-stage request-type
 * choice, the current step, the form values, the errors shown under fields,
 * and whether the walkthrough has been submitted. Nothing here calls a
 * service: `/register` is a walkthrough and submitting only flips `submitted`.
 */
export function useRegistrationWizard() {
  const { t } = useTranslation();
  // Two-stage selection: pendingRequestType is what the card click sets (drives info banner);
  // confirmedRequestType is what Continue commits (drives wizard mount).
  const [pendingRequestType, setPendingRequestType] = useState(
    /** @type {RequestType | null} */ (null)
  );
  const [requestType, setRequestType] = useState(/** @type {RequestType | null} */ (null));
  const [currentStep, setCurrentStep] = useState(0);
  const [form, setForm] = useState(/** @type {() => FormState} */ (emptyForm));
  const [errors, setErrors] = useState(/** @type {Record<string, string>} */ ({}));
  const [catError, setCatError] = useState('');
  const [submitted, setSubmitted] = useState(false);
  // ⚠️ **THE MINT IS DELETED.** It read
  // `String(10000 + Math.floor(Math.random() * 90000))` and was rendered as
  // `APP-2026-{n}` to an external party, beside four next-steps promising an
  // email and onboarding credentials. Nothing anywhere held that number. A
  // `ProvenanceMarker` cannot un-tell a forged document number, and this one
  // faced OUTWARD. Real application numbers are minted by
  // `supplierApplicationStore` and named on the row they belong to.

  const resetWizardState = () => {
    setCurrentStep(0);
    setForm(emptyForm());
    setErrors({});
    setCatError('');
  };

  /** @param {RequestType} type */
  const handleSelectRequestType = (type) => {
    setPendingRequestType(type);
  };

  const handleContinueFromTypeSelector = () => {
    if (!pendingRequestType) return;
    resetWizardState();
    setRequestType(pendingRequestType);
  };

  const changeRequestType = () => {
    setRequestType(null);
    setPendingRequestType(null);
    resetWizardState();
  };

  // Per-step validity gate for Wizard
  /**
   * @param {number} step
   * @returns {boolean}
   */
  const isStepValid = (step) => {
    if (!requestType) return false;
    if (requestType === 'External SR') {
      if (step === 0) return Object.keys(validateStep1(form, t)).length === 0;
      if (step === 1) return Object.keys(validateStep2(form, t)).length === 0;
      if (step === 2) return form.selCats.length > 0;
      if (step === 3) return Object.keys(validateBankStep(form, t)).length === 0;
      if (step === 4) return Object.keys(validateAgreements(form, t)).length === 0;
    }
    if (requestType === 'Internal SR') {
      if (step === 0) return form.selCats.length > 0;
      if (step === 1) return Object.keys(validateStep2(form, t)).length === 0;
      if (step === 2) return Object.keys(validateAgreements(form, t)).length === 0;
    }
    if (requestType === 'KOL') {
      if (step === 0) return Object.keys(validateStep1(form, t)).length === 0;
      if (step === 1) return Object.keys(validateBankStep(form, t)).length === 0;
    }
    return true;
  };

  /** @param {number} next */
  const handleStepChange = (next) => {
    // Compute errors when moving forward
    if (next > currentStep && requestType) {
      /** @type {Record<string, string>} */
      let stepErrors = {};
      let ce = '';
      if (requestType === 'External SR') {
        if (currentStep === 0) stepErrors = validateStep1(form, t);
        else if (currentStep === 1) stepErrors = validateStep2(form, t);
        else if (currentStep === 2 && form.selCats.length === 0)
          ce = t('registration.validation.category.required');
        else if (currentStep === 3) stepErrors = validateBankStep(form, t);
      } else if (requestType === 'Internal SR') {
        if (currentStep === 0) {
          if (form.selCats.length === 0) ce = t('registration.validation.category.required');
        } else if (currentStep === 1) stepErrors = validateStep2(form, t);
      } else if (requestType === 'KOL') {
        if (currentStep === 0) stepErrors = validateStep1(form, t);
      }
      setErrors(stepErrors);
      setCatError(ce);
      if (Object.keys(stepErrors).length > 0 || ce) return;
    } else {
      setErrors({});
      setCatError('');
    }
    setCurrentStep(next);
  };

  const handleComplete = () => {
    if (!requestType) return;
    const finalErrors = validateAgreements(form, t);
    setErrors(finalErrors);
    if (Object.keys(finalErrors).length > 0) return;
    setSubmitted(true);
  };

  const handleRestart = () => {
    setSubmitted(false);
    setRequestType(null);
    setPendingRequestType(null);
    resetWizardState();
  };

  return {
    pendingRequestType,
    requestType,
    currentStep,
    form,
    setForm,
    errors,
    catError,
    submitted,
    handleSelectRequestType,
    handleContinueFromTypeSelector,
    changeRequestType,
    isStepValid,
    handleStepChange,
    handleComplete,
    handleRestart
  };
}
