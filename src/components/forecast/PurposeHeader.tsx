import React from 'react';
import { useTranslation } from 'react-i18next';
import { Link } from 'react-router-dom';
import { FORECAST_PAGES, linkTarget, type ForecastPageId } from './forecastPages';

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

interface PurposeHeaderProps {
  readonly page: ForecastPageId;
}

const PurposeHeader: React.FC<PurposeHeaderProps> = ({ page }) => {
  const { t } = useTranslation();
  const p = FORECAST_PAGES[page];
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
