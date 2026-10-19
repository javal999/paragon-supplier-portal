/** @import React from 'react' */
/** @import { RFQ } from '@data/mockRfqs' */
/** @import { Quotation } from '@data/mockQuotations' */
/** @import { NegotiationRoundView } from '@services/sourcing/views' */
/** @import { VerbAvailability } from '@services/transitions/handoff' */
/** @import { RunCommand } from '../hooks/useEventCommand' */
/** @import { NewRoundFormState } from '../hooks/useNewRoundForm' */
import { useTranslation } from 'react-i18next';
import Button from '@components/ui-v2/Button';
import Data from '@components/ui-v2/Data';
import StatusPill from '@components/ui-v2/StatusPill';
import Table from '@components/ui-v2/Table';
import TableHeader, { TableHeaderCell } from '@components/ui-v2/TableHeader';
import TableRow from '@components/ui-v2/TableRow';
import TableCell from '@components/ui-v2/TableCell';
import { HandoffNotice } from '@components/ui-v2/HandoffNotice';
import { DeadlinePill, EmptyRow, money } from '../../rfx/rfxDisplay';
import NewRoundForm from './NewRoundForm';

/**
 * REQ-E03-05 BR-03 / BR-04 — negotiation rounds: the event's rounds (deadline,
 * shortlist with who has revised, message and target, a close control while
 * open), then either the handoff notice or the new-round form, by whether the
 * seat holds `rfq:negotiate`. Moved out of `BuyerSourcingEvent.jsx` by the
 * Phase 5 page split (no behaviour change).
 * @type {React.FC<{
 *   rfq: RFQ;
 *   eventRounds: NegotiationRoundView[];
 *   current: Quotation[];
 *   currency: RFQ['currency'];
 *   negotiate: VerbAvailability;
 *   supplierName: (id: string) => string;
 *   earlyRound: { notQuoted: number } | null;
 *   form: NewRoundFormState;
 *   run: RunCommand;
 * }>}
 */
const NegotiationSection = ({
  rfq,
  eventRounds,
  current,
  currency,
  negotiate,
  supplierName,
  earlyRound,
  form,
  run
}) => {
  const { t } = useTranslation();
  return (
    <section className="bg-bg-surface border border-border-subtle rounded-lg shadow-sm mb-6">
      <div className="px-4 py-3 border-b border-border-subtle text-sm font-semibold text-text-primary">
        {t('rfx.neg.title')}
      </div>
      <div className="overflow-x-auto">
        <Table>
          <TableHeader>
            <TableHeaderCell>{t('rfx.cmp.roundColumn')}</TableHeaderCell>
            <TableHeaderCell>{t('rfx.neg.deadline')}</TableHeaderCell>
            <TableHeaderCell>{t('rfx.neg.shortlist')}</TableHeaderCell>
            <TableHeaderCell>{t('rfx.neg.message')}</TableHeaderCell>
            <TableHeaderCell>{''}</TableHeaderCell>
          </TableHeader>
          <tbody>
            {eventRounds.map((round) => (
              <TableRow key={round.id} data-testid={`round-${round.id}`}>
                <TableCell>
                  <Data>{t('rfx.cmp.round', { round: round.roundNumber })}</Data>
                  {round.bestAndFinal && (
                    <StatusPill variant="warning" className="ml-2">
                      {t('rfx.neg.bestAndFinal')}
                    </StatusPill>
                  )}
                </TableCell>
                <TableCell className="whitespace-nowrap">
                  <DeadlinePill deadline={round.deadline} done={round.closed} />
                </TableCell>
                <TableCell className="text-sm">
                  <ul>
                    {round.participants.map((p) => (
                      <li
                        key={p.supplierId}
                        data-testid={`round-participant-${round.id}-${p.supplierId}`}
                      >
                        {p.supplierName}{' '}
                        <StatusPill variant={p.revisedQuotationId ? 'success' : 'neutral'}>
                          {t(p.revisedQuotationId ? 'rfx.neg.revised' : 'rfx.neg.notRevised')}
                        </StatusPill>
                      </li>
                    ))}
                  </ul>
                  <div className="text-xs text-text-tertiary mt-1">
                    {t('rfx.neg.awaiting', { count: round.awaiting })}
                  </div>
                </TableCell>
                <TableCell className="text-sm text-text-secondary">
                  {round.message ?? '—'}
                  {round.targetUnitPrice !== undefined && (
                    <div className="text-xs text-text-tertiary">
                      {t('rfx.neg.target')}: <Data>{money(round.targetUnitPrice, currency)}</Data>
                    </div>
                  )}
                </TableCell>
                <TableCell className="text-right">
                  {!round.closed && negotiate.kind === 'held' && (
                    <Button
                      variant="secondary"
                      onClick={() =>
                        run({ verb: 'closeRound', roundId: round.id }, 'rfx.toast.roundClosed')
                      }
                      data-testid={`round-close-${round.id}`}
                    >
                      {t('rfx.neg.closeRound')}
                    </Button>
                  )}
                </TableCell>
              </TableRow>
            ))}
            {eventRounds.length === 0 && (
              <EmptyRow colSpan={5} testId="rounds-empty">
                {t('rfx.neg.empty')}
              </EmptyRow>
            )}
          </tbody>
        </Table>
      </div>

      {negotiate.kind !== 'held' ? (
        <div className="p-4">
          <HandoffNotice availability={negotiate} testId="handoff-rfq-negotiate" />
        </div>
      ) : (
        <NewRoundForm
          rfq={rfq}
          current={current}
          supplierName={supplierName}
          earlyRound={earlyRound}
          form={form}
          run={run}
        />
      )}
    </section>
  );
};

export default NegotiationSection;
