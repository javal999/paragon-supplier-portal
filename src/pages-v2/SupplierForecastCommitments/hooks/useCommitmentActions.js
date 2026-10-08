import { useTranslation } from 'react-i18next';
import { useToast } from '@hooks/useToast';
/** @import React from 'react' */
/** @import { ForecastCommitmentLine } from '@services/data/types' */
/** @import { ForecastRun, PeriodRow, ReadRow, RowDraft, WeekReason } from '../const' */
import { lineRef } from '../../forecasts/forecastDisplay';

/**
 * The page's three commitment acts: a row's Save draft (`commitRow`), a
 * Forecast-zone row's Acknowledge, and BL-133's Submit all for one period,
 * which sends the period's pending lines one by one and stops at the first
 * refusal with a partial-count toast. A landed commit drops its row's draft;
 * a finished Submit all also drops the period's reason.
 * @param {object} args
 * @param {ForecastRun} args.run  The forecast runner.
 * @param {(l: ForecastCommitmentLine) => ReadRow} args.readRow  A row's parsed draft.
 * @param {React.Dispatch<React.SetStateAction<Record<string, RowDraft>>>} args.setDrafts
 * @param {React.Dispatch<React.SetStateAction<Record<string, WeekReason>>>} args.setWeekReasons
 */
export function useCommitmentActions({ run, readRow, setDrafts, setWeekReasons }) {
  const { t } = useTranslation();
  const { toast } = useToast();

  /**
   * @param {ForecastCommitmentLine} l
   * @param {boolean} draftOnly
   */
  const commitRow = async (l, draftOnly) => {
    const { d, qtyValue, upsideValue } = readRow(l);
    if (qtyValue === null) return;
    const res = await run(
      {
        verb: 'commit',
        line: lineRef(l),
        committedQty: qtyValue,
        commitmentDate: d.date,
        ...(upsideValue !== null ? { upsideQty: upsideValue } : {}),
        ...(qtyValue < l.forecastQty && d.reason
          ? { reason: d.reason, ...(d.note.trim() ? { note: d.note.trim() } : {}) }
          : {}),
        draftOnly
      },
      t(draftOnly ? 'fc.sup.toast.drafted' : 'fc.sup.toast.submitted')
    );
    if (res.ok)
      setDrafts((prev) => Object.fromEntries(Object.entries(prev).filter(([k]) => k !== l.key)));
  };

  /** @param {ForecastCommitmentLine} l */
  const acknowledge = (l) =>
    void run({ verb: 'acknowledge', line: lineRef(l) }, t('fc.sup.toast.acknowledged'));

  /** @param {PeriodRow} row */
  const submitAll = async (row) => {
    let done = 0;
    for (const l of row.pending) {
      const { d, qtyValue, upsideValue } = readRow(l);
      if (qtyValue === null) continue;
      const rc = row.rootFor(l);
      const res = await run({
        verb: 'commit',
        line: lineRef(l),
        committedQty: qtyValue,
        commitmentDate: d.date,
        ...(upsideValue !== null ? { upsideQty: upsideValue } : {}),
        ...(rc ? { reason: rc.level1, ...(rc.note.trim() ? { note: rc.note.trim() } : {}) } : {})
      });
      if (!res.ok) {
        toast({
          variant: 'warning',
          title: t('fc.toast.refused'),
          description: t('fc.sup.week.toast.partial', {
            done,
            total: row.pending.length,
            reason: res.reason ?? ''
          })
        });
        return;
      }
      done += 1;
      setDrafts((prev) => Object.fromEntries(Object.entries(prev).filter(([k]) => k !== l.key)));
    }
    setWeekReasons((prev) =>
      Object.fromEntries(Object.entries(prev).filter(([k]) => k !== row.bucket))
    );
    toast({ variant: 'success', title: t('fc.sup.week.toast.submitted', { count: done }) });
  };

  return { commitRow, acknowledge, submitAll };
}
