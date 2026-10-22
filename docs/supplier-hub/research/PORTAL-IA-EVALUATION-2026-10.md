# Portal page and data flow map, with navigation evaluation (2026-10)

- **Status, 2026-10-21:** the findings are built on branch `ia/integration`, one GitLab MR stacked on the RFx wave 2 branch. P-06 was built differently by owner ruling (see P-06). Every decision taken during the build is in `IA-BUILD-DECISIONS-2026-10.md`.
- **Code evaluated:** `main` at `9ef7c368` (GitHub and GitLab `main`, the build live in production since 2026-10-20). It was extracted with `git archive` into a scratch folder, so no branch was checked out. The local checkout sits on `feat/rfx-ux-wave2`, which holds 46 unmerged RFx UX commits. RFx findings below may already be fixed on that branch.
- **How it was run:** `npm run build` on Node 22 passed. Node 24, the `.nvmrc` version, is not installed on this machine. The build ran under `vite preview` on port 5360, viewport 1440×900, signed in with **View as Buyer**. Every menu item was opened once for each **Menu for** view (Material Planner, Buyer, Finance, All PTI roles) and once as the supplier (`sup-007`). Each page's header, purpose line, tables, buttons and height were recorded by script in the preview.
- **How the maps were built:** a throwaway script resolved each of the 106 routes in `router/AppRouter.jsx` to its page file and followed the page's own imports. It recorded the data hooks the page calls (`services/query/hooks.js`, `commandHooks.js`, the delivery, chase and SDC hooks), each generic command's verbs, and every route literal the page links to. Links built in helper modules (`alertHref`, `forecastPages.js`, the order-summary drill) were read by hand and added. The script was deleted afterwards.
- **Use cases:** UC1 to UC7 as written in `docs/supplier-hub/user-guide/SCENARIOS.md`. Each step's page was opened in the preview, and how the user reaches it (menu, in-page link, task, URL) was taken from the link map and the Home task list (`pages-v2/BuyerHome.jsx:141-375`, `pages-v2/SupplierHome.jsx:186-405`). State changes were not executed. SCENARIOS already evidences them with code citations.
- **Known complaints used:** Levi, 2026-10-21. The existing pages feel "too complicated to use" and "hard to navigate between each of the pages or data".
- **Evidence format:** `file:line` paths are relative to `paragon-supplier-portal/src/` on `9ef7c368`. "Screen" means the route as rendered in the preview on the hub's date, 31 Aug 2026.
- **Diagrams:** 48 diagrams, each drawn as an SVG in `portal-maps/svg/` from its Mermaid source in `portal-maps/`. Open `portal-maps/index.html` to browse them all, with hover tracing on the page maps.

---

## 1. VERDICT

**Buyer side:** the structure is not effective. The pages exist, but they are joined by the menu rather than by the records, so most hand-offs need a menu lookup and two use cases need a URL.

**Supplier side:** mostly effective. To do reaches 13 of the other 15 menu pages, plus Revised quotes. The gaps are the PO-to-ASN step and new document requests, which To do never shows.

**Process flows:** it does not answer this. It draws 58 object state machines, not pages, menus or links.

1. **2 use-case steps have no path.** Purchase Requisitions and Compliance Tracker have no menu item and no My tasks item (IA-B01, IA-B02).
2. **Records don't link to their next step.** PO lifecycle steps are plain labels (`pages-v2/orders/PoCollaboration.jsx:113-123`). The 5 order pages per persona link only back to Order summary (IA-X01).
3. **The same job lives on 2 pages, with different figures.** Commitments, chase and ready-to-award counts each come in 2 versions (IA-B03 to IA-B05, IA-S03).
4. **The All view has 11 sections and 32 entries for 29 pages, and 22 more pages have no menu item.** The target map cuts the planner's menu from 24 items in 7 sections to 21 in 5.

---

## 2. INVENTORY

1 row per page route on `main` (93 pages). The 12 redirects are listed after the table. "Inbound" counts other pages that link in (tasks, links, step strip, back links). The redirects and the not-found page are left out. The Menu for views are MP (Material Planner), BUY (Buyer), FIN (Finance) and All. The avatar menu is Help & administration.

