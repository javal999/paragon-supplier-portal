/** @import React from 'react' */
import { Fragment, useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import TermLabel from '@components/ui-v2/TermLabel';
import Data from '@components/ui-v2/Data';
import { useForecastCommitments, useProtectionBufferInputs } from '@services/query/hooks';
import {
  PROTECTION_BUFFER_DEFAULTS,
  PROTECTION_BUFFER_QUESTION,
  PROTECTION_BUFFER_RULES,
  protectionBufferRows
} from '@services/transitions/drcBufferRules';
import { provisionalBasis } from '@components/forecast/provisionalBasis';
/** @import { ProtectionBufferRow, ProtectionBufferRules, ProtectionMonth } from '@services/transitions/drcBufferRules' */
import { qty } from './inventoryDisplay';

// ─────────────────────────────────────────────────────────────────────────────
// DRC-9c (BL-205) [Proposed] — the protection buffer per supplier × material
// per LTP month, for materials at OSIP level 5, 6 or 7, beside the strategic
// buffer. Read only: nothing is ordered from it and ROP Fisik / Max do not
// include it. Every figure is `protectionBufferRows`' (computed at read, so not
// stamped); none is computed here. The rule awaits owner review (C3), so the
// section says "Proposed"; it also rests on [Default C2] (level) and the MPQ
// default, so it says "Provisional" too (design rule 5), the MPQ default as
// words, not as a question ID (U-15, BL-262). The page's supplier and material
// filters narrow it.
// ─────────────────────────────────────────────────────────────────────────────

const dash = <span className="text-text-tertiary">—</span>;

/**
 * @param {{ readonly m: ProtectionMonth; readonly testId: string }} props
 * @returns {React.ReactElement}
 */
const BufferCell = ({ m, testId }) => {
  const { t } = useTranslation();
  if (m.status === 'baselineIncomplete')
    return (
      <span className="text-xs text-text-tertiary" data-testid={testId}>
        {t('buffers.protection.baselineIncomplete')}
      </span>
    );
  if (m.status === 'noMpq')
    return (
      <span className="text-xs text-text-tertiary" data-testid={testId}>
        {t('buffers.protection.noMpq')}
      </span>
    );
  return (
    <span data-testid={testId}>{m.buffer === null ? dash : <Data>{qty(m.buffer)}</Data>}</span>
  );
};

/**
 * @type {React.FC<{
 *   supplierId: string | null;
 *   materialCode: string | null;
 *   rules?: ProtectionBufferRules;
 * }>}
 */
const ProtectionBufferSection = ({ supplierId, materialCode, rules = PROTECTION_BUFFER_RULES }) => {
  const { t } = useTranslation();
  const linesQuery = useForecastCommitments();
  const inputsQuery = useProtectionBufferInputs();
  const rows = useMemo(
    () =>
      protectionBufferRows(linesQuery.data?.items ?? [], inputsQuery.data?.items ?? [], { rules }),
    [linesQuery.data, inputsQuery.data, rules]
  );
  const shown = rows.filter(
    (r) =>
      (supplierId === null || r.supplierId === supplierId) &&
      (materialCode === null || r.materialCode === materialCode)
  );
  /** @param {ProtectionBufferRow} r */
  const keyOf = (r) => `${r.supplierId}-${r.materialCode}`;
  const off = rules.protectionUplift === 'off';

  return (
    <section
      className="mt-6 bg-bg-surface border border-border-subtle rounded-lg shadow-sm"
      data-testid="protection-buffer"
      aria-labelledby="protection-buffer-title"
    >
      <div className="px-4 pt-3 pb-2">
        <h2 id="protection-buffer-title" className="text-sm font-semibold text-text-primary">
          {t('buffers.protection.title')}
        </h2>
        {/* BL-205 — the whole rule awaits the owner (C3). */}
        <p className="text-xs text-warning-hover" data-testid="protection-buffer-proposed">
          {t('buffers.proposed', { question: PROTECTION_BUFFER_QUESTION })}
        </p>
        {/* Design rule 5 — the level and MPQ it reads are [Default]s. */}
        <p className="text-xs text-text-tertiary" data-testid="protection-buffer-provisional">
          {t('buffers.provisional', { question: provisionalBasis(PROTECTION_BUFFER_DEFAULTS, t) })}
        </p>
        <p className="text-xs text-text-tertiary mt-1">
          {t('buffers.protection.subtitle', { months: rules.baselineMonths })}
        </p>
        {/* MoM 3 — anticipatory stock, planned to be absorbed. */}
        <p className="text-xs text-text-secondary mt-1" data-testid="protection-buffer-absorbed">
          {t('buffers.protection.absorbed')}
        </p>
      </div>
      {off ? (
        <p className="px-4 pb-4 text-sm text-text-tertiary" data-testid="protection-buffer-off">
          {t('buffers.protection.switchedOff')}
        </p>
      ) : linesQuery.isPending || inputsQuery.isPending ? (
        <p className="px-4 pb-4 text-sm text-text-tertiary">{t('buffers.protection.loading')}</p>
      ) : linesQuery.isError || inputsQuery.isError ? (
        <p className="px-4 pb-4 text-sm text-danger" role="alert">
          {t('buffers.protection.error')}
        </p>
      ) : shown.length === 0 ? (
        <p className="px-4 pb-4 text-sm text-text-tertiary" data-testid="protection-buffer-empty">
          {t('buffers.protection.empty')}
        </p>
      ) : (
        <div className="relative w-full min-w-0 overflow-x-auto border-t border-border-subtle">
          <table className="w-full text-sm" data-testid="protection-buffer-table">
            <thead>
              <tr className="text-label text-text-tertiary uppercase bg-bg-hover">
                <th className="text-left px-4 py-2">{t('buffers.protection.col.supplier')}</th>
                <th className="text-left px-4 py-2">{t('buffers.protection.col.material')}</th>
                <th className="text-left px-4 py-2">
                  <TermLabel term="osipLevel" />
                </th>
                <th className="text-left px-4 py-2">{t('buffers.protection.col.month')}</th>
                <th className="text-right px-4 py-2">
                  <TermLabel term="monthLtp" />
                </th>
                <th className="text-right px-4 py-2">
                  <TermLabel term="protectionBaseline" />
                </th>
                <th className="text-right px-4 py-2">
                  <TermLabel term="uplift" />
                </th>
                <th className="text-right px-4 py-2">
                  <TermLabel term="protectionBuffer" />
                </th>
              </tr>
            </thead>
            <tbody>
              {shown.map((r) => {
                const k = keyOf(r);
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
                    <td
                      className="px-4 py-2 align-top"
                      data-testid={`protection-buffer-level-${k}`}
                    >
                      {r.levelSource === 'default'
                        ? t('buffers.protection.levelDefault', { level: r.level })
                        : t('buffers.protection.level', { level: r.level })}
                      {r.applies ? (
                        <span
                          className="block text-xs text-text-tertiary"
                          data-testid={`protection-buffer-mpq-${k}`}
                        >
                          {r.mpq === null
                            ? t('buffers.protection.noMpq')
                            : t('buffers.protection.mpq', { mpq: qty(r.mpq) })}
                        </span>
                      ) : null}
                    </td>
                  </>
                );
                if (!r.applies)
                  return (
                    <tr
                      key={k}
                      className="border-t border-border-subtle"
                      data-testid={`protection-buffer-row-${k}`}
                    >
                      {head}
                      <td
                        colSpan={5}
                        className="px-4 py-2 text-text-tertiary"
                        data-testid={`protection-buffer-none-${k}`}
                      >
                        {t(`buffers.protection.reason.${r.reason}`, { level: r.level })}
                      </td>
                    </tr>
                  );
                return (
                  <Fragment key={k}>
                    {r.months.map((m, mi) => {
                      const cellKey = `${k}-${m.month}`;
                      return (
                        <tr
                          key={cellKey}
                          className={mi === 0 ? 'border-t border-border-subtle' : undefined}
                          data-testid={
                            mi === 0
                              ? `protection-buffer-row-${k}`
                              : `protection-buffer-month-${cellKey}`
                          }
                        >
                          {mi === 0 ? head : <td colSpan={3} />}
                          <td className="px-4 py-1">
                            <Data>{m.month}</Data>
                          </td>
                          <td className="px-4 py-1 text-right">
                            <span data-testid={`protection-buffer-ltp-${cellKey}`}>
                              {m.qty === null ? dash : <Data>{qty(m.qty)}</Data>}
                            </span>
                          </td>
                          <td className="px-4 py-1 text-right">
                            <span data-testid={`protection-buffer-baseline-${cellKey}`}>
                              {m.baseline === null ? dash : <Data>{qty(m.baseline)}</Data>}
                            </span>
                          </td>
                          <td className="px-4 py-1 text-right">
                            <span data-testid={`protection-buffer-uplift-${cellKey}`}>
                              {m.uplift === null ? dash : <Data>{qty(m.uplift)}</Data>}
                            </span>
                          </td>
                          <td className="px-4 py-1 text-right font-semibold">
                            <BufferCell m={m} testId={`protection-buffer-value-${cellKey}`} />
                          </td>
                        </tr>
                      );
                    })}
                  </Fragment>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </section>
  );
};

export default ProtectionBufferSection;
