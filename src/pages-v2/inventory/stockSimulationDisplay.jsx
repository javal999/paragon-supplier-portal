/** @import React from 'react' */
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import Button from '@components/ui-v2/Button';
import Data from '@components/ui-v2/Data';
import StatusPill from '@components/ui-v2/StatusPill';
import { HandoffNotice } from '@components/ui-v2/HandoffNotice';
import { useToast } from '@hooks/useToast';
import { useVerbAvailability } from '@hooks/useVerbAvailability';
import { formatDate, formatDateTime, formatIDR } from '@lib/format';
import { useSimulationOverrideSet } from '@services/query/commandHooks';
/** @import { CallOff, PurchaseOrder, SimulationOverrideField, StockSimulationRow } from '@services/data/types' */
/** @import { UmbrellaRemaining } from '@services/transitions/callOffRules' */
import { CALL_OFF_PO_STATES, umbrellaRemaining } from '@services/transitions/callOffRules';
/** @import { PlannerInputRef, SimulationComponent, SimulationFlag, SimulationOverrideRefusal, StockSimulation } from '@services/transitions/simulateSupplierStock' */
import {
  SIMULATION_OVERRIDE_FIELDS,
  simulationOverrideRefusal
} from '@services/transitions/simulateSupplierStock';
import { inputClass, labelClass, qty } from './inventoryDisplay';
import TermLabel from '@components/ui-v2/TermLabel';

// ─────────────────────────────────────────────────────────────────────────────
// Material E2 · the stock simulation page's parts (MR-7 steps 3 to 5): the
// planner-input label, the flags, the figures' components, the 13 weekly
// buckets and the inline planner-input form. The form dispatches E1's verb
// through `useSimulationOverrideSet`, after the same pre-check the verb's
// policy hook runs (`simulationOverrideRefusal`, MAT-R2).
// ─────────────────────────────────────────────────────────────────────────────

/** The atom that lets a seat enter a planner input (E1, `planning`). */
export const SIMULATE_ATOM = 'inventory:simulate';

/**
 * A flag that points at a missing figure the planner can enter (MR-7 step 5).
 * @type {Partial<Record<SimulationFlag['code'], SimulationOverrideField>>}
 */
export const FLAG_INPUT = {
  noStockUpdate: 'soh',
  productionDateMissing: 'inProduction',
  etaMissing: 'toDistributor'
};

// ── P-06 · the action that fits the pair ─────────────────────────────────────

/**
 * The supplier's agreement line for a material, by the rule the call-off page
 * uses for "Create call-off" (`BuyerCallOffs`' prefill): an open PO
 * (`CALL_OFF_PO_STATES`) of this supplier with a line for this material, the
 * one with the most left to release. `line`: that line has quantity (or value)
 * left; `exhausted`: it has none left; `none`: there is no such line, which is
 * when the call-off page says "No agreement line".
 *
 * @typedef {| { readonly state: 'line'; readonly poNumber: string; readonly remaining: UmbrellaRemaining }
 *   | { readonly state: 'exhausted'; readonly poNumber: string; readonly remaining: UmbrellaRemaining }
 *   | { readonly state: 'none' }} AgreementLine
 */

/**
 * @param {readonly PurchaseOrder[]} pos
 * @param {readonly CallOff[]} callOffs
 * @param {string} supplierId
 * @param {string} materialCode
 * @returns {AgreementLine}
 */
export function agreementLineFor(pos, callOffs, supplierId, materialCode) {
  const lines = pos
    .filter((po) => po.supplierId === supplierId && CALL_OFF_PO_STATES.includes(po.status))
    .flatMap((po) =>
      po.lineItems
        .filter((line) => line.materialCode === materialCode)
        .map((line) => ({ po, remaining: umbrellaRemaining(line, callOffs) }))
    )
    .sort((a, b) => (b.remaining.remainingQty ?? 0) - (a.remaining.remainingQty ?? 0));
  const first = lines[0];
  if (!first) return { state: 'none' };
  const left =
    first.remaining.basis === 'quantity'
      ? (first.remaining.remainingQty ?? 0)
      : first.remaining.remainingValue;
  return {
    state: left > 0 ? 'line' : 'exhausted',
    poNumber: first.po.poNumber,
    remaining: first.remaining
  };
}

