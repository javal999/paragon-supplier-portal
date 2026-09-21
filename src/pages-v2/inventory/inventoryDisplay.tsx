import React from 'react';
import { useTranslation } from 'react-i18next';
import { Link } from 'react-router-dom';
import StatusPill from '../../components/ui-v2/StatusPill';
import SidePanel from '../../components/ui-v2/SidePanel';
import Data from '../../components/ui-v2/Data';
import { useToast } from '../../hooks/useToast';
import { useRefusalText } from '../../hooks/useRefusalText';
import { formatDate, formatDateTime } from '../../lib/format';
import type { StatusTone } from '../../lib/statusTone';
import { sdcClock } from '../../services/sdc';
import type { InventoryPosition, RiskBasis, RiskClass } from '../../services/data/types';
import type { StockChannel } from '../../services/sdc/types';
import {
  incomingTotals,
  positionRisk,
  stockFreshness,
  type StockFreshness,
} from '../../services/transitions/inventoryRules';
import type { CapacityConfirmationStatus } from '../../services/transitions/capacityRules';
import { useInventoryCommand, type InventoryCommandVars } from '../../services/query/commandHooks';

// ─────────────────────────────────────────────────────────────────────────────
// Shared inventory & capacity display (REQ-E08-01 to REQ-E08-05). Every figure
// comes from the shared rules on the one simulated clock the commands stamp
// with, so the planner's page, the supplier's page and Home agree.
// ─────────────────────────────────────────────────────────────────────────────

/** "Now" for inventory pages: the simulated clock the stock commands stamp with. */
export const inventoryNow = (): string => sdcClock.now();

export const qty = (n: number) => n.toLocaleString('en-US', { maximumFractionDigits: 2 });

export const inputClass =
  'w-full px-3 py-2 text-sm text-text-primary bg-white border border-border-input rounded-md focus:outline-none focus:border-action';
export const labelClass = 'block text-label text-text-tertiary uppercase mb-1';

const RISK_TONE: Record<RiskClass, StatusTone> = { high: 'danger', medium: 'warning', low: 'neutral' };

/**
 * CR-24 — WHY a risk class is what it is, in one line: "Lead time 21 days", or
 * "No lead time · day bands: Critical" where the CR-02 fallback decided. Null
 * when the class came from the alert's own rule or there is no cover figure.
 */
export const RiskBasisNote: React.FC<{ basis: RiskBasis; testId?: string; withCover?: boolean }> = ({
  basis,
  testId,
  withCover = false,
}) => {
  const { t } = useTranslation();
  if (basis.kind !== 'leadTime' && basis.kind !== 'fallbackBands') return null;
  const cover = withCover ? `${t('inv.basis.cover', { count: Math.floor(basis.daysOfCover) })} · ` : '';
  if (basis.kind === 'leadTime') {
    return (
      <span className="block text-xs text-text-secondary whitespace-nowrap" data-testid={testId} data-basis="leadTime">
        {cover}
        {t('inv.basis.leadTime', { count: basis.leadTimeDays })}
      </span>
    );
  }
  return (
    <span className="block text-xs text-warning-hover whitespace-nowrap" data-testid={testId} data-basis="fallbackBands">
      {cover}
      {t('inv.basis.fallback', { band: t(`inv.band.${basis.band}`) })}
    </span>
  );
};

/**
 * CR-01 days of supply with its CR-24 risk class, and the basis the class was
 * decided on (lead time, or the CR-02 fallback bands) — one function,
 * `positionRisk`, on every page that shows it.
 */
export const SupplyPill: React.FC<{ position: InventoryPosition }> = ({ position }) => {
  const { t } = useTranslation();
  const { riskClass, basis } = positionRisk(position);
  const testId = `risk-${position.supplierId}-${position.materialCode}`;
  if (basis.kind === 'noCover' || basis.kind === 'rule') {
    return (
      <span className="text-xs text-text-tertiary" data-testid={testId}>
        {position.supplierSoh === null ? t('inv.band.noFigures') : t('inv.band.noDemand')}
      </span>
    );
  }
  return (
    <div data-testid={testId} data-risk={riskClass}>
      <StatusPill variant={RISK_TONE[riskClass]}>
        {t('inv.band.days', { count: Math.floor(basis.daysOfCover) })} · {t(`inv.risk.${riskClass}`)}
      </StatusPill>
      <RiskBasisNote basis={basis} />
    </div>
  );
};

const FRESHNESS_TONE: Record<StockFreshness, StatusTone> = { current: 'success', stale: 'warning', missing: 'neutral' };