| Route | Page file | Menu label | Section | Roles | Persona | Objects read | Objects written | Inbound | Outbound | Use cases |
|---|---|---|---|---|---|---|---|---|---|---|
| /login (URL only, no menu), no inbound link | pages/auth/Login.jsx |  |  |  | Both | - | - | 0 pages | 2 pages | - |
| /register (URL only, no menu), no inbound link | pages-v2/SupplierRegistration/index.jsx |  |  |  | Both | - | - | 0 pages | 0 pages | - |
| /buyer/home | pages-v2/BuyerHome.jsx | My tasks | Home | All | PTI | ASN, Alert, Call-off, Capacity, Chase, Demand anticipation, Engine output, Forecast commitment, Goods receipt, Invoice, Purchase order, RFQ, Requisition | - | menu; 6 pages | 14 pages | UC7 all |
| /buyer/dashboard (URL only, no menu), no inbound link | pages-v2/BuyerDashboard.jsx |  |  |  | PTI | ASN, Alert, Capacity, Compliance document, Goods receipt, Invoice, Purchase order, RFQ, Stock, Supplier | - | 0 pages | 8 pages | - |
| /buyer/suppliers | pages-v2/BuyerSuppliers.jsx | Suppliers | Sourcing | BUY | PTI | Compliance document, Supplier | - | menu; 3 pages | 1 pages | - |
| /buyer/suppliers/:id (URL only, no menu) | pages-v2/BuyerSupplierProfile.jsx |  |  |  | PTI | Purchase order, Supplier | - | 1 pages | 2 pages | - |
| /marketplace (URL only, no menu) | pages-v2/Marketplace.jsx |  |  |  | Both | Supplier | - | 2 pages | 1 pages | - |
| /marketplace/supplier/:id (URL only, no menu) | pages-v2/SupplierStorefront.jsx |  |  |  | Both | Supplier | - | 2 pages | 1 pages | - |
| /buyer/order-summary | pages-v2/BuyerOrderSummary.jsx | Order summary | Order collaboration | MP | PTI | ASN, Call-off, Capacity, Forecast commitment, Goods receipt, Invoice, Purchase order | - | menu; 10 pages | 16 pages | UC2 |
| /buyer/orders | pages-v2/BuyerOrders.jsx | Purchase orders | Order collaboration | MP | PTI | ASN, Purchase order, Supplier | Purchase order | menu; 4 pages | 1 pages | UC2 |
| /buyer/rfi | pages-v2/BuyerRfi.jsx | RFI | Sourcing | BUY | PTI | RFI | RFI | menu; 3 pages | 2 pages | UC1 |
| /buyer/rfq | pages-v2/BuyerSourcing/index.jsx | RFQ | Sourcing | BUY | PTI | RFI, RFP, RFQ, Requisition, Scorecard, Supplier | RFQ | menu; 6 pages | 4 pages | UC1 |
| /buyer/rfq/:rfqId (URL only, no menu) | pages-v2/BuyerSourcingEvent/index.jsx |  |  |  | PTI | RFI, RFP, RFQ, Requisition, Scorecard, Supplier | RFQ | 2 pages | 5 pages | UC1 |
| /buyer/rfp | pages-v2/BuyerRfp/index.jsx | RFP | Sourcing | BUY | PTI | RFI, RFP, RFQ, Requisition, Scorecard | RFP | menu; 3 pages | 4 pages | UC1 |
| /buyer/intake-review (URL only, no menu), no inbound link | pages-v2/IntakeReview.jsx |  |  |  | PTI | Requisition | Requisition | 0 pages | 1 pages | - |
| /buyer/plan-grid (URL only, no menu) | pages-v2/PlanGrid.jsx |  |  |  | PTI | RFQ | Requisition | 1 pages | 0 pages | - |
| /buyer/collaboration | pages-v2/BuyerCommitments/index.jsx | Supplier responses | Weekly plan | MP | PTI | Capacity, Chase, Forecast commitment, Forecast version, Purchase order, Stock | Forecast commitment, Forecast version | menu; 5 pages | 4 pages | UC4 |
| /buyer/fs-reconcile | pages-v2/FixedStockReconcile.jsx | Feedstock reconcile | Review (MP); Performance (BUY) | MP, BUY | PTI | Max stock / feedstock | Max stock / feedstock | menu; 2 pages | 2 pages | UC6 |
| /buyer/reliability | pages-v2/BuyerReliability.jsx | Planning engine · Supplier reliability | Avatar menu | All | PTI | Scorecard | - | menu; 1 pages | 1 pages | - |
| /buyer/material-requirement | pages-v2/BuyerMaterialRequirement.jsx | Planning engine · Material requirement | Avatar menu | All | PTI | Engine output | - | menu; 1 pages | 1 pages | - |
| /buyer/safety-stock | pages-v2/BuyerSafetyStock.jsx | Planning engine · Safety stock targets | Avatar menu | All | PTI | Engine output | Demand anticipation | menu; 2 pages | 1 pages | - |
| /buyer/this-week | pages-v2/BuyerThisWeek.jsx | This week | Weekly plan | MP | PTI | Engine output, Forecast commitment, Forecast version, Order plan | - | menu; 0 pages | 3 pages | UC4 |
| /buyer/order-plan | pages-v2/BuyerOrderPlan/index.jsx | What to order | Weekly plan | MP | PTI | ASN, Call-off, Demand anticipation, Goods receipt, Order plan, Purchase order, Requisition | Call-off | menu; 7 pages | 4 pages | - |
| /buyer/reschedule | pages-v2/BuyerReschedule/index.jsx | Make warehouse room | Weekly plan | MP | PTI | Order plan | Call-off, Order plan | menu; 3 pages | 1 pages | - |
| /buyer/demand-anticipation | pages-v2/BuyerDemandAnticipation/index.jsx | Demand anticipation | Weekly plan | MP | PTI | Demand anticipation | Demand anticipation | menu; 3 pages | 1 pages | - |
| /buyer/demand-anticipation-history | pages-v2/BuyerDemandAnticipationHistory.jsx | Demand anticipation history | Review (MP); Audit (BUY, FIN) | MP, BUY, FIN | PTI | Demand anticipation | - | menu; 1 pages | 1 pages | - |
| /buyer/what-if | pages-v2/BuyerWhatIfSandbox/index.jsx | What-if sandbox | Weekly plan | MP | PTI | Order plan | Order plan | menu; 0 pages | 0 pages | - |
| /buyer/stabilise | pages-v2/BuyerStabilise/index.jsx | Publish to suppliers | Weekly plan | MP | PTI | Engine output, Forecast version, Order plan | Forecast version | menu; 1 pages | 3 pages | UC4 |
| /buyer/data-health | pages-v2/BuyerDataHealth.jsx | Planning engine · Data health | Avatar menu | All | PTI | Engine output | - | menu; 1 pages | 1 pages | - |
| /buyer/demand-forecast | pages-v2/BuyerDemandForecast.jsx | Forecast quality | Review | MP | PTI | Engine output | Forecast version | menu; 2 pages | 3 pages | - |
| /buyer/model-backtest | pages-v2/BuyerModelBacktest.jsx | Planning engine · Model backtest | Avatar menu | All | PTI | Engine output | - | menu; 1 pages | 1 pages | - |
| /buyer/collaboration/responses (URL only, no menu) | pages-v2/BuyerCollaboration.jsx |  |  |  | PTI | Chase, Supplier | Forecast commitment | 1 pages | 0 pages | - |
| /buyer/contracts (URL only, no menu) | pages-v2/BuyerContracts/index.jsx |  |  |  | PTI | Delivery agreement, Purchase order, Supplier | - | 1 pages | 1 pages | - |
| /buyer/contracts/:id (URL only, no menu) | pages-v2/BuyerContractDetail.jsx |  |  |  | PTI | Call-off, Delivery agreement, Purchase order, Supplier | Delivery agreement | 2 pages | 2 pages | - |
| /buyer/delivery-agreements (URL only, no menu), no inbound link | pages-v2/BuyerDeliveryAgreements.jsx |  |  |  | PTI | Delivery agreement | - | 0 pages | 1 pages | - |
| /buyer/call-offs | pages-v2/BuyerCallOffs.jsx | Call-offs | Call-offs | MP | PTI | ASN, Call-off, Goods receipt, Purchase order | Call-off | menu; 5 pages | 1 pages | UC3 |
| /buyer/chase (URL only, no menu) | pages-v2/BuyerChase.jsx |  |  |  | PTI | Chase, Supplier | - | 2 pages | 1 pages | - |
| /buyer/inventory | pages-v2/BuyerInventory.jsx | Inventory | Inventory & capacity | MP | PTI | Stock | Stock | menu; 2 pages | 1 pages | UC6 |
| /buyer/stock-simulation | pages-v2/BuyerStockSimulation.jsx | Stock simulation | Inventory & capacity | MP | PTI | Stock | Stock | menu; 0 pages | 2 pages | - |
| /buyer/capacity | pages-v2/BuyerCapacity.jsx | Capacity | Inventory & capacity | MP | PTI | Capacity, Demand anticipation, Forecast commitment, Purchase order | - | menu; 4 pages | 1 pages | UC6 |
| /buyer/alerts | pages-v2/BuyerAlerts.jsx | Alerts | Inventory & capacity | MP | PTI | Alert | Alert | menu; 1 pages | 5 pages | UC6 UC7 |
| /buyer/supplier-access | pages-v2/BuyerSupplierAccess.jsx | Supplier access | Inventory & capacity | MP | PTI | Stock | Stock | menu; 0 pages | 0 pages | - |
| /buyer/shipments | pages-v2/BuyerShipments/index.jsx | Shipments & ASN | Order collaboration | MP | PTI | ASN, Call-off, Goods receipt, Purchase order, Supplier | ASN | menu; 4 pages | 2 pages | UC2 |
| /buyer/goods-receipt | pages-v2/BuyerGoodsReceipt/index.jsx | Goods receipts | Order collaboration | MP | PTI | ASN, Chase, Compliance document, Goods receipt, Purchase order, Supplier | ASN, Goods receipt | menu; 5 pages | 1 pages | UC2 |
| /buyer/discovery (URL only, no menu), no inbound link | pages-v2/BuyerDiscovery.jsx |  |  |  | PTI | Supplier | - | 0 pages | 1 pages | - |
| /buyer/purchase-requisition (URL only, no menu) | pages-v2/BuyerRequisitions/index.jsx |  |  |  | PTI | Requisition, Supplier | Requisition | 4 pages | 2 pages | UC1 |
| /buyer/supplier-applications (URL only, no menu), no inbound link | pages-v2/BuyerSupplierApplications/index.jsx |  |  |  | PTI | Supplier | Supplier | 0 pages | 2 pages | - |
| /buyer/invoices | pages-v2/BuyerInvoices.jsx | Invoices | Invoices | FIN | PTI | Goods receipt, Invoice, Purchase order | Invoice | menu; 4 pages | 1 pages | UC2 |
| /buyer/scorecard | pages-v2/BuyerScorecard.jsx | Supplier performance | Review (MP); Performance (BUY) | MP, BUY | PTI | ASN, Call-off, Goods receipt, Purchase order, Scorecard | - | menu; 1 pages | 1 pages | - |
| /buyer/analytics (URL only, no menu), no inbound link | pages-v2/BuyerAnalytics.jsx |  |  |  | PTI | ASN, Call-off, Goods receipt, Purchase order, Scorecard, Supplier | - | 0 pages | 0 pages | - |
| /buyer/risk (URL only, no menu) | pages-v2/BuyerRisk/index.jsx |  |  |  | PTI | Alert, Compliance document | - | 1 pages | 0 pages | - |
| /buyer/comm-hub | pages-v2/BuyerCommHub.jsx | Supplier replies | Home | All | PTI | Chase, Stock, Supplier | Stock | menu; 1 pages | 0 pages | UC6 |
| /buyer/compliance (URL only, no menu) | pages-v2/BuyerCompliance/index.jsx |  |  |  | PTI | Compliance document, Supplier | Compliance document | 1 pages | 0 pages | UC5 |
| /buyer/process-flows | pages-v2/ProcessFlows.jsx | Process flows | Avatar menu | All | PTI | - | - | menu; 3 pages | 0 pages | - |
| /buyer/interface-monitor | pages-v2/InterfaceMonitor.jsx | Interface monitor | Avatar menu | All | PTI | ASN, Goods receipt, Invoice, Purchase order | Goods receipt | menu; 1 pages | 0 pages | - |
| /buyer/admin/working-calendar | pages-v2/admin/AdminWorkingCalendar.jsx | Working calendar | Avatar menu | All | PTI | Forecast version | Settings | menu; 0 pages | 1 pages | - |
| /buyer/admin/3pl-tracking | pages-v2/admin/AdminThreePls.jsx | 3PL tracking links | Avatar menu | All | PTI | - | Settings | menu; 0 pages | 1 pages | - |
| /buyer/admin/suppliers | pages-v2/admin/AdminSuppliers.jsx | Supplier stock update mode | Avatar menu | All | PTI | Stock | Stock | menu; 0 pages | 1 pages | UC6 |
| /buyer/admin/qualification | pages-v2/admin/AdminQualification.jsx | Vendor qualification | Avatar menu | All | PTI | Compliance document, Supplier | Supplier | menu; 0 pages | 1 pages | - |
| /buyer/admin/sourcing-types | pages-v2/admin/AdminSourcingTypes.jsx | Sourcing types | Avatar menu | All | PTI | - | Settings | menu; 0 pages | 1 pages | - |
| /buyer/admin/planning-groups | pages-v2/admin/AdminPlanningGroups.jsx | Planning groups | Avatar menu | All | PTI | - | Capacity | menu; 0 pages | 1 pages | - |
| /buyer/admin/mrp-controllers | pages-v2/admin/AdminMrpControllers.jsx | MRP controllers (PIC) | Avatar menu | All | PTI | - | Settings | menu; 0 pages | 1 pages | - |
| /buyer/materials/trade-names | pages-v2/materials/BuyerTradeNames.jsx | Trade names | Materials | MP | PTI | Trade name | Trade name | menu; 0 pages | 0 pages | - |
| /buyer/admin/tolerances | pages-v2/admin/AdminRuleValues/index.jsx | Tolerances and rule values | Avatar menu | All | PTI | Stock | Settings | menu; 0 pages | 1 pages | - |
| /buyer/admin/alert-thresholds | pages-v2/admin/AdminRuleValues/index.jsx | Alert thresholds and stale periods | Avatar menu | All | PTI | Stock | Settings | menu; 0 pages | 1 pages | UC7 |
| /buyer/admin/reason-codes | pages-v2/admin/AdminReasonCodes.jsx | Reason codes | Avatar menu | All | PTI | - | Settings | menu; 0 pages | 1 pages | UC7 |
| /buyer/roles | pages-v2/RolesCatalogue.jsx | Roles | Avatar menu | All | PTI | - | Settings | menu; 2 pages | 1 pages | - |
| /buyer/roles/:roleId (URL only, no menu) | pages-v2/RoleDetail.jsx |  |  |  | PTI | - | - | 1 pages | 2 pages | - |
| /glossary | pages-v2/Glossary.jsx | Help & glossary | Avatar menu | All | Both | - | - | menu; 0 pages | 1 pages | - |
| /supplier/home | pages-v2/SupplierHome.jsx | To do | Home | Supplier | Supplier | ASN, Alert, Call-off, Capacity, Compliance document, Forecast commitment, Forecast version, Goods receipt, Invoice, Purchase order, RFI, RFP, RFQ, Stock | - | menu; 1 pages | 14 pages | UC7 all |
| /supplier/dashboard (URL only, no menu), no inbound link | pages-v2/SupplierDashboard/index.jsx |  |  |  | Supplier | Compliance document, Invoice, Purchase order, RFQ, Supplier | Purchase order | 0 pages | 3 pages | - |
| /supplier/storefront (URL only, no menu), no inbound link | pages-v2/SupplierMyStorefront/index.jsx |  |  |  | Supplier | Supplier | - | 0 pages | 1 pages | - |
| /supplier/documents | pages-v2/SupplierDocuments.jsx | Profile & documents | Company | Supplier | Supplier | Compliance document, Supplier | Compliance document | menu; 2 pages | 0 pages | UC5 |
| /supplier/whatsapp (URL only, no menu), no inbound link | pages-v2/SupplierWhatsApp/index.jsx |  |  |  | Supplier | - | - | 0 pages | 0 pages | - |
| /supplier/comm-hub (URL only, no menu), no inbound link | pages-v2/CommHubInbound.jsx |  |  |  | Supplier | Delivery agreement, Stock | Stock | 0 pages | 1 pages | - |
| /supplier/order-summary | pages-v2/SupplierOrderSummary.jsx | Order summary | Orders | Supplier | Supplier | ASN, Call-off, Capacity, Forecast commitment, Goods receipt, Invoice, Purchase order | - | menu; 9 pages | 16 pages | UC2 |
| /supplier/orders | pages-v2/SupplierOrders.jsx | Purchase orders | Orders | Supplier | Supplier | ASN, Purchase order, Supplier | Purchase order | menu; 3 pages | 2 pages | UC2 |
| /supplier/rfi | pages-v2/SupplierRfi.jsx | RFI invitations | Sourcing | Supplier | Supplier | RFI | RFI | menu; 1 pages | 0 pages | UC1 |
| /supplier/rfq | pages-v2/SupplierRFQs/index.jsx | RFQ invitations | Sourcing | Supplier | Supplier | RFQ, Supplier | RFQ | menu; 2 pages | 1 pages | UC1 |
| /supplier/rfq/rounds (URL only, no menu) | pages-v2/SupplierNegotiations.jsx |  |  |  | Supplier | RFQ, Scorecard | RFQ | 2 pages | 0 pages | UC1 |
| /supplier/rfp | pages-v2/SupplierRfp.jsx | RFP invitations | Sourcing | Supplier | Supplier | RFP, RFQ, Scorecard | RFP | menu; 1 pages | 0 pages | UC1 |
| /supplier/forecasts | pages-v2/SupplierForecastCommitments/index.jsx | Forecast & commitments | Planning | Supplier | Supplier | Capacity, Forecast commitment, Forecast version, Purchase order, Scorecard | Forecast commitment, Forecast version | menu; 3 pages | 3 pages | UC4 UC7 |
| /supplier/demand-anticipation (URL only, no menu), no inbound link | pages-v2/SupplierDemandAnticipation.jsx |  |  |  | Supplier | Demand anticipation | - | 0 pages | 0 pages | - |
| /supplier/fs-reconcile | pages-v2/FixedStockReconcile.jsx | Feedstock reconcile | Planning | Supplier | Supplier | Max stock / feedstock | Max stock / feedstock | menu; 1 pages | 1 pages | UC6 |
| /supplier/forecasts/responses (URL only, no menu) | pages-v2/SupplierForecasts/index.jsx |  |  |  | Supplier | ASN, Forecast commitment, Forecast version, Supplier, Trade name | ASN, Forecast commitment | 1 pages | 1 pages | - |
| /supplier/shipments | pages-v2/SupplierShipments/index.jsx | Shipments & ASN | Orders | Supplier | Supplier | ASN, Call-off, Goods receipt, Purchase order, Stock, Supplier | ASN | menu; 4 pages | 1 pages | UC2 UC3 |
| /supplier/goods-receipts | pages-v2/SupplierGoodsReceipts.jsx | Goods receipts | Orders | Supplier | Supplier | ASN, Goods receipt, Purchase order | ASN | menu; 3 pages | 1 pages | UC2 |
| /supplier/invoices | pages-v2/SupplierInvoices.jsx | Invoices | Invoices | Supplier | Supplier | Goods receipt, Invoice, Purchase order, Supplier | Invoice | menu; 4 pages | 1 pages | UC2 |
| /supplier/inventory | pages-v2/SupplierInventory.jsx | Stock | Planning | Supplier | Supplier | Demand anticipation, Stock, Trade name | Max stock / feedstock, Stock, Trade name | menu; 3 pages | 0 pages | UC6 UC7 |
| /supplier/delivery-agreements (URL only, no menu) | pages-v2/SupplierDeliveryAgreements.jsx |  |  |  | Supplier | Delivery agreement | - | 1 pages | 0 pages | - |
| /supplier/call-offs | pages-v2/SupplierCallOffs.jsx | Call-offs | Orders | Supplier | Supplier | ASN, Call-off, Goods receipt, Purchase order | Call-off | menu; 3 pages | 1 pages | UC3 |
| /supplier/capacity | pages-v2/SupplierCapacity.jsx | Capacity | Planning | Supplier | Supplier | Capacity, Purchase order | Capacity | menu; 4 pages | 1 pages | UC4 UC6 UC7 |
| /supplier/performance | pages-v2/SupplierPerformance.jsx | My performance | Performance | Supplier | Supplier | ASN, Call-off, Goods receipt, Purchase order, Scorecard, Supplier | - | menu; 0 pages | 0 pages | - |

