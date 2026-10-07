/** @import React from 'react' */
import { Menu, Search, Bell } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { resolveEnvBadge } from '@lib/envBadge';
import LanguageMenu from './LanguageMenu';
import IdentityPanel from './IdentityPanel';

/**
 * @typedef {object} TopBarV2Props
 * @property {boolean} [navOpen] Whether the phone/tablet side-menu drawer is open.
 * @property {string} [navControlsId] The drawer's id, for `aria-controls`.
 * @property {React.Ref<HTMLButtonElement>} [navButtonRef] The ☰ button, so focus can return to it.
 * @property {() => void} [onToggleNav] Opens or closes the drawer.
 */

/** @type {React.FC<TopBarV2Props>} */
const TopBarV2 = ({ navOpen = false, navControlsId, navButtonRef, onToggleNav }) => {
  const { t } = useTranslation();
  const badge = resolveEnvBadge(
    import.meta.env.DEV,
    __DEPLOY_ENV__,
    typeof window !== 'undefined' ? window.location.hostname : undefined
  );
  return (
    <header className="h-14 w-full bg-bg-surface border-b border-border-subtle flex items-center px-4 gap-2 sm:gap-4">
      {/* Left cluster */}
      <div className="flex items-center gap-3 min-w-0">
        {/* Below `lg` only: at `lg` and up the side menu is inline, so a ☰
            there would be a dead control. */}
        <button
          ref={navButtonRef}
          type="button"
          aria-label={t('topbar.toggleNav')}
          aria-expanded={navOpen}
          aria-controls={navControlsId}
          onClick={onToggleNav}
          className="p-2 rounded-md text-text-secondary hover:bg-bg-hover lg:hidden"
        >
          <Menu size={18} />
        </button>
        <span className="hidden sm:inline text-sm font-semibold text-text-primary whitespace-nowrap">
          {t('app.title')}
        </span>
        {badge && (
          <span
            className={`text-label px-2 py-0.5 rounded-full uppercase ${
              badge === 'PREVIEW'
                ? 'bg-warning-soft text-warning-hover'
                : 'bg-bg-hover text-text-tertiary'
            }`}
          >
            {badge}
          </span>
        )}
      </div>

      {/* Center search */}
      <div className="flex-1 min-w-0 flex justify-center">
        <div className="relative w-full max-w-md">
          <Search
            size={14}
            className="absolute left-3 top-1/2 -translate-y-1/2 text-text-tertiary pointer-events-none"
          />
          <input
            type="search"
            aria-label={t('topbar.searchLabel')}
            placeholder={t('topbar.search')}
            className="w-full h-9 pl-9 pr-3 rounded-md bg-bg-hover text-sm text-text-primary placeholder:text-text-tertiary border border-transparent focus:outline-none focus:border-border-input focus:bg-bg-surface"
          />
        </div>
      </div>

      {/* Right cluster */}
      <div className="flex shrink-0 items-center gap-1 sm:gap-3">
        <LanguageMenu />
        <button
          type="button"
          aria-label={t('topbar.notifications')}
          className="relative p-2 rounded-md text-text-secondary hover:bg-bg-hover"
        >
          <Bell size={18} />
          <span className="absolute top-1 right-1 min-w-[16px] h-4 px-1 rounded-full bg-danger text-white text-[10px] font-bold flex items-center justify-center">
            3
          </span>
        </button>
        {/* The avatar is now a PANEL, not a decoration: the current role and the
            scope it grants live here, because identity belongs with identity. */}
        <IdentityPanel />
      </div>
    </header>
  );
};

export default TopBarV2;