/** AC-05 — the last update time of the supplier figure, its channel, and the stale flag. */
export const LastUpdateCell: React.FC<{ position: InventoryPosition; nowIso: string }> = ({ position, nowIso }) => {
  const { t } = useTranslation();
  const freshness = stockFreshness(position, nowIso);
  return (
    <div className="space-y-0.5">
      {position.lastUpdatedAt ? (
        <Data className="text-xs whitespace-nowrap">{formatDateTime(position.lastUpdatedAt)}</Data>
      ) : null}
      <div className="flex flex-wrap items-center gap-1">
        {freshness !== 'current' && (
          <StatusPill variant={FRESHNESS_TONE[freshness]}>{t(`inv.freshness.${freshness}`)}</StatusPill>
        )}
        {position.channel && <ChannelLabel channel={position.channel} />}
      </div>
    </div>
  );
};

export const ChannelLabel: React.FC<{ channel: StockChannel }> = ({ channel }) => {
  const { t } = useTranslation();
  return <span className="text-xs text-text-secondary whitespace-nowrap">{t(`inv.channel.${channel}`)}</span>;
};

export const RiskPill: React.FC<{ riskClass: RiskClass }> = ({ riskClass }) => {
  const { t } = useTranslation();
  return <StatusPill variant={RISK_TONE[riskClass]}>{t(`inv.risk.${riskClass}`)}</StatusPill>;
};

const CAPACITY_TONE: Record<CapacityConfirmationStatus, StatusTone> = {
  confirmed: 'success',
  gap: 'warning',
  outdated: 'neutral',
  notStarted: 'neutral',
};

export const CapacityStatusPill: React.FC<{ status: CapacityConfirmationStatus }> = ({ status }) => {
  const { t } = useTranslation();
  return <StatusPill variant={CAPACITY_TONE[status]}>{t(`inv.capacity.status.${status}`)}</StatusPill>;
};

/** A figure or the business wording for its absence. */
export const Figure: React.FC<{ value: number | null; uom?: string; absentKey: string }> = ({ value, uom, absentKey }) => {
  const { t } = useTranslation();
  if (value === null) return <span className="text-xs text-text-tertiary">{t(absentKey)}</span>;
  return <Data>{`${qty(value)}${uom ? ` ${uom}` : ''}`}</Data>;
};

/** BR-05 / BR-06 — the incoming aggregate, split, with the next date; opens the per-date detail. */
export const IncomingButton: React.FC<{ position: InventoryPosition; onOpen: () => void }> = ({ position, onOpen }) => {
  const { t } = useTranslation();
  const totals = incomingTotals(position.incoming);
  if (totals.total === 0) return <span className="text-xs text-text-tertiary">{t('inv.incoming.none')}</span>;
  return (
    <button
      type="button"
      onClick={onOpen}
      className="text-left text-xs text-action hover:underline focus-visible:outline focus-visible:outline-2 focus-visible:outline-action rounded"
      aria-label={t('inv.incoming.open', { material: position.materialCode, supplier: position.supplierName })}
      data-testid={`incoming-${position.supplierId}-${position.materialCode}`}
    >
      <div className="whitespace-nowrap">
        {t('inv.incoming.inProduction')} <Data>{qty(totals.inProduction)}</Data>
      </div>
      <div className="whitespace-nowrap">
        {t('inv.incoming.inTransit')} <Data>{qty(totals.inTransit)}</Data>
      </div>
      {totals.nextDate && (
        <div className="whitespace-nowrap text-text-secondary">
          {t('inv.incoming.next')} <Data>{formatDate(totals.nextDate)}</Data>
        </div>
      )}
    </button>
  );
};

/** AC-04 — per-date detail of the incoming figure, linked to Order collaboration. */
export const IncomingPanel: React.FC<{
  position: InventoryPosition | null;
  base: '/buyer' | '/supplier';
  onClose: () => void;
}> = ({ position, base, onClose }) => {
  const { t } = useTranslation();
  return (
    <SidePanel
      open={position !== null}
      onClose={onClose}
      title={position ? t('inv.incoming.panelTitle', { material: position.materialCode }) : ''}
    >
      {position && (
        <div className="space-y-4" data-testid="incoming-panel">
          <p className="text-sm text-text-secondary">
            {position.materialLabel} · {position.supplierName}
          </p>
          <table className="w-full text-sm">
            <thead>
              <tr className="text-label text-text-tertiary uppercase">
                <th className="text-left py-1">{t('inv.incoming.col.date')}</th>
                <th className="text-left py-1">{t('inv.incoming.col.source')}</th>
                <th className="text-right py-1">{t('inv.incoming.col.quantity')}</th>
                <th className="text-left py-1 pl-3">{t('inv.incoming.col.reference')}</th>
              </tr>
            </thead>
            <tbody>
              {[...position.incoming]
                .sort((a, b) => (a.date ?? '9999').localeCompare(b.date ?? '9999'))
                .map((item, i) => (
                  <tr key={`${item.source}-${item.reference ?? i}`} className="border-t border-border-subtle">
                    <td className="py-2">
                      {item.date ? <Data>{formatDate(item.date)}</Data> : <span className="text-text-tertiary">{t('inv.incoming.noDate')}</span>}
                    </td>
                    <td className="py-2">{t(`inv.incoming.source.${item.source}`)}</td>
                    <td className="py-2 text-right">
                      <Data>{`${qty(item.quantity)} ${position.uom}`}</Data>
                    </td>
                    <td className="py-2 pl-3">
                      {item.source === 'production' ? (
                        <span className="text-text-tertiary">—</span>
                      ) : (
                        <Link
                          className="text-action hover:underline"
                          to={item.source === 'asn' ? `${base}/shipments` : `${base}/call-offs`}
                        >
                          <Data>{item.reference ?? ''}</Data>
                        </Link>
                      )}
                    </td>
                  </tr>
                ))}
            </tbody>
          </table>
        </div>
      )}
    </SidePanel>
  );
};

