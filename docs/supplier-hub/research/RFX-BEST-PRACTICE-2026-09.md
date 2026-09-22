# RFI / RFP / RFQ authoring and response: what leading procurement platforms do

Prepared 2026-09-21 as input to Paragon Supplier Hub requirements (PT Paragon Technology and Innovation: Wardah, Emina, Make Over; packaging and ODM/full-service buying).

## How to read this

- Every claim has a source URL next to it. "Unverified" means I could not confirm it from a vendor or practitioner source during this pass. It does not mean the feature is missing.
- **Source quality varies.** The strongest source is the SAP Ariba Event Management API guide (version 2605, May 2026). It lists the actual data model: item types, answer types, visibility, prerequisites, weights and copy options. Oracle Fusion docs (docs.oracle.com) are public and detailed. Most help.sap.com pages load with JavaScript and could not be fetched, so for those I rely on SAP Learning pages and search-indexed snippets. Coupa's buyer-side docs sit behind a login; only supplier-side Compass pages and customer supplier guides are public. So Coupa buyer authoring details are thinner. Jaggaer, Ivalua, GEP, Zip and Keelvar are covered mainly through product pages and product briefs, which are marketing and should be read as claims.
- Short names: **Ariba** = SAP Ariba Sourcing (classic and Guided Sourcing). **CSO** = Coupa Sourcing Optimization. **Oracle** = Oracle Fusion Cloud Sourcing (Negotiations).

Key source used many times:
- Ariba Event Management API guide (PDF, 2605): https://help.sap.com/doc/7b8bf5aa499341489687038610fa0bea/cloud/en-US/f342574f194c4af6a24a42087a665607.pdf ("Ariba API guide" below)

---

## 1. Event structure: project vs event, how RFI/RFP/RFQ relate, and conversion

**Common practice.** A sourcing *project* (a container with team, documents and tasks) holds one or more *events* (RFI, RFP/RFQ, auction). The RFI is used to qualify and shortlist suppliers. Its information is then reused in a follow-on RFP or RFQ, usually by copying the event and choosing what to bring across.

**Leading edge.** Selective copy (choose content, suppliers, teams and even prior bids), plus multi-round events where the same event reopens for a new round without being rebuilt.

