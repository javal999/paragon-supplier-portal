# Alert rules in the hub today: list for the team to confirm (BL-150)

| | |
|---|---|
| Status | Notes, 2026-11-02. To share with the Material Planning team and confirm. Not a requirement: the confirmed list goes into REQ-E08-05 BR-01 and BR-12 afterwards |
| Why | BL-150 / MR-9 BR-07: the alert list from the 2026-09-23 meeting (MOM 6.3) was never shared. The owner asked for the rules that exist today, so the team can check them against what they expect (owner, 2026-11-02) |
| Source | The rule list `ALERT_RULES` in `src/services/transitions/inventoryAlertRules.js`; which rules a supplier never sees: `PTI_ONLY_RULES` in the same file; wording: the glossary entries `alert…` in `src/lib/glossary/termLabels.glossary.js`. Read on `main` at `5666e31f` |

## The 12 rules

"Shown to" says who sees the alert. PTI-only rules are never shown to a supplier.

| # | Rule (as labelled on screen) | Raised when | Shown to | Added by |
|---|---|---|---|---|
| 1 | PTI stock is below the PTI reorder point | PTI stock on hand < PTI ROP | PTI | REQ-E08-05 BR-01 |
| 2 | Supplier stock is below the system-calculated supplier reorder point (ROP Supplier) | Supplier stock on hand < the ROP Supplier the hub calculates. The ROP the supplier types in is shown only, never compared | PTI, supplier | REQ-E08-05 BR-01 |
| 3 | PTI stock runs out before the next incoming delivery | PTI stock ÷ daily demand (all suppliers of the material) < days until this supplier's next incoming date | PTI | REQ-E08-05 BR-01 |
| 4 | Allocated capacity is below the LTP | The capacity the supplier allocated for a week is below that week's LTP | PTI, supplier | REQ-E08-05 BR-01; per planning group since MR-8 |
| 5 | Supplier stock figures are out of date | The supplier's last stock update is older than its agreed update interval. Always Low risk | PTI, supplier | REQ-E08-05 BR-01; by update mode since MR-1 BR-05 |
| 6 | Supplier stock and incoming do not cover the next 30 days of demand | (Supplier stock + incoming) ÷ 30 days of demand is below the coverage thresholds (CR-03) | PTI, supplier | REQ-E08-05 BR-01 |
| 7 | Committed quantity below forecast beyond tolerance | The supplier committed less than the forecast by more than the tolerance. High in the Firm zone, Medium in Trade-off | PTI, supplier | REQ-E08-05 BR-01 |
| 8 | No supplier lead time on record | The material has no supplier lead time in master data; risk uses fixed day bands until it is added | PTI | REQ-E08-05 BR-01 |
| 9 | A confirmed call-off due within the lead time is larger than the supplier stock plus production due before the need date | The supplier cannot have a confirmed call-off ready by its need date | PTI | MR-6 BR-13 |
| 10 | The supplier marked this material Discontinued: it needs another source | The supplier gave Discontinued as the shortfall reason on capacity or a commitment | PTI | CAP-D2 |
| 11 | A blanket PO runs out soon: raise the next PO by its "new PO needed by" week | That week is within 4 weeks or has passed. High from that week on, Medium before | PTI | CAP-9 BR-05 |
| 12 | Supply above demand anticipation (DA) is more than the last week of the horizon can absorb | The plan check finds more supply above DA than the horizon's last week can take | PTI | DRC-4 |

Not an alert: an ASN that does not match its call-off shows as a marker on the ASN (MR-6 BR-12).

Every alert has a risk class, High, Medium or Low, from days of cover against the supplier lead time (CR-24: High below 1 ×, Medium below 1.5 ×), except where the table says otherwise. Closing an alert needs a reason from a list (MR-9 BR-04).

## Questions for the team

1. Is any alert from the 2026-09-23 list (MOM 6.3) missing here? Each missing one becomes a new rule (REQ-E08-05 BR-12).
2. Is any rule here not wanted, or worded in a way the team would not use?
3. Who should see each rule: is the "Shown to" column right?
4. Once the list is final: show one card per supplier × material instead of one per rule (INV-D5, P-04)?
