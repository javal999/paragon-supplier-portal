/** @import * as React from 'react' */
import { useInRouterContext, useLocation } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { sectionForPath } from '../layout-v2/navConfig';
import { useHubRole } from '../layout-v2/hubRole';

/**
 * @typedef {Object} PageHeaderProps
 * @property {string[]} breadcrumb
 * @property {string} title
 * @property {string} [subtitle]
 * @property {React.ReactNode} [actions]
 * @property {number} [count] How many items the page lists, shown as a pill beside the title.
 */

// The section label comes from the menu, never from the page (NV-05): a page
// passes its own crumbs, and the first one is replaced by the menu section that
// owns the current route. Pages outside the menu keep the crumbs they pass.
/**
 * @param {{ fallback: string[]; }} props
 * @returns {React.ReactNode}
 */
const SectionCrumb = ({ fallback }) => {
  const { t } = useTranslation();
  const { pathname } = useLocation();
  // The viewer's role picks the section their own menu shows (a route can sit
  // in two sections, e.g. the scorecard under Review for MP, Performance for BUY).
  const [hubRole] = useHubRole();
  const section = sectionForPath(pathname, hubRole);
  const sectionLabel = section ? t(section.labelKey) : null;
  // A page whose only crumb IS its menu section ("Sourcing") shows it once, not
  // "Sourcing · Sourcing".
  const crumbs = sectionLabel
    ? [
        sectionLabel,
        ...(fallback.length > 1 ? fallback.slice(1) : fallback.filter((c) => c !== sectionLabel))
      ]
    : fallback;
  return <>{crumbs.join(' · ')}</>;
};

/**
 * @param {PageHeaderProps} props
 * @returns {React.ReactNode}
 */
const PageHeader = ({ breadcrumb, title, subtitle, actions, count }) => {
  const inRouter = useInRouterContext();
  // BL-31 (WCAG 1.4.10): wraps, so at narrow widths the actions drop below the
  // title instead of squeezing the h1 to zero width.
  return (
    <div className="flex flex-wrap items-start justify-between gap-4 mb-8">
      <div className="min-w-0 flex-1 basis-72">
        <div className="text-eyebrow text-text-tertiary uppercase">
          {inRouter ? <SectionCrumb fallback={breadcrumb} /> : breadcrumb.join(' · ')}
        </div>
        <div className="flex items-center gap-3 mt-1">
          <h1 className="text-title text-text-primary">{title}</h1>
          {typeof count === 'number' && (
            <span
              data-testid="page-count"
              className="inline-flex items-center justify-center rounded-full px-2.5 h-6 text-sm font-semibold bg-action-soft text-action-hover"
            >
              {count}
            </span>
          )}
        </div>
        {subtitle ? (
          <p className="text-base text-text-secondary mt-2 max-w-prose">{subtitle}</p>
        ) : null}
      </div>
      {actions ? <div className="shrink-0">{actions}</div> : null}
    </div>
  );
};

export default PageHeader;