**Vendors**
- **Ariba.** An RFI "can be used as the qualifying round" to select a few suppliers for follow-on RFPs or auctions, and RFI information can be reused in a follow-on event (https://help.sap.com/docs/ARIBA_SOURCING/36a99e6ce8954882ba1cbe6d42056c3e/7c22022971ea10149661846f80d003d4.html ; https://community.sap.com/t5/spend-management-blog-posts-by-sap/sourcing-event-management-rfi-rfq-and-rfp/ba-p/14474874). Copying an event lets you choose what carries over. The API field `itemsToIncludeForCopy` accepts `all, teams, contents, suppliers, lineItems, questions, supplierBids` (default `all`), and a copy can be placed under a parent project (Ariba API guide, p.53–54). So invitees, content, line items, questions and even prior supplier bids can all be carried across. The UI equivalent is documented at https://help.sap.com/docs/strategic-sourcing/managing-events-with-guided-sourcing/how-to-create-guided-sourcing-project-or-event-by-copying-existing-project-or-event (page content not fetchable; exact UI checkboxes unverified).
- **Oracle.** Negotiation types are RFI, RFQ and auction. "At the conclusion of the RFI cycle, the information contained in the RFI can be copied into an RFQ or buyer's auction." Oracle documents a "Cross Copy RFI to RFQ" flow (https://docs.oracle.com/en/cloud/saas/procurement/25c/oaprc/negotiation-types.html ; https://docs.oracle.com/cd/E26401_01/doc.122/e56964/T629931T636790.htm). Oracle also supports **new rounds**: the same negotiation is changed and republished, and all invited suppliers are notified. It supports **amendments** to a live negotiation, numbered with a ",1" style suffix (https://docs.oracle.com/en/cloud/saas/procurement/25d/oaprc/negotiation-amendments.html).
- **Coupa.** RFx events are RFI, RFQ and RFP, alongside English, Dutch and Japanese auctions (https://compass.coupa.com/en-us/products/product-documentation/supplier-resources/for-suppliers/coupa-supplier-portal/set-up-the-csp/sourcing/sourcing-events-types-for-suppliers). Buyers create events "from template" or by "Copy Event", filtered by commodity (Coupa R35 release note, indexed in search; the page host was unreachable, so partially verified). Whether Coupa copy carries over supplier responses is unverified.
- **SAP S/4HANA.** RFQs are created in *Manage RFQs*, quotations are kept in *Manage Supplier Quotations* and compared in *Compare Supplier Quotations*. An RFQ can be sent to Ariba for bidding, and the award comes back to create a PO or contract automatically (https://learning.sap.com/courses/sourcing-in-sap-s4hana/working-with-requests-for-quotation ; https://help.sap.com/docs/strategic-sourcing/rfq-and-award-integration-with-sap-ariba-sourcing/about-sap-erp-and-sap-s-4hana-integration-with-sap-ariba-sourcing).

---

## 2. Content authoring

**Common practice.** Event content is a tree of sections, questions/requirements, attachments and line items. Each question has an answer type, whether it is required, and which answers are acceptable. Weights are set per question and per section. Content is reused from a central library and from templates.

**Leading edge.** Prerequisite "gates" that hide content until a supplier passes, visibility conditions (show-if), content visible only after an access gate such as an NDA, participant-specific values, team grading with grader weights, blind grading, and AI-drafted questions.

**Vendors**
- **Ariba content model** (Ariba API guide, pp.46–49):
  - *Item types*: Section, Question/Requirement, Line item, Lot, Cost item (total cost), KPI, Certificate section.
  - *Answer (value) types*: Text, MultilineFreeText (up to 1,000 characters), ShortText (up to 255), WholeNumber, DecimalNumber, Date, Money, YesNo, Attachment, Certificate, Address, Percentage, Quantity.
  - *Acceptable values*: AnyValue, LimitedRange (min–max), or ListOfValues (single or multi-select).
  - *Required*: not required, participant must answer, or owner must fill.
  - *Visibility*: visible, hidden, or "visible to participants after access gate is cleared".
  - Participants can be allowed to add comments and attachments per term, and terms can have participant-specific initial values.
  - Each term can carry a scoring **weight**, be rankable, and be flagged as an ERP integration field.
- **Ariba prerequisites and knock-out.** Prerequisite types are: no restriction, gate on event content, or required to submit a response. You can also require that the owner reviews the answer (Ariba API guide p.46). Prerequisites "act as gating questions" (https://learning.sap.com/learning-journeys/introducing-projects-within-sap-ariba-sourcing/creating-sections-requirements-and-questions_cf88be54-b665-4bd3-8891-e1c54c645558, via search snippet).
- **Ariba conditional (show-if).** Conditions control whether a question is visible, and can be nested (https://help.sap.com/docs/strategic-sourcing/common-data-import-and-administration-guide-for-sap-strategic-sourcing-solutions-and-sap-ariba-supplier-management-solutions/about-using-conditions-that-control-visibility-of-questions-in-sourcing-events ; Guided Sourcing conditional content: https://help.sap.com/docs/strategic-sourcing/managing-events-with-guided-sourcing/adding-conditional-content-in-questions-requirements-and-attachments-33be8a484624484ba706795f4e72c53a).
- **Ariba library and templates.** The Sourcing Library stores reusable sections, questions, requirements, attachments, lots, line items and past-event content. There is also a **Term Library** of reusable line-item terms. All projects are created from templates, which template administrators manage (https://learning.sap.com/learning-journeys/introducing-sap-ariba-guided-sourcing-projects/organizing-reusable-content-and-understanding-document-actions ; https://learning.sap.com/courses/managing-sourcing-and-event-templates/introducing-sourcing-template-administration ; https://help.sap.com/docs/strategic-sourcing/common-data-import-and-administration-guide-for-sap-strategic-sourcing-solutions-and-sap-ariba-supplier-management-solutions/how-to-create-term-in-dynamic-sourcing-library). Questions can be bulk-imported from Excel (https://help.sap.com/docs/strategic-sourcing/managing-events-with-guided-sourcing/importing-questions-and-requirements-with-simplified-excel-import-feature).
- **Ariba scoring.** Weights can be set on sections, subsections and items, and nested weights multiply (60% x 70% = 42%). Team grading supports grader weights, and blind grading hides supplier identity (https://help.sap.com/docs/strategic-sourcing/grading-and-scoring/using-team-grading ; https://learning.sap.com/learning-journeys/introducing-sap-ariba-guided-sourcing-projects/introducing-grading-and-scoring-in-guided-sourcing-events).
- **Oracle.** Requirements are grouped into sections, with number, date, date-time and value-list responses, and **branching questions** attached to an acceptable value (https://docs.oracle.com/en/cloud/saas/procurement/26a/fapra/op-suppliernegotiations-suppliernegotiationsuniqid-child-sections-sectionid-child-requirements-requirementid-action-addquestionsbranch-post.html).
  - Scoring can be automatic or manual, with weights, and scoring criteria can optionally be shown to suppliers (https://docs.oracle.com/en/cloud/saas/procurement/26b/oaprc/negotiation-controls.html).
  - A **knockout score** marks responses below a minimum as not shortlisted for award (https://docs.oracle.com/cd/E18727_01/doc.121/e13411/T354132T354136.htm).
  - Requirements can be generated with **AI Assist** or added from predefined questions (https://docs.oracle.com/en/cloud/saas/readiness/scm/25d/proc25d/25D-procurement-wn-f39841.htm).
- **Coupa.** Buyers collect information through custom "Forms", questionnaires and attachments, and mandatory fields are flagged (https://compass.coupa.com/en-us/products/product-documentation/supplier-resources/for-suppliers/coupa-supplier-portal/set-up-the-csp/sourcing/participate-in-a-sourcing-event). The CSO bid form supports field types such as multiple choice (dropdown), numeric and percentage (https://compass.coupa.com/en-us/products/product-documentation/supplier-resources/for-suppliers/core-supplier-onboarding/coupa-sourcing-optimization-for-suppliers). Coupa conditional questions and knock-out rules are unverified.
- **Jaggaer.** Claims "dynamic templates, data libraries, BOM support, cost breakdown structures and automated scoring" (product brief, https://www.jaggaer.com/wp-content/uploads/JAGGAER-Sourcing-Product-Brief.pdf). Event questions can be exported and imported through a spreadsheet template (https://doas.ga.gov/sites/default/files/assets/State%20Purchasing/Jaggaer%20Sourcing%20Director/Import%20Event%20Questions%20all%20eRFx%20Types%20QRG.pdf).
- **Zip.** Weighted sections and "automated normalization" in vendor evaluation (https://zip.com/products/sourcing).

---

## 3. Commercial terms in an RFP

**Common practice.** There are two layers:
1. A **bidder agreement or T&C document** the supplier must accept before seeing or answering the event.
2. Commercial **terms captured as questions**, such as payment terms, Incoterms, validity and warranty, often yes/no with a comment field.

**Leading edge.** Draft contract clauses are published with the event. The supplier responds clause by clause and can propose changes, and deviations are tracked and reported, as in Oracle.

**Vendors**
- **Ariba.** A bidder agreement can be set as an access gate. The supplier must click "I accept the terms of this agreement" on the Review and Accept Prerequisites page (https://help.sap.com/docs/strategic-sourcing/participating-in-sourcing-events/how-to-accept-bidder-agreement-and-complete-event-prerequisites). The Sourcing Library is used to store standard commercial terms content (search snippet from the learning page above). Per-term participant comments, via `enableParticipantComments`, allow "accept plus comment" style answers (Ariba API guide).
- **Coupa.** Suppliers must accept T&Cs before accessing event content, and "acceptance is binding… not possible to change a 'Yes' into a 'No'" (Compass participate page above; AstraZeneca Coupa supplier guide https://www.astrazeneca.com/content/dam/az/Partnering/supplier/pdf/Suppliers_Guide_to_AZ_Sourcing_Events_in_Coupa_S2C_ENG.pdf).
- **Oracle.** RFIs and RFQs can carry draft contract terms (clauses and deliverables). Suppliers "review, respond, and may suggest changes", and clause edits appear in a clause deviations report (https://docs.oracle.com/cd/E15586_01/fusionapps.1111/e20383/F274741AN38724.htm ; https://docs.oracle.com/en/cloud/saas/procurement/26c/oaprc/create-supplier-contracts-from-negotiation-award.html).
- **Fairmarkit.** Default Incoterms per supplier with an event-level override, and suppliers can respond with a different Incoterm (2025 release notes, https://docs.fairmarkit.com/release-notes/release-notes/archive/2025).

---

## 4. RFQ line items

**Common practice.**
- An item grid in which each line has buyer terms (description, quantity, unit of measure) and supplier terms (price, lead time, and so on).
- Formulas roll the terms up into a total cost.
- Excel export and import of the bid sheet.
- Lots group items that must be awarded together.

**Leading edge.**
- Buyer-defined quantity tiers.
- Price-breakdown events, where the supplier prices each cost component rather than the item itself.
- Participant-specific cost adders.
- Supplier-added items and alternative bids.
- Custom offline bid sheets.
- BOM-level sourcing.

**Vendors and feature detail**
- **Item grid and terms.** In Ariba, a line item is "the smallest entity on which a participant can bid". Terms hold price, quantity, supplier information, buyer information and calculated totals. A lot "is awarded in its entirety", and lot types are item lot, basket, and basket with no items (https://learning.sap.com/courses/creating-sourcing-events-within-sap-ariba-guided-sourcing/collecting-pricing-through-line-items-and-lots). In Oracle, lines carry current, start and target price, line attributes (free text or value lists, weighted for multi-attribute scoring), cost factors, lots and groups (https://docs.oracle.com/en/cloud/saas/procurement/26b/oaprc/negotiation-lines.html).
- **Per-item specification attributes, filled by buyer or supplier.**
  - Ariba: each term's `requiredType` decides whether the participant or the owner fills it, with list-of-values support. This is exactly the "supplier fills brand/machine" pattern (Ariba API guide).
  - Oracle: "Line attributes target information other than price", with free-form or predefined values (negotiation lines page).
  - Coupa CSO: dropdown, numeric and percentage bid fields (CSO for suppliers page).
- **Buyer-defined quantity tiers.**
  - Oracle "price tiers" are quantity-based and available for all negotiation outcomes. The buyer specifies several quantity levels, and the supplier prices each (https://docs.oracle.com/en/cloud/saas/procurement/26b/oaprc/negotiation-lines.html ; https://docs.oracle.com/html/E37304_01/F383817AN2164C.htm).
  - Ariba supports buyer-defined **volume scales** in pricing conditions, for example tiers at 500, 1000 and 1500 (https://help.sap.com/docs/strategic-sourcing/event-management/rfps-with-pricing-conditions-a5bbf8e9724a4b9fa023d1583ef82aad, via snippet).
  - Ariba also has **supplier-built** tiers as an alternative response: the supplier enters minimum and maximum quantity per tier after the primary bid (https://learning.sap.com/learning-journeys/introducing-projects-within-sap-ariba-sourcing/setting-up-tiered-alternative-responses, via snippet).
  - CSO lists "tiered pricing, bundle and volumetric discounts" (https://www.coupa.com/products/source-to-contract/advanced-sourcing-optimization/).
- **Cost breakdown and one-time costs.**
  - Ariba formulas combine terms, for example Price x Quantity + shipping + taxes + switching. Terms can be participant-specific, such as an import duty for one supplier only. In **Price Breakdown** events suppliers bid only on cost components and there is no item price field (https://learning.sap.com/courses/working-with-pricing-tactics-and-response-options-within-sap-ariba-guided-sourcing/creating-a-custom-formula-within-a-line-item_da514cf2-4777-43b4-919a-74f7e2529859 ; https://learning.sap.com/learning-journeys/introducing-projects-within-sap-ariba-sourcing/adding-new-terms-and-cost-components-in-price-breakdown-events, via snippet).
  - SAP Product Sourcing and S/4HANA use admin-managed **cost breakdown templates** that suppliers fill in (https://help.sap.com/docs/SAP_S4HANA_ON-PREMISE/af9ef57f504840d2b81be8667206d485/fed34e0a1779423e9e3c4fba790e6f2f.html ; https://help.sap.com/docs/strategic-sourcing/sap-ariba-product-sourcing/about-capturing-detailed-cost-breakdowns).
  - Oracle cost factors are a fixed amount per line, a fixed amount per unit, or a percentage of line price, for costs such as duties, storage or transport (negotiation lines page).
  - Explicit "tooling/mold/NRE" as a named standard term: unverified in any vendor. It is modelled as a buyer-defined one-time cost term or a per-line fixed cost factor.
- **Supplier-added items and alternative bids.**
  - Ariba rules "Allow suppliers to add items" and "Allow supplier-added items only in alternative bids" (https://learning.sap.com/learning-journeys/introducing-projects-within-sap-ariba-sourcing/exploring-supplier-added-items-in-events, via snippet). Ariba alternative bid types are alternative pricing, volume tiers and supplier bundles; Guided Sourcing supports only alternative pricing. Alternatives are excluded from ranking by default (https://help.sap.com/docs/strategic-sourcing/participating-in-sourcing-events/topics-about-submitting-alternative-bids ; https://help.sap.com/docs/strategic-sourcing/managing-events-with-guided-sourcing/including-alternative-bids-in-bid-ranking-for-guided-sourcing-events-8fbdaff910fd4c759e1c246e2a729a40).
  - Oracle "alternate lines" can carry a different specification, cost factors or price breaks, and a control allows multiple responses per line (negotiation lines and negotiation controls pages).
  - Keelvar "conditional discounts, item bundles, and alternative bids" (https://www.keelvar.com/sourcing-optimization-software).
- **Excel import and export.**
  - Ariba: bid by email with an Excel bid sheet, custom offline response sheets, and "smart Excel import" to build line items from arbitrary spreadsheets. Importing a bid sheet overwrites existing data (https://help.sap.com/docs/r/caf055b514bb4b5d8121d93b862b0b1a/cloud/en-US/5d43b22a58b94758ba7b7bd746b4c051.html ; https://learning.sap.com/learning-journeys/introducing-sap-ariba-guided-sourcing-projects/using-custom-offline-response-sheets-in-guided-sourcing ; https://procurement.scg.com/AribaSourcing/ariba/resource/en/help/content/trader/import_excel.htm).
  - Coupa: "Import from Excel", with the first tab for pricing and the second for questionnaires (AstraZeneca guide; Compass).
  - CSO: validates each uploaded line and lets suppliers "Submit Selected" valid lines (CSO for suppliers page).
  - Oracle: spreadsheet line import, re-exported between rounds (https://docs.oracle.com/html/E37304_01/F383817AN2164C.htm).
- **Attachments per item.** Ariba supports a reference attachment on a line item (item type 4, `isReference=true`) and participant attachments per term (Ariba API guide). Oracle Redwood supports drag-and-drop attachments with a category such as "To Supplier" (25D What's New).
- **Samples requests.** No vendor documents a dedicated sample-request object with shipment tracking inside an RFx: **unverified**. Typical practice (inferred) is a yes/no question with a date and an attachment inside the event, with the samples themselves tracked outside it.
- **BOM sourcing.** Ariba Product Sourcing, Jaggaer and Ivalua all advertise multi-level BOM plus cost breakdown sourcing (https://learning.sap.com/courses/sap-ariba-sourcing-direct-spend-features-and-functions/explaining-bill-of-materials-boms-in-the-product-sourcing-functionality ; Jaggaer brief ; https://www.ivalua.com/solutions/process/direct-spend-management/direct-materials-sourcing/).

---

## 5. Supplier response experience

**Common practice.**
- The invitation email links to the portal.
- The supplier states intent to participate, or declines with a reason.
- The supplier accepts prerequisites or T&Cs, answers questions and prices, saves a draft, and submits.
- The supplier can revise the submission until the deadline.
- An event message board is used for questions.
- Buyer edits notify suppliers.

**Leading edge.**
- Reason codes for declining individual items or lots.
- Access gates that release confidential content only after an NDA is accepted.
- Two-envelope sealed bidding with staged unsealing.
- Excel line validation.
- 24/7 AI answers to supplier questions (Coupa).

**Vendors**
- **Intent and decline.**
  - Coupa: "I intend" or "I decline", with a reason for declining (AstraZeneca Coupa guide, p.3).
  - Ariba: an "Intends to Participate" button notifies the sourcing contacts (https://eprocurement.nc.gov/responding-ariba-sourcing-event/download). Ariba also has configurable decline reasons and a rule requiring a reason when declining items or lots (https://help.sap.com/docs/strategic-sourcing/common-data-import-and-administration-guide-for-sap-strategic-sourcing-solutions-and-sap-ariba-supplier-management-solutions/how-to-customize-supplier-reasons-for-declining-to-bid ; https://help.sap.com/docs/strategic-sourcing/event-rules-reference/require-supplier-to-give-reason-for-declining-to-bid-on-items-or-lots), and a rule allowing suppliers to decline even after accepting the agreement (https://help.sap.com/docs/strategic-sourcing/event-rules-reference/allow-participants-to-decline-participation-in-events-after-accepting-agreement).
  - Oracle: suppliers "review and acknowledge" invitations (https://www.moci.gov.qa/wp-content/uploads/2026/01/MoCI-External-Supplier-User-Manual-Sourcing-Supplier-User-Process_En_Final.pdf, via snippet).
- **Clarification Q&A.**
  - Ariba: Event Messages lets suppliers compose messages and buyers reply, and messages can go to all participants or individuals (https://learning.sap.com/learning-journeys/introducing-projects-within-sap-ariba-sourcing/customizing-event-messages_ed875a6e-a5d9-4b07-8bb8-9a881d1926ef ; SAP KBA 3181718 on broadcast messages https://userapps.support.sap.com/sap/support/knowledge/en/3181718).
  - Coupa: a Message Center / Instant Messages to the event team, with attachments and history (Compass; AstraZeneca guide).
  - Oracle: "online discussions" (MoCI manual).
  - Fairmarkit: suppliers "can message you directly" (https://docs.fairmarkit.com/buyers/request-for-quote-rfq).
  - Automatic anonymisation when a supplier's question is broadcast: **unverified** for all vendors. The buyer typically re-posts the question manually.
- **Drafts and revisions.** Coupa lets suppliers "update your information as many times as needed" before the deadline (Compass participate page). Ariba lets suppliers revise submitted responses (https://www.hydroone.com/abouthydroone/Suppliers_/Documents/Hydro%20One%20-%20User%20Guide%20-%20Responding%20To%20A%20Sourcing%20Event.pdf). Oracle can require that a new response is lower than the supplier's last one or than the best price (negotiation controls).
- **Amendments and deadline extension.**
  - Ariba: editing a published event creates a draft that replaces the live version when updated. Owners can extend or reduce timing, and participants are notified by message or email (https://help.sap.com/docs/strategic-sourcing/event-management/about-editing-published-events-7c1df32971ea101488e0a5321aa21cb8 ; https://help.sap.com/docs/strategic-sourcing/managing-events-with-guided-sourcing/editing-duration-of-published-events-in-guided-sourcing).
  - Oracle: amendments and new rounds (see section 1).
- **Sealed bids.**
  - Ariba: sealed-envelope bidding opens the technical envelope first and the commercial one after, and can notify the team when an envelope is ready to open (https://help.sap.com/docs/strategic-sourcing/managing-events-with-guided-sourcing/envelope-bidding-in-guided-sourcing-events-0fb89679747c4333a02715b717682dcf ; https://help.sap.com/docs/strategic-sourcing/managing-events-with-guided-sourcing/sealed-bid-events-in-guided-sourcing).
  - Oracle: Open, Blind or Sealed response visibility, and a two-stage RFQ in which the commercial section stays locked until the technical shortlist is decided (https://docs.oracle.com/en/cloud/saas/procurement/25c/oaprc/how-you-use-a-two-stage-rfq.html).
  - Fairmarkit: added a two-envelope sealed-bid option for RFQs in 2025 (release notes).
- **Confidential content.** Ariba can make an item "visible to participants after access gate is cleared" (Ariba API guide), combined with a bidder-agreement prerequisite. This is the platform pattern for an NDA gate before drawings are shown.
- **AI support for suppliers.** The Coupa Navi Supplier Assistance Agent gives 24/7 answers to supplier questions (Nov 18, 2025, https://www.prnewswire.com/news-releases/coupa-launches-new-ai-agents-to-accelerate-source-to-pay-roi-featuring-autonomous-sourcing-collaboration-and-orchestration-302618137.html).

---

## 6. Evaluation and award

**Common practice.**
- Side-by-side bid comparison with totals and savings against current or target price.
- Weighted technical scoring by a team.
- Award per line item, with a split by percentage or quantity.
- The award flows to a contract or PO.

**Leading edge.**
- Optimisation scenarios with constraints such as maximum suppliers, capacity, risk or diversity.
- Composite ranking that combines price and requirement scores.
- Bid transformation, which adjusts each supplier's price for soft costs.
- AI bid-analysis agents that recommend an award.

**Vendors**
- **Ariba.**
  - Manual award scenarios award lots or items and split by percentage or quantity.
  - Optimisation scenarios use goals and constraints, and can be based on score (https://learning.sap.com/courses/project-monitoring-and-event-administration-within-sap-ariba-guided-sourcing/creating-manual-award-scenarios-to-award-guided-sourcing-events ; https://help.sap.com/docs/strategic-sourcing/managing-events-with-guided-sourcing/using-optimization-scenarios-to-award-guided-sourcing-events ; https://help.sap.com/docs/ariba/f5681fbd739744be88f4f5e8f8a49ead/e155593f310c4b828cd986322de6d8a0.html).
  - Bid transformation adjusts the bid-to-beat for each supplier (https://learning.sap.com/courses/creating-sourcing-events-within-sap-ariba-guided-sourcing/understanding-pricing-and-bidding-strategies-within-templates_a29bd6f3-57ff-416d-8f7c-fef578fdd496).
  - Scorecards export all grading (https://learning.sap.com/courses/project-monitoring-and-event-administration-within-sap-ariba-guided-sourcing/viewing-scorecards-and-generating-reports).
  - The award is sent back to S/4HANA to create a PO or contract (S/4HANA integration link in section 1).
- **Oracle.** Scoring teams, knockout at award time, and ranking by price alone or by multi-attribute score (negotiation controls). Composite scoring of pricing plus requirements (https://docs.oracle.com/en/cloud/saas/procurement/25a/oaprc/rank-suppliers-based-on-composite-score-of-pricing-and.html). Award by supplier or by line, and creation of POs or agreements from the award (26B What's New, https://docs.oracle.com/en/cloud/saas/readiness/scm/26b/proc26b/26B-procurement-wn-f42879.htm).
- **Coupa.**
  - CSO models "numerous scenarios", with award criteria that can include risk and diversity goals (https://www.coupa.com/resources/coupa-sourcing-optimization/).
  - Awards and terms flow to Coupa contract management (https://www.coupa.com/products/source-to-contract/).
  - A split-award UI detail is unverified.
- **Keelvar.** "What-if" scenarios with business rules, and Kai recommends an award as soon as bidding closes, either automatically or held for approval (https://www.keelvar.com/sourcing-optimization-software ; https://www.keelvar.com/kai).
- **Jaggaer.** "Scenario-based decision support… real-time scoring, weighting" and an "Intelligent Award Navigator" (brief).
- **Zip.** Weighted sections and automated normalisation (https://zip.com/products/sourcing). Normalisation methods (for example currency, unit of measure or pack size) are unverified across vendors, apart from Ariba bid transformation and Oracle cost factors.

---

## 7. Open-spec / solution-seeking requests

**Common practice.** When the need is not yet specified, buyers use an **RFI**, or an RFP in which the supplier proposes the solution. An RFI "can also include indicative pricing, for example for budget planning purposes", and it is non-binding (https://www.mercanis.com/wikis/what-are-rfx-procedures ; https://www.sifthub.io/blog/rfi-vs-rfp). Oracle describes the RFQ as suitable for "complex and hard-to-define items… such as make-to-order manufacturing" (https://docs.oracle.com/cd/E26401_01/doc.122/e48968/toc.htm, via snippet). Ariba notes an RFI collects supplier information with no pricing, while an RFP collects both information and price (Ariba RFI help page, section 1).

**Leading edge.** Supplier-proposed options expressed as **alternative bids** or **supplier-added items**: Ariba supplier-added items, Oracle alternate lines, and Keelvar and CSO alternative bids. These let suppliers propose "set vs pump-only" style options against the same event and still be compared.

**Indicative vs firm price.** No vendor I checked documents a native "indicative vs firm" price flag: **unverified**. What platforms offer instead:
1. The event type itself: RFI means indicative by convention, RFQ/RFP means firm.
2. Buyer-defined terms or questions such as "price validity date" or "price basis".
3. A follow-on round or copied event in which indicative answers become firm bids. Ariba copy can even carry prior `supplierBids` across (Ariba API guide).

For Paragon an explicit field is recommended; see below.

---

## 8. AI / state of the art, 2025–2026

**Common practice (2026).** AI drafts event content (questions, cover page, RFx document) and summarises or compares supplier responses. Most vendors had shipped or announced this by 2025–26.

**Leading edge.**
- Agents that go from a plain-language brief to a published event, bid sheet and formulas.
- Agents that run rounds and recommend or auto-award within rules, such as Keelvar Kai, Fairmarkit autonomous sourcing and Oracle Autonomous Sourcing Agent.
- Extraction of bids from unstructured supplier files into structured bid lines. This is claimed by Ivalua and implied by Keelvar's file upload, but a dedicated, documented "extract supplier PDF quote into bid grid" feature is **unverified** for the major suites.

**Vendors**

| Vendor | What is documented or announced | Source |
|---|---|---|
| Coupa Navi | Autonomous Sourcing Event Creation (removes template selection and item re-entry); Bid Evaluation Agent; Knowledge Agent inside CSO; Supplier Discovery; Cost Formula Assistance Agent (natural language to cost/scoring formulas); Request Creation Agent (SOW plus file uploads); Supplier Assistance Agent. Nov 2025 | https://www.coupa.com/newsroom/coupas-ai-driven-procurement-saves-customers-almost-15b-in-q3-fy26/ ; PR Newswire link above |
| SAP Ariba / Joule | Joule Agent for bid analysis (compares bids including total cost, recommends suppliers) and AI supplier-response summary for questionnaires, both planned Q1 2026; Sourcing Event Agent to refine events and automate RFP creation | https://news.sap.com/2025/10/sap-connect-spend-management-procurement/ ; https://www.sap.com/products/spend-management/ai-for-procurement.html |
| Oracle | AI Assist for requirements, cover page and supplier suggestions (25D); Autonomous Sourcing Agent for low-value, high-volume buys and Sourcing Command Center (26B, 2026) | 25D What's New ; https://docs.oracle.com/en/cloud/saas/readiness/scm/26b/proc26b/26B-procurement-wn-f42881.htm ; https://www.oracle.com/apac/news/announcement/oracle-ai-agents-help-boost-supply-chain-efficiency-and-strengthen-resiliency-2026-02-10/ |
| Fairmarkit KIT | Plain-English prompts generate the RFx and SOW; AI template recommendation; AI Bid Analysis Agent with chat (2025); "Total Agentic Sourcing" (Apr 2026) | https://www.fairmarkit.com/automation-suite ; 2025 release notes ; https://www.businesswire.com/news/home/20260429737522/en/ (title only, page blocked) |
| Keelvar Kai | Natural-language brief to event, cost formulas and bid sheet; RFI questions generated from a prompt; file upload up to 500MB; converts plain language into optimisation rules; auto-close and award recommendation | https://www.keelvar.com/kai ; https://www.keelvar.com/sourcing-automation |
| Zip | 50+ agents (June 2025) including an RFP Generation Agent and a Competitive Research Agent; RFx generation from "imported documents" | https://cpostrategy.media/blog/2025/06/10/zip-unveils-50-ai-agents-to-automate-procurement-tasks/ ; https://zip.com/products/sourcing |
| Jaggaer JAI | JAI Assist starts RFP creation and supplier evaluation; Copilot and Autopilot on the roadmap (June 2025) | https://www.jaggaer.com/press-release/jai-first-intelligent-ai-copilot-for-procurement-transformation |
| Ivalua IVA | Claims NLP extraction of commercial and technical terms from supplier responses, mapped to scoring criteria (blog; marketing) | https://www.ivalua.com/blog/ai-sourcing/ |
| GEP Quantum | Guided event creation, bid evaluation agents, Cost Driver Agent / should-cost linked to bids | https://www.gep.com/software/gep-quantum-intelligence/procurement/sourcing-management ; https://www.gep.com/software/gep-quantum-intelligence/supply-chain/should-cost-modeling |

---

## Mapping to Paragon's real RFQs

| Paragon case | Closest platform pattern |
|---|---|
| (a) Sticker, 2 items, structured spec, 6 tiers 3K–50K, supplier fills brand/machine/die-cut | Line items with buyer spec terms (value lists) plus **supplier-filled terms** (Ariba `requiredType`, Oracle line attributes) plus **buyer-defined quantity tiers** (Oracle price tiers, Ariba volume scales) |
| (b) Bottle+pump open spec, reference images, recommend set vs pump-only, MOQ 10K/50K/100K | RFI or RFP with reference attachments, plus **supplier-added items / alternate lines** (Ariba, Oracle), plus a price-basis flag (indicative) |
| (c) Lip cream mold, confidential drawings, per-component mold price, cavities, cycle time, capacity, lead time, unit tiers 100K/200K/300K, decoration | **NDA prerequisite plus content visible after access gate** (Ariba); component line items with one-time cost terms (Ariba cost terms, Oracle fixed cost factor); numeric supplier attributes with units; tiers; possibly two-envelope (technical before commercial) |
| (d) Unit box with dieline, tiers 10K–30K | Same as (a), with a per-item reference attachment (Ariba item reference attachment) |
| (e) Full service / ODM: brief, formula options, packaging options 1/2/3, samples, timeline, MOQ 25K/50K per variant | RFP with sections and questions, plus buyer-defined **option lines** (packaging 1/2/3) with tiers; a sample commitment as question plus date (no native sample object found); scored evaluation |

---

## Recommended for Paragon: MVP vs later (20 bullets)

**MVP**
1. **One Request object with a type (RFI / RFQ / RFP)** inside an optional project. Add "Copy to new request", with checkboxes for content, line items, invitees and prior answers, mirroring Ariba `itemsToIncludeForCopy`. This turns (b) or (e) into a firm RFQ round.
2. **Sections plus questions with typed answers**: short text, long text, yes/no, single choice, multi choice, number with unit, money, date, attachment. Each question can be required or optional. This covers (c) cycle time, capacity and lead time, and (e) timeline.
3. **Line-item grid with buyer spec attributes.** Each attribute is set to "buyer fills" or "supplier fills", with optional value lists. For (a) and (d): material, size, colours, finishing, roll and ink standard are buyer-filled; brand, machine and die-cut type are supplier-filled.
4. **Buyer-defined quantity tiers per line**, with a unit price per tier, following the Oracle price-tier pattern. Covers (a) 3K–50K, (c) 100K/200K/300K, (d) 10K–30K and (e) 25K/50K per variant.
5. **Cost terms per line: unit price (per tier) plus one-time costs** (mold/tooling, plate/die, NRE) and freight. Totals are calculated per tier. Covers (c) per-component mold price and (a)/(d) plate and die costs.
6. **Reference attachments at request and line level**: dieline, drawings, reference images, brief. Needed for (b), (c), (d) and (e).
7. **NDA / T&C acceptance gate** before confidential attachments are visible, following the Ariba prerequisite plus access-gate pattern. Required for (c) mold drawings and (e) formula brief.
8. **Price basis flag per response or line (Indicative / Firm) plus price validity date.** No platform does this natively (unverified), but it is essential for (b) and (e) open-spec requests.
9. **Supplier-proposed option lines**: the supplier can add an alternative line (for example "pump only" vs "set") within buyer-set limits, following Ariba supplier-added items and Oracle alternate lines. Needed for (b), and for (e) formula options.
10. **Invite, intent to respond, decline with reason code.** Save draft, submit, and revise until the deadline.
11. **Clarification Q&A**: private question from a supplier; the buyer answers privately or publishes an anonymised answer to all invitees.
12. **Amendment plus deadline extension** that notifies all invitees and flags responses that may need revisiting.
13. **Side-by-side comparison** per line and per tier, including one-time costs and total at a chosen quantity. Award per line with a split by quantity or percentage. Export to Excel.
14. **Buyer templates and "save as template / copy past request"** per packaging category (sticker, unit box, bottle/pump, mold, ODM), with a small admin-managed question and attribute library.

**Later**
15. **Excel bid-sheet download and upload** with per-line validation (Coupa CSO pattern), for suppliers quoting many lines or tiers.
16. **Weighted scoring by an evaluator team**, with knock-out questions (Oracle knockout score) and conditional show-if questions (Ariba conditions, Oracle branching). Useful for (c) and (e) supplier selection.
17. **Two-envelope sealed evaluation** (technical before commercial) for mold and ODM projects, following Oracle two-stage RFQ and Ariba envelopes.
18. **Sample request tracking** tied to a response: requested quantity, due date, received, approved. No platform documents this natively (unverified), and it matters for cosmetics packaging and ODM.
19. **AI request drafting from a brief or email**, generating sections, attributes and tiers (Coupa Navi, Keelvar Kai, Fairmarkit, Oracle AI Assist), and **AI extraction of supplier PDF/Excel quotes** into the grid, with the buyer confirming before it is saved.
20. **AI bid comparison summary and award recommendation** (SAP Joule bid analysis, Coupa Bid Evaluation Agent, Fairmarkit Bid Analysis Agent), then scenario or optimisation award if volumes justify it (Keelvar, CSO, Ariba optimisation).

---

## Main gaps and uncertainties
- Coupa buyer-side authoring (question types, conditions, split award UI) is behind login: unverified beyond supplier-side docs.
- Exact Ariba UI copy options: verified only through the API (`itemsToIncludeForCopy`); the UI checkboxes are unverified.
- No platform verified for: a native indicative-vs-firm price flag, a native sample-request object, automatic anonymised broadcast of supplier questions, or a documented "extract supplier PDF quote into bid lines" feature in the big suites (Ivalua claims it in marketing).
- Jaggaer, Ivalua, GEP and Zip details come from marketing pages and briefs, not help documentation.
