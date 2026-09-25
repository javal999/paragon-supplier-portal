import React, { useLayoutEffect, useRef } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useCurrentIdentity } from '../../context/CurrentIdentityContext';
import { mockSuppliers } from '../../data/mockSuppliers';
import { SEEDED_SEAT_ROLES } from '../../services/transitions/businessRoles';
import { NO_PERSON } from '../../context/noPerson';
import { HOME_PATH, isItemActive, navFor, type Persona } from './navConfig';
import { useHubRole } from './hubRole';

const SEED_SUPPLIER_ID = 'sup-007';
const SEED_SUPPLIER_NAME =
  mockSuppliers.find((s) => s.id === SEED_SUPPLIER_ID)?.name ?? null;

// Keyed per persona so the PTI menu's offset is never applied to the supplier
// menu. Every access is guarded, like orderSummaryViewState.ts: a blocked or
// full store must not break the menu.
const sidebarScrollKey = (persona: Persona): string => `paragon.sidebarScroll.${persona}`;

function readSidebarScroll(persona: Persona): number | null {
  try {
    const raw = window.sessionStorage.getItem(sidebarScrollKey(persona));
    if (raw === null) return null;
    const value = Number(raw);
    return Number.isFinite(value) ? value : null;
  } catch {
    return null;
  }
}

function saveSidebarScroll(persona: Persona, scrollTop: number): void {
  try {
    window.sessionStorage.setItem(sidebarScrollKey(persona), String(scrollTop));
  } catch {
    /* storage unavailable: the menu still works, it just opens at the top */
  }
}

const SidebarV2: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { t } = useTranslation();
  const currentPath = `${location.pathname}`;
  const { identity, setIdentity } = useCurrentIdentity();
  const persona = identity.personaType;

  const [hubRole] = useHubRole();
  const groups = navFor(persona, hubRole);

  const navRef = useRef<HTMLElement>(null);

  // Layout effect, not effect + rAF: the nav's items are already rendered here,
  // and applying the offset before paint means the menu never flashes at the top.
  useLayoutEffect(() => {
    const nav = navRef.current;

    if (!nav) return;

    const savedPosition = readSidebarScroll(persona);

    if (savedPosition !== null) {
      nav.scrollTop = savedPosition;
      // Never leave the current page's menu item scrolled out of view.
      const active = nav.querySelector<HTMLElement>('[aria-current="page"]');
      if (!active) return;
      const a = active.getBoundingClientRect();
      const n = nav.getBoundingClientRect();
      if (a.top < n.top || a.bottom > n.bottom) {
        active.scrollIntoView?.({ block: 'nearest' });
      }
    }
  }, [persona]);

  return (
    <aside className="w-60 shrink-0 h-full bg-bg-sidebar border-r border-border-subtle flex flex-col">
      {/* Persona toggle */}
      <div className="mt-4 mb-6 mx-3">
        <div role="group" aria-label={t('hub.persona.groupLabel')} className="bg-bg-hover rounded-full h-8 p-0.5 flex">
          <button
            type="button"
            aria-pressed={persona === 'buyer'}
            onClick={() => {
              setIdentity({
                personaType: 'buyer',
                supplierId: null,
                supplierName: null,
                businessRoles: SEEDED_SEAT_ROLES.buyer,
                actor: NO_PERSON,
              });
              navigate(HOME_PATH.buyer);
            }}
            className={`flex-1 px-3 py-1.5 rounded-full text-xs font-medium transition-colors ${
              persona === 'buyer'
                ? 'bg-white shadow-sm text-text-primary'
                : 'text-text-tertiary'
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
                actor: NO_PERSON,
              });
              navigate(HOME_PATH.supplier);
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
            <div id={`nav-group-${group.id}`} className="text-label text-text-tertiary px-3 py-2 uppercase">
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
                      onClick={() => navigate(item.path)}
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
  );
};

export default SidebarV2;
