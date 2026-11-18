/** @import React from 'react' */
import { useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useSearchParams } from 'react-router-dom';
import { PencilLine } from 'lucide-react';
import AppShellV2 from '@components/layout-v2/AppShellV2';
import PageHeader from '@components/ui-v2/PageHeader';
import SapDataAgeBanner from '@components/ui-v2/SapDataAgeBanner';
import PageMetaLine from '@components/ui-v2/PageMetaLine';
import SampleDataBadge from '@components/ui-v2/SampleDataBadge';
import SubTabs from '@components/ui-v2/SubTabs';
import FilterChipsBar from '@components/ui-v2/FilterChipsBar';
import Table from '@components/ui-v2/Table';
import TableHeader, { TableHeaderCell } from '@components/ui-v2/TableHeader';
import TableRow from '@components/ui-v2/TableRow';
import TableCell from '@components/ui-v2/TableCell';
import Button from '@components/ui-v2/Button';
import Data from '@components/ui-v2/Data';
import LoadingState from '@components/ui-v2/LoadingState';
import ErrorState from '@components/ui-v2/ErrorState';
import EmptyState from '@components/ui-v2/EmptyState';
import NoSupplierIdentity from '@components/ui-v2/NoSupplierIdentity';
import { HandoffNotice } from '@components/ui-v2/HandoffNotice';
import { useVerbAvailability } from '@hooks/useVerbAvailability';
import { useUrlEnumParam } from '@hooks/useUrlEnumParam';
import { HIGHLIGHTED_ROW_CLASS, useRowHighlight } from '@hooks/useRowHighlight';
import { useCurrentIdentity } from '@context/CurrentIdentityContext';
import { formatDate } from '@lib/format';
import { useInventory, useStockAccess, useSupplierDemandAnticipation } from '@services/query/hooks';
/** @import { InventoryPosition } from '@services/data/types' */
/** @import { MaterialType } from '@services/sdc/types' */
import { stockFreshness } from '@services/transitions/inventoryRules';
import { SUPPLIER_DA_VIEW_ENABLED } from '@services/transitions/supplierDaView';
import {
  Figure,
  LastUpdateCell,
  SupplyPill,
  inventoryNow,
  qty
} from './inventory/inventoryDisplay';
import {
  InProductionCell,
  InTransitCell,
  StockEntriesDownloadButton,
  SupplierStockDrawer
} from './inventory/SupplierStockDrawer';
import FeedstockTableEntry from './inventory/FeedstockTableEntry';
import StockEntryPanel from './inventory/StockEntryPanel';
import StockUploadPanel, {
  StockTemplateDownloadButton,
  StockUploadButton,
  StockUploadResult,
  useStockUpload
} from './inventory/StockUploadPanel';
import SupplierSyncPanel from './inventory/SupplierSyncPanel';
import WeeklyUpdatePanel from './inventory/WeeklyUpdatePanel';
import FeedstockConfirmPanel from './inventory/FeedstockConfirmPanel';
import PtiAsksBlock from './inventory/PtiAsksBlock';
import PrincipalShipmentsSection from './inventory/PrincipalShipmentsSection';
import { PicFilter, usePicFilter } from './materials/picDisplay';
import SupplierMaterialNames from './materials/SupplierMaterialNames';
import { TradeNameBeside } from './materials/tradeNameDisplay';
import MaterialSearch, {
  MaterialMatchReason,
  useMaterialSearch
} from '@components/ui-v2/MaterialSearch';

// ─────────────────────────────────────────────────────────────────────────────
// SUPPLIER STOCK — REQ-E08-01 (SUP view), REQ-E08-02 (template upload, manual
// entry, the supplier's own API Sync — BL-59), REQ-E08-03 (PTI stock where
// granted, and its refresh only then).
//
// One row per material the supplier supplies, from the ONE inventory model:
// its stock on hand, its own reorder point ("Not provided" when absent), what
// is incoming (in production and in transit, with the next date), days of
// supply with its risk class and basis (CR-01, CR-24 — the CR-02 bands only
// where the lead time is missing), and when the figure was last updated,
// how, and whether it is past its data-update SLA. PTI stock columns appear
// only when PTI has granted access, and only carry figures for the permitted
// materials — the read already removed everything else.
//
// Inventory UX S-01 — the page leads with this week and the table: the header
// carries "Enter stock on screen" and "Upload template" (its result directly
// under it), then the one weekly status (S-02), then the tabs — My stock (the
// table), Feedstock to confirm, My materials, Template guide — kept in the
// address as `?tab=`.
// ─────────────────────────────────────────────────────────────────────────────

