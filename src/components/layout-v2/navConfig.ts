import {
  Anchor,
  Scale,
  AlertTriangle,
  Award,
  BellRing,
  BookOpen,
  Boxes,
  Building2,
  ClipboardCheck,
  Container,
  CalendarClock,
  CalendarSync,
  CalendarDays,
  CalendarRange,
  ChartLine,
  DatabaseZap,
  Factory,
  FileQuestion,
  FileSearch,
  FileText,
  Gauge,
  KeyRound,
  Layers,
  Link2,
  ListChecks,
  ListTodo,
  MessageSquareReply,
  PackageCheck,
  Radio,
  Receipt,
  ShieldCheck,
  ShieldHalf,
  Scale,
  ShoppingCart,
  SlidersHorizontal,
  Target,
  TrendingUp,
  Truck,
  UserCog,
  Users,
  Workflow,
  type LucideIcon,
} from 'lucide-react';
import type { HubRole } from './hubRole';

// ─────────────────────────────────────────────────────────────────────────────
// THE HUB MENU — one definition, read by the sidebar AND by every page header.
//
// Source: SUPPLIER-HUB-REQUIREMENTS.md §3.7 (NV-01 to NV-06).
// · Sections are the hub's own areas, not procurement stages.
// · PTI sections carry the roles that see them; suppliers see every section.
// · A page's section label is looked up here (NV-05), so the header can never
//   name a different section from the menu.
// · Every item has its own icon (NV-04).
// · Pages outside the MVP are simply absent (NV-06); their routes still work.
// ─────────────────────────────────────────────────────────────────────────────

export type Persona = 'buyer' | 'supplier';

export interface NavItem {
  readonly labelKey: string;
  readonly icon: LucideIcon;
  readonly path: string;
}

export interface NavSection {
  readonly id: string;
  readonly labelKey: string;
  /** PTI roles that see this section. Omitted = every role. */
  readonly roles?: readonly Exclude<HubRole, 'ALL'>[];
  readonly items: readonly NavItem[];
}

