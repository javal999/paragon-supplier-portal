/** @import React from 'react' */
import { useTranslation } from 'react-i18next';
import { Send } from 'lucide-react';
import StatusPill from '@components/ui-v2/StatusPill';
import Button from '@components/ui-v2/Button';
import Data from '@components/ui-v2/Data';
import { HandoffNotice } from '@components/ui-v2/HandoffNotice';
import { useVerbAvailability } from '@hooks/useVerbAvailability';
import { useReasonLabel } from '../../admin/reasonCodeDisplay';
/** @import { RequirementResponse } from '@services/sdc' */
import { formatDate, formatNumber } from '@lib/format';
import { materialLabel } from '../utils';
import NextActorLine from './NextActorLine';
import DisputeLedger from './DisputeLedger';

/**
 * The "My responses" tab: one card per own requirement response (status, whose
 * act is next, the confirmed or acknowledged facts, the note, the root cause
 * and the dispute ledger), or the empty state when there are none.
 *
 * `onSubmitDraft`:  PF-1b — submit a DRAFT (t_requirementresponse_promote). Without this the
 *  draft lane is a trap: every commitment would rest unsent and the planner's
 *  board would read `awaiting` forever.
 * `submittingId`: the response whose promotion is in flight, or `null`.
 * @type {React.FC<{ responses: readonly RequirementResponse[]; onSubmitDraft: (responseId: string) => void; submittingId: string | null; }>}
 */
const ResponsesTab = ({ responses, onSubmitDraft, submittingId }) => {
  const { t } = useTranslation();
  const reasonLabel = useReasonLabel();
  // ⚠️ PROMOTE SHARES `requirementresponse:submit` WITH THE DRAFT CREATION —
  // one atom guards both drafting and sending, so this lane cannot express a
  // draft-then-send segregation between two people. Recorded, not worked
  // around: splitting it is a FLOW change (§76d's shape, one tenancy over).
  const promoteAvailability = useVerbAvailability('requirementresponse:submit');
  if (responses.length === 0) {
    return (
      <div className="bg-bg-surface border border-border-subtle rounded-lg py-12 px-6 text-center">
        <div className="inline-flex w-12 h-12 rounded-full bg-bg-hover items-center justify-center mb-3">
          <Send size={20} className="text-text-tertiary" />
        </div>
        <div className="text-base font-semibold text-text-primary mb-1">
          {t('sdcSup.responses.emptyTitle')}
        </div>
        <div className="text-sm text-text-tertiary">{t('sdcSup.responses.emptyBody')}</div>
      </div>
    );
  }
  return (
    <div className="flex flex-col gap-4" data-testid="sdcsup-responses">
      {responses.map((r) => (
        <div
          key={r.id}
          className="bg-bg-surface border border-border-subtle rounded-lg shadow-sm border-l-2 border-l-teal p-5"
        >
          <div className="flex items-start justify-between gap-3 mb-3 flex-wrap">
            <div className="flex items-center gap-2 flex-wrap">
              <Data className="text-sm font-bold text-text-primary">{r.id}</Data>
              <Data className="text-xs bg-bg-hover text-text-secondary rounded-full px-2 py-0.5 font-semibold">
                {r.materialCode}
              </Data>
            </div>
            <div className="flex items-center gap-2">
              {/* Own facts + STATUS only (FORK-3b-C) — never a rank or score. */}
              <StatusPill variant="neutral">{r.status}</StatusPill>
              {/* PF-1b — the SUBMIT act, on the one state that has one.
                  ⚠️ OUTLINE, NOT SOLID (DP2-BUTTON-01, operator-corrected). The
                  first cut shipped solid on the argument that submitting a
                  commitment is this page's irreversible act. That is not the
                  rule: solid is RESERVED for a NAMED list — Award, Release
                  payment, Post-to-SAP, Reject/Dispute, Override-hold — and
                  "reserved for consequential things" is not the same rule as
                  "reserved for these". A per-surface judgement about what feels
                  consequential is exactly how a calm register fills up with
                  solid buttons, one defensible argument at a time. */}
              {r.status === 'Draft' &&
                (promoteAvailability.kind === 'held' ? (
                  <Button
                    variant="outline"
                    icon={Send}
                    disabled={submittingId === r.id}
                    onClick={() => onSubmitDraft(r.id)}
                  >
                    {submittingId === r.id
                      ? t('sdcSup.responses.submitting')
                      : t('sdcSup.responses.submitDraft')}
                  </Button>
                ) : (
                  <HandoffNotice availability={promoteAvailability} testId="handoff-rr-promote" />
                ))}
            </div>
          </div>
          {/* R1a — WHOSE ACT IS NEXT. Derived from the machine
              (`nextActorFrom`), never from a per-status constant: every exit
              from Submitted / UnderReview / Disputed is the buyer's by
              `requiredRole`, and transcribing that ruling into a page map is
              the BuyerInvoices footer-verb defect (§48) in a new costume.
              `stranded` renders NOTHING on purpose — it is a finding, not copy,
              and `nextActorCopy` returning null is asserted rather than
              described. */}
          <NextActorLine state={r.status} />
          <dl className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
            {[
              { label: t('sdcSup.responses.col.material'), value: materialLabel(r.materialCode) },
              { label: t('sdcSup.responses.col.period'), value: r.periodBucket },
              {
                // SDC-2b-EXT: an acknowledgment carries NO qty — the cell reads
                // "Acknowledged" under a "Response" label; the word "confirmed"
                // never appears on a visibility response.
                label: r.acknowledgment
                  ? t('sdcSup.responses.col.response')
                  : t('sdcSup.responses.col.confirmed'),
                value: r.acknowledgment
                  ? t('sdcSup.responses.ack')
                  : `${formatNumber(/** @type {import('@services/sdc/types').ForecastConfirmation} */ (r.forecastConfirmation).confirmedQty)} ${/** @type {import('@services/sdc/types').ForecastConfirmation} */ (r.forecastConfirmation).uom}`
              },
              {
                label: t('sdcSup.responses.col.committedDate'),
                value: r.forecastConfirmation?.committedDate
                  ? formatDate(r.forecastConfirmation.committedDate)
                  : '—'
              },
              { label: t('sdcSup.responses.col.version'), value: `v${r.submissionVersion}` },
              {
                label: t('sdcSup.responses.col.submitted'),
                value: r.submittedAt ? formatDate(r.submittedAt) : '—'
              }
            ].map((d) => (
              <div key={d.label} className="bg-bg-hover rounded-md px-3 py-2">
                <dt className="text-label text-text-tertiary uppercase mb-0.5">{d.label}</dt>
                <Data as="dd" className="text-sm font-semibold">
                  {d.value}
                </Data>
              </div>
            ))}
          </dl>
          {r.acknowledgment?.note && (
            <div className="mt-3 text-xs text-text-secondary">
              <span className="text-label text-text-tertiary uppercase">
                {t('sdcSup.responses.note')}
              </span>{' '}
              {r.acknowledgment.note}
            </div>
          )}
          {r.rootCause && (
            <div className="mt-3 text-xs text-text-secondary">
              <span className="text-label text-text-tertiary uppercase">
                {t('sdcSup.responses.rootCause')}
              </span>{' '}
              {reasonLabel('commitmentShortfall', r.rootCause.level1)}
              {r.rootCause.note ? ` — ${r.rootCause.note}` : ''}
            </div>
          )}
          {/* R1b — the buyer's dispute text and its resolution, in order. */}
          <DisputeLedger entries={r.disputeResponse ?? []} />
        </div>
      ))}
    </div>
  );
};

export default ResponsesTab;
