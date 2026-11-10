/** @import React from 'react' */
import { Fragment, useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import TermLabel from '@components/ui-v2/TermLabel';
import Data from '@components/ui-v2/Data';
import { formatDate } from '@lib/format';
import { useForecastCommitments, useStrategicBufferInputs } from '@services/query/hooks';
import { withFestiveBuffer } from '@services/transitions/strategicBufferInputs';
import {
  BUFFER_RULES,
  STRATEGIC_BUFFER_QUESTION,
  strategicBufferRows
} from '@services/transitions/drcBufferRules';
/** @import { MonthLtp, StrategicBufferRow } from '@services/transitions/drcBufferRules' */
import { qty } from './inventoryDisplay';

// ─────────────────────────────────────────────────────────────────────────────
// DRC-9a (BL-195) — the strategic buffer per supplier × material, per month of
// each festive window in its LTP, beside the LTP it is computed from and the
// baseline. Read only: nothing is ordered from it. Every figure is
// `strategicBufferRows`' (computed at read, so not stamped); none is computed
// here. Built on [Default C4], so the section says "Provisional" (design
// rule 5). The page's supplier and material filters narrow it.
// ─────────────────────────────────────────────────────────────────────────────

const dash = <span className="text-text-tertiary">—</span>;

/**
 * @param {{ readonly m: MonthLtp; readonly testId: string }} props
 * @returns {React.ReactElement}
 */
const LtpCell = ({ m, testId }) => {
  const { t } = useTranslation();
  if (m.qty === null)
    return (
      <span className="text-text-tertiary" data-testid={testId}>
        {t('buffers.strategic.noLtp')}
      </span>
    );
  return (
    <span data-testid={testId}>
      <Data>{qty(m.qty)}</Data>
      {m.partial ? (
        <span className="block text-xs text-text-tertiary" data-testid={`${testId}-partial`}>
          {t('buffers.strategic.partial', { covered: m.coveredDays, days: m.days })}
        </span>
      ) : null}
    </span>
  );
};

/**
 * @type {React.FC<{
 *   supplierId: string | null;
 *   materialCode: string | null;
 * }>}
 */
const StrategicBufferSection = ({ supplierId, materialCode }) => {
  const { t } = useTranslation();
  const linesQuery = useForecastCommitments();
  const inputsQuery = useStrategicBufferInputs();
  // PEX-D10 — LTP Festive − LTP A where a month has it; LTP − baseline (DRC-9a) elsewhere.
  const rows = useMemo(() => {
    const festive = new Map(
      (inputsQuery.data?.items ?? []).map((i) => [`${i.supplierId}|${i.materialCode}`, i.months])
    );
    return withFestiveBuffer(strategicBufferRows(linesQuery.data?.items ?? []), festive);
  }, [linesQuery.data, inputsQuery.data]);
  const shown = rows.filter(
    (r) =>
      (supplierId === null || r.supplierId === supplierId) &&
      (materialCode === null || r.materialCode === materialCode)
  );
  /** @param {StrategicBufferRow} r */
  const keyOf = (r) => `${r.supplierId}-${r.materialCode}`;
  const months = BUFFER_RULES.strategicBufferBaselineMonths;

  return (
    <section
      className="mt-6 bg-bg-surface border border-border-subtle rounded-lg shadow-sm"
      data-testid="strategic-buffer"
      aria-labelledby="strategic-buffer-title"
    >
      <div className="px-4 pt-3 pb-2">
        <h2 id="strategic-buffer-title" className="text-sm font-semibold text-text-primary">
          {t('buffers.strategic.title')}
        </h2>
        {/* Design rule 5 — a figure built on a [Default] says so, with its question. */}
        <p className="text-xs text-text-tertiary" data-testid="strategic-buffer-provisional">
          {t('buffers.provisional', { question: STRATEGIC_BUFFER_QUESTION })}
        </p>
        <p className="text-xs text-text-tertiary mt-1">
          {t('buffers.strategic.subtitle', { months })}
        </p>
        <p className="text-xs text-text-tertiary mt-1" data-testid="strategic-buffer-festive-note">
          {t('buffers.strategic.festiveNote')}
        </p>
        <p className="text-xs text-text-tertiary mt-1" data-testid="strategic-buffer-calendar">
          {t('buffers.strategic.calendarNote')}
        </p>
      </div>
      {linesQuery.isPending ? (
        <p className="px-4 pb-4 text-sm text-text-tertiary">{t('buffers.strategic.loading')}</p>
      ) : linesQuery.isError ? (
        <p className="px-4 pb-4 text-sm text-danger" role="alert">
          {t('buffers.strategic.error')}
        </p>
      ) : shown.length === 0 ? (
        <p className="px-4 pb-4 text-sm text-text-tertiary" data-testid="strategic-buffer-empty">
          {t('buffers.strategic.empty')}
        </p>
      ) : (
        <div className="relative w-full min-w-0 overflow-x-auto border-t border-border-subtle">
          <table className="w-full text-sm" data-testid="strategic-buffer-table">
            <thead>
              <tr className="text-label text-text-tertiary uppercase bg-bg-hover">
                <th className="text-left px-4 py-2">{t('buffers.strategic.col.supplier')}</th>
                <th className="text-left px-4 py-2">{t('buffers.strategic.col.material')}</th>
                <th className="text-left px-4 py-2">{t('buffers.strategic.col.month')}</th>
                <th className="text-right px-4 py-2">
                  <TermLabel term="monthLtp" />
                </th>
                <th className="text-right px-4 py-2">
                  <TermLabel term="strategicBaseline" />
                </th>
                <th className="text-right px-4 py-2">
                  <TermLabel term="strategicBuffer" />
                </th>
              </tr>
            </thead>
            <tbody>
              {shown.map((r) => {
                const head = (
                  <>
                    <td className="px-4 py-2 align-top text-text-primary">{r.supplierName}</td>
                    <td className="px-4 py-2 align-top">
                      <Data>{r.materialCode}</Data>
                      <span className="block text-xs text-text-tertiary">
                        {r.materialLabel}
                        {r.uom ? ` · ${r.uom}` : ''}
                      </span>
                    </td>
                  </>
                );
                if (r.windows.length === 0)
                  return (
                    <tr
                      key={keyOf(r)}
                      className="border-t border-border-subtle"
                      data-testid={`strategic-buffer-row-${keyOf(r)}`}
                    >
                      {head}
                      <td
                        colSpan={4}
                        className="px-4 py-2 text-text-tertiary"
                        data-testid={`strategic-buffer-none-${keyOf(r)}`}
                      >
                        {t('buffers.strategic.noWindow')}
                      </td>
                    </tr>
                  );
                return r.windows.map((w, wi) => {
                  const wKey = `${keyOf(r)}-${w.window.id}`;
                  return (
                    <Fragment key={wKey}>
                      <tr
                        className="border-t border-border-subtle"
                        data-testid={`strategic-buffer-row-${keyOf(r)}`}
                      >
                        {wi === 0 ? head : <td colSpan={2} />}
                        <td colSpan={4} className="px-4 pt-2 text-xs text-text-secondary">
                          <span data-testid={`strategic-buffer-window-${wKey}`}>
                            {t('buffers.strategic.window', {
                              year: w.window.id.slice(1),
                              start: formatDate(w.window.start),
                              eid: formatDate(w.window.eid)
                            })}
                          </span>
                          {w.status === 'baselineIncomplete' && (
                            <span
                              className="block text-warning-hover"
                              data-testid={`strategic-buffer-incomplete-${wKey}`}
                            >
                              {t('buffers.strategic.baselineIncomplete')}
                            </span>
                          )}
                        </td>
                      </tr>
                      {w.months.map((m) => {
                        const cellKey = `${wKey}-${m.month}`;
                        return (
                          <tr key={cellKey} data-testid={`strategic-buffer-month-${cellKey}`}>
                            <td colSpan={2} />
                            <td className="px-4 py-1">
                              <Data>{m.month}</Data>
                            </td>
                            <td className="px-4 py-1 text-right">
                              <LtpCell m={m} testId={`strategic-buffer-ltp-${cellKey}`} />
                            </td>
                            <td className="px-4 py-1 text-right">
                              <span
                                data-testid={`strategic-buffer-baseline-${cellKey}`}
                                title={t('buffers.strategic.baselineOf', {
                                  months: w.baselineMonths
                                    .map((b) => `${b.month} ${b.qty === null ? '—' : qty(b.qty)}`)
                                    .join(', ')
                                })}
                              >
                                {w.baseline === null ? dash : <Data>{qty(w.baseline)}</Data>}
                              </span>
                            </td>
                            <td className="px-4 py-1 text-right font-semibold">
                              <span
                                data-testid={`strategic-buffer-value-${cellKey}`}
                                data-source={m.source}
                              >
                                {m.buffer === null ? dash : <Data>{qty(m.buffer)}</Data>}
                              </span>
                              {m.source === 'festive' ? (
                                <span
                                  className="block text-xs font-normal text-text-tertiary"
                                  data-testid={`strategic-buffer-source-${cellKey}`}
                                >
                                  {t('buffers.strategic.fromFestive')}
                                </span>
                              ) : null}
                            </td>
                          </tr>
                        );
                      })}
                    </Fragment>
                  );
                });
              })}
            </tbody>
          </table>
        </div>
      )}
    </section>
  );
};

export default StrategicBufferSection;