/** Business wording for a refusal from an inventory verb. */
function refusalKey(reason: string | undefined): string | null {
  if (!reason) return null;
  const table: [string, string][] = [
    ['NOT_API_CONNECTED', 'inv.refusal.notConnected'],
    ['BELOW_DEMAND_NEEDS_REASON', 'inv.refusal.reasonRequired'],
    ['OTHER_REASON_NEEDS_NOTE', 'inv.refusal.noteRequired'],
    ['MISSINGWEEK', 'inv.refusal.missingWeek'],
    ['NOT_SUPPLIED', 'inv.refusal.notSupplied'],
    ['batch total', 'inv.refusal.batchTotal'],
    ['UNKNOWN_MATERIAL', 'inv.refusal.unknownMaterial'],
    ['action note', 'inv.refusal.actionNote'],
  ];
  return table.find(([needle]) => reason.includes(needle))?.[1] ?? null;
}

/** Run an inventory verb with a toast; resolves true when it landed. */
export function useInventoryRunner() {
  const { t } = useTranslation();
  const { toast } = useToast();
  const refusalText = useRefusalText();
  const command = useInventoryCommand();
  const run = async (vars: InventoryCommandVars, success?: string): Promise<{ ok: boolean; reason?: string }> => {
    try {
      const res = await command.mutateAsync(vars);
      if (res.status === 'failed') {
        const key = refusalKey(res.reason);
        if (success !== undefined) {
          toast({
            variant: 'warning',
            title: t('inv.toast.refused'),
            description: key ? t(key) : (refusalText(res.reason) ?? t('inv.refusal.generic')),
          });
        }
        return { ok: false, reason: key ? t(key) : (refusalText(res.reason) ?? t('inv.refusal.generic')) };
      }
      if (success) toast({ variant: 'success', title: success });
      return { ok: true };
    } catch (err) {
      // A scope refusal is thrown, not returned: for a stock row it means the
      // material is not assigned to the supplier.
      const code = (err as { code?: string } | null)?.code;
      const reason = code === 'SCOPE_DENIED' ? t('inv.refusal.notAssigned') : t('inv.refusal.generic');
      if (success !== undefined) toast({ variant: 'error', title: t('inv.toast.refused'), description: reason });
      return { ok: false, reason };
    }
  };
  return { run, pending: command.isPending };
}

/** Read a picked file as text (CSV), without relying on `Blob.text`. */
export function readFileText(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result ?? ''));
    reader.onerror = () => reject(reader.error);
    reader.readAsText(file);
  });
}

/**
 * REQ-E08-02 BR-10 / AC-05 (BL-60) — the in-transit part of incoming stock,
 * shown READ-ONLY beside the in-production figure on both stock entry methods.
 * The supplier never types it: it is the position's own in-transit items, which
 * `inTransitItems` derives from submitted ASNs and dispatched call-offs, and it
 * names the documents it comes from. Deliberately not a form control.
 */
export const InTransitReadOnly: React.FC<{ position: InventoryPosition; testId?: string }> = ({
  position,
  testId = 'in-transit-readonly',
}) => {
  const { t } = useTranslation();
  const items = position.incoming.filter((i) => i.source !== 'production');
  const total = items.reduce((s, i) => s + i.quantity, 0);
  const refs = [...new Set(items.map((i) => i.reference).filter((r): r is string => !!r))];
  return (
    <div data-testid={testId}>
      <span className={labelClass}>{t('inv.entry.inTransit', { uom: position.uom })}</span>
      <div className="px-3 py-2 text-sm rounded-md bg-bg-hover border border-border-subtle text-text-primary">
        <Data data-testid={`${testId}-qty`}>{qty(total)}</Data>
        {refs.length > 0 ? (
          <span className="ml-2 text-xs text-text-secondary" data-testid={`${testId}-source`}>
            {t('inv.entry.inTransitFrom', { refs: refs.join(', ') })}
          </span>
        ) : (
          <span className="ml-2 text-xs text-text-tertiary">{t('inv.entry.inTransitNone')}</span>
        )}
      </div>
      <p className="mt-1 text-xs text-text-tertiary">{t('inv.entry.inTransitHint')}</p>
    </div>
  );
};
