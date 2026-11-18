# SC Hub ASN and inbound requirements: ZWME021 validation, Surat Jalan, the Expeditor and the missing-ASN chase

| Field | Value |
|---|---|
| Status | Draft 2026-11-18. Proposed; not folded in |
| Date | 2026-11-18 |
| Source meeting | Weekly SC Hub, 2026-11-11, part C, and the attached slide |
| Owner review | Answers 2026-11-18, cited `[Owner, 2026-11-18]` |
| Code read | `gitlab/main` `19239947` for the requirement read; the apply is on `4186d246`, whose docs are unchanged. The checked-out tree was not used |
| Covers | AIB-1 to AIB-3, decisions AIB-D1 to AIB-D3 |
| Amends | REQ-E07-04 BR-04 (Surat Jalan); REQ-E07-06 BR-06 (SAP holds the quality status); REQ-E07-08 BR-02 (validation before the inbound); section 2 (EXP row) |
| Waits on | IT: the SAP inbound identifier and the interface; the planner: the Expeditor atom and seat details |
| Tags | `[MoM 11 Nov]`, `[Slide 11 Nov p.19]`, `[Owner, 2026-11-18]`, `[Proposed]`; a bare `[Q-n]` means a question in `01-ingest.md`, answered by the owner on 2026-11-18 |
| Terms | **Surat Jalan (SJ)** the delivery note number, the ASN's External ID; **sequence** one ASN's inbound upload group; **External ID** the SJ number; **Expeditor** the new PTI planning seat |
| New IDs | Requirements AIB-n, rules AIB-n BR-nn, acceptance criteria AIB-n AC-nn, decisions AIB-Dn |

### AIB-1 ASN and inbound validation

| Maps to | Phase | Priority | Business owner | Users | Status |
|---|---|---|---|---|---|
| M1-A8 to M1-A10; Slide 11 Nov p.19; REQ-E07-04; REQ-E07-08 BR-01, BR-02 | MVP | P0 | Material Planner | SUP, MP, ADM | Validated (owner, 2026-11-18); Proposed (the SAP identifier mapping) |

**Business value.** The 4 checks that stop a bad inbound in SAP run before the supplier submits, so the supplier corrects it in the hub instead of in an SAP error queue. KPI link: ASN coverage and first-time validation.

**Experience.**
- SUP: submits an ASN with material, quantity, expected arrival and SJ; the hub checks the 4 sequence rules and shows each error on its line.
- MP, ADM: sees the validation errors and the inbound status.

**Step-by-step (Supplier, 1 delivery with 2 lines).**
1. The supplier creates an ASN for PO 4200000113, with 2 lines on delivery date 21.08.2025, External ID "SURAT JALAN 1", sequence 1.
2. The hub validates: 1 PO, 1 delivery date, 1 External ID, sequence not blank.
3. The hub sends the validated ASN as an inbound delivery to SAP.
4. SAP creates the inbound; the hub shows the inbound number.

**Business rules.**
- BR-01. The ASN carries material, quantity, expected arrival date and the Surat Jalan (SJ) number, beside the existing fields (batch, ship date, carrier, tracking). [M1-A9; REQ-E07-04 BR-04]
- BR-02. The flow is: supplier submits the ASN, the hub validates it, the inbound data is retrieved from the ASN, and the inbound is created in SAP. [M1-A8]
- BR-03. Within 1 sequence, all lines have the same PO, the same delivery date and the same External ID. A sequence cannot be blank. [Slide 11 Nov p.19, rules 1 to 4]
- BR-04. One sequence = one ASN. The External ID is the SJ number. The supplier enters the sequence. [Q-18]
- BR-05. A failed validation blocks the submit; the supplier revises the ASN; each failed line shows its error. [M1-A9; the error per line is Proposed]
- BR-06. The ZWME021 validation and the error monitoring run in the hub. The existing ASN rules (batch, shelf life, call-off checks) still apply. [M1-A10; REQ-E07-04 BR-06 to BR-18]
- BR-07. The validated ASN is sent to SAP as an inbound delivery; the hub does not create the inbound directly. [M1-A8; REQ-E07-08 BR-01, BR-02]
- BR-08. The inbound number SAP returns is shown on the ASN; a failed send keeps the ASN and shows the error, retryable only for a transport failure (CR-20). [Proposed; CR-20]

