/** @import React from 'react' */
/** @import { TFunction } from 'i18next' */
import { useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Download, Upload } from 'lucide-react';
import Button from '@components/ui-v2/Button';
import Data from '@components/ui-v2/Data';
import { parseWorkbook } from '@services/sdc';
import { useFeedstockConfirm } from '@services/query/commandHooks';
/** @import { InventoryPosition } from '@services/data/types' */
/** @import { RefusedStockRow } from '@services/transitions/inventoryRules' */
import {
  dayOf,
  parseCsv,
  readFeedstockRows,
  STOCK_TEMPLATE_FIELDS,
  stockTemplateCsv,
  validateStockRows
} from '@services/transitions/inventoryRules';
import {
  InTransitReadOnly,
  inventoryNow,
  qty,
  readFileText,
  useInventoryRunner
} from './inventoryDisplay';

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
// Inventory UX S-01 / S-03 (INV-D10) — the Stock page splits this file three
// ways: the "Upload template" control sits in the page header
// (`StockUploadButton`), its result directly under it (`StockUploadResult`),
// and the download, the column guide and the incoming cards in the "Template
// guide" tab (the default export). One `useStockUpload` state feeds the first
// two. The result names the materials sent to PTI with the quantity and batch
// count of each (BL-224: "PK-PETB-8810 (2 batches, 45,000 PCS)"), counts the
// rows left blank in neutral text ("3 rows left blank, not sent"), and lists
// only a filled row that breaks a rule as refused, with its row, material and
// reason.
//
// In transit (BR-10, BL-60): the template has no in-transit column — a supplier
// never enters it. The panel shows it read-only per material, beside the
// in-production figure last submitted, from ASNs and dispatched call-offs.
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Spreadsheet column letter of the i-th template column (A, B, …).
 * @param {number} i
 */
const columnLetter = (i) => String.fromCharCode(65 + i);

/**
 * MR-4 BR-03, AC-03 — every template column with Required or Optional and a
 * one-line meaning, read from `STOCK_TEMPLATE_FIELDS` so the table cannot
 * drift from the file; plus the batch note for G to J.
 * @type {React.FC}
 */