**Redirects (12):** `/` → `/buyer/home`; `/buyer/sourcing` → `/buyer/rfq`; `/buyer/sourcing/rfi` → `/buyer/rfi`; `/buyer/sourcing/rfp` → `/buyer/rfp`; `/buyer/sourcing/rfq/:rfqId` → `/buyer/rfq/:rfqId`; `/buyer/forecasts` → `/buyer/stabilise?tab=versions`; `/buyer/forecast-bias` → `/buyer/demand-forecast?tab=bias`; `/buyer/admin` → `/buyer/admin/working-calendar`; `/supplier/rfqs` → `/supplier/rfq`; `/supplier/rfqs/rfi` → `/supplier/rfi`; `/supplier/rfqs/rfp` → `/supplier/rfp`; `/supplier/rfqs/rounds` → `/supplier/rfq/rounds`.

**Counts:**

| Group | Pages |
|---|---|
| PTI main menu (distinct pages) | 29 |
| PTI avatar menu | 19 |
| Supplier menu | 16 |
| No menu item: detail pages (RFQ event, supplier profile, contract, role, storefront) | 5 |
| No menu item: standalone pages | 22 |
| No menu item and no inbound link, besides login and registration | 11 |

---

## 3. PAGE MAPS

Legend for every map: blue is a menu page, purple is an avatar-menu page, dashed orange has no menu item, and grey is a detail page. Edge labels give the trigger: `link` (in-page link), `task` (Home or To do item), `next` (the weekly-plan step strip), `back` (Back to order summary), `toast only` (a button that only shows a message).

### 3.1 PTI Home

Source: `portal-maps/page-map-home-pti.mmd`

![Page map: PTI Home (My tasks and Supplier replies)](portal-maps/svg/page-map-home-pti.svg)

My tasks reaches 15 pages. Requisitions, Compliance, RFI and RFP get no task at all.

### 3.2 Supplier Home

Source: `portal-maps/page-map-home-supplier.mmd`

![Page map: supplier Home (To do)](portal-maps/svg/page-map-home-supplier.svg)

To do reaches 13 of the other 15 supplier menu pages, plus Revised quotes. Feedstock reconcile and My performance get no task. Its documents task counts only expired or expiring certificates (`pages-v2/SupplierHome.jsx:101-104`).

### 3.3 Order collaboration and supplier Orders

Source: `portal-maps/page-map-order-collaboration.mmd`

![Page map: Order collaboration (PTI) and Orders (supplier)](portal-maps/svg/page-map-order-collaboration.svg)

Order summary is the only page that links forward. Every other order page links only back to it, and only when the user came from it (`pages-v2/orders/PoDrillFilter.jsx:104,138`).

### 3.4 Weekly plan and Review

Source: `portal-maps/page-map-weekly-plan.mmd`

![Page map: Weekly plan and Review (PTI · Material Planner)](portal-maps/svg/page-map-weekly-plan.svg)

The step strip leaves Weekly plan twice. Supplier responses goes next to Supplier performance (Review), and Feedstock reconcile loops back to What to order (`components/forecast/forecastPages.js:99-120`).

### 3.5 Inventory & capacity, Materials and Call-offs

Source: `portal-maps/page-map-inventory-capacity.mmd`

![Page map: Inventory & capacity, Materials and Call-offs (PTI) with supplier Planning](portal-maps/svg/page-map-inventory-capacity.svg)

Alerts is the only page here that links out to where the action is taken. Stock simulation is the only menu path to Purchase Requisitions (`pages-v2/BuyerStockSimulation.jsx:148`).

### 3.6 Sourcing

Source: `portal-maps/page-map-sourcing.mmd`

![Page map: Sourcing (PTI · Buyer) and Sourcing (supplier)](portal-maps/svg/page-map-sourcing.svg)

Purchase Requisitions is reached only through Stock simulation or an RFQ's source chip (`pages-v2/rfx/rfqSources.jsx:122`). Revised quotes has no menu item.

### 3.7 Invoices, Review, Performance and Audit, and supplier Company

Source: `portal-maps/page-map-invoices-performance.mmd`

![Page map: Invoices, Review/Performance/Audit (PTI) and Invoices, Performance, Company (supplier)](portal-maps/svg/page-map-invoices-performance.svg)

Compliance Tracker's only inbound link is on Procurement Command Center, which itself has no menu item (`pages-v2/widgets/BuyerComplianceWidget.jsx:102`).

### 3.8 Help & administration

Source: `portal-maps/page-map-help-admin.mmd`

![Page map: Help & administration (avatar menu, PTI)](portal-maps/svg/page-map-help-admin.svg)

19 items in one flat avatar list. This week links to Data health. The other planning-engine pages connect only through the step strip.

### 3.9 PTI pages with no menu item

Source: `portal-maps/page-map-url-only-pti.mmd`

![Page map: PTI pages with no menu item](portal-maps/svg/page-map-url-only-pti.svg)

