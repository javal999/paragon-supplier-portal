/** @import React from 'react' */
import { useLayoutEffect, useRef } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { X } from 'lucide-react';
import { useDialogFocus } from '@hooks/useDialogFocus';
import { useCurrentIdentity } from '@context/CurrentIdentityContext';
import { mockSuppliers } from '@data/mockSuppliers';
import { SEEDED_SEAT_ROLES } from '@services/transitions/businessRoles';
import { NO_PERSON } from '@context/noPerson';
/** @import { Persona } from './navConfig' */
import { HOME_PATH, isItemActive, navFor } from './navConfig';
import { useHubRole } from './hubRole';

const SEED_SUPPLIER_ID = 'sup-007';
const SEED_SUPPLIER_NAME = mockSuppliers.find((s) => s.id === SEED_SUPPLIER_ID)?.name ?? null;

// Keyed per persona so the PTI menu's offset is never applied to the supplier
// menu. Every access is guarded, like orderSummaryViewState.js: a blocked or
// full store must not break the menu.
/**
 * @param {Persona} persona
 * @returns {string}
 */
const sidebarScrollKey = (persona) => `paragon.sidebarScroll.${persona}`;

/**
 * @param {Persona} persona
 * @returns {number | null}
 */
function readSidebarScroll(persona) {
  try {
    const raw = window.sessionStorage.getItem(sidebarScrollKey(persona));
    if (raw === null) return null;
    const value = Number(raw);
    return Number.isFinite(value) ? value : null;
  } catch {
    return null;
  }
}

/**
 * @param {Persona} persona
 * @param {number} scrollTop
 * @returns {void}
 */
function saveSidebarScroll(persona, scrollTop) {
  try {
    window.sessionStorage.setItem(sidebarScrollKey(persona), String(scrollTop));
  } catch {
    /* storage unavailable: the menu still works, it just opens at the top */
  }
}

/**
 * @typedef {object} SidebarV2Props
 * @property {string} [id] The element id the top bar's ☰ button controls.
 * @property {boolean} [open] Below `lg`: whether the drawer is open. Ignored at `lg` and up.
 * @property {() => void} [onClose] Closes the drawer (nav pick, Escape, backdrop, close button).
 */

