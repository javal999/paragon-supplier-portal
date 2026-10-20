/** @import React from 'react' */
/** @import { RfpEventView, RfpResponseView } from '@services/sourcing/views' */
/** @import { RfpTermGroup } from '@services/sourcing/types' */
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import Data from '@components/ui-v2/Data';
import StatusPill from '@components/ui-v2/StatusPill';
import Table from '@components/ui-v2/Table';
import TableHeader, { TableHeaderCell } from '@components/ui-v2/TableHeader';
import TableRow from '@components/ui-v2/TableRow';
import TableCell from '@components/ui-v2/TableCell';
import { RFP_TERM_GROUP_ORDER, rfpTermGroupOf } from '@services/sourcing/rfxConfig';
import { rfpScoringOf } from '../../rfx/rfpScoring';
import { termLabel, termValueText } from '../../rfx/rfxAuthoringDisplay';
import { DocumentsStatus } from '../../rfx/SupplierDocumentsPanel';
import { qty } from '../../rfx/rfxDisplay';
import { bestValueIds, deviationsByGroup, termHasDeviation } from '../../rfx/rfxCompare';
import { BestTag, GridFilterToggle } from '../../rfx/RfxEventTabs';

/**
 * How many term rows the terms section lists — read by the section AND by the
 * event page's "Jump to" nav (RFx UX 2F), so the count is the rows shown.
 * Null for a Draft with no proposal, which shows "No proposals received yet".
 * @param {RfpEventView} event
 * @returns {number | null}
 */
export const rfpComparisonTermCount = (event) =>
  event.responses.length === 0 && event.status === 'Draft' ? null : event.terms.length;

/**
 * The PTI column of one term row: the label, the custom pill.
 * @type {React.FC<{ row: RfpEventView['terms'][number] }>}
 */
const TermCell = ({ row }) => {
  const { t } = useTranslation();
  return (
    <TableCell className="align-top">
      <div className="text-sm text-text-primary">{termLabel(t, row)}</div>
      {row.termId.startsWith('custom-') && (
        <StatusPill variant="neutral" className="mt-1">
          {t('rfxa.term.customPill')}
        </StatusPill>
      )}
    </TableCell>
  );
};

/**
 * RFx UX B-06 / 2G — the terms PTI sent, on the Overview tab: the
 * "PTI asks for" column alone, then the options with their quantity points.
 * Before the first proposal it notes that supplier columns appear as
 * proposals arrive; after it, that proposals are compared on Compare. A Draft
 * with no proposal still reads "No proposals received yet".
 * @type {React.FC<{ event: RfpEventView }>}
 */
export const RfpTermsSent = ({ event }) => {
  const { t } = useTranslation();
  if (rfpComparisonTermCount(event) === null) {
    return (
      <p className="py-10 text-center text-sm text-text-tertiary" data-testid="rfp-no-proposals">
        {t('rfx.rfp.noProposals')}
      </p>
    );
  }
  const none = event.responses.length === 0;
  return (
    <div
      className="bg-bg-surface border border-border-subtle rounded-lg shadow-sm overflow-x-auto"
      data-testid={`rfp-terms-sent-${event.id}`}
    >
      <div className="px-4 py-3 border-b border-border-subtle">
        <h3 className="text-sm font-semibold text-text-primary">{t('rfx.rfp.sent.title')}</h3>
        <p className="text-xs text-text-tertiary" data-testid={`rfp-terms-sent-note-${event.id}`}>
          {t(none ? 'rfx.rfp.sent.note' : 'rfx.rfp.sent.noteCompare')}
        </p>
      </div>
      <Table>
        <TableHeader>
          <TableHeaderCell>{t('rfx.rfp.col.term')}</TableHeaderCell>
          <TableHeaderCell>{t('rfx.rfp.col.requested')}</TableHeaderCell>
        </TableHeader>
        <tbody>
          {RFP_TERM_GROUP_ORDER.flatMap((group) =>
            event.terms
              .filter((row) => rfpTermGroupOf(row) === group)
              .map((row, index) => (
                <TableRow key={row.termId} data-testid={`rfp-term-${row.termId}`}>
                  <TableCell className="align-top">
                    {index === 0 && (
                      <div className="text-xs uppercase tracking-wide text-text-tertiary">
                        {t(`rfx.group.${group}`)}
                      </div>
                    )}
                    <div className="text-sm text-text-primary">{termLabel(t, row)}</div>
                    {row.termId.startsWith('custom-') && (
                      <StatusPill variant="neutral" className="mt-1">
                        {t('rfxa.term.customPill')}
                      </StatusPill>
                    )}
                  </TableCell>
                  <TableCell className="align-top text-sm text-text-secondary">
                    <Data>{termValueText(t, row, row.requestedValue)}</Data>
                  </TableCell>
                </TableRow>
              ))
          )}
        </tbody>
      </Table>
      {event.pricing ? <SentOptions event={event} /> : null}
    </div>
  );
};

