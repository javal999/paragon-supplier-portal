/** @import React from 'react' */
import { useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import Data from '@components/ui-v2/Data';
import StatusPill from '@components/ui-v2/StatusPill';
import SubTabs from '@components/ui-v2/SubTabs';
import { useCapacityHeadsUp } from '@services/query/hooks';
import { treemapLayout } from '@services/transitions/capacityHeadsUpRules';
/** @import { HeadsUpBand, HeadsUpMonth, HeadsUpShare } from '@services/transitions/capacityHeadsUpRules' */
/** @import { HeadsUpRow } from '@services/data/mock/capacityHeadsUpReadModel' */
import { LtpCheckPill, inputClass, labelClass, qty } from './inventoryDisplay';
import { usePlanningGroupLabel } from './planningGroupDisplay';

// ─────────────────────────────────────────────────────────────────────────────
// PEX-4 (BL-269) — CAPACITY HEADS-UP. 12 months per supplier × planning group:
// the confirmed capacity (weeks 1–13 from the weekly entry, later months from
// the supplier's monthly entry), PTI's demand (the LTP the demand anticipation
// reads), utilisation % and its band, with the split per material and per brand.
// The table is the primary view; the treemap is a second tab with the same
// figures (colour is never the only signal: every tile prints its %).
//
// Bands: within (green), needs additional capacity (amber), cannot be supplied
// (red) as built, and a month under 70% utilisation is "Under-used, needs
// attention" in a NEUTRAL BLUE outline, not amber, so it does not read as a
// supply risk. A month with no confirmed capacity reads "No capacity
// confirmed", never 0%. Every figure is the read's; none is computed here.
// ─────────────────────────────────────────────────────────────────────────────

/**
 * @param {number | null} pct
 * @returns {string}
 */
const pctText = (pct) => (pct === null ? '—' : `${pct}%`);

/** The tile and cell outline of a band; under-used is a neutral blue outline (BR-04). */
/** @type {Record<HeadsUpBand, string>} */
export const BAND_TILE = {
  within: 'bg-success-soft border-success/40',
  needsAdditional: 'bg-warning-soft border-warning/40',
  cannotSupply: 'bg-danger-soft border-danger/40',
  underUsed: 'bg-white border-2 border-action',
  unconfirmed: 'bg-bg-hover border-border-subtle'
};

/**
 * The band's pill: the built three and "no capacity" are the capacity-state pill;
 * under-used is its own, in the info (blue) family.
 * @type {React.FC<{ band: HeadsUpBand; testId?: string }>}
 */
export const BandPill = ({ band, testId }) => {
  const { t } = useTranslation();
  if (band === 'underUsed')
    return (
      <span data-testid={testId} data-pill="capacity-state" data-level="underUsed" data-tone="info">
        <StatusPill variant="info">{t('capHeadsUp.band.underUsed')}</StatusPill>
      </span>
    );
  return <LtpCheckPill level={band} testId={testId} />;
};

/** @type {React.FC<{ m: HeadsUpMonth; rowKey: string }>} */
const MonthCell = ({ m, rowKey }) => {
  const { t } = useTranslation();
  return (
    <td
      className={`px-2 py-2 align-top text-xs min-w-[7.5rem] border ${BAND_TILE[m.band]}`}
      data-testid={`caphu-cell-${rowKey}-${m.month}`}
      data-band={m.band}
    >
      <div className="text-sm font-semibold">
        {m.utilisationPct === null ? (
          <span className="text-text-secondary" data-testid={`caphu-pct-${rowKey}-${m.month}`}>
            {t('capHeadsUp.noCapacity')}
          </span>
        ) : (
          <Data data-testid={`caphu-pct-${rowKey}-${m.month}`}>{pctText(m.utilisationPct)}</Data>
        )}
      </div>
      <div className="text-text-secondary">
        {t('capHeadsUp.demand')} <Data>{qty(m.demand)}</Data>
      </div>
      {m.capacity !== null ? (
        <div className="text-text-secondary">
          {t('capHeadsUp.capacity')} <Data>{qty(m.capacity)}</Data>{' '}
          <span className="text-text-tertiary">
            {m.source === 'monthly' ? t('capHeadsUp.byMonth') : t('capHeadsUp.byWeek')}
          </span>
        </div>
      ) : null}
      <div className="mt-1">
        <BandPill band={m.band} />
      </div>
    </td>
  );
};

/** @type {React.FC<{ share: HeadsUpShare }>} */
const ShareCell = ({ share }) => (
  <td className="px-2 py-1 text-xs align-top">
    <Data>{pctText(share.utilisationPct)}</Data>{' '}
    <span className="text-text-tertiary">
      (<Data>{qty(share.demand)}</Data>)
    </span>
  </td>
);

/** @type {React.FC<{ row: HeadsUpRow }>} */
const HeadsUpTable = ({ row }) => {
  const { t } = useTranslation();
  const groupLabel = usePlanningGroupLabel();
  const [open, setOpen] = useState(false);
  const rowKey = `${row.supplierId}-${row.planningGroupId}`;
  return (
    <section
      className="bg-bg-surface border border-border-subtle rounded-lg shadow-sm"
      data-testid={`caphu-card-${rowKey}`}
    >
      <header className="px-4 py-3 flex flex-wrap items-baseline gap-x-3 gap-y-1">
        <span className="text-sm font-semibold text-text-primary">{row.supplierName}</span>
        <span className="text-sm text-text-secondary">{groupLabel(row.planningGroupId)}</span>
        <span className="text-xs text-text-tertiary">{row.uom}</span>
      </header>
      <div className="overflow-x-auto px-4 pb-2">
        <table className="border-separate border-spacing-1 text-left">
          <thead>
            <tr>
              <th scope="col" className="px-2 text-xs text-text-tertiary" />
              {row.months.map((m) => (
                <th key={m.month} scope="col" className="px-2 text-xs text-text-tertiary">
                  <Data>{m.month}</Data>
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            <tr>
              <th scope="row" className="px-2 text-xs text-text-tertiary align-top">
                {t('capHeadsUp.utilisation')}
              </th>
              {row.months.map((m) => (
                <MonthCell key={m.month} m={m} rowKey={rowKey} />
              ))}
            </tr>
            {open ? (
              <>
                <tr>
                  <th scope="col" colSpan={13} className="px-2 pt-2 text-xs text-text-tertiary">
                    {t('capHeadsUp.byMaterial')}
                  </th>
                </tr>
                {row.byMaterial.map((m) => (
                  <tr
                    key={m.materialCode}
                    data-testid={`caphu-material-${rowKey}-${m.materialCode}`}
                  >
                    <th scope="row" className="px-2 text-xs font-normal align-top">
                      <Data>{m.materialCode}</Data>{' '}
                      <span className="text-text-secondary">
                        {row.materialLabels[m.materialCode]}
                      </span>
                    </th>
                    {m.months.map((s) => (
                      <ShareCell key={s.month} share={s} />
                    ))}
                  </tr>
                ))}
                <tr>
                  <th scope="col" colSpan={13} className="px-2 pt-2 text-xs text-text-tertiary">
                    {t('capHeadsUp.byBrand')}
                  </th>
                </tr>
                {row.byBrand.map((b) => (
                  <tr key={b.brand} data-testid={`caphu-brand-${rowKey}-${b.brand}`}>
                    <th scope="row" className="px-2 text-xs font-normal align-top">
                      {b.brand}
                    </th>
                    {b.months.map((s) => (
                      <ShareCell key={s.month} share={s} />
                    ))}
                  </tr>
                ))}
              </>
            ) : null}
          </tbody>
        </table>
      </div>
      <div className="px-4 pb-3">
        <button
          type="button"
          className="text-xs text-action-hover hover:underline"
          aria-expanded={open}
          onClick={() => setOpen(!open)}
          data-testid={`caphu-breakdown-${rowKey}`}
        >
          {open ? t('capHeadsUp.hideBreakdown') : t('capHeadsUp.showBreakdown')}
        </button>
        <p className="text-xs text-text-tertiary mt-1">{t('capHeadsUp.breakdownNote')}</p>
      </div>
    </section>
  );
};

const TREEMAP_W = 480;
const TREEMAP_H = 220;

/**
 * BR-05 — one supplier's treemap for a month: tile size = confirmed capacity,
 * tile colour = the band, each tile prints its %.
 * @type {React.FC<{ supplierName: string; rows: readonly HeadsUpRow[]; month: string }>}
 */
const SupplierTreemap = ({ supplierName, rows, month }) => {
  const { t } = useTranslation();
  const groupLabel = usePlanningGroupLabel();
  const items = rows.map((r) => {
    const m = /** @type {HeadsUpMonth} */ (r.months.find((x) => x.month === month));
    return { row: r, m, size: m.capacity ?? 0 };
  });
  const tiles = treemapLayout(items, TREEMAP_W, TREEMAP_H);
  const none = items.filter((i) => i.size <= 0);
  return (
    <section
      className="bg-bg-surface border border-border-subtle rounded-lg shadow-sm p-4"
      data-testid={`caphu-tree-${rows[0].supplierId}`}
    >
      <h3 className="text-sm font-semibold text-text-primary mb-2">{supplierName}</h3>
      <div
        className="relative border border-border-subtle"
        style={{ width: '100%', maxWidth: TREEMAP_W, aspectRatio: `${TREEMAP_W} / ${TREEMAP_H}` }}
      >
        {tiles.map((tile) => (
          <div
            key={tile.row.planningGroupId}
            className={`absolute overflow-hidden p-1 text-xs border ${BAND_TILE[tile.m.band]}`}
            style={{
              left: `${(tile.x / TREEMAP_W) * 100}%`,
              top: `${(tile.y / TREEMAP_H) * 100}%`,
              width: `${(tile.w / TREEMAP_W) * 100}%`,
              height: `${(tile.h / TREEMAP_H) * 100}%`
            }}
            data-testid={`caphu-tile-${tile.row.supplierId}-${tile.row.planningGroupId}`}
            data-band={tile.m.band}
            title={`${groupLabel(tile.row.planningGroupId)} · ${t(
              tile.m.band === 'underUsed'
                ? 'capHeadsUp.band.underUsed'
                : `inv.ltp.level.${tile.m.band}`
            )}`}
          >
            <div className="font-semibold truncate">{groupLabel(tile.row.planningGroupId)}</div>
            <div>
              <Data>{pctText(tile.m.utilisationPct)}</Data>
            </div>
            <div className="text-text-secondary truncate">
              {tile.m.band === 'underUsed'
                ? t('capHeadsUp.band.underUsed')
                : t(`inv.ltp.level.${tile.m.band}`)}
            </div>
          </div>
        ))}
        {tiles.length === 0 ? (
          <p className="p-3 text-sm text-text-tertiary">{t('capHeadsUp.treemapEmpty')}</p>
        ) : null}
      </div>
      {none.length > 0 ? (
        <p
          className="text-xs text-text-tertiary mt-2"
          data-testid={`caphu-tree-none-${rows[0].supplierId}`}
        >
          {t('capHeadsUp.treemapNone', {
            groups: none.map((i) => groupLabel(i.row.planningGroupId)).join(', ')
          })}
        </p>
      ) : null}
    </section>
  );
};

/**
 * @type {React.FC<{ supplierId?: string | null }>}
 */
const CapacityHeadsUpSection = ({ supplierId = null }) => {
  const { t } = useTranslation();
  const query = useCapacityHeadsUp();
  const [tab, setTab] = useState(/** @type {'table' | 'treemap'} */ ('table'));
  const [month, setMonth] = useState('');
  const rows = useMemo(
    () => (query.data?.items ?? []).filter((r) => !supplierId || r.supplierId === supplierId),
    [query.data, supplierId]
  );
  if (query.isPending || query.isError || rows.length === 0) return null;
  const months = rows[0].months.map((m) => m.month);
  const chosen = month || months[0];
  /** @type {Map<string, HeadsUpRow[]>} */
  const bySupplier = new Map();
  for (const r of rows) bySupplier.set(r.supplierId, [...(bySupplier.get(r.supplierId) ?? []), r]);
  // A supplier with no confirmed capacity in the month has nothing to draw: one line names them.
  const entries = [...bySupplier.entries()];
  const hasCapacity = (/** @type {HeadsUpRow[]} */ list) =>
    list.some((r) => (r.months.find((m) => m.month === chosen)?.capacity ?? 0) > 0);
  const drawn = entries.filter(([, list]) => hasCapacity(list));
  const undrawn = entries.filter(([, list]) => !hasCapacity(list));
  return (
    <section className="mt-8" data-testid="capacity-heads-up">
      <h2 className="text-lg font-semibold text-text-primary mb-1">{t('capHeadsUp.title')}</h2>
      <p className="text-xs text-text-tertiary mb-3">{t('capHeadsUp.intro')}</p>
      <SubTabs
        value={tab}
        onChange={setTab}
        options={[
          { id: 'table', label: t('capHeadsUp.tab.table') },
          { id: 'treemap', label: t('capHeadsUp.tab.treemap') }
        ]}
        className="mb-3"
      />
      {tab === 'table' ? (
        <div className="space-y-3" data-testid="caphu-table">
          {rows.map((r) => (
            <HeadsUpTable key={`${r.supplierId}-${r.planningGroupId}`} row={r} />
          ))}
        </div>
      ) : (
        <>
          <div className="max-w-xs mb-3">
            <label htmlFor="caphu-month" className={labelClass}>
              {t('capHeadsUp.month')}
            </label>
            <select
              id="caphu-month"
              className={inputClass}
              value={chosen}
              onChange={(e) => setMonth(e.target.value)}
              data-testid="caphu-month"
            >
              {months.map((m) => (
                <option key={m} value={m}>
                  {m}
                </option>
              ))}
            </select>
          </div>
          <div className="grid grid-cols-1 xl:grid-cols-2 gap-3" data-testid="caphu-treemap">
            {drawn.map(([id, list]) => (
              <SupplierTreemap
                key={id}
                supplierName={list[0].supplierName}
                rows={list}
                month={chosen}
              />
            ))}
          </div>
          {undrawn.length > 0 ? (
            <p className="text-xs text-text-tertiary mt-3" data-testid="caphu-tree-undrawn">
              {t('capHeadsUp.treemapSuppliersNone', {
                suppliers: undrawn.map(([, list]) => list[0].supplierName).join(', ')
              })}
            </p>
          ) : null}
        </>
      )}
    </section>
  );
};

export default CapacityHeadsUpSection;