6 PTI pages have neither a menu item nor any inbound link. On screen they still name sections the menu no longer has: ACQUIRE, INTELLIGENCE, SETTLE and DASHBOARDS.

### 3.10 Supplier pages with no menu item

Source: `portal-maps/page-map-url-only-supplier.mmd`

![Page map: supplier pages with no menu item](portal-maps/svg/page-map-url-only-supplier.svg)

5 supplier pages are unreachable without the URL. Channel Inbox, for example, asks the supplier to record a stock reply, which UC6 gives to PTI.

---

## 4. DATA MAPS

### 4.1 Page by object matrix

R = reads, W = writes, RW = both. The column names are short: PO purchase order, GR goods receipt, DA-agr delivery agreement, PR requisition, FcVer forecast version, FcCom forecast commitment, DemAnt demand anticipation, OrdPlan order plan and warehouse decisions, MaxStk max stock and feedstock confirmation, Engine planning-engine output, Doc compliance document, TName trade name, Score scorecard and update compliance, Set admin settings. Settings is shown here but gets no data map, because it is reference data rather than one object. Planning groups used only as a filter are not counted.

| Page | PO | ASN | GR | Invoice | Call-off | DA-agr | PR | RFI | RFQ | RFP | FcVer | FcCom | DemAnt | OrdPlan | Stock | MaxStk | Capacity | Alert | Engine | Supplier | Doc | TName | Score | Chase | Set |
|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|
| My tasks `/buyer/home` | R | R | R | R | R |  | R |  | R |  |  | R | R |  |  |  | R | R | R |  |  |  |  | R |  |
| /buyer/dashboard `/buyer/dashboard` | R | R | R | R |  |  |  |  | R |  |  |  |  |  | R |  | R | R |  | R | R |  |  |  |  |
| Suppliers `/buyer/suppliers` |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  | R | R |  |  |  |  |
| /buyer/suppliers/:id `/buyer/suppliers/:id` | R |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  | R |  |  |  |  |  |
| /marketplace `/marketplace` |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  | R |  |  |  |  |  |
| /marketplace/supplier/:id `/marketplace/supplier/:id` |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  | R |  |  |  |  |  |
| Order summary `/buyer/order-summary` | R | R | R | R | R |  |  |  |  |  |  | R |  |  |  |  | R |  |  |  |  |  |  |  |  |
| Purchase orders `/buyer/orders` | RW | R |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  | R |  |  |  |  |  |
| RFI `/buyer/rfi` |  |  |  |  |  |  |  | RW |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |
| RFQ `/buyer/rfq` |  |  |  |  |  |  | R | R | RW | R |  |  |  |  |  |  |  |  |  | R |  |  | R |  |  |
| /buyer/rfq/:rfqId `/buyer/rfq/:rfqId` |  |  |  |  |  |  | R | R | RW | R |  |  |  |  |  |  |  |  |  | R |  |  | R |  |  |
| RFP `/buyer/rfp` |  |  |  |  |  |  | R | R | R | RW |  |  |  |  |  |  |  |  |  |  |  |  | R |  |  |
| /buyer/intake-review `/buyer/intake-review` |  |  |  |  |  |  | RW |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |
| /buyer/plan-grid `/buyer/plan-grid` |  |  |  |  |  |  | W |  | R |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |
| Supplier responses `/buyer/collaboration` | R |  |  |  |  |  |  |  |  |  | RW | RW |  |  | R |  | R |  |  |  |  |  |  | R |  |
| Feedstock reconcile `/buyer/fs-reconcile` |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  | RW |  |  |  |  |  |  |  |  |  |
| Planning engine · Supplier reliability `/buyer/reliability` |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  | R |  |  |
| Planning engine · Material requirement `/buyer/material-requirement` |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  | R |  |  |  |  |  |  |
| Planning engine · Safety stock targets `/buyer/safety-stock` |  |  |  |  |  |  |  |  |  |  |  |  | W |  |  |  |  |  | R |  |  |  |  |  |  |
| This week `/buyer/this-week` |  |  |  |  |  |  |  |  |  |  | R | R |  | R |  |  |  |  | R |  |  |  |  |  |  |
| What to order `/buyer/order-plan` | R | R | R |  | RW |  | R |  |  |  |  |  | R | R |  |  |  |  |  |  |  |  |  |  |  |
| Make warehouse room `/buyer/reschedule` |  |  |  |  | W |  |  |  |  |  |  |  |  | RW |  |  |  |  |  |  |  |  |  |  |  |
| Demand anticipation `/buyer/demand-anticipation` |  |  |  |  |  |  |  |  |  |  |  |  | RW |  |  |  |  |  |  |  |  |  |  |  |  |
| Demand anticipation history `/buyer/demand-anticipation-history` |  |  |  |  |  |  |  |  |  |  |  |  | R |  |  |  |  |  |  |  |  |  |  |  |  |
| What-if sandbox `/buyer/what-if` |  |  |  |  |  |  |  |  |  |  |  |  |  | RW |  |  |  |  |  |  |  |  |  |  |  |
| Publish to suppliers `/buyer/stabilise` |  |  |  |  |  |  |  |  |  |  | RW |  |  | R |  |  |  |  | R |  |  |  |  |  |  |
| Planning engine · Data health `/buyer/data-health` |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  | R |  |  |  |  |  |  |
| Forecast quality `/buyer/demand-forecast` |  |  |  |  |  |  |  |  |  |  | W |  |  |  |  |  |  |  | R |  |  |  |  |  |  |
| Planning engine · Model backtest `/buyer/model-backtest` |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  | R |  |  |  |  |  |  |
| /buyer/collaboration/responses `/buyer/collaboration/responses` |  |  |  |  |  |  |  |  |  |  |  | W |  |  |  |  |  |  |  | R |  |  |  | R |  |
| /buyer/contracts `/buyer/contracts` | R |  |  |  |  | R |  |  |  |  |  |  |  |  |  |  |  |  |  | R |  |  |  |  |  |
| /buyer/contracts/:id `/buyer/contracts/:id` | R |  |  |  | R | RW |  |  |  |  |  |  |  |  |  |  |  |  |  | R |  |  |  |  |  |
| /buyer/delivery-agreements `/buyer/delivery-agreements` |  |  |  |  |  | R |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |
| Call-offs `/buyer/call-offs` | R | R | R |  | RW |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |
| /buyer/chase `/buyer/chase` |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  | R |  |  |  | R |  |
| Inventory `/buyer/inventory` |  |  |  |  |  |  |  |  |  |  |  |  |  |  | RW |  |  |  |  |  |  |  |  |  |  |
| Stock simulation `/buyer/stock-simulation` |  |  |  |  |  |  |  |  |  |  |  |  |  |  | RW |  |  |  |  |  |  |  |  |  |  |
| Capacity `/buyer/capacity` | R |  |  |  |  |  |  |  |  |  |  | R | R |  |  |  | R |  |  |  |  |  |  |  |  |
| Alerts `/buyer/alerts` |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  | RW |  |  |  |  |  |  |  |
| Supplier access `/buyer/supplier-access` |  |  |  |  |  |  |  |  |  |  |  |  |  |  | RW |  |  |  |  |  |  |  |  |  |  |
| Shipments & ASN `/buyer/shipments` | R | RW | R |  | R |  |  |  |  |  |  |  |  |  |  |  |  |  |  | R |  |  |  |  |  |
| Goods receipts `/buyer/goods-receipt` | R | RW | RW |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  | R | R |  |  | R |  |
| /buyer/discovery `/buyer/discovery` |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  | R |  |  |  |  |  |
| /buyer/purchase-requisition `/buyer/purchase-requisition` |  |  |  |  |  |  | RW |  |  |  |  |  |  |  |  |  |  |  |  | R |  |  |  |  |  |
| /buyer/supplier-applications `/buyer/supplier-applications` |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  | RW |  |  |  |  |  |
| Invoices `/buyer/invoices` | R |  | R | RW |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |
| Supplier performance `/buyer/scorecard` | R | R | R |  | R |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  | R |  |  |
| /buyer/analytics `/buyer/analytics` | R | R | R |  | R |  |  |  |  |  |  |  |  |  |  |  |  |  |  | R |  |  | R |  |  |
| /buyer/risk `/buyer/risk` |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  | R |  |  | R |  |  |  |  |
| Supplier replies `/buyer/comm-hub` |  |  |  |  |  |  |  |  |  |  |  |  |  |  | RW |  |  |  |  | R |  |  |  | R |  |
| /buyer/compliance `/buyer/compliance` |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  | R | RW |  |  |  |  |
| Process flows `/buyer/process-flows` |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |
| Interface monitor `/buyer/interface-monitor` | R | R | RW | R |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |
| Working calendar `/buyer/admin/working-calendar` |  |  |  |  |  |  |  |  |  |  | R |  |  |  |  |  |  |  |  |  |  |  |  |  | W |
| 3PL tracking links `/buyer/admin/3pl-tracking` |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  | W |
| Supplier stock update mode `/buyer/admin/suppliers` |  |  |  |  |  |  |  |  |  |  |  |  |  |  | RW |  |  |  |  |  |  |  |  |  |  |
| Vendor qualification `/buyer/admin/qualification` |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  | RW | R |  |  |  |  |
| Sourcing types `/buyer/admin/sourcing-types` |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  | W |
| Planning groups `/buyer/admin/planning-groups` |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  | W |  |  |  |  |  |  |  |  |
| MRP controllers (PIC) `/buyer/admin/mrp-controllers` |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  | W |
| Trade names `/buyer/materials/trade-names` |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  | RW |  |  |  |
| Tolerances and rule values `/buyer/admin/tolerances` |  |  |  |  |  |  |  |  |  |  |  |  |  |  | R |  |  |  |  |  |  |  |  |  | W |
| Alert thresholds and stale periods `/buyer/admin/alert-thresholds` |  |  |  |  |  |  |  |  |  |  |  |  |  |  | R |  |  |  |  |  |  |  |  |  | W |
| Reason codes `/buyer/admin/reason-codes` |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  | W |
| Roles `/buyer/roles` |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  | W |
| /buyer/roles/:roleId `/buyer/roles/:roleId` |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |
| Help & glossary `/glossary` |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |
| To do `/supplier/home` | R | R | R | R | R |  |  | R | R | R | R | R |  |  | R |  | R | R |  |  | R |  |  |  |  |
| /supplier/dashboard `/supplier/dashboard` | RW |  |  | R |  |  |  |  | R |  |  |  |  |  |  |  |  |  |  | R | R |  |  |  |  |
| /supplier/storefront `/supplier/storefront` |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  | R |  |  |  |  |  |
| Profile & documents `/supplier/documents` |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  | R | RW |  |  |  |  |
| /supplier/whatsapp `/supplier/whatsapp` |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |
| /supplier/comm-hub `/supplier/comm-hub` |  |  |  |  |  | R |  |  |  |  |  |  |  |  | RW |  |  |  |  |  |  |  |  |  |  |
| Order summary `/supplier/order-summary` | R | R | R | R | R |  |  |  |  |  |  | R |  |  |  |  | R |  |  |  |  |  |  |  |  |
| Purchase orders `/supplier/orders` | RW | R |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  | R |  |  |  |  |  |
| RFI invitations `/supplier/rfi` |  |  |  |  |  |  |  | RW |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |
| RFQ invitations `/supplier/rfq` |  |  |  |  |  |  |  |  | RW |  |  |  |  |  |  |  |  |  |  | R |  |  |  |  |  |
| /supplier/rfq/rounds `/supplier/rfq/rounds` |  |  |  |  |  |  |  |  | RW |  |  |  |  |  |  |  |  |  |  |  |  |  | R |  |  |
| RFP invitations `/supplier/rfp` |  |  |  |  |  |  |  |  | R | RW |  |  |  |  |  |  |  |  |  |  |  |  | R |  |  |
| Forecast & commitments `/supplier/forecasts` | R |  |  |  |  |  |  |  |  |  | RW | RW |  |  |  |  | R |  |  |  |  |  | R |  |  |
| /supplier/demand-anticipation `/supplier/demand-anticipation` |  |  |  |  |  |  |  |  |  |  |  |  | R |  |  |  |  |  |  |  |  |  |  |  |  |
| Feedstock reconcile `/supplier/fs-reconcile` |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  | RW |  |  |  |  |  |  |  |  |  |
| /supplier/forecasts/responses `/supplier/forecasts/responses` |  | RW |  |  |  |  |  |  |  |  | R | RW |  |  |  |  |  |  |  | R |  | R |  |  |  |
| Shipments & ASN `/supplier/shipments` | R | RW | R |  | R |  |  |  |  |  |  |  |  |  | R |  |  |  |  | R |  |  |  |  |  |
| Goods receipts `/supplier/goods-receipts` | R | RW | R |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |
| Invoices `/supplier/invoices` | R |  | R | RW |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  | R |  |  |  |  |  |
| Stock `/supplier/inventory` |  |  |  |  |  |  |  |  |  |  |  |  | R |  | RW | W |  |  |  |  |  | RW |  |  |  |
| /supplier/delivery-agreements `/supplier/delivery-agreements` |  |  |  |  |  | R |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |
| Call-offs `/supplier/call-offs` | R | R | R |  | RW |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |
| Capacity `/supplier/capacity` | R |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  | RW |  |  |  |  |  |  |  |  |
| My performance `/supplier/performance` | R | R | R |  | R |  |  |  |  |  |  |  |  |  |  |  |  |  |  | R |  |  | R |  |  |

