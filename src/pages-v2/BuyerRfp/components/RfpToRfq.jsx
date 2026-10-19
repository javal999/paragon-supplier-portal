/** @import React from 'react' */
/** @import { RfpEventView } from '@services/sourcing/views' */
import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import Button from '@components/ui-v2/Button';
import { HandoffNotice } from '@components/ui-v2/HandoffNotice';
import { useVerbAvailability } from '@hooks/useVerbAvailability';
import { rfpOptionRef } from '@services/sourcing/rfpFirmOffer';

/**
 * The buyer picks the options — PTI's own and any a supplier proposed — and the
 * RFQ wizard opens pre-filled from them (`/buyer/rfq?rfp=…&options=…`, read by
 * the sourcing board through `prefillRfqItemsFromRfp`). Creating an RFQ is
 * `rfq:create`; a seat without it reads whose act it is instead (§72a).
 *
 * RFx D3 (NR-2 BR-08, AC-06) — each option travels by its REF
 * (`rfpOptionRef`: a supplier's `sup-opt-N` names its proposer), and an option
 * an award in force already placed is not offered: it cannot go to an RFQ as
 * well, while the others stay available.
 *
 * RFx UX B-07 — it sits in the "Firm up the prices" block, which carries its
 * title and rule. An awarded option is listed greyed "Awarded" rather than
 * hidden; and, by owner ruling Q1 (2026-10-19), an option a firm-offer round
 * of this RFP names is listed greyed with its round: the RFQ path is closed
 * for it (`rfpRoundedOptionRefs`, the map the RFQ create policy refuses by).
 *
 * Moved out of `BuyerRfp.jsx` by the Phase 5 page split (no behaviour change).
 * @type {React.FC<{
 *   event: RfpEventView;
 *   awardedRefs: ReadonlyMap<string, string>;
 *   roundedRefs: ReadonlyMap<string, number>;
 * }>}
 */
const RfpToRfq = ({ event, awardedRefs, roundedRefs }) => {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const create = useVerbAvailability('rfq:create');
  const [chosen, setChosen] = useState(/** @type {string[]} */ ([]));
  const options = [
    ...(event.pricing?.options ?? []).map((o) => ({
      option: o,
      ref: rfpOptionRef(o.id),
      by: /** @type {string | null} */ (null)
    })),
    ...event.responses.flatMap((r) =>
      (r.pricing?.proposedOptions ?? []).map((o) => ({
        option: o,
        ref: rfpOptionRef(o.id, r.supplierId),
        by: r.supplierName
      }))
    )
  ];
  /** @param {string} ref */
  const closedFor = (ref) =>
    awardedRefs.has(ref)
      ? t('rfx.status.Awarded')
      : roundedRefs.has(ref)
        ? t('rfx.firmUp.inRound', { n: roundedRefs.get(ref) })
        : null;
  // A ref ticked before it closed (the form outlives the read) is not sent.
  const picked = chosen.filter((ref) => closedFor(ref) === null);
  /** @param {string} id */
  const toggle = (id) =>
    setChosen((prev) => (prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]));
  const go = () =>
    navigate(
      `/buyer/rfq?rfp=${encodeURIComponent(event.id)}&options=${picked.map(encodeURIComponent).join(',')}`
    );
  return (
    <div data-testid={`rfp-to-rfq-${event.id}`}>
      <p className="text-xs text-text-tertiary">{t('rfx.rfp.toRfq.hint')}</p>
      <fieldset className="mt-3 space-y-2">
        <legend className="sr-only">{t('rfx.rfp.toRfq.title')}</legend>
        {options.map(({ option, ref, by }) => {
          const closed = closedFor(ref);
          return (
            <label key={ref} className="flex items-start gap-2 text-sm text-text-primary">
              <input
                type="checkbox"
                className="mt-1"
                disabled={closed !== null}
                checked={closed === null && chosen.includes(ref)}
                onChange={() => toggle(ref)}
                data-testid={`rfp-to-rfq-option-${ref}`}
              />
              <span className={closed ? 'text-text-tertiary' : undefined}>
                {option.title}
                <span className="block text-xs text-text-tertiary">
                  {by ? t('rfx.rfp.toRfq.proposedBy', { supplier: by }) : t('rfx.rfp.toRfq.pti')}
                  {option.description ? ` · ${option.description}` : ''}
                </span>
                {!!closed && (
                  <span
                    className="block text-xs text-text-secondary"
                    data-testid={`rfp-to-rfq-closed-${ref}`}
                  >
                    {closed}
                  </span>
                )}
              </span>
            </label>
          );
        })}
      </fieldset>
      <div className="flex flex-wrap items-center gap-3 mt-4">
        {create.kind === 'held' ? (
          <>
            <Button
              variant="outline"
              disabled={picked.length === 0}
              onClick={go}
              data-testid={`rfp-to-rfq-btn-${event.id}`}
            >
              {t('rfx.rfp.toRfq.button')}
            </Button>
            {picked.length === 0 && (
              <span className="text-xs text-text-tertiary">{t('rfx.rfp.toRfq.pick')}</span>
            )}
          </>
        ) : (
          <HandoffNotice availability={create} testId="handoff-rfp-to-rfq" />
        )}
      </div>
    </div>
  );
};

export default RfpToRfq;
