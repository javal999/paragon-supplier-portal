import { BellRing, CalendarDays, Link2, SlidersHorizontal, type LucideIcon } from 'lucide-react';

// ─────────────────────────────────────────────────────────────────────────────
// THE ADMINISTRATION AREA — its sections, one definition (BL-50, BL-51, BL-32).
//
// The admin screen BL-32 describes, complete: the working calendar (BL-50), the
// 3PL list (BL-51), and the values that lived in configuration files until
// BL-32 — tolerances and rule values, alert thresholds and stale periods, and
// reason codes. ⚠️ ONLY BUILT SECTIONS ARE LISTED: a tab for a page that does
// not exist would be a false affordance. Every admin page renders its tabs
// from this list (`AdminSectionNav`), so a page cannot forget a sibling.
// ─────────────────────────────────────────────────────────────────────────────

export interface AdminSection {
  readonly id: string;
  readonly labelKey: string;
  readonly icon: LucideIcon;
  readonly path: string;
}

export const ADMIN_BASE_PATH = '/buyer/admin';

export const ADMIN_SECTIONS: readonly AdminSection[] = [
  {
    id: 'working-calendar',
    labelKey: 'adminCal.section.workingCalendar',
    icon: CalendarDays,
    path: `${ADMIN_BASE_PATH}/working-calendar`,
  },
  {
    id: '3pl-tracking',
    labelKey: 'hub.nav.util.threePls',
    icon: Link2,
    path: `${ADMIN_BASE_PATH}/3pl-tracking`,
  },
  {
    id: 'tolerances',
    labelKey: 'hub.nav.util.tolerances',
    icon: SlidersHorizontal,
    path: `${ADMIN_BASE_PATH}/tolerances`,
  },
  {
    id: 'alert-thresholds',
    labelKey: 'hub.nav.util.alertThresholds',
    icon: BellRing,
    path: `${ADMIN_BASE_PATH}/alert-thresholds`,
  },
];
