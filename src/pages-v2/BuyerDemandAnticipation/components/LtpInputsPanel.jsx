/** @import React from 'react' */
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import Data from '@components/ui-v2/Data';
import { HandoffNotice } from '@components/ui-v2/HandoffNotice';
import { useVerbAvailability } from '@hooks/useVerbAvailability';
import { useToast } from '@hooks/useToast';
import { useLtpInputCommand } from '@services/query/commandHooks';
import { LTP_SERIES, parseLtpCsv } from '@services/transitions/ltpInputRules';
/** @import { LtpSeries } from '@services/transitions/ltpInputRules' */
/** @import { RowLtpInputs } from '@services/data/mock/demandAnticipationReadModel' */
import { formatDate } from '@lib/format';
import { inputClass, labelClass } from '../../inventory/inventoryDisplay';

// ─────────────────────────────────────────────────────────────────────────────
// BL-267 (PEX-5) — LTP inputs on the DA page: the planner uploads LTP A, LTP
// Festive and LTP B per material from a file (BR-02, PEX-D12 proposed) and
// records the LTP choice per material (BR-01). The hub never picks the LTP
// (BR-07). ONE verb, ONE notice in its slot: a seat without `ltpinput:set`
// sees the handoff notice, and the form is gated with the mode (§84).
// Every upload is stamped with who, when and the source file name (the ledger).
// ─────────────────────────────────────────────────────────────────────────────

/**
 * @type {React.FC<{
 *   materials: readonly { materialCode: string; materialLabel: string; ltpInputs?: RowLtpInputs }[];
 * }>}
 */
const LtpInputsPanel = ({ materials }) => {
  const { t } = useTranslation();
  const { toast } = useToast();
  const availability = useVerbAvailability('ltpinput:set');
  const command = useLtpInputCommand();
  const [materialCode, setMaterialCode] = useState('');
  const [series, setSeries] = useState(/** @type {LtpSeries} */ ('A'));
  const [problem, setProblem] = useState(/** @type {string | null} */ (null));
  const current = materials.find((m) => m.materialCode === materialCode) ?? null;
  const ltp = current?.ltpInputs ?? null;

  if (availability.kind !== 'held')
    return <HandoffNotice availability={availability} testId="handoff-ltp-input" />;

  /** @param {unknown} res */
  const report = (res) => {
    const r = /** @type {{ status: string; reason?: string }} */ (res);
    if (r.status === 'failed')
      toast({ variant: 'error', title: t('ltpIn.failed'), description: r.reason });
    else toast({ variant: 'success', title: t('ltpIn.done') });
  };

  /** @param {React.ChangeEvent<HTMLInputElement>} e */
  const onFile = async (e) => {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file || materialCode === '') return;
    const parsed = parseLtpCsv(await file.text());
    if ('refusal' in parsed) {
      setProblem(parsed.refusal);
      return;
    }
    setProblem(null);
    report(
      await command.mutateAsync({
        materialCode,
        series,
        weeks: parsed.weeks,
        sourceFile: file.name
      })
    );
  };

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
        <div>
          <label htmlFor="ltp-in-choice" className={labelClass}>
            {t('ltpIn.choice')}
          </label>
          <select
            id="ltp-in-choice"
            data-testid="ltp-in-choice"
            className={inputClass}
            value={ltp?.choice ?? 'A'}
            disabled={materialCode === '' || command.isPending}
            onChange={async (e) =>
              report(
                await command.mutateAsync({
                  materialCode,
                  choice: /** @type {LtpSeries} */ (e.target.value)
                })
              )
            }
          >
            {LTP_SERIES.map((s) => (
              <option key={s} value={s}>
                {t(`ltpIn.series.${s}`)}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label htmlFor="ltp-in-series" className={labelClass}>
            {t('ltpIn.uploadSeries')}
          </label>
          <select
            id="ltp-in-series"
            data-testid="ltp-in-series"
            className={inputClass}
            value={series}
            onChange={(e) => setSeries(/** @type {LtpSeries} */ (e.target.value))}
          >
            {LTP_SERIES.map((s) => (
              <option key={s} value={s}>
                {t(`ltpIn.series.${s}`)}
              </option>
            ))}
          </select>
        </div>
      </div>
      <div className="flex flex-wrap items-center gap-3">
        <label className="inline-block">
          <span className="sr-only">{t('ltpIn.file')}</span>
          <input
            type="file"
            accept=".csv,text/csv,text/plain"
            data-testid="ltp-in-file"
            disabled={materialCode === '' || command.isPending}
            onChange={(e) => void onFile(e)}
          />
        </label>
        <span className="text-xs text-text-tertiary">{t('ltpIn.fileFormat')}</span>
      </div>
      {problem ? (
        <p className="text-sm text-danger mt-2" role="alert" data-testid="ltp-in-problem">
          {problem}
        </p>
      ) : null}
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
    </section>
  );
};

export default LtpInputsPanel;
