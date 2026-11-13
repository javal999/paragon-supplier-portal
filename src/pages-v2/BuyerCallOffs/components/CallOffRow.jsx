/** @import React from 'react' */
/** @import { CallOffView } from '@services/transitions/callOffRules' */
/** @import { useRowHighlight } from '@hooks/useRowHighlight' */
/** @import { LinkedAsn, Panel } from '../utils' */
import { useTranslation } from 'react-i18next';
import Button from '@components/ui-v2/Button';
import Data from '@components/ui-v2/Data';
import StatusPill from '@components/ui-v2/StatusPill';
import TableCell from '@components/ui-v2/TableCell';
import TableRow from '@components/ui-v2/TableRow';
import { HIGHLIGHTED_ROW_CLASS } from '@hooks/useRowHighlight';
import { formatDate } from '@lib/format';
import { ConfirmationPill, DeliveryPill, ToleranceTags, qty } from '../../callOffs/callOffDisplay';
import { PoOnHoldOriginMarker } from '../../callOffs/poOnHoldOrigin';
import { RopFisikMarker } from '../../callOffs/ropFisikTrigger';
import { actionKey, releaseWithheld } from '../utils';
import EngineOriginMarker from './EngineOriginMarker';

/**
 * @typedef {object} CallOffRowProps
 * @property {CallOffView} v The call-off and its derived confirmation and delivery status.
 * @property {ReturnType<typeof useRowHighlight>} highlight IA-B13 — the call-off a link names: its row is marked and scrolled to.
 * @property {Map<string, LinkedAsn[]>} linkedAsns Each call-off's ASNs with their current comparison (the "Mismatch" marker, MR-6 BR-12).
 * @property {(next: Panel) => void} open Opens the call-off's side panel.
 */

/**
 * One call-off row of an umbrella line: number with its origin markers, type,
 * quantity, need date, confirmation (with the tolerance rule that decided it),
 * delivery (with the ASN mismatch marker) and the row action. Moved out of
 * `BuyerCallOffs.jsx` by the Phase 5 page split (no behaviour change).
 * @type {React.FC<CallOffRowProps>}
 */
const CallOffRow = ({ v, highlight, linkedAsns, open }) => {
  const { t } = useTranslation();
  return (
    <TableRow
      data-testid={`calloff-row-${v.callOff.id}`}
      ref={highlight.id === v.callOff.id ? highlight.scrollRef : undefined}
      aria-current={highlight.id === v.callOff.id ? 'true' : undefined}
      className={highlight.id === v.callOff.id ? HIGHLIGHTED_ROW_CLASS : undefined}
    >
      <TableCell>
        <Data className="text-xs font-bold text-text-primary whitespace-nowrap">
          {v.callOff.callOffNumber}
        </Data>
        {releaseWithheld(v.callOff) && (
          <div className="mt-1">
            <EngineOriginMarker testId={`calloff-origin-engine-${v.callOff.id}`} />
          </div>
        )}
        {/* BL-199 (DRC-13) — a draft the hub made at ROP Fisik. */}
        {v.callOff.origin === 'ropFisik' && (
          <div className="mt-1">
            <RopFisikMarker testId={`calloff-origin-rop-fisik-${v.callOff.id}`} />
          </div>
        )}
        {/* PEX-8 — a call-off the end of a PO On Hold grace period created. */}
        {v.callOff.origin === 'poOnHold' && (
          <div className="mt-1">
            <PoOnHoldOriginMarker
              persona="buyer"
              testId={`calloff-origin-po-on-hold-${v.callOff.id}`}
            />
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
  );
};

export default CallOffRow;