/** @typedef {'stock' | 'feedstock' | 'materials' | 'template'} StockPageTab */

/** @type {readonly StockPageTab[]} */
const PAGE_TABS = ['stock', 'feedstock', 'materials', 'template'];

/** @type {React.FC} */
const SupplierInventory = () => {
  const { t } = useTranslation();
  const { identity } = useCurrentIdentity();
  const supplierId = identity.supplierId;
  const inventory = useInventory();
  const access = useStockAccess();
  const declare = useVerbAvailability('inventorydeclaration:declare');
  const [type, setType] = useState(/** @type {MaterialType} */ ('VERP'));
  const [typeChosen, setTypeChosen] = useState(false);
  const [entryOpen, setEntryOpen] = useState(false);
  // PSC-2 (BL-337) — the material's drawer: its In Production runs and its shipments.
  const [drawer, setDrawer] = useState(/** @type {InventoryPosition | null} */ (null));
  const [search, setSearch] = useState('');
  const [staleFilter, setStaleFilter] = useState(/** @type {'all' | 'stale'} */ ('all'));
  // Deep-link read: `?stale=stale` narrows "stock figures to update" to the
  // positions past their data-update SLA.
  useUrlEnumParam('stale', /** @type {('all' | 'stale')[]} */ (['all', 'stale']), setStaleFilter);
  // Material C4 — the PIC filter (by name: a supplier never sees the code).
  const pic = usePicFilter();
  // Material C2 / S-01 — the page tabs, kept in the address (`?tab=`).
  const [params, setParams] = useSearchParams();
  const tabParam = /** @type {StockPageTab} */ (params.get('tab'));
  /** @type {StockPageTab} */
  const pageTab = PAGE_TABS.includes(tabParam) ? tabParam : 'stock';
  /** @param {StockPageTab} v */
  const setPageTab = (v) => {
    const next = new URLSearchParams(params);
    if (v === 'stock') next.delete('tab');
    else next.set('tab', v);
    setParams(next, { replace: true });
  };
  // PSC-2 BR-08 / AC-06 — the Supplier, MRP Controller (the `pic` filter) and
  // Packaging Category filters, each kept in the page address. The packaging
  // value reads the SAP material group until a format field is named (BL-329).
  const supplierFilter = params.get('sup') ?? '';
  const packagingFilter = params.get('pkg') ?? '';
  /**
   * Set or clear one address parameter, leaving the others alone.
   * @param {string} key
   * @param {string} value
   */
  const setParam = (key, value) => {
    const next = new URLSearchParams(params);
    if (value === '') next.delete(key);
    else next.set(key, value);
    setParams(next, { replace: true });
  };
  // Material B2 — a missing material's link opens the entry form on it (`?enter=`).
  const enterCode = params.get('enter');
  // PSC-1 (BL-336) — the DA confirmation PRE-FILLS the stock page and writes no
  // stock record: the figure shows here (and in the entry form) until the
  // supplier confirms it through the stock verb, which stays the single entry
  // point. Read through the DA read, only while the supplier DA view is on.
  const daQuery = useSupplierDemandAnticipation(SUPPLIER_DA_VIEW_ENABLED);
  const daPrefill = useMemo(() => {
    /** @type {Record<string, number>} */
    const out = {};
    if (!SUPPLIER_DA_VIEW_ENABLED) return out;
    for (const r of daQuery.data?.items ?? []) {
      if (r.supplierId !== supplierId) continue;
      const v = r.confirmation.soh[r.materialCode];
      if (typeof v === 'number') out[r.materialCode] = v;
    }
    return out;
  }, [daQuery.data, supplierId]);
  const entryInitial = useMemo(() => {
    if (!enterCode || !supplierId) return null;
    // BR-06 — this week's confirmed figure is what the form starts from; the
    // stock record stays the single source the pages read.
    const prefill = daPrefill[enterCode];
    return {
      supplierId,
      materialCode: enterCode,
      ...(typeof prefill === 'number' ? { soh: String(prefill) } : {})
    };
  }, [enterCode, supplierId, daPrefill]);
  const closeEntry = () => {
    setEntryOpen(false);
    if (enterCode !== null) {
      const next = new URLSearchParams(params);
      next.delete('enter');
      setParams(next, { replace: true });
    }
  };
  const nowIso = inventoryNow();
  const crumb = [t('hub.nav.section.planning'), t('inv.sup.title')];

  const rows = useMemo(() => inventory.data?.items ?? [], [inventory.data]);
  // S-01 / S-03 — one upload state: the header control and its result.
  const upload = useStockUpload(supplierId ?? '', rows);
  const highlight = useRowHighlight((id) => rows.some((r) => r.materialCode === id));
  const counts = useMemo(
    () => ({
      ROH: rows.filter((r) => r.materialType === 'ROH').length,
      VERP: rows.filter((r) => r.materialType === 'VERP').length
    }),
    [rows]
  );
  // A NEW `?highlight=<code>` always wins the tab for its own material type,
  // even over an earlier manual pick — mirroring `useRowHighlight`'s own
  // target-change reset: compared and adjusted DURING render
  // (react-hooks/set-state-in-effect), never in an effect. Without this, a
  // second deep link landing on an already-mounted page (typeChosen already
  // true from the first) would leave the tab on the stale pick.
  const [seenHighlightId, setSeenHighlightId] = useState(highlight.id);
  if (seenHighlightId !== highlight.id) {
    setSeenHighlightId(highlight.id);
    if (highlight.id !== null) setTypeChosen(false);
  }
  // `?highlight=<code>`'s own row's type wins over the counts-based default
  // until the user manually picks a tab (`typeChosen`) — a pure render-time
  // derivation, not an effect, so a supplier with both types still lands on
  // the highlighted row's tab the first time it renders with data.
  const highlightRow =
    highlight.id !== null ? rows.find((r) => r.materialCode === highlight.id) : undefined;
  /** @type {MaterialType} */
  const activeType = typeChosen
    ? type
    : (highlightRow?.materialType ?? (counts.VERP > 0 ? 'VERP' : 'ROH'));
  // REQ-E08-01 BR-07 (BL-61) — one list on the supplier view: a supplier
  // normally supplies one material type, so the raw material / packaging split
  // appears only for a supplier that supplies both. The PTI view keeps it.
  const splitByType = counts.ROH > 0 && counts.VERP > 0;
  const ofType = splitByType ? rows.filter((r) => r.materialType === activeType) : rows;
  // PSC-2 BR-08 — the Supplier and Packaging Category filters narrow the table.
  const ofFilters = ofType.filter(
    (r) =>
      (supplierFilter === '' || r.supplierName === supplierFilter) &&
      (packagingFilter === '' || r.materialGroup === packagingFilter)
  );
  // BR-08 — the filter options come from the rows, never a fixed list. A value
  // carried in the address that no row has stays selectable, so a stale link
  // never silently widens the table (the PIC filter's own rule).
  const supplierNames = [
    ...new Set([...rows.map((r) => r.supplierName), ...(supplierFilter ? [supplierFilter] : [])])
  ].sort();
  const packagingGroups = [
    ...new Set([...rows.map((r) => r.materialGroup), ...(packagingFilter ? [packagingFilter] : [])])
  ].sort();
  // BR-06 — the feedstock column is shown for a packaging supplier and hidden
  // for a raw material one; a supplier of both sees it on the packaging rows.
  const showsFeedstock = rows.some((r) => r.materialType === 'VERP');
  const ofStaleFilter =
    staleFilter === 'stale'
      ? ofFilters.filter((r) => stockFreshness(r, nowIso) !== 'current')
      : ofFilters;
  // Material C3 — the one material search (MR-3 BR-04); the names searched are
  // this supplier's own (narrowed in the read model, MAT-R4).
  const shown = useMaterialSearch(
    search,
    ofStaleFilter.filter((r) => pic.matches(r.mrpController)),
    (r) => ({ code: r.materialCode, description: r.materialLabel, supplierId: r.supplierId })
  );
  const sharesPti = rows.some((r) => r.ptiStockShared);
  const grant = (access.data?.items ?? []).find((g) => g.supplierId === supplierId);
  // INV-D11 (S-10) — PTI removed all access: say so, with the date, no reason.
  // The read is the supplier's own grant only; a re-grant makes the latest
  // event a grant, so the line goes.
  const lastAccessEvent = grant?.log[grant.log.length - 1];
  const accessRemovedAt =
    grant && !grant.active && lastAccessEvent?.action === 'remove' ? lastAccessEvent.at : null;

  if (!supplierId) return <NoSupplierIdentity />;
  const pageTabs = (
    <SubTabs
      options={[
        { id: 'stock', label: t('inv.sup.tab.stock') },
        { id: 'feedstock', label: t('inv.sup.tab.feedstock') },
        { id: 'materials', label: t('matName.tab.myMaterials') },
        { id: 'template', label: t('inv.sup.tab.template') }
      ]}
      value={pageTab}
      onChange={setPageTab}
      className="mb-4"
    />
  );
  if (pageTab === 'materials')
    return (
      <AppShellV2>
        <PageHeader
          breadcrumb={crumb}
          title={t('inv.sup.title')}
          subtitle={t('inv.sup.subtitle')}
        />
        {pageTabs}
        <SupplierMaterialNames supplierId={supplierId} />
      </AppShellV2>
    );
  if (inventory.isPending) return <LoadingState breadcrumb={crumb} />;
  if (inventory.isError)
    return (
      <ErrorState breadcrumb={crumb} error={inventory.error} onRetry={() => inventory.refetch()} />
    );
  if (rows.length === 0)
    return (
      <EmptyState
        breadcrumb={crumb}
        title={t('inv.sup.title')}
        subtitle={t('inv.sup.subtitle')}
        message={t('inv.sup.empty')}
      />
    );

  const held = declare.kind === 'held';
  // The empty row spans every rendered column.
  const columnCount = 7 + (sharesPti ? 2 : 0) + (showsFeedstock ? 1 : 0);

  return (
    <AppShellV2>
      <PageHeader
        breadcrumb={crumb}
        title={t('inv.sup.title')}
        subtitle={t('inv.sup.subtitle')}
        actions={
          held ? (
            <div className="flex flex-wrap gap-2">
              <Button
                variant="outline"
                icon={PencilLine}
                onClick={() => setEntryOpen(true)}
                data-testid="stock-entry-open"
              >
                {t('inv.sup.enterOnScreen')}
              </Button>
              <StockTemplateDownloadButton
                supplierId={supplierId}
                positions={rows}
                testId="stock-template-download-header"
              />
              <StockEntriesDownloadButton
                supplierId={supplierId}
                positions={rows}
                testId="stock-entries-download"
              />
              <StockUploadButton upload={upload} />
            </div>
          ) : (
            <HandoffNotice availability={declare} testId="handoff-inventory-declare" />
          )
        }
      />
      <PageMetaLine className="-mt-6 mb-4">
        {t('inv.asOf')} <Data>{formatDate(nowIso)}</Data>
        <SampleDataBadge className="ml-3 align-middle" />
      </PageMetaLine>

      {/* S-03 — the upload result, directly under the header's upload control. */}
      <StockUploadResult upload={upload} />

      {/* Material B2 / S-02 — the one weekly status (manual) or the sync schedule (API). */}
      <WeeklyUpdatePanel supplierId={supplierId} positions={rows} nowIso={nowIso} />

      {/* Inventory UX S-04 (INV-D9) — what PTI is asking, before the tabs. */}
      <PtiAsksBlock supplierId={supplierId} />

      {pageTabs}

      {pageTab === 'feedstock' ? (
        // BL-194 (DRC-8) — the weekly feedstock confirmation; never part of SOH.
        <FeedstockConfirmPanel supplierId={supplierId} positions={rows} nowIso={nowIso} />
      ) : null}
      {pageTab === 'template' ? (
        <StockUploadPanel supplierId={supplierId} positions={rows} />
      ) : null}
      {pageTab === 'stock' ? (
        <>
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

          {accessRemovedAt ? (
            <p className="text-sm text-text-secondary mb-4" data-testid="sup-pti-access-removed">
              {t('inv.sup.access.removed', { date: formatDate(accessRemovedAt) })}
            </p>
          ) : null}

          {grant?.active && (
            <p className="text-sm text-text-secondary mb-4" data-testid="sup-pti-access-note">
              {grant.materials.length === 0
                ? t('inv.sup.access.all')
                : t('inv.sup.access.some', { count: grant.materials.length })}
            </p>
          )}

          <SupplierSyncPanel
            supplierId={supplierId}
            positions={rows}
            grant={grant}
            refetch={() => inventory.refetch()}
          />

          {splitByType && (
            <SubTabs
              options={[
                { id: 'ROH', label: t('inv.type.ROH'), count: counts.ROH },
                { id: 'VERP', label: t('inv.type.VERP'), count: counts.VERP }
              ]}
              value={activeType}
              onChange={(v) => {
                setType(v);
                setTypeChosen(true);
              }}
              className="mb-4"
            />
          )}

          <div className="flex flex-wrap items-center gap-3 mb-4">
            <div className="flex-1 min-w-[240px]">
              <MaterialSearch
                mode="filter"
                query={search}
                onQueryChange={setSearch}
                testId="sup-stock-search"
              />
            </div>
            <FilterChipsBar
              options={[
                { id: 'all', label: t('inv.filter.all') },
                {
                  id: 'stale',
                  label: t('inv.sup.filter.stale'),
                  count: ofType.filter((r) => stockFreshness(r, nowIso) !== 'current').length
                }
              ]}
              value={staleFilter}
              onChange={setStaleFilter}
            />
            {/* PSC-2 BR-08 / AC-06 — Supplier and Packaging Category, both in the address. */}
            <label className="inline-flex items-center gap-2 text-xs text-text-secondary">
              <span>{t('inv.sup.filter.supplier')}</span>
              <select
                data-testid="sup-filter-supplier"
                value={supplierFilter}
                onChange={(e) => setParam('sup', e.target.value)}
                className="h-8 rounded-md border border-border-input bg-white px-2 text-sm text-text-primary max-w-[220px]"
              >
                <option value="">{t('inv.filter.all')}</option>
                {supplierNames.map((name) => (
                  <option key={name} value={name}>
                    {name}
                  </option>
                ))}
              </select>
            </label>
            <label className="inline-flex items-center gap-2 text-xs text-text-secondary">
              <span>{t('inv.sup.filter.packaging')}</span>
              <select
                data-testid="sup-filter-packaging"
                value={packagingFilter}
                onChange={(e) => setParam('pkg', e.target.value)}
                className="h-8 rounded-md border border-border-input bg-white px-2 text-sm text-text-primary max-w-[220px]"
              >
                <option value="">{t('inv.filter.all')}</option>
                {packagingGroups.map((group) => (
                  <option key={group} value={group}>
                    {group}
                  </option>
                ))}
              </select>
            </label>
            <PicFilter
              refs={ofType.map((r) => r.mrpController)}
              persona="supplier"
              filter={pic.filter}
              setFilter={pic.setFilter}
              myCode={pic.myCode}
            />
          </div>

          <div className="bg-bg-surface border border-border-subtle rounded-lg shadow-sm overflow-x-auto">
            <Table>
              <TableHeader>
                <TableHeaderCell>{t('inv.col.material')}</TableHeaderCell>
                {/* PSC-2 BR-02 / BR-03 / TL-D43 — the two figures, never one "Incoming" label. */}
                <TableHeaderCell className="text-right" term="inTransit" />
                <TableHeaderCell className="text-right" term="inProduction" />
                <TableHeaderCell className="text-right" term="supplierStock" />
                <TableHeaderCell className="text-right" term="supplierOwnRop" />
                {sharesPti && <TableHeaderCell className="text-right" term="ptiStock" />}
                {sharesPti && <TableHeaderCell className="text-right" term="ptiRop" />}
                {showsFeedstock && <TableHeaderCell>{t('inv.sup.feedstock.col')}</TableHeaderCell>}
                <TableHeaderCell term="daysOfSupply" />
                <TableHeaderCell>{t('inv.col.lastUpdate')}</TableHeaderCell>
              </TableHeader>
              <tbody>
                {shown.map(({ item: p, match }) => {
                  const isHighlighted = highlight.id === p.materialCode;
                  return (
                    <TableRow
                      key={p.materialCode}
                      ref={isHighlighted ? highlight.scrollRef : undefined}
                      data-testid={`sup-stock-row-${p.materialCode}`}
                      aria-current={isHighlighted ? 'true' : undefined}
                      className={isHighlighted ? HIGHLIGHTED_ROW_CLASS : undefined}
                    >
                      <TableCell>
                        <Data className="text-xs font-bold text-text-primary">
                          {p.materialCode}
                        </Data>
                        <div className="text-sm text-text-primary">{p.materialLabel}</div>
                        <TradeNameBeside
                          name={p.tradeName}
                          viewer="supplier"
                          testId={`sup-stock-trade-name-${p.materialCode}`}
                        />
                        <MaterialMatchReason
                          match={match}
                          testId={`sup-stock-match-${p.materialCode}`}
                        />
                        {/* BR-01 — the row carries its batches. */}
                        {p.batches.length > 0 && (
                          <span
                            className="block text-xs text-text-tertiary"
                            data-testid={`sup-stock-batches-${p.materialCode}`}
                          >
                            {t('inv.sup.batches', { count: p.batches.length })}
                          </span>
                        )}
                      </TableCell>
                      <TableCell className="align-top">
                        <InTransitCell position={p} onOpen={() => setDrawer(p)} />
                      </TableCell>
                      <TableCell className="align-top">
                        <InProductionCell position={p} onOpen={() => setDrawer(p)} />
                      </TableCell>
                      <TableCell
                        className="text-right whitespace-nowrap"
                        data-testid={`sup-stock-soh-${p.materialCode}`}
                      >
                        {p.supplierSoh === null && typeof daPrefill[p.materialCode] === 'number' ? (
                          <span data-testid={`sup-stock-soh-prefill-${p.materialCode}`}>
                            <Data>{`${qty(daPrefill[p.materialCode])} ${p.uom}`}</Data>
                            <span className="block text-xs text-text-tertiary">
                              {t('inv.sup.sohPrefill')}
                            </span>
                          </span>
                        ) : (
                          <Figure
                            value={p.supplierSoh}
                            uom={p.uom}
                            absentKey="inv.figure.noSubmission"
                          />
                        )}
                      </TableCell>
                      <TableCell className="text-right whitespace-nowrap">
                        <Figure
                          value={p.supplierRop}
                          uom={p.uom}
                          absentKey="inv.figure.notProvided"
                        />
                      </TableCell>
                      {sharesPti && (
                        <TableCell className="text-right whitespace-nowrap">
                          {p.ptiStockShared ? (
                            <Figure value={p.ptiSoh} uom={p.uom} absentKey="inv.figure.none" />
                          ) : (
                            <span className="text-xs text-text-tertiary">
                              {t('inv.figure.notShared')}
                            </span>
                          )}
                        </TableCell>
                      )}
                      {sharesPti && (
                        <TableCell className="text-right whitespace-nowrap">
                          {p.ptiStockShared ? (
                            <Figure value={p.ptiRop} uom={p.uom} absentKey="inv.figure.none" />
                          ) : (
                            <span className="text-xs text-text-tertiary">
                              {t('inv.figure.notShared')}
                            </span>
                          )}
                        </TableCell>
                      )}
                      {showsFeedstock && (
                        <TableCell>
                          <FeedstockTableEntry
                            supplierId={supplierId}
                            position={p}
                            nowIso={nowIso}
                            editable={held && p.materialType === 'VERP'}
                          />
                        </TableCell>
                      )}
                      <TableCell>
                        <SupplyPill position={p} />
                      </TableCell>
                      <TableCell>
                        <LastUpdateCell position={p} nowIso={nowIso} />
                      </TableCell>
                    </TableRow>
                  );
                })}
                {shown.length === 0 && (
                  <tr>
                    <td
                      colSpan={columnCount}
                      className="py-10 text-center text-sm text-text-tertiary"
                    >
                      {t('inv.table.empty')}
                    </td>
                  </tr>
                )}
              </tbody>
            </Table>
          </div>

          {/* PEX-16 (BL-279) — shipments from the principal, with a tracking link. */}
          <PrincipalShipmentsSection />
        </>
      ) : null}

      <SupplierStockDrawer position={drawer} onClose={() => setDrawer(null)} />
      {held && (
        <StockEntryPanel
          open={entryOpen || entryInitial !== null}
          onClose={closeEntry}
          mode="supplier"
          positions={rows}
          initial={entryInitial}
        />
      )}
    </AppShellV2>
  );
};

export default SupplierInventory;
