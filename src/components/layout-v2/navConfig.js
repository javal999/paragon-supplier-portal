/** @import { LucideIcon } from 'lucide-react' */
import {
  Anchor,
  Scale,
  AlertTriangle,
  Award,
  BellRing,
  BookOpen,
  Boxes,
  Building2,
  Calculator,
  ClipboardCheck,
  Container,
  CalendarCheck,
  CalendarClock,
  CalendarSync,
  CalendarDays,
  ChartLine,
  DatabaseZap,
  Factory,
  FlaskConical,
  History,
  FileQuestion,
  FileSearch,
  FileText,
  Gauge,
  KeyRound,
  LockKeyhole,
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
  ShoppingCart,
  SlidersHorizontal,
  Tags,
  Target,
  TrendingUp,
  Truck,
  UserCog,
  Users,
  Workflow
} from 'lucide-react';
/** @import { HubRole } from './hubRole' */

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

/** @typedef {'buyer' | 'supplier'} Persona */

/**
 * @typedef {{
 *     readonly labelKey: string;
 *     readonly icon: LucideIcon;
 *     readonly path: string;
 *   }} NavItem
 */

/**
 * `roles`:  PTI roles that see this section. Omitted = every role.
 *
 * @typedef {{
 *     readonly id: string;
 *     readonly labelKey: string;
 *     readonly roles?: readonly Exclude<HubRole, 'ALL'>[];
 *     readonly items: readonly NavItem[];
 *   }} NavSection
 */

