# Supplier user test kit, December 2026 (UCX P3)

**Status:** built 2026-11-22 by step 4 (P3) of Levi's use-case experience review. Not run yet. Every simulated finding it cites is labelled Simulated: a model wrote it. Settings: S4 (the kit is in Indonesian, with an English copy for Levi) and S6 (1 participant per pilot supplier, 75-minute sessions) were answered by Levi on 2026-11-19; S1 to S3 (registration, RFx, invoices) are out.

**How to read this file.** It follows the precedent of the C3 kit (MC-1 and MC-6). Text that a participant hears or reads is in Indonesian (**ID**), with an English copy (**EN**) for Levi. Moderator notes are in English. A portal label reads `Indonesian [English]`, quoted from the portal's Indonesian strings at `gitlab/main` `4d8d48af`. The mockups are English only (a limit, section 2.4).

## 1. Purpose

This test confirms or refutes the simulated findings (`UCX-S`) of `P3-USER-TEST-SIMULATED.md` with real suppliers, and checks the revised proposals that are not built, with drawings (mockups). It serves the review of the supplier experience (P1 duties and goals, P2 proposals, P3 simulation). A model played every persona there. The simulation can show confusing words, missing information and broken paths. It cannot show what a supplier does.

- **Part A** (tasks on the build in production in the test week) confirms or refutes findings about today's experience.
- **Part B** (probes with the mockups) tests proposals that are not built. A probe is not a decision. Each Part B task names the ruling of Levi that it depends on.
- **Planted values.** Each Part B task and two Part A tasks carry one wrong or stale value that a page fills in, against a paper card that holds the right one. The test counts who catches it. It tests the trust a supplier puts in a default.
- **Out of scope:** PTI's side (appendix, section 10), registration, RFx, invoices, file upload (not built: BL-27).

## 2. Setup

### 2.1 The build and the SHA to check

The build in production in the test week (the 4 Nov script allows "the build named by Levi"). Write its commit SHA on every observation sheet. This kit was checked against `gitlab/main` `4d8d48af` (read-only `git fetch gitlab main` on 2026-11-22 at 09:53 WIB; 92 commits after the review SHA `f156bf14`). If the build is newer, run the check of section 4 again and list each difference. **Ruled by Levi on 2026-11-25:** freeze the build on Mon 30 Nov. No production deploy happens from Mon 30 Nov until the last session. Run the check of section 4 on Mon 30 Nov and again before each session.

### 2.2 Changes since the review

Read with `git diff --stat f156bf14 gitlab/main -- src/lib/i18n src/lib/glossary src/router src/data src/services/data/mock`, `git diff --name-only` on the supplier page folders, and `git show` for each quoted item.

| Item | What changed at `4d8d48af` | Effect on this kit |
|---|---|---|
| Routes | No file in `src/router` changed | The routes of section 4 hold |
| Quoted labels | The English text of every quoted label is the same at `f156bf14` and `4d8d48af`. The look-up found 73 of 76 labels as plain strings. Three are built from other strings: the status chips "Awaiting Upload" and "Expiring Soon", and "Quantity (PCS)", which comes from "Quantity ({{uom}})" | The kit quotes the Indonesian strings of `4d8d48af` |
| To do page | `SupplierHome.jsx` did not change | K1 holds as written |
| Stock entry (BL-358, `f17a0cea`) | `mockInventory.js`: the demo material PK-PETB-8801 now holds 2 production runs (20,000 and 40,000). The Enter stock drawer then shows "{{runs}} run produksi tercatat. Formulir ini mencatat satu run; menyimpan akan menggantikannya." ["{{runs}} production runs are on record. This form records one run; saving replaces them."] | K4 uses PK-CAPF-8820 and PK-PETB-8810 only. The council flagged this panel as a fifth page that changed |
| ASN wizard (BL-140, `7b77fc1e`, `fd63194c`) | `SubmitAsnPanel.jsx`, `WizardDetailsStep.jsx`, `WizardPoCard.jsx`, `AsnLinesEditor.jsx` and 4 more files in `SupplierShipments/` changed. A value-limit line now ships against a released call-off | Walk the K6 path once before the first session (section 4, check 5). The batch-header finding (UCX-F8) cites `AsnLinesEditor.jsx`, so its wording on the build may differ |
| Certificate schemes (BL-145, `4b4c13c7`) | "Pajak & hukum" ["Tax & legal"] joins the scheme list | K8 Part A: the list is longer |
| Foresight commitments (CAP-1 wave 3, `a8c358ed`) | 6 component files in `SupplierForecastCommitments/` changed | Walk the K9 path once before the first session |
| Call-off data (BL-360) | Past call-offs 0049 to 0051 of `sup-007` were added. The diff holds no line for CO-2026-0006 or CO-2026-0003 | None |
| Not checked | The other commits of the 92 | Section 4 is the guard |

### 2.3 Demo data and start records

Every participant signs in as the demo supplier `sup-007` ("View as Supplier"), who holds every lane. All participants see the same data. A page reload resets the demo. Each token below exists in `src` at `4d8d48af` (`git grep -l`).

| Record | What it is | Used in |
|---|---|---|
| PO-2026-00121 | Purchase order, Sent. PK-PETB-8802, 80,000 PCS, requested delivery 28 Sept 2026, Rp 98.6jt | K2 |
| PO-2025-00108 | Purchase order, Escalated | K2, K3 |
| CO-2026-0003 | Call-off to confirm | pre-session check |
| CO-2026-0006 | Call-off, Confirmed, PK-PETB-8801, 10,000 PCS, need date 03 Sept 2026 (purchase order PO-2025-00107) | K6, K7 |
| PK-CAPF-8820 and PK-PETB-8810 | The materials listed under "Belum diperbarui siklus ini" ["Still missing this cycle"] | K4 |
| doc-006 | Document request "Please upload COA for batch PKG-2025-441." (Awaiting Upload) | K8 |
| doc-001 | Halal Certificate, Expiring Soon, expires 14 Oct 2026 | K8 |
| ask-0001, ask-0002 | PTI's two questions on the To do page | pre-session check |

### 2.4 Language and the mockups

Set the portal to Bahasa Indonesia (top bar). The mockups were drawn in English and carry English labels. Say so once at the start of a Part B task: "Gambar ini berbahasa Inggris." ["These drawings are in English."]. The simulation also ran on English text, so no result of the kit can be compared with it on wording.

### 2.5 Seats

"View as Supplier" opens a seat that holds every supplier lane. To test a one-lane seat (K1), narrow it: avatar menu → Roles → keep Supplier Fulfilment only. A reload does not clear the roles. Clear them with `localStorage.clear()` and sign in again, as UCX-R6 step 4 says.

### 2.6 Participants (S6) and the order of the pairs