**Edge cases.**
- Lines in 1 sequence name 2 POs: refused. [Slide rule 1]
- Lines in 1 sequence name 2 delivery dates: refused. [Slide rule 2]
- Lines in 1 sequence name 2 External IDs: refused. [Slide rule 3]
- The sequence is blank: refused. [Slide rule 4]
- SAP is unavailable: the ASN stays submitted, the inbound is queued, and the error is retryable (CR-20). [Proposed]

**Acceptance criteria.**
- AC-01. The slide's 2 lines (same PO, delivery date 21.08.2025, External ID "SURAT JALAN 1", sequence 1) pass; the test uses an ETA after the hub's declared present. [Slide; Q-18]
- AC-02. Changing line 2 to a different PO fails with both PO numbers named. [Slide rule 1; Proposed]
- AC-03. Changing line 2 to a different delivery date fails. [Slide rule 2]
- AC-04. Changing line 2 to a different External ID fails. [Slide rule 3]
- AC-05. Clearing the sequence fails. [Slide rule 4]
- AC-06. A validated ASN creates 1 inbound in SAP; the inbound number shows on the ASN. [M1-A8; REQ-E07-08]
- AC-07. A failed send keeps the ASN and shows the SAP error; a transport failure can be retried. [CR-20; Proposed]

**Data and integration.** ASN header and lines; sequence; External ID (SJ); SAP inbound delivery and its number. Hub to SAP for the inbound delivery, after validation.

**Metrics.** Leading: share of ASNs that pass validation first time; failed inbound messages per week. Lagging: ASN coverage.

**Open items.** Whether the SAP inbound number or another identifier is the External ID in SAP's terms; whether the sequence is the ASN number or a separate counter.

### AIB-2 Expeditor review and acknowledgment

