import React from 'react';
import { useInRouterContext, useLocation } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { sectionForPath } from '../layout-v2/navConfig';

interface PageHeaderProps {
  breadcrumb: string[];
  title: string;
  subtitle?: string;
  actions?: React.ReactNode;
}

// The section label comes from the menu, never from the page (NV-05): a page
// passes its own crumbs, and the first one is replaced by the menu section that
// owns the current route. Pages outside the menu keep the crumbs they pass.
const SectionCrumb: React.FC<{ fallback: string[] }> = ({ fallback }) => {
  const { t } = useTranslation();
  const { pathname } = useLocation();
  const section = sectionForPath(pathname);
  const crumbs = section
    ? [t(section.labelKey), ...(fallback.length > 1 ? fallback.slice(1) : fallback)]
    : fallback;
  return <>{crumbs.join(' · ')}</>;
};

const PageHeader: React.FC<PageHeaderProps> = ({
  breadcrumb,
  title,
  subtitle,
  actions,
}) => {
  const inRouter = useInRouterContext();
  return (
    <div className="flex items-start justify-between gap-4 mb-8">
      <div className="min-w-0">
        <div className="text-eyebrow text-text-tertiary uppercase">
          {inRouter ? <SectionCrumb fallback={breadcrumb} /> : breadcrumb.join(' · ')}
        </div>
        <h1 className="text-title text-text-primary mt-1">
          {title}
        </h1>
        {subtitle ? (
          <p className="text-base text-text-secondary mt-2 max-w-prose">
            {subtitle}
          </p>
        ) : null}
      </div>
      {actions ? <div className="shrink-0">{actions}</div> : null}
    </div>
  );
};

export default PageHeader;
