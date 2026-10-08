/** @import React from 'react' */
import { useTranslation } from 'react-i18next';
import { CalendarRange } from 'lucide-react';
/** @import { ForecastLine, ForecastPublication, RequirementResponse } from '@services/sdc' */
import { latestResponseFor } from '../utils';
import LineCard from './LineCard';

/**
 * The "Forecast lines" tab: one `LineCard` per published line, each with the
 * supplier's latest own response to it, or the empty state when the
 * publication carries no lines for this supplier.
 *
 * `onConfirm` / `onAcknowledge` open the workspace's confirm or acknowledge panel.
 * @type {React.FC<{ lines: readonly ForecastLine[]; responses: readonly RequirementResponse[]; publication: ForecastPublication; onConfirm: (line: ForecastLine) => void; onAcknowledge: (line: ForecastLine) => void; }>}
 */
const LinesTab = ({ lines, responses, publication, onConfirm, onAcknowledge }) => {
  const { t } = useTranslation();
  return lines.length === 0 ? (
    <div className="bg-bg-surface border border-border-subtle rounded-lg py-12 px-6 text-center">
      <div className="inline-flex w-12 h-12 rounded-full bg-bg-hover items-center justify-center mb-3">
        <CalendarRange size={20} className="text-text-tertiary" />
      </div>
      <div className="text-base font-semibold text-text-primary mb-1">
        {t('sdcSup.lines.emptyTitle')}
      </div>
      <div className="text-sm text-text-tertiary">{t('sdcSup.lines.emptyBody')}</div>
    </div>
  ) : (
    <div className="flex flex-col gap-4" data-testid="sdcsup-lines">
      {lines.map((line) => (
        <LineCard
          key={`${line.materialCode}|${line.periodBucket}`}
          line={line}
          latest={latestResponseFor(responses, publication, line)}
          onConfirm={onConfirm}
          onAcknowledge={onAcknowledge}
        />
      ))}
    </div>
  );
};

export default LinesTab;
