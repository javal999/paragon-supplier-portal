/** @import React from 'react' */
import { useId } from 'react';
import { useTranslation } from 'react-i18next';
import { FOCUS_RING } from './focusRing';

// ─────────────────────────────────────────────────────────────────────────────
// ABOUT THIS PAGE — F-08 (Forecast UX phase 1, task A4).
//
// The collapsed section below a forecast page's main content that holds what
// used to sit above it: the page's descriptive subtitle and its caveat
// paragraphs. Nothing is deleted; it moves out of the first screen, so the
// first screen is the decision (title, purpose header, banner, table or form).
//
// Accessibility finding 33 (2026-10): the section heading sits OUTSIDE the
// `<summary>`. A summary's children are presentational to some screen readers,
// so an `h2` inside it could lose its heading role. The heading names the
// section (`aria-labelledby`) and stays in the outline whether the section is
// open or closed; the summary holds only the Show/Hide toggle label.
// ─────────────────────────────────────────────────────────────────────────────

/**
 * @typedef {{
 *     readonly title: React.ReactNode;
 *     readonly testId: string;
 *     readonly className?: string;
 *     readonly detailsClassName?: string;
 *     readonly defaultOpen?: boolean;
 *     readonly children: React.ReactNode;
 *   }} CollapsedSectionProps
 */

/**
 * A collapsed section with its `h2` outside the toggle. `testId` goes on the
 * `<details>`, which stays closed until opened — unless `defaultOpen`: a
 * section that is the whole of a page's tab (P-12, the "Warehouse fill" tabs)
 * opens shown, and its toggle still hides it.
 * @type {React.FC<CollapsedSectionProps>}
 */
export const CollapsedSection = ({
  title,
  testId,
  className,
  detailsClassName,
  defaultOpen,
  children
}) => {
  const { t } = useTranslation();
  const headingId = useId();
  return (
    <section aria-labelledby={headingId} className={className}>
      <h2 id={headingId} className="text-section text-text-primary">
        {title}
      </h2>
      <details
        className={`group ${detailsClassName ?? ''}`}
        data-testid={testId}
        open={defaultOpen}
      >
        {/* C2: on a touch screen the summary row is at least 44 px tall. */}
        <summary
          className={`mt-1 w-fit cursor-pointer text-sm text-action-hover [@media(pointer:coarse)]:py-2.5 ${FOCUS_RING}`}
        >
          <span className="group-open:hidden">{t('fux.collapse.show')}</span>
          <span className="hidden group-open:inline">{t('fux.collapse.hide')}</span>
        </summary>
        {children}
      </details>
    </section>
  );
};

/**
 * @typedef {{
 *     readonly children: React.ReactNode;
 *   }} AboutThisPageProps
 */

/** @type {React.FC<AboutThisPageProps>} */
const AboutThisPage = ({ children }) => {
  const { t } = useTranslation();
  return (
    <CollapsedSection
      title={t('fux.about.title')}
      testId="about-this-page"
      className="mt-6 rounded-lg border border-border-subtle bg-bg-surface p-4 text-sm text-text-secondary"
    >
      <div className="mt-3 max-w-prose space-y-2">{children}</div>
    </CollapsedSection>
  );
};

export default AboutThisPage;
