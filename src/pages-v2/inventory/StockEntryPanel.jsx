/** @import React from 'react' */
import { useEffect, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Plus, X } from 'lucide-react';
import SidePanel from '@components/ui-v2/SidePanel';
import Button from '@components/ui-v2/Button';
import MaterialSearch from '@components/ui-v2/MaterialSearch';
/** @import { CommandResult, InventoryPosition } from '@services/data/types' */
import {
  batchDatesProblem,
  dayOf,
  productionProblem,
  readStockNumber
} from '@services/transitions/inventoryRules';
import {
  InTransitReadOnly,
  inputClass,
  inventoryNow,
  labelClass,
  useInventoryRunner
} from './inventoryDisplay';

// ─────────────────────────────────────────────────────────────────────────────
// Stock entry on screen (REQ-E08-02 BR-04, BR-09) — the same fields as the
// template, field for field (STOCK_TEMPLATE_FIELDS): SOH, supplier ROP,
// in-production quantity and its completion date, and optional batches (batch
// number, quantity, manufacturing date, expiry). The unit is the material's,
// shown in every label — never typed. In-transit quantity sits beside the
// in-production figure READ-ONLY (BR-10): it comes from ASNs and dispatched
// call-offs, never from this form. Used by a supplier for its
// own materials (`declare`, manual channel) and by a PTI planner recording what
// a supplier sent by WhatsApp or email (`record`, shown as "Entered by PTI").
// The page mirrors CR-18 and CR-19 for courtesy; the verb's policies decide.
// MAT-D4 — in production is required (0 allowed) and its completion date is
// required when it is above 0: the same `productionProblem` the template runs.
//
// BL-73 · BR-09 — THIS IS THE ONE STOCK ENTRY. The channel triage surfaces
// (`CommHubInbound` for a supplier, `BuyerChannelTriage` for PTI) no longer
// carry a form or a dispatch of their own: a parsed message only PRE-FILLS this
// panel (`initial.soh`), and the act is this panel's submit. The triage binds
// the subject supplier (`lockSupplier`) and ties the result to the message
// (`onSubmitted`), and nothing else.
// ─────────────────────────────────────────────────────────────────────────────

/**
 * @typedef {object} BatchRow
 * @property {number} id The row's React key, given once when the row is added. Batch rows are
 *   added and removed and hold inputs, and every field is editable or blank,
 *   so no field can identify a row. Never sent: the payload names its fields.
 * @property {string} batchNumber
 * @property {string} qty
 * @property {string} manufacturingDate
 * @property {string} expiryDate
 */

let nextBatchRowId = 0;
/** @returns {BatchRow} */
const emptyBatch = () => ({
  id: nextBatchRowId++,
  batchNumber: '',
  qty: '',
  manufacturingDate: '',
  expiryDate: ''
});

/**
 * @typedef {object} StockEntryPanelProps
 * @property {boolean} open
 * @property {() => void} onClose
 * @property {'supplier' | 'pti'} mode
 * @property {readonly InventoryPosition[]} positions -  Rows the user may enter stock for (a supplier's own, or every PTI row).
 * @property {{ supplierId: string; materialCode: string; soh?: string } | null} [initial] -  Preselect a supplier × material, and optionally pre-fill the stock on hand
 *    (a figure read from a supplier's message — a suggestion the user checks).
 * @property {boolean} [lockSupplier] -  PTI mode: the supplier is bound by the caller and shown, never chosen here.
 * @property {string} [causationId] -  The audit anchor of an earlier dispatch in the same visit, if any.
 * @property {(result: CommandResult, recorded: { materialCode: string; totalQty: number }) => void} [onSubmitted] -  Called with the governed dispatch's result after a successful submit.
 */

const EMPTY = {
  supplierId: '',
  materialCode: '',
  soh: '',
  rop: '',
  inProduction: '',
  completion: ''
};

