/** @import React from 'react' */
import { useTranslation } from 'react-i18next';
import Data from '@components/ui-v2/Data';
import StatusPill from '@components/ui-v2/StatusPill';
import TableRow from '@components/ui-v2/TableRow';
import TableCell from '@components/ui-v2/TableCell';
/** @import { AnyAwardLine } from '@services/sourcing/types' */
/** @import { AwardItemBreak } from '@services/sourcing/awardShape' */
import { GateMarker, qty } from '../../rfxDisplay';
import { EligibilityMarker } from '../../eligibilityDisplay';
import { ComplianceAwardPill, useAwardCompliance } from '../../ComplianceAwardPill';
/** @import { AwardBid } from '../types' */
/** @import { ItemRowProps } from './AwardItemRow' */

/**
 * One bid's row in an item's table: the supplier with its compliance pill,
 * best-scored marker and eligibility, the price, the typed share or quantity
 * (or why there is no input), and the derived side.
 * @template {AnyAwardLine} L
 * @param {ItemRowProps<L> & { brk: AwardItemBreak; bid: AwardBid }} props
 * @returns {React.ReactElement}
 */
export const AwardBidRow = ({
  model,
  item,
  label,
  brk,
  bid,
  draft,
  lines,
  qualifies,
  gateOf,
  eligibilityOf,
  supplierName,
  showBestMarker,
  onChange
}) => {
  const { t } = useTranslation();
  const key = item.key;
  const line = lines.find((l) => model.bidKeyOf(l) === bid.key);
  const uom = model.uomOf(item);
  const side = draft.basis === 'pct' ? t('rfx.award.col.share') : t('rfqCompare.award.qty');
  const eligibility = eligibilityOf?.(bid.supplierId);
  const compliance = useAwardCompliance();
  return (
    <TableRow data-testid={`award-input-${key}-${bid.supplierId}`}>
      <TableCell>
        {supplierName(bid.supplierId)}
        {/* Material B4 (MR-2 step 4) — the bidder's weekly update compliance. */}
        <ComplianceAwardPill
          pct={compliance.pctOf(bid.supplierId)}
          testId={`award-compliance-${key}-${bid.supplierId}`}
        />
        {showBestMarker(item) && model.bestOf(item, brk.qty) === bid.key && (
          <StatusPill variant="success" className="ml-2">
            {t('rfqCompare.cmp.bestScored')}
          </StatusPill>
        )}
        {/* Material G2 (edge case 1) — why this bidder is below the level. */}
        <div className="mt-1">
          <EligibilityMarker
            eligibility={eligibility}
            testId={`award-elig-${key}-${bid.supplierId}`}
          />
        </div>
      </TableCell>
      <TableCell>{model.priceCell(item, bid, brk)}</TableCell>
      <TableCell>
        {/* BR-01a — no input for a supplier failing the gate, and the reason
            instead. The verb refuses it too: this is the message, not the lock. */}
        {!qualifies(bid.supplierId) ? (
          <GateMarker
            gate={gateOf(bid.supplierId)}
            testId={`award-gate-${key}-${bid.supplierId}`}
          />
        ) : eligibility?.state === 'refused' ? (
          <span
            className="text-xs text-danger"
            data-testid={`award-not-qualified-${key}-${bid.supplierId}`}
          >
            {t('elig.refused')}
          </span>
        ) : (
          <input
            type="number"
            min={0}
            max={draft.basis === 'pct' ? 100 : undefined}
            aria-label={`${label} — ${supplierName(bid.supplierId)} — ${side}`}
            value={draft.values[bid.key] ?? ''}
            onChange={(e) =>
              onChange({ ...draft, values: { ...draft.values, [bid.key]: e.target.value } })
            }
            className="w-28 bg-white border border-border-input rounded-md px-3 h-9 text-sm focus:outline-none focus:border-action"
          />
        )}
      </TableCell>
      {/* The derived side, read-only: the quantity a share makes, or the share a quantity is. */}
      <TableCell data-testid={`award-qty-${key}-${bid.supplierId}`}>
        {line ? (
          <Data>
            {draft.basis === 'pct'
              ? `${qty(line.quantity)}${uom ? ` ${uom}` : ''}`
              : `${line.sharePct}%`}
          </Data>
        ) : (
          <span className="text-text-tertiary">—</span>
        )}
      </TableCell>
    </TableRow>
  );
};