export const PTI_NAV: readonly NavSection[] = [
  {
    id: 'home',
    labelKey: 'hub.nav.section.home',
    items: [
      { labelKey: 'hub.nav.pti.tasks', icon: ListTodo, path: '/buyer/home' },
      { labelKey: 'hub.nav.pti.replies', icon: MessageSquareReply, path: '/buyer/comm-hub' },
    ],
  },
  {
    id: 'orders',
    labelKey: 'hub.nav.section.orders',
    roles: ['MP'],
    items: [
      { labelKey: 'hub.nav.pti.orderSummary', icon: ClipboardCheck, path: '/buyer/order-summary' },
      { labelKey: 'hub.nav.pti.purchaseOrders', icon: ShoppingCart, path: '/buyer/orders' },
      { labelKey: 'hub.nav.pti.shipments', icon: Truck, path: '/buyer/shipments' },
      { labelKey: 'hub.nav.pti.goodsReceipts', icon: PackageCheck, path: '/buyer/goods-receipt' },
    ],
  },
  {
    id: 'forecast',
    labelKey: 'hub.nav.section.forecast',
    roles: ['MP'],
    items: [
      { labelKey: 'hub.nav.pti.forecasts', icon: CalendarRange, path: '/buyer/forecasts' },
      { labelKey: 'hub.nav.pti.commitments', icon: ChartLine, path: '/buyer/collaboration' },
      { labelKey: 'hub.nav.pti.fsReconcile', icon: Scale, path: '/buyer/fs-reconcile' },
      { labelKey: 'hub.nav.pti.dataHealth', icon: DatabaseZap, path: '/buyer/data-health' },
      { labelKey: 'hub.nav.pti.demandForecast', icon: TrendingUp, path: '/buyer/demand-forecast' },
      { labelKey: 'hub.nav.pti.forecastBias', icon: Scale, path: '/buyer/forecast-bias' },
      { labelKey: 'hub.nav.pti.reliability', icon: Target, path: '/buyer/reliability' },
      { labelKey: 'hub.nav.pti.materialRequirement', icon: Layers, path: '/buyer/material-requirement' },
      { labelKey: 'hub.nav.pti.safetyStock', icon: ShieldHalf, path: '/buyer/safety-stock' },
      { labelKey: 'hub.nav.pti.orderPlan', icon: Container, path: '/buyer/order-plan' },
      { labelKey: 'hub.nav.pti.reschedule', icon: CalendarSync, path: '/buyer/reschedule' },
      { labelKey: 'hub.nav.pti.stabilise', icon: Anchor, path: '/buyer/stabilise' },
    ],
  },
  {
    id: 'inventory',
    labelKey: 'hub.nav.section.inventory',
    roles: ['MP'],
    items: [
      { labelKey: 'hub.nav.pti.inventory', icon: Boxes, path: '/buyer/inventory' },
      { labelKey: 'hub.nav.pti.capacity', icon: Gauge, path: '/buyer/capacity' },
      { labelKey: 'hub.nav.pti.alerts', icon: AlertTriangle, path: '/buyer/alerts' },
      { labelKey: 'hub.nav.pti.supplierAccess', icon: KeyRound, path: '/buyer/supplier-access' },
    ],
  },
  {
    id: 'calloffs',
    labelKey: 'hub.nav.section.calloffs',
    roles: ['MP'],
    items: [
      { labelKey: 'hub.nav.pti.callOffs', icon: CalendarClock, path: '/buyer/call-offs' },
    ],
  },
  {
    id: 'sourcing',
    labelKey: 'hub.nav.section.sourcing',
    roles: ['BUY'],
    items: [
      // Operator decision 2026-09-21 (reverses NV-06's one-sourcing-item ruling):
      // RFI, RFQ and RFP are three modules, each with its own menu item and route.
      { labelKey: 'hub.nav.pti.rfi', icon: FileQuestion, path: '/buyer/rfi' },
      { labelKey: 'hub.nav.pti.rfq', icon: FileSearch, path: '/buyer/rfq' },
      { labelKey: 'hub.nav.pti.rfp', icon: FileText, path: '/buyer/rfp' },
      { labelKey: 'hub.nav.pti.suppliers', icon: Users, path: '/buyer/suppliers' },
    ],
  },
  {
    id: 'invoices',
    labelKey: 'hub.nav.section.invoices',
    roles: ['FIN'],
    items: [{ labelKey: 'hub.nav.pti.invoices', icon: Receipt, path: '/buyer/invoices' }],
  },
  {
    id: 'performance',
    labelKey: 'hub.nav.section.performance',
    roles: ['MP', 'BUY'],
    items: [{ labelKey: 'hub.nav.pti.performance', icon: Award, path: '/buyer/scorecard' }],
  },
];

export const SUPPLIER_NAV: readonly NavSection[] = [
  {
    id: 'home',
    labelKey: 'hub.nav.section.home',
    items: [{ labelKey: 'hub.nav.sup.todo', icon: ListTodo, path: '/supplier/home' }],
  },
  {
    id: 'orders',
    labelKey: 'hub.nav.section.supplierOrders',
    items: [
      { labelKey: 'hub.nav.sup.orderSummary', icon: ClipboardCheck, path: '/supplier/order-summary' },
      { labelKey: 'hub.nav.sup.purchaseOrders', icon: ShoppingCart, path: '/supplier/orders' },
      { labelKey: 'hub.nav.sup.callOffs', icon: CalendarClock, path: '/supplier/call-offs' },
      { labelKey: 'hub.nav.sup.shipments', icon: Truck, path: '/supplier/shipments' },
      { labelKey: 'hub.nav.sup.goodsReceipts', icon: PackageCheck, path: '/supplier/goods-receipts' },
    ],
  },
  {
    id: 'planning',
    labelKey: 'hub.nav.section.planning',
    items: [
      { labelKey: 'hub.nav.sup.forecast', icon: ChartLine, path: '/supplier/forecasts' },
      { labelKey: 'hub.nav.sup.fsReconcile', icon: Scale, path: '/supplier/fs-reconcile' },
      { labelKey: 'hub.nav.sup.stock', icon: Boxes, path: '/supplier/inventory' },
      { labelKey: 'hub.nav.sup.capacity', icon: Factory, path: '/supplier/capacity' },
    ],
  },
  {
    id: 'sourcing',
    labelKey: 'hub.nav.section.sourcing',
    // Operator decision 2026-09-21 — one item per event type. Negotiation rounds
    // live at /supplier/rfq/rounds, under the RFQ item, so it stays highlighted.
    items: [
      { labelKey: 'hub.nav.sup.rfiInvitations', icon: FileQuestion, path: '/supplier/rfi' },
      { labelKey: 'hub.nav.sup.rfqInvitations', icon: FileSearch, path: '/supplier/rfq' },
      { labelKey: 'hub.nav.sup.rfpInvitations', icon: FileText, path: '/supplier/rfp' },
    ],
  },
  {
    id: 'invoices',
    labelKey: 'hub.nav.section.invoices',
    items: [{ labelKey: 'hub.nav.sup.invoices', icon: Receipt, path: '/supplier/invoices' }],
  },
  {
    id: 'performance',
    labelKey: 'hub.nav.section.performance',
    items: [{ labelKey: 'hub.nav.sup.performance', icon: Award, path: '/supplier/performance' }],
  },
  {
    id: 'company',
    labelKey: 'hub.nav.section.company',
    items: [{ labelKey: 'hub.nav.sup.documents', icon: Building2, path: '/supplier/documents' }],
  },
];

