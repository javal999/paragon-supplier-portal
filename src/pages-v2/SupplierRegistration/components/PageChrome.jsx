/** @import React from 'react' */
import { useTranslation } from 'react-i18next';

/**
 * The registration page's own header: the PARAGONCORP wordmark, the page
 * subtitle and the supplier-support address. `/register` sits outside the app
 * shell, so it brings its own chrome.
 * @type {React.FC}
 */
export const PageHeader = () => {
  const { t } = useTranslation();
  return (
    <header className="bg-bg-surface border-b border-border-subtle px-4 sm:px-8 py-4">
      <div className="max-w-3xl mx-auto flex items-center justify-between">
        <div>
          <div className="text-base sm:text-lg font-bold text-navy tracking-widest">
            PARAGONCORP
          </div>
          <div className="text-xs text-text-tertiary mt-0.5">
            {t('registration.header.subtitle')}
          </div>
        </div>
        <div className="text-right hidden sm:block">
          <div className="text-xs text-text-tertiary">{t('registration.header.needHelp')}</div>
          <a
            href="mailto:supplier-support@paragon.id"
            className="text-xs font-semibold text-teal-hover hover:text-teal-hover"
          >
            supplier-support@paragon.id
          </a>
        </div>
      </div>
    </header>
  );
};

/**
 * The registration page's footer: copyright and the support address.
 * @type {React.FC}
 */
export const PageFooter = () => (
  <footer className="px-4 py-4 text-center text-xs text-text-tertiary border-t border-border-subtle bg-bg-surface mt-auto">
    © Paragon Corp ·{' '}
    <a href="mailto:supplier-support@paragon.id" className="text-teal-hover hover:text-teal-hover">
      supplier-support@paragon.id
    </a>
  </footer>
);