/**
 * P-06 — "70,000 PCS left on PO-…" under "Create call-off", in the line's own basis.
 * @param {(k: string, o?: Record<string, unknown>) => string} t
 * @param {{ poNumber: string; remaining: UmbrellaRemaining }} line
 * @param {string} uom
 * @returns {string}
 */
export const lineLeftText = (t, line, uom) =>
  line.remaining.basis === 'quantity'
    ? t('sim.action.lineLeft', {
        qty: qty(line.remaining.remainingQty ?? 0),
        uom,
        po: line.poNumber
      })
    : t('sim.action.lineLeftValue', {
        value: formatIDR(line.remaining.remainingValue),
        po: line.poNumber
      });

/**
 * P-05 — a negative "Free to call off" is a state: PTI has called off more
 * than the supplier holds. Zero and positive read as figures, as before.
 * @param {Pick<StockSimulation, 'freeToCallOff'> | null} sim
 * @returns {boolean}
 */
export const isOverCalled = (sim) => !!sim && sim.freeToCallOff !== null && sim.freeToCallOff < 0;

/**
 * P-05 — the Free to call off cell: the figure, or "Over-called by N UOM" in red.
 * @type {React.FC<{ value: number; uom: string; testId?: string }>}
 */
export const FreeCell = ({ value, uom, testId }) => {
  const { t } = useTranslation();
  return value < 0 ? (
    <span className="text-danger font-semibold" data-testid={testId}>
      {t('sim.overCalled')}{' '}
      <Data className="text-danger font-semibold">{`${qty(-value)} ${uom}`}</Data>
    </span>
  ) : (
    <QtyCell value={value} uom={uom} strong testId={testId} />
  );
};

/**
 * "Planner input · <who> · <when>" (MR-7 AC-03).
 * @type {React.FC<{ input: PlannerInputRef; testId?: string }>}
 */
export const PlannerInputLabel = ({ input, testId }) => {
  const { t } = useTranslation();
  const who =
    input.enteredBy.kind === 'RESOLVED'
      ? input.enteredBy.person.displayName
      : t('sim.input.unattributed');
  return (
    <div className="text-[length:var(--fs-label-3)] text-text-secondary" data-testid={testId}>
      {t('sim.input.label', { who, when: formatDateTime(input.enteredAt) })}
    </div>
  );
};

/**
 * One quantity cell.
 * @type {React.FC<{ value: number; uom: string; strong?: boolean; testId?: string }>}
 */
export const QtyCell = ({ value, uom, strong, testId }) => (
  <Data className={strong ? 'font-semibold' : undefined} data-testid={testId}>
    {`${qty(value)} ${uom}`}
  </Data>
);

/**
 * @param {(k: string, o?: Record<string, unknown>) => string} t
 * @param {SimulationFlag} f
 * @returns {string}
 */
const flagText = (t, f) =>
  f.code === 'noCapacityConfirmed'
    ? t('sim.flag.noCapacityConfirmed', { week: f.week ? formatDate(f.week) : '' })
    : t(`sim.flag.${f.code}`);

/**
 * The row's flags, one pill per code; a missing figure opens its input when the seat may enter one.
 * @type {React.FC<{ flags: readonly SimulationFlag[]; canInput: boolean; onInput: (field: SimulationOverrideField) => void; testId: string; }>}
 */
