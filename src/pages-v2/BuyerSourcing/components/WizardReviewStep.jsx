// ────────────────────────────────────────────────────────────────────────────
// The RFQ wizard's last step, "Review": one section per step with an Edit
// link, the save-and-send act for an edited draft (BL-93) and "Save as
// template". Moved out of `BuyerSourcing.jsx` by the Phase 5 page split (no
// behaviour change).
// ────────────────────────────────────────────────────────────────────────────
/** @import React from 'react' */
/** @import { TFunction } from 'i18next' */
/** @import { RfqTemplateContent } from '@services/sourcing/rfqTemplates' */
/** @import { authoringReviewRows } from '../../sourcing/RfqAuthoring' */
/** @import { VerbAvailability } from '@services/transitions/handoff' */
/** @import { DraftRfq } from '../const' */
/** @import { useRfqWizard } from '../hooks/useRfqWizard' */
import { Send } from 'lucide-react';
import Button from '@components/ui-v2/Button';
import { HandoffNotice } from '@components/ui-v2/HandoffNotice';
import { formatIDR, formatNumber } from '@lib/format';
import { templateContentFromDraft } from '../../sourcing/rfqDraft';
import { DocumentRequestsSummary } from '../../rfx/DocumentRequestsEditor';
import { categoryLabel } from '../utils';
import ReviewSection from './ReviewSection';
import { isIncotermOption } from './WizardTermsStep';

/**
 * @typedef {ReturnType<typeof useRfqWizard>} RfqWizard
 * @typedef {object} WizardReviewStepProps
 * @property {DraftRfq} draft
 * @property {RfqWizard['rfqNumbers']} rfqNumbers The ONE parse of quantity and budget — what the payload ships.
 * @property {RfqWizard['sourcePrefill']} sourcePrefill The chosen requisition, when the buyer started from one.
 * @property {ReturnType<typeof authoringReviewRows>} authoringRows
 * @property {RfqWizard['docItems']} docItems
 * @property {Map<string, string>} supplierNameById
 * @property {string | null} editingRfqId The Draft being edited (BL-93), or null.
 * @property {VerbAvailability} publishAvailability The seat's `rfq:publish`.
 * @property {boolean} revisePending Whether a save is in flight.
 * @property {RfqWizard['isStepValid']} isStepValid
 * @property {(send: boolean) => void} saveEdit
 * @property {(step: number) => void} setWizardStep
 * @property {(t: { content: RfqTemplateContent; name: string }) => void} setTemplateToSave
 * @property {TFunction} t
 */

/**
 * The Review step's content.
 * @type {React.FC<WizardReviewStepProps>}
 */