/** @type {React.FC<SidebarV2Props>} */
const SidebarV2 = ({ id, open = false, onClose }) => {
  const navigate = useNavigate();
  const location = useLocation();
  const { t } = useTranslation();
  const currentPath = `${location.pathname}`;
  const { identity, setIdentity } = useCurrentIdentity();
  const persona = identity.personaType;

  const [hubRole] = useHubRole();
  const groups = navFor(persona, hubRole);

  const navRef = useRef(/** @type {HTMLElement | null} */ (null));
  const asideRef = useRef(/** @type {HTMLElement | null} */ (null));
  // The open drawer is a modal surface: focus moves in, Tab stays in, Escape
  // closes it (the shared BL-31 contract). The ☰ is hidden at `lg` and up, so
  // `open` is only ever true below it.
  useDialogFocus(asideRef, open, onClose);

  // Layout effect, not effect + rAF: the nav's items are already rendered here,
  // and applying the offset before paint means the menu never flashes at the top.
  useLayoutEffect(() => {
    const nav = navRef.current;

    if (!nav) return;

    const savedPosition = readSidebarScroll(persona);

    if (savedPosition !== null) {
      nav.scrollTop = savedPosition;
      // Never leave the current page's menu item scrolled out of view.
      const active = /** @type {HTMLElement | null} */ (nav.querySelector('[aria-current="page"]'));
      if (!active) return;
      const a = active.getBoundingClientRect();
      const n = nav.getBoundingClientRect();
      if (a.top < n.top || a.bottom > n.bottom) {
        active.scrollIntoView?.({ block: 'nearest' });
      }
    }
  }, [persona]);

  // Below `lg` the menu is hidden until opened, then floats over the page as a
  // fixed, full-height drawer of the same 240 px. At `lg` and up the `lg:`
  // classes restore the inline column exactly as before.
  const drawerClass = open
    ? 'fixed inset-y-0 left-0 z-50 flex shadow-md lg:static lg:z-auto lg:shadow-none'
    : 'hidden lg:flex';

  return (
    <>
      {open ? (
        <div
          aria-hidden="true"
          data-testid="nav-drawer-backdrop"
          onClick={onClose}
          className="fixed inset-0 z-40 bg-[var(--pds-color-scrim)] lg:hidden"
        />
      ) : null}
      <aside
        ref={asideRef}
        id={id}
        role={open ? 'dialog' : undefined}
        aria-modal={open ? true : undefined}
        aria-label={open ? t('hub.nav.primaryLabel') : undefined}
        className={`${drawerClass} w-60 shrink-0 h-full bg-bg-sidebar border-r border-border-subtle flex-col`}
      >
        {open ? (
          <div className="flex justify-end px-3 pt-3 lg:hidden">
            <button
              type="button"
              aria-label={t('topbar.closeNav')}
              onClick={onClose}
              className="p-2 rounded-md text-text-secondary hover:bg-bg-hover"
            >
              <X size={18} />
            </button>
          </div>
        ) : null}
        {/* Persona toggle */}
        <div className="mt-4 mb-6 mx-3">
          <div
            role="group"
            aria-label={t('hub.persona.groupLabel')}
            className="bg-bg-hover rounded-full h-8 p-0.5 flex"
          >
            <button
              type="button"
              aria-pressed={persona === 'buyer'}
              onClick={() => {
                setIdentity({
                  personaType: 'buyer',
                  supplierId: null,
                  supplierName: null,
                  businessRoles: SEEDED_SEAT_ROLES.buyer,
                  actor: NO_PERSON
                });
                navigate(HOME_PATH.buyer);
                onClose?.();
              }}
              className={`flex-1 px-3 py-1.5 rounded-full text-xs font-medium transition-colors ${
                persona === 'buyer' ? 'bg-white shadow-sm text-text-primary' : 'text-text-tertiary'
              }`}
            >
              {t('hub.persona.pti')}
            </button>
            <button
              type="button"
              aria-pressed={persona === 'supplier'}
              onClick={() => {
                setIdentity({
                  personaType: 'supplier',
                  supplierId: SEED_SUPPLIER_ID,
                  supplierName: SEED_SUPPLIER_NAME,
                  businessRoles: SEEDED_SEAT_ROLES.supplier,
                  actor: NO_PERSON
                });
                navigate(HOME_PATH.supplier);
                onClose?.();
              }}
              className={`flex-1 px-3 py-1.5 rounded-full text-xs font-medium transition-colors ${
                persona === 'supplier'
                  ? 'bg-white shadow-sm text-text-primary'
                  : 'text-text-tertiary'
              }`}
            >
              {t('hub.persona.supplier')}
            </button>
          </div>
        </div>

        {/* Nav groups */}
        <nav
          ref={navRef}
          aria-label={t('hub.nav.primaryLabel')}
          onScroll={(e) => saveSidebarScroll(persona, e.currentTarget.scrollTop)}
          className="flex-1 overflow-y-auto px-3 pb-4 space-y-4"
        >
          {groups.map((group) => (
            <div key={group.id}>
              <div
                id={`nav-group-${group.id}`}
                className="text-label text-text-tertiary px-3 py-2 uppercase"
              >
                {t(group.labelKey)}
              </div>
              <ul aria-labelledby={`nav-group-${group.id}`} className="space-y-0.5">
                {group.items.map((item) => {
                  const isActive = isItemActive(item, currentPath);
                  const Icon = item.icon;
                  return (
                    <li key={item.path}>
                      <button
                        type="button"
                        aria-current={isActive ? 'page' : undefined}
                        onClick={() => {
                          navigate(item.path);
                          onClose?.();
                        }}
                        className={`relative w-full min-h-9 py-1.5 px-3 rounded-md flex items-center gap-2.5 text-sm text-left transition-colors ${
                          isActive
                            ? 'bg-action-soft text-action-hover font-semibold'
                            : 'text-text-secondary hover:bg-bg-hover'
                        }`}
                      >
                        {isActive && (
                          <span className="absolute left-0 top-1.5 bottom-1.5 w-[3px] bg-action rounded-r" />
                        )}
                        <Icon size={18} className="shrink-0" />
                        <span>{t(item.labelKey)}</span>
                      </button>
                    </li>
                  );
                })}
              </ul>
            </div>
          ))}
        </nav>
      </aside>
    </>
  );
};

export default SidebarV2;
