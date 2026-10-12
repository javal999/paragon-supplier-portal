/** @import React from 'react' */
/** @import { RFQ } from '@data/mockRfqs' */
/** @import { RfqSupplierGateView } from '@services/sourcing/views' */
/** @import { BiddingEligibility } from '@services/sourcing/sourcingType' */
/** @import { VerbAvailability } from '@services/transitions/handoff' */
/** @import { RunCommand } from '../hooks/useEventCommand' */
import { useTranslation } from 'react-i18next';
import Button from '@components/ui-v2/Button';
import Table from '@components/ui-v2/Table';
import TableHeader, { TableHeaderCell } from '@components/ui-v2/TableHeader';
import TableRow from '@components/ui-v2/TableRow';
import TableCell from '@components/ui-v2/TableCell';
import { HandoffNotice } from '@components/ui-v2/HandoffNotice';
import { effectiveDeadline } from '@services/transitions/rfxRules';
import { DeadlinePill, EmptyRow, GateMarker, OtifOrNoHistory } from '../../rfx/rfxDisplay';
import { EligibilityMarker } from '../../rfx/eligibilityDisplay';

/**
 * REQ-E03-03 BR-05 — the response window, for everyone or for named invitees:
 * one row per invitee (gate, eligibility, OTIF, the deadline in force for that
 * supplier, a tick to extend for them only), then the extend control while the
 * event is Open or Closed. The extend date and the ticked invitees are page
 * state, threaded in. Moved out of `BuyerSourcingEvent.jsx` by the Phase 5 page
 * split (no behaviour change).
 * @type {React.FC<{
 *   rfq: RFQ;
 *   publish: VerbAvailability;
 *   supplierName: (id: string) => string;
 *   supplierOtif: (id: string) => number | null;
 *   gateOf: (supplierId: string) => RfqSupplierGateView | undefined;
 *   eligibilityOf: (supplierId: string) => BiddingEligibility | undefined;
 *   extendTo: string;
 *   setExtendTo: React.Dispatch<React.SetStateAction<string>>;
 *   extendOnly: string[];
 *   setExtendOnly: React.Dispatch<React.SetStateAction<string[]>>;
 *   run: RunCommand;
 * }>}
 */
const ResponseWindowSection = ({
  rfq,
  publish,
  supplierName,
  supplierOtif,
  gateOf,
  eligibilityOf,
  extendTo,
  setExtendTo,
  extendOnly,
  setExtendOnly,
  run
}) => {
  const { t } = useTranslation();
  return (
    <div className="bg-bg-surface border border-border-subtle rounded-lg shadow-sm overflow-x-auto mb-6">
      <div className="flex flex-wrap items-center justify-between gap-3 px-4 py-3 border-b border-border-subtle">
        <span className="text-sm font-semibold text-text-primary">{t('rfx.event.window')}</span>
        {publish.kind !== 'held' && (
          <HandoffNotice availability={publish} testId="handoff-rfq-extend" />
        )}
      </div>
      <Table>
        <TableHeader>
          <TableHeaderCell>{t('rfx.invite.col.supplier')}</TableHeaderCell>
          <TableHeaderCell>{t('rfx.invite.col.otif')}</TableHeaderCell>
          <TableHeaderCell>{t('rfx.deadline.own')}</TableHeaderCell>
          <TableHeaderCell>{t('rfx.rfi.extendSelected')}</TableHeaderCell>
        </TableHeader>
        <tbody>
          {rfq.invitedSupplierIds.map((supplierId) => {
            const own = effectiveDeadline(
              rfq.responseDeadline,
              rfq.inviteeDeadlines ?? [],
              supplierId
            );
            return (
              <TableRow key={supplierId} data-testid={`event-invitee-${supplierId}`}>
                <TableCell>
                  {supplierName(supplierId)}
                  {/* BR-06 — still invited and still able to quote; it cannot be awarded. */}
                  <div className="mt-1">
                    <GateMarker gate={gateOf(supplierId)} testId={`event-gate-${supplierId}`} />
                  </div>
                  {/* Material G2 — invited and still able to quote (MAT-D14); flagged when below the level. */}
                  <div className="mt-1">
                    <EligibilityMarker
                      eligibility={eligibilityOf(supplierId)}
                      testId={`event-elig-${supplierId}`}
                    />
                  </div>
                </TableCell>
                <TableCell>
                  <OtifOrNoHistory
                    otif={supplierOtif(supplierId)}
                    testId={`event-otif-${supplierId}`}
                  />
                </TableCell>
                <TableCell className="whitespace-nowrap">
                  <DeadlinePill
                    deadline={own}
                    done={rfq.respondedSupplierIds.includes(supplierId)}
                    testId={`event-deadline-${supplierId}`}
                  />
                </TableCell>
                <TableCell>
                  <input
                    type="checkbox"
                    className="accent-teal"
                    aria-label={supplierName(supplierId)}
                    checked={extendOnly.includes(supplierId)}
                    onChange={() =>
                      setExtendOnly((prev) =>
                        prev.includes(supplierId)
                          ? prev.filter((s) => s !== supplierId)
                          : [...prev, supplierId]
                      )
                    }
                  />
                </TableCell>
              </TableRow>
            );
          })}
          {rfq.invitedSupplierIds.length === 0 && (
            <EmptyRow colSpan={4} testId="event-no-invitees">
              {t('rfx.invite.empty')}
            </EmptyRow>
          )}
        </tbody>
      </Table>
      {rfq.status === 'Open' || rfq.status === 'Closed' ? (
        <div className="flex flex-wrap items-end gap-3 px-4 py-3 border-t border-border-subtle">
          <div>
            <label
              className="block text-xs font-semibold text-text-secondary mb-1"
              htmlFor="event-extend"
            >
              {t('rfx.rfi.extend')}
            </label>
            <input
              id="event-extend"
              type="date"
              value={extendTo}
              onChange={(e) => setExtendTo(e.target.value)}
              className="bg-white border border-border-input rounded-md px-3 h-10 text-sm focus:outline-none focus:border-action"
            />
          </div>
          <Button
            variant="outline"
            disabled={publish.kind !== 'held' || !extendTo}
            data-testid="event-extend-btn"
            onClick={() =>
              run(
                {
                  verb: 'extendRfq',
                  rfqId: rfq.id,
                  deadline: extendTo,
                  ...(extendOnly.length > 0 ? { supplierIds: extendOnly } : {})
                },
                'rfx.toast.extended'
              )
            }
          >
            {extendOnly.length > 0 ? t('rfx.rfi.extendSelected') : t('rfx.rfi.extendAll')}
          </Button>
          <p className="text-xs text-text-tertiary flex-1 min-w-[16rem]">
            {t('rfx.event.windowRule')}
          </p>
        </div>
      ) : (
        <p
          className="px-4 py-3 text-xs text-text-tertiary border-t border-border-subtle"
          data-testid="event-extend-unavailable"
        >
          {t('rfx.event.extendClosed')}
        </p>
      )}
      {(rfq.extensions?.length ?? 0) > 0 && (
        <p className="px-4 pb-3 text-xs text-text-tertiary" data-testid="event-extended">
          {t('rfx.extended')}
        </p>
      )}
    </div>
  );
};

export default ResponseWindowSection;