/** @type {readonly NavSection[]} */
export const PTI_NAV = [
  {
    id: 'home',
    labelKey: 'hub.nav.section.home',
    items: [
      { labelKey: 'hub.nav.pti.tasks', icon: ListTodo, path: '/buyer/home' },
      { labelKey: 'hub.nav.pti.replies', icon: MessageSquareReply, path: '/buyer/comm-hub' }
    ]
  },
  {
    id: 'orders',
    labelKey: 'hub.nav.section.orders',
    roles: ['MP'],
    items: [
      { labelKey: 'hub.nav.pti.orderSummary', icon: ClipboardCheck, path: '/buyer/order-summary' },
      { labelKey: 'hub.nav.pti.purchaseOrders', icon: ShoppingCart, path: '/buyer/orders' },
      { labelKey: 'hub.nav.pti.shipments', icon: Truck, path: '/buyer/shipments' },
      { labelKey: 'hub.nav.pti.goodsReceipts', icon: PackageCheck, path: '/buyer/goods-receipt' }
    ]
  },
  {
    // FUX-D1/D2 (owner, 2026-10-05) and FORECAST-UX-EVALUATION-2026-10 §3
    // (F-03, F-04, F-19): the 13-item Forecast group became the weekly cycle,
    // in data order, plus a Review section. The engine pages moved to the user
    // menu (UTILITY_NAV.buyer, "Planning engine").
    id: 'weeklyPlan',
    labelKey: 'hub.nav.section.weeklyPlan',
    roles: ['MP'],
    items: [
      // FUX phase 2 B1 (F-03) — the cycle's starting point comes first.
      { labelKey: 'hub.nav.pti.thisWeek', icon: CalendarCheck, path: '/buyer/this-week' },
      { labelKey: 'hub.nav.pti.whatToOrder', icon: Container, path: '/buyer/order-plan' },
      { labelKey: 'hub.nav.pti.makeRoom', icon: CalendarSync, path: '/buyer/reschedule' },
      { labelKey: 'hub.nav.pti.publishToSuppliers', icon: Anchor, path: '/buyer/stabilise' },
      { labelKey: 'hub.nav.pti.supplierResponses', icon: ChartLine, path: '/buyer/collaboration' },
      // CAP-10 — the demand anticipation the planner freezes per 4-week horizon.
      {
        labelKey: 'hub.nav.pti.demandAnticipation',
        icon: LockKeyhole,
        path: '/buyer/demand-anticipation'
      },
      // DRC-17 (BL-202) BR-07 — the what-if sandbox: analysis only, last in the cycle.
      { labelKey: 'hub.nav.pti.whatIfSandbox', icon: Calculator, path: '/buyer/what-if' }
    ]
  },
  {
    // FUX-D2 — the Supplier scorecard is the planner's supplier-evaluation page
    // (F-11). Procurement keeps it under Performance, so sectionForPath picks the
    // section by role.
    id: 'review',
    labelKey: 'hub.nav.section.review',
    roles: ['MP'],
    items: [
      { labelKey: 'hub.nav.pti.performance', icon: Award, path: '/buyer/scorecard' },
      { labelKey: 'hub.nav.pti.forecastQuality', icon: TrendingUp, path: '/buyer/demand-forecast' },
      { labelKey: 'hub.nav.pti.stockCheck', icon: Scale, path: '/buyer/fs-reconcile' },
      // DRC-3 (BL-189) — every demand anticipation publication, read only.
      {
        labelKey: 'hub.nav.pti.demandAnticipationHistory',
        icon: History,
        path: '/buyer/demand-anticipation-history'
      }
    ]
  },
  {
    id: 'inventory',
    labelKey: 'hub.nav.section.inventory',
    roles: ['MP'],
    items: [
      { labelKey: 'hub.nav.pti.inventory', icon: Boxes, path: '/buyer/inventory' },
      {
        labelKey: 'hub.nav.pti.stockSimulation',
        icon: CalendarClock,
        path: '/buyer/stock-simulation'
      },
      { labelKey: 'hub.nav.pti.capacity', icon: Gauge, path: '/buyer/capacity' },
      { labelKey: 'hub.nav.pti.alerts', icon: AlertTriangle, path: '/buyer/alerts' },
      { labelKey: 'hub.nav.pti.supplierAccess', icon: KeyRound, path: '/buyer/supplier-access' }
    ]
  },
  {
    // Material C2 — Materials → Trade names (MR-3 d): Material Planning approves
    // the names suppliers give PTI materials.
    id: 'materials',
    labelKey: 'hub.nav.section.materials',
    roles: ['MP'],
    items: [
      { labelKey: 'hub.nav.pti.tradeNames', icon: Tags, path: '/buyer/materials/trade-names' }
    ]
  },
  {
    id: 'calloffs',
    labelKey: 'hub.nav.section.calloffs',
    roles: ['MP'],
    items: [{ labelKey: 'hub.nav.pti.callOffs', icon: CalendarClock, path: '/buyer/call-offs' }]
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
      { labelKey: 'hub.nav.pti.suppliers', icon: Users, path: '/buyer/suppliers' }
    ]
  },
  {
    id: 'invoices',
    labelKey: 'hub.nav.section.invoices',
    roles: ['FIN'],
    items: [{ labelKey: 'hub.nav.pti.invoices', icon: Receipt, path: '/buyer/invoices' }]
  },
  {
    // DRC-3 (BL-189), [Owner A10] — Procurement and Finance audit the demand
    // anticipation history; a Material Planner reaches it under Review.
    id: 'audit',
    labelKey: 'hub.nav.section.audit',
    roles: ['BUY', 'FIN'],
    items: [
      {
        labelKey: 'hub.nav.pti.demandAnticipationHistory',
        icon: History,
        path: '/buyer/demand-anticipation-history'
      }
    ]
  },
  {
    // FUX-D2 — a Material Planner sees the scorecard under Review instead.
    // FUX-D6 (F-15) — Procurement sets max stock on the feedstock reconcile
    // (DRC-15a BR-03), so it gets a menu path too; `maxstock:set`'s HandoffNotice still
    // gates the act on the page.
    id: 'performance',
    labelKey: 'hub.nav.section.performance',
    roles: ['BUY'],
    items: [
      { labelKey: 'hub.nav.pti.performance', icon: Award, path: '/buyer/scorecard' },
      { labelKey: 'hub.nav.pti.stockCheck', icon: Scale, path: '/buyer/fs-reconcile' }
    ]
  }
];