One participant per pilot supplier, the person who answers purchase orders and call-offs today: DP Group (PILOT-01, packaging), DKSH Indonesia (PILOT-02, raw material), Lautan Luas (PILOT-03, raw material). 75 minutes each. **Dates, ruled by Levi on 2026-11-25:** Tue 1, Wed 2 and Thu 3 Dec 2026, one session per day at 10:00 WIB (75 minutes, to 11:15 WIB), with 14:00 WIB as a spare slot for a retry. Supplier days, ruled by Levi on 2026-11-25: DP Group on Tue 1 Dec, DKSH Indonesia on Wed 2 Dec, Lautan Luas on Thu 3 Dec. Confirm each day with the supplier. Names stay out of the sheets.

Every pair of tasks has a Part A and a Part B task on the same duty. Alternate which comes first, so that no task always teaches the next one:

| Pair | DP Group | DKSH Indonesia | Lautan Luas |
|---|---|---|---|
| Purchase orders (K2, K3) | A then B | B then A | A then B |
| Weekly update (K4, K5) | A then B | B then A | A then B |
| Shipment (K6, K7) | A then B | B then A | B then A |

At the start, ask each participant how many purchase orders and call-offs they answer in a typical week. Write it on the sheet. In K3 ask the follow-up "dan jika ada [that number] pesanan seperti ini?" ["and if there were that many orders like these?"].

### 2.7 Materials

- Paper cards in Indonesian (section 5, each task names its card). The cards are the participant's own data for the session. The page and the card disagree on one value in each planted task.
- The mockups, served from `docs/supplier-hub/research/use-case-experience-mockups/` by `python3 -m http.server 5176`: `UCX-P2-confirm-as-requested.html` (K3), `UCX-P4-weekly-page-v2.html` (K5), `UCX-P3-one-shipment-notice.html` (K7), `UCX-P1-one-action-list-v2.html` (K1 probe), `UCX-P5-document-requests.html` (K8).
- Known limits of the drawings. K3: after "Confirm", the list does not redraw (the orders stay "Sent"), and "Undo" only hides the message; the status buttons are inert. K1: the drawing is v2 of the list. Its seat is Supplier Fulfilment only, its lane buttons work, and the link "show 5" shows the rows of the other lanes. The tab "PTI: My tasks" is not used. K7: the "Still needed to continue" message does not update. Tell the participant what the page would do: "Di portal sungguhan daftar ini akan berubah." ["In the real portal this list would change."]
- Stopwatch, observation sheet (section 6), pen.

### 2.8 People

