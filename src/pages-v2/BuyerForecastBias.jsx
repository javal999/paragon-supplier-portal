/** @import React from 'react' */
import { useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Link } from 'react-router-dom';
import KpiCard from '@components/ui-v2/KpiCard';
import StatusPill from '@components/ui-v2/StatusPill';
import FilterChipsBar from '@components/ui-v2/FilterChipsBar';
import Table from '@components/ui-v2/Table';
import TableHeader, { TableHeaderCell } from '@components/ui-v2/TableHeader';
import TableRow from '@components/ui-v2/TableRow';
import TableCell from '@components/ui-v2/TableCell';
import Data from '@components/ui-v2/Data';
import Button from '@components/ui-v2/Button';
import LoadingState from '@components/ui-v2/LoadingState';
import ErrorState from '@components/ui-v2/ErrorState';
import { HandoffNotice } from '@components/ui-v2/HandoffNotice';
import { useToast } from '@hooks/useToast';
import { useRefusalText } from '@hooks/useRefusalText';
import { useVerbAvailability } from '@hooks/useVerbAvailability';
import { formatDate, formatDateTime, formatNumber } from '@lib/format';
import { useForecastBias } from '@services/query/hooks';
import { useForecastOverrideCommand } from '@services/query/commandHooks';
/** @import { ForecastBiasView, ForecastOverride } from '@services/data/types' */
/** @import { TrackingSignal } from '@services/engine/forecastBias' */
import { TS_MIN_ERRORS } from '@services/engine/forecastBias';
/** @import { FvaGroup, FvaMonth } from '@services/engine/forecastOverrides' */
import { directionOf } from '@services/engine/forecastOverrides';
import { labelOf } from '@services/sdc/materialMaster';
import { NOTE_REQUIRED_CODE } from '@services/transitions/reasonCodes';
import { useActiveReasonCodes, useReasonLabel } from './admin/reasonCodeDisplay';
import AboutThisPage from '@components/forecast/AboutThisPage';
import DataAsOf from '@components/forecast/DataAsOf';
import TermTip from '@components/forecast/TermTip';
import { forecastCrumb } from '@components/forecast/forecastPages';
import { FIELD_FOCUS_RING } from '@components/forecast/focusRing';

// ─────────────────────────────────────────────────────────────────────────────
// FORECAST BIAS — the "Bias and overrides" tab of Forecast quality (FUX phase 2
// B5; `/buyer/forecast-bias` redirects to `/buyer/demand-forecast?tab=bias`).
// REQ-E14-11, the Material Planning team's view (Experience:
// "a bias alarm per SKU and material, and a monthly report of override value by
// direction and size").
//
// BR-01: Trigg's tracking signal per SKU and material, on the engine's forecast
// and on SAP's plan over the same past weeks. X-06 / BR-03: the override form
// (`t_forecastoverride_record`, the `planning` lane) and the override ledger.
// BR-02 / BR-03: the monthly override value and the 13-week review flag — empty
// until overrides are entered and their weeks have sold; no history is
// invented. BR-04 (judging by service) needs E14-10's replay (BL-112) and says
// so. Every number is the service's own, computed on the engine's SYNTHETIC
// dataset (the `engineDataset` pill, X-03).
// ─────────────────────────────────────────────────────────────────────────────

// C2 (WCAG 2.4.7): the shared field class shows focus only as a 1 px border
// tint; the forecast fields add a ring.
const inputClass = `w-full px-3 py-2 text-sm text-text-primary bg-white border border-border-input rounded-md focus:outline-none focus:border-action placeholder:text-text-tertiary ${FIELD_FOCUS_RING}`;
const labelClass = 'block text-label text-text-tertiary uppercase mb-1';

/** @param {number | null} s */
const signalText = (s) =>
  s === null ? '—' : `${s > 0 ? '+' : ''}${formatNumber(Math.round(s * 100) / 100)}`;
