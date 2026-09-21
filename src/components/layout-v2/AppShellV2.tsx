import React from 'react';
import { useTranslation } from 'react-i18next';
import TopBarV2 from './TopBarV2';
import SidebarV2 from './SidebarV2';

interface AppShellV2Props {
  children: React.ReactNode;
}

const AppShellV2: React.FC<AppShellV2Props> = ({ children }) => {
  const { t, i18n } = useTranslation();
  // Pages build `children` in their own render, so a language change (which
  // re-renders subscribers like TopBar/Sidebar) would NOT re-run a page body —
  // React bails on the referentially-equal children element. Keying <main> on
  // the active language remounts the page subtree on toggle, so locale-aware
  // format.ts output (dates, currency) flips app-wide even on pages not yet
  // migrated to useTranslation. Per-page key extraction refines this later.
  //
  // BL-31 (WCAG 2.4.1): a skip link is the first stop in the tab order, so a
  // keyboard user does not tab through the top bar and every sidebar item on
  // each page. It is visually hidden until focused. `<main>` is programmatically
  // focusable (tabIndex -1) so the jump lands there rather than only scrolling.
  return (
    <div className="h-screen flex flex-col bg-bg-page">
      <a
        href="#main-content"
        onClick={(e) => {
          // HashRouter owns the fragment; move focus without touching the URL.
          e.preventDefault();
          document.getElementById('main-content')?.focus();
        }}
        className="sr-only focus:not-sr-only focus:fixed focus:left-4 focus:top-2 focus:z-[60] focus:rounded-md focus:bg-bg-surface focus:px-4 focus:py-2 focus:text-sm focus:font-medium focus:text-action-hover focus:shadow-md focus:outline focus:outline-2 focus:outline-action"
      >
        {t('ui.skipToContent')}
      </a>
      <TopBarV2 />
      <div className="flex flex-1 overflow-hidden">
        <SidebarV2 />
        <main
          key={i18n.language}
          id="main-content"
          tabIndex={-1}
          className="flex-1 overflow-auto bg-bg-page p-8 focus:outline-none"
        >
          {children}
        </main>
      </div>
    </div>
  );
};

export default AppShellV2;
