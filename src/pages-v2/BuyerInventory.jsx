/** @import React from 'react' */
import { useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useSearchParams } from 'react-router-dom';
import { MessageSquarePlus, RefreshCw } from 'lucide-react';
import AppShellV2 from '@components/layout-v2/AppShellV2';
import PageHeader from '@components/ui-v2/PageHeader';
import SapDataAgeBanner from '@components/ui-v2/SapDataAgeBanner';
import PageMetaLine from '@components/ui-v2/PageMetaLine';
import SampleDataBadge from '@components/ui-v2/SampleDataBadge';
import SubTabs from '@components/ui-v2/SubTabs';
import FilterChipsBar from '@components/ui-v2/FilterChipsBar';
import MaterialSearch, {
  MaterialMatchReason,
  useMaterialSearch
} from '@components/ui-v2/MaterialSearch';
import Table from '@components/ui-v2/Table';
import TableHeader, { TableHeaderCell } from '@components/ui-v2/TableHeader';
import TableRow from '@components/ui-v2/TableRow';
import TableCell from '@components/ui-v2/TableCell';
import Button from '@components/ui-v2/Button';
import StatusPill from '@components/ui-v2/StatusPill';
import Data from '@components/ui-v2/Data';
import LoadingState from '@components/ui-v2/LoadingState';
import ErrorState from '@components/ui-v2/ErrorState';
import EmptyState from '@components/ui-v2/EmptyState';
import { HandoffNotice } from '@components/ui-v2/HandoffNotice';
import { useVerbAvailability } from '@hooks/useVerbAvailability';
import { useUrlEnumParam } from '@hooks/useUrlEnumParam';
import { HIGHLIGHTED_ROW_CLASS, useRowHighlight } from '@hooks/useRowHighlight';
import { formatDate, formatDateTime, formatNumber } from '@lib/format';
import { useInventory } from '@services/query/hooks';
/** @import { InventoryPosition, RiskClass } from '@services/data/types' */
/** @import { MaterialType } from '@services/sdc/types' */
import {
  daysOfSupply,
  hasLeadTime,
  isPtiBelowRop,
  materialDailyDemand,
  positionRisk,
  stockFreshness
} from '@services/transitions/inventoryRules';
import {
  Figure,
  IncomingButton,
  IncomingPanel,
  LastUpdateCell,
  SupplyPill,
  inventoryNow,
  useInventoryRunner
} from './inventory/inventoryDisplay';
import StockEntryPanel from './inventory/StockEntryPanel';
import MaterialDrawer from './inventory/MaterialDrawer';
import { weeklyUpdateView } from './inventory/WeeklyUpdatePanel';
import { PicFilter, usePicFilter } from './materials/picDisplay';
import { TradeNameBeside } from './materials/tradeNameDisplay';
import TryWhatIfLink from './BuyerWhatIfSandbox/TryWhatIfLink';
import SeeEstimateLink from './inventory/SeeEstimateLink';

// ─────────────────────────────────────────────────────────────────────────────
// PTI INVENTORY — REQ-E08-01 (visibility), REQ-E08-02 (API sync, recording a
// supplier's WhatsApp or email reply).
//
// One row per material × supplier from the ONE inventory model. Inventory UX
// P-01: risk first, six columns — material · supplier, risk · supplier cover
// (CR-24 on supplier stock ÷ demand, INV-D1 / P-08, with PTI cover beside it),
// supplier stock, PTI stock / ROP (red when below), incoming (opening the
// per-date detail, AC-04) and the last update with the stale flag. Four summary
// tiles filter the table. PIC, this cycle, supplier ROP, the system ROP
// Supplier and feedstock live in the material drawer a row opens (P-02). There
// is no "available" figure (BR-01, AC-02). Raw material and packaging are
// separate views (BR-07), with "All types" beside them. Each row opens the
// what-if sandbox on its supplier × material ("Try a what-if", P-07).
// ─────────────────────────────────────────────────────────────────────────────

