/** @import React from 'react' */
/** @import { TFunction } from 'i18next' */
/** @import { RfpTermAnswer } from '@services/sourcing/types' */
/** @import { RfpEventView } from '@services/sourcing/views' */
import Data from '@components/ui-v2/Data';
import Table from '@components/ui-v2/Table';
import TableHeader, { TableHeaderCell } from '@components/ui-v2/TableHeader';
import TableRow from '@components/ui-v2/TableRow';
import TableCell from '@components/ui-v2/TableCell';
import { RFP_TERM_GROUP_ORDER, rfpTermGroupOf } from '@services/sourcing/rfxConfig';
import { TermValueInput } from '../../rfx/RfpTermControls';
import { termLabel, termValueText } from '../../rfx/rfxAuthoringDisplay';
import { StillMissing } from '../../rfx/ResponseFormState';

/**
 * @typedef {object} RfpTermsTableProps
 * @property {RfpEventView} event
 * @property {boolean} showForm  The form is open to this supplier (hidden otherwise).
 * @property {RfpTermAnswer[]} answers  The term answers in hand (local edits or stored).
 * @property {readonly string[]} missing  Term ids still unanswered.
 * @property {readonly string[]} badValues  Term ids whose proposed value is unfit.
 * @property {readonly string[]} uncommented  Term ids deviating without a comment.
 * @property {boolean} editable  The form takes edits, so gaps are marked.
 * @property {boolean} locked  The boxes are disabled.
 * @property {(event: RfpEventView, termId: string, patch: Partial<RfpTermAnswer>) => void} setAnswer
 * @property {TFunction} t
 */

/**
 * The terms table (REQ-E03-04): one row per term the buyer asked for, by term
 * group — PTI's requested value, the supplier's proposed value, Comply or
 * Deviate, and the comment a deviation requires — each gap marked where it
 * sits. Moved out of `SupplierRfp.jsx` by the Phase 5 page split (no
 * behaviour change).
 * @type {React.FC<RfpTermsTableProps>}
 */
const RfpTermsTable = ({
  event,
  showForm,
  answers,
  missing,
  badValues,
  uncommented,
  editable,
  locked,
  setAnswer,
  t
}) => (
  <div className="overflow-x-auto" hidden={!showForm}>
    <Table>
      <TableHeader>
        <TableHeaderCell>{t('rfx.rfp.col.term')}</TableHeaderCell>
        <TableHeaderCell>{t('rfx.rfp.col.requested')}</TableHeaderCell>
        <TableHeaderCell>{t('rfx.rfp.col.proposed')}</TableHeaderCell>
        <TableHeaderCell>{t('rfx.stance.comply')}</TableHeaderCell>
        <TableHeaderCell>{t('rfx.rfp.comment')}</TableHeaderCell>
      </TableHeader>
      <tbody>
        {RFP_TERM_GROUP_ORDER.flatMap((group) =>
          event.terms
            .filter((row) => rfpTermGroupOf(row) === group)
            .map((row) => {
              const a = answers.find((x) => x.termId === row.termId);
              const deviates = a?.stance === 'deviate';
              const needsComment = deviates && uncommented.includes(row.termId);
              const termMissing = editable && missing.includes(row.termId);
              const label = termLabel(t, row);
              return (
                <TableRow
                  key={row.termId}
                  id={`supplier-rfp-term-${row.termId}`}
                  data-testid={`supplier-rfp-term-${row.termId}`}
                >
                  <TableCell className="align-top">
                    <div className="text-xs uppercase tracking-wide text-text-tertiary">
                      {t(`rfx.group.${group}`)}
                    </div>
                    <div className="text-sm text-text-primary">{label}</div>
                  </TableCell>
                  <TableCell className="align-top text-sm text-text-secondary">
                    <Data>{termValueText(t, row, row.requestedValue)}</Data>
                  </TableCell>
                  <TableCell className="align-top">
                    <TermValueInput
                      row={row}
                      value={a?.proposedValue ?? ''}
                      onChange={(v) => setAnswer(event, row.termId, { proposedValue: v })}
                      ariaLabel={label}
                      disabled={locked}
                      invalid={badValues.includes(row.termId) || termMissing}
                      // BL-84 — the row's proposed value names the notes under it.
                      describedBy={
                        badValues.includes(row.termId)
                          ? `supplier-rfp-value-invalid-${row.termId}`
                          : termMissing
                            ? `supplier-rfp-term-missing-${row.termId}`
                            : undefined
                      }
                    />
                    {!!termMissing && (
                      <StillMissing testId={`supplier-rfp-term-missing-${row.termId}`} />
                    )}
                    {badValues.includes(row.termId) && (
                      <div
                        id={`supplier-rfp-value-invalid-${row.termId}`}
                        className="text-xs text-danger mt-1"
                        data-testid={`supplier-rfp-value-invalid-${row.termId}`}
                      >
                        {t('rfxa.term.valueInvalid')}
                      </div>
                    )}
                  </TableCell>
                  <TableCell className="align-top">
                    <select
                      disabled={locked}
                      aria-label={`${label} — ${t('rfx.stance.comply')}`}
                      value={a?.stance ?? 'comply'}
                      onChange={(e) =>
                        setAnswer(event, row.termId, {
                          stance: /** @type {RfpTermAnswer['stance']} */ (e.target.value)
                        })
                      }
                      className="bg-white border border-border-input rounded-md px-2 h-9 text-sm focus:outline-none focus:border-action disabled:bg-bg-hover"
                    >
                      <option value="comply">{t('rfx.stance.comply')}</option>
                      <option value="deviate">{t('rfx.stance.deviate')}</option>
                    </select>
                  </TableCell>
                  <TableCell className="align-top">
                    <input
                      type="text"
                      disabled={locked || !deviates}
                      aria-label={`${label} — ${t('rfx.rfp.comment')}`}
                      aria-invalid={needsComment || undefined}
                      aria-describedby={
                        needsComment ? `supplier-rfp-comment-required-${row.termId}` : undefined
                      }
                      value={a?.comment ?? ''}
                      onChange={(e) => setAnswer(event, row.termId, { comment: e.target.value })}
                      className={`w-full bg-white border rounded-md px-3 h-9 text-sm focus:outline-none focus:border-action disabled:bg-bg-hover ${
                        needsComment ? 'border-danger' : 'border-border-input'
                      }`}
                    />
                    {needsComment && (
                      <div
                        id={`supplier-rfp-comment-required-${row.termId}`}
                        className="text-xs text-danger mt-1"
                        data-testid={`supplier-rfp-comment-required-${row.termId}`}
                      >
                        {t('rfx.rfp.commentRequired')}
                      </div>
                    )}
                  </TableCell>
                </TableRow>
              );
            })
        )}
      </tbody>
    </Table>
  </div>
);

export default RfpTermsTable;