### 4.2 Data maps per object

Writers are on the left, the object and its states in the middle, and readers on the right. Objects read by more than 24 pages are split by persona.

#### Purchase order (PTI)
Source: `portal-maps/data-map-purchase-order-pti.mmd`

![Data map · Purchase order (PTI)](portal-maps/svg/data-map-purchase-order-pti.svg)
A supplier's confirm, adjust or reject changes 16 PTI pages. Only 4 My tasks items signal it (escalated, rejected, counter-offers, completion moved), and all 4 open Purchase orders.

#### Purchase order (supplier)
Source: `portal-maps/data-map-purchase-order-supplier.mmd`

![Data map · Purchase order (supplier)](portal-maps/svg/data-map-purchase-order-supplier.svg)
POs arrive from SAP. To do "Purchase orders to respond to" is the supplier's one signal. The 8 other supplier pages that show the PO are found from the menu.

#### ASN
Source: `portal-maps/data-map-asn.mmd`

![Data map · ASN](portal-maps/svg/data-map-asn.svg)
A discrepancy resolved on PTI Goods receipts changes the supplier's ASN. The supplier hears of it only through To do "Receipt discrepancies to acknowledge or dispute".

#### Goods receipt
Source: `portal-maps/data-map-goods-receipt.mmd`

![Data map · Goods receipt](portal-maps/svg/data-map-goods-receipt.svg)
Posting a receipt changes the invoice match Finance works on. Finance gets no My tasks item for it, only "Overdue supplier invoices" later.

#### Invoice
Source: `portal-maps/data-map-invoice.mmd`

![Data map · Invoice](portal-maps/svg/data-map-invoice.svg)
Written only on the 2 Invoices pages. A PTI dispute shows the supplier "Returned" with a To do item. A release shows nothing, beyond the invoice leaving "Invoices awaiting payment".

#### Call-off
Source: `portal-maps/data-map-call-off.mmd`

![Data map · Call-off](portal-maps/svg/data-map-call-off.svg)
What to order and Make warehouse room create and change call-offs, but neither links to Call-offs. The planner checks the result through the menu (IA-B13).

#### Delivery agreement
Source: `portal-maps/data-map-delivery-agreement.mmd`

![Data map · Delivery agreement](portal-maps/svg/data-map-delivery-agreement.svg)
Only pages with no menu item read delivery agreements, so the agreement that call-offs draw down is visible from no menu page.

#### Requisition
Source: `portal-maps/data-map-requisition.mmd`

![Data map · Requisition](portal-maps/svg/data-map-requisition.svg)
All 3 writing pages have no menu item. A requisition waiting for approval appears on no My tasks item (IA-B01).

#### RFI
Source: `portal-maps/data-map-rfi.mmd`

![Data map · RFI](portal-maps/svg/data-map-rfi.svg)
A supplier's answer changes the buyer's RFI page with no My tasks item. The buyer finds it from the menu.

#### RFQ
Source: `portal-maps/data-map-rfq.mmd`

![Data map · RFQ](portal-maps/svg/data-map-rfq.svg)
Home counts 16 RFQs as "ready to award". The RFQ board's own tile says 4 (IA-B03).

#### RFP
Source: `portal-maps/data-map-rfp.mmd`

![Data map · RFP](portal-maps/svg/data-map-rfp.svg)
Like RFI, a proposal received raises no My tasks item.

#### Forecast version
Source: `portal-maps/data-map-forecast-version.mmd`

![Data map · Forecast version](portal-maps/svg/data-map-forecast-version.svg)
Publish to suppliers refuses on sample data. Versions reach the supplier through To do "New forecast version to review".

#### Forecast commitment
Source: `portal-maps/data-map-forecast-commitment.mmd`

![Data map · Forecast commitment](portal-maps/svg/data-map-forecast-commitment.svg)
2 of the 4 writing pages have no menu item. They show a different plan (PV-2026-08.2) from the menu pages (IA-B05, IA-S03).

#### Demand anticipation
Source: `portal-maps/data-map-demand-anticipation.mmd`

![Data map · Demand anticipation](portal-maps/svg/data-map-demand-anticipation.svg)
The supplier page exists but reads "Not available yet" until DRC-D17's confirmation step. Planners' changes have no supplier reader today.

#### Order plan
Source: `portal-maps/data-map-order-plan.mmd`

![Data map · Order plan](portal-maps/svg/data-map-order-plan.svg)
Decisions recorded on Make warehouse room feed What to order and Publish to suppliers. Only the step strip connects the 3 pages.

#### Stock
Source: `portal-maps/data-map-stock.mmd`

![Data map · Stock](portal-maps/svg/data-map-stock.svg)
7 pages on both sides write stock. A figure PTI records from a message shows on the supplier's Stock as "Recorded by Paragon from {channel}" (SCENARIOS UC6 step 3).

#### Max stock and feedstock confirmation
Source: `portal-maps/data-map-max-stock-feedstock.mmd`

![Data map · Max stock / feedstock](portal-maps/svg/data-map-max-stock-feedstock.svg)
The Procurement role sets max stock, from its own menu under Performance. The planner reads the same page under Review, and the supplier on its own Feedstock reconcile.

#### Capacity
Source: `portal-maps/data-map-capacity.mmd`

![Data map · Capacity](portal-maps/svg/data-map-capacity.svg)
The supplier writes capacity, and PTI Capacity is read-only. A missing capacity blocks the supplier's commitment submit, and that page links to Capacity.

#### Alert
Source: `portal-maps/data-map-alert.mmd`

![Data map · Alert](portal-maps/svg/data-map-alert.svg)
Alerts are computed live from stock, capacity, commitments and call-offs. A closed alert comes back as a new one when its condition clears and returns (SCENARIOS UC7).

#### Engine output
Source: `portal-maps/data-map-engine-output.mmd`

![Data map · Engine output](portal-maps/svg/data-map-engine-output.svg)
No page writes engine output. 8 pages read it, 4 of them in the avatar menu.

#### Supplier (PTI)
Source: `portal-maps/data-map-supplier-pti.mmd`

![Data map · Supplier (PTI)](portal-maps/svg/data-map-supplier-pti.svg)
19 PTI pages read supplier master data. Both writers sit outside the main menu: Supplier Applications has no menu item, and Vendor qualification is in the avatar menu.

#### Supplier (supplier)
Source: `portal-maps/data-map-supplier-supplier.mmd`

![Data map · Supplier (supplier)](portal-maps/svg/data-map-supplier-supplier.svg)
No supplier page writes the supplier's own record. "Contact your administrator" is the only route.

#### Compliance document
Source: `portal-maps/data-map-compliance-document.mmd`

