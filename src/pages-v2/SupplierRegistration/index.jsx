/** @import React from 'react' */
import { useMemo } from 'react';
import { ChevronLeft } from 'lucide-react';
import { FormProvider } from 'react-hook-form';
import { useTranslation } from 'react-i18next';
/** @import { WizardStep } from '@components/ui-v2/Wizard' */
import Wizard from '@components/ui-v2/Wizard';
import ProvenanceMarker from '@components/ui-v2/ProvenanceMarker';
import { PageHeader, PageFooter } from './components/PageChrome';
import RequestTypeSelector, { REQUEST_TYPES } from './components/RequestTypeSelector';
import CompanyInfoStep from './components/CompanyInfoStep';
import ContactsStep from './components/ContactsStep';
import CategoriesStep from './components/CategoriesStep';
import DocumentsAndBankStep from './components/DocumentsAndBankStep';
import KOLBankStep from './components/KOLBankStep';
import InternalSRCategoryStep from './components/InternalSRCategoryStep';
import ReviewStep from './components/ReviewStep';
import SuccessScreen from './components/SuccessScreen';
import { useRegistrationWizard } from './hooks/useRegistrationWizard';

/**
 * `/register` — the supplier registration walkthrough, outside the app shell.
 * Renders its own header and footer, the provenance marker, then one of: the
 * request-type selector, the wizard for the chosen type, or the end screen.
 * State and handlers live in `useRegistrationWizard`; the form is a
 * react-hook-form `useForm` that this component hands to every step through
 * `FormProvider` (the steps read it with `useFormContext`). This component
 * builds the wizard's step list for the chosen type.
 * @type {React.FC}
 */
const SupplierRegistrationV2 = () => {
  const { t } = useTranslation();
  const {
    pendingRequestType,
    requestType,
    currentStep,
    methods,
    submitted,
    handleSelectRequestType,
    handleContinueFromTypeSelector,
    changeRequestType,
    isStepValid,
    handleStepChange,
    handleComplete,
    handleRestart
  } = useRegistrationWizard();

  /** @type {WizardStep[]} */
  const wizardSteps = useMemo(() => {
    if (!requestType) return [];
    if (requestType === 'External SR') {
      return [
        {
          id: 'company',
          title: t('registration.step.company.title'),
          shortTitle: t('registration.step.company.short'),
          content: <CompanyInfoStep />
        },
        {
          id: 'contacts',
          title: t('registration.step.contacts.title'),
          shortTitle: t('registration.step.contacts.short'),
          content: <ContactsStep />
        },
        {
          id: 'categories',
          title: t('registration.title.categoriesChannel'),
          shortTitle: t('registration.step.categories.short'),
          content: <CategoriesStep />
        },
        {
          id: 'docs',
          title: t('registration.title.documentsBank'),
          shortTitle: t('registration.step.documents.short'),
          content: <DocumentsAndBankStep />
        },
        {
          id: 'review',
          title: t('registration.step.review.title'),
          shortTitle: t('registration.step.review.short'),
          content: <ReviewStep requestType={requestType} />
        }
      ];
    }
    if (requestType === 'Internal SR') {
      return [
        {
          id: 'expansion',
          title: t('registration.step.expansion.title'),
          shortTitle: t('registration.step.expansion.short'),
          content: <InternalSRCategoryStep />
        },
        {
          id: 'contacts',
          title: t('registration.title.additionalContacts'),
          shortTitle: t('registration.step.contacts.short'),
          content: <ContactsStep />
        },
        {
          id: 'review',
          title: t('registration.step.review.title'),
          shortTitle: t('registration.step.review.short'),
          content: <ReviewStep requestType={requestType} />
        }
      ];
    }
    // KOL
    return [
      {
        id: 'company',
        title: t('registration.step.company.title'),
        shortTitle: t('registration.step.company.short'),
        content: <CompanyInfoStep />
      },
      {
        id: 'bank',
        title: t('registration.step.kolBank.title'),
        shortTitle: t('registration.step.kolBank.short'),
        content: <KOLBankStep />
      }
    ];
  }, [requestType, t]);

  const activeMeta = REQUEST_TYPES.find((r) => r.id === requestType);

  return (
    <div className="min-h-screen flex flex-col bg-bg-page">
      <PageHeader />
      <main className="flex-1 px-4 py-6 sm:py-10">
        <div className="max-w-3xl mx-auto">
          {/* D-CENSUS-8 — /register carried no marker at all while promising a review
              nothing performs. `supplierRegistration` is null-backed: the wizard
              validates and formats a submission, then discards it — no application is
              persisted, routed, or queued for anyone. The 3–5 business-day review
              promise is retracted in this batch; this marks the surface itself. */}
          <div className="mb-4">
            <ProvenanceMarker capability="supplierRegistration" />
          </div>
          {submitted ? (
            <SuccessScreen onRestart={handleRestart} />
          ) : requestType === null ? (
            <RequestTypeSelector
              value={pendingRequestType}
              onChange={handleSelectRequestType}
              onContinue={handleContinueFromTypeSelector}
            />
          ) : (
            <div>
              <div className="flex items-center justify-between mb-4 gap-3 flex-wrap">
                <button
                  type="button"
                  onClick={changeRequestType}
                  className="inline-flex items-center gap-1 text-xs text-text-tertiary hover:text-text-primary"
                >
                  <ChevronLeft size={14} />
                  {t('registration.changeType')}
                </button>
                <div className="bg-info-soft border-l-2 border-info rounded px-3 py-1.5 text-xs text-info">
                  <strong>{activeMeta ? t(activeMeta.shortKey) : ''}</strong> ·{' '}
                  {activeMeta ? t(activeMeta.subKey) : ''}
                </div>
              </div>
              <FormProvider {...methods}>
                <Wizard
                  key={requestType}
                  steps={wizardSteps}
                  currentStep={currentStep}
                  onStepChange={handleStepChange}
                  onCancel={changeRequestType}
                  onComplete={handleComplete}
                  isStepValid={isStepValid}
                  completeLabel={t('registration.submit')}
                />
              </FormProvider>
            </div>
          )}
        </div>
      </main>
      <PageFooter />
    </div>
  );
};

export default SupplierRegistrationV2;
