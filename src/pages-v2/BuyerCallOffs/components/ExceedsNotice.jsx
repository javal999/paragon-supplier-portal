/** @import React from 'react' */
/** @import { ReleaseCheck } from '@services/transitions/callOffRules' */
import { useTranslation } from 'react-i18next';
import { formatIDR } from '@lib/format';
import { qty } from '../../callOffs/callOffDisplay';

/**
 * CR-04 / BL-49 — why a release is refused, with the figures: the requested
 * quantity against the remaining quantity, or, on a line with no quantity, the
 * requested value against the remaining value. The page never decides: this
 * mirrors the same `releaseCheck` the policy hook runs. Renders nothing while
 * the check passes or is `null`. Moved out of `BuyerCallOffs.jsx` by the Phase
 * 5 page split (no behaviour change).
 * @type {React.FC<{ check: ReleaseCheck | null; uom: string; testId: string }>}
 */
const ExceedsNotice = ({ check, uom, testId }) => {
  const { t } = useTranslation();
  if (!check?.exceeds) return null;
  return (
    <p role="alert" className="mt-1 text-xs text-danger" data-testid={testId}>
      {check.basis === 'quantity'
        ? t('co.new.exceeds', {
            requested: qty(check.requestedQty),
            remaining: qty(check.remaining.remainingQty ?? 0),
            uom
          })
        : t('co.new.exceedsValue', {
            requested: formatIDR(check.requestedValue),
            remaining: formatIDR(check.remaining.remainingValue)
          })}
    </p>
  );
};

export default ExceedsNotice;
