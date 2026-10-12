import { useTranslation } from 'react-i18next';
/** @import React from 'react' */
import Button from '@components/ui-v2/Button';
import Data from '@components/ui-v2/Data';
/** @import { rfxCategoryFamily } from '@services/sourcing/rfxConfig' */
/** @import { RfpEvent, RfpTermRow } from '@services/sourcing/types' */
import { DocumentRequestsSummary } from '../../DocumentRequestsEditor';
import RfxSaveTemplate from '../../RfxSaveTemplate';
import { IndicativePill, termLabel } from '../../rfxAuthoringDisplay';
/** @import { Draft } from '../const' */

/**
 * @typedef {object} ReviewStepProps
 * @property {Draft} draft
 * @property {ReturnType<typeof rfxCategoryFamily>} family  the picked family, shown by its label
 * @property {RfpTermRow[]} termRows  the terms as they will be sent, standard list order first
 * @property {boolean} hasTc  the draft carries T&C text or a T&C file
 * @property {RfpEvent} [editing]  BL-93 — set: the save button reads "Save changes"
 * @property {boolean} canPublish  false: says the draft stays hidden from suppliers
 * @property {boolean} isPending  the RFx command is running; disables the save button
 * @property {(publish: boolean) => void} onCreate  CE-06 — the save act (`false` here; the wizard's Send is `true`)
 * @property {(name: string) => ReturnType<React.ComponentProps<typeof RfxSaveTemplate>['onSave']>} onSaveTemplate
 */

/**
 * The last step, "a last look": every field of the draft as it will be sent,
 * the save-draft button (CE-06 — a seat that cannot send may still save), the
 * note shown to a seat without `rfp:publish`, and "save as template".
 * @type {React.FC<ReviewStepProps>}
 */
export const ReviewStep = ({
  draft,
  family,
  termRows,
  hasTc,
  editing,
  canPublish,
  isPending,
  onCreate,
  onSaveTemplate
}) => {
  const { t } = useTranslation();
  return (
    <div className="space-y-5" data-testid="rfp-new-review">
      <dl className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-sm">
        <div>
          <dt className="text-xs uppercase text-text-tertiary">{t('rfx.create.field.title')}</dt>
          <dd className="text-text-primary">{draft.title}</dd>
        </div>
        <div>
          <dt className="text-xs uppercase text-text-tertiary">{t('rfx.create.field.family')}</dt>
          <dd className="text-text-primary">{family ? t(family.labelKey) : '—'}</dd>
        </div>
        <div>
          <dt className="text-xs uppercase text-text-tertiary">{t('rfx.create.field.deadline')}</dt>
          <dd className="text-text-primary">
            <Data>{draft.responseDeadline || '—'}</Data>
          </dd>
        </div>
        <div>
          <dt className="text-xs uppercase text-text-tertiary">{t('rfx.rfp.field.currency')}</dt>
          <dd className="text-text-primary">
            <Data>{draft.currency}</Data>
          </dd>
        </div>
        <div className="sm:col-span-2">
          <dt className="text-xs uppercase text-text-tertiary">{t('rfx.rfp.field.scope')}</dt>
          <dd className="text-text-secondary whitespace-pre-line">{draft.scope || '—'}</dd>
        </div>
        <div className="sm:col-span-2">
          <dt className="text-xs uppercase text-text-tertiary">{t('rfx.create.review.terms')}</dt>
          <dd>
            <ul className="space-y-1">
              {termRows.map((row) => (
                <li
                  key={row.termId}
                  className="text-sm"
                  data-testid={`rfp-new-review-term-${row.termId}`}
                >
                  <span className="text-text-primary">{termLabel(t, row)}</span>
                  {' — '}
                  <Data>{row.requestedValue}</Data>
                </li>
              ))}
            </ul>
          </dd>
        </div>
        <div>
          <dt className="text-xs uppercase text-text-tertiary">{t('rfxa.step.pricing.short')}</dt>
          <dd className="text-text-primary" data-testid="rfp-new-review-pricing">
            {draft.pricing ? (
              <>
                {t('rfxa.pricing.summary', {
                  options: t('rfxa.pricing.optionCount', {
                    count: draft.pricing.options.length
                  }),
                  points: t('rfxa.pricing.pointCount', {
                    count: draft.pricing.quantityPoints.length
                  })
                })}{' '}
                <IndicativePill />
              </>
            ) : (
              '—'
            )}
          </dd>
        </div>
        <div>
          <dt className="text-xs uppercase text-text-tertiary">
            {t('rfx.create.review.questions')}
          </dt>
          <dd className="text-text-primary">
            {t('rfx.rfi.questions', { count: draft.questions.length })}
          </dd>
        </div>
        <div>
          <dt className="text-xs uppercase text-text-tertiary">{t('rfxa.conf.pill')}</dt>
          <dd className="text-text-primary">
            {draft.confidential ? t('rfxa.conf.on') : t('rfxa.conf.off')}
          </dd>
        </div>
        <div>
          <dt className="text-xs uppercase text-text-tertiary">{t('rfxa.tc.title')}</dt>
          <dd className="text-text-primary">{hasTc ? t('rfxa.tc.on') : t('rfxa.tc.off')}</dd>
        </div>
        <div className="sm:col-span-2">
          <dt className="text-xs uppercase text-text-tertiary">
            {t('rfx.create.review.invitees')}
          </dt>
          <dd className="text-text-primary">
            {t('rfx.invite.selected', { count: draft.invitedSupplierIds.length })}
          </dd>
        </div>
        <div className="sm:col-span-2">
          <dt className="text-xs uppercase text-text-tertiary">{t('rfxa.doc.review')}</dt>
          <dd className="text-text-primary">
            <DocumentRequestsSummary value={draft.documentRequests} testIdPrefix="rfp-new" />
          </dd>
        </div>
      </dl>

      <p className="text-xs text-text-tertiary">{t('rfx.create.sendRule')}</p>

      {/* CE-06 — two acts. The draft is savable by a seat that cannot send. */}
      <div className="flex flex-wrap gap-3">
        <Button
          variant="secondary"
          disabled={isPending}
          onClick={() => onCreate(false)}
          data-testid="rfp-new-save-draft"
        >
          {t(editing ? 'rfxEdit.saveChanges' : 'rfx.create.saveDraft')}
        </Button>
      </div>
      {!canPublish && (
        <p className="text-xs text-text-tertiary" data-testid="rfp-new-cannot-send">
          {t('rfx.status.draftHiddenFromSuppliers')}
        </p>
      )}

      <RfxSaveTemplate onSave={onSaveTemplate} defaultName={draft.title} testIdPrefix="rfp-new" />
    </div>
  );
};