const StockTemplateColumns = () => {
  const { t } = useTranslation();
  return (
    <details open className="mt-3" data-testid="stock-template-columns">
      <summary className="text-sm text-action cursor-pointer">
        {t('inv.upload.columns.toggle')}
      </summary>
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
              <tr
                key={f.field}
                className="border-t border-border-subtle"
                data-testid={`stock-template-column-${f.field}`}
              >
                <td className="py-1.5 pr-3">
                  <Data>{columnLetter(i)}</Data>
                </td>
                <td className="py-1.5 pr-3 text-text-primary">{t(`inv.template.${f.field}`)}</td>
                <td
                  className="py-1.5 pr-3 text-text-secondary"
                  data-testid={`stock-template-presence-${f.field}`}
                >
                  {t(`inv.upload.columns.presence.${f.presence}`)}
                </td>
                <td className="py-1.5 text-text-secondary">
                  {t(`inv.upload.columns.meaning.${f.field}`)}
                </td>
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

/**
 * One material the upload sent to PTI (BL-224): its stock on hand, the unit
 * the template carries for it, and how many batch rows it came with (0 when
 * the file named no batch).
 * @typedef {{
 *   readonly materialCode: string;
 *   readonly totalQty: number;
 *   readonly uom: string;
 *   readonly batchCount: number;
 * }} SentMaterial
 */

/**
 * `blankRows`:  How many file rows were left blank and not sent (S-03).
 *
 * @typedef {object} UploadResult
 * @property {SentMaterial[]} savedMaterials
 * @property {{ materialCode: string; feedstockQty: number; uom: string }[]} feedstockSent [Proposed] feedstock rows confirmed by the same upload
 * @property {number} blankRows
 * @property {(RefusedStockRow | { row: number; materialCode: string; message: string })[]} refused
 */

/**
 * The upload's state, shared by the header control and the result under it.
 * @typedef {{
 *     readonly busy: boolean;
 *     readonly fileError: string | null;
 *     readonly result: UploadResult | null;
 *     readonly handleFile: (file: File | undefined) => Promise<void>;
 *   }} StockUpload
 */

/**
 * @param {string} supplierId
 * @param {readonly InventoryPosition[]} positions
 * @returns {StockUpload}
 */
export function useStockUpload(supplierId, positions) {
  const { t } = useTranslation();
  const { run } = useInventoryRunner();
  const feedstock = useFeedstockConfirm();
  const [busy, setBusy] = useState(false);
  const [fileError, setFileError] = useState(/** @type {string | null} */ (null));
  const [result, setResult] = useState(/** @type {UploadResult | null} */ (null));

  const assigned = positions.map((p) => ({
    materialCode: p.materialCode,
    uom: p.uom,
    materialType: p.materialType
  }));

  /** @param {File | undefined} file */
  const handleFile = async (file) => {
    if (!file) return;
    setBusy(true);
    setFileError(null);
    setResult(null);
    /** @type {Record<string, string>[]} */
    let rows;
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
    const today = dayOf(inventoryNow());
    const checked = validateStockRows(rows, { assigned, today });
    const feed = readFeedstockRows(rows, { assigned, today });
    /** @type {UploadResult} */
    const out = {
      savedMaterials: [],
      feedstockSent: [],
      // A row that only carries feedstock was not left blank: its feedstock is sent.
      blankRows: checked.blank.filter(
        (b) => ![...feed.accepted, ...feed.refused].some((f) => f.row === b.row)
      ).length,
      refused: [...checked.refused]
    };
    for (const draft of checked.accepted) {
      const { rows: rowNumbers, ...payload } = draft;
      const res = await run({ verb: 'declare', channel: 'template', supplierId, ...payload });
      if (res.ok)
        out.savedMaterials.push({
          materialCode: draft.materialCode,
          totalQty: draft.totalQty,
          uom: assigned.find((a) => a.materialCode === draft.materialCode)?.uom ?? '',
          batchCount: draft.batches?.length ?? 0
        });
      else
        for (const row of rowNumbers)
          out.refused.push({ row, materialCode: draft.materialCode, message: res.reason ?? '' });
    }
    // [Proposed] the feedstock columns go through their own verb, never into the SOH.
    for (const f of feed.refused)
      out.refused.push({
        row: f.row,
        materialCode: f.materialCode,
        message: t(`inv.upload.reason.${f.reason}`)
      });
    for (const f of feed.accepted) {
      const res = await feedstock.mutateAsync({
        supplierId,
        materialCode: f.materialCode,
        feedstockQty: f.feedstockQty,
        confirmedOn: f.confirmedOn,
        note: ''
      });
      if (res.status === 'failed')
        out.refused.push({ row: f.row, materialCode: f.materialCode, message: res.reason ?? '' });
      else
        out.feedstockSent.push({
          materialCode: f.materialCode,
          feedstockQty: f.feedstockQty,
          uom: assigned.find((a) => a.materialCode === f.materialCode)?.uom ?? ''
        });
    }
    // A row can be refused for its stock AND its feedstock: keep the first reason per row.
    const byRow = new Map();
    for (const r of out.refused) if (!byRow.has(r.row)) byRow.set(r.row, r);
    out.refused = [...byRow.values()].sort((a, b) => a.row - b.row);
    setResult(out);
    setBusy(false);
  };

  return { busy, fileError, result, handleFile };
}

/**
 * S-01 — the header's "Upload template" control: a hidden file input and the
 * button that opens it.
 * @type {React.FC<{ upload: StockUpload }>}
 */
export const StockUploadButton = ({ upload }) => {
  const { t } = useTranslation();
  const fileRef = useRef(/** @type {HTMLInputElement | null} */ (null));
  return (
    <>
      <input
        ref={fileRef}
        type="file"
        accept=".csv,.xlsx,text/csv"
        className="hidden"
        data-testid="stock-upload-file"
        aria-label={t('inv.upload.choose')}
        onChange={(e) => {
          const input = e.target;
          // Cleared once read, so choosing the same file again re-runs the check.
          void upload.handleFile(input.files?.[0]).then(() => {
            input.value = '';
          });
        }}
      />
      <Button
        variant="secondary"
        icon={Upload}
        disabled={upload.busy}
        onClick={() => fileRef.current?.click()}
        data-testid="stock-upload-open"
      >
        {t('inv.upload.uploadTemplate')}
      </Button>
    </>
  );
};

/**
 * BL-224 — "2 batches, 45,000 PCS", or "45,000 PCS" when the file named no
 * batch; the quantity through the locale-aware `qty`.
 * @param {TFunction} t
 * @param {SentMaterial} m
 */
const sentDetail = (t, m) => {
  const amount = t('inv.upload.sentQty', { qty: qty(m.totalQty), uom: m.uom });
  return m.batchCount > 0 ? t('inv.upload.sentBatches', { count: m.batchCount, amount }) : amount;
};

/**
 * S-03 (INV-D10) — the upload's result, directly under the control: what was
 * sent to PTI by material, the rows left blank in neutral text, and the
 * refused rows with row, material and reason. Nothing while idle.
 * @type {React.FC<{ upload: StockUpload }>}
 */
export const StockUploadResult = ({ upload }) => {
  const { t } = useTranslation();
  const { busy, fileError, result } = upload;
  if (!busy && fileError === null && result === null) return null;
  return (
    <div className="mb-4 space-y-2" data-testid="stock-upload-status">
      {busy ? <p className="text-sm text-text-tertiary">{t('inv.upload.checking')}</p> : null}
      {fileError !== null ? (
        <p role="alert" className="text-sm text-danger">
          {fileError}
        </p>
      ) : null}
      {result !== null ? (
        <div
          className="bg-bg-surface border border-border-subtle rounded-lg p-4 space-y-2"
          data-testid="stock-upload-result"
          role="status"
        >
          {result.savedMaterials.length > 0 ? (
            <p className="text-sm text-success" data-testid="stock-upload-sent">
              {t('inv.upload.sentTo')}{' '}
              {result.savedMaterials.map((m, i) => (
                <span key={m.materialCode} data-testid={`stock-upload-sent-${m.materialCode}`}>
                  {i > 0 ? ', ' : ''}
                  <Data>{m.materialCode}</Data> ({sentDetail(t, m)})
                </span>
              ))}
            </p>
          ) : result.feedstockSent.length > 0 ? null : (
            <p className="text-sm text-text-secondary" data-testid="stock-upload-sent">
              {t('inv.upload.nothingSent')}
            </p>
          )}
          {result.feedstockSent.length > 0 ? (
            <p className="text-sm text-success" data-testid="stock-upload-feedstock-sent">
              {t('inv.upload.feedstockSent')}{' '}
              {result.feedstockSent.map((f, i) => (
                <span key={f.materialCode}>
                  {i > 0 ? ', ' : ''}
                  <Data>{f.materialCode}</Data> ({qty(f.feedstockQty)} {f.uom})
                </span>
              ))}
            </p>
          ) : null}
          {result.blankRows > 0 ? (
            <p className="text-sm text-text-secondary" data-testid="stock-upload-blank">
              {t('inv.upload.blank', { count: result.blankRows })}
            </p>
          ) : null}
          {result.refused.length > 0 ? <RefusedRows refused={result.refused} /> : null}
        </div>
      ) : null}
    </div>
  );
};

/** @type {React.FC<{ refused: UploadResult['refused'] }>} */
const RefusedRows = ({ refused }) => {
  const { t } = useTranslation();
  return (
    <div>
      <p className="text-sm text-danger mb-2">
        {t('inv.upload.refused', { count: refused.length })}
      </p>
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
            {refused.map((r) => (
              <tr
                key={r.row}
                className="border-t border-border-subtle"
                data-testid={`stock-upload-refused-row-${r.row}`}
              >
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
                        field: r.field ? t(`inv.template.${r.field}`) : ''
                      })}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};

/**
 * User feedback 2026-11-10 — "Download template" sits in the page header beside
 * "Upload template" (it was only inside the Template guide tab, which users
 * missed). Builds the CSV in the browser (a Blob link, nothing sent).
 * @type {React.FC<{ supplierId: string; positions: readonly InventoryPosition[]; testId?: string }>}
 */
export const StockTemplateDownloadButton = ({
  supplierId,
  positions,
  testId = 'stock-template-download'
}) => {
  const { t, i18n } = useTranslation();
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
  return (
    <Button variant="secondary" icon={Download} onClick={download} data-testid={testId}>
      {t('inv.upload.download')}
    </Button>
  );
};

/**
 * S-01 — the "Template guide" tab: the download, the column guide and the
 * incoming stock the template does not take.
 * @type {React.FC<{ supplierId: string; positions: readonly InventoryPosition[] }>}
 */
const StockUploadPanel = ({ supplierId, positions }) => {
  const { t } = useTranslation();

  return (
    <section
      className="bg-bg-surface border border-border-subtle rounded-lg p-4 mb-6"
      data-testid="stock-template-guide"
    >
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h2 className="text-section text-text-primary">{t('inv.upload.title')}</h2>
          <p className="text-sm text-text-secondary">{t('inv.upload.subtitle')}</p>
        </div>
        <div className="flex gap-2">
          <StockTemplateDownloadButton supplierId={supplierId} positions={positions} />
        </div>
      </div>
      <StockTemplateColumns />
      <details open className="mt-3" data-testid="stock-upload-incoming">
        <summary className="text-sm text-action cursor-pointer">
          {t('inv.upload.incoming.toggle')}
        </summary>
        <p className="mt-2 text-xs text-text-tertiary">{t('inv.upload.incoming.hint')}</p>
        <div className="mt-2 grid gap-3 sm:grid-cols-2">
          {positions.map((p) => {
            const inProduction = p.incoming
              .filter((i) => i.source === 'production')
              .reduce((s, i) => s + i.quantity, 0);
            return (
              <div
                key={p.materialCode}
                className="border border-border-subtle rounded-md p-3"
                data-testid={`stock-upload-incoming-${p.materialCode}`}
              >
                <Data className="text-xs font-bold text-text-primary">{p.materialCode}</Data>
                <div className="mt-1 text-xs text-text-secondary">
                  {t('inv.upload.incoming.inProduction')} <Data>{qty(inProduction)}</Data> {p.uom}
                </div>
                <div className="mt-2">
                  <InTransitReadOnly
                    position={p}
                    testId={`stock-upload-in-transit-${p.materialCode}`}
                  />
                </div>
              </div>
            );
          })}
        </div>
      </details>
    </section>
  );
};

export default StockUploadPanel;
