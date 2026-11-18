/** @import React from 'react' */
import { useTranslation } from 'react-i18next';
import { Download } from 'lucide-react';
import SidePanel from '@components/ui-v2/SidePanel';
import Button from '@components/ui-v2/Button';
import Data from '@components/ui-v2/Data';
import TermLabel from '@components/ui-v2/TermLabel';
import { formatDate } from '@lib/format';
/** @import { InventoryPosition } from '@services/data/types' */
import { qty } from './inventoryDisplay';

// ────────────────────────────────────────────────────────────────────────────
// PSC-2 (BL-337) — IN PRODUCTION AND IN TRANSIT ON THE SUPPLIER STOCK TABLE.
//
// TL-D43 / M2-A4 / MAT-D3: the supplier view's former "Incoming" column and
// its labels are In Production; the combined "Incoming" group label is retired
// on this view only (the PTI inventory view keeps it). The two figures are
// separate, each with its own date (BR-02, BR-03).
//
// The row carries the TOTALS; the drawer carries the CHILD ROWS — each
// production run and each shipment from a submitted ASN or a dispatched
// call-off (BR-01 to BR-03). The download flattens exactly those entries
// (BR-11), one row per entry, so the file matches the drawer.
// ────────────────────────────────────────────────────────────────────────────

/**
 * `entries`:  The material's child rows — one per production run and one per
 *   shipment, oldest first by date (undated last).
 * `total` / `nextDate`:  What the column shows: the sum, and the nearest date
 *   for In Transit / the latest date for In Production.
 *
 * @typedef {{
 *   readonly entries: readonly import('@services/data/types').IncomingItem[];
 *   readonly total: number;
 *   readonly nextDate: string | null;
 * }} EntryFigures
 */

/**
 * The In Production entries of a material: the declaration's declared run(s).
 * @param {InventoryPosition} position
 * @returns {readonly import('@services/data/types').IncomingItem[]}
 */
export const productionEntries = (position) =>
  position.incoming.filter((i) => i.source === 'production');

/**
 * The In Transit entries: submitted ASNs and dispatched call-offs.
 * @param {InventoryPosition} position
 * @returns {readonly import('@services/data/types').IncomingItem[]}
 */
export const transitEntries = (position) =>
  position.incoming.filter((i) => i.source !== 'production');

/**
 * The figures a column shows. In Transit reads the NEAREST ETA (the first thing
 * to arrive, BR-02); In Production reads the LATEST ETA (the last run to
 * finish, BR-03) — the two directions the rule names, each on its own entries.
 * @param {readonly import('@services/data/types').IncomingItem[]} entries
 * @param {'nearest' | 'latest'} direction
 * @returns {EntryFigures}
 */
export function entryFigures(entries, direction) {
  const total = entries.reduce((s, i) => s + i.quantity, 0);
  const dates = entries
    .map((i) => i.date)
    .filter(/** @returns {d is string} */ (d) => typeof d === 'string' && d !== '')
    .sort((a, b) => a.localeCompare(b));
  const date =
    dates.length === 0 ? null : direction === 'nearest' ? dates[0] : dates[dates.length - 1];
  return { entries, total, nextDate: date };
}

/**
 * BR-02 — In Transit, after the material: the total and the nearest ETA; the
 * button opens the material's drawer.
 * @type {React.FC<{ position: InventoryPosition; onOpen: () => void }>}
 */
export const InTransitCell = ({ position, onOpen }) => {
  const { t } = useTranslation();
  const { total, nextDate } = entryFigures(transitEntries(position), 'nearest');
  if (total === 0)
    return <span className="text-xs text-text-tertiary">{t('inv.sup.entry.none')}</span>;
  return (
    <button
      type="button"
      onClick={onOpen}
      className="text-left text-xs text-action hover:underline focus-visible:outline focus-visible:outline-2 focus-visible:outline-action rounded"
      aria-label={t('inv.sup.entry.openTransit', { material: position.materialCode })}
      data-testid={`sup-stock-transit-${position.materialCode}`}
    >
      <div className="whitespace-nowrap">
        <Data>{`${qty(total)} ${position.uom}`}</Data>
      </div>
      <div className="whitespace-nowrap text-text-secondary">
        {nextDate ? formatDate(nextDate) : t('inv.incoming.noDate')}
      </div>
    </button>
  );
};

/**
 * BR-03 — In Production: the total and the latest ETA; the button opens the
 * material's drawer.
 * @type {React.FC<{ position: InventoryPosition; onOpen: () => void }>}
 */
export const InProductionCell = ({ position, onOpen }) => {
  const { t } = useTranslation();
  const { total, nextDate } = entryFigures(productionEntries(position), 'latest');
  if (total === 0)
    return <span className="text-xs text-text-tertiary">{t('inv.sup.entry.none')}</span>;
  return (
    <button
      type="button"
      onClick={onOpen}
      className="text-left text-xs text-action hover:underline focus-visible:outline focus-visible:outline-2 focus-visible:outline-action rounded"
      aria-label={t('inv.sup.entry.openProduction', { material: position.materialCode })}
      data-testid={`sup-stock-production-${position.materialCode}`}
    >
      <div className="whitespace-nowrap">
        <Data>{`${qty(total)} ${position.uom}`}</Data>
      </div>
      <div className="whitespace-nowrap text-text-secondary">
        {nextDate ? formatDate(nextDate) : t('inv.incoming.noDate')}
      </div>
    </button>
  );
};

/**
 * The child rows of one material: each In Production run, then each In Transit
 * shipment, with its date, quantity and the document it comes from.
 * @type {React.FC<{ position: InventoryPosition | null; onClose: () => void }>}
 */
