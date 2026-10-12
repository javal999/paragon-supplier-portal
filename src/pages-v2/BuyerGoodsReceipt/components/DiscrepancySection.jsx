/** @import React from 'react' */
/** @import { TFunction } from 'i18next' */
/** @import { VerbAvailability } from '@services/transitions/handoff' */
/** @import { ASN } from '@services/data/types' */
import { AlertTriangle } from 'lucide-react';
import Table from '@components/ui-v2/Table';
import TableHeader, { TableHeaderCell } from '@components/ui-v2/TableHeader';
import TableRow from '@components/ui-v2/TableRow';
import TableCell from '@components/ui-v2/TableCell';
import Data from '@components/ui-v2/Data';
import TrackingNumber from '@components/ui-v2/TrackingNumber';
import StatusPill from '@components/ui-v2/StatusPill';
import Button from '@components/ui-v2/Button';
import { HandoffNotice } from '@components/ui-v2/HandoffNotice';
import { statusTone } from '@lib/statusTone';

/**
 * @typedef {object} DiscrepancySectionProps
 * @property {ASN[]} discrepancyAsns The ASNs in `Discrepancy`, the verb's only from-state.
 * @property {VerbAvailability} resolveAvailability The seat's answer for `asn:flag`.
 * @property {boolean} resolving Whether a reconciliation is in flight.
 * @property {(asnNumber: string) => void} onResolve Dispatches `t_asn_resolve_discrepancy`.
 * @property {TFunction} t
 */

/**
 * The shipment discrepancies section: one row per flagged ASN with its
 * Reconcile control, or the handoff notice for a seat without `asn:flag`.
 * Moved out of `BuyerGoodsReceipt.jsx` by the Phase 5 page split (no
 * behaviour change). The page renders it only when a flagged ASN exists.
 * @type {React.FC<DiscrepancySectionProps>}
 */
const DiscrepancySection = ({ discrepancyAsns, resolveAvailability, resolving, onResolve, t }) => (
  <section
    className="mb-6 border border-border-subtle rounded-lg bg-white overflow-hidden"
    data-testid="gr-asn-discrepancies"
  >
    <div className="px-6 py-4 border-b border-border-subtle">
      <h2 className="text-sm font-semibold text-text-primary flex items-center gap-2">
        <AlertTriangle size={16} className="text-warning" aria-hidden="true" />
        {t('goodsReceipt.discrepancy.heading')}
      </h2>
      <p className="mt-1 text-xs text-text-secondary">{t('goodsReceipt.discrepancy.subtitle')}</p>
    </div>
    <Table>
      <TableHeader>
        <TableHeaderCell>{t('goodsReceipt.discrepancy.col.asn')}</TableHeaderCell>
        <TableHeaderCell>{t('goodsReceipt.discrepancy.col.po')}</TableHeaderCell>
        <TableHeaderCell>{t('goodsReceipt.discrepancy.col.carrier')}</TableHeaderCell>
        <TableHeaderCell>{t('tpl.col.tracking')}</TableHeaderCell>
        <TableHeaderCell>{t('goodsReceipt.discrepancy.col.status')}</TableHeaderCell>
        <TableHeaderCell> </TableHeaderCell>
      </TableHeader>
      <tbody>
        {discrepancyAsns.map((asn) => (
          <TableRow key={asn.asnNumber}>
            <TableCell>
              <Data className="text-xs font-bold text-text-primary">{asn.asnNumber}</Data>
            </TableCell>
            <TableCell>
              <Data className="text-text-secondary">{asn.poReference}</Data>
            </TableCell>
            <TableCell className="text-text-secondary">{asn.carrier}</TableCell>
            {/* BL-51 — the tracking number links to the 3PL's page, or is plain. */}
            <TableCell className="whitespace-nowrap text-xs text-text-secondary">
              <TrackingNumber
                threePlId={asn.threePlId}
                trackingNumber={asn.trackingNumber}
                testId={`gr-discrepancy-tracking-${asn.asnNumber}`}
              />
            </TableCell>
            <TableCell>
              {/* Tone from the `statusTone` SSoT and the LABEL from
                  `StatusPill`'s own `statusLabelKey` lookup — the raw
                  canonical token is passed deliberately. Wrapping it in
                  `el()` first would hand the pill an already-localized
                  string, which in ID resolves to nothing and falls
                  through to the Indonesian text as a literal. */}
              <StatusPill variant={statusTone(asn.status)}>{asn.status}</StatusPill>
            </TableCell>
            <TableCell className="text-right whitespace-nowrap">
              {resolveAvailability.kind === 'held' ? (
                <Button
                  variant="outline"
                  disabled={resolving}
                  onClick={() => onResolve(asn.asnNumber)}
                >
                  {resolving
                    ? t('goodsReceipt.discrepancy.resolving')
                    : t('goodsReceipt.discrepancy.action')}
                </Button>
              ) : (
                <HandoffNotice availability={resolveAvailability} testId="handoff-asn-resolve" />
              )}
            </TableCell>
          </TableRow>
        ))}
      </tbody>
    </Table>
  </section>
);

export default DiscrepancySection;
