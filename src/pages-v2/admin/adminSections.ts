import { Award, BellRing, Tags, Building2, CalendarDays, Layers, Link2, ListChecks, SlidersHorizontal, UserCog, type LucideIcon } from 'lucide-react';

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
    // Material A1 — each supplier's stock update mode (MR-1 BR-02, AC-06).
    id: 'suppliers',
    labelKey: 'hub.nav.util.suppliers',
    icon: Building2,
    path: `${ADMIN_BASE_PATH}/suppliers`,
  },
  {
    // Material G1 — the documents each qualification level requires (MR-10 BR-04).
    id: 'qualification',
    labelKey: 'hub.nav.util.qualification',
    icon: Award,
    path: `${ADMIN_BASE_PATH}/qualification`,
  },
  {
    // Material G2 — each sourcing category and purchasing group, Direct or Indirect (MR-10 BR-06).
    id: 'sourcing-types',
    labelKey: 'hub.nav.util.sourcingTypes',
    icon: Tags,
    path: `${ADMIN_BASE_PATH}/sourcing-types`,
  },
  {
    // Material C5 — planning groups for capacity (MR-8 BR-03).
    id: 'planning-groups',
    labelKey: 'hub.nav.util.planningGroups',
    icon: Layers,
    path: `${ADMIN_BASE_PATH}/planning-groups`,
  },
  {
    // Material C4 — who each SAP MRP controller code is (MR-5 BR-02).
    id: 'mrp-controllers',
    labelKey: 'hub.nav.util.mrpControllers',
    icon: UserCog,
    path: `${ADMIN_BASE_PATH}/mrp-controllers`,
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
  {
    id: 'reason-codes',
    labelKey: 'hub.nav.util.reasonCodes',
    icon: ListChecks,
    path: `${ADMIN_BASE_PATH}/reason-codes`,
  },
];
