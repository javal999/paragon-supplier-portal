/** @import React from 'react' */
import { useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Download, Upload } from 'lucide-react';
import Button from '@components/ui-v2/Button';
import { HandoffNotice } from '@components/ui-v2/HandoffNotice';
import { useVerbAvailability } from '@hooks/useVerbAvailability';
import { useToast } from '@hooks/useToast';
import { normalizeQty } from '@lib/localeNumber';
import { formatNumber } from '@lib/format';
import { parseWorkbook } from '@services/sdc';
import { useConsumptionRecordCommand } from '@services/query/commandHooks';
import {
  CONSUMPTION_TEMPLATE_FIELDS,
  consumptionTemplateCsv,
  validateConsumptionRows
} from '@services/transitions/consumptionRules';
import { addDays, dayOf, mondayOf, parseCsv } from '@services/transitions/inventoryRules';
import { OSIP_RULES } from '@services/transitions/osipRules';
/** @import { DemandAnticipationRow } from '@services/transitions/demandAnticipationRules' */
/** @import { ConsumptionRowRefusal } from '@services/transitions/consumptionRules' */
import { inputClass, labelClass, readFileText } from '../../inventory/inventoryDisplay';
import { weekLabel } from '../display';

// ─────────────────────────────────────────────────────────────────────────────
// CAP-11 (CAP-D14) — "Record consumption": the planner types a material's
// consumption for a week up to the current one, or uploads the
// template (CSV or XLSX). ONE verb, ONE notice in its slot (§76): a seat
// without `forecast:publish` sees the handoff notice instead of both entries,
// and the template download stays (it is a read).
//
// Upload, on the stock template precedent: a file without every template
// column is not the template and is refused whole, with one line naming the
// missing columns; otherwise each row is checked with the verb's own rule,
// accepted rows are recorded one by one, and every refused row is listed.
// The data is the planner's until the SAP goods-issue feed exists, and the
// panel says so.
// ─────────────────────────────────────────────────────────────────────────────

/** @typedef {{ row: number; materialCode: string; reason?: ConsumptionRowRefusal; message?: string }} RefusedLine */

/**
 * @type {React.FC<{ rows: readonly DemandAnticipationRow[]; nowIso: string }>}
 */