const WizardReviewStep = ({
  draft,
  rfqNumbers,
  sourcePrefill,
  authoringRows,
  docItems,
  supplierNameById,
  editingRfqId,
  publishAvailability,
  revisePending,
  isStepValid,
  saveEdit,
  setWizardStep,
  setTemplateToSave,
  t
}) => (
  <div className="space-y-5 text-sm">
    <ReviewSection
      label={t('sourcing.wizard.review.section.scope')}
      onEdit={() => setWizardStep(0)}
      rows={[
        ...authoringRows.basics,
        // ⚠️ C.2 — THE PROVENANCE LINE. Present ONLY when the buyer chose a
        // requisition, so an ordinary RFQ gains no empty row claiming
        // there might have been one.
        //
        // ⚠️ **IT NAMES THE ORIGIN, IT DOES NOT REASSIGN AUTHORSHIP.** The
        // wording is "raised from", not "created by": this RFQ is being
        // created by the buyer standing in this wizard, and the
        // requisition is where its requirement came from. The distinction
        // is the same one `attribution` draws — a document's SOURCE is not
        // its ACTOR — and it matters here because the cascade that follows
        // will move that requisition on this buyer's authority.
        ...(sourcePrefill
          ? /** @type {[string, React.ReactNode][]} */ ([
              [t('sourcing.wizard.review.row.sourceRequisition'), sourcePrefill.label]
            ])
          : []),
        // What the requisition could NOT carry, named rather than left to
        // look carried. Inside a prefilled form an untouched default is
        // indistinguishable from a derived value, so silence here would
        // let 'KG' read as the requisition's answer when it is only the
        // wizard's.
        ...(sourcePrefill && sourcePrefill.uncarried.length > 0
          ? /** @type {[string, React.ReactNode][]} */ ([
              [
                t('sourcing.wizard.review.row.notCarried'),
                sourcePrefill.uncarried
                  .map((f) => t(`sourcing.wizard.review.notCarried.${f}`))
                  .join(', ')
              ]
            ])
          : []),
        [t('sourcing.wizard.review.row.title'), draft.title || '—'],
        [
          t('sourcing.wizard.review.row.category'),
          draft.category ? categoryLabel(t, draft.category) : '—'
        ],
        [t('sourcing.wizard.review.row.materials'), draft.materials.join(', ') || '—'],
        // 2e-b-4a — the review reads the SAME parsed numbers the payload
        // ships, so what the buyer confirms here is definitionally what
        // gets minted. It used to re-run `Number(draft.totalQty)`, which
        // is how a buyer could confirm "2.400 KG" on this very screen and
        // raise an event for 2.4 KG.
        [
          t('sourcing.wizard.review.row.quantity'),
          rfqNumbers.ok ? `${formatNumber(rfqNumbers.value.totalQty)} ${draft.uom}` : '—'
        ],
        [
          t('sourcing.wizard.review.row.budget'),
          // "Not specified" is reserved for a genuine blank — an
          // unreadable budget is not an unstated one, so it reads as the
          // em dash. (Unreachable in practice: the step-0 gate blocks a
          // refusal from ever reaching this step.)
          !rfqNumbers.ok
            ? '—'
            : rfqNumbers.value.estimatedValue === undefined
              ? t('sourcing.wizard.review.budgetUnspecified')
              : formatIDR(rfqNumbers.value.estimatedValue)
        ]
      ]}
    />
    <ReviewSection
      label={t('rfqAuthoring.review.section.items')}
      onEdit={() => setWizardStep(1)}
      rows={authoringRows.items}
    />
    <ReviewSection
      label={t('rfqAuthoring.review.section.options')}
      onEdit={() => setWizardStep(2)}
      rows={authoringRows.options}
    />
    <ReviewSection
      label={t('sourcing.wizard.review.section.suppliers')}
      onEdit={() => setWizardStep(4)}
      rows={[
        [
          t('sourcing.wizard.review.row.invited'),
          draft.invitedSupplierIds.length > 0
            ? t(
                draft.invitedSupplierIds.length === 1
                  ? 'sourcing.wizard.review.invited.one'
                  : 'sourcing.wizard.review.invited.other',
                { count: draft.invitedSupplierIds.length }
              )
            : '—'
        ],
        [
          t('sourcing.wizard.review.row.names'),
          draft.invitedSupplierIds.map((id) => supplierNameById.get(id) ?? id).join(', ') || '—'
        ]
      ]}
    />
    <ReviewSection
      label={t('sourcing.wizard.review.section.terms')}
      onEdit={() => setWizardStep(5)}
      rows={[
        [t('sourcing.wizard.review.row.responseDeadline'), draft.responseDeadline || '—'],
        [t('sourcing.wizard.review.row.awardDeadline'), draft.awardDeadline || '—'],
        [
          t('sourcing.wizard.review.row.incoterms'),
          // B-03 — the STORED value, and red when the Terms select cannot show it.
          isIncotermOption(draft.incoterms) ? (
            draft.incoterms
          ) : (
            <span className="text-danger" data-testid="review-incoterms-out-of-list">
              {draft.incoterms || '—'} · {t('sourcing.wizard.review.incotermsOutOfList')}
            </span>
          )
        ],
        [t('sourcing.wizard.review.row.paymentTerms'), draft.paymentTerms],
        [t('sourcing.wizard.review.row.currency'), draft.currency]
      ]}
    />
    <ReviewSection
      label={t('rfxa.doc.review')}
      onEdit={() => setWizardStep(6)}
      rows={[
        [
          t('rfxa.step.documents.short'),
          <DocumentRequestsSummary
            key="docs"
            value={draft.documentRequests ?? []}
            items={docItems}
            testIdPrefix="rfq-new"
          />
        ]
      ]}
    />
    {/* D2 — the draft's content kept as a template in this browser: items,
        sheets, breaks, costs, questions and options. Not invitees, not
        dates, not files. */}
    {/* BL-93 — an edited draft may also be SENT from here, in the same
        act as the save. Sending is `rfq:publish`; a seat without it reads
        whose act it is in the button's own slot, and can still save. */}
    {editingRfqId && (
      <div className="flex flex-wrap items-center justify-end gap-3">
        {publishAvailability.kind === 'held' ? (
          <Button
            variant="outline"
            icon={Send}
            disabled={revisePending || ![0, 1, 2, 3, 4, 5, 6].every(isStepValid)}
            onClick={() => saveEdit(true)}
            data-testid="rfq-edit-send"
          >
            {t('rfxEdit.saveAndSend')}
          </Button>
        ) : (
          <HandoffNotice availability={publishAvailability} testId="handoff-rfq-edit-send" />
        )}
      </div>
    )}
    <div className="flex justify-end">
      <Button
        variant="secondary"
        onClick={() =>
          setTemplateToSave({
            content: templateContentFromDraft(draft),
            name: draft.projectName.trim() || draft.title.trim()
          })
        }
        data-testid="rfq-review-save-template"
      >
        {t('rfqAuthoring.template.saveAs')}
      </Button>
    </div>
  </div>
);

export default WizardReviewStep;