/** @param {number | null} x */
const pct = (x) =>
  x === null ? '—' : `${x > 0 ? '+' : ''}${formatNumber(Math.round(x * 1000) / 10)}%`;
/** @param {number | null} x */
const fvaText = (x) =>
  x === null ? '—' : `${x > 0 ? '+' : ''}${formatNumber(Math.round(x * 10) / 10)}%`;

/** @type {React.FC<{ ts: TrackingSignal; testId: string }>} */
const SignalCell = ({ ts, testId }) => {
  const { t } = useTranslation();
  return (
    <div className="whitespace-nowrap" data-testid={testId}>
      <Data>{signalText(ts.signal)}</Data>{' '}
      {ts.alarm ? (
        <StatusPill variant="warning">{t(`fb.alarm.${ts.direction}`)}</StatusPill>
      ) : ts.errors < TS_MIN_ERRORS ? (
        <span className="text-xs text-text-tertiary">{t('fb.signal.few')}</span>
      ) : (
        <span className="text-xs text-text-tertiary">{t('fb.signal.ok')}</span>
      )}
      <div className="text-xs text-text-tertiary">
        {t('fb.signal.meanError')}{' '}
        <Data className="text-text-tertiary">{pct(ts.meanErrorPct)}</Data>
      </div>
    </div>
  );
};

/** @typedef {'all' | 'engine' | 'sap'} SkuFilter */
/** @typedef {'alarms' | 'all'} MaterialFilter */

