import {
  Award,
  BookOpen,
  Boxes,
  Building2,
  ClipboardCheck,
  CalendarClock,
  ChartLine,
  FileSearch,
  ListTodo,
  MessageSquareReply,
  PackageCheck,
  Receipt,
  ShieldCheck,
  ShoppingCart,
  Truck,
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
      { labelKey: 'hub.nav.pti.commitments', icon: ChartLine, path: '/buyer/collaboration' },
    ],
  },
  {
    id: 'inventory',
    labelKey: 'hub.nav.section.inventory',
    roles: ['MP'],
    items: [{ labelKey: 'hub.nav.pti.inventory', icon: Boxes, path: '/buyer/inventory' }],
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
      { labelKey: 'hub.nav.pti.rfx', icon: FileSearch, path: '/buyer/sourcing' },
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
      { labelKey: 'hub.nav.sup.stock', icon: Boxes, path: '/supplier/inventory' },
    ],
  },
  {
    id: 'sourcing',
    labelKey: 'hub.nav.section.sourcing',
    items: [{ labelKey: 'hub.nav.sup.invitations', icon: FileSearch, path: '/supplier/rfqs' }],
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
