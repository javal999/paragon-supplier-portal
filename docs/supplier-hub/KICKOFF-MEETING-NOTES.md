# Supplier Hub Kick-Off: Meeting Notes on Capabilities and Requirements

| | |
|---|---|
| Source | Owner's scrap notes from the kick-off discussion (mixed Indonesian and English) |
| Written up | 2026-09-17 |
| Owner review | 2026-09-17, 2 passes. All corrections and answers applied |
| Companion file | `SUPPLIER-HUB-BASELINE.md` (deck baseline). IDs such as `E08.01` refer to its register |
| Status | **Reviewed, ready to merge into the baseline.** 1 minor clarification (Q-18) and 2 action items remain in section 5 |

**How to read this file.**
- Each note has an ID (`MN-INV-01`) and maps to an existing baseline row, or proposes a new one marked **(proposed)**.
- **Status:**
  - **Confirmed:** the owner accepted the rewrite.
  - **Corrected:** the owner changed the rewrite, and the text shows the corrected version.
  - **Open:** a follow-up question remains in section 5.1.
- PTI = PT Paragon Technology and Innovation, the buying company (confirmed, Q-01).

---

## 1. Inventory Collaboration (E08)

### 1.1 What the inventory view must show

| ID | Requirement | Original scrap | Maps to | Status |
|---|---|---|---|---|
| MN-INV-01 | Show **on-hand** stock and the **upcoming quantity with its date**. No separate "available" figure. Stock is deducted as soon as it is used, so on-hand already reflects usable stock (Q-02) | "On-Hand & Available Ini bedanya --> butuhnya upcoming nya berapa dan kapan" | E08.01 | Corrected |
| MN-INV-02 | Show **2 reorder points** side by side: PTI's ROP and the supplier's ROP. Both belong in the inventory visibility screen | "ROP --> ada di Inventory Visibility / Ada 2 angka ROP PTI + ROP Supplier" | E08.01; E09.01 | Confirmed |
| MN-INV-03 | Show stock on hand (SOH) separately for the **supplier** and for **PTI** | "ada bedain SOH Supplier, SOH PTI" | E08.01 | Confirmed |
| MN-INV-04 | Incoming stock arrives on several dates. The inventory view shows the **aggregate** incoming quantity. The per-date detail lives in Order Collaboration | "Incoming ini ada beberapa tanggal --> show aggregate (detail nya di order collaboration)" | E08.01; E07 | Confirmed |
| MN-INV-05 | Split incoming quantity into **in production** and **in transit** | "Mau tau yg masih in production & in transit" | E08.01; E13.02 | Confirmed |
| MN-INV-06 | Separate **raw material** from **packaging** in the view, because a packaging supplier's stock is a finished good at their end (Q-03) | "Dibedain juga antara Material dan Packaging --> karena bentuknya FG" | E08.01 | Confirmed |

### 1.2 How suppliers submit inventory data

| ID | Requirement | Original scrap | Maps to | Status |
|---|---|---|---|---|
| MN-INV-07 | Suppliers can submit stock data 3 ways, and all 3 are needed: | "Upload EDI, API dan Manual" | E08.01; E12.01 | Confirmed |
| | **(a) Spreadsheet upload:** a template file, referred to as "EDI" in the notes. It is not EDI in the EDIFACT or X12 sense (Q-04) | "EDI --> upload files template" | E08.03 (proposed) | Corrected |
| | **(b) API:** sync pulled from the supplier system, started by PTI with a **Sync** button | "API with Sync Button triggered by PTI" | E12.01 | Confirmed |
| | **(c) Manual:** entered directly in the SC Hub | "Manual directly through SC hub" | E08.01 | Confirmed |

### 1.3 Supplier access to PTI stock

| ID | Requirement | Original scrap | Maps to | Status |
|---|---|---|---|---|
| MN-INV-08 | Selected suppliers can see **PTI's stock**. Access is granted per supplier, not to all suppliers | "Ada supplier yg bisa liat stock PTI --> selected" | E08.04 (proposed) | Confirmed |
| MN-INV-09 | **Nice to have:** narrow that access to the materials each supplier can supply | "[Nice to have] Visbility ini di level Supplier --> selected material yg bisa di supply" | E08.04 (proposed) | Confirmed |
| MN-INV-10 | Material-level access is aimed at materials under a **consignment** arrangement ("modal sharing", Q-05), so the setting works at material-type level | "Ini untuk tipe material yg tipe nya modal sharing (sehingga granular di tipe material)" | E08.04 (proposed) | Corrected |
| MN-INV-11 | ~~The list of granted materials may be refreshed quarterly~~ **Dropped.** The Material Planner updates access whenever needed (MN-INV-12), so no fixed refresh cycle is required (Q-15) | "refersh nya bisa jadi di level quartal" | E08.04 (proposed) | Dropped |
| MN-INV-12 | The **Material Planner** maintains the list of granted suppliers and materials, adding or removing access. It is PTI's decision, and suppliers do not approve the change (Q-06) | "Perubahan dari yg ga dikasih jadi dikasih -->" | E08.04 (proposed) | Corrected |

