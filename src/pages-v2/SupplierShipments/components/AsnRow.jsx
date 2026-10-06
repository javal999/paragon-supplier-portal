/** @import React from 'react' */
import { ChevronDown, ChevronRight } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import Button from '@components/ui-v2/Button';
import Data from '@components/ui-v2/Data';
import { HandoffNotice } from '@components/ui-v2/HandoffNotice';
import StatusPill from '@components/ui-v2/StatusPill';
import TableCell from '@components/ui-v2/TableCell';
import TableRow from '@components/ui-v2/TableRow';
import TrackingNumber from '@components/ui-v2/TrackingNumber';
import { ASN_CANCELLABLE_STATES } from '@services/transitions/fulfilmentRules';
/** @import { ASN } from '@services/data/types' */
/** @import { AsnVerbs } from '../const' */
import { STATUS_VARIANT } from '../const';
import { fmtDate } from '../utils';

/**
 * One ASN's row in the list: the expand toggle, its identifiers and status,
 * and the action cell — Submit on a Draft, the dock's notice on a
 * Discrepancy, Cancel while cancellable — each verb in its own slot.
 * @type {React.FC<{ asn: ASN; isOpen: boolean; asnVerbs: AsnVerbs; onToggleExpand: (asnNumber: string) => void; onSubmitAsn: (asnNumber: string) => void; onCancelAsn: (asnNumber: string) => void }>}
 */
const AsnRow = ({ asn, isOpen, asnVerbs, onToggleExpand, onSubmitAsn, onCancelAsn }) => {
  const { t } = useTranslation();
  return (
    <TableRow>
      <TableCell>
        <button
          type="button"
          onClick={() => onToggleExpand(asn.asnNumber)}
          aria-label={
            isOpen ? t('supplierShipments.aria.collapse') : t('supplierShipments.aria.expand')
          }
          className="text-text-tertiary hover:text-text-primary"
        >
          {isOpen ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
        </button>
      </TableCell>
      <TableCell>
        <Data className="text-xs font-bold text-text-primary whitespace-nowrap">
          {asn.asnNumber}
        </Data>
      </TableCell>
      <TableCell className="text-xs text-text-secondary whitespace-nowrap">
        <Data>{asn.poReference}</Data>
      </TableCell>
      <TableCell>
        <StatusPill variant={STATUS_VARIANT[asn.status]}>{asn.status}</StatusPill>
      </TableCell>
      <TableCell className="text-text-secondary whitespace-nowrap">{asn.carrier}</TableCell>
      <TableCell className="text-xs text-text-tertiary whitespace-nowrap">
        {/* BL-51 — a link to the 3PL's tracking page, or plain text. */}
        <TrackingNumber
          threePlId={asn.threePlId}
          trackingNumber={asn.trackingNumber}
          testId={`asn-tracking-${asn.asnNumber}`}
        />
      </TableCell>
      <TableCell className="text-text-tertiary whitespace-nowrap">
        <Data>{asn.eta ? fmtDate(asn.eta) : '—'}</Data>
      </TableCell>
      <TableCell className="text-right whitespace-nowrap">
        {asn.status === 'Draft' &&
          (asnVerbs.submit.kind === 'held' ? (
            <Button variant="outline" onClick={() => onSubmitAsn(asn.asnNumber)}>
              {t('asn.submit.action')}
            </Button>
          ) : (
            <HandoffNotice availability={asnVerbs.submit} testId="handoff-asn-submit" />
          ))}
        {/* ⚠️ **THIS WAS A BUTTON THAT LIED, AND IT IS NOW THE
            WAIT.** It rendered "Resolve", fired an info toast
            ("Discrepancy handling pending"), and changed nothing.
            Both halves of that were wrong by the time it was read:
            `t_asn_resolve_discrepancy` has been dispatchable since
            it was authored, and its atom `asn:flag` lives in
            `receiving` — a BUYER lane. **No supplier lane holds
            it** (`commercial` / `fulfilment` / `back_office`
            carry `asn:create` and `asn:submit`, never `:flag`),
            so this control could never have been the supplier's
            act however well it was wired. `availabilityOfAtom`
            therefore returns `withheld` here on every supplier
            seat that exists, and the notice names the dock. */}
        {asn.status === 'Discrepancy' && (
          <HandoffNotice availability={asnVerbs.resolve} testId="handoff-asn-resolve" />
        )}
        {ASN_CANCELLABLE_STATES.includes(asn.status) &&
          (asnVerbs.cancel.kind === 'held' ? (
            <Button
              variant="secondary"
              className="ml-2"
              onClick={() => onCancelAsn(asn.asnNumber)}
              aria-label={`${t('fc.asn.cancel.action')} ${asn.asnNumber}`}
            >
              {t('fc.asn.cancel.action')}
            </Button>
          ) : (
            <HandoffNotice availability={asnVerbs.cancel} testId="handoff-asn-cancel" />
          ))}
        {!ASN_CANCELLABLE_STATES.includes(asn.status) && asn.status !== 'Discrepancy' && (
          <span className="text-text-tertiary text-xs">—</span>
        )}
      </TableCell>
    </TableRow>
  );
};

export default AsnRow;