/** Help and administration live in the user menu, not the main menu (NV-01). */
export const UTILITY_NAV: Record<Persona, readonly NavItem[]> = {
  buyer: [
    { labelKey: 'hub.nav.util.glossary', icon: BookOpen, path: '/glossary' },
    { labelKey: 'hub.nav.util.roles', icon: ShieldCheck, path: '/buyer/roles' },
    { labelKey: 'hub.nav.util.processFlows', icon: Workflow, path: '/buyer/process-flows' },
    // REQ-E07-08 / NV-01 — administration sits in the user menu, not the main menu.
    { labelKey: 'hub.nav.util.interfaceMonitor', icon: Radio, path: '/buyer/interface-monitor' },
    // BL-50 / NV-01 — the working calendar (ADM). The first page of the
    // administration area; BL-32's sections join it under /buyer/admin.
    { labelKey: 'hub.nav.util.workingCalendar', icon: CalendarDays, path: '/buyer/admin/working-calendar' },
    // BL-51 — the 3PL list behind every ASN tracking link (maintained by ADM).
    { labelKey: 'hub.nav.util.threePls', icon: Link2, path: '/buyer/admin/3pl-tracking' },
    // Material A1 — each supplier's stock update mode (MR-1 BR-02, set by ADM).
    { labelKey: 'hub.nav.util.suppliers', icon: Building2, path: '/buyer/admin/suppliers' },
    // Material C4 — who each SAP MRP controller code is (MR-5 BR-02, set by ADM).
    { labelKey: 'hub.nav.util.mrpControllers', icon: UserCog, path: '/buyer/admin/mrp-controllers' },
    // BL-32 — the values that lived in configuration files (ADM, REQ-E08-05 BR-03).
    { labelKey: 'hub.nav.util.tolerances', icon: SlidersHorizontal, path: '/buyer/admin/tolerances' },
    { labelKey: 'hub.nav.util.alertThresholds', icon: BellRing, path: '/buyer/admin/alert-thresholds' },
    { labelKey: 'hub.nav.util.reasonCodes', icon: ListChecks, path: '/buyer/admin/reason-codes' },
  ],
  supplier: [{ labelKey: 'hub.nav.util.glossary', icon: BookOpen, path: '/glossary' }],
};

export const HOME_PATH: Record<Persona, string> = {
  buyer: '/buyer/home',
  supplier: '/supplier/home',
};

export function navFor(persona: Persona, role: HubRole): readonly NavSection[] {
  if (persona === 'supplier') return SUPPLIER_NAV;
  if (role === 'ALL') return PTI_NAV;
  return PTI_NAV.filter((s) => !s.roles || s.roles.includes(role));
}

/** An item is active on its own path and on its detail pages (NV-03). */
export function isItemActive(item: NavItem, pathname: string): boolean {
  return pathname === item.path || pathname.startsWith(`${item.path}/`);
}

/** The menu section that owns a route, for the page header (NV-05). */
export function sectionForPath(pathname: string): NavSection | null {
  const all = [...PTI_NAV, ...SUPPLIER_NAV];
  for (const section of all) {
    if (section.items.some((item) => isItemActive(item, pathname))) return section;
  }
  return null;
}
