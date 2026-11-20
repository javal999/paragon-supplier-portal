/** @import React from 'react' */
import { useTranslation } from 'react-i18next';
import TermLabel from '@components/ui-v2/TermLabel';
import Button from '@components/ui-v2/Button';
import Data from '@components/ui-v2/Data';
import WeekGrid from '@components/ui-v2/WeekGrid';
import { HandoffNotice } from '@components/ui-v2/HandoffNotice';
/** @import { CapacityReason, ForecastCommitmentLine } from '@services/data/types' */
/** @import { VerbAvailability } from '@services/transitions/handoff' */
/** @import { CapacityLeft } from '@services/transitions/zoneCapacityLeftRules' */
/** @import { ReadRow, ReasonLabel, RowDraft } from '../const' */
import { formatNumber } from '@lib/format';
import { isAcknowledgeOnly, periodKindOf } from '@services/transitions/forecastRules';
import { shortfallReasonNeedsNote } from '@services/transitions/reasonCodes';
import {
  CommitmentDeadline,
  CommitmentStatePill,
  GapCell,
  ZonePill,
  forecastNow
} from '../../forecasts/forecastDisplay';
import { inputClass } from '../../inventory/inventoryDisplay';
import { DemandCell, FulfilByCell } from './gridCells';
import CommitmentLog from './CommitmentLog';

/**
 * CAP-1 wave 3 (Table 10, AC-05) — one material's commitments through the
 * shared `WeekGrid` (PEX-2 BL-265, BR-01 / BR-05): a COLUMN per period, oldest
 * first, that scrolls sideways, and the measures as rows with the labels
 * pinned on the left — as the buyer grid already reads.
 *
 * The horizon is weeks THEN months, so the month periods are the grid's own
 * month columns (CAP-2 BR-07): the Weekly view shows the same weeks as before
 * and the Monthly view the same months, and a month period keeps its quantity
 * field and its Save draft — it is a commit period, not a summary, so it is
 * not the read-only combined month of CAP-2 BR-05. The rows are the eight
 * measures — zone, ordered quantity, due, fulfilment window, commitment,
 * upside, reason and state — and the ninth row carries the period's own
 * actions: Save draft for a committed period, Acknowledge for the later weeks
 * of Zone Capacity (BR-08), or the handoff notice when the seat may not act.
 * An acknowledge-only period still shows its capacity left and no quantity.
 * @type {React.FC<{
 *   code: string;
 *   mine: ForecastCommitmentLine[];
 *   periodLabel: (bucket: string) => string;
 *   nowIso: string;
 *   canCommit: boolean;
 *   canAck: boolean;
 *   pending: boolean;
 *   submitAvail: VerbAvailability;
 *   ackAvail: VerbAvailability;
 *   capacityLeft?: (l: ForecastCommitmentLine) => CapacityLeft;
 *   commitmentReasons: string[];
 *   reasonLabel: ReasonLabel;
 *   readRow: (l: ForecastCommitmentLine) => ReadRow;
 *   setRow: (l: ForecastCommitmentLine, patch: Partial<RowDraft>) => void;
 *   onCommitRow: (l: ForecastCommitmentLine, draftOnly: boolean) => Promise<void>;
 *   onAcknowledge: (l: ForecastCommitmentLine) => void;
 * }>}
 */
