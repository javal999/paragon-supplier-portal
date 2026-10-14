/** @import React from 'react' */
/** @import { RfpEventView } from '@services/sourcing/views' */
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

/**
 * REQ-E03-04 — terms as rows, suppliers as columns, deviations highlighted.
 * Moved out of `BuyerRfp.jsx` by the Phase 5 page split (no behaviour change).
 * @type {React.FC<{ event: RfpEventView }>}
 */
const RfpComparison = ({ event }) => {
  const { t } = useTranslation();
  const scoring = rfpScoringOf(event);
  const scoreById = new Map(
    scoring?.kind === 'scored'
      ? scoring.scores.map((s) => /** @type {const} */ ([s.quoteId, s]))
      : []
  );

  if (event.responses.length === 0) {
    return (
      <p className="py-10 text-center text-sm text-text-tertiary" data-testid="rfp-no-proposals">
        {t('rfx.rfp.noProposals')}
      </p>
    );
  }

  return (
    <div className="bg-bg-surface border border-border-subtle rounded-lg shadow-sm overflow-x-auto">
      <Table>
        <TableHeader>
          <TableHeaderCell>{t('rfx.rfp.col.term')}</TableHeaderCell>
          <TableHeaderCell>{t('rfx.rfp.col.requested')}</TableHeaderCell>
          {event.responses.map((r) => (
            <TableHeaderCell key={r.id}>
              {r.supplierName}
              <div className="text-xs font-normal normal-case text-text-tertiary">
                {t('rfx.rfp.deviations', { count: r.deviationCount })}
                {scoreById.has(r.id) && (
                  <>
                    {' · '}
                    {t('rfx.rfp.scored')}{' '}
                    <Data>
                      {
                        /** @type {import('@lib/quoteScore').QuoteScore} */ (scoreById.get(r.id))
                          .composite
                      }
                    </Data>
                    {
                      /** @type {import('@lib/quoteScore').QuoteScore} */ (scoreById.get(r.id))
                        .topRanked && (
                        <StatusPill variant="success" className="ml-1">
                          {t('rfx.cmp.best')}
                        </StatusPill>
                      )
                    }
                  </>
                )}
              </div>
            </TableHeaderCell>
          ))}
        </TableHeader>
        <tbody>
          {RFP_TERM_GROUP_ORDER.flatMap((group) => {
            const rows = event.terms.filter((row) => rfpTermGroupOf(row) === group);
            if (rows.length === 0) return [];
            return rows.map((row, index) => (
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
                {event.responses.map((r) => {
                  const a = r.answers.find((x) => x.termId === row.termId);
                  const deviates = a?.stance === 'deviate';
                  return (
                    <TableCell
                      key={r.id}
                      className={`align-top ${deviates ? 'bg-warning-soft' : ''}`}
                      data-testid={`rfp-cell-${row.termId}-${r.supplierId}`}
                    >
                      <div className="text-sm text-text-primary">
                        <Data>{termValueText(t, row, a?.proposedValue)}</Data>
                      </div>
                      {a && (
                        <StatusPill variant={deviates ? 'warning' : 'success'} className="mt-1">
                          {t(`rfx.stance.${a.stance}`)}
                        </StatusPill>
                      )}
                      {deviates && a?.comment && (
                        <div className="text-xs text-warning-hover mt-1">{a.comment}</div>
                      )}
                    </TableCell>
                  );
                })}
              </TableRow>
            ));
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
      </Table>
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

export default RfpComparison;