/**
 * One supplier's answer to one term in the grid: the value, the stance, the
 * comment on a deviation, and "Best" where the row is comparable.
 * @type {React.FC<{ row: RfpEventView['terms'][number]; r: RfpResponseView; best: boolean }>}
 */
const AnswerCell = ({ row, r, best }) => {
  const { t } = useTranslation();
  const a = r.answers.find((x) => x.termId === row.termId);
  const deviates = a?.stance === 'deviate';
  return (
    <TableCell
      className={`align-top ${deviates ? 'bg-warning-soft' : ''}`}
      data-testid={`rfp-cell-${row.termId}-${r.supplierId}`}
    >
      <div className="text-sm text-text-primary">
        <Data>{termValueText(t, row, a?.proposedValue)}</Data>
        {best ? <BestTag testId={`rfp-best-${row.termId}-${r.supplierId}`} /> : null}
      </div>
      {!!a && (
        <StatusPill variant={deviates ? 'warning' : 'success'} className="mt-1">
          {t(`rfx.stance.${a.stance}`)}
        </StatusPill>
      )}
      {!!deviates && !!a?.comment && (
        <div className="text-xs text-warning-hover mt-1">{a.comment}</div>
      )}
    </TableCell>
  );
};

/**
 * REQ-E03-04 — terms as rows, suppliers as columns, deviations highlighted —
 * on the Compare tab, with proposals in (RFx UX 2G):
 *   · "Show deviations only", ON by default when any proposal deviates, else
 *     OFF and disabled with the reason;
 *   · each term group collapsible, with its deviation count in the header;
 *   · the supplier header row sticky while the grid scrolls;
 *   · "Best" on the best value of a comparable row (`bestValueIds`).
 * The "Other terms" and documents rows stay whatever the filter says: they
 * are not terms a proposal complies with or deviates from.
 * @type {React.FC<{ event: RfpEventView }>}
 */
