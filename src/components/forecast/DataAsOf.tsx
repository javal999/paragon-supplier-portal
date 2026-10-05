import React from 'react';
import { useTranslation } from 'react-i18next';
import Data from '@components/ui-v2/Data';
import PageMetaLine from '@components/ui-v2/PageMetaLine';
import { formatDate, formatDateTime } from '@lib/format';

// ─────────────────────────────────────────────────────────────────────────────
// DATA AS OF — F-26 (Forecast UX phase 1, task A4).
//
// One date line on every buyer forecast page: "Data as of <date>". A page that
// needs more (a horizon, a replay window, the previous run) passes it as
// `detail`, which renders as a second line.
// ─────────────────────────────────────────────────────────────────────────────

interface DataAsOfProps {
  /** ISO date or date-time the page's figures were read at; null when unknown. */
  readonly date: string | null;
  /** Show the time too (Data health's checks are timed). */
  readonly withTime?: boolean;
  /** An optional second line. */
  readonly detail?: React.ReactNode;
}

const DataAsOf: React.FC<DataAsOfProps> = ({ date, withTime = false, detail }) => {
  const { t } = useTranslation();
  return (
    <div className="mb-3" data-testid="data-as-of">
      <PageMetaLine>
        {t('fux.asOf')}{' '}
        <Data data-testid="data-as-of-date">{date === null ? '—' : withTime ? formatDateTime(date) : formatDate(date)}</Data>
      </PageMetaLine>
      {detail ? <PageMetaLine className="mt-0.5">{detail}</PageMetaLine> : null}
    </div>
  );
};

export default DataAsOf;
