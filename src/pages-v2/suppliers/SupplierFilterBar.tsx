import React, { useCallback, useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { useSearchParams } from 'react-router-dom';
import {
  CERT_EXPIRING_WITHIN_DAYS,
  CERT_VALIDITIES,
  PERFORMANCE_BANDS,
  hasSupplierFilters,
  readSupplierFilters,
  writeSupplierFilters,
  type CertValidity,
  type PerformanceBand,
  type SupplierFilters,
} from '@services/sourcing/supplierFilters';

// ─────────────────────────────────────────────────────────────────────────────
// THE BR-05 FILTERS — BL-52, REQ-E03-01 BR-05.
//
// Certificate validity, then performance band, then country, in that order,
// on the buyer supplier list and on every invitee search. The values live in
// the page address (`?cert=…&band=…&country=…`), so a filtered list can be
// shared or come back to, and every other parameter on the page is kept.
// ─────────────────────────────────────────────────────────────────────────────

/** The BR-05 filters in the page address, and a setter that keeps the rest of it. */
export function useSupplierFilterParams(): {
  filters: SupplierFilters;
  setFilters: (next: SupplierFilters) => void;
} {
  const [params, setParams] = useSearchParams();
  const key = params.toString();
  const filters = useMemo(() => readSupplierFilters(new URLSearchParams(key)), [key]);
  const setFilters = useCallback(
    (next: SupplierFilters) => setParams((prev) => writeSupplierFilters(prev, next), { replace: true }),
    [setParams],
  );
  return { filters, setFilters };
}

/** The labels of the filters in force, in business language (for empty states). */
export function useSupplierFilterLabels(): (f: SupplierFilters) => string[] {
  const { t, i18n } = useTranslation();
  return (f) => [
    ...(f.cert ? [certLabel(t, f.cert)] : []),
    ...(f.band ? [bandLabel(t, f.band)] : []),
    ...(f.country ? [countryName(f.country, i18n.language)] : []),
  ];
}

type T = (key: string, opts?: Record<string, unknown>) => string;

/** A country code as the reader's language names it, with the code beside it. */
export function countryName(code: string, lang: string): string {
  try {
    const name = new Intl.DisplayNames([lang === 'id' ? 'id' : 'en'], { type: 'region' }).of(code);
    return name && name !== code ? `${name} (${code})` : code;
  } catch {
    return code;
  }
}

export const certLabel = (t: T, v: CertValidity): string =>
  v === 'expiring' ? t('supFilter.cert.expiring', { days: CERT_EXPIRING_WITHIN_DAYS }) : t(`supFilter.cert.${v}`);

export const bandLabel = (t: T, v: PerformanceBand): string =>
  v === 'noHistory' ? t('supFilter.band.noHistory') : t('supFilter.band.grade', { grade: v });

interface SupplierFilterBarProps {
  filters: SupplierFilters;
  onChange: (next: SupplierFilters) => void;
  /** The countries the list can offer — derived from the rows, never a fixed list. */
  countries: readonly string[];
  /** Distinguishes this bar's controls on a page with more than one. */
  testIdPrefix: string;
  selectClassName?: string;
}

const DEFAULT_SELECT =
  'w-full bg-white border border-border-input rounded-md px-3 h-10 text-sm focus:outline-none focus:border-action';

const SupplierFilterBar: React.FC<SupplierFilterBarProps> = ({
  filters,
  onChange,
  countries,
  testIdPrefix,
  selectClassName = DEFAULT_SELECT,
}) => {
  const { t, i18n } = useTranslation();
  const set = (patch: Partial<Record<keyof SupplierFilters, string>>) => {
    const next: Record<string, string | undefined> = { ...filters, ...patch };
    for (const k of Object.keys(next)) if (!next[k]) delete next[k];
    onChange(next as SupplierFilters);
  };

  return (
    <fieldset className="flex flex-col gap-1" data-testid={`${testIdPrefix}-supplier-filters`}>
      <legend className="sr-only">{t('supFilter.group')}</legend>
      <div className="flex flex-wrap items-end gap-3">
        {/* BR-05 order: certificate validity first. */}
        <label className="min-w-[13rem] block">
          <span className="block text-xs font-semibold text-text-secondary mb-1">{t('supFilter.cert.label')}</span>
          <select
            data-testid={`${testIdPrefix}-filter-cert`}
            value={filters.cert ?? ''}
            onChange={(e) => set({ cert: e.target.value })}
            className={selectClassName}
          >
            <option value="">{t('supFilter.cert.all')}</option>
            {CERT_VALIDITIES.map((v) => (
              <option key={v} value={v}>
                {certLabel(t, v)}
              </option>
            ))}
          </select>
        </label>
        <label className="min-w-[10rem] block">
          <span className="block text-xs font-semibold text-text-secondary mb-1">{t('supFilter.band.label')}</span>
          <select
            data-testid={`${testIdPrefix}-filter-band`}
            value={filters.band ?? ''}
            onChange={(e) => set({ band: e.target.value })}
            className={selectClassName}
          >
            <option value="">{t('supFilter.band.all')}</option>
            {PERFORMANCE_BANDS.map((v) => (
              <option key={v} value={v}>
                {bandLabel(t, v)}
              </option>
            ))}
          </select>
        </label>
        <label className="min-w-[9rem] block">
          <span className="block text-xs font-semibold text-text-secondary mb-1">{t('supFilter.country.label')}</span>
          <select
            data-testid={`${testIdPrefix}-filter-country`}
            value={filters.country ?? ''}
            onChange={(e) => set({ country: e.target.value })}
            className={selectClassName}
          >
            <option value="">{t('supFilter.country.all')}</option>
            {countries.map((c) => (
              <option key={c} value={c}>
                {countryName(c, i18n.language)}
              </option>
            ))}
          </select>
        </label>
        {hasSupplierFilters(filters) && (
          <button
            type="button"
            className="h-10 px-2 text-sm text-action hover:underline"
            data-testid={`${testIdPrefix}-filter-clear`}
            onClick={() => onChange({})}
          >
            {t('supFilter.clear')}
          </button>
        )}
      </div>
      <p className="text-xs text-text-tertiary">{t('supFilter.cert.hint')}</p>
    </fieldset>
  );
};

export default SupplierFilterBar;