/** @type {readonly NavSection[]} */
export const SUPPLIER_NAV = [
  {
    id: 'home',
    labelKey: 'hub.nav.section.home',
    items: [{ labelKey: 'hub.nav.sup.todo', icon: ListTodo, path: '/supplier/home' }]
  },
  {
    id: 'orders',
    labelKey: 'hub.nav.section.supplierOrders',
    items: [
      {
        labelKey: 'hub.nav.sup.orderSummary',
        icon: ClipboardCheck,
        path: '/supplier/order-summary'
      },
      { labelKey: 'hub.nav.sup.purchaseOrders', icon: ShoppingCart, path: '/supplier/orders' },
      { labelKey: 'hub.nav.sup.callOffs', icon: CalendarClock, path: '/supplier/call-offs' },
      { labelKey: 'hub.nav.sup.shipments', icon: Truck, path: '/supplier/shipments' },
      {
        labelKey: 'hub.nav.sup.goodsReceipts',
        icon: PackageCheck,
        path: '/supplier/goods-receipts'
      }
    ]
  },
  {
    id: 'planning',
    labelKey: 'hub.nav.section.planning',
    items: [
      { labelKey: 'hub.nav.sup.forecast', icon: ChartLine, path: '/supplier/forecasts' },
      { labelKey: 'hub.nav.sup.fsReconcile', icon: Scale, path: '/supplier/fs-reconcile' },
      { labelKey: 'hub.nav.sup.stock', icon: Boxes, path: '/supplier/inventory' },
      { labelKey: 'hub.nav.sup.capacity', icon: Factory, path: '/supplier/capacity' }
    ]
  },
  {
    id: 'sourcing',
    labelKey: 'hub.nav.section.sourcing',
    // Operator decision 2026-09-21 — one item per event type. Negotiation rounds
    // live at /supplier/rfq/rounds, under the RFQ item, so it stays highlighted.
    items: [
      { labelKey: 'hub.nav.sup.rfiInvitations', icon: FileQuestion, path: '/supplier/rfi' },
      { labelKey: 'hub.nav.sup.rfqInvitations', icon: FileSearch, path: '/supplier/rfq' },
      { labelKey: 'hub.nav.sup.rfpInvitations', icon: FileText, path: '/supplier/rfp' }
    ]
  },
  {
    id: 'invoices',
    labelKey: 'hub.nav.section.invoices',
    items: [{ labelKey: 'hub.nav.sup.invoices', icon: Receipt, path: '/supplier/invoices' }]
  },
  {
    id: 'performance',
    labelKey: 'hub.nav.section.performance',
    items: [{ labelKey: 'hub.nav.sup.performance', icon: Award, path: '/supplier/performance' }]
  },
  {
    id: 'company',
    labelKey: 'hub.nav.section.company',
    items: [{ labelKey: 'hub.nav.sup.documents', icon: Building2, path: '/supplier/documents' }]
  }
];

/**
 * Help and administration live in the user menu, not the main menu (NV-01).
 * @type {Record<Persona, readonly NavItem[]>}
 */
