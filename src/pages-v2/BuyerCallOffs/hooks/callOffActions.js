/** @import { CallOffCommandVars, useCallOffCommand } from '@services/query/commandHooks' */
/** @import { useToast } from '@hooks/useToast' */
/** @import { useRefusalText } from '@hooks/useRefusalText' */
/** @import { CallOffView } from '@services/transitions/callOffRules' */
/** @import { CallOffForm, Panel, SeriesForm, SeriesRow, UmbrellaLine } from '../utils' */
import { refusedByPolicy } from '@services/transitions/refusalMessage';
import { POLICY_HOOKS } from '@services/transitions/policyHooks';
import { numberOf } from '../../callOffs/callOffDisplay';

/**
 * @typedef {object} CallOffActionsDeps
 * @property {(key: string, opts?: Record<string, unknown>) => string} t
 * @property {ReturnType<typeof useToast>['toast']} toast
 * @property {ReturnType<typeof useRefusalText>} refusalText
 * @property {ReturnType<typeof useCallOffCommand>} command
 * @property {readonly CallOffView[]} views
 * @property {UmbrellaLine | null} panelLine The umbrella line the new call-off / series panel is for.
 * @property {CallOffForm} form
 * @property {SeriesRow[]} seriesRows
 * @property {(f: CallOffForm) => void} setForm
 * @property {(s: SeriesForm) => void} setSeries
 * @property {(rows: SeriesRow[]) => void} setSeriesRows
 * @property {(p: Panel) => void} setPanel
 */

/**
 * The page's handlers: open a panel (resetting the forms), run one call-off
 * command with its toasts, create one call-off, and draft a previewed series.
 * A plain factory, not a hook: the page calls it on every render after its
 * loading and error returns, with its own state and setters, exactly where the
 * handlers were declared before. Moved out of `BuyerCallOffs.jsx` by the Phase
 * 5 page split (no behaviour change).
 * @param {CallOffActionsDeps} deps
 */
export function callOffActions({
  t,
  toast,
  refusalText,
  command,
  views,
  panelLine,
  form,
  seriesRows,
  setForm,
  setSeries,
  setSeriesRows,
  setPanel
}) {
  const resetForms = () => {
    setForm({ quantity: '', needDate: '', type: 'forecast', reason: '', comment: '' });
    setSeries({ total: '', perCallOff: '', cadence: 'weekly', firstDate: '' });
    setSeriesRows([]);
  };
  /** @param {Panel} next */
  const open = (next) => {
    resetForms();
    if (next?.kind === 'callOff') {
      const v = views.find((x) => x.callOff.id === next.id);
      if (v) {
        setForm({
          quantity: String(v.callOff.quantity),
          needDate: v.callOff.needDate,
          type: v.callOff.type,
          reason: '',
          comment: ''
        });
      }
    }
    setPanel(next);
  };

  /**
   * @param {CallOffCommandVars} vars
   * @param {string} success
   * @returns {Promise<boolean>}
   */
  const run = async (vars, success, close = true) => {
    try {
      const res = await command.mutateAsync(vars);
      if (res.status === 'failed') {
        // X-03 — the engine-data refusal is said in the reader's language, not as the hook's own text.
        const description = refusedByPolicy(res.reason, POLICY_HOOKS.CALLOFF_ENGINE_DATA_LIVE)
          ? t('co.refusal.engineDataSimulated')
          : (refusalText(res.reason) ?? res.reason ?? '');
        toast({ variant: 'warning', title: t('co.toast.refused'), description });
        return false;
      }
      toast({ variant: 'success', title: success });
      if (close) setPanel(null);
      return true;
    } catch {
      toast({ variant: 'error', title: t('co.toast.refused') });
      return false;
    }
  };

  /** @param {'release' | 'draft'} verb */
  const createOne = (verb) => {
    if (!panelLine) return;
    void run(
      {
        verb,
        poId: panelLine.po.id,
        poLineId: panelLine.line.id,
        quantity: numberOf(form.quantity),
        needDate: form.needDate,
        type: form.type
      },
      t(verb === 'release' ? 'co.toast.released' : 'co.toast.drafted')
    );
  };

  const createSeries = async () => {
    if (!panelLine) return;
    let created = 0;
    for (const row of seriesRows) {
      const ok = await run(
        {
          verb: 'draft',
          poId: panelLine.po.id,
          poLineId: panelLine.line.id,
          quantity: numberOf(row.quantity),
          needDate: row.date,
          type: form.type
        },
        t('co.toast.drafted'),
        false
      );
      if (!ok) break;
      created += 1;
    }
    if (created === seriesRows.length) {
      toast({ variant: 'success', title: t('co.toast.seriesCreated', { count: created }) });
      setPanel(null);
    }
  };

  return { open, run, createOne, createSeries };
}
