import React from 'react';
import { useTranslation } from 'react-i18next';
import { Link } from 'react-router-dom';
import { FORECAST_PAGES, linkTarget, type ForecastLinkTarget, type ForecastPageId } from './forecastPages';

// ─────────────────────────────────────────────────────────────────────────────
// PURPOSE HEADER — F-05 (Forecast UX phase 1, task A4).
//
// Three lines under a forecast page's title: the decision the page is for, the
// step before it ("Uses", linked) and the step after it ("Next", linked). The
// links come from `FORECAST_PAGES`, so every page states its place in the cycle
// the same way, and a page's descriptive paragraphs can move into its
// collapsed "About this page" section (F-08).
//
// Presentation only (FUX-R1): it reads no data and gates nothing.
// ─────────────────────────────────────────────────────────────────────────────

// Forecast UX phase 2, B6 (F-11) — the Supplier scorecard is not one of the 13
// forecast pages, but it is the "performance" step every Uses/Next link already
// points to, so it states its place the same way. Its own Uses and Next sit
// here because `forecastPages.ts` was held by task B1 while B6 was built; move
// this row into that file once both are merged.
const PERFORMANCE_PLACE: { readonly uses: ForecastLinkTarget; readonly next: ForecastLinkTarget } = {
  uses: 'responses',
  next: 'forecastQuality',
};

interface PurposeHeaderProps {
  readonly page: ForecastPageId | 'performance';
}

const PurposeHeader: React.FC<PurposeHeaderProps> = ({ page }) => {
  const { t } = useTranslation();
  const p = page === 'performance' ? PERFORMANCE_PLACE : FORECAST_PAGES[page];
  const uses = linkTarget(p.uses);
  const next = linkTarget(p.next);
  const term = 'text-text-tertiary whitespace-nowrap';
  const link = 'text-action-hover hover:underline';
  return (
    <dl
      aria-label={t('fux.purpose.label')}
      className="-mt-6 mb-3 grid max-w-3xl grid-cols-[auto_1fr] gap-x-3 gap-y-0.5 text-sm"
      data-testid="purpose-header"
      data-page={page}
    >
      <dt className={term}>{t('fux.purpose.decision')}</dt>
      <dd className="text-text-primary" data-testid="purpose-decision">
        {t(`fux.purpose.${page}`)}
      </dd>
      <dt className={term}>{t('fux.purpose.uses')}</dt>
      <dd>
        <Link to={uses.path} className={link} data-testid="purpose-uses">
          {t(uses.titleKey)}
        </Link>
      </dd>
      <dt className={term}>{t('fux.purpose.next')}</dt>
      <dd>
        <Link to={next.path} className={link} data-testid="purpose-next">
          {t(next.titleKey)}
        </Link>
      </dd>
    </dl>
  );
};

export default PurposeHeader;
