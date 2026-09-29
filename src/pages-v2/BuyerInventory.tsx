import React, { useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { AlertTriangle, MessageSquarePlus, RefreshCw } from 'lucide-react';
import AppShellV2 from '../components/layout-v2/AppShellV2';
import PageHeader from '../components/ui-v2/PageHeader';
import SapDataAgeBanner from '../components/ui-v2/SapDataAgeBanner';
import PageMetaLine from '../components/ui-v2/PageMetaLine';
import SampleDataBadge from '../components/ui-v2/SampleDataBadge';
import SubTabs from '../components/ui-v2/SubTabs';
import FilterChipsBar from '../components/ui-v2/FilterChipsBar';
import SearchBar from '../components/ui-v2/SearchBar';
import Table from '../components/ui-v2/Table';
import TableHeader, { TableHeaderCell } from '../components/ui-v2/TableHeader';
import TableRow from '../components/ui-v2/TableRow';
import TableCell from '../components/ui-v2/TableCell';
import Button from '../components/ui-v2/Button';
import StatusPill from '../components/ui-v2/StatusPill';
import Data from '../components/ui-v2/Data';
import LoadingState from '../components/ui-v2/LoadingState';
import ErrorState from '../components/ui-v2/ErrorState';
import EmptyState from '../components/ui-v2/EmptyState';
import { HandoffNotice } from '../components/ui-v2/HandoffNotice';
import { useVerbAvailability } from '../hooks/useVerbAvailability';
import { formatDate, formatDateTime } from '../lib/format';
import { useInventory } from '../services/query/hooks';
import type { InventoryPosition, RiskClass } from '../services/data/types';
import type { MaterialType } from '../services/sdc/types';
import { hasLeadTime, positionRisk, stockFreshness } from '../services/transitions/inventoryRules';
import {
  Figure,
  IncomingButton,
  IncomingPanel,
  LastUpdateCell,
  SupplyPill,
  inventoryNow,
  useInventoryRunner,
} from './inventory/inventoryDisplay';
import StockEntryPanel from './inventory/StockEntryPanel';
import { PicCell, PicFilter, PicHeader, usePicFilter } from './materials/picDisplay';
import { TradeNameBeside } from './materials/tradeNameDisplay';

// ─────────────────────────────────────────────────────────────────────────────
// PTI INVENTORY — REQ-E08-01 (visibility), REQ-E08-02 (API sync, recording a
// supplier's WhatsApp or email reply).
//
// One row per material × supplier from the ONE inventory model: supplier SOH,
// PTI SOH, PTI ROP, supplier ROP, incoming split into in production and in
// transit with the next date (opening the per-date detail), days of supply
// with its risk class and the basis it was decided on (CR-24: lead time, or the
// CR-02 bands where the lead time is missing), and the last update time with
// the stale flag. There is no
// "available" figure (BR-01, AC-02). Raw material and packaging are separate
// views (BR-07).
// ─────────────────────────────────────────────────────────────────────────────

type BandFilter = 'all' | RiskClass | 'stale';

const BuyerInventory: React.FC = () => {
  const { t } = useTranslation();
  const inventory = useInventory();
  const record = useVerbAvailability('inventorydeclaration:record');
  const sync = useVerbAvailability('stocksync:run');
  const { run, pending } = useInventoryRunner();
  const [type, setType] = useState<MaterialType>('ROH');
  const [band, setBand] = useState<BandFilter>('all');
  const [search, setSearch] = useState('');
  const [incoming, setIncoming] = useState<InventoryPosition | null>(null);
  // Material C4 — the PIC filter, kept in the page address (MR-5 BR-03).
  const pic = usePicFilter();
  const [recordOpen, setRecordOpen] = useState(false);
  const nowIso = inventoryNow();
  const crumb = [t('hub.nav.section.inventory'), t('inv.pti.title')];

  const rows = useMemo(() => inventory.data?.items ?? [], [inventory.data]);
  const ofType = rows.filter((r) => r.materialType === type);
  const bandCount = (b: BandFilter) =>
    b === 'all'
      ? ofType.length
      : b === 'stale'
        ? ofType.filter((r) => stockFreshness(r, nowIso) !== 'current').length
        : ofType.filter((r) => positionRisk(r).riskClass === b).length;
  const shown = ofType.filter((r) => {
    if (!pic.matches(r.mrpController)) return false;
    if (band === 'stale' && stockFreshness(r, nowIso) === 'current') return false;
    if (band !== 'all' && band !== 'stale' && positionRisk(r).riskClass !== band) return false;
    const q = search.trim().toLowerCase();
    return (
      q === '' ||
      r.materialCode.toLowerCase().includes(q) ||
      r.materialLabel.toLowerCase().includes(q) ||
      r.supplierName.toLowerCase().includes(q)
    );
  });

  const connected = useMemo(() => {
    const bySupplier = new Map<string, InventoryPosition>();
    for (const r of rows) if (r.apiConnected && !bySupplier.has(r.supplierId)) bySupplier.set(r.supplierId, r);
    return [...bySupplier.values()];
  }, [rows]);

  if (inventory.isPending) return <LoadingState breadcrumb={crumb} />;
  if (inventory.isError)
    return <ErrorState breadcrumb={crumb} error={inventory.error} onRetry={() => inventory.refetch()} />;
  if (rows.length === 0)
    return (
      <EmptyState breadcrumb={crumb} title={t('inv.pti.title')} subtitle={t('inv.pti.subtitle')} message={t('inv.pti.empty')} />
    );

  const high = rows.filter((r) => positionRisk(r).riskClass === 'high').length;
  const noLeadTime = rows.filter((r) => !hasLeadTime(r.leadTimeDays)).length;
  const stale = rows.filter((r) => stockFreshness(r, nowIso) !== 'current').length;

  return (
    <AppShellV2>
      <PageHeader
        breadcrumb={crumb}
        title={t('inv.pti.title')}
        subtitle={t('inv.pti.subtitle')}
        actions={
          record.kind === 'held' ? (
            <Button variant="outline" icon={MessageSquarePlus} onClick={() => setRecordOpen(true)} data-testid="stock-record-open">
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

      {(high > 0 || noLeadTime > 0 || stale > 0) && (
        <div
          role="status"
          data-testid="pti-inventory-banner"
          className="bg-warning-soft border-l-2 border-warning rounded px-4 py-3 mb-4 text-sm text-warning-hover space-y-1"
        >
          {high > 0 && (
            <div className="flex items-center gap-2">
              <AlertTriangle size={14} aria-hidden="true" />
              {t('inv.pti.banner.high', { count: high })}
            </div>
          )}
          {noLeadTime > 0 && (
            <div data-testid="pti-inventory-banner-lead-time">{t('inv.pti.banner.leadTimeMissing', { count: noLeadTime })}</div>
          )}
          {stale > 0 && <div>{t('inv.pti.banner.stale', { count: stale })}</div>}
        </div>
      )}

      {connected.length > 0 && (
        <section className="bg-bg-surface border border-border-subtle rounded-lg p-4 mb-6" data-testid="api-sync">
          <h2 className="text-section text-text-primary">{t('inv.sync.title')}</h2>
          <p className="text-sm text-text-secondary mb-3">{t('inv.sync.subtitle')}</p>
          <ul className="divide-y divide-border-subtle">
            {connected.map((p) => (
              <li key={p.supplierId} className="py-2 flex flex-wrap items-center justify-between gap-3" data-testid={`api-sync-${p.supplierId}`}>
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
                        {t('inv.sync.lastFailed', { error: t(`inv.sync.error.${p.lastSync.errorKey ?? 'timeout'}`) })}{' '}
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
                    onClick={() => void run({ verb: 'sync', supplierId: p.supplierId }, t('inv.sync.done', { supplier: p.supplierName }))}
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

      <SubTabs<MaterialType>
        options={[
          { id: 'ROH', label: t('inv.type.ROH'), count: rows.filter((r) => r.materialType === 'ROH').length },
          { id: 'VERP', label: t('inv.type.VERP'), count: rows.filter((r) => r.materialType === 'VERP').length },
        ]}
        value={type}
        onChange={setType}
        className="mb-4"
      />

      <div className="flex flex-wrap items-center gap-3 mb-4">
        <div className="flex-1 min-w-[240px]">
          <SearchBar value={search} onChange={setSearch} placeholder={t('inv.search')} />
        </div>
        <FilterChipsBar<BandFilter>
          options={(['all', 'high', 'medium', 'low', 'stale'] as BandFilter[]).map((b) => ({
            id: b,
            label: `${b === 'high' || b === 'medium' || b === 'low' ? t(`inv.risk.${b}`) : t(`inv.filter.${b}`)} (${bandCount(b)})`,
          }))}
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
            <TableHeaderCell>{t('inv.col.material')}</TableHeaderCell>
            <TableHeaderCell>{t('inv.col.supplier')}</TableHeaderCell>
            <TableHeaderCell>
              <PicHeader />
            </TableHeaderCell>
            <TableHeaderCell className="text-right">{t('inv.col.supplierSoh')}</TableHeaderCell>
            <TableHeaderCell className="text-right">{t('inv.col.ptiSoh')}</TableHeaderCell>
            <TableHeaderCell className="text-right">{t('inv.col.ptiRop')}</TableHeaderCell>
            <TableHeaderCell className="text-right">{t('inv.col.supplierRop')}</TableHeaderCell>
            <TableHeaderCell>{t('inv.col.incoming')}</TableHeaderCell>
            <TableHeaderCell>{t('inv.col.daysOfSupply')}</TableHeaderCell>
            <TableHeaderCell>{t('inv.col.lastUpdate')}</TableHeaderCell>
          </TableHeader>
          <tbody>
            {shown.map((p) => (
              <TableRow key={`${p.supplierId}-${p.materialCode}`} data-testid={`pti-stock-row-${p.supplierId}-${p.materialCode}`}>
                <TableCell>
                  <Data className="text-xs font-bold text-text-primary">{p.materialCode}</Data>
                  <div className="text-sm text-text-primary">
                    {p.materialLabel}
                  </div>
                  {/* Material C2 — the supplier's approved trade name (MR-3 d, planner step 3). */}
                  <TradeNameBeside name={p.tradeName} testId={`pti-stock-trade-name-${p.supplierId}-${p.materialCode}`} />
                  {p.consignment && (
                    <StatusPill variant="info" className="mt-1">
                      {t('inv.consignment')}
                    </StatusPill>
                  )}
                </TableCell>
                <TableCell>
                  <div className="text-sm text-text-primary">
                    {p.supplierName}
                  </div>
                </TableCell>
                <TableCell>
                  <PicCell value={p.mrpController} testId={`pti-stock-pic-${p.supplierId}-${p.materialCode}`} />
                </TableCell>
                <TableCell className="text-right whitespace-nowrap">
                  <Figure value={p.supplierSoh} uom={p.uom} absentKey="inv.figure.noSubmission" />
                </TableCell>
                <TableCell className="text-right whitespace-nowrap">
                  <Figure value={p.ptiSoh} uom={p.uom} absentKey="inv.figure.none" />
                </TableCell>
                <TableCell className="text-right whitespace-nowrap">
                  <Figure value={p.ptiRop} uom={p.uom} absentKey="inv.figure.none" />
                </TableCell>
                <TableCell className="text-right whitespace-nowrap">
                  <Figure value={p.supplierRop} uom={p.uom} absentKey="inv.figure.notProvided" />
                </TableCell>
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
            ))}
            {shown.length === 0 && (
              <tr>
                <td colSpan={10} className="py-10 text-center text-sm text-text-tertiary">
                  {t('inv.table.empty')}
                </td>
              </tr>
            )}
          </tbody>
        </Table>
      </div>

      <IncomingPanel position={incoming} base="/buyer" onClose={() => setIncoming(null)} />
      {record.kind === 'held' && (
        <StockEntryPanel open={recordOpen} onClose={() => setRecordOpen(false)} mode="pti" positions={rows} />
      )}
    </AppShellV2>
  );
};

export default BuyerInventory;
