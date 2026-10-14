/** @import React from 'react' */
/** @import { CallOffView } from '@services/transitions/callOffRules' */
/** @import { LinkedAsn, Panel } from '../utils' */
import { useTranslation } from 'react-i18next';
import StatusPill from '@components/ui-v2/StatusPill';
import Table from '@components/ui-v2/Table';
import TableHeader, { TableHeaderCell } from '@components/ui-v2/TableHeader';
import TableRow from '@components/ui-v2/TableRow';
import TableCell from '@components/ui-v2/TableCell';
import Button from '@components/ui-v2/Button';
import Data from '@components/ui-v2/Data';
import { formatDate } from '@lib/format';
import { ConfirmationPill, DeliveryPill, ToleranceTags, qty } from '../../callOffs/callOffDisplay';
import { actionKey, releaseWithheld } from '../utils';
import EngineOriginMarker from './EngineOriginMarker';

/**
 * @typedef {object} CallOffRowsTableProps
 * @property {CallOffView[]} rows  The umbrella line's call-offs, already filtered and sorted by the page.
 * @property {Map<string, LinkedAsn[]>} linkedAsns  Each call-off's ASNs with the current comparison (MR-6 BR-12).
 * @property {(next: Panel) => void} open  Opens the call-off's side panel (the page's `open`).
 */

/**
 * The call-offs on one umbrella PO line: number (with the X-03 engine marker),
 * type, quantity, need date, confirmation (with CR-05 tolerance tags), delivery
 * (with the ASN mismatch marker) and the row action that opens the panel.
 * @type {React.FC<CallOffRowsTableProps>}
 */
const CallOffRowsTable = ({ rows, linkedAsns, open }) => {
  const { t } = useTranslation();
  return (
    <div className="overflow-x-auto">
      <Table>
        <TableHeader>
          <TableHeaderCell>{t('co.col.callOff')}</TableHeaderCell>
          <TableHeaderCell>{t('co.col.type')}</TableHeaderCell>
          <TableHeaderCell className="text-right">{t('co.col.quantity')}</TableHeaderCell>
          <TableHeaderCell>{t('co.col.needDate')}</TableHeaderCell>
          <TableHeaderCell>{t('co.col.confirmation')}</TableHeaderCell>
          <TableHeaderCell>{t('co.col.delivery')}</TableHeaderCell>
          <TableHeaderCell className="text-right">{t('co.col.action')}</TableHeaderCell>
        </TableHeader>
        <tbody>
          {rows.map((v) => (
            <TableRow key={v.callOff.id} data-testid={`calloff-row-${v.callOff.id}`}>
              <TableCell>
                <Data className="text-xs font-bold text-text-primary whitespace-nowrap">
                  {v.callOff.callOffNumber}
                </Data>
                {releaseWithheld(v.callOff) && (
                  <div className="mt-1">
                    <EngineOriginMarker testId={`calloff-origin-engine-${v.callOff.id}`} />
                  </div>
                )}
              </TableCell>
              <TableCell className="text-xs text-text-secondary whitespace-nowrap">
                {t(`co.type.${v.callOff.type}`)}
              </TableCell>
              <TableCell className="text-right">
                <Data>{qty(v.callOff.quantity)}</Data>
              </TableCell>
              <TableCell className="whitespace-nowrap">
                <Data className="text-xs">{formatDate(v.callOff.needDate)}</Data>
              </TableCell>
              <TableCell>
                <ConfirmationPill status={v.confirmation} />
                {/* CR-05 — the rule that decided this confirmation. */}
                {v.tolerance && v.callOff.confirmation && (
                  <ToleranceTags
                    check={v.tolerance}
                    uom={v.callOff.uom}
                    approval={v.callOff.confirmation.approval}
                    testId={`calloff-tol-${v.callOff.id}`}
                  />
                )}
              </TableCell>
              <TableCell>
                <DeliveryPill status={v.delivery} />
                {(linkedAsns.get(v.callOff.id) ?? []).some((l) => l.warnings.length > 0) ? (
                  <div className="mt-1" data-testid={`calloff-mismatch-${v.callOff.id}`}>
                    <StatusPill variant="warning">{t('co.asn.mismatch')}</StatusPill>
                  </div>
                ) : null}
              </TableCell>
              <TableCell className="text-right whitespace-nowrap">
                <Button
                  variant={
                    v.confirmation === 'Awaiting Approval' || v.callOff.status === 'Draft'
                      ? 'outline'
                      : 'secondary'
                  }
                  onClick={() => open({ kind: 'callOff', id: v.callOff.id })}
                  aria-label={`${t(actionKey(v))} ${v.callOff.callOffNumber}`}
                >
                  {t(actionKey(v))}
                </Button>
              </TableCell>
            </TableRow>
          ))}
        </tbody>
      </Table>
    </div>
  );
};

export default CallOffRowsTable;