export const SupplierStockDrawer = ({ position, onClose }) => {
  const { t } = useTranslation();
  const production = position ? productionEntries(position) : [];
  const transit = position ? transitEntries(position) : [];
  return (
    <SidePanel
      open={position !== null}
      onClose={onClose}
      title={position ? t('inv.sup.drawer.title', { material: position.materialCode }) : ''}
    >
      {position && (
        <div className="space-y-4" data-testid="sup-stock-drawer">
          <p className="text-sm text-text-secondary">
            {position.materialLabel} · {position.supplierName}
          </p>
          <section data-testid="sup-stock-drawer-production">
            <h3 className="text-label text-text-tertiary uppercase mb-1">
              <TermLabel term="inProduction" />
            </h3>
            {production.length === 0 ? (
              <p className="text-sm text-text-tertiary" data-testid="sup-stock-no-production">
                {t('inv.sup.drawer.noProduction')}
              </p>
            ) : (
              <ul className="divide-y divide-border-subtle">
                {production.map((i, idx) => (
                  <li
                    key={`production-${i.date ?? 'no-date'}-${i.quantity}`}
                    className="py-2 flex flex-wrap items-center justify-between gap-2"
                    data-testid={`sup-stock-run-${idx}`}
                  >
                    <span className="text-sm text-text-primary">
                      {i.date ? formatDate(i.date) : t('inv.incoming.noDate')}
                    </span>
                    <Data>{`${qty(i.quantity)} ${position.uom}`}</Data>
                  </li>
                ))}
              </ul>
            )}
          </section>
          <section data-testid="sup-stock-drawer-transit">
            <h3 className="text-label text-text-tertiary uppercase mb-1">
              <TermLabel term="inTransit" />
            </h3>
            {transit.length === 0 ? (
              <p className="text-sm text-text-tertiary">{t('inv.sup.entry.none')}</p>
            ) : (
              <ul className="divide-y divide-border-subtle">
                {transit.map((i, idx) => (
                  <li
                    key={`${i.source}-${i.reference ?? 'no-ref'}-${i.date ?? 'no-date'}`}
                    className="py-2 flex flex-wrap items-center justify-between gap-2"
                    data-testid={`sup-stock-shipment-${idx}`}
                  >
                    <span className="text-sm text-text-primary">
                      {i.date ? formatDate(i.date) : t('inv.incoming.noDate')}
                      <span className="block text-xs text-text-tertiary">
                        {t(`inv.incoming.source.${i.source}`)}
                        {i.reference ? (
                          <>
                            {' · '}
                            <Data>{i.reference}</Data>
                          </>
                        ) : null}
                      </span>
                    </span>
                    <Data>{`${qty(i.quantity)} ${position.uom}`}</Data>
                  </li>
                ))}
              </ul>
            )}
          </section>
        </div>
      )}
    </SidePanel>
  );
};

/**
 * BR-11 — the download flattens every In Transit and In Production entry of
 * the listed materials: one row per entry, so the file matches the drawer.
 * @param {readonly Pick<InventoryPosition, 'materialCode' | 'uom' | 'incoming'>[]} positions
 * @param {'en' | 'id'} language
 * @returns {string}
 */
export function stockEntriesCsv(positions, language) {
  /** @param {string} v */
  const quote = (v) => (/[",\n;]/.test(v) ? `"${v.replace(/"/g, '""')}"` : v);
  const header = [
    language === 'id' ? 'Kode material' : 'Material code',
    language === 'id' ? 'Jenis entri' : 'Entry',
    language === 'id' ? 'Kuantitas' : 'Quantity',
    language === 'id' ? 'Satuan' : 'Unit',
    language === 'id' ? 'Perkiraan tanggal' : 'Expected date',
    language === 'id' ? 'Referensi' : 'Reference'
  ];
  const label = (/** @type {'production' | 'asn' | 'dispatch'} */ source) =>
    source === 'production'
      ? language === 'id'
        ? 'Dalam produksi'
        : 'In Production'
      : language === 'id'
        ? 'Dalam perjalanan'
        : 'In Transit';
  const lines = positions.flatMap((p) =>
    p.incoming
      .slice()
      .sort((a, b) => (a.date ?? '9999').localeCompare(b.date ?? '9999'))
      .map((i) =>
        [
          p.materialCode,
          label(/** @type {'production' | 'asn' | 'dispatch'} */ (i.source)),
          String(i.quantity),
          p.uom,
          i.date ?? '',
          i.reference ?? ''
        ]
          .map(quote)
          .join(',')
      )
  );
  return [header.map(quote).join(','), ...lines].join('\n') + '\n';
}

/**
 * BR-11 — the download control. Built in the browser (a Blob link, nothing
 * sent), like the template download.
 * @type {React.FC<{ supplierId: string; positions: readonly InventoryPosition[]; testId: string }>}
 */
export const StockEntriesDownloadButton = ({ supplierId, positions, testId }) => {
  const { t, i18n } = useTranslation();
  const download = () => {
    const csv = stockEntriesCsv(positions, i18n.language.startsWith('id') ? 'id' : 'en');
    if (typeof URL === 'undefined' || typeof URL.createObjectURL !== 'function') return;
    const url = URL.createObjectURL(new Blob([csv], { type: 'text/csv;charset=utf-8' }));
    const a = document.createElement('a');
    a.href = url;
    a.download = `stock-entries-${supplierId}.csv`;
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);
  };
  return (
    <Button variant="secondary" icon={Download} onClick={download} data-testid={testId}>
      {t('inv.sup.entry.download')}
    </Button>
  );
};