/** @type {React.FC<{ view: ForecastBiasView }>} */
const OverrideForm = ({ view }) => {
  const { t } = useTranslation();
  const { toast } = useToast();
  const refusalText = useRefusalText();
  const command = useForecastOverrideCommand();
  const availability = useVerbAvailability('forecastoverride:record');
  const reasons = useActiveReasonCodes('forecastOverride');
  const reasonLabel = useReasonLabel();
  const skus = view.current.skus.filter((s) => s.method !== 'discontinued');
  const [skuCode, setSkuCode] = useState(/** @type {string} */ (skus[0]?.skuCode ?? ''));
  const sku = skus.find((s) => s.skuCode === skuCode) ?? null;
  const weeks = view.current.weeks
    .map((w, i) => ({ w, i }))
    .filter(({ w }) => !(sku?.endsOn && w >= sku.endsOn));
  const [weekIndex, setWeekIndex] = useState(/** @type {number} */ (0));
  const i = weeks.some((x) => x.i === weekIndex) ? weekIndex : (weeks[0]?.i ?? 0);
  const [value, setValue] = useState(/** @type {string} */ (''));
  const [reason, setReason] = useState(/** @type {string} */ (''));
  const [note, setNote] = useState(/** @type {string} */ (''));
  const [refusal, setRefusal] = useState(/** @type {string | null} */ (null));

  // Gate the MODE, not the button: a seat without the planning lane sees who
  // owns the act instead of a form it would be refused on (§84).
  if (availability.kind !== 'held')
    return <HandoffNotice availability={availability} testId="handoff-forecast-override" />;
  if (!sku) return <p className="text-sm text-text-tertiary">{t('fb.form.noSku')}</p>;

  const engine = sku.engineForecast[i];
  const inForce = sku.forecast[i];
  const parsed = value.trim() === '' ? null : Number(value);
  const valid = parsed !== null && Number.isInteger(parsed) && parsed >= 0;
  const up =
    valid && directionOf(engine, /** @type {NonNullable<typeof parsed>} */ (parsed)) === 'up';

  const submit = async () => {
    if (!valid) return;
    setRefusal(null);
    try {
      const res = await command.mutateAsync({
        skuCode: sku.skuCode,
        weekStart: view.current.weeks[i],
        newValue: /** @type {NonNullable<typeof parsed>} */ (parsed),
        reasonCode: reason || null,
        note: note.trim() || null
      });
      if (res.status === 'failed') {
        const description = refusalText(res.reason) ?? res.reason ?? '';
        setRefusal(description);
        toast({ variant: 'warning', title: t('fb.toast.refused'), description });
        return;
      }
      setValue('');
      setNote('');
      toast({ variant: 'success', title: t('fb.toast.recorded') });
    } catch {
      toast({ variant: 'error', title: t('fb.toast.refused') });
    }
  };

  return (
    <div className="space-y-3" data-testid="fb-form">
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-3">
        <div>
          <label htmlFor="fb-sku" className={labelClass}>
            {t('fb.form.sku')}
          </label>
          <select
            id="fb-sku"
            className={inputClass}
            value={sku.skuCode}
            onChange={(e) => setSkuCode(e.target.value)}
            data-testid="fb-form-sku"
          >
            {skus.map((s) => (
              <option key={s.skuCode} value={s.skuCode}>
                {`${s.skuCode} · ${s.name}`}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label htmlFor="fb-week" className={labelClass}>
            {t('fb.form.week')}
          </label>
          <select
            id="fb-week"
            className={inputClass}
            value={i}
            onChange={(e) => setWeekIndex(Number(e.target.value))}
            data-testid="fb-form-week"
          >
            {weeks.map(({ w, i: k }) => (
              <option key={w} value={k}>
                {formatDate(w)}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label htmlFor="fb-value" className={labelClass}>
            {t('fb.form.newValue')}
          </label>
          <input
            id="fb-value"
            type="number"
            min={0}
            step={1}
            inputMode="numeric"
            className={inputClass}
            value={value}
            onChange={(e) => setValue(e.target.value)}
            data-testid="fb-form-value"
          />
          <p className="text-xs text-text-tertiary mt-1" data-testid="fb-form-values">
            {t('fb.form.engine')} <Data>{formatNumber(engine)}</Data> · {t('fb.form.inForce')}{' '}
            <Data>{formatNumber(inForce)}</Data>
          </p>
        </div>
        <div>
          <label htmlFor="fb-reason" className={labelClass}>
            {t('fb.form.reason')}
          </label>
          <select
            id="fb-reason"
            className={inputClass}
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            aria-required={up}
            aria-describedby="fb-form-reason-hint"
            data-testid="fb-form-reason"
          >
            <option value="">{t('fb.form.reason.none')}</option>
            {reasons.map((code) => (
              <option key={code} value={code}>
                {reasonLabel('forecastOverride', code)}
              </option>
            ))}
          </select>
          <p
            id="fb-form-reason-hint"
            className={`text-xs mt-1 ${up && !reason ? 'text-warning-hover' : 'text-text-tertiary'}`}
            data-testid="fb-form-reason-hint"
          >
            {t('fb.form.reason.hint')}
          </p>
        </div>
      </div>
      <div>
        <label htmlFor="fb-note" className={labelClass}>
          {t('fb.form.note')}
        </label>
        <input
          id="fb-note"
          type="text"
          maxLength={500}
          className={inputClass}
          aria-required={reason === NOTE_REQUIRED_CODE}
          value={note}
          onChange={(e) => setNote(e.target.value)}
          data-testid="fb-form-note"
        />
      </div>
      <div className="flex flex-wrap items-center gap-3">
        {/* C2 (WCAG 4.1.2): a switched-off submit says why. */}
        <Button
          variant="outline"
          onClick={() => void submit()}
          disabled={!valid || command.isPending}
          aria-describedby={valid ? undefined : 'fb-form-submit-why'}
          data-testid="fb-form-submit"
        >
          {t('fb.form.submit')}
        </Button>
        {valid ? null : (
          <span id="fb-form-submit-why" className="sr-only">
            {t('fb.form.submit.needValue')}
          </span>
        )}
        <span className="text-xs text-text-tertiary" data-testid="fb-form-attribution">
          {t('fb.form.attribution')}
        </span>
      </div>
      {refusal !== null && (
        <p className="text-xs text-warning-hover" role="alert" data-testid="fb-form-refusal">
          {t('fb.toast.refused')}: {refusal}
        </p>
      )}
    </div>
  );
};

/** @type {React.FC<{ o: ForecastOverride; name: string | undefined }>} */
const LedgerRow = ({ o, name }) => {
  const { t } = useTranslation();
  const reasonLabel = useReasonLabel();
  const dir = directionOf(o.engineValue, o.newValue);
  return (
    <TableRow data-testid={`fb-ledger-${o.id}`}>
      <TableCell className="align-top whitespace-nowrap">
        <Data>{formatDateTime(o.recordedAt)}</Data>
        <div className="text-xs text-text-tertiary">
          {o.recordedBy.kind === 'RESOLVED'
            ? o.recordedBy.person.displayName
            : t('fb.ledger.unattributed')}
        </div>
      </TableCell>
      <TableCell className="align-top">
        <Data>{o.skuCode}</Data>
        <div className="text-xs text-text-secondary">{name ?? ''}</div>
        <div className="text-xs text-text-tertiary">
          {t('fb.ledger.week')}{' '}
          <Data className="text-text-tertiary">{formatDate(o.weekStart)}</Data>
        </div>
      </TableCell>
      <TableCell className="align-top whitespace-nowrap">
        <Data
          data-testid={`fb-ledger-values-${o.id}`}
        >{`${formatNumber(o.oldValue)} → ${formatNumber(o.newValue)}`}</Data>
        <div className="text-xs text-text-tertiary">
          {t('fb.ledger.engine')}{' '}
          <Data className="text-text-tertiary">{formatNumber(o.engineValue)}</Data>
        </div>
      </TableCell>
      <TableCell className="align-top whitespace-nowrap">
        <StatusPill variant="neutral">{t(`fb.direction.${dir}`)}</StatusPill>
      </TableCell>
      <TableCell className="align-top text-sm">
        {o.reasonCode ? (
          reasonLabel('forecastOverride', o.reasonCode)
        ) : (
          <span className="text-text-tertiary">{t('fb.reason.none')}</span>
        )}
        {o.note && <div className="text-xs text-text-secondary">{o.note}</div>}
      </TableCell>
    </TableRow>
  );
};

/** @type {React.FC<{ month: FvaMonth }>} */
const FvaTable = ({ month }) => {
  const { t } = useTranslation();
  const reasonLabel = useReasonLabel();
  /** @type {{ key: string; label: string; g: FvaGroup }[]} */
  const rows = [
    { key: 'all', label: t('fb.fva.all'), g: month.all },
    ...month.byDirection.map((g) => ({
      key: `dir-${g.key}`,
      label: t(`fb.direction.${g.key}`),
      g
    })),
    ...month.byReason.map((g) => ({
      key: `rsn-${g.key}`,
      label: g.key === 'none' ? t('fb.reason.none') : reasonLabel('forecastOverride', g.key),
      g
    })),
    ...month.byBand.map((g) => ({ key: `band-${g.key}`, label: t(`fb.band.${g.key}`), g }))
  ];
  return (
    <div className="overflow-x-auto">
      <Table>
        <TableHeader>
          <TableHeaderCell>{t('fb.fva.col.group')}</TableHeaderCell>
          <TableHeaderCell>{t('fb.fva.col.cells')}</TableHeaderCell>
          <TableHeaderCell>{t('fb.fva.col.mae')}</TableHeaderCell>
          <TableHeaderCell>{t('fb.fva.col.improved')}</TableHeaderCell>
          <TableHeaderCell>{t('fb.fva.col.fva')}</TableHeaderCell>
        </TableHeader>
        <tbody>
          {rows.map((r) => (
            <TableRow key={r.key} data-testid={`fb-fva-${month.month}-${r.key}`}>
              <TableCell className="text-sm text-text-primary">{r.label}</TableCell>
              <TableCell>
                <Data>{`${formatNumber(r.g.cells)} · ${t('fb.fva.skus', { count: r.g.skus })}`}</Data>
              </TableCell>
              <TableCell className="whitespace-nowrap">
                <Data>{`${formatNumber(Math.round(r.g.engineMae))} → ${formatNumber(Math.round(r.g.finalMae))}`}</Data>
              </TableCell>
              <TableCell>
                <Data>{`${formatNumber(r.g.improved)} / ${formatNumber(r.g.cells)}`}</Data>
              </TableCell>
              <TableCell className="whitespace-nowrap">
                <Data data-testid={`fb-fva-value-${month.month}-${r.key}`}>
                  {fvaText(r.g.fvaPct)}
                </Data>
                {r.g.notComparable > 0 && (
                  <div className="text-xs text-text-tertiary">
                    {t('fb.fva.notComparable', { count: r.g.notComparable })}
                  </div>
                )}
              </TableCell>
            </TableRow>
          ))}
        </tbody>
      </Table>
    </div>
  );
};

/**
 * Forecast UX phase 2, task B5 — the shared Forecast quality frame (title,
 * purpose header, banner, tabs, plan-source line) that a tab renders around
 * its content. Built in `BuyerDemandForecast.jsx`, which owns the page.
 */
/** @typedef {(content: React.ReactNode) => React.ReactElement} QualityFrame */

/**
 * The "Bias and overrides" tab of Forecast quality (was the Forecast bias page).
 * @type {React.FC<{ frame: QualityFrame }>}
 */
const ForecastBiasTab = ({ frame }) => {
  const { t } = useTranslation();
  const query = useForecastBias();
  const reasonLabel = useReasonLabel();
  const crumb = forecastCrumb(t, 'forecastQuality');
  const view = query.data ?? null;
  const [skuFilter, setSkuFilter] = useState(/** @type {SkuFilter} */ ('all'));
  const [materialFilter, setMaterialFilter] = useState(/** @type {MaterialFilter} */ ('alarms'));
  const [month, setMonth] = useState(/** @type {string | null} */ (null));
  const names = useMemo(
    () => new Map((view?.skus ?? []).map((s) => /** @type {const} */ ([s.skuCode, s.name]))),
    [view]
  );

  if (query.isPending) return <LoadingState breadcrumb={crumb} />;
  if (query.isError)
    return <ErrorState breadcrumb={crumb} error={query.error} onRetry={() => query.refetch()} />;
  if (!view) return <ErrorState breadcrumb={crumb} onRetry={() => query.refetch()} />;

  const a = view.alarms;
  const skus = view.skus.filter((s) => skuFilter === 'all' || s[skuFilter].alarm);
  const materials = view.materials.filter(
    (m) => materialFilter === 'all' || m.engine.alarm || m.sap.alarm
  );
  const cellsInForce = view.current.skus.reduce((n, s) => n + s.overridden.length, 0);
  const value = view.value;
  const shownMonth = value.months.find((m) => m.month === month) ?? value.months[0] ?? null;
  const flagged = value.review.types.filter((x) => x.flagged);

  return frame(
    <>
      <DataAsOf
        date={view.asOf}
        detail={
          <>
            {t('fb.meta.origins', { count: view.origins.length })}{' '}
            <Data data-testid="fb-first-origin">{formatDate(view.origins[0])}</Data>{' '}
            {t('fb.meta.to')} <Data>{formatDate(view.origins[view.origins.length - 1])}</Data>
          </>
        }
      />

      <div
        className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-5 mb-6"
        data-testid="fb-kpis"
      >
        <KpiCard
          eyebrow={t('fb.kpi.skus')}
          value={
            <span data-testid="fb-kpi-sku-engine">{`${a.skus.engine.total} / ${view.skus.length}`}</span>
          }
          subtitle={
            <span className="text-text-tertiary" data-testid="fb-kpi-sku-sap">
              {t('fb.kpi.sap', {
                count: a.skus.sap.total,
                under: a.skus.sap.under,
                over: a.skus.sap.over
              })}
            </span>
          }
        />
        <KpiCard
          eyebrow={t('fb.kpi.materials')}
          value={
            <span data-testid="fb-kpi-mat-engine">{`${a.materials.engine.total} / ${view.materials.length}`}</span>
          }
          subtitle={
            <span className="text-text-tertiary" data-testid="fb-kpi-mat-sap">
              {t('fb.kpi.sap', {
                count: a.materials.sap.total,
                under: a.materials.sap.under,
                over: a.materials.sap.over
              })}
            </span>
          }
        />
        <KpiCard
          eyebrow={t('fb.kpi.overrides')}
          value={<span data-testid="fb-kpi-overrides">{cellsInForce}</span>}
          subtitle={
            <span className="text-text-tertiary">
              {t('fb.kpi.overrides.sub', { count: view.overrides.length })}
            </span>
          }
        />
        <KpiCard
          eyebrow={t('fb.kpi.value')}
          value={
            <span data-testid="fb-kpi-value">
              {shownMonth ? fvaText(shownMonth.all.fvaPct) : '—'}
            </span>
          }
          subtitle={
            <span className="text-text-tertiary" data-testid="fb-kpi-value-sub">
              {shownMonth
                ? t('fb.kpi.value.month', { month: shownMonth.month })
                : t('fb.kpi.value.none')}
            </span>
          }
        />
      </div>

      <section
        className="bg-bg-surface border border-border-subtle rounded-lg p-4 mb-6"
        data-testid="fb-skus"
      >
        <div className="mb-1 flex items-center gap-2">
          <h2 className="text-section text-text-primary">{t('fb.skus.title')}</h2>
          <TermTip term="Tracking signal" />
        </div>
        <p className="text-xs text-text-tertiary mb-1">{t('fb.skus.intro')}</p>
        <p className="text-xs text-text-secondary mb-3" data-testid="fb-scale-hint">
          {t('fux.scale.trackingSignal', { limit: formatNumber(view.limit) })}
        </p>
        <div className="mb-3">
          <FilterChipsBar
            options={[
              { id: 'all', label: t('fb.filter.all'), count: view.skus.length },
              { id: 'engine', label: t('fb.filter.engine'), count: a.skus.engine.total },
              { id: 'sap', label: t('fb.filter.sap'), count: a.skus.sap.total }
            ]}
            value={skuFilter}
            onChange={setSkuFilter}
          />
        </div>
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableHeaderCell>{t('fb.skus.col.sku')}</TableHeaderCell>
              <TableHeaderCell>{t('fb.skus.col.brand')}</TableHeaderCell>
              <TableHeaderCell>{t('fb.skus.col.weeks')}</TableHeaderCell>
              <TableHeaderCell>{t('fb.skus.col.engine')}</TableHeaderCell>
              <TableHeaderCell>{t('fb.skus.col.sap')}</TableHeaderCell>
            </TableHeader>
            <tbody>
              {skus.map((s) => (
                <TableRow key={s.skuCode} data-testid={`fb-sku-${s.skuCode}`}>
                  <TableCell className="align-top">
                    <Data>{s.skuCode}</Data>
                    <div className="text-xs text-text-secondary">{s.name}</div>
                  </TableCell>
                  <TableCell className="align-top text-sm">{s.brand}</TableCell>
                  <TableCell className="align-top">
                    <Data>{formatNumber(s.engine.errors)}</Data>
                    {s.method === 'newSkuSap' && (
                      <div className="text-xs text-text-tertiary">{t('fb.skus.newSku')}</div>
                    )}
                    {s.method === 'discontinued' && (
                      <div className="text-xs text-text-tertiary">{t('fb.skus.discontinued')}</div>
                    )}
                  </TableCell>
                  <TableCell className="align-top">
                    <SignalCell ts={s.engine} testId={`fb-engine-${s.skuCode}`} />
                  </TableCell>
                  <TableCell className="align-top">
                    <SignalCell ts={s.sap} testId={`fb-sap-${s.skuCode}`} />
                  </TableCell>
                </TableRow>
              ))}
            </tbody>
          </Table>
          {skus.length === 0 && (
            <p className="text-sm text-text-tertiary mt-2" data-testid="fb-skus-none">
              {t('fb.skus.none')}
            </p>
          )}
        </div>
      </section>

      <section
        className="bg-bg-surface border border-border-subtle rounded-lg p-4 mb-6"
        data-testid="fb-materials"
      >
        <h2 className="text-section text-text-primary mb-1">{t('fb.materials.title')}</h2>
        <p className="text-xs text-text-tertiary mb-3">{t('fb.materials.intro')}</p>
        <div className="mb-3">
          <FilterChipsBar
            options={[
              {
                id: 'alarms',
                label: t('fb.filter.alarms'),
                count: view.materials.filter((m) => m.engine.alarm || m.sap.alarm).length
              },
              { id: 'all', label: t('fb.filter.all'), count: view.materials.length }
            ]}
            value={materialFilter}
            onChange={setMaterialFilter}
          />
        </div>
        <div className="overflow-x-auto max-h-[28rem] overflow-y-auto">
          <Table>
            <TableHeader>
              <TableHeaderCell>{t('fb.materials.col.material')}</TableHeaderCell>
              <TableHeaderCell>{t('fb.materials.col.skus')}</TableHeaderCell>
              <TableHeaderCell>{t('fb.skus.col.engine')}</TableHeaderCell>
              <TableHeaderCell>{t('fb.skus.col.sap')}</TableHeaderCell>
            </TableHeader>
            <tbody>
              {materials.map((m) => (
                <TableRow key={m.materialCode} data-testid={`fb-mat-${m.materialCode}`}>
                  <TableCell className="align-top">
                    <Data>{m.materialCode}</Data>
                    <div className="text-xs text-text-secondary">{labelOf(m.materialCode)}</div>
                  </TableCell>
                  <TableCell className="align-top">
                    <Data>{formatNumber(m.skuCodes.length)}</Data>
                  </TableCell>
                  <TableCell className="align-top">
                    <SignalCell ts={m.engine} testId={`fb-mat-engine-${m.materialCode}`} />
                  </TableCell>
                  <TableCell className="align-top">
                    <SignalCell ts={m.sap} testId={`fb-mat-sap-${m.materialCode}`} />
                  </TableCell>
                </TableRow>
              ))}
            </tbody>
          </Table>
        </div>
      </section>

      <section
        className="bg-bg-surface border border-border-subtle rounded-lg p-4 mb-6"
        data-testid="fb-override"
      >
        <h2 className="text-section text-text-primary mb-1">{t('fb.override.title')}</h2>
        <p className="text-xs text-text-tertiary mb-1">{t('fb.override.intro')}</p>
        {/* F-12 — said beside the form, where a planner decides to override. */}
        <p className="text-sm text-warning-hover mb-3" data-testid="fb-override-no-effect">
          {t('fux.override.noEffect')}
        </p>
        <OverrideForm view={view} />
        <h3 className="text-sm font-semibold text-text-primary mt-6 mb-2">
          {t('fb.ledger.title')}
        </h3>
        {view.overrides.length === 0 ? (
          <p className="text-sm text-text-tertiary" data-testid="fb-ledger-empty">
            {t('fb.ledger.empty')}
          </p>
        ) : (
          <div className="overflow-x-auto" data-testid="fb-ledger">
            <Table>
              <TableHeader>
                <TableHeaderCell>{t('fb.ledger.col.when')}</TableHeaderCell>
                <TableHeaderCell>{t('fb.ledger.col.sku')}</TableHeaderCell>
                <TableHeaderCell>{t('fb.ledger.col.values')}</TableHeaderCell>
                <TableHeaderCell>{t('fb.ledger.col.direction')}</TableHeaderCell>
                <TableHeaderCell>{t('fb.ledger.col.reason')}</TableHeaderCell>
              </TableHeader>
              <tbody>
                {view.overrides.map((o) => (
                  <LedgerRow key={o.id} o={o} name={names.get(o.skuCode)} />
                ))}
              </tbody>
            </Table>
          </div>
        )}
      </section>

      <section
        className="bg-bg-surface border border-border-subtle rounded-lg p-4 mb-6"
        data-testid="fb-value"
      >
        <h2 className="text-section text-text-primary mb-1">{t('fb.fva.title')}</h2>
        <p className="text-xs text-text-tertiary mb-1">{t('fb.fva.intro')}</p>
        <p className="text-xs text-text-secondary mb-3" data-testid="fb-service-note">
          {t('fb.fva.service')}
        </p>
        {value.months.length === 0 ? (
          <p className="text-sm text-text-tertiary" data-testid="fb-fva-empty">
            {t('fb.fva.empty', { waiting: value.waiting, unmeasurable: value.unmeasurable })}
          </p>
        ) : (
          <>
            <div className="mb-3">
              <FilterChipsBar
                options={value.months.map((m) => ({
                  id: m.month,
                  label: m.month,
                  count: m.all.cells
                }))}
                value={/** @type {FvaMonth} */ (shownMonth).month}
                onChange={setMonth}
              />
            </div>
            <FvaTable month={/** @type {FvaMonth} */ (shownMonth)} />
          </>
        )}
        <h3 className="text-sm font-semibold text-text-primary mt-6 mb-1">
          {t('fb.review.title')}
        </h3>
        <p className="text-xs text-text-tertiary mb-2">
          {t('fb.review.intro', { weeks: value.review.weeks })}{' '}
          <Data className="text-text-tertiary">{formatDate(value.review.from)}</Data>{' '}
          {t('fb.meta.to')}{' '}
          <Data className="text-text-tertiary">{formatDate(value.review.to)}</Data>
        </p>
        {value.review.types.length === 0 ? (
          <p className="text-sm text-text-tertiary" data-testid="fb-review-empty">
            {t('fb.review.empty')}
          </p>
        ) : (
          <ul className="text-sm space-y-1" data-testid="fb-review">
            {value.review.types.map((x) => (
              <li key={x.type} data-testid={`fb-review-${x.type}`}>
                {t(`fb.direction.${x.direction}`)} ·{' '}
                {x.reasonCode === 'none'
                  ? t('fb.reason.none')
                  : reasonLabel('forecastOverride', x.reasonCode)}{' '}
                · <Data>{fvaText(x.group.fvaPct)}</Data>{' '}
                {x.flagged ? (
                  <StatusPill variant="warning">{t('fb.review.flagged')}</StatusPill>
                ) : (
                  <span className="text-xs text-text-tertiary">{t('fb.review.ok')}</span>
                )}
              </li>
            ))}
          </ul>
        )}
        {flagged.length > 0 && (
          <p className="text-xs text-warning-hover mt-2" data-testid="fb-review-action">
            {t('fb.review.action', { count: flagged.length })}
          </p>
        )}
      </section>

      <section
        className="bg-bg-surface border border-border-subtle rounded-lg p-4 text-sm text-text-secondary space-y-2"
        data-testid="fb-definitions"
      >
        <h2 className="text-section text-text-primary">{t('fb.def.title')}</h2>
        <p>
          {t('fb.def.signal', {
            alpha: formatNumber(view.alpha),
            limit: formatNumber(view.limit),
            min: view.minErrors
          })}
        </p>
        <p>{t('fb.def.origins', { count: view.origins.length })}</p>
        <p>{t('fb.def.materials')}</p>
        <p>{t('fb.def.override')}</p>
        <p>{t('fb.def.fva')}</p>
        <p>
          <Link to="/buyer/demand-forecast" className="text-action hover:underline">
            {t('fb.def.link')}
          </Link>
        </p>
      </section>

      <AboutThisPage>
        <p>{t('fb.subtitle')}</p>
        <p data-testid="fb-synthetic-note">{t('fb.synthetic')}</p>
        <p data-testid="fb-source-note">{t('fb.source')}</p>
      </AboutThisPage>
    </>
  );
};

export default ForecastBiasTab;
