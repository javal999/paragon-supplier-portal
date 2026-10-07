/** @import React from 'react' */
/** @import { TFunction } from 'i18next' */
/** @import { RFQ } from '@data/mockRfqs' */
/** @import { VerbAvailability } from '@services/transitions/handoff' */
import { Link } from 'react-router-dom';
import { HandoffNotice } from '@components/ui-v2/HandoffNotice';

/**
 * RFx C3 (AR-03, NR-3 BR-07) — THE PANEL'S AWARD IS THE EVENT PAGE'S, FOR
 * EVERY RFQ. The one-winner pick and its single-winner dispatch are gone: a
 * legacy RFQ awarded from here skipped the split rules. Every RFQ that can
 * still be awarded (Open, Closed, Partly awarded) links to the one award panel,
 * as a tiered RFQ always did. The seat's award authority is read here too, so
 * a seat without it is told whose act it is. Moved out of `BuyerSourcing.jsx`
 * by the Phase 5 page split (no behaviour change).
 * @type {React.FC<{
 *   selectedRfq: RFQ;
 *   noneAwardable: boolean;
 *   awardAvailability: VerbAvailability;
 *   t: TFunction;
 * }>}
 */
const PanelAwardSection = ({ selectedRfq, noneAwardable, awardAvailability, t }) => (
  <section
    className="bg-teal-soft border border-teal/20 rounded-md p-4"
    data-testid="panel-tiered-award"
  >
    <h3 className="text-section text-text-primary mb-2">{t('sourcing.award.title')}</h3>
    {/* BL-64 / BR-01a — no quoting supplier passes the gate: the
        award is impossible, and the panel says so. */}
    {noneAwardable ? (
      <p
        className="text-sm text-warning-hover mb-2"
        role="status"
        data-testid="drawer-award-none-qualified"
      >
        {t('rfx.gate.noAward')}
      </p>
    ) : (
      <p className="text-sm text-text-secondary mb-2">{t('rfqCompare.panel.awardOnEvent')}</p>
    )}
    <div className="flex flex-wrap items-center gap-3">
      <Link
        to={`/buyer/rfq/${selectedRfq.id}`}
        className="text-sm text-action hover:underline"
        data-testid="panel-open-tiered-award"
      >
        {t('rfqCompare.panel.openAward')}
      </Link>
      {awardAvailability.kind !== 'held' && (
        <HandoffNotice availability={awardAvailability} testId="handoff-rfq-award" />
      )}
    </div>
  </section>
);

export default PanelAwardSection;
