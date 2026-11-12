/** @import React from 'react' */
import { useTranslation } from 'react-i18next';
import TermLabel from '@components/ui-v2/TermLabel';
import Data from '@components/ui-v2/Data';
/** @import { ForecastCommitmentLine } from '@services/data/types' */
/** @import { VerbAvailability } from '@services/transitions/handoff' */
/** @import { CapacityLeft } from '@services/transitions/zoneCapacityLeftRules' */
/** @import { ReadRow, ReasonLabel, RowDraft } from '../const' */
import AcknowledgeColumn from './AcknowledgeColumn';
import CommitmentColumn from './CommitmentColumn';
import CommitmentLog from './CommitmentLog';
import { CELL, HEAD } from './gridCells';
import { isAcknowledgeOnly } from '@services/transitions/forecastRules';

// BL-304 (UL-06) — below `md` the pinned label column is 7rem and its labels
// wrap, and the scroll area pads by it plus a cell's 0.75rem padding (measured
// at 390 px: 7rem alone left 12 px of the field under the labels), so a
// focused field lands clear of them; from `md` up the column is as wide as its longest label.
const LABEL = `${CELL} sticky left-0 z-10 bg-bg-surface font-medium text-text-secondary whitespace-normal md:whitespace-nowrap`;

/**
 * One material's commitments (PEX-2, BL-265 BR-01 / BR-05): a grid with one
 * COLUMN per period, oldest first, that scrolls sideways, and the row labels
 * pinned on the left — as the buyer grid already reads. An acknowledge-only
 * column for the later weeks of Zone Capacity; a commitment column for Zone
 * Liability and the damped weeks of Zone Capacity. Above the grid, PEX-3's
 * one-line note on where the ordered quantity comes from; under it, the
 * revision log of any period that has one.
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
      <div className="overflow-x-auto scroll-ps-[7.75rem] md:scroll-ps-0">
        <div
          role="group"
          aria-label={t('fc.sup.grid.label', { material: code })}
          className="grid grid-flow-col grid-rows-[repeat(10,auto)] grid-cols-[7rem] md:grid-cols-[max-content] auto-cols-[minmax(9rem,max-content)] w-max min-w-full"
          data-testid={`fc-sup-grid-${code}`}
        >
          <div className={`${HEAD} sticky left-0 z-10`} data-grid-label>
            {t('fc.col.period')}
          </div>
          {/* BL-306 (UL-08) — Zone Liability and Zone Capacity explain themselves on each period's chip. */}
          <div className={LABEL} data-grid-label>
            <TermLabel term="forecastZone" />
          </div>
          <div className={LABEL} data-grid-label>
            <TermLabel term="publishedForecast" values={{ uom: first.uom }} />
          </div>
          <div className={LABEL} data-grid-label>
            <TermLabel term="commitmentDue" />
          </div>
          <div className={LABEL} data-grid-label>
            {t('fc.sup.row.fulfilBy')}
          </div>
          <div className={LABEL} data-grid-label>
            <TermLabel term="commitment" values={{ uom: first.uom }} />
          </div>
          <div className={LABEL} data-grid-label>
            <TermLabel term="commitmentUpside" values={{ uom: first.uom }} />
          </div>
          <div className={LABEL} data-grid-label>
            {t('fc.col.reason')}
          </div>
          <div className={LABEL} data-grid-label>
            {t('fc.col.status')}
          </div>
          <div className={LABEL} data-grid-label>
            {t('fc.col.actions')}
          </div>
          {mine.map((l) => {
            const label = periodLabel(l.periodBucket);
            return isAcknowledgeOnly(l.zone) ? (
              <AcknowledgeColumn
                key={l.key}
                l={l}
                label={label}
                nowIso={nowIso}
                canAck={canAck}
                pending={pending}
                ackAvail={ackAvail}
                capacityLeft={capacityLeft?.(l)}
                onAcknowledge={onAcknowledge}
              />
            ) : (
              <CommitmentColumn
                key={l.key}
                l={l}
                label={label}
                nowIso={nowIso}
                canCommit={canCommit}
                pending={pending}
                submitAvail={submitAvail}
                commitmentReasons={commitmentReasons}
                reasonLabel={reasonLabel}
                readRow={readRow}
                setRow={setRow}
                onCommitRow={onCommitRow}
              />
            );
          })}
        </div>
      </div>
      {logged.map((l) => (
        <CommitmentLog key={l.key} l={l} label={periodLabel(l.periodBucket)} />
      ))}
    </section>
  );
};

export default MaterialSection;
