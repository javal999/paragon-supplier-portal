import React, { useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Download, Upload } from 'lucide-react';
import Button from '../../components/ui-v2/Button';
import Data from '../../components/ui-v2/Data';
import { parseWorkbook } from '../../services/sdc';
import type { InventoryPosition } from '../../services/data/types';
import {
  dayOf,
  parseCsv,
  STOCK_TEMPLATE_FIELDS,
  stockTemplateCsv,
  validateStockRows,
  type RefusedStockRow,
} from '../../services/transitions/inventoryRules';
import { InTransitReadOnly, inventoryNow, readFileText, useInventoryRunner } from './inventoryDisplay';

// ─────────────────────────────────────────────────────────────────────────────
// Spreadsheet template ("EDI" to business users) — REQ-E08-02 BR-02, BR-05.
//
// Download: a fixed CSV template, one row per assigned material with the code
// and unit filled in, generated in the browser (a Blob link, nothing sent).
// Upload: a filled CSV or .xlsx is validated ROW BY ROW. Valid materials are
// saved through the declare verb (template channel); every refused row is
// listed with its row number and reason, and nothing else is held back. A row
// the verb itself refuses is listed the same way.
//
// In transit (BR-10, BL-60): the template has no in-transit column — a supplier
// never enters it. The panel shows it read-only per material, beside the
// in-production figure last submitted, from ASNs and dispatched call-offs.
// ─────────────────────────────────────────────────────────────────────────────

/** Spreadsheet column letter of the i-th template column (A, B, …). */
const columnLetter = (i: number) => String.fromCharCode(65 + i);

/**
 * MR-4 BR-03, AC-03 — every template column with Required or Optional and a
 * one-line meaning, read from `STOCK_TEMPLATE_FIELDS` so the table cannot
 * drift from the file; plus the batch note for G to J.
 */