### 1.4 Shipment tracking and replenishment

| ID | Requirement | Original scrap | Maps to | Status |
|---|---|---|---|---|
| MN-INV-13 | Give suppliers access to the **TMS** so they can track their deliveries to PTI. Once integration is mature, switch to API exchange | "Kasih TMS ke supplier untuk tracking kirim barang ke kita, tapi kalau udah mature kita bisa communicate via API" | E13.01 (proposed change) | Confirmed. Phase impact in D-03 |
| MN-INV-14 | The **recommended replenishment cycle** is driven by ROP. The ROP comes from **SAP** (demand sensing), not from a calculation in the hub | "Recommendation Cycle ini berdasarkan ROP --> ini ambil dari SAP (demand sensing)" | E09.01; E12 | Confirmed |

---

## 2. Order Collaboration (E07)

### 2.1 PO versus call-off

| ID | Requirement | Original scrap | Maps to | Status |
|---|---|---|---|---|
| MN-ORD-01 | A **PO is an umbrella PO** with a long horizon. A **call-off** manages the individual deliveries under it. The hub treats them as separate objects | "PO != Call Off, PO itu PO payung, Call off itu manage pengirimannya" | E07; E09 | Confirmed |
| MN-ORD-02 | The supplier confirms the quantity they can commit to against the long-horizon PO | "Supplier confirm berapa yg disanggupin bisa diambil --> confirm PO (jangkanya panjang)" | E07.01 | Confirmed |
| MN-ORD-03 | The supplier sees the PO broken down by **quantity and timing**. The breakdown comes from SAP | "Supplier dapet visibility breakdown PO qty & timing (dari SAP)" | E07.01; E07.05 | Confirmed |

### 2.2 PO response flow

When a PO is generated, the supplier must respond **within 1 working day** and say whether they can fulfil it. There are 3 possible responses, plus an escalation when the supplier does not respond:

| ID | Response | What happens | Original scrap | Maps to | Status |
|---|---|---|---|---|---|
| MN-ORD-04 | (Response deadline) | The response is due within **1 working day** after PO creation, applied to PTI's suppliers (Q-11, Q-12) | "PO digenerate --> perlu di confirm 1x24 jam" | E07.01; PX2 | Corrected. Calendar detail in Q-18 |
| MN-ORD-05 | **Approve** | The supplier goes on to provide an ASN | "kalau approve --> provide ASN" | E07.01; E07.02 | Confirmed |
| MN-ORD-06 | **Adjust** | The supplier changes quantity, timing, or both. They must pick a **predefined reason** and make a **counter-offer** of date and quantity | "kalau adjust --> antara adjust jumlah/waktunya + reasons + penawaran balik waktu/jumlah"; "Reasons itu predefine" | E07.01 | Confirmed |
| MN-ORD-07 | (PO-level metric) | Performance at PO level is measured as **CFOT (Casefill On-Time)** per supplier. It works like OTIF, but on the PO instead of the call-off. "CIFOT" in the scrap was a typo for CFOT (Q-07, Q-14) | "CIFOT --> Casfill On-Time --> di level supplier" | E10.01 | Corrected |
| MN-ORD-08 | **Reject** | The supplier rejects when it cannot meet the requested **date, quantity, and/or quality**. A rejection counts against the supplier's **performance assessment**, and PTI gets a **notification** naming the supplier (Q-08) | "kalau reject --> ini impact ke assessment --> dapat notifikasi supplier apa yg ga confirm" | E10.01; E08.02 | Corrected |
| MN-ORD-14 | **No response** | If the supplier does not respond within 1 working day, the PO is **escalated** and needs action from PTI's team, such as sourcing from another vendor or supplier (Q-13) | (owner answer, no scrap) | E07.01; E03 | Confirmed |
| MN-ORD-09 | (Call-off-level metric) | **OTIF is measured per call-off.** CFOT is measured per PO. OTIF is shown on the dedicated supplier performance dashboard and in supplier sourcing, so performance informs sourcing decisions (Q-09) | "OTIF ada di" | E10.01; E03; KPI-05 | Corrected |

**Measurement levels:**

| Object | Metric | Where it is shown |
|---|---|---|
| PO (umbrella) | CFOT (Casefill On-Time) | Not stated. Assumed alongside OTIF on the performance dashboard (E10) |
| Call-off (delivery) | OTIF (On-Time In-Full) | Supplier performance dashboard (E10); supplier sourcing (E03) |

