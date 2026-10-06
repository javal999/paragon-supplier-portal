import React from 'react';
import { useTranslation } from 'react-i18next';

// ─────────────────────────────────────────────────────────────────────────────
// ABOUT THIS PAGE — F-08 (Forecast UX phase 1, task A4).
//
// The collapsed section below a forecast page's main content that holds what
// used to sit above it: the page's descriptive subtitle and its caveat
// paragraphs. Nothing is deleted; it moves out of the first screen, so the
// first screen is the decision (title, purpose header, banner, table or form).
// ─────────────────────────────────────────────────────────────────────────────

interface AboutThisPageProps {
  readonly children: React.ReactNode;
}

const AboutThisPage: React.FC<AboutThisPageProps> = ({ children }) => {
  const { t } = useTranslation();
  return (
    <details
      className="mt-6 rounded-lg border border-border-subtle bg-bg-surface p-4 text-sm text-text-secondary"
      data-testid="about-this-page"
    >
      {/* C2: on a touch screen the summary row is at least 44 px tall. */}
      <summary className="cursor-pointer [@media(pointer:coarse)]:py-2.5">
        <h2 className="inline text-section text-text-primary">{t('fux.about.title')}</h2>
      </summary>
      <div className="mt-3 max-w-prose space-y-2">{children}</div>
    </details>
  );
};

export default AboutThisPage;