/** @typedef {'all' | RiskClass | 'stale' | 'belowRop' | 'noLeadTime'} BandFilter */
/** @typedef {MaterialType | 'all'} TypeFilter */

/** @type {readonly BandFilter[]} */
const BAND_FILTERS = ['all', 'high', 'medium', 'low', 'stale', 'belowRop', 'noLeadTime'];

// P-01 — the four summary tiles, each a filter on the table.
// i18n-defer: filter identifiers and CSS classes, not copy — each label renders through t(`inv.tile.<id>`)
/** @type {readonly { id: BandFilter; tone: string }[]} */
const TILES = [
  { id: 'high', tone: 'text-danger' },
  { id: 'belowRop', tone: 'text-warning-hover' },
  { id: 'stale', tone: 'text-warning-hover' },
  { id: 'noLeadTime', tone: '' }
];

/** Stops a click on a control inside a row from also opening the drawer. */
const stopRowClick = (/** @type {React.MouseEvent} */ e) => e.stopPropagation();

/** @type {React.FC} */
const BuyerInventory = () => {
  const { t } = useTranslation();
  const inventory = useInventory();
  const record = useVerbAvailability('inventorydeclaration:record');
  const sync = useVerbAvailability('stocksync:run');
  const { run, pending } = useInventoryRunner();
  const [params] = useSearchParams();
  // `manualType` is `null` until the URL or a click sets it; while it is
  // null, `type` below derives from `?material=`'s own row instead of a
  // fixed default — a pure render-time fallback, not an effect, so a stale
  // lookup (before `rows` has loaded) is never possible.
  const [manualType, setManualType] = useState(/** @type {TypeFilter | null} */ (null));
  const [band, setBand] = useState(/** @type {BandFilter} */ ('all'));
  // Deep-link read: `?type=` / `?band=` narrow the alert's destination;
  // `?material=` (one-shot, like the existing one-shot params elsewhere)
  // pre-fills the search so the row is found regardless of which page it
  // sits on.
  useUrlEnumParam('type', /** @type {TypeFilter[]} */ (['all', 'ROH', 'VERP']), setManualType);
  useUrlEnumParam('band', /** @type {BandFilter[]} */ ([...BAND_FILTERS]), setBand);
  const [search, setSearch] = useState(() => params.get('material') ?? '');
  const [incoming, setIncoming] = useState(/** @type {InventoryPosition | null} */ (null));
  // P-02 — the row whose material drawer is open.
  const [drawer, setDrawer] = useState(/** @type {InventoryPosition | null} */ (null));
  const [recordInitial, setRecordInitial] = useState(
    /** @type {{ supplierId: string; materialCode: string } | null} */ (null)
  );
  // Material C4 — the PIC filter, kept in the page address (MR-5 BR-03).
  const pic = usePicFilter();
  const [recordOpen, setRecordOpen] = useState(false);
  const nowIso = inventoryNow();
  const crumb = [t('hub.nav.section.inventory'), t('inv.pti.title')];

  const rows = useMemo(() => inventory.data?.items ?? [], [inventory.data]);
  const highlight = useRowHighlight((id) =>
    rows.some((r) => `${r.supplierId}-${r.materialCode}` === id)
  );
  const materialParam = params.get('material');
  const materialRow = materialParam
    ? rows.find((r) => r.materialCode === materialParam)
    : undefined;
  const type = manualType ?? materialRow?.materialType ?? /** @type {TypeFilter} */ ('ROH');
  const setType = setManualType;
  const ofType = type === 'all' ? rows : rows.filter((r) => r.materialType === type);
  /**
   * @param {BandFilter} b
   * @param {InventoryPosition} r
   * @returns {boolean}
   */
  const admits = (b, r) =>
    b === 'all'
      ? true
      : b === 'stale'
        ? stockFreshness(r, nowIso) !== 'current'
        : b === 'belowRop'
          ? isPtiBelowRop(r)
          : b === 'noLeadTime'
            ? !hasLeadTime(r.leadTimeDays)
            : positionRisk(r).riskClass === b;
  /** @param {BandFilter} b */
  const bandCount = (b) => ofType.filter((r) => admits(b, r)).length;
  const filtered = ofType.filter((r) => pic.matches(r.mrpController) && admits(band, r));
  // Material C3 — the one material search (MR-3 BR-04): code, PTI description
  // and this row's supplier's approved trade name, best match first. A row
  // whose supplier name holds the query still shows (the search always did).
  const found = useMaterialSearch(search, filtered, (r) => ({
    code: r.materialCode,
    description: r.materialLabel,
    supplierId: r.supplierId
  }));
  const q = search.trim().toLowerCase();
  const bySupplier =
    q === ''
      ? []
      : filtered.filter(
          (r) => r.supplierName.toLowerCase().includes(q) && !found.some((f) => f.item === r)
        );
  const shown = [...found, ...bySupplier.map((item) => ({ item, match: null }))];

  const connected = useMemo(() => {
    const bySupplier = /** @type {Map<string, InventoryPosition>} */ (new Map());
    for (const r of rows)
      if (r.apiConnected && !bySupplier.has(r.supplierId)) bySupplier.set(r.supplierId, r);
    return [...bySupplier.values()];
  }, [rows]);

  // Material B2 — per supplier, this cycle's weekly update: "12 of 15", or
  // "API" for a supplier on the scheduled pull (MR-1 d). Over ALL its rows,
  // not the filtered ones, so the figure does not move with a filter.
  const thisCycle = useMemo(() => {
    const out =
      /** @type {Map<string, { api: true } | { api: false; updated: number; total: number }>} */ (
        new Map()
      );
    for (const supplierId of new Set(rows.map((r) => r.supplierId))) {
      const own = rows.filter((r) => r.supplierId === supplierId);
      if (own.some((r) => r.apiConnected)) {
        out.set(supplierId, { api: true });
        continue;
      }
      const { status } = weeklyUpdateView(supplierId, own, nowIso);
      out.set(supplierId, { api: false, updated: status.updated.length, total: status.total });
    }
    return out;
  }, [rows, nowIso]);

  if (inventory.isPending) return <LoadingState breadcrumb={crumb} />;
  if (inventory.isError)
    return (
      <ErrorState breadcrumb={crumb} error={inventory.error} onRetry={() => inventory.refetch()} />
    );
  if (rows.length === 0)
    return (
      <EmptyState
        breadcrumb={crumb}
        title={t('inv.pti.title')}
        subtitle={t('inv.pti.subtitle')}
        message={t('inv.pti.empty')}
      />
    );

  // P-01 — the tiles count every type, so a tile opens "All types".
  /** @param {BandFilter} b */
  const tileCount = (b) => rows.filter((r) => admits(b, r)).length;
  /** @param {BandFilter} b */
  const pickTile = (b) => {
    setType('all');
    setBand(band === b ? 'all' : b);
  };
  // INV-D1 — PTI cover, the second figure: PTI stock ÷ the material's daily
  // demand across all its suppliers (the basis the projected stock-out rule uses).
  /** @param {InventoryPosition} p */
  const ptiCoverOf = (p) => daysOfSupply(p.ptiSoh, materialDailyDemand(rows, p.materialCode));

  return (
    <AppShellV2>
      <PageHeader
        breadcrumb={crumb}
        title={t('inv.pti.title')}
        subtitle={t('inv.pti.subtitle')}
        actions={
          record.kind === 'held' ? (
            <Button
              variant="outline"
              icon={MessageSquarePlus}
              onClick={() => {
                setRecordInitial(null);
                setRecordOpen(true);
              }}
              data-testid="stock-record-open"
            >
              {t('inv.pti.record')}
            </Button>
          ) : (
            <HandoffNotice availability={record} testId="handoff-inventory-record" />
          )
        }
      />
      <PageMetaLine className="-mt-6 mb-4">
        {t('inv.asOf')} <Data>{formatDate(nowIso)}</Data>
        <SampleDataBadge className="ml-3 align-middle" />
      </PageMetaLine>

      {/* REQ-E07-08 AC-03 — this page reads SAP data; say how old it is. */}
      <SapDataAgeBanner page="inventory" className="mb-4" />

      {highlight.missing ? (
        <div
          role="status"
          data-testid="inv-highlight-missing"
          className="bg-bg-hover border border-border-subtle rounded px-4 py-3 mb-4 text-sm text-text-secondary"
        >
          {t('inv.highlight.missing')}
        </div>
      ) : null}

      <div
        role="group"
        aria-label={t('inv.tiles.label')}
        className="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-4"
        data-testid="inv-tiles"
      >
        {TILES.map((tile) => (
          <button
            key={tile.id}
            type="button"
            aria-pressed={band === tile.id}
            onClick={() => pickTile(tile.id)}
            data-testid={`inv-tile-${tile.id}`}
            className={`text-left bg-bg-surface border rounded-lg px-4 py-3 focus-visible:outline focus-visible:outline-2 focus-visible:outline-action ${band === tile.id ? 'border-action' : 'border-border-subtle hover:bg-bg-hover'}`}
          >
            <span className="block text-label text-text-tertiary uppercase">
              {t(`inv.tile.${tile.id}`)}
            </span>
            <Data
              className={`block text-xl font-semibold ${tile.tone}`}
              data-testid={`inv-tile-${tile.id}-count`}
            >
              {tileCount(tile.id)}
            </Data>
            <span className="block text-xs text-text-secondary">
              {t(`inv.tile.${tile.id}.hint`)}
            </span>
          </button>
        ))}
      </div>

      {connected.length > 0 && (
        <section
          className="bg-bg-surface border border-border-subtle rounded-lg p-4 mb-6"
          data-testid="api-sync"
        >
          <h2 className="text-section text-text-primary">{t('inv.sync.title')}</h2>
          <p className="text-sm text-text-secondary mb-3">{t('inv.sync.subtitle')}</p>
          <ul className="divide-y divide-border-subtle">
            {connected.map((p) => (
              <li
                key={p.supplierId}
                className="py-2 flex flex-wrap items-center justify-between gap-3"
                data-testid={`api-sync-${p.supplierId}`}
              >
                <div>
                  <div className="text-sm text-text-primary">{p.supplierName}</div>
                  <div className="text-xs text-text-secondary">
                    {p.lastSync === null ? (
                      t('inv.sync.never')
                    ) : p.lastSync.outcome === 'success' ? (
                      <>
                        {t('inv.sync.lastSuccess')} <Data>{formatDateTime(p.lastSync.at)}</Data>
                      </>
                    ) : (
                      <span className="text-danger" data-testid={`api-sync-error-${p.supplierId}`}>
                        {t('inv.sync.lastFailed', {
                          error: t(`inv.sync.error.${p.lastSync.errorKey ?? 'timeout'}`)
                        })}{' '}
                        <Data>{formatDateTime(p.lastSync.at)}</Data> · {t('inv.sync.keptStale')}
                      </span>
                    )}
                  </div>
                </div>
                {sync.kind === 'held' ? (
                  <Button
                    variant="outline"
                    icon={RefreshCw}
                    disabled={pending}
                    onClick={() =>
                      void run(
                        { verb: 'sync', supplierId: p.supplierId },
                        t('inv.sync.done', { supplier: p.supplierName })
                      )
                    }
                    aria-label={t('inv.sync.button', { supplier: p.supplierName })}
                  >
                    {t('inv.sync.action')}
                  </Button>
                ) : (
                  <HandoffNotice availability={sync} testId="handoff-stock-sync" />
                )}
              </li>
            ))}
          </ul>
        </section>
      )}

      <SubTabs
        options={[
          { id: 'all', label: t('inv.type.all'), count: rows.length },
          {
            id: 'ROH',
            label: t('inv.type.ROH'),
            count: rows.filter((r) => r.materialType === 'ROH').length
          },
          {
            id: 'VERP',
            label: t('inv.type.VERP'),
            count: rows.filter((r) => r.materialType === 'VERP').length
          }
        ]}
        value={type}
        onChange={setType}
        className="mb-4"
      />

      <div className="flex flex-wrap items-center gap-3 mb-4">
        <div className="flex-1 min-w-[240px]">
          <MaterialSearch
            mode="filter"
            query={search}
            onQueryChange={setSearch}
            placeholder={t('inv.search')}
            testId="pti-stock-search"
          />
        </div>
        <FilterChipsBar
          options={
            /** @type {BandFilter[]} */ (BAND_FILTERS.slice(0, 5)).map((b) => ({
              id: b,
              label: `${b === 'high' || b === 'medium' || b === 'low' ? t(`inv.risk.${b}`) : t(`inv.filter.${b}`)} (${bandCount(b)})`
            }))
          }
          value={band}
          onChange={setBand}
        />
        <PicFilter
          refs={ofType.map((r) => r.mrpController)}
          persona="buyer"
          filter={pic.filter}
          setFilter={pic.setFilter}
          myCode={pic.myCode}
        />
      </div>

      <div className="bg-bg-surface border border-border-subtle rounded-lg shadow-sm overflow-x-auto">
        <Table>
          <TableHeader>
            <TableHeaderCell pin="left">{t('inv.col.materialSupplier')}</TableHeaderCell>
            <TableHeaderCell>{t('inv.col.riskCover')}</TableHeaderCell>
            <TableHeaderCell className="text-right">{t('inv.col.supplierSoh')}</TableHeaderCell>
            <TableHeaderCell className="text-right">{t('inv.col.ptiSohRop')}</TableHeaderCell>
            <TableHeaderCell>{t('inv.col.incoming')}</TableHeaderCell>
            <TableHeaderCell>{t('inv.col.updated')}</TableHeaderCell>
          </TableHeader>
          <tbody>
            {shown.map(({ item: p, match }) => {
              const rowId = `${p.supplierId}-${p.materialCode}`;
              const isHighlighted = highlight.id === rowId;
              const ptiCover = ptiCoverOf(p);
              return (
                <TableRow
                  key={rowId}
                  ref={isHighlighted ? highlight.scrollRef : undefined}
                  data-testid={`pti-stock-row-${p.supplierId}-${p.materialCode}`}
                  aria-current={isHighlighted ? 'true' : undefined}
                  className={isHighlighted ? HIGHLIGHTED_ROW_CLASS : undefined}
                  onClick={() => setDrawer(p)}
                >
                  <TableCell pin="left">
                    <Data className="text-xs font-bold text-text-primary whitespace-nowrap">
                      {p.materialCode}
                    </Data>
                    <div className="text-sm text-text-primary">{p.materialLabel}</div>
                    <div className="text-xs text-text-secondary">{p.supplierName}</div>
                    {/* Material C2 — the supplier's approved trade name (MR-3 d, planner step 3). */}
                    <TradeNameBeside
                      name={p.tradeName}
                      viewer="pti"
                      testId={`pti-stock-trade-name-${p.supplierId}-${p.materialCode}`}
                    />
                    <MaterialMatchReason
                      match={match}
                      testId={`pti-stock-match-${p.supplierId}-${p.materialCode}`}
                    />
                    {p.consignment && (
                      <StatusPill variant="info" className="mt-1">
                        {t('inv.consignment')}
                      </StatusPill>
                    )}
                    <div onClick={stopRowClick}>
                      <TryWhatIfLink
                        materialCode={p.materialCode}
                        supplierId={p.supplierId}
                        supplierName={p.supplierName}
                        testId={`pti-stock-whatif-${p.supplierId}-${p.materialCode}`}
                      />
                      <span aria-hidden="true" className="mx-1.5 text-xs text-text-tertiary">
                        ·
                      </span>
                      <SeeEstimateLink
                        materialCode={p.materialCode}
                        supplierId={p.supplierId}
                        supplierName={p.supplierName}
                        testId={`pti-stock-estimate-${p.supplierId}-${p.materialCode}`}
                      />
                    </div>
                  </TableCell>
                  <TableCell>
                    <SupplyPill position={p} />
                    {/* INV-D1 — PTI cover beside supplier cover, a second figure. */}
                    <span
                      className="block text-xs text-text-tertiary whitespace-nowrap"
                      data-testid={`pti-cover-${rowId}`}
                    >
                      {ptiCover === null
                        ? t('inv.ptiCover.none')
                        : t('inv.ptiCover', { count: Math.floor(ptiCover) })}
                    </span>
                  </TableCell>
                  <TableCell className="text-right whitespace-nowrap">
                    <Figure value={p.supplierSoh} uom={p.uom} absentKey="inv.figure.noSubmission" />
                  </TableCell>
                  <TableCell
                    className="text-right whitespace-nowrap"
                    data-testid={`pti-stock-pti-${rowId}`}
                    data-below={isPtiBelowRop(p) ? 'true' : undefined}
                  >
                    {p.ptiSoh !== null && isPtiBelowRop(p) ? (
                      <Data className="text-danger">{`${formatNumber(p.ptiSoh)} ${p.uom}`}</Data>
                    ) : (
                      <Figure value={p.ptiSoh} uom={p.uom} absentKey="inv.figure.none" />
                    )}
                    <span className="text-text-tertiary"> / </span>
                    <Figure value={p.ptiRop} uom={p.uom} absentKey="inv.figure.none" />
                  </TableCell>
                  <TableCell>
                    <span onClick={stopRowClick}>
                      <IncomingButton position={p} onOpen={() => setIncoming(p)} />
                    </span>
                  </TableCell>
                  <TableCell>
                    <LastUpdateCell position={p} nowIso={nowIso} />
                  </TableCell>
                </TableRow>
              );
            })}
            {shown.length === 0 && (
              <tr>
                <td colSpan={6} className="py-10 text-center text-sm text-text-tertiary">
                  {t('inv.table.empty')}
                </td>
              </tr>
            )}
          </tbody>
        </Table>
      </div>

      <IncomingPanel position={incoming} base="/buyer" onClose={() => setIncoming(null)} />
      {drawer ? (
        <MaterialDrawer
          position={drawer}
          risk={positionRisk(drawer)}
          ptiCover={ptiCoverOf(drawer)}
          cycle={thisCycle.get(drawer.supplierId)}
          onRecord={
            record.kind === 'held'
              ? () => {
                  setRecordInitial({
                    supplierId: drawer.supplierId,
                    materialCode: drawer.materialCode
                  });
                  setDrawer(null);
                  setRecordOpen(true);
                }
              : null
          }
          onSync={
            drawer.apiConnected && sync.kind === 'held'
              ? () =>
                  void run(
                    { verb: 'sync', supplierId: drawer.supplierId },
                    t('inv.sync.done', { supplier: drawer.supplierName })
                  )
              : null
          }
          syncPending={pending}
          onClose={() => setDrawer(null)}
        />
      ) : null}
      {record.kind === 'held' && (
        <StockEntryPanel
          open={recordOpen}
          onClose={() => setRecordOpen(false)}
          mode="pti"
          positions={rows}
          initial={recordInitial}
        />
      )}
    </AppShellV2>
  );
};

export default BuyerInventory;