const StockTemplateColumns: React.FC = () => {
  const { t } = useTranslation();
  return (
    <details open className="mt-3" data-testid="stock-template-columns">
      <summary className="text-sm text-action cursor-pointer">{t('inv.upload.columns.toggle')}</summary>
      <div className="relative w-full min-w-0 overflow-x-auto mt-2">
        <table className="w-full text-sm">
          <thead>
            <tr className="text-label text-text-tertiary uppercase">
              <th className="text-left py-1 pr-3">{t('inv.upload.columns.col.column')}</th>
              <th className="text-left py-1 pr-3">{t('inv.upload.columns.col.name')}</th>
              <th className="text-left py-1 pr-3">{t('inv.upload.columns.col.presence')}</th>
              <th className="text-left py-1">{t('inv.upload.columns.col.meaning')}</th>
            </tr>
          </thead>
          <tbody>
            {STOCK_TEMPLATE_FIELDS.map((f, i) => (
              <tr key={f.field} className="border-t border-border-subtle" data-testid={`stock-template-column-${f.field}`}>
                <td className="py-1.5 pr-3">
                  <Data>{columnLetter(i)}</Data>
                </td>
                <td className="py-1.5 pr-3 text-text-primary">{t(`inv.template.${f.field}`)}</td>
                <td className="py-1.5 pr-3 text-text-secondary" data-testid={`stock-template-presence-${f.field}`}>
                  {t(`inv.upload.columns.presence.${f.presence}`)}
                </td>
                <td className="py-1.5 text-text-secondary">{t(`inv.upload.columns.meaning.${f.field}`)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <p className="mt-2 text-xs text-text-tertiary" data-testid="stock-template-batch-note">
        {t('inv.upload.columns.batchNote')}
      </p>
    </details>
  );
};

interface UploadResult {
  savedMaterials: string[];
  refused: (RefusedStockRow | { row: number; materialCode: string; message: string })[];
}

const StockUploadPanel: React.FC<{ supplierId: string; positions: readonly InventoryPosition[]; canSubmit: boolean }> = ({
  supplierId,
  positions,
  canSubmit,
}) => {
  const { t, i18n } = useTranslation();
  const { run } = useInventoryRunner();
  const fileRef = useRef<HTMLInputElement>(null);
  const [busy, setBusy] = useState(false);
  const [fileError, setFileError] = useState<string | null>(null);
  const [result, setResult] = useState<UploadResult | null>(null);

  const assigned = positions.map((p) => ({ materialCode: p.materialCode, uom: p.uom }));

  const download = () => {
    const csv = stockTemplateCsv(assigned, i18n.language.startsWith('id') ? 'id' : 'en');
    if (typeof URL === 'undefined' || typeof URL.createObjectURL !== 'function') return;
    const url = URL.createObjectURL(new Blob([csv], { type: 'text/csv;charset=utf-8' }));
    const a = document.createElement('a');
    a.href = url;
    a.download = `stock-template-${supplierId}.csv`;
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);
  };

  const handleFile = async (file: File | undefined) => {
    if (!file) return;
    setBusy(true);
    setFileError(null);
    setResult(null);
    let rows: Record<string, string>[];
    if (file.name.toLowerCase().endsWith('.xlsx')) {
      const book = await parseWorkbook(file);
      if (!book.ok) {
        setFileError(t('inv.upload.error.unreadable'));
        setBusy(false);
        return;
      }
      rows = [...book.rows];
    } else {
      rows = parseCsv(await readFileText(file)).rows;
    }
    if (rows.length === 0) {
      setFileError(t('inv.upload.error.empty'));
      setBusy(false);
      return;
    }
    const checked = validateStockRows(rows, { assigned, today: dayOf(inventoryNow()) });
    const out: UploadResult = { savedMaterials: [], refused: [...checked.refused] };
    for (const draft of checked.accepted) {
      const { rows: rowNumbers, ...payload } = draft;
      const res = await run({ verb: 'declare', channel: 'template', supplierId, ...payload });
      if (res.ok) out.savedMaterials.push(draft.materialCode);
      else for (const row of rowNumbers) out.refused.push({ row, materialCode: draft.materialCode, message: res.reason ?? '' });
    }
    out.refused.sort((a, b) => a.row - b.row);
    setResult(out);
    setBusy(false);
    if (fileRef.current) fileRef.current.value = '';
  };

  return (
    <section className="bg-bg-surface border border-border-subtle rounded-lg p-4 mb-6" data-testid="stock-upload">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h2 className="text-section text-text-primary">{t('inv.upload.title')}</h2>
          <p className="text-sm text-text-secondary">{t('inv.upload.subtitle')}</p>
        </div>
        <div className="flex gap-2">
          <Button variant="secondary" icon={Download} onClick={download} data-testid="stock-template-download">
            {t('inv.upload.download')}
          </Button>
          {canSubmit && (
            <>
              <input
                ref={fileRef}
                type="file"
                accept=".csv,.xlsx,text/csv"
                className="hidden"
                data-testid="stock-upload-file"
                aria-label={t('inv.upload.choose')}
                onChange={(e) => void handleFile(e.target.files?.[0])}
              />
              <Button variant="outline" icon={Upload} disabled={busy} onClick={() => fileRef.current?.click()}>
                {t('inv.upload.choose')}
              </Button>
            </>
          )}
        </div>
      </div>
      <StockTemplateColumns />
      <details open className="mt-3" data-testid="stock-upload-incoming">
        <summary className="text-sm text-action cursor-pointer">{t('inv.upload.incoming.toggle')}</summary>
        <p className="mt-2 text-xs text-text-tertiary">{t('inv.upload.incoming.hint')}</p>
        <div className="mt-2 grid gap-3 sm:grid-cols-2">
          {positions.map((p) => {
            const inProduction = p.incoming.filter((i) => i.source === 'production').reduce((s, i) => s + i.quantity, 0);
            return (
              <div key={p.materialCode} className="border border-border-subtle rounded-md p-3" data-testid={`stock-upload-incoming-${p.materialCode}`}>
                <Data className="text-xs font-bold text-text-primary">{p.materialCode}</Data>
                <div className="mt-1 text-xs text-text-secondary">
                  {t('inv.upload.incoming.inProduction')} <Data>{inProduction.toLocaleString('en-US')}</Data> {p.uom}
                </div>
                <div className="mt-2">
                  <InTransitReadOnly position={p} testId={`stock-upload-in-transit-${p.materialCode}`} />
                </div>
              </div>
            );
          })}
        </div>
      </details>
      {busy && <p className="mt-3 text-sm text-text-tertiary">{t('inv.upload.checking')}</p>}
      {fileError && (
        <p role="alert" className="mt-3 text-sm text-danger">
          {fileError}
        </p>
      )}
      {result && (
        <div className="mt-4 space-y-3" data-testid="stock-upload-result">
          <p className="text-sm text-text-primary" data-testid="stock-upload-saved">
            {t('inv.upload.saved', { count: result.savedMaterials.length })}
          </p>
          {result.refused.length > 0 && (
            <div>
              <p className="text-sm text-danger mb-2">{t('inv.upload.refused', { count: result.refused.length })}</p>
              <div className="relative w-full min-w-0 overflow-x-auto">
              <table className="w-full text-sm" data-testid="stock-upload-refused">
                <thead>
                  <tr className="text-label text-text-tertiary uppercase">
                    <th className="text-left py-1">{t('inv.upload.col.row')}</th>
                    <th className="text-left py-1">{t('inv.upload.col.material')}</th>
                    <th className="text-left py-1">{t('inv.upload.col.reason')}</th>
                  </tr>
                </thead>
                <tbody>
                  {/* A file row is refused at most once (validateStockRows refuses each
                      row once; the declare refusals cover only rows it accepted), so
                      the file row number is unique here. */}
                  {result.refused.map((r) => (
                    <tr key={r.row} className="border-t border-border-subtle" data-testid={`stock-upload-refused-row-${r.row}`}>
                      <td className="py-1.5">
                        <Data>{r.row}</Data>
                      </td>
                      <td className="py-1.5">
                        <Data>{r.materialCode || '—'}</Data>
                      </td>
                      <td className="py-1.5 text-text-secondary">
                        {'message' in r
                          ? r.message
                          : t(`inv.upload.reason.${r.reason}`, {
                              field: r.field ? t(`inv.template.${r.field}`) : '',
                            })}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
              </div>
            </div>
          )}
        </div>
      )}
    </section>
  );
};

export default StockUploadPanel;