export const FlagList = ({ flags, canInput, onInput, testId }) => {
  const { t } = useTranslation();
  const seen = /** @type {Set<string>} */ (new Set());
  const shown = flags.filter((f) => {
    const k = f.code === 'noCapacityConfirmed' ? `${f.code}|${f.week ?? ''}` : f.code;
    if (seen.has(k)) return false;
    seen.add(k);
    return true;
  });
  if (shown.length === 0) return <span className="text-xs text-text-tertiary">—</span>;
  return (
    <div className="flex flex-wrap gap-1" data-testid={testId}>
      {shown.map((f) => {
        const field = FLAG_INPUT[f.code];
        const key = `${f.code}-${f.week ?? ''}`;
        return canInput && field ? (
          <button
            key={key}
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              onInput(field);
            }}
            className="rounded-sm focus-visible:outline focus-visible:outline-2 focus-visible:outline-action"
            data-testid={`${testId}-${f.code}`}
          >
            <StatusPill variant="warning">{flagText(t, f)}</StatusPill>
          </button>
        ) : (
          <span key={key} data-testid={`${testId}-${f.code}`}>
            <StatusPill variant={f.code === 'cappedByCapacity' ? 'info' : 'warning'}>
              {flagText(t, f)}
            </StatusPill>
          </span>
        );
      })}
    </div>
  );
};

/**
 * @param {(k: string, o?: Record<string, unknown>) => string} t
 * @param {SimulationComponent} c
 * @returns {string}
 */
const eventText = (t, c) => t(`sim.event.${c.kind}`);

/**
 * One component or event line: what, how much, when, and whose figure it is.
 * @type {React.FC<{ c: SimulationComponent; uom: string }>}
 */
const ComponentLine = ({ c, uom }) => {
  const { t } = useTranslation();
  return (
    <li className="py-1 flex flex-wrap items-baseline gap-x-3 gap-y-0.5 text-xs">
      <span className="text-text-secondary min-w-[160px]">{eventText(t, c)}</span>
      <Data>{`${c.qty > 0 && c.kind !== 'soh' && c.figure === 'available' ? '+' : ''}${qty(c.qty)} ${uom}`}</Data>
      {c.uncappedQty !== undefined ? (
        <span className="text-text-tertiary">
          {t('sim.event.uncapped', { qty: qty(c.uncappedQty) })}
        </span>
      ) : null}
      {c.date ? <Data className="text-text-secondary">{formatDate(c.date)}</Data> : null}
      {c.reference ? <Data className="text-text-tertiary">{c.reference}</Data> : null}
      {c.dispatchOnly && c.kind === 'ptiInbound' ? (
        <StatusPill variant="neutral">{t('sim.event.dispatchOnly')}</StatusPill>
      ) : null}
      {c.etaBasis && c.etaBasis !== 'eta' ? (
        <span className="text-text-tertiary">{t(`sim.eta.${c.etaBasis}`)}</span>
      ) : null}
      {c.plannerInput ? <PlannerInputLabel input={c.plannerInput} /> : null}
    </li>
  );
};

/**
 * The weekly buckets: the 2 figures at week end, and the events inside the week (MR-7 step 4).
 * @type {React.FC<{ sim: StockSimulation; uom: string; testId: string }>}
 */
const WeeklyTable = ({ sim, uom, testId }) => {
  const { t } = useTranslation();
  return (
    <table className="w-full text-xs" data-testid={testId}>
      <thead>
        <tr className="text-left text-text-tertiary">
          <th scope="col" className="py-1 pr-3 font-medium sticky left-0 z-[1] bg-bg-surface">
            {t('sim.detail.week')}
          </th>
          <th scope="col" className="py-1 pr-3 font-medium text-right">
            <TermLabel term="supplierAvailable" />
          </th>
          <th scope="col" className="py-1 pr-3 font-medium text-right">
            <TermLabel term="freeToCallOff" />
          </th>
          <th scope="col" className="py-1 pr-3 font-medium text-right">
            <TermLabel term="ptiInbound" />
          </th>
          <th scope="col" className="py-1 font-medium">
            {t('sim.detail.events')}
          </th>
        </tr>
      </thead>
      <tbody>
        {sim.weekly.map((w) => (
          <tr key={w.weekStart} className="border-t border-border-subtle align-top">
            <td className="py-1 pr-3 whitespace-nowrap sticky left-0 z-[1] bg-bg-surface">
              <Data>{`${formatDate(w.weekStart)} – ${formatDate(w.weekEnd)}`}</Data>
            </td>
            <td className="py-1 pr-3 text-right">
              {w.available === null ? t('sim.missing') : <Data>{qty(w.available)}</Data>}
            </td>
            <td className="py-1 pr-3 text-right">
              {w.freeToCallOff === null ? t('sim.missing') : <Data>{qty(w.freeToCallOff)}</Data>}
            </td>
            <td className="py-1 pr-3 text-right border-l border-border-subtle pl-3">
              <Data>{qty(w.ptiInbound)}</Data>
            </td>
            <td className="py-1">
              {w.events.length === 0 ? (
                <span className="text-text-tertiary">{t('sim.detail.noEvents')}</span>
              ) : (
                <ul>
                  {w.events.map((c) => (
                    <ComponentLine
                      key={`${c.kind}-${c.reference ?? ''}-${c.date ?? ''}`}
                      c={c}
                      uom={uom}
                    />
                  ))}
                </ul>
              )}
            </td>
          </tr>
        ))}
      </tbody>
    </table>
  );
};

