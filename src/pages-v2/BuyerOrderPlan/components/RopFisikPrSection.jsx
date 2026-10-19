/** @import React from 'react' */
import { useTranslation } from 'react-i18next';
import Table from '@components/ui-v2/Table';
import TableHeader, { TableHeaderCell } from '@components/ui-v2/TableHeader';
import TableRow from '@components/ui-v2/TableRow';
import TableCell from '@components/ui-v2/TableCell';
import Data from '@components/ui-v2/Data';
import StatusPill from '@components/ui-v2/StatusPill';
import { formatDate, formatNumber } from '@lib/format';
import { useRopFisikPrRecommendations } from '@services/query/hooks';
import { TriggerProvisional, TriggerRefreshNote } from '../../callOffs/ropFisikTrigger';

// ─────────────────────────────────────────────────────────────────────────────
// BL-199 (DRC-13 BR-02) — on What to order, beside CAP-12's "New PO needed":
// a material whose PTI SOH reached ROP Fisik with no umbrella PO balance left
// for what it needs. The hub recommends "Create a PR in SAP for N"; the planner
// creates it in SAP, and the hub posts nothing (Owner F2). Every figure is the
// trigger's, stored with its rules version (DRC-D16); none is computed here.
// The section shows only while a recommendation is open.
// ─────────────────────────────────────────────────────────────────────────────

/** @type {React.FC} */
const RopFisikPrSection = () => {
  const { t } = useTranslation();
  const query = useRopFisikPrRecommendations();
  const items = query.data?.items ?? [];
  if (items.length === 0) return null;
  return (
    <section
      className="bg-bg-surface border border-border-subtle rounded-lg p-4 mb-6"
      data-testid="op-rop-fisik-pr"
    >
      <h2 className="text-section text-text-primary mb-1">{t('co.trigger.pr.title')}</h2>
      <p className="text-xs text-text-tertiary mb-1">{t('co.trigger.pr.intro')}</p>
      <TriggerRefreshNote testId="op-rop-fisik-pr-refresh" />
      <TriggerProvisional testId="op-rop-fisik-pr-provisional" />
      <Table>
        <TableHeader>
          <TableHeaderCell>{t('co.trigger.pr.col.material')}</TableHeaderCell>
          <TableHeaderCell className="text-right">{t('co.trigger.soh')}</TableHeaderCell>
          <TableHeaderCell className="text-right">{t('co.trigger.ropFisik')}</TableHeaderCell>
          <TableHeaderCell className="text-right">{t('co.trigger.max')}</TableHeaderCell>
          <TableHeaderCell>{t('co.trigger.pr.col.recommendation')}</TableHeaderCell>
        </TableHeader>
        <tbody>
          {items.map((r) => {
            const f = r.figures.value;
            return (
              <TableRow key={r.materialCode} data-testid={`op-rop-fisik-pr-${r.materialCode}`}>
                <TableCell className="align-top">
                  <Data>{r.materialCode}</Data>
                  <span className="text-xs text-text-tertiary"> {r.materialLabel}</span>
                </TableCell>
                <TableCell className="align-top text-right">
                  <Data>{formatNumber(f.soh)}</Data>
                </TableCell>
                <TableCell className="align-top text-right">
                  <Data>{f.ropFisik === null ? '—' : formatNumber(f.ropFisik)}</Data>
                </TableCell>
                <TableCell className="align-top text-right">
                  <Data>{f.max === null ? '—' : formatNumber(f.max)}</Data>
                </TableCell>
                <TableCell className="align-top">
                  <StatusPill variant="warning">
                    {t('co.trigger.pr.create', { qty: formatNumber(r.prQty), uom: r.uom })}
                  </StatusPill>
                  <span className="block text-xs text-text-tertiary mt-1">
                    {t('co.trigger.pr.since', { date: formatDate(r.recommendedAt) })}
                  </span>
                </TableCell>
              </TableRow>
            );
          })}
        </tbody>
      </Table>
    </section>
  );
};

export default RopFisikPrSection;