const MaterialSection = ({
  code,
  mine,
  periodLabel,
  nowIso,
  canCommit,
  canAck,
  pending,
  submitAvail,
  ackAvail,
  capacityLeft,
  commitmentReasons,
  reasonLabel,
  readRow,
  setRow,
  onCommitRow,
  onAcknowledge
}) => {
  const { t } = useTranslation();
  const first = mine[0];
  const logged = mine.filter((l) => !isAcknowledgeOnly(l.zone) && l.log.length > 0);
  /** @param {number} i */
  const at = (i) => mine[i];
  const dash = <span className="text-xs text-text-tertiary">—</span>;
  return (
    <section
      className="bg-bg-surface border border-border-subtle rounded-lg shadow-sm"
      data-testid={`fc-sup-material-${code}`}
    >
      <div className="px-4 py-3 border-b border-border-subtle">
        <Data className="font-semibold">{code}</Data>{' '}
        <span className="text-sm text-text-primary">· {first.materialLabel}</span>
        <p className="text-xs text-text-secondary mt-1" data-testid={`fc-sup-demand-note-${code}`}>
          {t('fc.sup.demandNote')}
        </p>
        <p className="text-xs text-text-tertiary">{t('fc.sup.grid.scrollHint')}</p>
      </div>
      <WeekGrid
        label={t('fc.sup.grid.label', { material: code })}
        corner={t('fc.col.period')}
        currentWeek={forecastNow()}
        testId={`fc-sup-grid-${code}`}
        viewKey="supplierForecastCommitments"
        weeks={mine.map((l) => {
          const ack = isAcknowledgeOnly(l.zone);
          const { qtyValue } = ack ? { qtyValue: null } : readRow(l);
          const below = !ack && qtyValue !== null && qtyValue < l.forecastQty;
          return {
            week: l.periodBucket,
            month: periodKindOf(l.periodBucket) === 'month',
            gap: below,
            testId: `fc-sup-row-${l.materialCode}-${l.periodBucket}`
          };
        })}
        rows={[
          {
            id: 'zone',
            label: <TermLabel term="forecastZone" />,
            align: 'start',
            combine: 'distinct',
            value: (_bucket, i) => at(i).zone,
            cell: (_bucket, i) => <ZonePill zone={at(i).zone} withTip />
          },
          {
            id: 'demand',
            label: <TermLabel term="publishedForecast" values={{ uom: first.uom }} />,
            align: 'start',
            combine: 'sum',
            value: (_bucket, i) => at(i).forecastQty,
            format: (n) => formatNumber(n, { maximumFractionDigits: 2 }),
            cell: (_bucket, i) => <DemandCell l={at(i)} label={periodLabel(at(i).periodBucket)} />
          },
          {
            id: 'due',
            label: <TermLabel term="commitmentDue" />,
            align: 'start',
            cell: (_bucket, i) => {
              const l = at(i);
              return (
                <CommitmentDeadline
                  line={l}
                  nowIso={nowIso}
                  testId={`fc-due-${l.materialCode}-${l.periodBucket}`}
                />
              );
            }
          },
          {
            id: 'fulfilBy',
            label: t('fc.sup.row.fulfilBy'),
            align: 'start',
            cell: (_bucket, i) =>
              isAcknowledgeOnly(at(i).zone) ? dash : <FulfilByCell l={at(i)} />
          },
          {
            id: 'commitment',
            label: <TermLabel term="commitment" values={{ uom: first.uom }} />,
            align: 'start',
            cell: (_bucket, i) => {
              const l = at(i);
              if (isAcknowledgeOnly(l.zone)) {
                const left = capacityLeft?.(l);
                return (
                  <div className="text-xs text-text-tertiary">
                    {t('fc.sup.ackOnly')}
                    {left && (
                      <p
                        className="mt-2 text-text-secondary"
                        data-testid={`fc-cap-left-${l.materialCode}-${l.periodBucket}`}
                      >
                        {left.left === null ? (
                          t('capHeadsUp.noCapacity')
                        ) : (
                          <>
                            {t('fc.sup.capacityLeft')}{' '}
                            <Data>
                              {formatNumber(left.left)} {l.uom}
                            </Data>
                          </>
                        )}
                      </p>
                    )}
                  </div>
                );
              }
              return (
                <input
                  aria-label={t('fc.sup.qtyFor', { period: periodLabel(l.periodBucket) })}
                  inputMode="decimal"
                  className={`${inputClass} min-w-[110px]`}
                  disabled={!canCommit}
                  value={readRow(l).d.qty}
                  onChange={(e) => setRow(l, { qty: e.target.value })}
                />
              );
            }
          },
          {
            id: 'upside',
            label: <TermLabel term="commitmentUpside" values={{ uom: first.uom }} />,
            align: 'start',
            cell: (_bucket, i) =>
              isAcknowledgeOnly(at(i).zone) ? (
                dash
              ) : (
                <input
                  aria-label={t('fc.sup.upsideFor', { period: periodLabel(at(i).periodBucket) })}
                  inputMode="decimal"
                  className={`${inputClass} min-w-[90px]`}
                  disabled={!canCommit}
                  value={readRow(at(i)).d.upside}
                  onChange={(e) => setRow(at(i), { upside: e.target.value })}
                />
              )
          },
          {
            id: 'reason',
            label: t('fc.col.reason'),
            align: 'start',
            combine: 'distinct',
            value: (_bucket, i) => {
              const l = at(i);
              if (isAcknowledgeOnly(l.zone)) return null;
              const { d, qtyValue } = readRow(l);
              return qtyValue !== null && qtyValue < l.forecastQty && d.reason
                ? reasonLabel('commitmentShortfall', d.reason)
                : null;
            },
            cell: (_bucket, i) => {
              const l = at(i);
              if (isAcknowledgeOnly(l.zone)) return dash;
              const { d, qtyValue } = readRow(l);
              const below = qtyValue !== null && qtyValue < l.forecastQty;
              if (!below) return dash;
              const period = periodLabel(l.periodBucket);
              return (
                <div className="space-y-1">
                  <select
                    aria-label={t('fc.sup.reasonFor', { period })}
                    className={inputClass}
                    disabled={!canCommit}
                    value={d.reason}
                    onChange={(e) =>
                      setRow(l, {
                        reason: /** @type {CapacityReason | ''} */ (e.target.value)
                      })
                    }
                  >
                    <option value="">{t('fc.reason.select')}</option>
                    {commitmentReasons.map((r) => (
                      <option key={r} value={r}>
                        {reasonLabel('commitmentShortfall', r)}
                      </option>
                    ))}
                  </select>
                  {shortfallReasonNeedsNote(d.reason) && (
                    <input
                      aria-label={t('fc.sup.noteFor', { period })}
                      className={inputClass}
                      placeholder={t('fc.reason.notePlaceholder')}
                      disabled={!canCommit}
                      value={d.note}
                      onChange={(e) => setRow(l, { note: e.target.value })}
                    />
                  )}
                </div>
              );
            }
          },
          {
            id: 'status',
            label: t('fc.col.status'),
            align: 'start',
            cell: (_bucket, i) => {
              const l = at(i);
              return (
                <div className="space-y-1" data-testid={`fc-sup-state-${code}-${l.periodBucket}`}>
                  <CommitmentStatePill line={l} nowIso={nowIso} />
                  {/* BL-241 (U-05) — the draft marker only while the period is
                      still awaited: once it is submitted PTI sees it, so "not
                      visible to PTI" would be false. */}
                  {l.state === 'awaiting' && l.draft && (
                    <div className="text-xs text-text-tertiary" data-testid={`fc-draft-${l.key}`}>
                      {t('fc.sup.draftSaved')}
                    </div>
                  )}
                  <GapCell line={l} />
                </div>
              );
            }
          },
          {
            id: 'actions',
            label: t('fc.col.actions'),
            align: 'start',
            cell: (_bucket, i) => {
              const l = at(i);
              const period = periodLabel(l.periodBucket);
              if (isAcknowledgeOnly(l.zone)) {
                if (l.state !== 'awaiting') return null;
                return canAck ? (
                  <Button
                    variant="outline"
                    disabled={pending}
                    onClick={() => onAcknowledge(l)}
                    aria-label={t('fc.sup.acknowledgeFor', { period })}
                  >
                    {t('fc.sup.acknowledge')}
                  </Button>
                ) : (
                  <HandoffNotice availability={ackAvail} testId="handoff-forecast-acknowledge" />
                );
              }
              const { qtyValue, refusal } = readRow(l);
              return canCommit ? (
                <div className="flex flex-col gap-1">
                  <Button
                    variant="secondary"
                    disabled={pending || qtyValue === null}
                    onClick={() => void onCommitRow(l, true)}
                    aria-label={t('fc.sup.draftFor', { period })}
                  >
                    {t('fc.sup.saveDraft')}
                  </Button>
                  {refusal && (
                    <span role="status" className="text-xs text-warning-hover">
                      {t(`fc.sup.refusal.${refusal}`)}
                    </span>
                  )}
                </div>
              ) : (
                <HandoffNotice availability={submitAvail} testId="handoff-forecast-commit" />
              );
            }
          }
        ]}
      />
      {logged.map((l) => (
        <CommitmentLog key={l.key} l={l} label={periodLabel(l.periodBucket)} />
      ))}
    </section>
  );
};

export default MaterialSection;
