/** @import React from 'react' */
import { useTranslation } from 'react-i18next';

import Data from '@components/ui-v2/Data';
import FormSection from '@components/ui-v2/FormSection';
import { formatDate } from '@lib/format';
/** @import { SupplierApplication } from '@services/data/types' */
/** @import { ActorAttribution } from '@lib/enforcement' */
import { UNATTRIBUTED_KEY } from '../const';
import Field from './Field';

/**
 * @typedef {object} ApplicationDetailsProps
 * @property {SupplierApplication} selected the application the review panel shows
 */

/**
 * The review panel's read-only sections: the applicant, what was declared
 * (with the note that stops the lane over-claiming), and — once decided — the
 * decision. Moved out of `BuyerSupplierApplications` by the Phase 5 page split.
 * @type {React.FC<ApplicationDetailsProps>}
 */
const ApplicationDetails = ({ selected }) => {
  const { t } = useTranslation();

  /**
   * @param {ActorAttribution | null} actor
   * @returns {string}
   */
  const renderAttribution = (actor) =>
    actor === null
      ? t('applications.panel.notStated')
      : actor.kind === 'RESOLVED'
        ? actor.person.displayName
        : t(UNATTRIBUTED_KEY[actor.reason]);

  return (
    <>
      <FormSection title={t('applications.panel.section.applicant')}>
        <dl className="space-y-2 text-sm">
          <Field label={t('applications.panel.field.company')}>{selected.companyName}</Field>
          <Field label={t('applications.panel.field.type')}>{selected.requestType}</Field>
          <Field label={t('applications.panel.field.vendor')}>
            {selected.resolvedSupplierId ? (
              <Data>{selected.resolvedSupplierId}</Data>
            ) : (
              t('applications.panel.notStated')
            )}
          </Field>
          <Field label={t('applications.panel.field.submitted')}>
            <Data>{formatDate(selected.submittedAt)}</Data>
          </Field>
          <Field label={t('applications.panel.field.submittedBy')}>
            {renderAttribution(selected.submittedBy)}
          </Field>
          {selected.reviewStartedAt && (
            <Field label={t('applications.panel.field.reviewStarted')}>
              <Data>{formatDate(selected.reviewStartedAt)}</Data>
            </Field>
          )}
        </dl>
      </FormSection>

      <FormSection title={t('applications.panel.section.declared')}>
        {selected.declarations.length === 0 ? (
          <p className="text-sm text-text-tertiary">{t('applications.panel.declared.empty')}</p>
        ) : (
          <ul className="space-y-1 text-sm" data-testid="application-declarations">
            {selected.declarations.map((d) => (
              <li key={`${d.kind}-${d.reference}`} className="flex gap-2">
                <span className="uppercase text-text-tertiary w-14 shrink-0">{d.kind}</span>
                <Data>{d.reference}</Data>
              </li>
            ))}
          </ul>
        )}
        {/* The sentence that stops this lane over-claiming. */}
        <p className="text-xs text-text-tertiary mt-3">{t('applications.panel.declared.note')}</p>
      </FormSection>

      {(selected.status === 'Approved' || selected.status === 'Rejected') && (
        <FormSection title={t('applications.panel.section.decision')}>
          <dl className="space-y-2 text-sm">
            <Field label={t('applications.panel.field.decidedAt')}>
              {selected.decidedAt ? (
                <Data>{formatDate(selected.decidedAt)}</Data>
              ) : (
                t('applications.panel.notStated')
              )}
            </Field>
            <Field label={t('applications.panel.field.decidedBy')}>
              {renderAttribution(selected.decidedBy)}
            </Field>
            {selected.rejectionReason && (
              <Field label={t('applications.panel.field.reason')}>{selected.rejectionReason}</Field>
            )}
          </dl>
        </FormSection>
      )}
    </>
  );
};

export default ApplicationDetails;