const ConsumptionPanel = ({ rows, nowIso }) => {
  const { t, i18n } = useTranslation();
  const { toast } = useToast();
  const availability = useVerbAvailability('forecast:publish');
  const record = useConsumptionRecordCommand();
  const fileRef = useRef(/** @type {HTMLInputElement | null} */ (null));
  const current = mondayOf(dayOf(nowIso));

  /** @type {Map<string, { label: string; uom: string }>} */
  const materials = new Map();
  for (const r of rows)
    if (!materials.has(r.materialCode))
      materials.set(r.materialCode, { label: r.materialLabel, uom: r.uom });
  const codes = [...materials.keys()].sort();
  // The current week and the weeks before it that the consumption moving
  // average reads ([Default A11], DRC-18), newest first. The fixed horizons
  // these weeks came from are retired (DRC-2); an older week is recorded
  // through the upload.
  const weeks = Array.from({ length: OSIP_RULES.consumptionMovingAvgWeeks }, (_, i) =>
    addDays(current, -7 * i)
  );

  const [material, setMaterial] = useState('');
  const [week, setWeek] = useState('');
  const [qty, setQty] = useState('');
  const [busy, setBusy] = useState(false);
  const [fileError, setFileError] = useState(/** @type {string | null} */ (null));
  const [result, setResult] = useState(
    /** @type {{ saved: number; refused: RefusedLine[] } | null} */ (null)
  );

  const chosenMaterial = material || codes[0] || '';
  const chosenWeek = week || weeks[0] || '';
  const uom = materials.get(chosenMaterial)?.uom ?? '';
  /** @param {string} code */
  const uomOf = (code) => materials.get(code)?.uom ?? null;
  const recorded = rows
    .filter((r) => r.materialCode === chosenMaterial)
    .flatMap((r) => r.weeks)
    .find((w) => w.week === chosenWeek && w.consumptionRecord !== null)?.consumptionRecord;

  const download = () => {
    const csv = consumptionTemplateCsv(
      codes.map((c) => ({ materialCode: c, uom: uomOf(c) ?? '' })),
      [...weeks].reverse(),
      i18n.language.startsWith('id') ? 'id' : 'en'
    );
    if (typeof URL === 'undefined' || typeof URL.createObjectURL !== 'function') return;
    const url = URL.createObjectURL(new Blob([csv], { type: 'text/csv;charset=utf-8' }));
    const a = document.createElement('a');
    a.href = url;
    a.download = 'consumption-template.csv';
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);
  };

  const submit = async () => {
    const read = normalizeQty(qty);
    const res = await record.mutateAsync({
      materialCode: chosenMaterial,
      week: chosenWeek,
      qty: read.ok ? read.value : NaN,
      unit: uom,
      source: 'manual'
    });
    if (res.status === 'failed')
      toast({ variant: 'error', title: t('consumption.record.failed'), description: res.reason });
    else {
      setQty('');
      toast({
        variant: 'success',
        title: t('consumption.record.done', {
          material: chosenMaterial,
          week: weekLabel(chosenWeek)
        })
      });
    }
  };

  /** @param {File | undefined} file */
  const handleFile = async (file) => {
    if (!file) return;
    setBusy(true);
    setFileError(null);
    setResult(null);
    /** @type {{ headers: readonly string[]; rows: readonly Record<string, string>[] }} */
    let sheet;
    if (file.name.toLowerCase().endsWith('.xlsx')) {
      const book = await parseWorkbook(file);
      if (!book.ok) {
        setFileError(t('consumption.upload.error.unreadable'));
        setBusy(false);
        return;
      }
      sheet = { headers: book.headers, rows: book.rows };
    } else if (file.name.toLowerCase().endsWith('.csv')) {
      sheet = parseCsv(await readFileText(file));
    } else {
      setFileError(t('consumption.upload.error.unreadable'));
      setBusy(false);
      return;
    }
    const checked = validateConsumptionRows(sheet.headers, sheet.rows, { uomOf, nowIso });
    if (!checked.ok) {
      setFileError(
        t('consumption.upload.error.notTemplate', {
          columns: checked.missing
            .map((f) => CONSUMPTION_TEMPLATE_FIELDS.find((x) => x.field === f)?.en ?? f)
            .join(', ')
        })
      );
      setBusy(false);
      if (fileRef.current) fileRef.current.value = '';
      return;
    }
    if (checked.accepted.length === 0 && checked.refused.length === 0) {
      setFileError(t('consumption.upload.error.empty'));
      setBusy(false);
      if (fileRef.current) fileRef.current.value = '';
      return;
    }
    /** @type {{ saved: number; refused: RefusedLine[] }} */
    const out = { saved: 0, refused: [...checked.refused] };
    for (const d of checked.accepted) {
      const res = await record.mutateAsync({
        materialCode: d.materialCode,
        week: d.week,
        qty: d.qty,
        unit: d.unit,
        source: 'upload'
      });
      if (res.status === 'failed')
        out.refused.push({ row: d.row, materialCode: d.materialCode, message: res.reason });
      else out.saved += 1;
    }
    out.refused.sort((a, b) => a.row - b.row);
    setResult(out);
    setBusy(false);
    if (fileRef.current) fileRef.current.value = '';
  };

  const held = availability.kind === 'held';

  return (
    <section
      className="bg-bg-surface border border-border-subtle rounded-lg p-4 mb-4"
      data-testid="consumption-panel"
    >
      <div className="flex flex-wrap items-start justify-between gap-3 mb-2">
        <div>
          <h2 className="text-section text-text-primary">{t('consumption.title')}</h2>
          <p className="text-xs text-text-tertiary" data-testid="consumption-source-marker">
            {t('consumption.marker')}
          </p>
        </div>
        <Button
          variant="secondary"
          icon={Download}
          onClick={download}
          disabled={codes.length === 0 || weeks.length === 0}
          data-testid="consumption-template-download"
        >
          {t('consumption.upload.download')}
        </Button>
      </div>
      <p className="text-sm text-text-secondary mb-3">{t('consumption.howItWorks')}</p>

      {!held ? (
        <HandoffNotice availability={availability} testId="handoff-consumption-record" />
      ) : (
        <>
          {weeks.length === 0 || codes.length === 0 ? (
            <p className="text-sm text-text-tertiary" data-testid="consumption-no-weeks">
              {t('consumption.noWeeks')}
            </p>
          ) : (
            <>
              <div
                className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-[minmax(0,16rem)_minmax(0,10rem)_minmax(0,10rem)_auto] items-end gap-3"
                data-testid="consumption-form"
              >
                <div>
                  <label htmlFor="consumption-material" className={labelClass}>
                    {t('consumption.field.material')}
                  </label>
                  <select
                    id="consumption-material"
                    className={inputClass}
                    value={chosenMaterial}
                    onChange={(e) => setMaterial(e.target.value)}
                  >
                    {codes.map((c) => (
                      <option key={c} value={c}>
                        {`${c} · ${materials.get(c)?.label ?? ''}`}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label htmlFor="consumption-week" className={labelClass}>
                    {t('consumption.field.week')}
                  </label>
                  <select
                    id="consumption-week"
                    className={inputClass}
                    value={chosenWeek}
                    onChange={(e) => setWeek(e.target.value)}
                  >
                    {weeks.map((w) => (
                      <option key={w} value={w}>
                        {`${weekLabel(w)} · ${w}`}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label htmlFor="consumption-qty" className={labelClass}>
                    {t('consumption.field.qty', { uom })}
                  </label>
                  <input
                    id="consumption-qty"
                    className={inputClass}
                    inputMode="decimal"
                    value={qty}
                    onChange={(e) => setQty(e.target.value)}
                    data-testid="consumption-qty"
                  />
                </div>
                <Button
                  variant="outline"
                  onClick={() => void submit()}
                  disabled={record.isPending || busy || qty.trim() === ''}
                  data-testid="consumption-record"
                >
                  {t('consumption.record.button')}
                </Button>
              </div>
              {recorded ? (
                <p
                  className="mt-2 text-xs text-text-secondary"
                  data-testid="consumption-recorded-now"
                >
                  {t('consumption.record.inForce', {
                    qty: formatNumber(recorded.materialQty),
                    uom,
                    source: t(`consumption.source.${recorded.source}`)
                  })}
                </p>
              ) : null}
            </>
          )}

          <div className="mt-4 flex flex-wrap items-center gap-3">
            <input
              ref={fileRef}
              type="file"
              accept=".csv,.xlsx,text/csv"
              className="hidden"
              data-testid="consumption-upload-file"
              aria-label={t('consumption.upload.choose')}
              // BL-84 — the upload's refusal is announced with the file control.
              aria-invalid={fileError ? true : undefined}
              aria-describedby={fileError ? 'consumption-upload-error' : undefined}
              onChange={(e) => void handleFile(e.target.files?.[0])}
            />
            <Button
              variant="secondary"
              icon={Upload}
              disabled={busy || record.isPending}
              onClick={() => fileRef.current?.click()}
              data-testid="consumption-upload-choose"
            >
              {t('consumption.upload.choose')}
            </Button>
            <span className="text-xs text-text-tertiary">
              {t('consumption.upload.columns', {
                columns: CONSUMPTION_TEMPLATE_FIELDS.map((f) =>
                  i18n.language.startsWith('id') ? f.id : f.en
                ).join(', ')
              })}
            </span>
          </div>
          {busy ? (
            <p className="mt-3 text-sm text-text-tertiary">{t('consumption.upload.checking')}</p>
          ) : null}
          {fileError ? (
            <p
              id="consumption-upload-error"
              role="alert"
              className="mt-3 text-sm text-danger"
              data-testid="consumption-upload-error"
            >
              {fileError}
            </p>
          ) : null}
          {result ? (
            <div className="mt-3 space-y-2" data-testid="consumption-upload-result">
              <p className="text-sm text-text-primary" data-testid="consumption-upload-saved">
                {t('consumption.upload.saved', { count: result.saved })}
              </p>
              {result.refused.length > 0 ? (
                <ul
                  className="text-sm text-text-secondary"
                  data-testid="consumption-upload-refused"
                >
                  {result.refused.map((r) => (
                    <li key={r.row} data-testid={`consumption-upload-refused-row-${r.row}`}>
                      {t('consumption.upload.refusedRow', {
                        row: r.row,
                        material: r.materialCode || '—',
                        reason: r.reason ? t(`consumption.upload.reason.${r.reason}`) : r.message
                      })}
                    </li>
                  ))}
                </ul>
              ) : null}
            </div>
          ) : null}
        </>
      )}
    </section>
  );
};

export default ConsumptionPanel;
