/** @import React from 'react' */
import { useCallback, useEffect, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import TopBarV2 from './TopBarV2';
import SidebarV2 from './SidebarV2';

/**
 * @typedef {object} AppShellV2Props
 * @property {React.ReactNode} children
 */

/** The drawer's id: the top bar's ☰ button points at it with `aria-controls`. */
export const NAV_DRAWER_ID = 'app-nav-drawer';

/** Tailwind `lg`: at and above it the side menu is inline, below it a drawer. */
const DESKTOP_QUERY = '(min-width: 1024px)';

/** @type {React.FC<AppShellV2Props>} */
const AppShellV2 = ({ children }) => {
  const { t, i18n } = useTranslation();
  // Below `lg` the side menu is an off-canvas drawer the ☰ button opens; at
  // `lg` and up it is inline and this flag has no effect on layout.
  const [navOpen, setNavOpen] = useState(false);
  const closeNav = useCallback(() => setNavOpen(false), []);
  const navButtonRef = useRef(/** @type {HTMLButtonElement | null} */ (null));

  // On close, focus goes back to the ☰ button. `useDialogFocus` in the drawer
  // returns focus to whatever was focused at open, which is <body> when the
  // click did not focus the button (Safari), so the shell states it here.
  const wasOpen = useRef(false);
  useEffect(() => {
    if (wasOpen.current && !navOpen) {
      const now = document.activeElement;
      const drawer = document.getElementById(NAV_DRAWER_ID);
      if (!now || now === document.body || drawer?.contains(now)) navButtonRef.current?.focus();
    }
    wasOpen.current = navOpen;
  }, [navOpen]);

  // Widening the window past `lg` while the drawer is open would leave an
  // invisible focus trap behind the inline menu, so close it.
  useEffect(() => {
    if (!navOpen || typeof window.matchMedia !== 'function') return;
    const mq = window.matchMedia(DESKTOP_QUERY);
    /** @param {MediaQueryListEvent} e */
    const onChange = (e) => {
      if (e.matches) setNavOpen(false);
    };
    mq.addEventListener('change', onChange);
    return () => mq.removeEventListener('change', onChange);
  }, [navOpen]);
  // Pages build `children` in their own render, so a language change (which
  // re-renders subscribers like TopBar/Sidebar) would NOT re-run a page body —
  // React bails on the referentially-equal children element. Keying <main> on
  // the active language remounts the page subtree on toggle, so locale-aware
  // format.js output (dates, currency) flips app-wide even on pages not yet
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
      <TopBarV2
        navOpen={navOpen}
        navControlsId={NAV_DRAWER_ID}
        navButtonRef={navButtonRef}
        onToggleNav={() => setNavOpen((open) => !open)}
      />
      <div className="flex flex-1 overflow-hidden">
        <SidebarV2 id={NAV_DRAWER_ID} open={navOpen} onClose={closeNav} />
        <main
          key={i18n.language}
          id="main-content"
          tabIndex={-1}
          className="flex-1 overflow-auto bg-bg-page p-4 sm:p-6 lg:p-8 focus:outline-none"
        >
          {children}
        </main>
      </div>
    </div>
  );
};

export default AppShellV2;