![Data map · Compliance document](portal-maps/svg/data-map-compliance-document.svg)
A request made on Compliance Tracker reaches the supplier with no To do item. A declaration reaches PTI with no My tasks item (IA-B02, IA-S02).

#### Trade name
Source: `portal-maps/data-map-trade-name.mmd`

![Data map · Trade name](portal-maps/svg/data-map-trade-name.svg)
The supplier submits names on Stock, and PTI approves them on Trade names. The approved name then shows beside PTI's description for that supplier.

#### Scorecard and update compliance
Source: `portal-maps/data-map-scorecard.mmd`

![Data map · Scorecard](portal-maps/svg/data-map-scorecard.svg)
Update compliance, meaning stock-update timeliness, also feeds the RFQ and RFP supplier comparison. A late stock update therefore moves a sourcing score on a page that never mentions stock.

#### Chase
Source: `portal-maps/data-map-chase.mmd`

![Data map · Chase](portal-maps/svg/data-map-chase.svg)
2 PTI pages show the same chase list: Supplier replies and Chase (IA-B04).

---

## 5. USE-CASE SWIMLANES

### UC1 Sourcing: requisition, RFI, RFQ, RFP, award
Source: `portal-maps/swimlane-uc1.mmd`

![UC1 Sourcing · requisition to RFQ award (positive path)](portal-maps/svg/swimlane-uc1.svg)

### UC2 Purchase order to payment
Source: `portal-maps/swimlane-uc2.mmd`

![UC2 Purchase order to payment (positive path)](portal-maps/svg/swimlane-uc2.svg)

### UC3 Call-offs against agreements
Source: `portal-maps/swimlane-uc3.mmd`

![UC3 Call-offs against agreements (positive path)](portal-maps/svg/swimlane-uc3.svg)

### UC4 Forecast collaboration
Source: `portal-maps/swimlane-uc4.mmd`

![UC4 Forecast collaboration (positive path)](portal-maps/svg/swimlane-uc4.svg)

### UC5 Compliance documents
Source: `portal-maps/swimlane-uc5.mmd`

![UC5 Compliance documents (positive path)](portal-maps/svg/swimlane-uc5.svg)

### UC6 Shared stock, capacity and supplier replies
Source: `portal-maps/swimlane-uc6.mmd`

![UC6 Shared stock, capacity and supplier replies (positive path)](portal-maps/svg/swimlane-uc6.svg)

### UC7 Inventory and capacity alerts
Source: `portal-maps/swimlane-uc7.mmd`

![UC7 Inventory and capacity alerts (positive path)](portal-maps/svg/swimlane-uc7.svg)

### 5.1 Use-case metrics

A "lookup" is a step whose page the user must find through the menu or by typing the URL, rather than from a task or a link.

| UC | Pages visited | Sections crossed | Role or persona switches | Lookups | Step that slows a first-time user most |
|---|---|---|---|---|---|
| UC1 | 5 | 3, plus 1 page outside the menu | 6 | 5 (2 URL, 3 menu) | Steps 1 and 2: Purchase Requisitions has no menu item and no approval task |
| UC2 | 6 | 4 | 3 | 3 (menu) | Step 3: Create ASN on the PO shows only a toast that names a page that does not exist |
| UC3 | 3 | 2 | 1 | 2 (menu) | Step 4: no link from the dispatched call-off to its ASN |
| UC4 | 3 | 2 | 3 | 0 | Step 5: Supplier responses also links to a second commitments page with other figures |
| UC5 | 2 | 1, plus 1 page outside the menu | 2 | 3 (2 URL, 1 menu) | Steps 1 and 3: Compliance Tracker is URL only, and To do never shows the request |
| UC6 | 7 | 4 | 2 | 3 (menu) | Step 3: the Supplier replies menu item opens a page titled "Communication Hub" |
| UC7 | 5 | 4 | 3 | 1 (menu) | Step 4: after acting on the linked page, the user returns to Alerts by the menu to close the alert |

---

## 6. FINDINGS

Severity is Blocker, Major, Minor or Polish, as defined in the prompt. Confidence is high when code and screen agree, and medium when one of them is inferred. Findings already reported in the forecast evaluation (FUX) or the RFx evaluation name that ID.

### 6.1 Buyer

- **IA-B01** · Blocker · high · Flow continuity · Purchase Requisitions
  - Evidence: no entry in `components/layout-v2/navConfig.js:86-229`. Inbound only from `pages-v2/BuyerStockSimulation.jsx:148` and `pages-v2/rfx/rfqSources.jsx:122`. My tasks has no requisition item (`pages-v2/BuyerHome.jsx:141-372`). The screen header reads "ACQUIRE · REQUISITIONS".
  - Problem: UC1 steps 1 and 2 (create, approve) start here. A requisitioner or approver reaches the page only by URL.
  - Recommendation: add Requisitions under Sourcing, plus a My tasks item "Requisitions to approve" that opens the record (P-03).
- **IA-B02** · Blocker · high · Flow continuity · Compliance Tracker
  - Evidence: no menu entry. The only inbound link is in `pages-v2/widgets/BuyerComplianceWidget.jsx:102`, on Procurement Command Center, which also has no menu item. My tasks has no document item.
  - Problem: UC5 steps 1 and 3 (ask for a document, confirm it) cannot be reached without the URL.
  - Recommendation: add Supplier documents under Sourcing and a My tasks item "Declared certificates to review" (P-03).
- **IA-B03** · Major · high · Data visibility · My tasks, RFQ
  - Evidence: My tasks shows "16 Sourcing events ready to award". The RFQ board's tile shows "READY TO AWARD 4" and its tab "Pending Award 4" (screen). The code comment at `pages-v2/BuyerHome.jsx:350-353` says the predicate differs and links unfiltered.
  - Problem: the buyer opens the task, sees 4, and cannot find the other 12.
  - Recommendation: count with the board's predicate, or add a board tab that matches the task, and link to it (P-08).
- **IA-B04** · Major · high · Page overlap · Supplier replies, Chase
  - Evidence: both read the derived chase list (inventory). My tasks "Suppliers to follow up on forecasts or deliveries" opens Chase (`pages-v2/BuyerHome.jsx:296-301`), whose header reads "SETTLE · CHASE". Chase links on to the Supplier replies page (`pages-v2/BuyerChase.jsx:174`), whose title is "Communication Hub".
  - Problem: there are 2 pages, 3 names and a section the menu doesn't have, all for one follow-up job.
  - Recommendation: merge them into one Home page, Supplier follow-ups (P-05).
- **IA-B05** · Major · medium · Page overlap, data visibility · Supplier responses, Supplier Collaboration
  - Evidence: `pages-v2/BuyerCommitments/components/CommitmentFilters.jsx:98` links to `/buyer/collaboration/responses`. That page shows "7 published lines · 3 suppliers · plan PV-2026-08.2". Supplier responses shows "Exceptions (6)" (screen).
  - Problem: commitments appear twice, from 2 stores, with different figures and no menu item for the second.
  - Recommendation: keep one commitments page (P-04).
- **IA-B06** · Major · high · Page internal complexity · What to order, Make warehouse room, Call-offs, Demand anticipation
  - Evidence: rendered heights are 15,266 px, 14,432 px, 7,704 px (12 tables) and 6,929 px (6 tables wider than the content area), measured on screen. FUX F-07 is still visible for the first 2 pages. Call-offs and Demand anticipation are new.
  - Problem: the action sits several screens down.
  - Recommendation: split each page into tabs with the decision first (P-12).
- **IA-B07** · Minor · high · Menu structure · All PTI roles
  - Evidence: 11 sections and 32 entries for 29 pages. Supplier performance, Feedstock reconcile and Demand anticipation history each appear twice (`navConfig.js:135-226`). Materials, Call-offs, Invoices and Audit hold 1 item each.
  - Problem: a scan of the menu finds the same page under 2 names of section.
  - Recommendation: fold the single-item sections. Keep the per-role placement that RFx F-11 and DRC-D18 decided (P-09).
- **IA-B08** · Minor · high · Flow continuity · My tasks
  - Evidence: 7 task items open an unfiltered list: `pages-v2/BuyerHome.jsx:172,301,310,320,331,343,354`. SC-01 says each task opens the record.
  - Problem: the user re-finds the item in a list of 18 to 33 rows.
  - Recommendation: open the filtered view, or the record when the count is 1 (P-08).
- **IA-B09** · Minor · medium · Page overlap · Inventory, Stock simulation
  - Evidence: both read supplier stock per material. Stock simulation shows it on a check date, with 70 buttons and 4 filters (screen).
  - Problem: there are 2 pages for "how much stock does this supplier have", and you choose by date.
  - Recommendation: make the check date a control on Inventory (P-06).
- **IA-B10** · Minor · medium · Menu structure · Weekly plan
  - Evidence: 7 items, but the step strip covers 5 ("Weekly plan, step 1 of 5", screen). Demand anticipation and What-if sandbox sit in the list. The strip's Next after Supplier responses is Supplier performance (`components/forecast/forecastPages.js:99-104`).
  - Problem: steps and tools are mixed, and the cycle's last Next leaves the section.
  - Recommendation: move What-if to a row action, and end the strip back at This week (P-07).
- **IA-B11** · Minor · high · Naming · 9 PTI pages
  - Evidence: menu label against page title. Supplier replies is "Communication Hub". Goods receipts is "Goods Receipt & Quality Control". RFI, RFQ and RFP are "Information requests", "Quotation requests" and "Proposal requests". Suppliers is "Supplier Directory". Invoices is "Invoices & Payment". Trade names is "Supplier trade names". Purchase orders is "Purchase Orders" (screen).
  - Problem: the user clicks one name and lands on another.
  - Recommendation: make the title equal the menu label (P-11). The RFx X-01 finding covers the 3 RFx pages.
- **IA-B12** · Minor · high · Orientation · 22 pages with no menu item
  - Evidence: headers on screen read "ACQUIRE · REQUISITIONS", "INTELLIGENCE · COMPLIANCE TRACKER", "SETTLE · CHASE", and "DASHBOARDS · PROCUREMENT COMMAND CENTER". No menu item is highlighted on these pages (NV-03, NV-05).
  - Problem: a user arriving from a task or link cannot tell where they are in the menu.
  - Recommendation: give each kept page a menu home and retire the rest (P-03, P-10).
