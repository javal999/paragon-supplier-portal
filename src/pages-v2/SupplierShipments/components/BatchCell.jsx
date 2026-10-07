/** @import React from 'react' */
import { useTranslation } from 'react-i18next';
/** @import { AvailableBatch } from '@services/transitions/fulfilmentRules' */
/** @import { LineEntry } from '../../shipments/asnLines' */
import { batchModeOf } from '../../shipments/asnLines';
import { TYPE_BATCH, inputClass } from '../const';
import { fmtDate } from '../utils';

/**
 * MR-6 BR-01 to BR-04 — the batch field. With declared batches on offer it is
 * a picker showing batch, available quantity and expiry, and picking one fills
 * the expiry; the supplier may still type a batch instead (edge case 4).
 * Without any, it is free text, marked as not in declared stock.
 * @type {React.FC<{ materialCode: string; entry: LineEntry; options: readonly AvailableBatch[]; onChange: (patch: Partial<LineEntry>) => void; }>}
 */
const BatchCell = ({ materialCode, entry, options, onChange }) => {
  const { t } = useTranslation();
  const mode = batchModeOf(entry, options);
  const typed = (
    <>
      <input
        type="text"
        aria-label={
          options.length > 0
            ? t('fc.asn.batch.typedFor', { material: materialCode })
            : t('fc.asn.batchFor', { material: materialCode })
        }
        value={entry.batch}
        onChange={(ev) => onChange({ batch: ev.target.value, batchSource: 'typed' })}
        placeholder={t('supplierShipments.placeholder.batch')}
        className={`${inputClass} min-w-[110px] ${options.length > 0 ? 'mt-1' : ''}`}
      />
      <div className="mt-1 text-[11px] text-text-tertiary">{t('fc.asn.batch.notDeclaredNote')}</div>
    </>
  );
  if (options.length === 0) return typed;
  /** @param {string} value */
  const pick = (value) => {
    if (value === TYPE_BATCH) {
      onChange({ batch: '', batchSource: 'typed' });
      return;
    }
    const o = options.find((x) => x.batchNumber === value);
    onChange({ batch: value, batchSource: 'declared', expiry: o?.expiryDate ?? '' });
  };
  return (
    <>
      <select
        aria-label={t('fc.asn.batchFor', { material: materialCode })}
        value={mode === 'declared' ? entry.batch.trim() : TYPE_BATCH}
        onChange={(ev) => pick(ev.target.value)}
        className={`${inputClass} min-w-[160px]`}
      >
        <option value="">{t('fc.asn.batch.choose')}</option>
        {options.map((o) => (
          <option key={o.batchNumber} value={o.batchNumber}>
            {o.expiryDate
              ? t('fc.asn.batch.option', {
                  batch: o.batchNumber,
                  available: o.available.toLocaleString('en-US'),
                  expiry: fmtDate(o.expiryDate)
                })
              : t('fc.asn.batch.optionNoExpiry', {
                  batch: o.batchNumber,
                  available: o.available.toLocaleString('en-US')
                })}
          </option>
        ))}
        <option value={TYPE_BATCH}>{t('fc.asn.batch.typeOther')}</option>
      </select>
      {mode === 'typed' ? typed : null}
    </>
  );
};

export default BatchCell;
