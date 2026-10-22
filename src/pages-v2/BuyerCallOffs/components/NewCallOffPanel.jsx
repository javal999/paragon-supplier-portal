/** @import React from 'react' */
/** @import { CallOffType, POLineItem } from '@services/data/types' */
/** @import { ReleaseCheck } from '@services/transitions/callOffRules' */
/** @import { CallOffForm, Panel, SeriesForm, SeriesRow, UmbrellaLine } from '../utils' */
import { useTranslation } from 'react-i18next';
import Button from '@components/ui-v2/Button';
import SidePanel from '@components/ui-v2/SidePanel';
import { formatIDR } from '@lib/format';
import { CALL_OFF_TYPES } from '@services/transitions/callOffRules';
import { callOffTolerance } from '@services/transitions/callOffTolerance';
import { inputClass, labelClass, qty } from '../../callOffs/callOffDisplay';
import ExceedsNotice from './ExceedsNotice';
import SeriesFields from './SeriesFields';

/**
 * @typedef {object} NewCallOffPanelProps
 * @property {Panel} panel Which panel is open: `new` or `series` shows this one.
 * @property {UmbrellaLine | null} panelLine The umbrella line the panel is for; `null` keeps the panel closed.
 * @property {() => void} onClose
 * @property {boolean} planHeld Whether the seat holds `calloff:plan`; otherwise the footer has no actions.
 * @property {boolean} busy A call-off command is in flight.
 * @property {CallOffForm} form The call-off form (page state, so the highlight and prefill links can fill it).
 * @property {(f: CallOffForm) => void} setForm
 * @property {SeriesForm} series
 * @property {(s: SeriesForm) => void} setSeries
 * @property {SeriesRow[]} seriesRows
 * @property {(rows: SeriesRow[]) => void} setSeriesRows
 * @property {string} today The earliest need date (`min`).
 * @property {() => void} previewSeries
 * @property {() => Promise<void>} createSeries Drafts every previewed row, in order.
 * @property {(verb: 'release' | 'draft') => void} createOne Saves the new call-off as a draft or releases it.
 * @property {(line: POLineItem, excludeId?: string) => ReleaseCheck | null} formRelease The release check at the form's quantity (CR-04 / BL-49).
 */

/**
 * REQ-E09-01 — the side panel that creates call-offs on one umbrella line:
 * one call-off (save as draft or release, checked against what remains) or a
 * series of drafts. Moved out of `BuyerCallOffs.jsx` by the Phase 5 page split
 * (no behaviour change).
 * @type {React.FC<NewCallOffPanelProps>}
 */
const NewCallOffPanel = ({
  panel,
  panelLine,
  onClose,
  planHeld,
  busy,
  form,
  setForm,
  series,
  setSeries,
  seriesRows,
  setSeriesRows,
  today,
  previewSeries,
  createSeries,
  createOne,
  formRelease
}) => {
  const { t } = useTranslation();
  return (
    <SidePanel
      open={panelLine !== null}
      onClose={onClose}
      title={
        panelLine
          ? t(panel?.kind === 'series' ? 'co.series.title' : 'co.new.title', {
              poNumber: panelLine.po.poNumber
            })
          : ''
      }
      footerActions={
        panelLine && planHeld ? (
          panel?.kind === 'series' ? (
            <Button
              variant="outline"
              disabled={busy || seriesRows.length === 0}
              onClick={() => void createSeries()}
            >
              {t('co.series.create', { count: seriesRows.length })}
            </Button>
          ) : (
            <>
              <Button variant="secondary" disabled={busy} onClick={() => createOne('draft')}>
                {t('co.new.saveDraft')}
              </Button>
              <Button
                variant="outline"
                disabled={busy || (formRelease(panelLine.line)?.exceeds ?? false)}
                onClick={() => createOne('release')}
              >
                {t('co.new.release')}
              </Button>
            </>
          )
        ) : undefined
      }
    >
      {panelLine && (
        <div className="space-y-4">
          {/* BL-49 — what the release will be checked against, said before the
                planner types a quantity. */}
          <p className="text-sm text-text-secondary" data-testid="calloff-new-remaining">
            {panelLine.remaining.remainingQty === null
              ? t('co.new.remainingValue', {
                  value: formatIDR(panelLine.remaining.remainingValue)
                })
              : t('co.new.remaining', {
                  quantity: qty(panelLine.remaining.remainingQty),
                  uom: panelLine.line.uom,
                  value: formatIDR(panelLine.remaining.remainingValue)
                })}
          </p>
          <div>
            <label htmlFor="co-type" className={labelClass}>
              {t('co.field.type')}
            </label>
            <select
              id="co-type"
              className={inputClass}
              value={form.type}
              onChange={(e) =>
                setForm({ ...form, type: /** @type {CallOffType} */ (e.target.value) })
              }
            >
              {CALL_OFF_TYPES.map((ty) => (
                <option key={ty} value={ty}>
                  {t(`co.type.${ty}`)}
                </option>
              ))}
            </select>
            <p className="mt-1 text-xs text-text-tertiary">
              {t(`co.type.hint.${form.type}`, { pct: callOffTolerance().overPct })}
            </p>
          </div>
          {panel?.kind === 'new' ? (
            <>
              <div>
                <label htmlFor="co-qty" className={labelClass}>
                  {t('co.field.quantity', { uom: panelLine.line.uom })}
                </label>
                <input
                  id="co-qty"
                  inputMode="numeric"
                  className={inputClass}
                  value={form.quantity}
                  onChange={(e) => setForm({ ...form, quantity: e.target.value })}
                />
                <ExceedsNotice
                  check={formRelease(panelLine.line)}
                  uom={panelLine.line.uom}
                  testId="calloff-exceeds-remaining"
                />
              </div>
              <div>
                <label htmlFor="co-date" className={labelClass}>
                  {t('co.field.needDate')}
                </label>
                <input
                  id="co-date"
                  type="date"
                  min={today}
                  className={inputClass}
                  value={form.needDate}
                  onChange={(e) => setForm({ ...form, needDate: e.target.value })}
                />
              </div>
            </>
          ) : (
            <SeriesFields
              series={series}
              setSeries={setSeries}
              seriesRows={seriesRows}
              setSeriesRows={setSeriesRows}
              today={today}
              previewSeries={previewSeries}
            />
          )}
        </div>
      )}
    </SidePanel>
  );
};

export default NewCallOffPanel;