- **IA-B13** · Minor · medium · Data visibility · What to order, Make warehouse room
  - Evidence: both write call-offs (inventory). Neither page's code has a route to `/buyer/call-offs`.
  - Problem: after "Create draft call-off", the planner finds the draft through the menu.
  - Recommendation: link the confirmation to the call-off (P-01).
### 6.2 Supplier

- **IA-S01** · Major · high · Flow continuity · Purchase orders, Shipments & ASN
  - Evidence: Create ASN on the PO only shows a toast (`pages-v2/SupplierOrders.jsx:551-560`). The toast reads "Open My Shipments & ASN to create it there." (`lib/i18n/supplierOrders.js:126`). No page has that name.
  - Problem: UC2 step 3 is a detour. The supplier opens the menu and finds the PO again.
  - Recommendation: open the ASN form for that PO (P-01).
- **IA-S02** · Major · high · Flow continuity · To do, Profile & documents
  - Evidence: To do counts only expired or expiring certificates (`pages-v2/SupplierHome.jsx:101-104,373-393`). No item covers a document PTI asked for (Awaiting Upload).
  - Problem: UC5 step 2 depends on the supplier opening Profile & documents unprompted.
  - Recommendation: add a To do item "Documents PTI asked for" (P-03).
- **IA-S03** · Major · medium · Page overlap, data visibility · Forecast & commitments, Forecast Commitments
  - Evidence: `pages-v2/SupplierForecastCommitments/index.jsx:302` links to `/supplier/forecasts/responses`. It shows "3 published line(s) · 1 response(s) · plan PV-2026-08.2", while the menu page shows "Periods waiting for your commitment: 24" (screen).
  - Problem: there are 2 places to commit, with different figures.
  - Recommendation: keep one page (P-04).
- **IA-S04** · Minor · high · Flow continuity · Call-offs
  - Evidence: supplier Call-offs links only back to Order summary (inventory). UC3 step 4 needs Shipments & ASN.
  - Problem: the supplier opens the menu after the dispatch notice.
  - Recommendation: add "Create the ASN for this call-off" (P-01).
- **IA-S05** · Minor · high · Naming · 7 supplier pages
  - Evidence: Purchase orders is "My Orders". Invoices is "My Invoices". Profile & documents is "My Documents". My performance is "My Performance". RFI, RFQ and RFP invitations are "Information requests", "Quotation requests" and "Proposal requests" (screen).
  - Problem: the same mismatch as IA-B11.
  - Recommendation: make the title equal the menu label (P-11). The RFx X-01 finding covers the 3 RFx pages.
- **IA-S06** · Minor · high · Menu structure · Revised quotes
  - Evidence: no menu item. It is reached from RFQ invitations and To do "Revised quote requested". The RFx S-05 finding is still visible on `main`, and RFx wave 2 addresses it.
  - Problem: a supplier who dismisses the task has to know the link on RFQ invitations.
  - Recommendation: keep as RFx S-05.
- **IA-S07** · Polish · high · Naming · Shipments & ASN
  - Evidence: the subtitle reads "Advance Ship Notices · Paragon WMS integration · EDI 856" (`lib/i18n/supplierShipments.js:30`).
  - Problem: system terms on screen, against SC-04.
  - Recommendation: describe the task instead, for example "Tell PTI what you are shipping and when."

### 6.3 Both

- **IA-X01** · Major · high · Flow continuity · Order pages on both personas
  - Evidence: PO lifecycle steps render as plain list items (`pages-v2/orders/PoCollaboration.jsx:113-123`). Shipments, Goods receipts, Invoices, Call-offs and Capacity link only "Back to order summary", and only when opened from it (`pages-v2/orders/PoDrillFilter.jsx:104,138`).
  - Problem: from a PO, the user cannot open its ASN, receipt or invoice. Each next stage is a menu lookup plus a search.
  - Recommendation: make each lifecycle step a link filtered by `?po=` (P-01), and make Order summary the default view of Purchase orders (P-02).
- **IA-X02** · Minor · high · Naming · Inventory and Stock, Supplier responses and Forecast & commitments
  - Evidence: English uses different names for the same object on each persona. Indonesian already uses "Stok" for both (`lib/i18n/hub.js`). Requirements 3.7 says item names are the same "wherever the object is the same".
  - Problem: a planner and a supplier on the phone name different pages.
  - Recommendation: use one name per object (P-11).
- **IA-X03** · Minor · medium · Page overlap · 22 standalone pages with no menu item
  - Evidence: 11 have no inbound link besides login and registration. Examples are Procurement Command Center, Analytics, Supplier Discovery, Plan Grid, supplier Channel Demo and My Catalog (inventory, screen). Several show illustrative KPIs.
  - Problem: a bookmark or old link lands a user on a page that contradicts the menu pages.
  - Recommendation: OPEN QUESTIONS 3 (P-10).
- **IA-X04** · Polish · high · Naming · documentation
  - Evidence: requirements 3.7 still lists a "Forecast" section with "Fixed stock reconcile". SCENARIOS section 3 calls the page "End-of-cycle stock check". The menu shows "Weekly plan", "Review" and "Feedstock reconcile".
  - Problem: the user guide and the requirements describe a menu that no longer exists.
  - Recommendation: update both documents after Levi picks the target map.

---

## 7. MERGE AND SIMPLIFY PROPOSALS

- **P-01 · Records link to their next step** · answers IA-X01, IA-S01, IA-S04, IA-B13 · confidence high · size M
  - Pages: Purchase orders, Shipments & ASN, Goods receipts, Invoices and Call-offs, on both personas. Nothing merges.
  - Change: each PO lifecycle step becomes a link to the stage page filtered by `?po=`. All 5 pages already read that parameter through `PoDrillFilter`. Supplier Create ASN and the call-off's dispatch open the ASN form for that PO.
  - Layout: unchanged. The step chips gain links.
  - Objects: no new reads or writes.
  - What a user loses: nothing.
  - Strongest reason to keep as is: the steps were built display-only on purpose, to avoid a second path into stage pages.
  - Touches: SC-02.
- **P-02 · Order summary becomes the default view of Purchase orders** · answers IA-X01, IA-B07 · confidence medium · size M
  - Result: one menu item, Purchase orders, on both personas. Call-offs moves into Order collaboration for PTI, as the supplier menu already does.
  - What each side sees: the planner and the supplier see a "Summary" view (today's Order summary) and a "List" view (today's Purchase orders).
  - Objects: reads PO, ASN, GR, invoice and call-off. Writes PO responses.
  - Layout, top to bottom: header, a view switch (Summary | List), the action banner, then the table.
  - What a user loses: a separate read-only page to bookmark.
  - Strongest reason to keep them apart: Order summary answers "is each order secured?", a different question from the PO worklist.
  - Touches: requirements 3.7 (Order collaboration items and the Call-offs section).
- **P-03 · Requisitions and Supplier documents get a menu home and a task** · answers IA-B01, IA-B02, IA-S02, IA-B12 · confidence high · size S
  - Change: Sourcing (Buyer) gains Requisitions (`/buyer/purchase-requisition`) and Supplier documents (`/buyer/compliance`, retitled).
  - Tasks: My tasks gains "Requisitions to approve" and "Declared certificates to review". To do gains "Documents PTI asked for".
  - Objects: requisition and compliance document, as today.
  - What a user loses: nothing.
  - Strongest reason to keep as is: compliance has no Menu for view, so it is unclear whose menu holds it (OPEN QUESTIONS 2).
  - Touches: NV-06, if either page is outside the MVP.
- **P-04 · One forecast-commitments page per persona** · answers IA-B05, IA-S03 · confidence medium · size M
  - Change: retire `/buyer/collaboration/responses` and `/supplier/forecasts/responses`. Their consolidation view (demand against confirmation against fulfilment) becomes a tab on the menu page.
  - Objects: forecast commitment, version and ASN (incoming shipments).
  - What a user loses: the older SDC grid view.
  - Strongest reason to keep them apart: the SDC pages may be the seam for the real backend (SDC-1b, SDC-2b in `router/AppRouter.jsx:108-115`).
  - Touches: OPEN QUESTIONS 4.
- **P-05 · Supplier follow-ups replaces Supplier replies and Chase** · answers IA-B04 · confidence high · size M
  - Result: one Home page.
  - Layout, top to bottom: "Suppliers to follow up" (today's Chase list), then "Record a reply" (today's triage), then the outbound request log.
  - Objects: reads chase, stock and supplier. Writes stock.
  - What a user loses: the short Chase page.
  - Strongest reason to keep them apart: Chase is a worklist and triage is data entry. Tabs keep both jobs on one page.
  - Touches: none.
- **P-06 · Inventory absorbs Stock simulation** · answers IA-B09 · confidence medium · size M
  - **Built differently, owner ruling 2026-10-21:** Stock simulation stays its own page and menu item until MAT-D2's review, so REQ-E08-01 BR-01 holds. Each Stock row links to it ("See estimate for a date"). The proposal below is kept as written for the record.
  - Change: Inventory gains a "Check date" control (default today). A past or future date shows the estimated stock and the override actions from Stock simulation.
  - Objects: stock and simulation override.
  - What a user loses: a page with its own filters for the estimate.
  - Strongest reason to keep them apart: simulation is an estimate and Inventory shows declared figures. Mixing them risks reading an estimate as fact, so the date control must label "Estimated".
  - Touches: MR-7, and it reverses MAT-D2 (2026-09-29: a separate Stock simulation page for the first release, revisited after 3 months), which exists to keep REQ-E08-01 BR-01 from the business users: the stock page shows "no separate available figure" (MN-INV-01). Missed when this report was first shared; see OPEN QUESTIONS 8.