### 2.3 The 3 confirmations and the summary view

When a supplier confirms a PO, it provides **3 types of confirmation**. Each one is linked to an existing SC Hub menu (confirmed, Q-16). The **Order Collaboration Summary** shows all 3 together, with links to the specific page for detail. Paragon users and the supplier that owns the PO both see it (Q-17).

| ID | Confirmation | Meaning | Linked menu | Original scrap | Status |
|---|---|---|---|---|---|
| MN-ORD-10 | **Capacity confirmation** | The supplier confirms it can allocate production capacity | Inventory & Capacity Collaboration (E08) | "Confirmation Capacity - dia bisa allocate production" | Confirmed |
| MN-ORD-11 | **Foresight / fixed-stock confirmation** | PTI shares its plan. The supplier replies with the quantity and date it can meet | Forecast Collaboration (E06) | "Confirmation Foresight/Fix Stock - sharing planning dari PTI - dapat feedback qty & tgl" | Confirmed |
| MN-ORD-12 | **Shipping notice confirmation** | The shipment has started, with its expected completion date | Order Collaboration, ASN (E07.02) | "Confirmation Shipping Notice - pengirimannya sudah mulai, sampai kapan" | Confirmed |
| MN-ORD-13 | **Order Collaboration Summary** | 1 view per PO with its ASN breakdown and the status of all 3 confirmations, each linking to its detail page. Visible to Paragon users and to the supplier that owns the PO, who sees only its own POs | Order Collaboration (E07) | "Summary Order Collaboration --> PO, breakdown ASN, Confirmation 3 hal tadi" | Corrected |

The 3 confirmations match the planning signals on deck p.5: capacity commitment, supply confirmation, and delivery confirmation.

---

## 3. RFx Management (E03)

The owner reviewed this section and had no corrections.

| ID | Requirement | Original scrap | Maps to | Status |
|---|---|---|---|---|
| MN-RFX-01 | Buyers **filter suppliers** when inviting them to an event, using several parameters, at least **commodity** or **purchasing group**. The full parameter list will be provided later | "Filtering based on suppliers --> beberapa parameter, nanti akan di provide detail nya seperti apa / Based on commodity atau purchasing group" | E03.02 | Confirmed. Parameter list pending, A-02 |
| MN-RFX-02 | **RFI (request for information)** asks the vendor for its capabilities and experience, and for which product or service specifications it offers | "RFI --> diminta diawal sebelum RFQ, spec layanan/product apa aja"; "RFI minta capability & experience dari vendor" | E03.02 | Confirmed |
| MN-RFX-03 | RFI output is a structured profile: **capability, facility, and products** (as a product catalog), each with a description | "output berupa capability, facility, product (product catalog) + description" | E03.02; E05.01 | Confirmed. Phase impact in D-07 |
| MN-RFX-04 | **RFI, RFQ, and RFP are independent.** None is a required step before another. Information gathered in an RFI can be reused to create an RFQ (Q-10) | "diminta diawal sebelum RFQ ... tidak sequentials dengan RFQ" | E03.02 | Corrected |
| MN-RFX-05 | **RFP (request for proposal)** asks for **commercial terms** | "RFP minta commercial Terms" | E03.02; E03.03 | Confirmed |

---

## 4. Proposed baseline changes

Ready to merge. Q-18 is a minor detail and does not block the merge.

### 4.1 New register rows

| Proposed ID | Capability | Phase | Source notes |
|---|---|---|---|
| E08.03 | Inventory data submission by spreadsheet template upload, API sync started by PTI, and manual entry | MVP (inherits E08) | MN-INV-07 |
| E08.04 | Supplier access to PTI stock, granted per supplier and maintained by the Material Planner at any time; per-material access for consignment materials is nice to have | MVP; material-level part is nice to have | MN-INV-08 to MN-INV-12 (MN-INV-11 dropped) |
| E07.06 | PO response flow: approve, adjust with predefined reason and counter-offer, or reject (date, quantity, quality), within 1 working day; no response escalates to PTI | MVP, P0 (inherits E07) | MN-ORD-04 to MN-ORD-08, MN-ORD-14 |
| E07.07 | 3 confirmations linked to their menus, and the Order Collaboration Summary for Paragon users and the owning supplier, with links to detail | MVP, P0 (inherits E07) | MN-ORD-10 to MN-ORD-13 |
| E10.03 | CFOT (Casefill On-Time) per supplier at PO level and OTIF per call-off, shown on the performance dashboard and in supplier sourcing | MVP (inherits E10) | MN-ORD-07, MN-ORD-09 |
| E03.06 | Supplier filtering for event invitations by commodity, purchasing group, and further parameters | MVP (inherits E03) | MN-RFX-01 |
| E03.07 | Independent RFI, RFQ, and RFP event types, each with its own content, with RFI data reusable in an RFQ | MVP (inherits E03) | MN-RFX-02 to MN-RFX-05 |