1 participant, 1 moderator (Levi, ruled on 2026-11-25), 1 note-taker (a colleague from Levi's team, as in the C3 kit: the name is not given yet). The moderator plays PTI where a task needs it.

## 3. How a session runs

| Block | Minutes |
|---|---|
| Intro and consent | 5 |
| K1 To do on the build, then the layout B probe | 8 |
| K2 and K3 (order depends on the participant, section 2.6) | 7 + 7 |
| K4 and K5 | 7 + 8 |
| K6 and K7 | 7 + 7 |
| K8 documents (4 on the build, 3 on the drawing) | 7 |
| Optional K9 (Zone Capacity lines) | 3, from the 2 spare minutes and the wrap-up |
| Wrap-up | 10 (9 when K9 runs) |
| **Total** | **75** |

Tasks K1 to K8 take 58 minutes, inside the 60 of the house plan (5 intro, 60 tasks, 10 wrap-up; 6 to 8 tasks per participant). K9 is the ninth task and runs only when time remains. The minutes are estimates: no person has done these tasks yet.

**Moderator rules (house, `SCENARIOS-SUPPLIER.md` section 3) and 4 additions:**

1. Read the prompt as written. Do not name buttons or menus the prompt does not name.
2. Ask the participant to think aloud. When they ask "what do I do?", answer "What would you try?" [*Apa yang akan Anda coba?*].
3. Help only after 3 minutes stuck, or 2 failed tries. Record it as "assisted".
4. Do not explain the demo data. If the participant asks why a number is odd, say "it is sample data" [*itu data contoh*] and move on.
5. **Added:** never say "probe", "proposal", "planted" or "new". Say "gambar" ["drawing"] for a mockup.
6. **Added:** never point at a wrong value. When the page and the card disagree and the participant does not notice, write "missed" on the sheet and go on.
7. **Added:** in Part B ask what the participant expects the drawing to do. Do not tell them what a button does.
8. **Added:** do not suggest an answer to "is this the real portal?": say "ini gambar untuk menguji ide" ["this is a drawing to test ideas"].

**Opening (read out):**

- **ID:** "Terima kasih sudah meluangkan waktu. Hari ini kami mencoba portal pemasok Paragon. Kami tidak menilai Anda, dan tidak ada jawaban yang salah. Jika ada bagian yang membingungkan, itu kekurangan portalnya. Mohon berpikir sambil bersuara: ceritakan apa yang Anda lihat dan apa yang akan Anda coba. Sebagian tugas memakai portal yang sebenarnya, sebagian memakai gambar yang belum menjadi bagian portal. Data di portal adalah data contoh, dan tidak ada yang sampai ke SAP Paragon. Kartu di meja adalah data Anda sendiri untuk sesi ini: pakailah seperti catatan Anda di kantor. Selama tugas, saya tidak akan menjelaskan cara memakai portal."
- **EN:** "Thank you for your time. Today we try Paragon's supplier portal. We do not judge you, and no answer is wrong. If something confuses you, the fault is the portal's. Please think aloud: say what you see and what you would try. Some tasks use the real portal and some use drawings that are not part of the portal. The data in the portal is sample data, and nothing reaches Paragon's SAP. The cards on the table are your own data for this session: use them like your notes at the office. During a task, I will not explain how to use the portal."

**Consent (read out after the opening; the C3 kit's MC-15, accepted by Levi on 2026-11-25):**

- **ID:** "Sesi ini tidak direkam. Catatan saya hanya dipakai untuk memperbaiki portal dan tidak menyebut nama Anda. Boleh kita mulai?"
- **EN:** "This session is not recorded. My notes are used only to fix the portal and do not carry your name. Shall we start?"

**No recording and no consent form** (the C3 kit's MC-13 and MC-15, accepted by Levi on 2026-11-25). The note-taker takes notes only, and the notes carry no names.

## 4. Pre-session check

Run before the first session, and again when the build changes. Tick each line on the observation sheet.

| # | Check | Expect |
|---|---|---|
| 1 | Open the portal on the test laptop with a fresh browser profile. Write the build SHA | Same as `4d8d48af`, or list each difference (section 2.2). The build is frozen from Mon 30 Nov (section 2.1) |
| 2 | Sign in with **View as Supplier**. Set the language to Bahasa Indonesia | Lands on "Yang perlu dikerjakan" [To do] |
| 3 | Read To do | "PTI has 2 questions for you" is there (`ask-0001`, `ask-0002`). The rows of K1 show: "Pesanan pembelian yang perlu ditanggapi" [Purchase orders to respond to], "Call-off dari PTI: ASN-nya belum ada" [Call-offs PTI has sent: the ASN is still missing], "Dokumen yang diminta PTI" [Documents PTI asked for], "Sertifikat kedaluwarsa atau akan kedaluwarsa" [Certificates expired or expiring], "Pembaruan stok mingguan" [Weekly stock update] |
| 4 | Each route below opens the record and the page named | See the table that follows this one |
| 5 | Walk once: the ASN wizard from "Buat ASN untuk call-off ini" [Create the ASN for this call-off]; "Isi stok" [Enter stock] for PK-PETB-8801 (and read its production-run note); Foresight commitments | Each reads as K6, K4 and K9 say. Write each difference under section 2.2 |
| 6 | Serve and open each mockup at 1440 × 900 | No horizontal scroll and no console error (2026-11-22: all five drawings passed: UCX-P1 v2, UCX-P2, UCX-P3, UCX-P4 v2 and UCX-P5; the inert controls of section 2.7 are known) |
| 7 | Print the cards and the sheets. Test the stopwatch | Done |

| Route (typed for the check only) | Record or page to see |
|---|---|
| `#/supplier/home` | To do |
| `#/supplier/orders?tab=action` | PO-2026-00121 (Sent); PO-2025-00108 (Escalated) |
| `#/supplier/call-offs?status=toConfirm` | CO-2026-0003 |
| `#/supplier/shipments?tab=create&po=po-007&callOff=co-0006` | The ASN wizard for CO-2026-0006 |
| `#/supplier/inventory?enter=PK-CAPF-8820` | The Enter stock drawer for PK-CAPF-8820 |
| `#/supplier/inventory?tab=feedstock` | "Feedstock untuk dikonfirmasi" [Feedstock to confirm] |
| `#/supplier/capacity` | Capacity |
| `#/supplier/documents?status=awaiting-upload` | doc-006 (Awaiting Upload) |
| `#/supplier/documents?expiry=expiring` | doc-001 (Expiring Soon) |
| `#/supplier/forecasts?stream=packaging` | Foresight commitments |

The routes come from the P1 walks at `f156bf14` (App evidence). The router did not change. Participants never type a route: they start from To do or the menu.

## 5. Task script

Each task has the house fields (prompt to read out, start, expected path, pass when, watch for, ask after) plus the `UCX-Q` it tests, the `UCX-S` and `UCX-F` IDs it can confirm, and "confirms if" and "refutes if", both observable. A `UCX-S` is a simulated finding (a model's guess). A `UCX-F` is a P2 finding at `f156bf14`. A card is a paper prop with the participant's own data for the task (Indonesian text, English copy for Levi). Nothing in a prompt names a button or a menu.

### Part A: tasks on the build in production

#### K1 To do on the build, then two drawings of the list (3 + 5 minutes; Part A, then a labelled Part B probe)

- **Tests:** UCX-Q8. **Confirms or refutes:** UCX-S4; UCX-F4, UCX-F5, UCX-F23. **Depends on:** Levi's ruling on question 1 (confirmed 2026-11-25): keep the areas of RFX-D20, and show layout B in December as a probe only.
- **Prompt (read out), Part A.** **ID:** "Anda baru masuk ke portal pada pagi hari. Apa yang Paragon tunggu dari Anda, dan mana yang Anda kerjakan lebih dulu? Adakah yang menurut Anda bukan bagian pekerjaan Anda? Jika ada, yang mana?" **EN:** "You have just signed in on a morning. What is Paragon waiting for from you, and which one do you do first? Is there anything you think is not part of your job? If so, which?"
- **Start:** "Yang perlu dikerjakan" [To do] right after sign-in, with the seat narrowed to Supplier Fulfilment (section 2.5).
- **Expected path:** reads the page → names rows such as "Pesanan pembelian yang perlu ditanggapi" [Purchase orders to respond to], "Call-off dari PTI: ASN-nya belum ada" [Call-offs PTI has sent: the ASN is still missing], "Pembaruan stok mingguan" [Weekly stock update] → presses "Buka" [Open] on one row.
- **Pass when:** the participant names at least 3 waiting items, opens one row that lands on the matching records, and names at least 1 row that is not for the Fulfilment lane.
- **Watch for:** the first pick (is it the row with the earliest deadline, overdue 69 days?); whether "Buka" on a row with several records lands on an unfiltered list; whether the participant sees that rows of other lanes show (Sourcing, Documents PTI asked for); the panel and the two PTI questions above the rows.
- **Ask after:** "Apa yang paling mendesak di sini? Dari mana Anda tahu?" [What is most urgent here? How do you know?] "Baris mana yang akan Anda abaikan, dan mengapa?" [Which rows would you ignore, and why?]
- **Part B probe (5 minutes), prompt.** Open `UCX-P1-one-action-list-v2.html`, tabs "A" then "B". Leave "Show" on "All your lanes". **ID:** "Ini dua gambar daftar tugas. Lihat keduanya. Mana yang membantu Anda memutuskan apa yang dikerjakan lebih dulu, dan mengapa?" **EN:** "These are two drawings of a task list. Look at both. Which one helps you decide what to do first, and why?" Say it is a drawing (section 2.7). Watch for a comment on the link "show 5" (do not point at it) and on the order of the rows.
- **Confirms if:** 2 or more of the 3 participants search a list after "Buka" on a row with several records, or name a row of another lane as their own task. **Refutes if:** all 3 reach the matching records in one press and place every row in their lane without help.

#### K2 Answer purchase orders on the build (7 minutes; Part A)

- **Tests:** UCX-Q1 and UCX-Q2, on today's flow. **Confirms or refutes:** UCX-S2; UCX-F27, UCX-F1 (the supplier side of the Escalated row).
- **Card K2 (ID):** "KARTU RENCANA PRODUKSI, Senin 31 Agustus 2026. PO-2026-00121, PK-PETB-8802, 80.000 PCS: Anda dapat mengirim 80.000 PCS paling cepat 05 Oktober 2026 (lini penuh sampai 03 Oktober). PO-2025-00108 tidak ada di kartu." **(EN):** "PRODUCTION PLAN CARD, Monday 31 Aug 2026. PO-2026-00121, PK-PETB-8802, 80,000 PCS: you can deliver 80,000 PCS by 05 Oct 2026 at the earliest (line full until 03 Oct). PO-2025-00108 is not on the card."
- **Prompt (read out). ID:** "Ada pesanan pembelian dari Paragon yang menunggu jawaban Anda. Kartu rencana produksi Anda ada di meja. Jawab pesanannya sesuai rencana Anda." **EN:** "Purchase orders from Paragon wait for your answer. Your production plan card is on the table. Answer the orders the way your plan allows."
- **Start:** To do → "Pesanan pembelian yang perlu ditanggapi" [Purchase orders to respond to] → "Buka" [Open].
- **Expected path:** "Pesanan pembelian" [Purchase orders] → row PO-2026-00121 → "Konfirmasi" [Confirm] → the panel shows "Tanggal pengiriman dikonfirmasi" [Confirmed delivery date] 28/09/2026 and the quantity 80000 filled in → "Sesuaikan" [Adjust] → reason, quantity → "Kirim penyesuaian" [Send adjustment]; or the participant types 05/10/2026 and presses "Konfirmasi pesanan" [Confirm order].
- **Planted value:** the panel fills in the requested date 28/09/2026. The card says 05 Oct 2026.
- **Pass when:** PO-2026-00121 does not end confirmed with 28/09/2026, and the participant says what they do about PO-2025-00108 (status "Dieskalasi" [Escalated]).
- **Watch for:** whether the participant compares the card with the panel before the last press; whether "Konfirmasi" is pressed on the Escalated row; time on the panel.
- **Ask after:** "Hari ini, bagaimana Anda mengonfirmasi PO ke Paragon? Apa yang lebih cepat atau lebih lambat di sini?" [Today, how do you confirm a PO to Paragon? What is faster or slower here?] (house, T2)
- **Confirms if:** 1 or more of the 3 participants confirms PO-2026-00121 with the date 28/09/2026 (a miss), or presses "Konfirmasi" on PO-2025-00108 without reading why it is Escalated. **Refutes if:** all 3 change the date or use "Sesuaikan", and all 3 treat PO-2025-00108 apart.

#### K4 Weekly update on the build (7 minutes; Part A)

- **Tests:** UCX-Q4, on today's flow. **Confirms or refutes:** (no simulated finding stands for this item); UCX-F11, UCX-F30. **Depends on:** nothing (today's build).
- **Card K4 (ID):** "KARTU STOK, Kamis 3 September 2026, 08.00 (stok tersedia / dalam produksi / feedstock). PK-CAPF-8820 Flip-Top Cap 24mm: 1.200 / 0 / 4.000. PK-PETB-8810 PET Bottle 250ml: 6.200 / 10.000 / 0." **(EN):** "STOCK CARD, Thursday 3 Sept 2026, 08:00 (stock on hand / in production / feedstock)." The same figures.
- **Prompt (read out; house T7). ID:** "Sekarang waktunya pembaruan stok mingguan. Kirim ke Paragon stok material yang belum Anda laporkan, lalu konfirmasikan feedstock yang Anda pegang. Kartu stok Anda ada di meja." **EN:** "It is time for your weekly stock update. Send Paragon the stock of the materials you have not yet reported, then confirm the feedstock you hold. Your stock card is on the table."
- **Start:** To do, panel "Pembaruan stok mingguan" [Weekly stock update].
- **Expected path:** "Belum diperbarui siklus ini" [Still missing this cycle] → "Isi stok" [Enter stock] per material → "Stok tersedia" [Stock on hand], "Dalam produksi" [In production] → "Simpan stok" [Save stock]. Then "Konfirmasi feedstock" [Confirm feedstock] → tab "Feedstock untuk dikonfirmasi" [Feedstock to confirm] → "Konfirmasi" [Confirm] → "Kuantitas feedstock" [Feedstock quantity] → "Konfirmasi feedstock".
- **Use only** PK-CAPF-8820 and PK-PETB-8810 (section 2.2: PK-PETB-8801 shows a production-run note).
- **Pass when:** the count of the panel rises to 5 of 5 sent and one material shows feedstock Confirmed (house, T7).
- **Watch for:** where the participant looks for feedstock; whether they see that capacity is due at the same cutoff; the thousands separator message; the time the whole update takes.
- **Ask after:** "Bagaimana Anda mengirim stok ke Paragon sekarang, dan seberapa sering?" [How do you send stock to Paragon today, and how often?] (house, T7)
- **Confirms if:** 2 or more of the 3 participants need help, or look for feedstock inside the stock drawer first. **Refutes if:** all 3 finish without help and name the feedstock step before they are asked.

#### K6 Report a shipment on the build (7 minutes; Part A)

- **Tests:** UCX-Q5, UCX-Q6 and UCX-Q7, on today's flow. **Confirms or refutes:** UCX-S3; UCX-F7, UCX-F8, UCX-F9, UCX-F10. **Depends on:** nothing (today's build). Walk the wizard once first (section 2.2).
- **Card K6 (ID):** "KARTU PENGIRIMAN, Senin 31 Agustus 2026. Call-off CO-2026-0006, PK-PETB-8801 PET Bottle 200ml Frosted, Wardah Series, 10.000 PCS, berangkat dari gudang Anda hari ini. Nomor surat jalan SJ-0831-07. Batch PB-2026-118. Kurir Sample Express Courier, nomor resi SMPL2026001234. Kurir menyebut barang tiba Sabtu 05 September 2026. Pesanan induk masih terbuka 80.000 PCS." **(EN):** the same facts: "DELIVERY CARD, Monday 31 Aug 2026. Call-off CO-2026-0006 ... left your warehouse today. Delivery note SJ-0831-07. Batch PB-2026-118. Courier Sample Express Courier, tracking SMPL2026001234. The courier gives arrival on Saturday 05 Sept 2026. The purchase order behind it has 80,000 PCS open."
- **Prompt (read out). ID:** "Barang untuk satu call-off Paragon berangkat dari gudang Anda hari ini. Paragon perlu tahu, dan gudangnya perlu rincian pengiriman. Kartu pengiriman Anda ada di meja. Beri tahu Paragon semua yang diperlukan." **EN:** "Goods for one of Paragon's call-offs left your warehouse today. Paragon must know, and its warehouse needs the delivery details. Your delivery card is on the table. Tell Paragon everything it needs."
- **Start:** To do → "Call-off dari PTI: ASN-nya belum ada" [Call-offs PTI has sent: the ASN is still missing] → "Buka" → "Call-off" → "Lihat" [View] on CO-2026-0006.
- **Expected path:** the drawer offers "Kirim pemberitahuan pengiriman" [Send dispatch notice] ("Tanggal dikirim" [Shipped date], "Perkiraan tiba" [Expected arrival], "Kuantitas ({{uom}})" [Quantity (PCS)]) or "Buat ASN untuk call-off ini" [Create the ASN for this call-off] → "Berikutnya" [Next] → "Nomor resi atau nomor kendaraan" [Tracking or vehicle number], "Perkiraan tiba", "Sekuens" [Sequence], "Surat Jalan (ID Eksternal)" [Surat Jalan (External ID)], "Nomor batch" [Batch number] → "Berikutnya" → "Kirim ASN" [Submit ASN].
- **Planted value:** the wizard fills the shipped quantity with the open quantity of the order, 80,000. The card says 10,000. If the wizard of the build no longer fills in 80,000 (section 4, check 5), write that on the sheet and score K6 without the plant.
- **Pass when:** an ASN for CO-2026-0006 shows Submitted with 10,000 PCS.
- **Watch for:** which route the participant takes first, and whether they use both; what they type in "Sekuens"; whether they correct 80,000; whether "Berikutnya" stays off and how they find the missing field.
- **Ask after:** "Bagaimana Anda memberi tahu Paragon bahwa barang sudah dikirim? Apa arti 'Sekuens' bagi Anda?" [How do you tell Paragon that goods have shipped? What does "Sequence" mean to you?] Then: "Bayangkan Anda berhenti setelah langkah pertama saja. Apa yang Paragon ketahui, dan apa yang masih kurang bagi gudangnya?" [Imagine you stop after the first step only. What does Paragon know, and what does its warehouse still lack?]
- **Confirms if:** 1 or more of the 3 participants uses both routes, reports 80,000, or cannot say what "Sekuens" is for. **Refutes if:** all 3 report once, with 10,000, and say what "Sekuens" is for.

#### K8 Documents (7 minutes: 4 on the build, then 3 on the drawing; Part A and Part B)

- **Tests:** UCX-Q9 and UCX-Q10. **Confirms or refutes:** UCX-S5, UCX-S6; UCX-F14, UCX-F21. **Depends on:** Levi's ruling on question 12 (confirmed 2026-11-25): a COA request carries its own form fields, and the file route waits for BL-27.
- **Cards (ID):** Card E: "Dokumen di tangan: sertifikat analisis (COA) nomor COA-2025-3317, diterbitkan oleh Sample Lab Services pada 12 September 2025, mencakup 'resin PET, kontak pangan'. Batch yang tercetak di sertifikat: PKG-2025-414." Card F: "Sertifikat halal baru Anda: nomor H-2026-0099, diterbitkan BPJPH pada 20 Agustus 2026, berlaku sampai 20 Agustus 2030, mencakup 'tutup dan botol, semua lini'. Sertifikat lama (berakhir 14 Oktober 2026) hanya mencakup 'tutup'." **(EN):** Card E: certificate of analysis COA-2025-3317, issued by Sample Lab Services on 12 Sept 2025, covers "PET resin, food contact", printed batch PKG-2025-414. Card F: new halal certificate H-2026-0099, granted by BPJPH on 20 Aug 2026, expires 20 Aug 2030, covers "closures and bottles, all lines"; the old one (expiring 14 Oct 2026) covered "closures only".
- **Prompt (read out; house T9). ID:** "Paragon meminta satu dokumen dari Anda, dan satu sertifikat Anda hampir kedaluwarsa. Dokumen di tangan Anda ada di kartu. Selesaikan keduanya." **EN:** "Paragon asked you for a document, and one of your certificates is about to expire. The documents in your hand are on the cards. Deal with both."
- **Part A, start:** To do → "Dokumen yang diminta PTI" [Documents PTI asked for] → "Buka" → "Profil & dokumen" [Profile & documents] → "Nyatakan" [Declare] → "Skema sertifikat" [Certificate scheme], "Nomor sertifikat", "Diterbitkan oleh" [Granted by], "Tanggal terbit" [Granted on], "Cakupannya" [What it covers] → "Catat pernyataan" [Record declaration]. Then "Sertifikat kedaluwarsa atau akan kedaluwarsa" [Certificates expired or expiring] → "Buka" → "Perbarui" [Renew] (a guide) or "Nyatakan sertifikat" [Declare a certificate]. The scheme list also holds "Pajak & hukum" [Tax & legal] (section 2.2).
- **Part B, start:** `UCX-P5-document-requests.html`, tab "Supplier: answer a request", then "Supplier: renew a certificate". Same cards.
- **Planted values:** the drawing fills the batch "PKG-2025-441" (from the request) and the scope "Same scope as the expiring certificate". The cards say PKG-2025-414 and "closures and bottles, all lines".
- **Pass when:** Part A: doc-006 shows Under Review. Part B: the participant reaches the end of each tab.
- **Watch for:** the wish to attach a file (the page says no file is sent); how the participant picks a certificate scheme for a COA; the Renew guide and where it leads; whether the participant says the batch or the scope differs from the card before they send.
- **Ask after:** "Dokumen apa yang paling sering diminta Paragon?" [Which documents does Paragon ask you for most often?] (house, T9) "Apa yang Anda harapkan terjadi dengan berkas Anda?" [What did you expect to happen to your file?]
- **Confirms if:** 2 or more of the 3 participants look for an upload button or pick a scheme without being able to say what it is, or 1 or more of the 3 sends the drawing with the prefilled batch or scope against the card. **Refutes if:** none of these happens.

#### K9 Zone Capacity lines (optional, 3 minutes; Part A, watch only)

- **Tests:** PEX-D22 (UCX-F20). No simulated item. **Depends on:** Levi's ruling on question 3 (confirmed 2026-11-25): keep the acknowledgement, add the bulk action as the smallest change, and decide after the December test. Walk the page once first (section 2.2: rebuilt).
- **Prompt (read out). ID:** "Paragon baru menerbitkan prakiraan. Tinjau periode-periodenya dan tanggapi seperlunya." **EN:** "Paragon has published a forecast. Look through its periods and respond as you see fit."
- **Start:** "Komitmen foresight" [Foresight commitments], the seat with every lane.
- **Watch for:** whether the participant tries to commit beyond their lead time without being asked; how they deal with the many "Tandai diterima" [Acknowledge] buttons; whether they say a bulk action would help.
- **Ask after:** "Baris mana yang menurut Anda perlu jawaban? Apa yang Anda harapkan terjadi setelah Anda menandainya?" [Which lines do you think need an answer? What do you expect to happen after you mark them?]
- **Confirms if:** 2 or more of the 3 participants mark lines one by one and ask for one action for all lines, or try to commit beyond their lead time. **Refutes if:** none does.

### Part B: probes with the mockups

Part B tasks run in the order of section 2.6. Each one uses a mockup, a card and a planted value, and says what the drawing depends on.

#### K3 Answer several purchase orders at once, on a drawing (7 minutes; Part B)

- **Tests:** UCX-Q1, UCX-Q2 and UCX-Q3, on the proposal. **Confirms or refutes:** UCX-S2, UCX-S1; UCX-F27. **Depends on:** call 12 (ruled): the Undo needs a new verb, so this is a probe.
- **Card K3 (ID):** "KARTU RENCANA PRODUKSI, Senin 31 Agustus 2026, diperbarui pagi ini. PO-2026-00121, PK-PETB-8802, 80.000 PCS: Anda dapat mengirim 80.000 PCS paling cepat 28 September 2026. PO-2026-00126, PK-CAPF-8820 Flip-Top Cap 24mm, 120.000 PCS: lini tutup penuh sampai 05 Oktober 2026, jadi Anda dapat mengirim 120.000 PCS paling cepat 09 Oktober 2026. PO-2025-00108 tidak ada di kartu." **(EN):** the same facts.
- **Prompt (read out). ID:** "Ini gambar halaman pesanan pembelian. Tiga pesanan menunggu jawaban. Kartu rencana produksi Anda sudah diperbarui pagi ini. Jawab pesanan sesuai rencana Anda." Then: "Anda baru sadar salah menjawab satu pesanan. Apa yang Anda lakukan?" **EN:** "This is a drawing of the purchase orders page. Three orders wait for an answer. Your production plan card was updated this morning. Answer the orders the way your plan allows." Then: "You realise you answered one order by mistake. What do you do?"
- **Start:** `UCX-P2-confirm-as-requested.html`, tab "Needs action".
- **Expected path:** tick PO-2026-00121 only (not PO-2026-00126, not the Escalated one) → "Confirm 1 as requested…" → read the review panel → "Confirm 1 purchase order"; PO-2026-00126 → "Adjust". After the answer, find "Undo (available for 10 minutes)".
- **Planted value:** the review panel shows PO-2026-00126 as 120,000 PCS by 02 Oct 2026, "Within tolerance". The card says 09 Oct 2026. The drawing does not redraw the list after "Confirm" (section 2.7).
- **Pass when:** PO-2026-00126 stays out of the confirmed set, PO-2026-00121 is confirmed as requested, and the participant finds the Undo or says what they expect.
- **Watch for:** "Select all that can be confirmed as requested" (does the participant think it selects every order?); whether the review panel is read line by line; the chip "Within tolerance"; what the participant thinks PTI sees after an Undo.
- **Ask after:** "Apa yang Anda periksa sebelum menekan tombol terakhir?" [What did you check before you pressed the last button?] "Berapa pesanan seperti ini yang Anda terima per minggu? Bagaimana jika ada sebanyak itu?" [How many orders like these do you get in a week? What if there were that many?]
- **Confirms if:** 1 or more of the 3 participants confirms PO-2026-00126 as requested, or 2 or more cannot say what PTI sees after an Undo. **Refutes if:** all 3 keep PO-2026-00126 out and say what they expect after an Undo.

#### K5 One weekly page, on a drawing (8 minutes; Part B)

- **Tests:** UCX-Q4, on the proposal (v2), then a labelled probe. **Confirms or refutes:** (no simulated finding stands for this item); UCX-F2, UCX-F11. **Depends on:** Levi's ruling on question 6 (confirmed 2026-11-25): stock needs a confirmed figure each week, and "nothing changed" carries only the DA, the due POs and the Foresight periods. Also question 7 (confirmed 2026-11-25): feedstock and in-production are entered on this page through the existing stock verbs. The one-click week of v1 is only a probe. Levi allowed it on 2026-11-25 (checkpoint question 5): run it once, after the main task.
- **Card K5 (ID):** "KARTU STOK, Kamis 3 September 2026, 08.00 (stok tersedia / dalam produksi / feedstock). PK-CAPF-8820: 1.200 / 0 / 4.000. PK-PETB-8810: 6.200 / 10.000 / 0. PK-PETB-8801: 19.500 / 0 / 12.000. PK-PETB-8802: 5.000 / 5.000 / 0. PK-CAPF-8830: 3.300 / 0 / 1.500." **(EN):** the same figures.
- **Prompt (read out). ID:** "Ini gambar halaman konfirmasi mingguan. Batasnya Kamis malam ini. Perbarui stok, produksi berjalan, dan feedstock kelima material Anda sesuai kartu stok." **EN:** "This is a drawing of the weekly confirmation page. The cutoff is tonight. Update the stock, the production in progress and the feedstock of your five materials from your stock card."
- **Start:** `UCX-P4-weekly-page-v2.html`, "Show" = "The weekly page: each material confirmed once".
- **Expected path:** per material: compare the figures with the card → type over a differing figure → "Confirm" [or "Confirm the new figures"] → after 5 of 5: "Confirm the week". Capacity opens on its own page ("Open capacity").
- **Planted values:** PK-PETB-8801 stock 22,000 ("Last confirmed 27 Aug 2026"; the card says 19,500) and PK-PETB-8810 stock 8,500 ("Last confirmed 13 Aug 2026"; the card says 6,200).
- **Probe, after the task.** **ID:** "Bayangkan minggu depan tidak ada yang berubah. Apa yang Anda lakukan di halaman ini?" Select "Probe, question 6 not confirmed: one click for the whole week" and ask: "Apa yang akan Paragon lihat kalau Anda menekan tombol ini? Apakah itu benar menurut Anda?" **EN:** "Imagine nothing changes next week. What do you do on this page?" … "What will Paragon see if you press this button? Is that right in your view?" This is a probe on question 6, which Levi confirmed as recommended on 2026-11-25 (the carry-forward of stock is declined). Levi allowed it on 2026-11-25 (checkpoint question 5): run it once, after the main task.
- **Pass when:** all 5 rows read Confirmed with figures equal to the card, and the participant presses "Confirm the week".
- **Watch for:** whether they type over 22,000 (no age cue) and 8,500 (age cue); whether they confirm a row after a glance only; the column "Last confirmed"; where they expect to do capacity; the time for the whole page.
- **Ask after:** "Bagaimana Anda tahu angka mana yang terbaru?" [How did you know which figures were current?] "Di mana Anda memeriksa angka yang diberikan halaman?" [Where did you check the figure the page gave you?]
- **Confirms if:** 1 or more of the 3 participants confirms a row with a figure that differs from the card (a miss), or 2 or more say they would press the one-click button without a check of the stock. **Refutes if:** all 3 correct both figures, and fewer than 2 would press the one-click button unchecked.

#### K7 One shipment notice, on a drawing (7 minutes; Part B)

- **Tests:** UCX-Q5, UCX-Q6 and UCX-Q7, on the proposal. **Confirms or refutes:** UCX-S3; UCX-F7, UCX-F9, UCX-F10. **Depends on:** Levi's ruling on question 2 (confirmed 2026-11-25): the form fills in the next free sequence number, editable, and the SAP rules still run (AIB-D1), call 13 (ruled: "Mark as shipped" is a Proposed label) and call 10 (ruled: UCX-P3 carries confidence low for its defaults and sequence).
- **Card:** Card K6 (section above).
- **Prompt (read out). ID:** "Ini gambar halaman call-off. Barang sudah berangkat hari ini. Kurir mengatakan barang tiba Sabtu 5 September. Kartu pengiriman Anda ada di meja. Beri tahu Paragon semua yang diperlukan." Then: "Anggap Anda berhenti setelah langkah pertama. Apa yang Paragon ketahui, dan apa yang masih kurang bagi gudangnya?" **EN:** "This is a drawing of the call-off page. The goods left today. The courier says they arrive on Saturday 5 September. Your delivery card is on the table. Tell Paragon everything it needs." Then: "Suppose you stop after the first step. What does Paragon know, and what does its warehouse still lack?"
- **Start:** `UCX-P3-one-shipment-notice.html`, tab "3 Call-off: mark as shipped".
- **Expected path:** "Mark as shipped" → "Complete the delivery details" → type tracking, Surat Jalan and batch → "Next" → tick → "Submit ASN" (tabs 3 to 5).
- **Planted value:** "Estimated arrival" is filled with 03/09/2026 ("From the call-off need date"). The card says 05 Sept.
- **Pass when:** the participant reaches the review tab with arrival 05/09/2026 and says what the warehouse still lacks after step 1.
- **Watch for:** whether they change the arrival date; whether they read the line under "Sequence" ("901 is in use"); whether they think the first step already gives the warehouse its details.
- **Ask after:** "Bagaimana Anda menghitung tanggal tiba sekarang?" [How do you work out the arrival date today?] "Dari mana tanggal di halaman ini berasal?" [Where did the date on this page come from?]
- **Confirms if:** 1 or more of the 3 participants leaves 03/09/2026, or believes the warehouse has the batch after step 1. **Refutes if:** all 3 change the date and name what is left.

## 6. Observation sheet (one per participant)

Header: participant code (DP, DKSH or LL), date, build SHA, order of the pairs (section 2.6), "orders and call-offs answered in a typical week" (asked at the intro). The columns are the house columns of `SCENARIOS-SUPPLIER.md` section 5, plus Part, "Planted value caught" and UCX-Q.

| Task | Part | Result (pass / assisted / fail) | Time (min) | First wrong turn | Words the participant used | Confidence 1-5 | Planted value caught (yes / no / n.a.) | Quote | UCX-Q |
|---|---|---|---|---|---|---|---|---|---|
| K1 To do | A | | | | | | n.a. | | UCX-Q8 |
| K1 two drawings of the list | B (labelled probe) | | | | | | n.a. | | UCX-Q8 |
| K2 answer purchase orders | A | | | | | | | | UCX-Q1, UCX-Q2 |
| K3 answer several at once | B | | | | | | | | UCX-Q1, UCX-Q2, UCX-Q3 |
| K4 weekly update | A | | | | | | n.a. | | UCX-Q4 |
| K5 one weekly page | B | | | | | | | | UCX-Q4 |
| K6 report a shipment | A | | | | | | | | UCX-Q5, UCX-Q6, UCX-Q7 |
| K7 one shipment notice | B | | | | | | | | UCX-Q5, UCX-Q6, UCX-Q7 |
| K8 documents, on the build | A | | | | | | n.a. | | UCX-Q9, UCX-Q10 |
| K8 documents, on the drawing | B | | | | | | | | UCX-Q9, UCX-Q10 |
| K9 Zone Capacity lines (optional) | A | | | | | | n.a. | | none (watch only, PEX-D22) |

"Assisted" follows the house rule: help only after 3 minutes stuck or 2 failed tries. For a Part B task, "pass" means the participant reached the end state of the drawing without help. It does not mean the proposal is right.

## 7. Wrap-up questions

Ask these in this order after the last task. The first 3 are the house questions of `SCENARIOS-SUPPLIER.md` section 5. The fourth is added for Part B.

1. **ID:** "Tugas mana yang akan Anda kerjakan di portal setiap minggu, dan mana yang lebih Anda pilih lewat email atau WhatsApp?"
   **EN:** "Which task would you do in the portal every week, and which would you rather do by email or WhatsApp?"
2. **ID:** "Kata mana di layar yang tidak cocok dengan kata yang Anda pakai di kantor?"
   **EN:** "Which word on the screens did not match the word you use at work?"
3. **ID:** "Apa yang masih kurang agar Anda tidak lagi mengirim informasi ini lewat cara lain?"
   **EN:** "What is missing for you to stop sending this information another way?"
4. **ID:** "Dari gambar-gambar tadi, bagian mana yang tidak akan Anda percaya begitu saja, dan mengapa?"
   **EN:** "From the drawings, which part would you not trust as it is, and why?"

## 8. After the round

1. **Merge the sheets** on the same day: one table per kit task, one row per participant (DP, DKSH, LL), with result, time, first wrong turn, words, confidence, planted value caught and the quote.
2. **Count per task:** pass, assisted and fail out of 3; planted values caught out of 3. With 3 participants the counts show that something can happen. They give no rate.
3. **A task is a finding when** 2 or more of the 3 participants fail it or need help (the house rule). **Added:** a planted value that 1 or more participants miss is a finding about that default, and Levi decides whether it stops the proposal.
4. **Score the simulation.** For each `UCX-Q`, write the simulated verdict (section 6 of `P3-USER-TEST-SIMULATED.md`) beside the real result: "confirmed" when they agree, "refuted" when they differ. Count both. This tells Levi how far to trust a model persona next time.
5. **Log results in `docs/supplier-hub/BACKLOG.md`, by kit task and by UCX-Q.** One row per finding, with the next free `BL-nn` (never renumber, never reuse). Each row names the kit task, the `UCX-Q`, the `UCX-S` it confirms or refutes, the count out of 3, the build SHA and the date. A Part B result that depends on a question Levi has not ruled says "depends on Levi's ruling on question N". Levi confirmed open questions 1 to 12 on 2026-11-25. No open question of P2 is open any more.
6. **Keep this kit unchanged.** Write the merged tables in a new results file in the run folder. P4 (step 5 of the review) reads it.

## 9. Coverage

**Direction 1: each simulated finding to the kit tasks that can confirm or refute it.**

| UCX-S | Kit tasks | UCX-Q | Confirms if (kit) |
|---|---|---|---|
| UCX-S1 | K3 | UCX-Q3 | see "confirms if" of K3 |
| UCX-S2 | K2, K3 | UCX-Q2 | see "confirms if" of K2, K3 |
| UCX-S3 | K6, K7 | UCX-Q5 | see "confirms if" of K6, K7 |
| UCX-S4 | K1 | UCX-Q8 | see "confirms if" of K1 |
| UCX-S5 | K8 | UCX-Q9 | see "confirms if" of K8 |
| UCX-S6 | K8 | UCX-Q9, UCX-Q10 | see "confirms if" of K8 |

**Direction 2: each kit task to the simulated findings and the P2 findings it can confirm.**

| Kit task | Part | UCX-Q | UCX-S | UCX-F |
|---|---|---|---|---|
| K1 | A + B probe | UCX-Q8 | UCX-S4 | UCX-F4, UCX-F5, UCX-F23 |
| K2 | A | UCX-Q1, UCX-Q2 | UCX-S2 | UCX-F27, UCX-F1 |
| K3 | B | UCX-Q1, UCX-Q2, UCX-Q3 | UCX-S1, UCX-S2 | UCX-F27 |
| K4 | A | UCX-Q4 | none (watch only) | UCX-F11, UCX-F30 |
| K5 | B | UCX-Q4 | none (watch only) | UCX-F2, UCX-F11 |
| K6 | A | UCX-Q5, UCX-Q6, UCX-Q7 | UCX-S3 | UCX-F7, UCX-F8, UCX-F9, UCX-F10 |
| K7 | B | UCX-Q5, UCX-Q6, UCX-Q7 | UCX-S3 | UCX-F7, UCX-F9, UCX-F10 |
| K8 | A + B | UCX-Q9, UCX-Q10 | UCX-S5, UCX-S6 | UCX-F14, UCX-F21 |
| K9 | A (watch only) | none | none (watch only) | UCX-F20 |

Check: every UCX-S maps to a kit task, and every kit task maps to a UCX-S or a UCX-F.

## 10. Appendix: PTI items for a later PTI session

The December test is a supplier test. No PTI persona ran in the simulation (budget). The items below wait for a later session with PTI users (Material Planner, Procurement and Compliance seats). Each task prompt is neutral. The mockups are in the run folder.

| # | Proposal and mockup | PTI seat | Task prompt (EN) | Finding it tests | Depends on |
|---|---|---|---|---|---|
| X1 | UCX-P7, `UCX-P7-pti-panels.html` (counter-offer panel) | Procurement | "A supplier changed the quantity of an order. Decide, and say what you need to see first." | UCX-F16 | Levi's ruling on question 5 (confirmed 2026-11-25): CR-05 does not change |
| X2 | UCX-P7 (escalated PO) | Procurement | "An order has had no answer past its deadline. What do you do?" | UCX-F1, a Blocker | Levi's ruling on question 11 (confirmed 2026-11-25): PTI records one of four decisions. The Blocker goes to the backlog first |
| X3 | UCX-P7 (discrepancy and dispute) | Planning | "A receipt differs from the shipment. Settle it." | UCX-F17 | none beyond the proposal |
| X4 | UCX-P7 (alert close) | Planning | "You asked the supplier about an alert. Close the alert." | UCX-F19 | Levi's ruling on question 10 (confirmed 2026-11-25): add the reason "Asked the supplier" and keep BL-150 grouped per supplier × material |
| X5 | UCX-P6, `UCX-P6-da-and-po-on-hold.html` (DA publish) | Planning | "Publish this week's demand anticipation." | UCX-F13 | Question 8: the standing agreement is ruled (Levi, 2026-11-22 09:47:38). Levi ruled no re-ask on 2026-11-25 |
| X6 | UCX-P6 (PO On Hold terms) | Planning | "Choose an option for a line that is on hold." | UCX-F12 | BL-297 (two definitions); question 14 is ruled |
| X7 | UCX-P1, `UCX-P1-one-action-list-v2.html` (My tasks) | Planning, Compliance | "You start your day. What waits for you?" | UCX-F5, UCX-F6 | none beyond the proposal |
| X8 | UCX-P5, `UCX-P5-document-requests.html` (ask and confirm) | Compliance | "A certificate expires soon. Ask the supplier for a renewal, then check a declared one." | UCX-F18, UCX-F31 | BL-27 (no file route) |

## 11. Verification

Final record 2026-11-24 from 19:24 WIB. The record of the simulation is in section 13 of `P3-USER-TEST-SIMULATED.md`.

| Check | Result | Evidence |
|---|---|---|
| Sections in the order of the P3 prompt (1 to 10), with this record as section 11 | PASS | `grep -n '^## '` lists sections 1 to 11 in order |
| The kit is in the S4 language, with an English copy for Levi | PASS | Every participant-facing line has an **ID** line and an **EN** line. Moderator notes are in English, as in the C3 kit. Portal labels read `Indonesian [English]`. I read each **ID** line once |
| The plan fits 75 minutes | PASS on the plan, UNVERIFIED with a person | 5 + 8 + 14 + 15 + 14 + 7 + 10 = 73 minutes plus 2 spare = 75. K1 to K8 take 58 of the 60. Nobody has run the tasks |
| Every task has the house fields, its `UCX-Q`, "confirms if" and "refutes if" | PASS | K1 to K8 hold prompt, start, expected path, pass when, watch for, ask after, tests, confirms or refutes, confirms if and refutes if. K9 is watch only and has no pass criterion by design |
| Coverage in both directions | PASS | Section 9, built by `coverage.py` from section 7 of the simulation file: no gap |
| Constraint 6: neutral prompts | PASS with a note | No prompt names a button or a menu. The plain verbs "jawab", "kirim", "perbarui", "konfirmasikan" and "tanggapi" appear, as in the house prompts. K1 asks a neutral question where UCX-Q8 had led |
| Labels, routes and start records against the current `gitlab/main` | PASS for strings and records, UNVERIFIED on the build | `git fetch gitlab main` (exit 0) gave `4d8d48af`. The label script found 73 of 76 labels, none changed in English. `git grep -l` found all 16 start-record tokens. `src/router` did not change. The changed pages (ASN wizard, Enter stock drawer, Foresight commitments) were read in `git diff`, not walked: section 4, check 5 asks for the walk |
| The drawings load and run | PASS | JS check on 2026-11-22 at 1440 × 900: no horizontal scroll, no external reference and no console error for UCX-P1 v2, UCX-P2, UCX-P3, UCX-P4 v2 and UCX-P5. The inert controls are listed in section 2.7 |
| Nobody has run the tasks, so no time, error rate or catch rate exists | UNVERIFIED | The kit exists to produce them |

**Files created or changed** (paths relative to `reviews/use-case-experience-2026-11/`)

- `SUPPLIER-USER-TEST-KIT-2026-12.md` (new, this file)
- `P3-USER-TEST-SIMULATED.md` (new; the simulation file that this kit serves)
- `mockups/UCX-P4-weekly-page-v2.html` and `mockups/UCX-P1-one-action-list-v2.html` (new; the drawings of K5 and K1)
- `shots/P3/` (new; screenshots of the drawings)
- `research_notes/` (new; work log, scripts, fragments and the blind runs)
- Nothing in `paragon-supplier-portal/`. No commit, no push.
