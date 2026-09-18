import React, { useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import AppShellV2 from '../components/layout-v2/AppShellV2';
import PageHeader from '../components/ui-v2/PageHeader';
import PageMetaLine from '../components/ui-v2/PageMetaLine';
import SampleDataBadge from '../components/ui-v2/SampleDataBadge';
import Table from '../components/ui-v2/Table';
import TableHeader, { TableHeaderCell } from '../components/ui-v2/TableHeader';
import TableRow from '../components/ui-v2/TableRow';
import TableCell from '../components/ui-v2/TableCell';
import Button from '../components/ui-v2/Button';
import StatusPill from '../components/ui-v2/StatusPill';
import SidePanel from '../components/ui-v2/SidePanel';
import Data from '../components/ui-v2/Data';
import LoadingState from '../components/ui-v2/LoadingState';
import ErrorState from '../components/ui-v2/ErrorState';
import { HandoffNotice } from '../components/ui-v2/HandoffNotice';
import { useVerbAvailability } from '../hooks/useVerbAvailability';
import { formatDate, formatDateTime } from '../lib/format';
import { useInventory, useStockAccess } from '../services/query/hooks';
import type { StockAccessGrant } from '../services/data/types';
import type { ActorAttribution } from '../lib/enforcement';
import { inventoryNow, labelClass, useInventoryRunner } from './inventory/inventoryDisplay';

// ─────────────────────────────────────────────────────────────────────────────
// SUPPLIER ACCESS TO PTI STOCK — REQ-E08-03.
//
// The planner grants a supplier access to PTI stock for every material it
// supplies, or only chosen ones (consignment materials are marked, BR-04), and
// removes it at any time without the supplier's action (BR-02, AC-02). Both are
// governed verbs; every change is logged with the user and the time (BR-06,
// AC-03). What a supplier then sees is decided by the inventory READ, so a
// supplier without access sees no PTI stock anywhere (AC-01).
// ─────────────────────────────────────────────────────────────────────────────

const BuyerSupplierAccess: React.FC = () => {
  const { t } = useTranslation();
  const access = useStockAccess();
  const inventory = useInventory();
  const manage = useVerbAvailability('stockaccess:manage');
  const { run, pending } = useInventoryRunner();
  const [editing, setEditing] = useState<string | null>(null);
  const [scope, setScope] = useState<'all' | 'chosen'>('chosen');
  const [chosen, setChosen] = useState<string[]>([]);
  const nowIso = inventoryNow();
  const crumb = [t('hub.nav.section.inventory'), t('inv.access.title')];

  const grants = useMemo(() => access.data?.items ?? [], [access.data]);
  const materialsOf = (supplierId: string) =>
    (inventory.data?.items ?? []).filter((p) => p.supplierId === supplierId);

  const log = useMemo(
    () =>
      grants
        .flatMap((g) => g.log.map((e) => ({ ...e, supplierName: g.supplierName })))
        .sort((a, b) => b.at.localeCompare(a.at)),
    [grants],
  );

  if (access.isPending || inventory.isPending) return <LoadingState breadcrumb={crumb} />;
  if (access.isError || inventory.isError)
    return (
      <ErrorState
        breadcrumb={crumb}
        error={access.error ?? inventory.error}
        onRetry={() => {
          access.refetch();
          inventory.refetch();
        }}
      />
    );

  const selected: StockAccessGrant | null = grants.find((g) => g.supplierId === editing) ?? null;
  const open = (g: StockAccessGrant) => {
    setEditing(g.supplierId);
    setScope(g.active && g.materials.length === 0 ? 'all' : 'chosen');
    setChosen(g.active ? [...g.materials] : []);
  };
  const actorText = (actor: ActorAttribution) =>
    actor.kind === 'RESOLVED' ? actor.person.displayName : t('inv.access.log.unattributed');

  const grant = async () => {
    if (!selected) return;
    const res = await run(
      {
        verb: 'grantAccess',
        supplierId: selected.supplierId,
        materials: scope === 'all' ? [] : chosen,
        alreadyGranted: selected.active,
      },
      t('inv.access.toast.granted', { supplier: selected.supplierName }),
    );
    if (res.ok) setEditing(null);
  };
  const remove = async () => {
    if (!selected) return;
    const res = await run(
      { verb: 'removeAccess', supplierId: selected.supplierId },
      t('inv.access.toast.removed', { supplier: selected.supplierName }),
    );
    if (res.ok) setEditing(null);
  };

  const held = manage.kind === 'held';

  return (
    <AppShellV2>
      <PageHeader breadcrumb={crumb} title={t('inv.access.title')} subtitle={t('inv.access.subtitle')} />
      <PageMetaLine className="-mt-6 mb-4">
        {t('inv.asOf')} <Data>{formatDate(nowIso)}</Data>
        <SampleDataBadge className="ml-3 align-middle" />
      </PageMetaLine>

      <div className="bg-bg-surface border border-border-subtle rounded-lg shadow-sm overflow-x-auto mb-6">
        <Table>
          <TableHeader>
            <TableHeaderCell>{t('inv.col.supplier')}</TableHeaderCell>
            <TableHeaderCell>{t('inv.access.col.access')}</TableHeaderCell>
            <TableHeaderCell>{t('inv.access.col.materials')}</TableHeaderCell>
            <TableHeaderCell className="text-right">{t('inv.access.col.action')}</TableHeaderCell>
          </TableHeader>
          <tbody>
            {grants.map((g) => {
              const mats = materialsOf(g.supplierId);
              return (
                <TableRow key={g.supplierId} data-testid={`access-row-${g.supplierId}`}>
                  <TableCell className="text-sm text-text-primary">{g.supplierName}</TableCell>
                  <TableCell>
                    {g.active ? (
                      <StatusPill variant="success">
                        {g.materials.length === 0 ? t('inv.access.state.all') : t('inv.access.state.some', { count: g.materials.length })}
                      </StatusPill>
                    ) : (
                      <StatusPill variant="neutral">{t('inv.access.state.none')}</StatusPill>
                    )}
                  </TableCell>
                  <TableCell className="text-xs text-text-secondary">
                    {mats.map((m) => (
                      <span key={m.materialCode} className="inline-flex items-center gap-1 mr-3">
                        <Data>{m.materialCode}</Data>
                        {m.consignment && <StatusPill variant="info">{t('inv.consignment')}</StatusPill>}
                      </span>
                    ))}
                  </TableCell>
                  <TableCell className="text-right">
                    {held ? (
                      <Button
                        variant={g.active ? 'secondary' : 'outline'}
                        onClick={() => open(g)}
                        aria-label={t('inv.access.manageFor', { supplier: g.supplierName })}
                      >
                        {t(g.active ? 'inv.access.manage' : 'inv.access.grant')}
                      </Button>
                    ) : (
                      <HandoffNotice availability={manage} testId="handoff-stock-access" />
                    )}
                  </TableCell>
                </TableRow>
              );
            })}
          </tbody>
        </Table>
      </div>

      <section className="bg-bg-surface border border-border-subtle rounded-lg p-4" data-testid="access-log">
        <h2 className="text-section text-text-primary mb-3">{t('inv.access.log.title')}</h2>
        {log.length === 0 ? (
          <p className="text-sm text-text-tertiary">{t('inv.access.log.empty')}</p>
        ) : (
          <table className="w-full text-sm">
            <thead>
              <tr className="text-label text-text-tertiary uppercase">
                <th className="text-left py-1">{t('inv.access.log.when')}</th>
                <th className="text-left py-1">{t('inv.col.supplier')}</th>
                <th className="text-left py-1">{t('inv.access.log.what')}</th>
                <th className="text-left py-1">{t('inv.access.log.materials')}</th>
                <th className="text-left py-1">{t('inv.access.log.by')}</th>
              </tr>
            </thead>
            <tbody>
              {log.map((e, i) => (
                <tr key={`${e.at}-${i}`} className="border-t border-border-subtle" data-testid="access-log-entry">
                  <td className="py-1.5">
                    <Data>{formatDateTime(e.at)}</Data>
                  </td>
                  <td className="py-1.5">{e.supplierName}</td>
                  <td className="py-1.5">{t(`inv.access.log.${e.action}`)}</td>
                  <td className="py-1.5">
                    {e.materials.length === 0 ? t('inv.access.state.all') : <Data>{e.materials.join(', ')}</Data>}
                  </td>
                  <td className="py-1.5 text-text-secondary">{actorText(e.actor)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </section>

      <SidePanel
        open={selected !== null && held}
        onClose={() => setEditing(null)}
        title={selected ? t('inv.access.panelTitle', { supplier: selected.supplierName }) : ''}
        footerActions={
          selected && held ? (
            <>
              {selected.active && (
                <Button variant="secondary" disabled={pending} onClick={() => void remove()} data-testid="access-remove">
                  {t('inv.access.remove')}
                </Button>
              )}
              <Button
                variant="outline"
                disabled={pending || (scope === 'chosen' && chosen.length === 0)}
                onClick={() => void grant()}
                data-testid="access-grant"
              >
                {t(selected.active ? 'inv.access.update' : 'inv.access.grant')}
              </Button>
            </>
          ) : undefined
        }
      >
        {selected && (
          <div className="space-y-4">
            <p className="text-sm text-text-secondary">{t('inv.access.panelHint')}</p>
            <fieldset className="space-y-2">
              <legend className={labelClass}>{t('inv.access.scope')}</legend>
              <label className="flex items-center gap-2 text-sm">
                <input type="radio" name="access-scope" checked={scope === 'all'} onChange={() => setScope('all')} />
                {t('inv.access.scope.all')}
              </label>
              <label className="flex items-center gap-2 text-sm">
                <input type="radio" name="access-scope" checked={scope === 'chosen'} onChange={() => setScope('chosen')} />
                {t('inv.access.scope.chosen')}
              </label>
            </fieldset>
            {scope === 'chosen' && (
              <fieldset className="space-y-2">
                <legend className={labelClass}>{t('inv.access.col.materials')}</legend>
                {materialsOf(selected.supplierId).map((m) => (
                  <label key={m.materialCode} className="flex items-center gap-2 text-sm">
                    <input
                      type="checkbox"
                      checked={chosen.includes(m.materialCode)}
                      onChange={(e) =>
                        setChosen(e.target.checked ? [...chosen, m.materialCode] : chosen.filter((c) => c !== m.materialCode))
                      }
                    />
                    <Data>{m.materialCode}</Data>
                    <span className="text-text-secondary">{m.materialLabel}</span>
                    {m.consignment && <StatusPill variant="info">{t('inv.consignment')}</StatusPill>}
                  </label>
                ))}
              </fieldset>
            )}
          </div>
        )}
      </SidePanel>
    </AppShellV2>
  );
};

export default BuyerSupplierAccess;