### 4.2 Effects on the deck baseline

| ID | Effect | Baseline item | Status |
|---|---|---|---|
| D-01 | E08.01 becomes specific: on-hand and upcoming quantity with date (no "available"), SOH split by supplier and PTI, 2 ROPs, aggregate incoming split into in production and in transit, material versus packaging | E08.01 | Ready |
| D-02 | Inventory submission by spreadsheet and API brings part of E12.01 (API ERP) into the inventory feature | E08, E12.01 | Ready |
| D-03 | TMS access for suppliers is not in the deck. Shipment tracking (E13) is Phase 2 in the deck, so earlier TMS access changes the phase plan. Also relevant to DKSH's pilot need for shipment visibility (CON-15) | E13, CON-15 | Phase decision needed |
| D-04 | ROP and the replenishment recommendation come from SAP. E09.01 "Replenishment strategy & calculation" therefore means displaying SAP results, not calculating in the hub | E09.01 | Ready |
| D-05 | The 1-working-day deadline is a concrete response SLA, which partly answers the Lautan Luas pilot need "Response SLA" | PX2, DEC-11 | Ready |
| D-06 | Each confirmation lives in its own menu and is gathered in the Order Collaboration Summary. This settles which epic owns the forecast confirmation: Forecast Collaboration owns the page, Order Collaboration shows the summary | E06.02, E07 | Ready |
| D-07 | RFI output includes a product catalog. Catalog Management (E05) is Phase 2 in the deck while RFx (E03) is MVP, so RFI in the MVP needs at least a basic catalog | E05.01, E03 | Phase decision needed |
| D-08 | Supplier rejections feed the supplier assessment, and OTIF feeds supplier sourcing. This links E07 and E09 to E10 and E03 | E10.01, E03 | Ready |
| D-09 | CFOT, unexpanded in the baseline glossary, is Casefill On-Time: the PO-level counterpart of OTIF. CFOTQ on deck p.4 is likely CFOT plus quality (inferred, not confirmed) | Baseline section 9 | Ready |

---

## 5. Open questions and action items

### 5.1 Still open

| ID | Question | Note |
|---|---|---|
| Q-18 | For the 1-working-day deadline, which calendar sets working days and holidays: PTI's calendar, or each supplier's? | MN-ORD-04. Does not block the merge |

### 5.2 Answered in owner review

| ID | Question | Answer |
|---|---|---|
| Q-01 | Is PTI = PT Paragon Technology and Innovation? | Yes |
| Q-02 | What separates available stock from on-hand? | Not needed. Stock is deducted directly once used, so users only need on-hand |
| Q-03 | Does "bentuknya FG" mean packaging is a finished good at the supplier? | Yes |
| Q-04 | Is "EDI" true EDI or a spreadsheet? | Spreadsheet |
| Q-05 | What is "modal sharing"? | A consignment arrangement |
| Q-06 | How is a change from no access to access handled? | Material Planner decides and updates it. No supplier approval |
| Q-07 | What is CIFOT? | A typo for CFOT |
| Q-08 | What triggers the reject notification? | A supplier rejection because it cannot meet the requested date, quantity, and/or quality |
| Q-09 | Where is OTIF measured and shown? | Measured per call-off. Shown on the performance dashboard and in supplier sourcing |
| Q-10 | Is RFI a required step before RFQ? | No. RFI, RFQ, and RFP are independent, but RFI information can feed an RFQ |
| Q-11 | Calendar hours or working hours? | Working calendar |
| Q-12 | What does the working-calendar deadline equal? | 1 working day, applied to PTI's suppliers |
| Q-13 | What happens when there is no response? | Escalated. PTI's team must act, for example by sourcing from another vendor or supplier |
| Q-14 | What is CFOT? | Casefill On-Time. Like OTIF, but measured per PO instead of per call-off |
| Q-15 | Keep the quarterly access refresh? | No, dropped |
| Q-16 | Are the confirmation-to-menu links right? | Yes |
| Q-17 | Who sees the Order Collaboration Summary? | Paragon users and the supplier that owns the PO |

### 5.3 Action items (outstanding)

| ID | Action | Owner | Source |
|---|---|---|---|
| A-01 | Check with Mas Ary Hidayat on compliance and capability requirements for RFx. The note is cut off ("capability b"), so confirm the full topic | Not stated | "Check ke mas Ary Hidayat --> soal compliance dan capability b" |
| A-02 | Provide the full parameter list for supplier filtering in RFx | Not stated ("nanti akan di provide") | MN-RFX-01 |
