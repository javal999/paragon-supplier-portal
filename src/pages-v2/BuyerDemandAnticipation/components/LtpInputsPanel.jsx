/** @import React from 'react' */
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import Data from '@components/ui-v2/Data';
import { HandoffNotice } from '@components/ui-v2/HandoffNotice';
import { useVerbAvailability } from '@hooks/useVerbAvailability';
import { LTP_SERIES } from '@services/transitions/ltpInputRules';
/** @import { LtpBatchMaterialView } from './LtpBatchUploads' */
import { formatDate } from '@lib/format';
import { inputClass, labelClass } from '../../inventory/inventoryDisplay';
import LtpBatchUploads from './LtpBatchUploads';

// ─────────────────────────────────────────────────────────────────────────────
// BL-267 (PEX-5) — LTP inputs on the DA page: the batch upload, three screens,
// one per series (PSC-3 BR-01, BL-338), each taking one CSV with many
// materials. The batch screens replaced the per-material CSV.
//
// PSC-4 BR-01 / BR-09 (BL-339) — the LTP CHOICE IS RETIRED: DA reads LTP A, the
// chosen-LTP control is gone, and so is the marker on the grid. Its historical
// ledger rows stay; nothing here writes one.
// ONE verb, ONE notice in its slot: a seat without `ltpinput:set` sees the
// handoff notice, and the controls are gated with the mode (§84). Every upload
// is stamped with who, when and the source file name (the ledger).
// ─────────────────────────────────────────────────────────────────────────────

/**
 * @type {React.FC<{ materials: readonly LtpBatchMaterialView[] }>}
 */
const LtpInputsPanel = ({ materials }) => {
  const { t } = useTranslation();
  const availability = useVerbAvailability('ltpinput:set');
  const [materialCode, setMaterialCode] = useState('');
  const current = materials.find((m) => m.materialCode === materialCode) ?? null;
  const ltp = current?.ltpInputs ?? null;

  if (availability.kind !== 'held')
    return <HandoffNotice availability={availability} testId="handoff-ltp-input" />;

  return (
    <section
      className="bg-bg-surface border border-border-subtle rounded-lg p-4 mb-4"
      data-testid="ltp-inputs"
    >
      <h2 className="text-base font-semibold text-text-primary mb-1">{t('ltpIn.title')}</h2>
      <p className="text-xs text-text-tertiary mb-3">{t('ltpIn.intro')}</p>
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 items-end mb-3">
        <div>
          <label htmlFor="ltp-in-material" className={labelClass}>
            {t('ltpIn.material')}
          </label>
          <select
            id="ltp-in-material"
            data-testid="ltp-in-material"
            className={inputClass}
            value={materialCode}
            onChange={(e) => setMaterialCode(e.target.value)}
          >
            <option value="">{t('ltpIn.pick')}</option>
            {materials.map((m) => (
              <option key={m.materialCode} value={m.materialCode}>
                {m.materialCode} · {m.materialLabel}
              </option>
            ))}
          </select>
        </div>
      </div>
      <p className="text-xs text-text-secondary mb-3" data-testid="ltp-in-da-baseline">
        {t('ltpIn.daBaseline')}
      </p>
      {ltp ? (
        <ul className="mt-3 text-xs text-text-secondary" data-testid="ltp-in-stamps">
          {LTP_SERIES.map((s) => {
            const u = ltp.uploads[s];
            return (
              <li key={s} data-testid={`ltp-in-stamp-${s}`}>
                {t(`ltpIn.series.${s}`)}:{' '}
                {u ? (
                  <>
                    <Data>{u.sourceFile}</Data> · {formatDate(u.setAt)}
                  </>
                ) : (
                  t('ltpIn.notUploaded')
                )}
              </li>
            );
          })}
        </ul>
      ) : null}
      <LtpBatchUploads materials={materials} />
    </section>
  );
};

export default LtpInputsPanel;
