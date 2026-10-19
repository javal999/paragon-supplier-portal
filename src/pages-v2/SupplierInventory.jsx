/** @import React from 'react' */
import { useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useSearchParams } from 'react-router-dom';
import { AlertTriangle, PencilLine } from 'lucide-react';
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
import { useInventory, useStockAccess } from '@services/query/hooks';
/** @import { InventoryPosition } from '@services/data/types' */
/** @import { MaterialType } from '@services/sdc/types' */
import { stockFreshness } from '@services/transitions/inventoryRules';
import {
  Figure,
  IncomingButton,
  IncomingPanel,
  LastUpdateCell,
  SupplyPill,
  inventoryNow
} from './inventory/inventoryDisplay';
import StockEntryPanel from './inventory/StockEntryPanel';
import StockUploadPanel from './inventory/StockUploadPanel';
import SupplierSyncPanel from './inventory/SupplierSyncPanel';
import WeeklyUpdatePanel from './inventory/WeeklyUpdatePanel';
import FeedstockConfirmPanel from './inventory/FeedstockConfirmPanel';
import { PicCell, PicFilter, PicHeader, usePicFilter } from './materials/picDisplay';
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
// ─────────────────────────────────────────────────────────────────────────────

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
  const [incoming, setIncoming] = useState(/** @type {InventoryPosition | null} */ (null));
  const [search, setSearch] = useState('');
  const [staleFilter, setStaleFilter] = useState(/** @type {'all' | 'stale'} */ ('all'));
  // Deep-link read: `?stale=stale` narrows "stock figures to update" to the
  // positions past their data-update SLA.
  useUrlEnumParam('stale', /** @type {('all' | 'stale')[]} */ (['all', 'stale']), setStaleFilter);
  // Material C4 — the PIC filter (by name: a supplier never sees the code).
  const pic = usePicFilter();
  // Material C2 — the "My materials" tab (trade names), kept in the address.
  const [params, setParams] = useSearchParams();
  /** @type {'stock' | 'materials'} */
  const pageTab = params.get('tab') === 'materials' ? 'materials' : 'stock';
  /** @param {'stock' | 'materials'} v */
  const setPageTab = (v) => {
    const next = new URLSearchParams(params);
    if (v === 'materials') next.set('tab', 'materials');
    else next.delete('tab');
    setParams(next, { replace: true });
  };
  // Material B2 — a missing material's link opens the entry form on it (`?enter=`).
  const enterCode = params.get('enter');
  const entryInitial = useMemo(
    () => (enterCode && supplierId ? { supplierId, materialCode: enterCode } : null),
    [enterCode, supplierId]
  );
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
  const ofStaleFilter =
    staleFilter === 'stale'
      ? ofType.filter((r) => stockFreshness(r, nowIso) !== 'current')
      : ofType;
  // Material C3 — the one material search (MR-3 BR-04); the names searched are
  // this supplier's own (narrowed in the read model, MAT-R4).
  const shown = useMaterialSearch(
    search,
    ofStaleFilter.filter((r) => pic.matches(r.mrpController)),
    (r) => ({ code: r.materialCode, description: r.materialLabel, supplierId: r.supplierId })
  );
  const needUpdate = rows.filter((r) => stockFreshness(r, nowIso) !== 'current').length;
  const sharesPti = rows.some((r) => r.ptiStockShared);
  const grant = (access.data?.items ?? []).find((g) => g.supplierId === supplierId);

  if (!supplierId) return <NoSupplierIdentity />;
  const pageTabs = (
    <SubTabs
      options={[
        { id: 'stock', label: t('matName.tab.stock') },
        { id: 'materials', label: t('matName.tab.myMaterials') }
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

  return (
    <AppShellV2>
      <PageHeader
        breadcrumb={crumb}
        title={t('inv.sup.title')}
        subtitle={t('inv.sup.subtitle')}
        actions={
          held ? (
            <Button
              variant="outline"
              icon={PencilLine}
              onClick={() => setEntryOpen(true)}
              data-testid="stock-entry-open"
            >
              {t('inv.sup.enter')}
            </Button>
          ) : (
            <HandoffNotice availability={declare} testId="handoff-inventory-declare" />
          )
        }
      />
      <PageMetaLine className="-mt-6 mb-4">
        {t('inv.asOf')} <Data>{formatDate(nowIso)}</Data>
        <SampleDataBadge className="ml-3 align-middle" />
      </PageMetaLine>

      {pageTabs}

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

      {/* Material B2 — the weekly update (manual) or the sync schedule (API). */}
      <WeeklyUpdatePanel supplierId={supplierId} positions={rows} nowIso={nowIso} />
      {/* BL-194 (DRC-8) — the weekly feedstock confirmation; never part of SOH. */}
      <FeedstockConfirmPanel supplierId={supplierId} positions={rows} nowIso={nowIso} />

      {needUpdate > 0 && (
        <div
          role="status"
          data-testid="sup-stock-banner"
          className="bg-warning-soft border-l-2 border-warning rounded px-4 py-3 mb-4 text-sm text-warning-hover flex items-center gap-2"
        >
          <AlertTriangle size={14} aria-hidden="true" />
          {t('inv.sup.banner.update', { count: needUpdate })}
        </div>
      )}

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

      <StockUploadPanel supplierId={supplierId} positions={rows} canSubmit={held} />

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
            <TableHeaderCell>
              <PicHeader />
            </TableHeaderCell>
            <TableHeaderCell className="text-right">{t('inv.col.supplierSoh')}</TableHeaderCell>
            <TableHeaderCell className="text-right">{t('inv.col.yourRop')}</TableHeaderCell>
            {sharesPti && (
              <TableHeaderCell className="text-right">{t('inv.col.ptiSoh')}</TableHeaderCell>
            )}
            {sharesPti && (
              <TableHeaderCell className="text-right">{t('inv.col.ptiRop')}</TableHeaderCell>
            )}
            <TableHeaderCell>{t('inv.col.incoming')}</TableHeaderCell>
            <TableHeaderCell>{t('inv.col.daysOfSupply')}</TableHeaderCell>
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
                    <Data className="text-xs font-bold text-text-primary">{p.materialCode}</Data>
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
                  </TableCell>
                  <TableCell>
                    <PicCell value={p.mrpController} testId={`sup-stock-pic-${p.materialCode}`} />
                  </TableCell>
                  <TableCell className="text-right whitespace-nowrap">
                    <Figure value={p.supplierSoh} uom={p.uom} absentKey="inv.figure.noSubmission" />
                  </TableCell>
                  <TableCell className="text-right whitespace-nowrap">
                    <Figure value={p.supplierRop} uom={p.uom} absentKey="inv.figure.notProvided" />
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
                  <TableCell>
                    <IncomingButton position={p} onOpen={() => setIncoming(p)} />
                  </TableCell>
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
                <td colSpan={9} className="py-10 text-center text-sm text-text-tertiary">
                  {t('inv.table.empty')}
                </td>
              </tr>
            )}
          </tbody>
        </Table>
      </div>

      <IncomingPanel position={incoming} base="/supplier" onClose={() => setIncoming(null)} />
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