/** @type {React.FC<StockEntryPanelProps>} */
const StockEntryPanel = ({
  open,
  onClose,
  mode,
  positions,
  initial,
  lockSupplier = false,
  causationId,
  onSubmitted
}) => {
  const { t } = useTranslation();
  const { run, pending } = useInventoryRunner();
  const [form, setForm] = useState(EMPTY);
  const [batches, setBatches] = useState(/** @type {BatchRow[]} */ ([]));
  // Material C3 — the material picker's search (MR-3 BR-04).
  const [materialQuery, setMaterialQuery] = useState('');

  useEffect(() => {
    if (!open) return;
    setMaterialQuery('');
    const supplierId =
      initial?.supplierId ?? (mode === 'supplier' ? (positions[0]?.supplierId ?? '') : '');
    setForm({
      ...EMPTY,
      supplierId,
      materialCode: initial?.materialCode ?? '',
      soh: initial?.soh ?? ''
    });
    setBatches([]);
  }, [open, initial, mode, positions]);

  const suppliers = useMemo(
    () =>
      [...new Map(positions.map((p) => [p.supplierId, p.supplierName])).entries()].sort((a, b) =>
        a[1].localeCompare(b[1])
      ),
    [positions]
  );
  const materials = positions.filter((p) => p.supplierId === form.supplierId);
  const selected = materials.find((p) => p.materialCode === form.materialCode) ?? null;

  const soh = readStockNumber(form.soh);
  const rop = readStockNumber(form.rop);
  const inProduction = readStockNumber(form.inProduction);
  const batchReads = batches.map((b) => readStockNumber(b.qty));
  /** @param {ReturnType<typeof readStockNumber>} read */
  const numberError = (read) =>
    read.ok
      ? null
      : t(
          read.reason === 'ambiguousNumber'
            ? 'inv.entry.error.ambiguous'
            : 'inv.entry.error.notNumber'
        );
  const batchTotal = batchReads.reduce((s, r) => s + (r.ok && r.value !== null ? r.value : 0), 0);
  const batchMismatch =
    batches.length > 0 && soh.ok && soh.value !== null && batchTotal !== soh.value;
  // MAT-D4 — the SAME check the template validator runs: in production is
  // required (0 allowed), and its completion date is required when it is above 0.
  const production = inProduction.ok
    ? productionProblem(inProduction.value, form.completion, mode === 'supplier' ? 'manual' : 'pti')
    : null;
  const batchIncomplete = batches.some(
    (b, i) => b.batchNumber.trim() === '' || !batchReads[i].ok || batchReads[i].value === null
  );
  const today = dayOf(inventoryNow());
  const batchDates = batches.map((b) => batchDatesProblem(b, today));
  const batchDateInvalid = batchDates.some((d) => d !== null);

  const canSubmit =
    selected !== null &&
    soh.ok &&
    soh.value !== null &&
    rop.ok &&
    inProduction.ok &&
    production === null &&
    !batchMismatch &&
    !batchIncomplete &&
    !batchDateInvalid &&
    !pending;

  const submit = async () => {
    if (
      !selected ||
      !soh.ok ||
      soh.value === null ||
      !rop.ok ||
      !inProduction.ok ||
      production !== null
    )
      return;
    const common = {
      ...(causationId ? { causationId } : {}),
      supplierId: selected.supplierId,
      materialCode: selected.materialCode,
      totalQty: soh.value,
      ...(rop.value !== null ? { supplierRop: rop.value } : {}),
      ...(inProduction.value !== null ? { inProductionQty: inProduction.value } : {}),
      ...(form.completion ? { productionCompletionDate: form.completion } : {}),
      ...(batches.length > 0
        ? {
            batches: batches.map((b, i) => ({
              batchNumber: b.batchNumber.trim(),
              qty: /** @type {{ ok: true; value: number }} */ (batchReads[i]).value,
              ...(b.manufacturingDate ? { manufacturingDate: b.manufacturingDate } : {}),
              ...(b.expiryDate ? { expiryDate: b.expiryDate } : {})
            }))
          }
        : {})
    };
    const result =
      mode === 'supplier'
        ? await run({ verb: 'declare', channel: 'manual', ...common }, t('inv.entry.toast.saved'))
        : await run({ verb: 'record', ...common }, t('inv.entry.toast.recorded'));
    if (result.ok) {
      if (result.result)
        onSubmitted?.(result.result, { materialCode: selected.materialCode, totalQty: soh.value });
      onClose();
    }
  };

  const uom = selected?.uom ?? '';

  return (
    <SidePanel
      open={open}
      onClose={onClose}
      title={t(mode === 'supplier' ? 'inv.entry.title' : 'inv.entry.ptiTitle')}
      footerActions={
        <Button
          variant="outline"
          disabled={!canSubmit}
          onClick={() => void submit()}
          data-testid="stock-entry-submit"
        >
          {t(mode === 'supplier' ? 'inv.entry.submit' : 'inv.entry.ptiSubmit')}
        </Button>
      }
    >
      <div className="space-y-4" data-testid="stock-entry-panel">
        {mode === 'pti' && (
          <>
            <p className="text-sm text-text-secondary">{t('inv.entry.ptiHint')}</p>
            {lockSupplier ? (
              <div data-testid="stock-entry-supplier-locked">
                <span className={labelClass}>{t('inv.entry.supplier')}</span>
                <span className="text-sm text-text-primary">
                  {suppliers.find(([id]) => id === form.supplierId)?.[1] ?? form.supplierId}
                </span>
              </div>
            ) : (
              <div>
                <label htmlFor="stock-entry-supplier" className={labelClass}>
                  {t('inv.entry.supplier')}
                </label>
                <select
                  id="stock-entry-supplier"
                  className={inputClass}
                  value={form.supplierId}
                  onChange={(e) =>
                    setForm({ ...form, supplierId: e.target.value, materialCode: '' })
                  }
                >
                  <option value="">{t('inv.entry.select')}</option>
                  {suppliers.map(([id, name]) => (
                    <option key={id} value={id}>
                      {name}
                    </option>
                  ))}
                </select>
              </div>
            )}
          </>
        )}
        <MaterialSearch
          mode="picker"
          id="stock-entry-material"
          label={t('inv.entry.material')}
          labelClassName={labelClass}
          selectClassName={inputClass}
          emptyLabel={t('inv.entry.select')}
          options={materials.map((p) => ({
            code: p.materialCode,
            description: p.materialLabel,
            supplierId: p.supplierId
          }))}
          value={form.materialCode}
          onChange={(code) => setForm({ ...form, materialCode: code })}
          query={materialQuery}
          onQueryChange={setMaterialQuery}
          testId="stock-entry-material-search"
        />
        <div className="grid grid-cols-2 gap-3">
          <NumberField
            id="stock-entry-soh"
            label={t('inv.entry.soh', { uom })}
            value={form.soh}
            onChange={(v) => setForm({ ...form, soh: v })}
            error={numberError(soh)}
          />
          <NumberField
            id="stock-entry-rop"
            label={t('inv.entry.rop', { uom })}
            value={form.rop}
            onChange={(v) => setForm({ ...form, rop: v })}
            error={numberError(rop)}
          />
          <NumberField
            id="stock-entry-production"
            label={t('inv.entry.inProduction', { uom })}
            value={form.inProduction}
            onChange={(v) => setForm({ ...form, inProduction: v })}
            error={numberError(inProduction)}
          />
          <div>
            <label htmlFor="stock-entry-completion" className={labelClass}>
              {t('inv.entry.completion')}
            </label>
            <input
              id="stock-entry-completion"
              type="date"
              className={inputClass}
              value={form.completion}
              onChange={(e) => setForm({ ...form, completion: e.target.value })}
            />
          </div>
          {production?.reason === 'productionDateMissing' ? (
            <p
              role="alert"
              className="col-span-2 text-xs text-danger"
              data-testid="stock-entry-production-date-missing"
            >
              {t('inv.entry.error.productionDateMissing')}
            </p>
          ) : production?.reason === 'invalidDate' ? (
            <p role="alert" className="col-span-2 text-xs text-danger">
              {t('inv.entry.error.invalidDate')}
            </p>
          ) : null}
          {selected ? (
            <div className="col-span-2">
              <InTransitReadOnly position={selected} testId="stock-entry-in-transit" />
            </div>
          ) : null}
        </div>
        <p className="text-xs text-text-tertiary">{t('inv.entry.numberHint')}</p>
        <p className="text-xs text-text-tertiary" data-testid="stock-entry-production-hint">
          {t('inv.entry.inProductionHint')}
        </p>

        <section>
          <div className="flex items-center justify-between mb-2">
            <span className={labelClass}>{t('inv.entry.batches')}</span>
            <Button
              variant="secondary"
              icon={Plus}
              onClick={() => setBatches([...batches, emptyBatch()])}
            >
              {t('inv.entry.addBatch')}
            </Button>
          </div>
          {batches.length === 0 ? (
            <p className="text-xs text-text-tertiary">{t('inv.entry.noBatches')}</p>
          ) : (
            <div className="space-y-2">
              {batches.map((b, i) => (
                <div
                  key={b.id}
                  className="relative border border-border-subtle rounded-md p-3 pr-10"
                >
                  <div className="grid grid-cols-2 gap-2 items-end">
                    <div>
                      <label htmlFor={`batch-number-${i}`} className={labelClass}>
                        {t('inv.entry.batchNumber')}
                      </label>
                      <input
                        id={`batch-number-${i}`}
                        className={inputClass}
                        value={b.batchNumber}
                        onChange={(e) =>
                          setBatches(
                            batches.map((x, j) =>
                              j === i ? { ...x, batchNumber: e.target.value } : x
                            )
                          )
                        }
                      />
                    </div>
                    <div>
                      <label htmlFor={`batch-qty-${i}`} className={labelClass}>
                        {t('inv.entry.batchQty')}
                      </label>
                      <input
                        id={`batch-qty-${i}`}
                        inputMode="decimal"
                        className={inputClass}
                        value={b.qty}
                        onChange={(e) =>
                          setBatches(
                            batches.map((x, j) => (j === i ? { ...x, qty: e.target.value } : x))
                          )
                        }
                      />
                    </div>
                    <div>
                      <label htmlFor={`batch-mfg-${i}`} className={labelClass}>
                        {t('inv.entry.manufacturing')}
                      </label>
                      <input
                        id={`batch-mfg-${i}`}
                        type="date"
                        className={inputClass}
                        value={b.manufacturingDate}
                        onChange={(e) =>
                          setBatches(
                            batches.map((x, j) =>
                              j === i ? { ...x, manufacturingDate: e.target.value } : x
                            )
                          )
                        }
                      />
                    </div>
                    <div>
                      <label htmlFor={`batch-expiry-${i}`} className={labelClass}>
                        {t('inv.entry.expiry')}
                      </label>
                      <input
                        id={`batch-expiry-${i}`}
                        type="date"
                        className={inputClass}
                        value={b.expiryDate}
                        onChange={(e) =>
                          setBatches(
                            batches.map((x, j) =>
                              j === i ? { ...x, expiryDate: e.target.value } : x
                            )
                          )
                        }
                      />
                    </div>
                    <button
                      type="button"
                      className="absolute top-1 right-1 p-2 text-text-tertiary hover:text-text-primary"
                      aria-label={t('inv.entry.removeBatch')}
                      onClick={() => setBatches(batches.filter((_, j) => j !== i))}
                    >
                      <X size={16} />
                    </button>
                  </div>
                  {batchDates[i] ? (
                    <p
                      role="alert"
                      className="mt-1 text-xs text-danger"
                      data-testid={`stock-entry-batch-date-${i}`}
                    >
                      {t(
                        `inv.entry.error.${/** @type {NonNullable<(typeof batchDates)[number]>} */ (batchDates[i]).problem}`
                      )}
                    </p>
                  ) : null}
                </div>
              ))}
            </div>
          )}
          {batchMismatch ? (
            <p
              role="alert"
              className="mt-2 text-xs text-danger"
              data-testid="stock-entry-batch-mismatch"
            >
              {t('inv.entry.error.batchTotal')}
            </p>
          ) : null}
        </section>
      </div>
    </SidePanel>
  );
};

/** @type {React.FC<{ id: string; label: string; value: string; onChange: (v: string) => void; error: string | null }>} */
const NumberField = ({ id, label, value, onChange, error }) => (
  <div>
    <label htmlFor={id} className={labelClass}>
      {label}
    </label>
    <input
      id={id}
      inputMode="decimal"
      className={inputClass}
      value={value}
      onChange={(e) => onChange(e.target.value)}
    />
    {error ? (
      <p role="alert" className="mt-1 text-xs text-danger">
        {error}
      </p>
    ) : null}
  </div>
);

export default StockEntryPanel;
