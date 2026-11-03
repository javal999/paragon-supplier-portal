/** @import React from 'react' */
import { useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Link } from 'react-router-dom';
import FilterChipsBar from '@components/ui-v2/FilterChipsBar';
import Table from '@components/ui-v2/Table';
import TableHeader, { TableHeaderCell } from '@components/ui-v2/TableHeader';
import TermTip from '@components/forecast/TermTip';
/** @import { StabiliseRunView } from '@services/data/types' */
import { REPLAY_WEEKS } from '@services/data/mock/stabiliseReadModel';
import { anyHeld } from '../utils';
import { TAB_PARAM } from '../const';
import SeriesRow from './SeriesRow';

/**
 * The supplier × material series of one run, filtered to the series a rule held
 * (or all of them), each row opening its weeks. It owns the filter and which
 * row is open; both reset when the source changes, because the run section is
 * keyed by source. `series` is the run's series (`run.series`).
 *
 * FSR-D5 (BL-238, C-03): the basis line under the table says that Engine
 * value, Last published and First published are the engine's versions
 * replayed `REPLAY_WEEKS` back (ENG-B30), while suppliers hold the sample
 * Version 2, which the Published versions tab lists (FUX2-R1). No column is
 * renamed: the Source column still waits for the engine (F-13, FUX-D4).
 * @type {React.FC<{ series: StabiliseRunView['series'] }>}
 */
const SeriesSection = ({ series }) => {
  const { t } = useTranslation();
  const [onlyMoving, setOnlyMoving] = useState(/** @type {'moving' | 'all'} */ ('moving'));
  const [open, setOpen] = useState(/** @type {string | null} */ (null));
  const rows = useMemo(
    () => series.filter((s) => onlyMoving === 'all' || anyHeld(s)),
    [series, onlyMoving]
  );
  return (
    <section
      className="bg-bg-surface border border-border-subtle rounded-lg p-4 mb-6"
      data-testid="stb-series"
    >
      <h2 className="text-section text-text-primary mb-1">{t('stb.series.title')}</h2>
      <p className="text-xs text-text-tertiary mb-3">{t('stb.series.intro')}</p>
      <div className="mb-3">
        <FilterChipsBar
          options={[
            {
              id: 'moving',
              label: t('stb.series.onlyMoving'),
              count: series.filter(anyHeld).length
            },
            { id: 'all', label: t('stb.series.all'), count: series.length }
          ]}
          value={onlyMoving}
          onChange={setOnlyMoving}
        />
      </div>
      {rows.length === 0 ? (
        <p className="text-sm text-text-tertiary py-6 text-center" data-testid="stb-series-empty">
          {t('stb.series.empty')}
        </p>
      ) : (
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableHeaderCell>{t('stb.series.col.material')}</TableHeaderCell>
              <TableHeaderCell>{t('stb.series.col.supplier')}</TableHeaderCell>
              <TableHeaderCell>
                <span className="inline-flex items-center gap-1">
                  {t('stb.series.col.zones')} <TermTip term="Firm" /> <TermTip term="Trade-off" />
                </span>
              </TableHeaderCell>
              <TableHeaderCell term="seriesHeld" />
              <TableHeaderCell term="seriesMasc" />
              <TableHeaderCell>{t('stb.series.col.open')}</TableHeaderCell>
            </TableHeader>
            <tbody>
              {rows.map((s) => (
                <SeriesRow
                  key={`${s.supplierId}-${s.materialCode}`}
                  s={s}
                  open={open}
                  setOpen={setOpen}
                />
              ))}
            </tbody>
          </Table>
        </div>
      )}
      <p className="text-xs text-text-secondary mt-3" data-testid="stb-series-basis">
        {t('stb.series.basis', { weeks: REPLAY_WEEKS })}{' '}
        <Link
          to={`/buyer/stabilise?${TAB_PARAM}=versions`}
          className="text-action-hover hover:underline"
          data-testid="stb-series-basis-link"
        >
          {t('stb.series.basis.link')}
        </Link>
        .
      </p>
    </section>
  );
};

export default SeriesSection;
