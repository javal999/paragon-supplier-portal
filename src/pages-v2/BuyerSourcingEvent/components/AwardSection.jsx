/** @import React from 'react' */
/** @import { RFQ } from '@data/mockRfqs' */
/** @import { Quotation } from '@data/mockQuotations' */
/** @import { ScoringOptions } from '@lib/quoteScore' */
/** @import { AwardItem } from '@services/sourcing/awardShape' */
/** @import { AwardView, RfqSupplierGateView } from '@services/sourcing/views' */
/** @import { BiddingEligibility } from '@services/sourcing/sourcingType' */
/** @import { VerbAvailability } from '@services/transitions/handoff' */
/** @import { PanelAward } from '../../rfx/AwardPanel' */
/** @import { RunCommand } from '../hooks/useEventCommand' */
import { useTranslation } from 'react-i18next';
import { HandoffNotice } from '@components/ui-v2/HandoffNotice';
import { bestScoredByItemAt } from '@services/sourcing/rfqComparison';
import { AwardPanel } from '../../rfx/AwardPanel';
import { AwardRecords } from '../../rfx/AwardRecords';

/**
 * REQ-E03-05 BR-06 to BR-09 — the award section (`#event-award`, where the
 * board's "Award RFQ" lands): the event's award records with cancel / mark-in-
 * SAP, then — while the RFQ can still be awarded — the handoff notice or the
 * one award panel, and the no-PO note before any award. Owns the reason rule's
 * anchor (`bestOf`) and the award dispatch (`sendAward`), which nothing else on
 * the page reads. Moved out of `BuyerSourcingEvent.jsx` by the Phase 5 page
 * split (no behaviour change).
 * @type {React.FC<{
 *   rfq: RFQ;
 *   eventAwards: AwardView[];
 *   inForce: AwardView[];
 *   awardable: boolean;
 *   awardVerb: VerbAvailability;
 *   cancelVerb: VerbAvailability;
 *   sapVerb: VerbAvailability;
 *   pending: boolean;
 *   current: Quotation[];
 *   qualified: Quotation[];
 *   evalQty: number | null;
 *   reliabilityOf: (id: string) => number;
 *   scoringOpts: ScoringOptions;
 *   tied: boolean;
 *   bestId: string | null;
 *   qualifies: (supplierId: string) => boolean;
 *   gateOf: (supplierId: string) => RfqSupplierGateView | undefined;
 *   eligibilityOf: (supplierId: string) => BiddingEligibility | undefined;
 *   supplierName: (id: string) => string;
 *   run: RunCommand;
 * }>}
 */
const AwardSection = ({
  rfq,
  eventAwards,
  inForce,
  awardable,
  awardVerb,
  cancelVerb,
  sapVerb,
  pending,
  current,
  qualified,
  evalQty,
  reliabilityOf,
  scoringOpts,
  tied,
  bestId,
  qualifies,
  gateOf,
  eligibilityOf,
  supplierName,
  run
}) => {
  const { t } = useTranslation();

  /** BL-64 — quotes exist and not one comes from a supplier passing CR-23: nothing can be awarded. */
  const noneAwardable = current.length > 0 && qualified.length === 0;
  /**
   * The best-scored quote for an item at a break — the reason rule's anchor,
   * read as the verb reads it: per item at that item's own break on a tiered
   * RFQ, the event's best on a legacy one. A genuine tie has no single best.
   * @param {AwardItem} item
   * @param {number} breakQty
   * @returns {string | null}
   */
  const bestOf = (item, breakQty) =>
    item.tiered
      ? (bestScoredByItemAt(rfq, qualified, breakQty, reliabilityOf, scoringOpts).get(
          /** @type {NonNullable<typeof item.lineNo>} */ (item.lineNo)
        ) ?? null)
      : tied
        ? null
        : bestId;
  /**
   * Dispatch the panel's award: `award` (final) or `awardPartial`, by whether an item stays open.
   * @param {PanelAward} a
   */
  const sendAward = (a) => {
    // The verb's required principal: the first line, or — for a final award
    // with no lines ("Will not award the rest") — an award already in force.
    const principal = a.lines[0] ?? inForce.find((x) => x.lines.length > 0)?.lines[0];
    const base = {
      rfqId: rfq.id,
      awardedQuotationId: principal?.quotationId ?? '',
      awardedSupplierId: principal?.supplierId ?? '',
      awardLines: a.lines,
      ...(a.reason ? { awardReason: a.reason } : {})
    };
    run(
      a.final
        ? {
            verb: 'award',
            ...base,
            ...(a.notAwardedItems.length > 0 ? { notAwardedItems: a.notAwardedItems } : {})
          }
        : { verb: 'awardPartial', ...base },
      'rfx.toast.awarded'
    );
  };

  return (
    <section
      id="event-award"
      className="bg-bg-surface border border-border-subtle rounded-lg shadow-sm"
    >
      <div className="px-4 py-3 border-b border-border-subtle text-sm font-semibold text-text-primary">
        {t('rfx.award.title')}
      </div>

      {eventAwards.length > 0 && (
        <div className="p-4 border-b border-border-subtle">
          <AwardRecords
            rfq={rfq}
            awards={eventAwards}
            supplierName={supplierName}
            cancelVerb={cancelVerb}
            sapVerb={sapVerb}
            pending={pending}
            onCancel={(award, cancelReason, partial) =>
              run(
                {
                  verb: partial ? 'cancelAwardPartial' : 'cancelAward',
                  rfqId: rfq.id,
                  awardId: award.id,
                  cancelReason
                },
                'rfx.toast.awardCancelled'
              )
            }
            onMarkSap={(award, sapDocumentNo) =>
              run(
                { verb: 'markAwardSapRaised', rfqId: rfq.id, awardId: award.id, sapDocumentNo },
                'rfx.toast.sapMarked'
              )
            }
          />
        </div>
      )}
      {/* RFx C3 (NR-3 BR-02 to BR-07) — ONE award panel for every RFQ, while
          it can still be awarded: Open, Closed, or Partly awarded. */}
      {!awardable ? null : awardVerb.kind !== 'held' ? (
        <div className="p-4">
          <HandoffNotice availability={awardVerb} testId="handoff-rfq-award" />
        </div>
      ) : (
        <div className="p-4 space-y-3">
          {/* BL-64 / BR-01a — every quoting supplier fails the gate: say the
              award is impossible. The rows below still name each reason. */}
          {noneAwardable && (
            <p
              className="text-sm text-warning-hover"
              role="status"
              data-testid="award-none-qualified"
            >
              {t('rfx.gate.noAward')}
            </p>
          )}
          <AwardPanel
            // Keyed on the awards in force, so a recorded or cancelled award
            // starts the panel afresh over the items still open.
            key={inForce.map((a) => a.id).join('|')}
            rfq={rfq}
            quotes={current}
            inForce={inForce}
            defaultBreak={evalQty}
            bestOf={bestOf}
            qualifies={qualifies}
            gateOf={gateOf}
            eligibilityOf={eligibilityOf}
            supplierName={supplierName}
            noneAwardable={noneAwardable}
            pending={pending}
            onAward={sendAward}
          />
        </div>
      )}
      {eventAwards.length === 0 && (
        <p className="px-4 pb-4 text-xs text-text-tertiary">{t('rfx.award.noPo')}</p>
      )}
    </section>
  );
};

export default AwardSection;