/** @type {readonly SimulationOverrideRefusal[]} */
const REFUSAL_CODES = [
  'UNKNOWN_SUPPLIER',
  'UNKNOWN_MATERIAL',
  'UNKNOWN_FIELD',
  'INVALID_QUANTITY',
  'DATE_REQUIRED',
  'INVALID_DATE',
  'DATE_NOT_ALLOWED'
];

/**
 * The inline planner-input form: one field, its quantity and (except SOH) its date.
 * @type {React.FC<{ row: StockSimulationRow; field: SimulationOverrideField; onClose: () => void; }>}
 */
export const PlannerInputForm = ({ row, field, onClose }) => {
  const { t } = useTranslation();
  const { toast } = useToast();
  const set = useSimulationOverrideSet();
  const [value, setValue] = useState('');
  const [date, setDate] = useState('');
  const [refusal, setRefusal] = useState(/** @type {SimulationOverrideRefusal | null} */ (null));
  const idBase = `sim-input-${row.supplierId}-${row.materialCode}-${field}`;

  const save = async () => {
    const payload = {
      supplierId: row.supplierId,
      materialCode: row.materialCode,
      field,
      value: value.trim() === '' ? Number.NaN : Number(value),
      ...(field === 'soh' ? {} : { date })
    };
    // MAT-R2 — the rule the verb's policy hook runs; the row came from the read, so both are known.
    const pre = simulationOverrideRefusal(payload, {
      supplierKnown: () => true,
      materialKnown: () => true
    });
    setRefusal(pre);
    if (pre) return;
    const res = await set.mutateAsync({ ...payload, ...(field === 'soh' ? {} : { date }) });
    if (res.status === 'failed') {
      const code = REFUSAL_CODES.find((c) => (res.reason ?? '').includes(c)) ?? null;
      setRefusal(code);
      toast({
        variant: 'warning',
        title: t('sim.input.refused'),
        description: code ? t(`sim.input.refusal.${code}`) : (res.reason ?? '')
      });
      return;
    }
    toast({ variant: 'success', title: t('sim.input.saved') });
    onClose();
  };

  return (
    <div
      className="mt-2 rounded-md border border-border-subtle bg-bg-surface p-3 space-y-2"
      data-testid={`${idBase}-form`}
    >
      <div className="flex flex-wrap items-end gap-3">
        <div>
          <label htmlFor={`${idBase}-qty`} className={labelClass}>
            {t('sim.input.qty', { uom: row.uom })}
          </label>
          <input
            id={`${idBase}-qty`}
            type="text"
            inputMode="decimal"
            className={inputClass}
            value={value}
            onChange={(e) => setValue(e.target.value)}
          />
        </div>
        {field === 'soh' ? null : (
          <div>
            <label htmlFor={`${idBase}-date`} className={labelClass}>
              {t(`sim.input.date.${field}`)}
            </label>
            <input
              id={`${idBase}-date`}
              type="date"
              className={inputClass}
              value={date}
              onChange={(e) => setDate(e.target.value)}
            />
          </div>
        )}
        <Button
          variant="outline"
          disabled={set.isPending}
          onClick={() => void save()}
          data-testid={`${idBase}-save`}
        >
          {t('sim.input.save')}
        </Button>
        <Button variant="secondary" onClick={onClose}>
          {t('sim.input.cancel')}
        </Button>
      </div>
      {refusal ? (
        <p role="alert" className="text-xs text-danger" data-testid={`${idBase}-refusal`}>
          {t(`sim.input.refusal.${refusal}`)}
        </p>
      ) : null}
    </div>
  );
};

