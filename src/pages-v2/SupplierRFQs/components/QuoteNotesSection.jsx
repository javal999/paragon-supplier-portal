/** @import React from 'react' */
import { useTranslation } from 'react-i18next';
import FormSection from '@components/ui-v2/FormSection';
import ResponseDocumentsSection from '../../rfx/ResponseDocumentsSection';
import { SampleOfferFields } from '../../rfqs/TieredQuoteForm';
import { inputClass, labelClass } from '../const';
/** @import { QuoteForm } from '../const' */
/** @import { OpenRFQ } from '../utils' */

/**
 * @typedef {object} QuoteNotesSectionProps
 * @property {OpenRFQ} rfq -  The RFQ the panel is open on; its document requests seed the Documents section.
 * @property {QuoteForm} form
 * @property {(form: QuoteForm) => void} setForm
 */

/**
 * Step 4 of the single-price quote form: notes, the payment terms offered, the
 * sample offer, and the response documents the RFQ asks for. Every edit goes
 * through `setForm`.
 * @type {React.FC<QuoteNotesSectionProps>}
 */
const QuoteNotesSection = ({ rfq, form, setForm }) => {
  const { t } = useTranslation();
  return (
    <FormSection
      eyebrow={t('rfqs.panel.step4.eyebrow')}
      title={t('rfqs.panel.step4.title')}
      description={t('rfqs.panel.step4.desc')}
    >
      <div>
        <label className="block">
          <span className={labelClass}>{t('rfqs.panel.notes')}</span>
          <textarea
            value={form.notes}
            onChange={(e) => setForm({ ...form, notes: e.target.value })}
            rows={3}
            placeholder={t('rfqs.panel.notesPlaceholder')}
            className={`${inputClass} resize-y`}
          />
        </label>
      </div>
      <div>
        <label className="block">
          <span className={labelClass}>{t('rfqResponse.paymentTerms')}</span>
          <input
            type="text"
            aria-label={t('rfqResponse.paymentTerms')}
            value={form.paymentTermsOffered}
            onChange={(e) => setForm({ ...form, paymentTermsOffered: e.target.value })}
            className={inputClass}
          />
        </label>
      </div>
      <SampleOfferFields
        canSample={form.canSample}
        readyDate={form.sampleReadyDate}
        onChange={(canSample, sampleReadyDate) => setForm({ ...form, canSample, sampleReadyDate })}
        anchorPrefix="quote"
      />
      <div id="quote-documents">
        <ResponseDocumentsSection
          requests={rfq.rfq.documentRequests ?? []}
          value={form.documents}
          onChange={(documents) => setForm({ ...form, documents })}
          testId="quote-documents"
        />
      </div>
    </FormSection>
  );
};

export default QuoteNotesSection;
