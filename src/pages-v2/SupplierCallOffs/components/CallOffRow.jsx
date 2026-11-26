/** @import React from 'react' */
import { useTranslation } from 'react-i18next';
import TableRow from '@components/ui-v2/TableRow';
import TableCell from '@components/ui-v2/TableCell';
import Button from '@components/ui-v2/Button';
import Data from '@components/ui-v2/Data';
import { MaterialMatchReason } from '@components/ui-v2/MaterialSearch';
import { formatDate, formatDateTime } from '@lib/format';
/** @import { CallOffView } from '@services/transitions/callOffRules' */
import { ConfirmationPill, DeliveryPill, ToleranceTags, qty } from '../../callOffs/callOffDisplay';
import { PicCell } from '../../materials/picDisplay';
import { PoOnHoldOriginMarker } from '../../callOffs/poOnHoldOrigin';
import FulfilBy from './FulfilBy';

/**
 * One call-off row of the supplier's table (BL-38's 7 columns): call-off and
 * PO, material with its match reason and PIC, quantity, need date and type,
 * confirmation with its confirm-by deadline and tolerance tags, delivery, and
 * the Respond/Open button. Moved out of `SupplierCallOffs.jsx` by the Phase 5
 * page split (no behaviour change).
 * UCX-P2 — `bulk` adds the select-for-confirm cell (nothing starts ticked;
 * only a released call-off with no PTI delay waiting is tickable).
 * @type {React.FC<{ v: CallOffView; match: React.ComponentProps<typeof MaterialMatchReason>['match']; onOpen: (id: string) => void; bulk?: { ticked: boolean; eligible: boolean; reason: string; onToggle: () => void } }>}
 */
const CallOffRow = ({ v, match, onOpen, bulk }) => {
  const { t } = useTranslation();
  const c = v.callOff;
  const needsAnswer = c.status === 'Awaiting Confirmation';
  return (
    <TableRow data-testid={`supplier-calloff-row-${c.id}`}>
      <TableCell className="align-middle">
        {bulk ? (
          <input
            type="checkbox"
            checked={bulk.ticked}
            disabled={!bulk.eligible}
            title={bulk.reason}
            aria-label={t('co.bulk.tickRow', { number: c.callOffNumber })}
            onChange={bulk.onToggle}
            data-testid={`calloff-bulk-tick-${c.id}`}
          />
        ) : null}
      </TableCell>
      <TableCell>
        <Data as="div" className="text-xs font-bold text-text-primary whitespace-nowrap">
          {c.callOffNumber}
        </Data>
        <Data
          as="div"
          className="text-[length:var(--fs-label-3)] text-text-secondary whitespace-nowrap"
        >
          {c.poNumber}
        </Data>
        {/* PEX-8 — a call-off the end of a PO On Hold grace period created. */}
        {c.origin === 'poOnHold' && (
          <div className="mt-1">
            <PoOnHoldOriginMarker
              persona="supplier"
              testId={`supplier-calloff-origin-po-on-hold-${c.id}`}
            />
          </div>
        )}
      </TableCell>
      <TableCell>
        <Data
          as="div"
          className="text-[length:var(--fs-label-3)] text-text-tertiary whitespace-nowrap"
        >
          {c.materialCode}
        </Data>
        <div className="text-xs text-text-primary">{c.description}</div>
        <MaterialMatchReason match={match} testId={`supplier-calloff-match-${c.id}`} />
        <div className="mt-1">
          <PicCell value={c.mrpController} testId={`supplier-calloff-pic-${c.id}`} />
        </div>
      </TableCell>
      <TableCell className="text-right whitespace-nowrap">
        <Data>{`${qty(c.quantity)} ${c.uom}`}</Data>
      </TableCell>
      <TableCell className="whitespace-nowrap">
        <Data as="div" className="text-xs">
          {formatDate(c.needDate)}
        </Data>
        <div className="text-[length:var(--fs-label-3)] text-text-secondary">
          {t(`co.type.${c.type}`)}
        </div>
      </TableCell>
      <TableCell>
        <ConfirmationPill status={v.confirmation} />
        {needsAnswer && v.deadline && (
          <div
            className="mt-1 text-[length:var(--fs-label-3)] text-text-secondary"
            data-testid={`supplier-calloff-confirm-by-${c.id}`}
          >
            {t('co.col.confirmBy')}{' '}
            <Data className="whitespace-nowrap">{formatDateTime(v.deadline.toISOString())}</Data>
          </div>
        )}
        {/* PEX-10 (BL-273) — the fulfilment window the confirmation commits to. */}
        <FulfilBy callOff={c} testId={`supplier-calloff-fulfil-by-${c.id}`} />
        {/* CR-05 — the rule that decided this confirmation, on the row
            the supplier is reading, not only inside the panel. */}
        {v.tolerance && c.confirmation && (
          <ToleranceTags
            check={v.tolerance}
            uom={c.uom}
            approval={c.confirmation.approval}
            testId={`supplier-calloff-tol-${c.id}`}
          />
        )}
      </TableCell>
      <TableCell>
        <DeliveryPill status={v.delivery} />
      </TableCell>
      <TableCell className="text-right whitespace-nowrap">
        <Button
          variant={needsAnswer ? 'outline' : 'secondary'}
          onClick={() => onOpen(c.id)}
          aria-label={`${t(needsAnswer ? 'co.action.respond' : 'co.action.open')} ${c.callOffNumber}`}
        >
          {t(needsAnswer ? 'co.action.respond' : 'co.action.open')}
        </Button>
      </TableCell>
    </TableRow>
  );
};

export default CallOffRow;
