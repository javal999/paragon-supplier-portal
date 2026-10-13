import { useState } from 'react';
import { useTranslation } from 'react-i18next';
/** @import React from 'react' */
/** @import { RfqQuantityTier, RfqTierBasis } from '@services/sourcing/rfqModel' */
import { Plus, X } from 'lucide-react';
import Button from '@components/ui-v2/Button';
import Data from '@components/ui-v2/Data';
import { formatNumber } from '@lib/format';
import { addTier, readTierQty } from '@services/sourcing/rfqModel';
import { inputClass, labelClass } from '../const';

/**
 * Quantity breaks: type a quantity, pick its basis (per variant or total), add it
 * as a chip; a chip toggles its basis or is removed. Used for the RFQ-wide tiers
 * and for an item that sets its own. `testId` prefixes every inner test id.
 * @type {React.FC<{ tiers: readonly RfqQuantityTier[]; onChange: (next: RfqQuantityTier[]) => void; testId: string; }>}
 */
export const TierEditor = ({ tiers, onChange, testId }) => {
  const { t } = useTranslation();
  const [raw, setRaw] = useState('');
  const [basis, setBasis] = useState(/** @type {RfqTierBasis} */ (tiers[0]?.basis ?? 'perVariant'));
  const [refusal, setRefusal] = useState(/** @type {string | null} */ (null));

  const add = () => {
    const read = readTierQty(raw);
    if (!read.ok) {
      setRefusal(read.reason);
      return;
    }
    const next = addTier(tiers, { qty: read.value, basis });
    if (!next.ok) {
      setRefusal(next.reason);
      return;
    }
    setRefusal(null);
    setRaw('');
    onChange([...next.tiers]);
  };

  /**
   * @param {RfqTierBasis} b
   * @returns {RfqTierBasis}
   */
  const other = (b) => (b === 'perVariant' ? 'total' : 'perVariant');

  return (
    <div className="space-y-3" data-testid={testId}>
      <div className="flex flex-wrap items-end gap-3">
        <div>
          <label className={labelClass} htmlFor={`${testId}-qty`}>
            {t('rfqAuthoring.tiers.input')}
          </label>
          <input
            id={`${testId}-qty`}
            type="text"
            inputMode="decimal"
            value={raw}
            placeholder={t('rfqAuthoring.tiers.placeholder')}
            onChange={(e) => setRaw(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') {
                e.preventDefault();
                add();
              }
            }}
            className={`${inputClass} w-40`}
            data-testid={`${testId}-input`}
          />
        </div>
        <fieldset>
          <legend className={labelClass}>{t('rfqAuthoring.tiers.basis')}</legend>
          <div className="flex gap-3 h-9 items-center">
            {
              /** @type {const} */ (['perVariant', 'total']).map((b) => (
                <label
                  key={b}
                  className="inline-flex items-center gap-1.5 text-sm text-text-secondary cursor-pointer"
                >
                  <input
                    type="radio"
                    name={`${testId}-basis`}
                    checked={basis === b}
                    onChange={() => setBasis(b)}
                    className="accent-action"
                  />
                  {t(`rfqAuthoring.basis.${b}`)}
                </label>
              ))
            }
          </div>
        </fieldset>
        <Button
          variant="secondary"
          icon={Plus}
          onClick={add}
          disabled={raw.trim() === ''}
          data-testid={`${testId}-add`}
        >
          {t('rfqAuthoring.tiers.add')}
        </Button>
      </div>
      {refusal && (
        <p role="alert" className="text-xs text-danger" data-testid={`${testId}-refusal`}>
          {t(`rfqAuthoring.tiers.refusal.${refusal}`)}
        </p>
      )}
      {tiers.length === 0 ? (
        <p className="text-sm text-text-tertiary">{t('rfqAuthoring.tiers.empty')}</p>
      ) : (
        <ul className="flex flex-wrap gap-2" data-testid={`${testId}-chips`}>
          {tiers.map((tier) => (
            <li
              key={tier.qty}
              className="inline-flex items-center gap-1 rounded-full border border-border-input bg-bg-surface pl-3 pr-1 py-1 text-sm"
              data-testid={`${testId}-chip`}
            >
              <Data>{formatNumber(tier.qty)}</Data>
              <button
                type="button"
                className="text-xs text-text-secondary hover:text-action underline-offset-2 hover:underline"
                aria-label={t('rfqAuthoring.tiers.toggle', {
                  qty: formatNumber(tier.qty),
                  basis: t(`rfqAuthoring.basis.${other(tier.basis)}`)
                })}
                onClick={() =>
                  onChange(
                    tiers.map((x) => (x.qty === tier.qty ? { ...x, basis: other(x.basis) } : x))
                  )
                }
              >
                {t(`rfqAuthoring.basis.${tier.basis}`)}
              </button>
              <button
                type="button"
                aria-label={t('rfqAuthoring.tiers.remove', { qty: formatNumber(tier.qty) })}
                className="p-1 text-text-tertiary hover:text-danger"
                onClick={() => onChange(tiers.filter((x) => x.qty !== tier.qty))}
              >
                <X size={12} />
              </button>
            </li>
          ))}
        </ul>
      )}
      <p className="text-xs text-text-tertiary">{t('rfqAuthoring.tiers.help')}</p>
    </div>
  );
};
