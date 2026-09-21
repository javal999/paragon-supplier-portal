import React from 'react';
import { useTranslation } from 'react-i18next';
import { NavLink } from 'react-router-dom';
import { ADMIN_SECTIONS } from './adminSections';

// ─────────────────────────────────────────────────────────────────────────────
// THE ADMINISTRATION AREA'S SECTION TABS — one component, every admin page.
//
// Was defined inside `AdminWorkingCalendar` while it was the only page with
// tabs (the 3PL page had none). BL-32 builds the remaining sections, so the
// tabs move here and every admin page renders the same list from
// `ADMIN_SECTIONS` — a page cannot forget a sibling.
// ─────────────────────────────────────────────────────────────────────────────

const AdminSectionNav: React.FC = () => {
  const { t } = useTranslation();
  return (
    <nav aria-label={t('adminCal.sections.label')} className="mb-6">
      <ul className="flex flex-wrap items-center gap-2 border-b border-border-subtle">
        {ADMIN_SECTIONS.map((s) => {
          const Icon = s.icon;
          return (
            <li key={s.id}>
              <NavLink
                to={s.path}
                data-testid={`admin-section-${s.id}`}
                className={({ isActive }) =>
                  `inline-flex items-center gap-2 px-3 py-2 text-sm border-b-2 -mb-px ${
                    isActive ? 'border-action text-action-hover font-medium' : 'border-transparent text-text-secondary'
                  }`
                }
              >
                <Icon size={14} aria-hidden="true" />
                {t(s.labelKey)}
              </NavLink>
            </li>
          );
        })}
      </ul>
    </nav>
  );
};

export default AdminSectionNav;
