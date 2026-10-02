import React from 'react';
import { useTranslation } from 'react-i18next';
import { HandoffNotice } from '@components/ui-v2/HandoffNotice';
import { useVerbAvailability } from '@hooks/useVerbAvailability';
import type { GateResult } from '@services/sourcing/complianceGate';
import type { RfpAwardView, RfpEventView, RfpOfferRoundView } from '@services/sourcing/views';
import type { RfxCommandVars } from '@services/query/commandHooks';
import { RfpAwardPanel, awardableFirmPrices, type ItemPanelAward } from './AwardPanel';
import { RfpAwardRecords } from './AwardRecords';
import type { RfpAwardLine } from '@services/sourcing/types';
import { rfpAwardedOptionRefs } from '@services/sourcing/rfpAward';
import { rfxNow } from './rfxDisplay';

// ────────────────────────────────────────────────────────────────────────────
// RFx D3 — THE RFP'S AWARD SECTION (NR-2 buyer steps 5 and 6, BR-05 to BR-07,
// BR-10, edge case 6; NR-3 BR-09 to BR-11). The recorded awards with cancel
// and "Raised in SAP", then the shared award panel over the options of the
// closed firm-offer rounds while the RFP is Closed or Partly awarded.
//
// An RFP with no pricing step offers no award at all and says why: an award
// rests on firm prices, and firm prices are asked per option and quantity
// point. A priced RFP with no closed round says a round must close first.
// ────────────────────────────────────────────────────────────────────────────

/**
 * NR-2 BR-08 — the option refs an award IN FORCE on the RFP placed, read from
 * the buyer's award views through the rule the RFQ create policy and the
 * pre-fill use (`rfpAwardedOptionRefs`). A cancelled award frees its options.
 */
export const awardedRefsOf = (awards: readonly RfpAwardView[]): ReadonlyMap<string, string> =>
  rfpAwardedOptionRefs(awardRecordsInForce(awards));

/** The buyer's award views IN FORCE, as the award records the pure rules read. */
export const awardRecordsInForce = (awards: readonly RfpAwardView[]) =>
  awards.filter((a) => a.status !== 'Cancelled').map((a) => ({ ...a, reason: a.reason ?? '' }));

export interface RfpAwardSectionProps {
  event: RfpEventView;
  /** This RFP's rounds (the buyer's read). */
  rounds: readonly RfpOfferRoundView[];
  /** Every award of this RFP, cancelled ones included. */
  awards: readonly RfpAwardView[];
  gateOf: (supplierId: string) => GateResult;
  supplierName: (supplierId: string) => string;
  pending: boolean;
  run: (vars: RfxCommandVars, successKey: string) => void;
}

export const RfpAwardSection: React.FC<RfpAwardSectionProps> = ({
  event,
  rounds,
  awards,
  gateOf,
  supplierName,
  pending,
  run,
}) => {
  const { t } = useTranslation();
  const awardVerb = useVerbAvailability('rfp:award');
  const cancelVerb = useVerbAvailability('rfp:award-cancel');
  const sapVerb = useVerbAvailability('rfp:award-sap');
  const inForce = awards.filter((a) => a.status !== 'Cancelled');
  const awardable = event.status === 'Closed' || event.status === 'Partly awarded';
  const hasClosedRound = rounds.some((r) => r.closed);
  const bidders = [...new Set(awardableFirmPrices(rounds).map((p) => p.supplierId))];
  const qualifies = (sid: string) => gateOf(sid).passes;
  const noneAwardable = bidders.length > 0 && bidders.every((sid) => !qualifies(sid));

  const sendAward = (a: ItemPanelAward<RfpAwardLine>) =>
    run(
      a.final
        ? {
            verb: 'awardRfp',
            rfpId: event.id,
            awardLines: a.lines,
            awardReason: a.reason,
            ...(a.notAwardedItems.length > 0 ? { notAwardedItems: a.notAwardedItems } : {}),
          }
        : { verb: 'awardRfpPartial', rfpId: event.id, awardLines: a.lines, awardReason: a.reason },
      'rfx.toast.awarded',
    );

  return (
    <section
      className="bg-bg-surface border border-border-subtle rounded-lg shadow-sm"
      data-testid={`rfp-award-${event.id}`}
    >
      <div className="px-4 py-3 border-b border-border-subtle text-sm font-semibold text-text-primary">
        {t('rfx.award.title')}
      </div>
      {!event.pricing ? (
        <p className="p-4 text-sm text-text-secondary" data-testid={`rfp-award-no-pricing-${event.id}`}>
          {t('rfx.firm.noPricing')}
        </p>
      ) : (
        <>
          {awards.length > 0 && (
            <div className="p-4 border-b border-border-subtle">
              <RfpAwardRecords
                awards={awards}
                supplierName={supplierName}
                cancelVerb={cancelVerb}
                sapVerb={sapVerb}
                pending={pending}
                onCancel={(award, cancelReason, partial) =>
                  run(
                    {
                      verb: partial ? 'cancelRfpAwardPartial' : 'cancelRfpAward',
                      rfpId: event.id,
                      awardId: award.id,
                      cancelReason,
                    },
                    'rfx.toast.awardCancelled',
                  )
                }
                onMarkSap={(award, sapDocumentNo) =>
                  run(
                    { verb: 'markRfpAwardSap', rfpId: event.id, awardId: award.id, sapDocumentNo },
                    'rfx.toast.sapMarked',
                  )
                }
              />
            </div>
          )}
          {awardable && !hasClosedRound && (
            <p className="p-4 text-sm text-text-tertiary" data-testid={`rfp-award-no-round-${event.id}`}>
              {t('rfx.rfpAward.noRound')}
            </p>
          )}
          {awardable && hasClosedRound && awardVerb.kind !== 'held' && (
            <div className="p-4">
              <HandoffNotice availability={awardVerb} testId="handoff-rfp-award" />
            </div>
          )}
          {awardable && hasClosedRound && awardVerb.kind === 'held' && (
            <div className="p-4 space-y-3">
              {noneAwardable && (
                <p className="text-sm text-warning-hover" role="status" data-testid="award-none-qualified">
                  {t('rfx.gate.noAward')}
                </p>
              )}
              <RfpAwardPanel
                // Keyed on the awards in force and the closed rounds, so a
                // recorded or cancelled award, or a newly closed round, starts
                // the panel afresh over the options still open.
                key={`${inForce.map((a) => a.id).join('|')}#${rounds.filter((r) => r.closed).length}`}
                rfpId={event.id}
                status={event.status}
                currency={event.currency}
                rounds={rounds}
                inForce={inForce}
                nowIso={rfxNow()}
                qualifies={qualifies}
                gateOf={gateOf}
                // Material G2 (MR-10 BR-07, edge case 1) — each invitee on the RFP's type, today.
                eligibilityOf={(sid) => event.invitedSuppliers.find((i) => i.supplierId === sid)?.eligibility}
                supplierName={supplierName}
                noneAwardable={noneAwardable}
                pending={pending}
                onAward={sendAward}
              />
            </div>
          )}
          {awards.length === 0 && <p className="px-4 pb-4 text-xs text-text-tertiary">{t('rfx.award.noPo')}</p>}
        </>
      )}
    </section>
  );
};
