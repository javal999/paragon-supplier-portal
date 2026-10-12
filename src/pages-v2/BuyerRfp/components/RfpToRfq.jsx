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
 * Moved out of `BuyerRfp.jsx` by the Phase 5 page split (no behaviour change).
 * @type {React.FC<{ event: RfpEventView; awardedRefs: ReadonlyMap<string, string> }>}
 */
const RfpToRfq = ({ event, awardedRefs }) => {
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
  ].filter((o) => !awardedRefs.has(o.ref));
  /** @param {string} id */
  const toggle = (id) =>
    setChosen((prev) => (prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]));
  const go = () =>
    navigate(
      `/buyer/rfq?rfp=${encodeURIComponent(event.id)}&options=${chosen.map(encodeURIComponent).join(',')}`
    );
  return (
    <div
      className="bg-bg-surface border border-border-subtle rounded-lg shadow-sm p-4"
      data-testid={`rfp-to-rfq-${event.id}`}
    >
      <h4 className="text-sm font-semibold text-text-primary">{t('rfx.rfp.toRfq.title')}</h4>
      <p className="text-xs text-text-tertiary mt-1">{t('rfx.rfp.toRfq.hint')}</p>
      <fieldset className="mt-3 space-y-2">
        <legend className="sr-only">{t('rfx.rfp.toRfq.title')}</legend>
        {options.map(({ option, ref, by }) => (
          <label key={ref} className="flex items-start gap-2 text-sm text-text-primary">
            <input
              type="checkbox"
              className="mt-1"
              checked={chosen.includes(ref)}
              onChange={() => toggle(ref)}
              data-testid={`rfp-to-rfq-option-${ref}`}
            />
            <span>
              {option.title}
              <span className="block text-xs text-text-tertiary">
                {by ? t('rfx.rfp.toRfq.proposedBy', { supplier: by }) : t('rfx.rfp.toRfq.pti')}
                {option.description ? ` · ${option.description}` : ''}
              </span>
            </span>
          </label>
        ))}
      </fieldset>
      <div className="flex flex-wrap items-center gap-3 mt-4">
        {create.kind === 'held' ? (
          <>
            <Button
              variant="outline"
              disabled={chosen.length === 0}
              onClick={go}
              data-testid={`rfp-to-rfq-btn-${event.id}`}
            >
              {t('rfx.rfp.toRfq.button')}
            </Button>
            {chosen.length === 0 && (
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
