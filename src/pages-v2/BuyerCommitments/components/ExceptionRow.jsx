/** @import React from 'react' */
import { useTranslation } from 'react-i18next';
import TableRow from '@components/ui-v2/TableRow';
import TableCell from '@components/ui-v2/TableCell';
import Button from '@components/ui-v2/Button';
import Data from '@components/ui-v2/Data';
import { HandoffNotice } from '@components/ui-v2/HandoffNotice';
import { REQUEST_REVISION_ENABLED } from '@services/transitions/forecastConfig';
import {
  CommitmentDeadline,
  CommitmentStatePill,
  GapCell,
  ZonePill,
  qtyText
} from '../../forecasts/forecastDisplay';
/** @import { ForecastCommitmentLine } from '@services/data/types' */
/** @import { VerbAvailability } from '@services/transitions/handoff' */
/** @import { Action } from '../const' */
/** @import { useReasonLabel } from '../../admin/reasonCodeDisplay' */

/**
 * One ranked exception: rank, supplier, material, period, zone, forecast,
 * commitment (with the supplier's shortfall reason), gap, status, due, days of
 * supply, and the planner's actions. Accept and Request revision show for an
 * exception with a response when the seat holds `requirementresponse:dispute`;
 * Move demand when it holds `forecast:publish`; otherwise each verb's slot
 * renders its handoff notice (§76). Request revision renders only while
 * `REQUEST_REVISION_ENABLED` is true (CAP-7: hidden, not deleted).
 * @type {React.FC<{
 *   line: ForecastCommitmentLine;
 *   rank: number;
 *   days: number | null;
 *   periodLabel: (bucket: string) => string;
 *   reasonLabel: ReturnType<typeof useReasonLabel>;
 *   nowIso: string;
 *   review: VerbAvailability;
 *   publish: VerbAvailability;
 *   onAction: (kind: Action['kind'], line: ForecastCommitmentLine) => void;
 * }>}
 */
const ExceptionRow = ({
  line: l,
  rank,
  days,
  periodLabel,
  reasonLabel,
  nowIso,
  review,
  publish,
  onAction
}) => {
  const { t } = useTranslation();
  const reason = l.response?.rootCause;
  const label = `${l.supplierName} ${l.materialCode} ${periodLabel(l.periodBucket)}`;
  return (
    <TableRow data-testid={`fc-exception-${l.supplierId}-${l.materialCode}-${l.periodBucket}`}>
      <TableCell>
        <Data>{rank}</Data>
      </TableCell>
      <TableCell>
        <div className="text-sm text-text-primary">{l.supplierName}</div>
      </TableCell>
      <TableCell>
        <Data>{l.materialCode}</Data>
      </TableCell>
      <TableCell className="whitespace-nowrap">{periodLabel(l.periodBucket)}</TableCell>
      <TableCell>
        <ZonePill zone={l.zone} />
      </TableCell>
      <TableCell className="text-right">
        <Data>{qtyText(l.forecastQty)}</Data>
      </TableCell>
      <TableCell className="text-right">
        {l.committedQty !== null && l.state !== 'awaiting' ? (
          <Data>{qtyText(l.committedQty)}</Data>
        ) : (
          '—'
        )}
        {reason && (
          <div className="text-xs text-text-secondary ml-auto">
            {reasonLabel('commitmentShortfall', reason.level1)}
            {reason.note ? ` — ${reason.note}` : ''}
          </div>
        )}
      </TableCell>
      <TableCell>
        <GapCell line={l} />
      </TableCell>
      <TableCell>
        <CommitmentStatePill line={l} nowIso={nowIso} />
      </TableCell>
      <TableCell className="whitespace-nowrap">
        <CommitmentDeadline
          line={l}
          nowIso={nowIso}
          testId={`fc-due-exception-${l.supplierId}-${l.materialCode}-${l.periodBucket}`}
        />
      </TableCell>
      <TableCell>
        {days === null ? '—' : <Data>{t('fc.days', { count: Math.floor(days) })}</Data>}
      </TableCell>
      <TableCell>
        <div className="flex flex-wrap gap-2 min-w-[220px]">
          {l.state === 'exception' &&
            l.response &&
            (review.kind === 'held' ? (
              <>
                <Button
                  variant="outline"
                  onClick={() => onAction('accept', l)}
                  aria-label={t('fc.pti.gaps.acceptFor', { what: label })}
                >
                  {t('fc.pti.gaps.accept')}
                </Button>
                {REQUEST_REVISION_ENABLED ? (
                  <Button
                    variant="secondary"
                    onClick={() => onAction('revise', l)}
                    aria-label={t('fc.pti.gaps.reviseFor', { what: label })}
                  >
                    {t('fc.pti.gaps.revise')}
                  </Button>
                ) : null}
              </>
            ) : (
              <HandoffNotice availability={review} testId="handoff-commitment-review" />
            ))}
          {publish.kind === 'held' ? (
            <Button
              variant="secondary"
              onClick={() => onAction('reassign', l)}
              aria-label={t('fc.pti.gaps.reassignFor', { what: label })}
            >
              {t('fc.pti.gaps.reassign')}
            </Button>
          ) : (
            <HandoffNotice availability={publish} testId="handoff-forecast-reassign" />
          )}
        </div>
      </TableCell>
    </TableRow>
  );
};

export default ExceptionRow;