export const UTILITY_NAV = {
  buyer: [
    { labelKey: 'hub.nav.util.glossary', icon: BookOpen, path: '/glossary' },
    { labelKey: 'hub.nav.util.roles', icon: ShieldCheck, path: '/buyer/roles' },
    { labelKey: 'hub.nav.util.processFlows', icon: Workflow, path: '/buyer/process-flows' },
    // REQ-E07-08 / NV-01 — administration sits in the user menu, not the main menu.
    { labelKey: 'hub.nav.util.interfaceMonitor', icon: Radio, path: '/buyer/interface-monitor' },
    // BL-50 / NV-01 — the working calendar (ADM). The first page of the
    // administration area; BL-32's sections join it under /buyer/admin.
    {
      labelKey: 'hub.nav.util.workingCalendar',
      icon: CalendarDays,
      path: '/buyer/admin/working-calendar'
    },
    // BL-51 — the 3PL list behind every ASN tracking link (maintained by ADM).
    { labelKey: 'hub.nav.util.threePls', icon: Link2, path: '/buyer/admin/3pl-tracking' },
    // Material A1 — each supplier's stock update mode (MR-1 BR-02, set by ADM).
    { labelKey: 'hub.nav.util.suppliers', icon: Building2, path: '/buyer/admin/suppliers' },
    // Material G1 — the documents each qualification level requires (MR-10 BR-04).
    { labelKey: 'hub.nav.util.qualification', icon: Award, path: '/buyer/admin/qualification' },
    // Material G2 — each sourcing category and purchasing group's type (MR-10 BR-06).
    { labelKey: 'hub.nav.util.sourcingTypes', icon: Tags, path: '/buyer/admin/sourcing-types' },
    // Material C5 — the planning groups capacity is kept by (MR-8, Material Planning).
    { labelKey: 'hub.nav.util.planningGroups', icon: Layers, path: '/buyer/admin/planning-groups' },
    // Material C4 — who each SAP MRP controller code is (MR-5 BR-02, set by ADM).
    {
      labelKey: 'hub.nav.util.mrpControllers',
      icon: UserCog,
      path: '/buyer/admin/mrp-controllers'
    },
    // BL-32 — the values that lived in configuration files (ADM, REQ-E08-05 BR-03).
    {
      labelKey: 'hub.nav.util.tolerances',
      icon: SlidersHorizontal,
      path: '/buyer/admin/tolerances'
    },
    {
      labelKey: 'hub.nav.util.alertThresholds',
      icon: BellRing,
      path: '/buyer/admin/alert-thresholds'
    },
    { labelKey: 'hub.nav.util.reasonCodes', icon: ListChecks, path: '/buyer/admin/reason-codes' },
    // FUX phase 1 (F-04) — the planning engine pages, out of the main menu but
    // never orphaned. Each label carries the "Planning engine" prefix.
    {
      labelKey: 'hub.nav.pti.engine.materialRequirement',
      icon: Layers,
      path: '/buyer/material-requirement'
    },
    { labelKey: 'hub.nav.pti.engine.safetyStock', icon: ShieldHalf, path: '/buyer/safety-stock' },
    // FUX phase 2 B5 — Forecast bias left the user menu: it is Forecast quality's bias tab.
    // FUX phase 2 B2 — Published versions left the user menu: it is Publish to suppliers' versions tab.
    { labelKey: 'hub.nav.pti.engine.dataHealth', icon: DatabaseZap, path: '/buyer/data-health' },
    {
      labelKey: 'hub.nav.pti.engine.modelBacktest',
      icon: FlaskConical,
      path: '/buyer/model-backtest'
    },
    { labelKey: 'hub.nav.pti.engine.reliability', icon: Target, path: '/buyer/reliability' }
  ],
  supplier: [{ labelKey: 'hub.nav.util.glossary', icon: BookOpen, path: '/glossary' }]
};

/** @type {Record<Persona, string>} */
export const HOME_PATH = {
  buyer: '/buyer/home',
  supplier: '/supplier/home'
};

/**
 * @param {Persona} persona
 * @param {HubRole} role
 * @returns {readonly NavSection[]}
 */
export function navFor(persona, role) {
  if (persona === 'supplier') return SUPPLIER_NAV;
  if (role === 'ALL') return PTI_NAV;
  return PTI_NAV.filter((s) => !s.roles || s.roles.includes(role));
}

/**
 * An item is active on its own path and on its detail pages (NV-03).
 * @param {NavItem} item
 * @param {string} pathname
 * @returns {boolean}
 */
export function isItemActive(item, pathname) {
  return pathname === item.path || pathname.startsWith(`${item.path}/`);
}

/**
 * The menu section that owns a route, for the page header (NV-05).
 *
 * A route can sit in more than one section (`/buyer/scorecard` is under Review
 * for MP and Performance for BUY), so the viewer's own menu is searched first.
 * A route outside the viewer's menu falls back to any section that holds it;
 * a route in no section returns null.
 * @param {string} pathname
 * @param {HubRole} role
 * @returns {NavSection | null}
 */
export function sectionForPath(pathname, role) {
  /** @param {NavSection} section */
  const owns = (section) => section.items.some((item) => isItemActive(item, pathname));
  const visible = [...navFor('buyer', role), ...SUPPLIER_NAV];
  return visible.find(owns) ?? [...PTI_NAV, ...SUPPLIER_NAV].find(owns) ?? null;
}