| Maps to | Phase | Priority | Business owner | Users | Status |
|---|---|---|---|---|---|
| M1-A11, M1-A12; REQ-E07-06 BR-01, BR-06; section 2 | MVP | P1 | Material Planner | MP, SUP, EXP | Validated (owner, 2026-11-18); Proposed (the acknowledgment deadline and the seat's atom) |

**Business value.** One planning-side seat acknowledges the inbound information, so an inbound is visible as received in the hub before SAP posts the goods receipt, without moving the GR out of SAP. KPI link: inbound acknowledgment coverage.

**Experience.**
- EXP: reviews the inbound list and acknowledges each inbound, with who and when recorded.
- SUP: sees the acknowledgment; its GR acknowledge or dispute is unchanged.

**Step-by-step (Expeditor, daily).**
1. The Expeditor opens the inbound list.
2. The Expeditor opens an inbound, checks the ASN, quantity, date and SJ.
3. The Expeditor acknowledges; the record shows the name and time.
4. The GR still posts in SAP; the hub shows it when it arrives.

**Business rules.**
- BR-01. The Expeditor is a new PTI persona/seat in the planning area. [Q-19]
- BR-02. The Expeditor reviews and acknowledges the inbound information; the acknowledgment records who and when. [M1-A11; who/when Proposed]
- BR-03. GR inspection, retrieval and quality status stay in SAP. SAP posts the GR and holds the quality status; the hub displays the result and the rejected quantity and does not post or re-record the inspection (REQ-E07-06 BR-01, BR-06 as amended). [M1-A12; REQ-E07-06 BR-06]
- BR-04. The supplier's GR acknowledge or dispute (REQ-E07-06 AC-03) is unchanged; the Expeditor's inbound acknowledgment is a separate act. [Q-19; REQ-E07-06]
- BR-05. An inbound acknowledged in the hub shows "Acknowledged by <name> at <time>"; a missing acknowledgment is a To-Do for the Expeditor. The acknowledgment is due within 1 working day of the inbound. [Proposed]

**Edge cases.**
- The inbound arrives in SAP before the Expeditor acknowledges: the hub shows both, and the acknowledgment is still due. [Proposed]
- The Expeditor is absent: the seat holder or the planner can acknowledge; the record names who did. [Proposed]
- The supplier disputes the GR: the supplier flow is unchanged and does not depend on the inbound acknowledgment. [REQ-E07-06]

**Acceptance criteria.**
- AC-01. An EXP seat sees the inbound list and can acknowledge an inbound. [Q-19]
- AC-02. The acknowledgment shows the name and time. [M1-A11]
- AC-03. A GR posted in SAP appears in the hub; the hub adds no GR record of its own. [M1-A12; REQ-E07-06 BR-01]
- AC-04. The supplier's GR acknowledge and dispute still work without an Expeditor acknowledgment. [REQ-E07-06 AC-03]
- AC-05. An inbound older than 1 working day with no acknowledgment shows in the Expeditor's To-Do. [BR-05]

**Data and integration.** Inbound record; acknowledgment by, at; GR and quality status read from SAP. No GR write from the hub.

**Metrics.** Leading: share of inbounds acknowledged within 1 working day. Lagging: none.

**Open items.** The Expeditor atom and seat details; the inbound list's filters.

### AIB-3 Missing-ASN follow-up

| Maps to | Phase | Priority | Business owner | Users | Status |
|---|---|---|---|---|---|
| M1-A13; CR-09; REQ-E09-03 BR-08; REQ-E07-04 | MVP | P1 | Material Planner | MP, SUP | Validated (owner, 2026-11-18); Proposed (the chase timing and close reason) |

**Business value.** The planner chases the supplier that has not sent an ASN for a call-off already sent, instead of chasing every supplier on every open call-off. KPI link: ASN coverage before the need date.

**Experience.**
- MP: the call-offs sent with no ASN appear in a chase list.
- SUP: receives the chase in the hub (email waits on BL-26).

**Step-by-step (Planner, daily).**
1. The planner opens the call-offs sent with no ASN.
2. The planner sends the chase; the supplier sees it on Home.
3. The supplier submits the ASN; the line leaves the chase list.

**Business rules.**
- BR-01. The missing-ASN chase fires when a call-off is sent and no ASN is submitted. It does not fire for a PO with no call-off. [M1-A13]
- BR-02. CR-09 stays: the reminder 7 days before the need date when no ASN or dispatch heads-up exists. [CR-09; REQ-E09-03 BR-08]
- BR-03. The missing-ASN chase is an additional rule after dispatch; it does not replace CR-09. [Q-20]
- BR-04. A call-off with an ASN raises no chase. [M1-A13]
- BR-05. The chase is in the hub; email delivery waits on the notification service (BL-26). [BL-26]

**Edge cases.**
- The ASN is submitted after the chase: the line clears on the next read. [Proposed]
- The call-off is cancelled after it was sent: no chase. [Proposed]
- The supplier sends an ASN for part of the call-off: the chase stays until the ASN covers the call-off, or the planner closes it with a reason (Proposed). [Proposed]

**Acceptance criteria.**
- AC-01. A sent call-off with no ASN appears in the chase list. [M1-A13]
- AC-02. A call-off with an ASN does not appear. [M1-A13]
- AC-03. The CR-09 reminder still fires 7 days before the need date. [CR-09]
- AC-04. A submitted ASN removes the line from the chase list. [M1-A13; Proposed]

**Data and integration.** Call-off status; ASN link; chase record (sent by, at, closed by, reason).

**Metrics.** Leading: share of sent call-offs with an ASN before the need date. Lagging: KPI-05.

**Open items.** The chase timing (same day or after N days); the channel; whether the planner can close a chase with a reason.

## 2. Decisions

| ID | Decision | Outcome | Source |
|---|---|---|---|
| AIB-D1 | Sequence and External ID | One sequence = one ASN; External ID = the SJ number; the supplier enters the sequence; the 4 rules stay | Owner, 2026-11-18 |
| AIB-D2 | Expeditor | A new PTI persona/seat in the planning area | Owner, 2026-11-18 |
| AIB-D3 | Follow-up | CR-09 stays; the missing-ASN chase is added after dispatch | Owner, 2026-11-18 |
