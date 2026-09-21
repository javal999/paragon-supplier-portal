import { CalendarDays, type LucideIcon } from 'lucide-react';

// ─────────────────────────────────────────────────────────────────────────────
// THE ADMINISTRATION AREA — its sections, one definition (BL-50, BL-32).
//
// The working calendar is the first page of the admin screen BL-32 describes.
// Reason codes, tolerances, alert thresholds and stale periods join this list
// as they are built. ⚠️ ONLY BUILT SECTIONS ARE LISTED: a tab for a page that
// does not exist yet would be a false affordance, so the page says in words
// what is coming instead.
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
];