/**
 * The planner-input section of an open row: one button per field, or the handoff notice.
 * @type {React.FC<{ row: StockSimulationRow; open: SimulationOverrideField | null; setOpen: (f: SimulationOverrideField | null) => void; }>}
 */
const PlannerInputs = ({ row, open, setOpen }) => {
  const { t } = useTranslation();
  const availability = useVerbAvailability(SIMULATE_ATOM);
  // MR-7 BR-09 — a manufacturer has no to-distributor term, so no input for it.
  const fields = SIMULATION_OVERRIDE_FIELDS.filter((f) => f !== 'toDistributor' || row.distributor);
  return (
    <section className="space-y-2">
      <h3 className="text-label text-text-tertiary uppercase">{t('sim.input.title')}</h3>
      <p className="text-xs text-text-secondary">{t('sim.input.help')}</p>
      {availability.kind === 'held' ? (
        <div className="flex flex-wrap gap-2">
          {fields.map((f) => (
            <Button
              key={f}
              variant="secondary"
              aria-label={t('sim.input.enterFor', {
                field: t(`sim.input.field.${f}`),
                material: row.materialCode,
                supplier: row.supplierName
              })}
              aria-expanded={open === f}
              onClick={() => setOpen(open === f ? null : f)}
              data-testid={`sim-input-open-${row.supplierId}-${row.materialCode}-${f}`}
            >
              {t('sim.input.enter', { field: t(`sim.input.field.${f}`) })}
            </Button>
          ))}
        </div>
      ) : (
        <HandoffNotice availability={availability} testId="handoff-stock-simulation-input" />
      )}
      {open && availability.kind === 'held' ? (
        <PlannerInputForm row={row} field={open} onClose={() => setOpen(null)} />
      ) : null}
    </section>
  );
};

/**
 * The open row: how the figures are built, the 13 weeks, and the planner inputs.
 * @type {React.FC<{ row: StockSimulationRow; open: SimulationOverrideField | null; setOpen: (f: SimulationOverrideField | null) => void; }>}
 */
export const SimulationDetail = ({ row, open, setOpen }) => {
  const { t } = useTranslation();
  const sim = row.simulation;
  const testId = `sim-detail-${row.supplierId}-${row.materialCode}`;
  return (
    <div className="px-4 py-3 bg-bg-hover/40 space-y-4" data-testid={testId}>
      {sim ? (
        <div className="grid gap-4 lg:grid-cols-[minmax(260px,1fr)_2fr]">
          <section>
            <h3 className="text-label text-text-tertiary uppercase mb-1">
              {t('sim.detail.components')}
            </h3>
            <ul className="divide-y divide-border-subtle">
              {sim.components.map((c) => (
                <ComponentLine
                  key={`${c.kind}-${c.reference ?? ''}-${c.date ?? ''}`}
                  c={c}
                  uom={row.uom}
                />
              ))}
            </ul>
          </section>
          <section className="overflow-x-auto">
            <h3 className="text-label text-text-tertiary uppercase mb-1">
              {t('sim.detail.weeks')}
            </h3>
            <WeeklyTable sim={sim} uom={row.uom} testId={`${testId}-weeks`} />
          </section>
        </div>
      ) : null}
      <PlannerInputs row={row} open={open} setOpen={setOpen} />
    </div>
  );
};