- **P-07 · What-if sandbox opens from a material row** · answers IA-B10 · confidence medium · size S
  - Change: What to order and Inventory rows gain "Try a what-if". The sandbox already reads `?material=&supplier=`. Remove the menu item. The step strip's last Next returns to This week.
  - What a user loses: opening a blank sandbox from the menu.
  - Strongest reason to keep the menu item: DRC-17 asks the team to confirm defaults with the sandbox, which starts blank.
  - Touches: DRC-17.
- **P-08 · Home tasks land where the action is** · answers IA-B03, IA-B08 · confidence high · size S
  - Change: each of the 7 unfiltered tasks gets the filter that matches its count. "Ready to award" uses the board's predicate. A task with count 1 opens the record (`?open=` or `?po=`).
  - What a user loses: nothing.
  - Strongest reason to keep as is: the code comments say no single filter matches some counts. The fix is a matching tab, not a looser link.
  - Touches: SC-01.
- **P-09 · Fold single-item sections** · answers IA-B07 · confidence medium · size S
  - Change: Materials (Trade names) moves into Inventory & capacity. On the supplier side, Performance and Company merge into Company (Profile & documents, My performance).
  - Placement: Review, Performance and Audit keep their per-role placement.
  - What a user loses: section headers that match one-word jobs.
  - Strongest reason to keep them apart: NV-04 and the requirements table list each section.
  - Touches: requirements 3.7.
- **P-10 · Retire or park the 11 legacy pages with no inbound link** · answers IA-X03, IA-B12 · confidence medium · size M
  - Pages: Procurement Command Center, Analytics, Supply Risk, Supplier Discovery, Marketplace, Plan Grid, Intake Review, supplier welcome dashboard, My Catalog, Channel Demo, and Channel Inbox.
  - Kept pages: give each a menu home (P-03) or a section label from the menu.
  - Not touched: Supplier Applications and registration, which are onboarding and owned by a colleague.
  - What a user loses: demo screens.
  - Strongest reason to keep them: they serve sales demos.
  - Touches: NV-05, NV-06.
- **P-11 · One name per object** · answers IA-B11, IA-S05, IA-X02 · confidence high · size S
  - Change: each page title equals its menu label. PTI Inventory becomes Stock. Supplier responses, Forecast & commitments and the Order summary column "Foresight / fixed stock" all become "Foresight commitments" (Indonesian "Komitmen foresight"). Owner ruling, 2026-10-21: "Foresight" is the business's own word (MN-ORD-11).
  - What a user loses: the longer descriptive titles. They move into the subtitle.
  - Strongest reason to keep as is: "Inventory" is the planner's word, and a renamed menu breaks muscle memory.
  - Touches: NV-05, the FUX menu labels.
- **P-12 · Split the 4 longest pages into tabs** · answers IA-B06 · confidence high · size L
  - Tabs:
    - What to order: Orders, then Warehouse fill, then How it is sized.
    - Make warehouse room: Relief, then Fill, then Values.
    - Call-offs: To act, then All, then Blanket POs running out.
    - Demand anticipation: This week, then History link, then Record consumption.
  - What a user loses: scrolling one page for everything.
  - Strongest reason to keep them long: planners compare sections side by side.
  - Touches: FUX F-07.

---

## 8. TARGET MAP

### 8.1 Menu before and after

| View | Now: items / sections | Target: items / sections | What changes |
|---|---|---|---|
| Material Planner | 24 / 7 | 22 / 5 | Order summary folds into Purchase orders. Stock simulation stays (owner ruling). What-if becomes a row action. Call-offs and Trade names lose their own sections. Supplier replies becomes Supplier follow-ups |
| Buyer | 9 / 4 | 11 / 4 | Requisitions and Supplier documents are added. Both were reachable only by URL |
| Finance | 4 / 3 | 4 / 3 | No change |
| All PTI roles | 32 entries for 29 pages / 11 | 32 entries for 29 pages / 9 | The sums of the above. Duplicates kept per DRC-D18 and RFx F-11 |
| Supplier | 16 / 7 | 15 / 6 | Order summary folds into Purchase orders. Performance joins Company |
| Standalone pages with no menu item | 22 | 6 | 2 move into the menu, 3 merge, 11 are retired. Kept: Contracts, Delivery Overview, supplier Delivery Agreements, Supplier Applications, Revised quotes, supplier Demand anticipation |

### 8.2 Changed sections

#### PTI Home
Source: `portal-maps/target-map-home-pti.mmd`

![Target map · PTI Home (P-03, P-05, P-08)](portal-maps/svg/target-map-home-pti.svg)

#### Order collaboration and supplier Orders
Source: `portal-maps/target-map-order-collaboration.mmd`

![Target map · Order collaboration (PTI) and Orders (supplier) (P-01, P-02)](portal-maps/svg/target-map-order-collaboration.svg)

#### Sourcing
Source: `portal-maps/target-map-sourcing.mmd`

![Target map · Sourcing (PTI · Buyer) (P-03)](portal-maps/svg/target-map-sourcing.svg)

#### Weekly plan and Review
Source: `portal-maps/target-map-weekly-plan.mmd`

![Target map · Weekly plan and Review (PTI · Material Planner) (P-04, P-07, P-11)](portal-maps/svg/target-map-weekly-plan.svg)

#### Inventory & capacity
Source: `portal-maps/target-map-inventory-capacity.mmd`

![Target map · Inventory & capacity (PTI · Material Planner) (P-06, P-09)](portal-maps/svg/target-map-inventory-capacity.svg)

---

## 9. ROADMAP

| Change | Answers | Size | Kind |
|---|---|---|---|
| Home tasks filtered, ready-to-award count fixed (P-08) | IA-B03, IA-B08 | S | Quick win |
| Requisitions and Supplier documents in the menu, with tasks (P-03) | IA-B01, IA-B02, IA-S02 | S | Quick win |
| Supplier Create ASN opens the ASN form for the PO (part of P-01) | IA-S01, IA-S04 | S | Quick win |
| Page titles equal menu labels, one name per object (P-11) | IA-B11, IA-S05, IA-X02 | S | Quick win |
| Shipments subtitle without system terms | IA-S07 | S | Quick win |
| Requirements 3.7 and SCENARIOS section 3 updated | IA-X04 | S | Quick win |
| Lifecycle steps link to stage pages (rest of P-01) | IA-X01, IA-B13 | M | Larger |
| Order summary as a view of Purchase orders, Call-offs into Order collaboration (P-02) | IA-X01, IA-B07 | M | Larger |
| One commitments page per persona (P-04) | IA-B05, IA-S03 | M | Larger |
| Supplier follow-ups (P-05) | IA-B04 | M | Larger |
| Inventory with a check date (P-06) | IA-B09 | M | Larger |
| What-if as a row action (P-07) | IA-B10 | S | Larger |
| Fold single-item sections (P-09) | IA-B07 | S | Larger |
| Retire legacy pages (P-10) | IA-X03, IA-B12 | M | Larger |
| Tabs on the 4 longest pages (P-12) | IA-B06 | L | Larger |

---

## 10. DROPPED

- **"Order summary links to 16 pages across both personas."** This is a scan artefact. The drill module picks the persona's own page (`pages-v2/orders/orderSummaryDrill.js`, `DESTINATION`).
- **"Every order page links to every other order page."** This is also an artefact. The pages import the drill module only for the back link.
- **"Alerts writes stock."** The generic inventory command also closes alerts. The verb mapping was corrected, and Alerts writes only alerts.
- **"Data health is hidden in the avatar menu though This week depends on it."** This week links to it (`pages-v2/BuyerThisWeek.jsx:134`). The FUX phase put it in the admin menu on purpose.
- **"Supplier performance and Supplier reliability disagree on delivery."** This is FUX F-11. It was not re-measured here with like-for-like definitions, so it stays in that report.
- **"PTI Capacity is read-only, so the planner cannot act."** This is by design (CAP decisions). It is not a navigation defect.
- **"Merge This week into the My tasks weekly card."** The strongest reason to keep it held up. This week shows the input check and 5 step counts, which the card does not.
- **"Merge RFI, RFQ and RFP into one Sourcing page."** This reverses NV-07 and RFX-D1. It was decided, so it is not a finding.
- **"Supplier Order summary and Purchase orders duplicate each other."** This was folded into P-02, not kept as a separate finding.
- **IA-B14, "setting max stock needs a Menu for switch."** Withdrawn on 2026-10-21, after this report was first shared. Menu for only filters the menu; its hint reads "It does not change what you are allowed to do." (`lib/i18n/hub.js:113`). Procurement sets max stock from its own menu, and a planner seat without the role sees the control as "Awaiting Procurement". The role-fit question itself stays with FUX F-15.

---

## 11. OPEN QUESTIONS

1. **Order summary as a view of Purchase orders, and Call-offs inside Order collaboration (P-02).** Requirements 3.7 lists them separately. Recommendation: accept, since the supplier menu already places Call-offs under Orders.
2. **Which menu holds Supplier documents?** Compliance has no Menu for view. Recommendation: Sourcing, under the Buyer view, next to Suppliers.
3. **Retire the 11 legacy pages (P-10)?** Owner ruled 2026-10-21: delete them, routes, files and their own tests, with no demo branch. Supplier Applications and registration stay.
4. **Are the SDC pages (`/buyer/collaboration/responses`, `/supplier/forecasts/responses`) the future backend seam?** If yes, fold their view into the menu page as a tab. If no, retire them. Recommendation: fold.
5. **What-if sandbox out of the menu (P-07)?** DRC-17 does not fix its placement. Recommendation: row action, with a "New blank scenario" button on the sandbox itself.
6. **Duplicate menu entries in the All view.** DRC-D18 and RFx F-11 placed them per role. Recommendation: keep them, because the All view is a demo view, not a working role.
7. **Should a task with a count of 1 open the record directly (P-08)?** Recommendation: yes. `?open=` and `?po=` already exist on Purchase orders, RFI, RFP and Requisitions.
8. **Stock simulation onto the Stock page (P-06)?** It would reverse MAT-D2 and REQ-E08-01 BR-01, a rule the business users set at kick-off. Owner ruled 2026-10-21: keep Stock simulation as its own page and menu item until MAT-D2's 3-month review; each Stock row links to it ("See estimate for a date").
