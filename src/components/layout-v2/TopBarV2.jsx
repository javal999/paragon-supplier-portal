/** @import React from 'react' */
import { Menu, Bell } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { resolveEnvBadge } from '@lib/envBadge';
import LanguageMenu from './LanguageMenu';
import IdentityPanel from './IdentityPanel';
import TopBarSearch from './TopBarSearch';
import paragonLogo from '../../../paradise/assets/paragon-logo-primary.svg';

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
        <img src={paragonLogo} alt="" aria-hidden="true" className="hidden sm:block h-5 w-auto" />
        {/* Paradise stage 5a: divider between the logo and the product name. */}
        <span aria-hidden="true" className="hidden sm:block h-5 w-px bg-border-subtle" />
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
        <TopBarSearch />
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
          <span className="absolute top-1 right-1 min-w-[16px] h-4 px-1 rounded-full bg-danger text-white text-[length:var(--fs-caption-1)] font-bold flex items-center justify-center">
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