const RfpComparison = ({ event }) => {
  const { t } = useTranslation();
  const anyDeviation = event.responses.some((r) => r.deviationCount > 0);
  const [onlyDeviations, setOnlyDeviations] = useState(anyDeviation);
  const [collapsed, setCollapsed] = useState(/** @type {ReadonlySet<RfpTermGroup>} */ (new Set()));
  const scoring = rfpScoringOf(event);
  const scoreById = new Map(
    scoring?.kind === 'scored'
      ? scoring.scores.map((s) => /** @type {const} */ ([s.quoteId, s]))
      : []
  );
  const groupDeviations = deviationsByGroup(event);
  const filtering = onlyDeviations && anyDeviation;
  const cols = event.responses.length + 2;
  const stickyTh =
    'sticky top-0 z-10 bg-bg-hover text-left text-label text-text-tertiary uppercase py-3 px-4 align-bottom';

  /** @param {RfpTermGroup} group */
  const toggle = (group) =>
    setCollapsed((prev) => {
      const next = new Set(prev);
      if (next.has(group)) next.delete(group);
      else next.add(group);
      return next;
    });

  return (
    <div
      className="bg-bg-surface border border-border-subtle rounded-lg shadow-sm"
      data-testid={`rfp-comparison-${event.id}`}
    >
      <div className="px-4 py-3 border-b border-border-subtle flex flex-wrap items-center justify-between gap-3">
        <h3 className="text-sm font-semibold text-text-primary">{t('rfx.rfp.cmp.title')}</h3>
        <GridFilterToggle
          label={t('rfx.rfp.cmp.onlyDeviations')}
          checked={filtering}
          onChange={setOnlyDeviations}
          {...(anyDeviation ? {} : { disabledReason: t('rfx.rfp.cmp.noDeviations') })}
          testId={`rfp-only-deviations-${event.id}`}
        />
      </div>
      <div className="max-h-[70vh] overflow-auto" data-testid={`rfp-grid-scroll-${event.id}`}>
        <table className="w-full text-sm text-text-primary border-collapse">
          <thead className="border-b border-border-subtle" data-testid="rfp-grid-head">
            <tr>
              <th scope="col" className={stickyTh}>
                {t('rfx.rfp.col.term')}
              </th>
              <th scope="col" className={stickyTh}>
                {t('rfx.rfp.col.requested')}
              </th>
              {event.responses.map((r) => {
                const s = scoreById.get(r.id);
                return (
                  <th key={r.id} scope="col" className={stickyTh}>
                    {r.supplierName}
                    <div className="text-xs font-normal normal-case text-text-tertiary">
                      {t('rfx.rfp.deviations', { count: r.deviationCount })}
                      {s ? (
                        <>
                          {' · '}
                          {t('rfx.rfp.scored')} <Data>{s.composite}</Data>
                          {!!s.topRanked && (
                            <StatusPill variant="success" className="ml-1">
                              {t('rfx.cmp.best')}
                            </StatusPill>
                          )}
                        </>
                      ) : null}
                    </div>
                  </th>
                );
              })}
            </tr>
          </thead>
          <tbody>
            {RFP_TERM_GROUP_ORDER.flatMap((group) => {
              const rows = event.terms
                .filter((row) => rfpTermGroupOf(row) === group)
                .filter((row) => !filtering || termHasDeviation(event, row.termId));
              if (rows.length === 0) return [];
              const open = !collapsed.has(group);
              return [
                <tr
                  key={`group-${group}`}
                  className="bg-bg-hover border-b border-border-subtle"
                  data-testid={`rfp-group-${group}`}
                >
                  <td colSpan={cols} className="px-4 py-2">
                    <button
                      type="button"
                      aria-expanded={open}
                      onClick={() => toggle(group)}
                      className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wide text-text-secondary focus-visible:outline focus-visible:outline-2 focus-visible:outline-action"
                      data-testid={`rfp-group-toggle-${group}`}
                    >
                      <span aria-hidden="true">{open ? '▾' : '▸'}</span>
                      {t(`rfx.group.${group}`)}
                      <span
                        className="font-normal normal-case text-text-tertiary"
                        data-testid={`rfp-group-count-${group}`}
                      >
                        {t('rfx.rfp.deviations', { count: groupDeviations.get(group) ?? 0 })}
                      </span>
                    </button>
                  </td>
                </tr>,
                ...(open
                  ? rows.map((row) => {
                      const best = bestValueIds(
                        row.termId,
                        event.responses.map((r) => ({
                          id: r.id,
                          value: r.answers.find((a) => a.termId === row.termId)?.proposedValue
                        }))
                      );
                      return (
                        <TableRow key={row.termId} data-testid={`rfp-term-${row.termId}`}>
                          <TermCell row={row} />
                          <TableCell className="align-top text-sm text-text-secondary">
                            <Data>{termValueText(t, row, row.requestedValue)}</Data>
                          </TableCell>
                          {event.responses.map((r) => (
                            <AnswerCell key={r.id} row={row} r={r} best={!!best?.has(r.id)} />
                          ))}
                        </TableRow>
                      );
                    })
                  : [])
              ];
            })}
            {/* REQ-E03-04 edge case — the free-text terms a supplier added. */}
            <TableRow data-testid="rfp-other-terms">
              <TableCell className="align-top">
                <div className="text-xs uppercase tracking-wide text-text-tertiary">
                  {t('rfx.group.other')}
                </div>
                <div className="text-sm text-text-primary">{t('rfx.rfp.otherTerms')}</div>
              </TableCell>
              <TableCell className="align-top text-sm text-text-tertiary">—</TableCell>
              {event.responses.map((r) => (
                <TableCell key={r.id} className="align-top text-sm text-text-secondary">
                  {r.otherTerms ?? '—'}
                </TableCell>
              ))}
            </TableRow>
            {/* RFx B5 — NR-1 buyer step 6: the required documents, per supplier. */}
            <TableRow data-testid="rfp-documents-row">
              <TableCell className="align-top text-sm text-text-primary">
                {t('rfxFiles.docs.row')}
              </TableCell>
              <TableCell className="align-top text-sm text-text-tertiary">—</TableCell>
              {event.responses.map((r) => (
                <TableCell key={r.id} className="align-top">
                  <DocumentsStatus
                    requests={event.documentRequests ?? []}
                    documents={r.documents ?? []}
                    testId={`rfp-documents-${r.supplierId}`}
                  />
                </TableCell>
              ))}
            </TableRow>
          </tbody>
        </table>
      </div>
      {scoring === null && (
        <p
          className="px-4 py-3 text-xs text-text-tertiary border-t border-border-subtle"
          data-testid="rfp-not-scorable"
        >
          {t('rfx.rfp.notScorable')}
        </p>
      )}
    </div>
  );
};

/**
 * RFx UX B-06 — the options and quantity points the RFP asked indicative
 * prices for, as sent (no supplier column).
 * @type {React.FC<{ event: RfpEventView }>}
 */
const SentOptions = ({ event }) => {
  const { t } = useTranslation();
  const pricing = event.pricing;
  if (!pricing) return null;
  return (
    <div
      className="px-4 py-3 border-t border-border-subtle space-y-2"
      data-testid={`rfp-sent-options-${event.id}`}
    >
      <h4 className="text-xs font-semibold text-text-secondary">{t('rfx.rfp.sent.options')}</h4>
      <ul className="space-y-1">
        {pricing.options.map((o) => (
          <li
            key={o.id}
            className="text-sm text-text-primary"
            data-testid={`rfp-sent-option-${o.id}`}
          >
            {o.title}
            {!!o.description && (
              <span className="block text-xs text-text-tertiary">{o.description}</span>
            )}
          </li>
        ))}
      </ul>
      <p className="text-xs text-text-secondary" data-testid={`rfp-sent-points-${event.id}`}>
        {t('rfx.firm.points')}: <Data>{pricing.quantityPoints.map((q) => qty(q)).join(' / ')}</Data>{' '}
        {t(
          pricing.quantityBasis === 'perVariant'
            ? 'rfxa.pricing.basis.perVariant'
            : 'rfxa.pricing.basis.total'
        )}
      </p>
    </div>
  );
};

export default RfpComparison;
