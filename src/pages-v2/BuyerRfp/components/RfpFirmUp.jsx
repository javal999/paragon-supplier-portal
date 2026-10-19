/** @import React from 'react' */
/** @import { RfpAwardView, RfpEventView, RfpOfferRoundView } from '@services/sourcing/views' */
/** @import { GateResult } from '@services/sourcing/complianceGate' */
/** @import { RfpOptionSettlement } from '@services/sourcing/rfpAward' */
/** @import { RfxCommandVars } from '@services/query/commandHooks' */
import { useTranslation } from 'react-i18next';
import Button from '@components/ui-v2/Button';
import { rfpRoundedOptionRefs, rfqFromOpenRfpRefusal } from '@services/sourcing/rfpAward';
import { RfpFirmOfferRounds } from '../../rfx/RfpFirmOffers';
import { awardedRefsOf } from '../../rfx/RfpAwardSection';
import { rfpToRfqOffered } from '../utils';
import RfpToRfq from './RfpToRfq';

/**
 * RFx UX B-07 — "Firm up the prices": one block, two labelled choices, each
 * with its one-line rule (owner ruling Q1, 2026-10-19):
 *   · ask for firm offers in this RFP, for full-service or ODM options settled here;
 *   · create an RFQ from this RFP, for components tendered per item.
 * While the RFP is Open both are disabled with "Close the RFP first". An
 * awarded option reads "Awarded" in the RFQ choice, and an option a firm-offer
 * round names is closed to the RFQ path (Q1; the RFQ create policy refuses it
 * by the same `rfpRoundedOptionRefs`).
 * @type {React.FC<{
 *   event: RfpEventView;
 *   rounds: readonly RfpOfferRoundView[];
 *   awards: readonly RfpAwardView[];
 *   gateOf: (supplierId: string) => GateResult;
 *   settled: ReadonlyMap<string, RfpOptionSettlement>;
 *   pending: boolean;
 *   run: (vars: RfxCommandVars, successKey: string) => void;
 * }>}
 */
const RfpFirmUp = ({ event, rounds, awards, gateOf, settled, pending, run }) => {
  const { t } = useTranslation();
  // BL-216 — the RFQ choice is held by the rule the RFQ create policy refuses by.
  const isOpen = rfqFromOpenRfpRefusal(event.status, event.eventNumber) !== null;
  return (
    <section
      className="bg-bg-surface border border-border-subtle rounded-lg shadow-sm p-4 space-y-3"
      data-testid={`rfp-firmup-${event.id}`}
    >
      <h3 className="text-sm font-semibold text-text-primary">{t('rfx.firmUp.title')}</h3>
      <div className="grid gap-4 md:grid-cols-2">
        <div
          className="border border-border-subtle rounded-md p-3 space-y-3"
          data-testid={`rfp-firmup-firm-${event.id}`}
        >
          <div>
            <h4 className="text-sm font-semibold text-text-primary">
              {t('rfx.firmUp.firm.title')}
            </h4>
            <p className="text-xs text-text-tertiary">{t('rfx.firmUp.firm.rule')}</p>
          </div>
          <RfpFirmOfferRounds
            event={event}
            rounds={rounds}
            gateOf={gateOf}
            settled={settled}
            pending={pending}
            run={run}
          />
        </div>
        <div
          className="border border-border-subtle rounded-md p-3 space-y-3"
          data-testid={`rfp-firmup-rfq-${event.id}`}
        >
          <div>
            <h4 className="text-sm font-semibold text-text-primary">{t('rfx.rfp.toRfq.title')}</h4>
            <p className="text-xs text-text-tertiary">{t('rfx.firmUp.rfq.rule')}</p>
          </div>
          {isOpen ? (
            <div className="flex flex-wrap items-center gap-3">
              <Button variant="outline" disabled data-testid={`rfp-to-rfq-btn-${event.id}`}>
                {t('rfx.rfp.toRfq.button')}
              </Button>
              <span
                className="text-xs text-text-tertiary"
                data-testid={`rfp-firmup-close-first-rfq-${event.id}`}
              >
                {t('rfx.firmUp.closeFirst')}
              </span>
            </div>
          ) : rfpToRfqOffered(event) ? (
            <RfpToRfq
              event={event}
              awardedRefs={awardedRefsOf(awards)}
              roundedRefs={rfpRoundedOptionRefs(rounds, event.id)}
            />
          ) : (
            <p
              className="text-xs text-text-tertiary"
              data-testid={`rfp-firmup-rfq-none-${event.id}`}
            >
              {t('rfx.firmUp.rfq.needsProposal')}
            </p>
          )}
        </div>
      </div>
    </section>
  );
};

export default RfpFirmUp;
