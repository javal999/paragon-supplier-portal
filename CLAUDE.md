# Claude Code — Project Rules

## Branch policy
- Branch off `main` for every task (e.g. `chore/...`, `qa/...`, `feat/...`)
- Open a merge request to `main` on GitLab (`git push -o merge_request.create
  -o merge_request.target=main gitlab <branch>`); never push directly to `main`
- The CLI merges the MR at the head SHA the operator approved, once its pipeline
  is green: **never squash, never delete the source branch at merge** (Squash
  and Delete source branch both unticked), with an identity-clean merge commit
  (explicit subject, empty body); the operator directs and approves. The branch
  is deleted BY HAND afterwards, and only after asserting AT THE SITE that its
  tip is an ancestor of `main`. **A merge commit is the standing form, not a
  mode chosen per MR** (the doctrine below calls it `--merge`, the name it had
  on GitHub) — the reason is in the merge doctrine below, and it is worth
  reading before merging anything, because a rule without its reason gets
  re-derived wrongly

### ⚠️ MERGE DOCTRINE — BOTH DIRECTIONS. RECOVERED AND EXTENDED (§59c, 2026-08-26)

⚠️ **PROVENANCE FIRST, BECAUSE IT IS THE WHOLE ARGUMENT FOR THIS SECTION
EXISTING.** The first half below was ratified 2026-08-14 and has governed every
dispatch since — and it lived **only on `qa/chaos-ambience-pin` (PR #227), which
was closed unmerged on 2026-08-20.** `grep -in "merge doctrine"` over every `.md`
on `main` returned nothing; `main`'s sole trace of it was one sentence in
`docs/findings.md` recording that it was *absent*. **A doctrine whose only copy
is in a pull request is enforced by memory, and memory is the instrument this
register exists because it does not trust.** It is restated here verbatim, not
re-derived. That is `FLOOR-IN-PROSE-01`'s shape applied to a rule instead of a
number.

**HALF ONE — A MERGE INSTRUCTION NAMING A PR THE SEAT HAS NOT ITSELF REPORTED IS
A REQUEST TO VERIFY, NOT TO MERGE (ratified 2026-08-14).**

**The seat MUST refuse it, and refusing is doctrine rather than judgement.**
Two merge instructions were issued in one arc for PRs that had never existed —
`#226` before it was opened, and `#228` which was never opened at all. Both were
refused, and the refusal is the only reason neither cost anything.

The mechanism, named by the strategist against themself: **A PLAN WAS READ AS A
RESULT.** The seat reports what it *would* build; that report is read as a build
report; artifacts that exist only in a description get ruled on. **The
strategist will not issue a merge instruction without a SHA and a PR number
reported by the seat in the turn immediately prior.** Absent both, the
instruction is a request to verify.

⚠️ **AND THIS IS THE CLASS THE DISCIPLINE WAS NOT PROTECTING AGAINST, BECAUSE
THE DISCIPLINE RUNS ON THE CODE SIDE AND THE DISPATCH SIDE HAD NO GATE.** Every
code-side inverted premise costs a report, which is recoverable by measuring
again. A merge is not. So before ANY outward or irreversible step — merge, push,
publish, delete — assert the object exists **at the site the action names**
(the MR page or API, `git branch`, the file itself), never from the conversation
that described it. See `docs/findings.md` §43a.

**HALF TWO — A REPORTED SHA IS A CLAIM, NOT A FACT (ratified 2026-08-26).**

**Before the strategist rules on any merge report, THE SEAT VERIFIES ITS OWN
REPORTED SHA WITH `git cat-file` AND STATES THE RESULT.** State the negative
control too: a report that says only *"verified"* is indistinguishable from a
report that ran nothing (`EMPTY-INPUT-REPORTS-CLEAN-01`), so name at least one
object the check was expected to REJECT and show that it did.

⚠️ **THIS CLOSES THE DIRECTION HALF ONE CANNOT SEE, AND IT IS THE DIRECTION THAT
ACTUALLY FAILED.** Half one stops the strategist naming a PR the seat did not
report. **It has nothing to say when a report NAMES one and the strategist
ACCEPTS it** — which is the same object arriving through the one door the rule
holds open, wearing the credential the rule asks for. An unknown number of
rulings were made against merge reports citing PRs and SHAs this repository has
never held (`9c31c7f` · `#226` · `#228` are the ones recovered; the register
under-counts the class by construction, because a claim refused in conversation
leaves no trace). **The tree was sound throughout. The account of it was not**,
and no gate in this project reads an account.

⚠️ **THE COST ASYMMETRY IS WHY THIS IS DOCTRINE AND NOT A HABIT.** The check is
one command and cannot fail slowly. A merge performed on a SHA that does not
exist fails loudly; a merge performed on the WRONG object that does exist does
not fail at all. Half one guards the cheap direction. This guards the expensive
one. Filed as `DISPATCH-HEADER-CITES-A-NONEXISTENT-OBJECT-01`
(`docs/findings.md` §59c), whose subject is the same object one step earlier —
a SHA in a dispatch HEADER, arriving in the position that reads as context
rather than as claim, which is exactly what makes it the cheaper place to put a
wrong object.

**HALF THREE — AND THE STRATEGIST'S OWN FIGURE IS A CLAIM TOO (ratified
2026-09-11).**

⚠️ **A MERGE IS AUTHORISED BY A BRANCH AND ITS HEAD, VERIFIED AT THE REMOTE IN
THE SAME TURN — NEVER BY A NUMBER THE STRATEGIST STATES.** Halves one and two
both read the SEAT's claim: one when the seat has not made it, the other when it
has. **Neither says anything about the figures the dispatch itself carries**, and
those arrive in the header, in the position that reads as context rather than as
claim — which `DISPATCH-HEADER-CITES-A-NONEXISTENT-OBJECT-01` already named as
the cheapest place to put a wrong object, without drawing the conclusion that the
header is a claim.

⚠️ **AND THE CORRECTION DOES NOT PROPAGATE BY ITSELF, WHICH IS THE HALF THAT
MAKES THIS DOCTRINE RATHER THAN A HABIT.** Measured across one session
(`docs/findings.md` §104): every wrong figure was derived and reported false ON
THE TURN IT ARRIVED, and the next dispatch's header carried it again. **Detection
was never the failure.** So the remedy is not "check harder" — it is that the
number never had authority in the first place: resolve the subject by BRANCH AND
CONTENT, state the branch head you verified, and treat a PR number or a floor in
a dispatch as a label on the work, not as its identity.

⚠️ **A WRONG NUMBER NEAR A RIGHT ONE IS THE DANGEROUS SHAPE, AND A SHA HAS NO
NEIGHBOURHOOD.** A floor of `4708` against a real `4709` is indistinguishable
from a legitimate reading; a 40-character content address is caught on contact
because it has no plausible near-miss. **The counts are where this class hides**,
and `FLOOR-IN-PROSE-01`'s remedy is already the answer: derive it, do not check
it.

### ⚠️ A MECHANISM WHOSE SUCCESS SIGNAL IS SILENT ABOUT THE DAMAGE IT DOES

Ruled 2026-08-27, from **four members measured in one session** — the drain of
a five-PR stack. Each of the four reported success. Each was doing damage its
success signal does not mention. They are one rule because the remedy is the
same in all four: **the signal is not the state; go and measure the state.**

| Mechanism | What it reported | What it was actually doing | The measurement |
|---|---|---|---|
| CI on `pull_request: branches: [main]` | `mergeStateStatus: CLEAN` | never ran — a PR based on a feature branch is outside the trigger | three PRs of the stack carried Vercel checks only; `build · floor · test:gate` was **absent** from `gh pr checks` |
| **squash**-merge on a stacked chain | merged · branch deleted · green | severed ancestry, so the next link's merge-base never advances | `main` tree **==** `pr/262` head tree (`39e955ae8359…`) while `pr/262` was **not an ancestor of main**; the next merge then conflicted in six files, one of them `add/add` |
| `--delete-branch` on a stacked chain | merged · branch deleted | **closed the next PR**, whose base ref ceased to exist | #263 merged `06:03:10Z`; #264 `base_ref_deleted` **and** `closed` at `06:03:12Z` |
| retargeting (`gh pr edit --base main`) | `mergeable=MERGEABLE` · `CLEAN` | did not gate — `edited` is not in the default `types` set | two retargeted PRs reached CLEAN with **no gate run**, which would have silently undone the fix for the first row |

⚠️ **`CLEAN` IS NOT EVIDENCE.** It answers *"is anything blocking?"*, and *"no
check was required"* is one of the ways nothing blocks. **Read the check LIST,
by name; say plainly when the gate is ABSENT.** Never report an aggregate — an
aggregate cannot distinguish "everything passed" from "nothing was asked."

**The operational rules that follow. Not advisory:**

- ⚠️ **`--merge` IS THE STANDING FORM FOR EVERY PR. NEVER SQUASH. THIS IS
  UNCONDITIONAL AND THE UNCONDITIONALITY IS THE POINT.**

  **The reason, which must travel with the rule: a merge commit keeps the
  branch head reachable as a parent after the branch is deleted.** Every merge
  report in this register cites a branch SHA, and squash makes that SHA
  unreachable *by construction* — the branch head is never an ancestor of
  anything, so deleting the branch destroys the only ref to it. `--merge`
  removes the problem at the source, which is what makes the *"cite only
  post-merge `main` SHAs"* workaround unnecessary rather than merely
  inconvenient. **Demonstrated, not asserted:** at #299,
  `f2feefb467f9555572b717a3e0f7d8384ec64a44` still resolves under `git cat-file
  -e` with its branch deleted, because it is parent 2 of the merge commit.

  ⚠️ **DO NOT RE-DERIVE THIS RULE FROM THE STACKED-CHAIN CASE.** The sentence
  that stood here read *"Squash remains the default for an ordinary single PR
  — the defect is squash **on a chain**, not squash."* That is what this
  paragraph exists to retract. Reasoning from the exception reinstates a
  **per-PR judgement about which mode applies, and that judgement is where the
  five-PR stack went wrong** — the table above is what it costs. A seat that
  has to decide will one day decide wrong; a seat with one form cannot.
  (It ALSO protects a chain's ancestry, which is what the next link's
  merge-base reads. That is a consequence of the rule, never its ground.)
- ⚠️ **AND C10 §9 STILL SAYS THE OLD THING — FILED, NOT EDITED**
  (`C10-DIVERGENCE-PREMISE-NO-LONGER-MET-01`, `docs/findings.md` §88).
  `docs/contracts/C10-identity.md:683` reads *"Squash-and-delete makes a branch
  SHA unreachable by construction, so it is cited after merge or not at all."*
  **That sentence is ACCURATE and is NOT being amended.** Squash really does
  make a branch SHA unreachable; what changed is that we no longer squash, so
  its conclusion no longer binds us — **a contract describing a mechanism
  correctly is not falsified by our choosing a different one.** C10 is
  byte-identical to `dc8e774` and an amendment is a new SHA and a new
  ratification with SOMO, so the divergence lives in the register and this
  pointer, never in the contract.
- ⚠️ **NEVER `--delete-branch`. ON ANY PR.** It closed **#264** two seconds
  after **#263** merged — `base_ref_deleted` and `closed` at `06:03:12Z`
  against a merge at `06:03:10Z` — and its success signal said *merged · branch
  deleted* throughout. (On GitLab the same flag is the *Delete source branch*
  box: leave it unticked.) Delete BY HAND afterwards, and **assert at the site of
  the action first**: read the remote's own refs (`git ls-remote gitlab
  refs/heads/<branch>` and `refs/heads/main`), assert by EXIT CODE that the
  remote branch tip IS an ancestor of remote `main` and that `main` is NOT an
  ancestor of the branch, then `git push gitlab --delete <branch>`. Reading the
  local cache is not reading the site. Same unconditional shape and the same
  reason: a flag that fires automatically cannot be told to wait for a check.
- **A retarget requires a gate run.** On GitHub, retargeting emitted `edited`,
  which is why `types:` was spelled out in `.github/workflows/gates.yml` (now
  manual-dispatch only). If a retargeted MR still shows no gate for the new base,
  run the four locally on the merged base **and say that the local run is the
  only gate record there is.**
- **Repair a severed chain with `git merge -s ours main` on the branch** — never
  `-X ours` / `-X theirs`, which are a different operation and DO discard
  content. Assert the branch's tree SHA is the **same object** before and after;
  if it moved, what ran was not what you meant.

## Session startup — run these commands every time
git checkout main && git pull gitlab main

## Workflow for every task
1. git checkout main
2. git pull gitlab main
3. git checkout -b <type>/<short-description>
4. Make changes
5. git add .
6. git commit -m "description"
7. git push -u gitlab <branch>
8. Open an MR to main (`git push -o merge_request.create -o merge_request.target=main
   gitlab <branch>`); the operator directs and approves, then the CLI merges the
   MR at the approved head SHA once its pipeline is green (never squash, never
   delete the source branch at merge, identity-clean merge commit)
9. Delete the branch by hand, after asserting at the site that its tip is an
   ancestor of `main`

## Why
This project uses a branch + MR + CLI-merge workflow (the ratified four-actor
model). Changes reach `main` only through a reviewed MR: the operator directs
and approves, and the CLI merges it as a merge commit. Direct pushes
to `main` are not used.

⚠️ **THE MERGE MODE IS PART OF THE WHY, NOT A DETAIL OF THE HOW.** A squash
would satisfy every sentence above and still break the register, because what
this project cites in a merge report is a BRANCH SHA and squash makes one
unreachable by construction. **The mode is unconditional so that no seat has to
decide it** — see the merge doctrine for the full argument and for the four
mechanisms whose success signals said nothing about the damage they did.

## Current state

> ⚠️ **AUTHORISATION NOW EXISTS (Batch A, §64).** `resolveRoles` no longer widens
> a persona to its whole atom set: it resolves the SEAT's business roles
> (`services/transitions/businessRoles.js` — **derive the roles from the
> `SystemRoleId` union and `LANE_BUNDLES`; no figure is written here** — plus an
> `automation` grant that is deliberately NOT assignable to a person).
> **There is no persona fallback**; a command scope without `businessRoles` is
> refused, because a fallback is the wildcard with better manners. The cascade
> fan-out runs under the automation grant — it re-dispatches inside a `catch {}`,
> so it is the one path where a narrowed grant deletes a reachable act in
> silence. `PERSONA_ROLES` survives as a DERIVED tenancy view and is no longer an
> authorisation source. **Do not restate the atom or role counts here** — derive
> them from `SYSTEM_ROLES` × `catalogRoles()`; the bilateral gate in
> `businessRoles.test.js` is what keeps them honest.
>
> ⚠️ **AND `readScopeOwner: () => null` DENIES EVERY SUPPLIER — IT DOES NOT MEAN
> "NOTHING TO COMPARE" (§86).** The dispatcher's supplier arm compares
> `owner !== scope.supplierId` UNCONDITIONALLY. It used to guard that clause with
> `owner !== null &&`, which on an owner-less target could never be true — so a
> supplier fell through scope to the ROLE gate on a row that EXISTS and was denied
> at SCOPE on one that does not. **The refusal KIND was an existence oracle**,
> across a tenancy boundary, on the write path. **Do not restate which targets are
> owner-less** — it was filed as two and derived as five, and
> `ownerlessScope.test.js` re-derives the set every run from each target's own
> `readState` / `readScopeOwner`. A target that wants a supplier to reach a verb
> must NAME that supplier; returning `null` because the owner is merely UNKNOWN
> now silently denies a legitimate act instead of admitting one.
>
> **The cross-role handoff renders the wait, not a gap** (`handoff.js` +
> `HandoffNotice` + `useVerbAvailability`) — wired across the BUYER surfaces at §72–§76, and it is **ONE NOTICE PER VERB, IN THAT VERB'S OWN SLOT** (§76 retired §74's per-group collapse: the RFQ side panel is a WORKSPACE, not a control, and the two verbs one group notice spoke for are not co-reachable on any RFQ in the tree).
> ⚠️ **DO NOT RESTATE HOW MANY SURFACES CARRY IT** — the sentence that stood here was a prose count and it was wrong TWICE, once per batch, which is `FLOOR-IN-PROSE-01` in the paragraph about handoffs. Derive it as **(surface × verb)** from the `testId="handoff-…"` sites against BOTH dispatch families. **THE SUPPLIER SIDE IS COVERED TOO, AND THE SENTENCE THAT SAID OTHERWISE IS DELETED RATHER THAN CORRECTED.** It read *"every supplier-side surface (a supplier seat is exactly `['supplier']` — no proper subset to narrow to, so every notice is dead branch)"*. That reason died at #263, which seeded `commercial` · `fulfilment` · `back_office`; **six supplier surfaces already carried notices while it still stood**, so it was describing the tree it was filed against, not the tree. Derived today: **no supplier atom is held by all three lanes** — the intersection is EMPTY — so "every lane holds it" is never the reason on this side. What is deliberately NOT covered: every control that holds **no atom** (toasts and reads are ungoverned, not withheld — §75e), and **`GRInspectionWizard`'s interior** (`WIZARD-ADMITS-A-SEAT-IT-WILL-REFUSE-01`, OPEN — closed at both known entrances, unprobed within).
>
> ⚠️ **AND A NOTICE ON THE SURFACE IS NOT COVERAGE OF THE VERB — THE ENTRANCE IS THE UNIT (§84).** `SupplierOrders` imported the guard, rendered it, and still shipped a live commit: `po:confirm`'s notice gated the `detail` footer, while `handleRowAction` opened the panel *directly* in `editing` mode, where the commit sat ungated behind a comment asserting it was "unreachable behind this one." **That comment was the only thing holding the claim up, and it was false.** Derive coverage as **(surface × verb × ENTRANCE)**, never (surface × verb): a mode reached three ways is guarded when the MODE is gated, not when one door is. And gate the mode rather than the door for a second reason — **component state outlives the seat**: a seat narrowed WHILE a panel or tab stands open is reachable, not a dead branch (`SupplierShipments` says so in its own comment and is the precedent to copy).
> ⚠️ **AND THE SEGREGATION THE BUNDLES EXPRESS IS CROSSED BY ONE SURFACE (`SEGREGATION-CROSSED-IN-ONE-DRAWER-01`, §76d, OPEN).** `BuyerRequisitions`' drawer offers `pr:revise` → `pr:submit` → `pr:approve` on the same document to the same seat, and the DEFAULT buyer seat holds all six role bundles — so adjust-then-approve-what-you-adjusted is the out-of-box state, not a misconfiguration. A per-transition dispatcher cannot catch it: segregation is a property of the SEQUENCE. **Do not "fix" it with a notice or a role gate without the ruling** — §76d names the two candidate readings and measures that the actor-level one is unbuildable until an IdP answers (`actor` is always `UNATTRIBUTED: NO_PERSON_IN_SESSION`).
> 
> ⚠️ **AND IMPORTER PRESENCE IS NOT VERB COVERAGE (`IMPORTER-PRESENCE-IS-NOT-VERB-COVERAGE-01`, §72a).** `BuyerRequisitions` imported the guard, rendered four of them, and still shipped a live **New PR** button to a seat holding no `pr:create` — because all four guarded verbs act on a document already selected and the CREATE verb lives in the page header. Derive the exposure as **(surface × verb) → guarded?**, never as **surface → imports the guard?**, and derive the surfaces from BOTH dispatch families (`commandHooks` AND the `sdc*Hooks` that call `svc.commands.dispatch` directly — a `commandHooks`-only matcher misses seven verbs).
>
> The resolved actor is a SEAM, not a person: `CurrentIdentity.actor` is always
> `UNATTRIBUTED: NO_PERSON_IN_SESSION`. **C10 §6.2's payload-refusal half is NOT
> built** and is guarded by a tripwire in `simUsrNamespace.test.js` — the moment
> shipped code constructs a `RESOLVED` actor, the refusal must land first.
>
> **AUTHORISATION IS NOW VISIBLE (§65).** The identity panel (`IdentityPanel`,
> in the avatar) states the seat's role and the scope it grants, and is the ONE
> role control — a sidebar chip block was built and rejected, and must not come
> back. `/buyer/roles` is a READ-ONLY catalogue (list → detail), derived from
> `SYSTEM_ROLES` × `getKnownFlows()`. It is UNGATED deliberately: **no page in
> this platform has ever gated on role**, no atom could express it (C10 §3.3),
> and the gate is filed as the precondition of EDITABILITY, not of reading.
> Nothing persists a custom role — no store, no target — so duplicate-and-narrow
> is a store, a verb and a merge rule, not a page feature.
>
> **CUSTOM ROLES EXIST, FOR THE SESSION (§66).** A custom role is
> `{ parent, adds }` — a PARENT REFERENCE resolved at read, never a snapshot of
> atoms, because a snapshot silently keeps yesterday's truth the moment the
> parent gains one. It is granted by `t_role_grant` (`flows/role.flow.js`),
> which follows `t_enforcement_set` verb for verb: single state `Defined`,
> `statePreserving`, append-only ledger, CommandTarget, policy hook, and
> `entityId` IS the parent `SystemRoleId`. **`role:grant` is a `compliance`
> atom** — whoever can edit roles can grant themselves any verb, so procurement
> cannot hold it. **A CUSTOM ROLE MAY NOT SPAN TENANCIES**, refused at the verb
> by name, per atom. The store (`services/transitions/customRoles.js`) is
> **PERSISTED in `localStorage` under `paragon.customRoles`** (operator ruling,
> superseding session scope: an honest statement does not repair an experience
> that looks like a defect). **Only CUSTOM roles are written** — the seeded ones
> stay derived from the frozen constant, and a stored row claiming a system id is
> refused ON READ by name. **The read fails honestly:** absent, corrupt and
> unparseable are distinguished from empty (`readState().unreadable`), every row
> is re-validated through the SAME predicates the verb calls, and refusals are
> rendered rather than absorbed. A grant is still recorded against
> `UNATTRIBUTED: NO_PERSON_IN_SESSION`, and the surface says so before the act. **Every SEAT resolves through `atomsForSeat`, never
> `atomsFor`** — the call sites are derived from source and allowlisted
> bilaterally in `businessRoles.test.js`. **ASSIGNING a custom role to a seat is
> NOT built** (§66k): `rolesFromStorage` would silently re-widen such a seat to
> its whole persona on reload, and that line is the assignment batch's first fix.
>
> ⚠️ **THE BUYER SIDE NOW HAS A ⊥, AND THE WALL IT REMOVES WAS NEITHER
> SUBTRACTION NOR LANE GRANULARITY.** `atomsOfCustomRole` is the UNION and is
> additive-only by ruling, so the NARROWEST child of a parent is the parent —
> which means what a side can express bottoms out at its smallest bundle.
> Measured: the supplier side's smallest was the zero-atom `supplier` anchor, so
> every supplier atom-set was already exactly constructible; the buyer side's
> smallest were `finance` and `requisitioner`, so every buyer custom seat carried
> unrelated authority it could never shed. The remedy is the mirror — one
> zero-atom `buyer` anchor — and it required **no change to
> `copyableParentRefusal`, to the additive-only merge rule, or to any lane's
> membership** (asserted in `buyerAnchor.test.js`, because an unasserted "it
> needed none of those" is prose). **Do not restate the lane sizes or the role
> count here** — derive them from `SYSTEM_ROLES`; the figures above are named as
> the measurement that motivated the batch, not as a standing tally. It is
> **OFFERED AND NOT SEEDED**, exactly as `buyer_all` is: §76d's seed collapse is
> the operator's ruling and this did not pre-empt it.
>
> ⚠️ **AND THE BILATERAL CATALOGUE GATE WAS BLIND TO EVERY ZERO-ATOM BUNDLE,
> WHICH IS A VACUITY RATHER THAN A GAP.** Both directions assert over the UNION
> of the bundles, and an empty bundle contributes no member to reject and removes
> none — so the gate read green whether a bundle held nothing BY DESIGN (an
> anchor) or BY ACCIDENT (a lane emptied by a bad edit). It had been blind since
> the supplier anchor landed. Closed positively: `TENANCY_ANCHORS` is pinned
> EQUAL to the derived set of zero-atom bundles, so a lane that empties JOINS it
> and an anchor that gains an atom LEAVES it, and either is red. Mutation-probed
> with the union assertion deliberately made trivially true — the anchors
> assertion is what fires.
>
> ⚠️ **`ROUTE-SMOKE-GUARD-IS-SELF-REFERENTIAL-01` (§65a).** `allRoutes.smoke`'s
> coverage guard asserted its OWN table's length against a hardcoded number and
> never read `AppRouter` — it could not detect the defect its comment named, and
> was hiding three untested routes. It now DERIVES from the router source and
> asserts membership both ways. **A page also has to bring its own chrome:**
> `AppRouter` is a flat `<Routes>` with no layout route, so a page that forgets
> `AppShellV2` renders with no sidebar and no way back, and
> `renderWithProviders` will never say so.
>
> ⚠️ **THE APPROVAL BAND IS AUTHORED, AND THE LADDER IS UNBUILDABLE — NOT DEFERRED
> (§69).** `approvalLevel` ('Section Head' / 'Procurement Head' / 'VP Procurement')
> tracks `estimatedValue` closely enough to read as computed and **nothing computes
> it**: zero relational or arithmetic reads of `estimatedValue` exist in the tree and
> no threshold number exists in `src/` or `docs/`. The surface now SAYS it is
> authored; `approvalBandAuthored.guard.test.js` re-derives it every run (write-site
> assertion primary, read-site secondary and labelled weaker).
> **Both readings of what a band decides fail independently:** WHO MAY APPROVE needs
> seniority roles that do not exist and C10 §3.4 forbids minting (*"a new role per
> band"*); HOW MANY APPROVALS needs the `ApprovalPolicyAct` × `ApprovalAct` ledgers
> C10 §3.5 defers. Either ground alone is sufficient.
>
> ⚠️ **AND DO NOT INHERIT "THE POLICY HOOK CANNOT SEE THE DOCUMENT" — IT IS FALSE AND
> IT HAS ALREADY STOPPED ONE BATCH.** `PolicyHookFn` takes ONE ctx
> (`{ entityId, currentState, toState, payload, target, scope }`), `CommandTarget.
> readEntity` is *"Full entity for policy hooks to inspect"*, and FOUR shipped hooks
> read a document through it (`src/services/transitions/policies/`) — none by importing a
> store. What a threshold lacks is the RIGHT-HAND SIDE of the comparison, not the
> left. A role-gated VALUE policy (value from `readEntity` × lane from
> `scope.businessRoles`) is buildable today and is **not** the ladder: it
> discriminates lanes, and the rungs are altitudes.
Re-baselined by the **Canon True-Up** (2026-07-14). The prior "main @ #53" pointer
was stale by ~12 commits; F0 (contract-freeze) and the I3 compliance phase are DONE,
and the Stage G planning canon + World-Class Build Plan are now on main.

- **Phases 0 → 2′ (historical, all merged).** Phase 0 (PRs #11–#17); Phase 1′
  page/read migrations + gates + DP-1/2/3 theme (PRs #18–#31); v2.2 Step 1 Canon
  True-Up (#32) + Step 2 Batch 1.4 canonical `PurchaseOrder` + Phase 1′ exit audit
  (#33–#34). **Phase 2.1′ transition schema + dispatcher + PO-confirm proof
  (3.1–3.11) BUILT** (PR #35). **Phase 2.2′ verb batches BUILT** — ASN (#36),
  GR (#37), Invoice/DR-7 (#38), RFQ-award cascade (#41). Design polish (#39–#43)
  + full EN/ID i18n Batches 0–6 + coverage sweep (#44–#53).
- ⚠️ **THE COMMAND SPINE NOW STATES A CONCURRENCY PRECONDITION, AND STATES WHAT
  IT DOES NOT COVER (1c, §87).** `CommandInput.expectedState?: string` is an
  OPTIONAL compare-and-set: supplied, the dispatcher refuses `STALE_STATE`
  unless the entity's current state equals it; omitted, nothing changes, which
  is why every existing caller is untouched. The comparison sits AFTER the role
  gate (a caller without the atom learns nothing about the document) and BEFORE
  legality (a stale caller is told WHY, not merely that the act is illegal), and
  `COMMAND_REFUSALS` is now ORDER-pinned to the dispatcher's construction
  sequence — the array's "this is precedence" claim was a comment that nothing
  checked. **Do not restate which verb-pairs it covers**: it was dispatched as
  catching the `statePreserving` cases and MEASURED to be blind to exactly
  those, and `staleState.test.js` re-derives both populations every run.
  ⚠️ **It is NOT the revision precondition** — content staleness (a payload
  revised under you while the state held) is invisible to a state comparison,
  no addressable entity carries a revision, and the three revision-shaped fields
  in the tree are adjudicated as not-revisions at the site.
- **Command spine is complete and wired end-to-end:** canonical state-machine
  schema + dispatcher (legality + role + fields + `QueryScope` + policy),
  `CommandResult`/`getCommandStatus`/`settle` (Option-B SAP boundary), DR-10 event
  taxonomy (`TransitionEvent` + `AuditSink`, in-memory), cascades (RFQ→quotation,
  GR→ASN). PO/ASN/GR/Invoice/RFQ-award verbs run against in-memory stores.
- **Phase 2′ exit is STAMPED contract-complete as of F0.4 (PR #58).** The
  lifecycle machines are authored under `src/services/transitions/flows/`.
  ⚠️ **DERIVE HOW MANY FROM `getKnownFlows()`, NEVER FROM THIS SENTENCE** — it
  read *"All 10 lifecycle machines … across 13 flow files"* until 2026-08-27,
  by which time the registry held neither figure. The F0.4 set was PO · ASN ·
  GR (+ line) · Invoice (+ match) · RFQ · Quotation · Shipment · Contract ·
  Obligation · PurchaseRequisition · SupplierDocument; flows have been added
  since and will be again. The sole remaining
  census machine — the ONE canonical compliance machine that collapses the 5
  fragmented vocabularies (census #11–15) — rides R2.2 DTO-v2. Of the F0.4 five,
  **FOUR remain author-unwired inert registry data**
  (Shipment/Contract/Obligation/SupplierDocument): no CommandTarget, no cascade
  link, roles mapped for catalog-coverage only (DNA-SEED-01 contract surface, no
  UI consumer). **PR is NO LONGER among them** — corrected 2026-08-03: it was
  wired at G1.1 and dispatches (see `TARGETS` in `MockCommandService.js`).

  ⚠️ **THE TARGET-LESS FLOWS ARE A SET DIFFERENCE, NOT A LIST — RUN
  `getKnownFlows()` ∖ `WIRED_COMMAND_TARGETS`.** This line has been written out
  as a list twice and gone stale both times, in opposite directions: R2
  (2026-08-12) had to correct *"four"* to seven because it counted only the
  F0.4 machines and never the two rolled-up sub-flows or the compliance
  machine; then on 2026-08-27 **`supplierDocument` was wired and left the set
  without anyone touching this sentence.** A membership list decays silently
  every time a flow is wired, which is the whole argument for deriving it.
  **⚠️ NAME COMPLIANCE SPECIFICALLY: I3 is stamped COMPLETE below
  and `BuyerCompliance` really does read through the seam — but the compliance
  MACHINE IS READ-ONLY. `t_compliance_submit` / `_verify` / `_reject` CAN NEVER
  FIRE.** A complete read path and an inert write path are compatible, and
  nothing in the I3 stamp said which one it meant. Every member of that derived
  set IS honestly badged `AUTHORED — UNWIRED` on `/buyer/process-flows`
  (verified by rendering, R1) — the defect was in this file, not on the surface.

  ⚠️ **THE WIRED-COMMANDTARGET COUNT IS DELIBERATELY NOT WRITTEN HERE.** Derive
  it from `WIRED_COMMAND_TARGETS` — the runtime export of `TARGETS` in
  `MockCommandService.js`, which is the one place it can be true. The sentence
  that stood in this spot carried a figure, and it was restated and re-corrected
  repeatedly (*"6"*, then *"10"*, then *"11"*), each right on the day it was
  typed and stale within weeks; the line references shipped beside it had
  drifted ~150 lines as well, so even the pointer rotted. **`FLOOR-IN-PROSE-01`,
  in the paragraph that exists to warn about it — which is why the remedy is to
  delete the number rather than to write a newer one.** It is
  deliberately **contract-complete, NOT behavior-complete** — remaining verb
  wiring (and each machine's CommandTarget) rides its Stage-2 surface (FORK-2
  hybrid). Clock-projected states stay out of every transition table (law 0.5);
  the fixtures that still store them as literals are F0.4-FIND-01 (read/DTO-v2).
- **Backend is greenfield.** Zero server code / datastore clients; data is
  in-memory fixtures behind `mockDataService` (`src/main.jsx`); tenant scoping is
  enforced client-side. `httpDataService` is the designed Phase-F1 swap
  (`DataServiceContext.jsx`) — pages do not change when it lands.
- **I3 compliance phase COMPLETE** (PRs #61–#64): I3.1 canonical compliance
  machine + DTO-v2 read (fixture-first, SIMULATED); I3.2 re-pointed BuyerCompliance
  + widget onto the seam and **closed COMPLIANCE-CARVEOUT-01**; I3.3 simulation
  depth + SIMULATED→LIVE flip harness (LIVENESS-DATASOURCE-01, two-gate honest
  render); I3.4 minimal scripted halal-renewal walkthrough (FORK-1=(c)). The
  17-Oct-2026 SIMULATED→LIVE flip is proven; it flips when its Track-R prerequisite
  lands. BuyerCompliance now reads via `useDataService()` (carve-out retired).
- Consumption pattern is standardized: TanStack Query v5 over `useDataService()`,
  scoped query hooks (per-supplier cache isolation via `scopeKey`), a typed
  `DataError` contract, the `Page<T>` list envelope (shape frozen; no pagination
  machinery), and a dev-only, env-gated chaos mock.
- Fixtures are multi-tenant (sup-002 / sup-005 / sup-007); a service-level
  scoping contract guards buyer-superset / per-supplier-isolation / SCOPE_DENIED.
- Locale + i18n: `formatIDR / formatDate / formatNumber` (Asia/Jakarta) and a full
  EN/ID react-i18next layer (per-page fragments + central label maps) are live.
  Test floor: **`scripts/floor.json` holds it** (never regresses; asserted by
  `npm run gates` and by CI). **No floor number is restated here, deliberately**
  — the figure that stood in this spot had drifted more than 1400 tests behind
  the suite, uncorrected, because no build step failed when it stopped being
  true (FLOOR-IN-PROSE-01, CP-3a). `npm run gates` fails if this pointer is
  deleted, since deleting it is how a number comes back.

### Forward plan vocabulary (Stage F / I / A)
- **Canonical forward plan:** `Paragon_World_Class_Build_Plan_v1.md` (on main at
  repo root, merged #65; executes `docs/Paragon_Platform_Strategic_Spine_v1.md`).
  It supersedes the *sequencing* of `docs/Supplier_Portal_Revised_Build_Plan_v2_2.md`
  from Stage 1 onward; v2.2 remains the Phase 0–2′ record + ratified-decision
  register (DR-6/7/9/10, DP).
- **Stage G planning canon is on main:** `docs/Stage_G_Grid_Planning_Layer_Plan_v1.md`
  + `docs/Grid_Planning_Layer_Investigation_2026-07-14.md` (ratified; PLANNED-as-axis
  doctrine, I6 anchor).

  ⚠️ **CORRECTED 2026-08-20 — THIS POINTER NAMED AS "NEXT" A BATCH THAT MERGED
  FIVE WEEKS EARLIER, AND FOUR BATCHES HAVE LANDED PAST IT SINCE.** The sentence
  read *"G0.1 (the C6 planning-doctrine contract) is the next Stage-G batch, gated
  on G-PRECOND (this true-up is the last precondition item)."* Derived: **G0.1
  merged 2026-07-14 as PR #67** (`dc059fc`, and `docs/contracts/C6-planning.md`
  has read `Status: CONTRACT · authored G0.1` ever since), and Stage G ran on
  through **G0.2 · G1.1 · G1.2a · G1.2b · G1.3**, the last of them on
  2026-07-15. **G-PRECOND was satisfied the day before G0.1 opened** — the Build
  Plan merged at #65 on 2026-07-14 — and `Stage_G_Grid_Planning_Layer_Plan_v1.md`
  still carried it as `OPEN — operator` until this true-up.

  Derivation, re-runnable: `git log --format='%ad %s' --date=short | grep -oE
  '^[0-9-]+ G[0-9]\.[0-9][a-z]?' | sort -u`. **Stage G is DORMANT, not next** —
  it stands where G1.3 left it and is not on the recalibrated path below.
- **Stage F — Foundation** (governed data + integration backbone): **F0**
  contract-freeze & ledger truth (F0.1–F0.6 COMPLETE; F0.6 = LivenessRegistry,
  PR #60 closed F0) → **F1** real backend
  core (`httpDataService`, OIDC, durable audit; SE Team) → **F2** S/4HANA event
  seam (Event Mesh + OData; INT-TMS-01 is a sub-case) → **F3** Snowflake +
  data-quality prerequisites.
- **Stage I — Intelligence:** I1 spend classification · I2 should-cost/commodity-FX
  · I3 risk + halal/BPOM compliance (a platform capability modeled fully; NO
  external deadline gates the build — certification is handled manually by the
  compliance team) · I4 3-way match + e-Faktur · I5 guided-buying intake · I6
  BOM-linked sourcing. Each ships fixture-first behind honest markers, flips Live
  when its Stage-F prerequisite lands.
- **Stage A — Agentic** (disciplined/bounded): A1 copilot · A2 document
  intelligence · A3 bounded task agents · A4 advanced levers (buy-vs-build).
- **Track R** (halal). ⚠️ **RE-PRIORITIZED 2026-08-20 — THIS IS THE OPERATOR
  REVERSING THE OPERATOR, AND IT IS RECORDED AS A REVERSAL RATHER THAN AN EDIT.**
  The de-pressurization ruled on 2026-07-15 (PR #75) said Track R is a normal
  capability on equal footing with every other lane and that no external deadline
  gates the build. That ruling is **SUPERSEDED FOR SEQUENCING ONLY**: Track R is
  now **arc 1**, the first arc on the recalibrated path below. What is NOT
  reversed: certification is still handled manually by the compliance team, the
  four operator inputs (D-CAL / D-STAFF / D-SAP / D-DPO) are still non-blocking,
  and **no honesty marker moves** — `compliance` stays SIMULATED behind its
  two-gate guard until the real harvest lands (LIVENESS-DATASOURCE-01).

  The regulatory date is real and derivable in-tree: **17 October 2026**, GR
  42/2024, BPJPH — carried at `docs/Paragon_Platform_Strategic_Spine_v1.md:102`,
  `docs/Halal_Compliance_Control_Design_v1.md:9`, and as the `BPJPH_MANDATE_DATE`
  constant behind `complianceProjection.schemeValid`
  (`src/services/data/complianceProjection.js`). ⚠️ **THE DAYS REMAINING ARE NOT
  WRITTEN HERE.** A countdown in prose is wrong every day after it is typed —
  `FLOOR-IN-PROSE-01` with a clock attached, and the one variant that decays
  with nobody touching the file. The line read *"58 days from 2026-08-20"* and
  was already stale when it was next read. **Subtract today from the constant.**
  What changed is not the date — it was always there — but which lane the seat
  spends its next batches on. It feeds the Stage-2 I3 compliance primitive.

### THE RECALIBRATED PATH (ruled 2026-08-20; supersedes the Stage-G "next" pointer)

Three arcs ruled on 2026-08-20, kept as the record of that ruling. They are not
the work queue: the queue is `docs/supplier-hub/BACKLOG.md`, and the work merged
since (RFx, forecast, capacity, inventory) is named by none of them.

- **ARC 1 · TRACK R — the halal lane made operable.** Three deliverables, and
  every one of them is a SURFACE or a WRITE PATH, never a register entry:
  1. **An operator-editable certificate registry.** Today `COMPLIANCE_REGISTRY`
     (`src/services/data/mock/fixtures/complianceRegistry.js`) is **16 frozen
     rows** — `readonly … = [ … ]`, every supplier `"Sample … (illustrative)"`,
     every cert number a `SAMPLE-…` token, every material `RM-SAMPLE-…`. Derived:
     `compliance` is one of the **seven flows with no `CommandTarget`**
     (`getKnownFlows()` ∖ `WIRED_COMMAND_TARGETS`), so `t_compliance_submit` /
     `_verify` / `_reject` **cannot fire**. There is no write path of any kind:
     nobody — operator, buyer or supplier — can add, edit or expire a
     certificate. **That is arc 1's first deliverable.**
  2. **The expiry projection on real dates.** `complianceProjection.js` already
     computes display status and scheme validity from `expiryDate` + issuer
     (clock-states never stored, law 0.5). It has never once run against a date a
     person entered.
  3. **The receipt gate reading it.** `verifyHalalAtReceipt`
     (`src/services/data/halalVerification.js`) is authored, tested, and
     **HEADLESS BY RULING** — its own header forbids acquiring a consumer there,
     because `COMPLIANCE_REGISTRY`'s codes are `RM-SAMPLE-…` and
     `MATERIAL_MASTER`'s are not, so **the intersection is empty by construction**
     and a wire today would refuse 100% of real receipts. **(1) is what makes (3)
     safe to wire** — that is the whole reason the arc is ordered this way, and
     H4 / `D-COMP-HALAL-4` is the gate it opens.

- **ARC 2 · THE REQUISITION LANE — built.** `BuyerRequisitions` now dispatches
  `pr:create`, `pr:submit`, `pr:approve`, `pr:reject` and `pr:revise`
  (`src/pages-v2/BuyerRequisitions/hooks/useRequisitionActions.js`). The plan
  grid and intake review this arc named were retired by IA P-10, and the
  "Draft → Submit for approval" toast with no dispatch no longer exists as
  described here.

- **ARC 3 · SUPPLIER ONBOARDING.** ⚠️ **AMENDED 2026-09-01 — THE MECHANISM
  SURVIVES MEASUREMENT, THE CONCLUSION DOES NOT.** Re-derived today, and the
  hard half still holds exactly: `src/pages-v2/SupplierRegistration/` behind
  `/register` contains **zero** service calls — `grep -c 'useDataService'` and
  `grep -c 'dispatch'` both return 0 — the whole form lives in `useState`, and
  submitting still sets a `const [submitted, setSubmitted] = useState(false)`
  boolean. **The supplier-side WRITE PATH is unbuilt, and that is arc 3.**

  Registration and onboarding are built by another workstream; do not start
  `/register` changes unless the owner asks.

  ⚠️ **THE LINE COUNT IS DELETED RATHER THAN CORRECTED.** It read *"1,551
  lines"* and measured 1,554 today — `FLOOR-IN-PROSE-01` again, in the
  paragraph that scopes an arc, and the ratified remedy is deletion in favour
  of the derivation (`wc -l`), never a fresher number.

  ⚠️ **AND THE CLOSING SENTENCE IS RETIRED, BECAUSE ARC B FALSIFIED IT WITHOUT
  TOUCHING THIS PARAGRAPH.** It read *"A supplier completes onboarding and
  nothing anywhere records that they did."* Arc B built the
  `supplierApplication` machine, its store, its `CommandTarget`, and the buyer
  review lane (#287–#289), so an application IS recorded — **a BUYER raises
  it.** What no surface does is let the SUPPLIER raise their own, and `/register`
  no longer pretends otherwise: it stopped minting a fabricated
  `APP-2026-{random}` under the label "Application number", and
  `registrationHonesty.guard.test.js` holds that closed bilaterally. **The gap
  is now one-sided, not total** — which is a materially different arc from the
  one this bullet used to describe, and the difference decides whether arc 3
  builds a machine or only a door onto one that exists.

**PARKED, NOT QUEUED — and the reason is one sentence: THESE ARE MACHINE HYGIENE,
NOT MANDATE WORK.** Every one of them makes the tree more consistent with itself;
not one of them puts a capability in front of a person. They stay open, they stay
derivable, and they are picked up when an arc's own surface work touches them —
never as a standalone batch:

  - **The dead-end states.** The derived population is **37 non-terminal states no
    surface can leave, across 12 of 18 flows** (`docs/findings.md` §48g — derived
    with cascade targets and `settlesTo` edges folded in; without those two
    corrections the same derivation returns 43 and condemns both working SAP
    boundaries). ⚠️ The dispatch called this *"the eight fixture-only states"*;
    **no derivation in this tree returns eight**, and the two nearest real figures
    are that 37 and §49a's 18.
  - **GL-0b's unregistered unions.** GL-0 derived **143 closed string-literal
    unions / 580 members** across `src/` and registered 18 of them / 66 terms;
    **125 remain** as GL-0b's worklist. The figure is GL-0's derivation, named
    here rather than restated as if freshly measured (§27).
  - **The 29 stored-field allowlist rows** (`src/lib/storedFieldGate/allowlist.js`
    — 29 `key:` entries, derived at read time). Each is a stored field carrying a
    stated reason instead of a reader; the list can only ever shrink truthfully.
  - **R1d.** ⚠️ Parked as named, with a caveat that belongs in the parking
    notice: **`R1d` occurs exactly ONCE in the register** (`docs/findings.md:14727`,
    inside an UNTOUCHED list) and **is defined nowhere in the tree**. It is parked
    as a token, not as a scope. Whoever un-parks it defines it first.

- **Adjudicated forks:** **FORK-1 = (c)** (minimal scripted halal-renewal
  walkthrough at I3; full Learn absorbed into the A1 copilot). **FORK-2 = hybrid**
  (author all remaining flows; wire opportunistically per Stage-2 surface).

## Routing
Routing is HashRouter (`src/router/AppRouter.jsx`) — not BrowserRouter. The `/`
home redirect points to `/buyer/home`; unknown routes render a real 404
(`src/pages-v2/NotFound.jsx`), and so do the paths of the pages the IA P-10
batch retired (the two dashboards, analytics, risk, discovery, the marketplace
and storefronts, the plan grid and its intake review, the supplier channel
pages).

Most routes are persona-prefixed (`/buyer/…`, `/supplier/…`). One is
deliberately NOT: `/glossary` (GL-1). The glossary is reached
by term chips that sit on BOTH personas' refusal sites, so a persona prefix
would have sent half its readers out of their own shell; it is listed in both
nav groups under one neutral key, `hub.nav.util.glossary`.

## Design principles

### DP-0 — Paradise is the token source (owner ruling 2026-10-28)
The portal takes its colour, type, spacing, radius and shadow values from the
Paradise design system snapshot in `paradise/` (stages 1–5, 5a, 5b of
`paradise-migration-plan.md`). Tailwind and `src/index.css` point at Paradise
tokens through `var(...)`; the hex values quoted in DP-1 to DP-3 below are the
pre-Paradise values and are kept as the history of each rule. What the owner
ruled on the three open conflicts:
- **Teal becomes Paradise blue.** The decorative accent (`teal`,
  `--paragon-teal`) is `--pds-color-accent` (#215AA8), the same hue as action.
  The ROLE split in DP-2 still holds: a decorative use stays low-emphasis and
  is never styled as a button or a selected state.
- **Charts keep the DP-2 ramp.** `CHART_SERIES` is one ordered ramp (blue →
  navy → blue-tint → slate → grey); Paradise's multi-colour `--pds-chart-*`
  palette is not used, because it puts red and green on charts that show no
  state.
- **Data keeps JetBrains Mono** (DP-3), self-hosted in `src/styles/fonts/`,
  with Paradise's system mono stack as the fallback.
- The DP2-WARN-01 warning split is kept: Paradise has no graphical warning
  token, so fills stay #D97706 and warning text uses Paradise's warning ink.

### DP-1 — Fiori-aligned visual language
- No dark solid backgrounds as content surfaces. Hero/identity cards restyle to
  light surfaces: white / light-neutral card, subtle border, navy (`#0D1B2A`)
  text, teal (`#0097A7`) decorative accents, action (`#0070F2`) interactive,
  mid (`#354A5F`) secondary text.
- Odyssey colors are accents, not fills. Semantic color (green/amber/red) is
  reserved for state (as the KPI tiles already do).
- Reference grammar: light shell, white cards, thin borders, high information
  density, restrained color.
- Applied opportunistically per touched page (formatter precedent) — restyle
  when a batch touches the page, never as a standalone sweep. Applies from
  Batch 1.1b onward. If a shared token / card-variant change makes it cheap,
  propose it in that batch's investigation rather than patching per-page.

### DP-2 — Restrained beauty-tech palette (extends DP-1)
- TWO distinct roles — do NOT conflate: **action** (`#0070F2`) is the ONE
  primary-interactive color — primary CTAs, selected / active states, the blue
  a user acts on. **teal** (`#0097A7`) is decorative / accent ONLY — charts,
  score dials, cert highlights, low-emphasis view-links — never a selected/active
  affordance or a primary action. Navy (`#0D1B2A`) is text/headings only — never
  a decorative fill. Mid (`#354A5F`) is secondary text. Surfaces stay white /
  light-neutral with subtle borders.
- ⚠️ BUTTON HIERARCHY (DP2-BUTTON-01, **AMENDED §68 — THE RESERVED-SOLID
  REGISTER IS RETIRED**): primary action = action-blue **OUTLINE**
  (`Button variant="outline"`), and it is now the ONLY primary register.
  Export / Cancel / Close / secondary paths stay `variant="secondary"`; an
  Export never occupies the primary slot.

  **SOLID action-blue no longer exists in this portal.** The prior rule reserved
  it for consequential / irreversible commits — Award (RFQ), Release payment,
  Post-to-SAP, Reject / Dispute, Override-hold, at most one per surface — and
  exempted WhatsApp / messenger chrome from DP-2 (D-2). **All of that is
  retired, messenger chrome included** (operator ruling, §68).

  **THE RULE IS ENFORCED BY A TYPE, NOT BY THIS PARAGRAPH.** `Button`'s
  `Variant` union has no `'primary'` member, so every route back is a `tsc`
  failure; `src/pages-v2/solidButtonRetired.guard.test.js` covers what a type
  cannot. **Do not restate the site count here** — the literal scan that opened
  the sweep was incomplete four ways (a `BulkActionsBar` prop, an
  `invoiceActionModel` flag that also drove a confirm step, two typed
  `'primary' | 'outline'` helpers, and `Button`'s own DEFAULT), and the last two
  were found by the type after the union member was removed, not by any scan.
  If solid is ever wanted again, amend this paragraph AND the type AND the gate
  together — changing one of the three is how the register comes back.
- Semantic color (green/amber/red) is ONLY for true state, in soft/muted
  variants — never saturated decoration. If a chip's color doesn't inform a
  decision, it goes neutral.
- WARNING token is a FILL/TEXT split (DP2-WARN-01), same shape as `action`:
  `warning.DEFAULT` = bright amber `#D97706` for every GRAPHICAL warning use
  (accent-edges, dots, bar fills, dials, chip fills, borders — 3.19:1 on white,
  meets the 3:1 non-text floor); `warning.hover` = dark amber `#8A5606` is the
  ONLY warning color for TEXT on light (`text-warning-hover`, AA on white 6.2:1
  and on warning-soft 5.6:1). `text-warning` must never be used — the bright
  DEFAULT fails AA as text. `warning.soft` (#FEF3D6 chip/banner tint) unchanged.
  The old burnt `#B45309` is retired from the token; `CHART_SEMANTIC.warning`
  (chart strokes / flow-band fills with white text) is a separate concern.
- TARGET/KPI bars are ONE system (DP2-TARGET-01), centralized in
  `chartPalette.js`: `targetStatus(pct, target, nearBand=10)` →
  meeting | near | missing, and `TARGET_STATUS` gives the fill/text colour
  (meeting = success, near = the DP2-WARN-01 amber split, missing = danger).
  Every target bar renders via the shared `<TargetBar>` primitive — fill +
  a navy target-tick — so attainment is colourblind-safe (position vs tick,
  not colour alone). KPI fixtures carry a numeric `targetPct` (the tick, on the
  same 0–100 axis as `pct`); the old hand-assigned per-row hex + the duplicated
  KPI colour consts are gone. Pass-warn-fail cells (Analytics) and the supplier
  dashboard perf bars derive from the same helper (target 90). Grade A–D ramps
  are a separate axis, not yet unified here.
- Charts consume ONE ordered series ramp from `src/lib/chartPalette.js`
  (`CHART_SERIES`: accent → navy → accent-tint → navy-tint → neutral grey; the
  accent is Paradise blue since DP-0). No
  rainbow donuts, no per-page ad-hoc hex. Migrate chart colors opportunistically
  per touched page (SupplierPerformance is the first natural migrant).
- Decorative color flattens: colored icon backgrounds, gradients, and multi-hue
  step chips collapse to the neutral + teal system.
- Applies every batch from 1.3 onward. Messenger-chrome exemption (D-2) and
  GradeBadge / status semantics stand where they inform.

### DP-3 — Odyssey platform family theme (TMS alignment; extends DP-1/DP-2)
The Supplier Portal adopts the TMS Control Tower visual language so the Odyssey
family reads as one product line.
- TYPOGRAPHY: monospace for all DATA — document numbers (PO/GR/RFQ/CTR/SH), SAP
  refs, material codes, currency amounts, dates/times, tracking refs. Clean sans
  (current) for UI labels, headings, body. Implemented centrally via a
  font-family token (tailwind.config) + a data-cell convention; exact mono face
  (JetBrains Mono / IBM Plex Mono, checked for IDR digit legibility) confirmed in
  the DP-3 seam investigation.
- DATA-TOKEN COLOUR (DP2-DATA-NAVY-01): mono data tokens render in `data-navy`
  (`#1E3A5F`, reusing the dormant `--paragon-navy-light`), NOT near-black. Applied
  centrally in the `<Data>` primitive + `KpiCard` hero number — every doc number,
  currency value, quantity, date, and KPI figure lifts from `#0D1B2A` to
  data-navy; an explicit muted (secondary/tertiary) or semantic
  (success/danger/warning/info) colour on a token is preserved. This is the
  mono/sans grammar as colour: **mono = data = data-navy · sans = names/prose =
  `text-primary` black** (supplier company names stay black by design). data-navy
  is deliberately DISTINCT from action `#0070F2` — a full lightness tier darker
  (11.5:1 vs 4.6:1 on white, AAA as text) and desaturated, so a data value can
  never read as clickable. DP-3 "identifiers, not links" holds: mono face, no
  underline, no hover — recolouring to a NON-action navy reinforces it. The
  `action` token is untouched.
- STATUS CHIPS: quiet outlined style — soft tint background, thin border, small
  radius, no solid saturated fills. DP-2 semantic-color rules unchanged.
- TABLES: light grey header band, thin row borders, generous row height.
- DELIVERY: one small dedicated theme-token PR (central tokens + StatusPill +
  table primitives only) immediately after PR-B merges — investigation-first, no
  per-page sweep. Page-level cleanup stays opportunistic.

## Deriving a population — STANDING HEURISTIC (not arc history)

Whenever you answer "which things are X?" by scanning the tree — dead modules,
uncalled verbs, unbacked affordances, missing i18n keys — **derive the
population; never work an inherited list.** The rules, with the measured
instances that earned them, are in `docs/DERIVING-A-POPULATION.md`: read it
before you write a census, a gate or a mutation probe. Rules 1–3 and the rule
above them, in one line each:

1. **A derived population that comes back suspiciously small or suspiciously
   round is reporting on its own matcher, not on the tree.** Treat a clean
   result as a bug report about the instrument until you have proved
   otherwise.
2. **Widening a matcher creates false accusations as readily as narrowing it
   creates blind spots.** Re-derive after every widening too, and compare the
   sets, not the counts.
3. **Never conclude absence from a truncated view of a derivation.** Assert
   membership programmatically rather than paging the output.

### And the rule above the three: PROBE THE GUARD BOTH WAYS
**Assert a known-GOOD input passes before you believe a known-BAD input
failed.** A guard probed in one direction only can ship wrong about what it
should accept.

The rules that follow from these, each with its instances in
`docs/DERIVING-A-POPULATION.md`: a count you publish is derived at read time or
names its derivation, and is never restated in prose (`FLOOR-IN-PROSE-01`); a
clean reading taken right after a fix is a report about the fix; a gate must not
derive its population through the code it probes; strip formatting and decode
bytes before parsing an instrument's output, and confirm one kill by name before
trusting a count; when a hand derivation contradicts a shipped instrument, debug
the hand derivation first; a probe must fire at a defect the tree really had; an
instrument whose population is data pins a named member or value, never a row
count or an id.

### And the rule beside all of them: A REGISTER ENTRY IS NOT A DELIVERABLE

⚠️ **NO BATCH MAY BE DISPATCHED WHOSE DELIVERABLE IS A REGISTER ENTRY, UNLESS
THAT ENTRY IS A CONTRACT.** Ruled 2026-08-20. Binding on the dispatching seat,
not only on the executing one — it is a rule about what may be ASKED FOR.

**A contract is the exemption because a contract is a commitment somebody else
builds against**: `docs/contracts/C1…C10`, a frozen DTO, an invariant a gate
enforces. A finding is a commitment to nobody. The test is not the file the text
lands in — a finding written into `docs/contracts/` is still a finding. The test
is: **does anything outside this repository change if it is true?**

**THE REMEDY IS STRUCTURAL BECAUSE THE FAILURE IS STRUCTURAL, AND THE FAILURE IS
NOT LAZINESS.** The strategist seat produces findings faster than surfaces, and
findings READ AS PROGRESS: they are dated, numbered, cross-linked, derived, and
often genuinely excellent work. Nothing in the review loop distinguishes a
register that grew because the tree was examined from a register that grew
because examining is cheaper than building. **A finding costs one seat one
session and passes every gate this project has by construction — `npm run gates`
cannot fail on prose.** A surface costs a design, a write path, a locale pass, a
mutation probe, and a floor that must not regress. Between two things that both
read as progress, the cheaper one wins every time it is allowed to compete, and
until this rule it was allowed to compete.

**Measured, not asserted** — the numbers and their instruments are in
`docs/findings.md` §61 (`REGISTER-OUTGREW-THE-SURFACES-01`), re-runnable there.
The register is now the largest thing in the docs corpus by a factor of three
over everything else combined, and it grew that way in six weeks.

**How to apply it, concretely:**
- A batch whose PR touches only `docs/findings.md` needs a stated reason that is
  not *"the census produced findings."* Recording what a BUILDING batch measured
  is not this rule's target — that is the register doing its job. **Dispatching a
  batch TO produce findings is.**
- Findings that arrive as a by-product of surface work are unaffected and always
  were: §56's own line is that three of its four findings came from instruments
  running *after* the code was written. **Keep that. This rule is about what the
  batch was FOR.**
- When a census genuinely must run first, dispatch it with **the surface it
  unblocks named in the same dispatch**, and merge them as one arc. A census with
  no named consumer is the shape this rule refuses.
- ⚠️ **AND THE RULE APPLIES TO ITSELF.** This entry is a register entry about
  register entries. It earns its place only if the next three arcs ship surfaces;
  if the recalibrated path above produces another six weeks of prose, this
  paragraph is evidence for the diagnosis and not a remedy for it.

## Language — JavaScript + JSDoc
The owner ruled on 2026-10-02 that the portal is JavaScript + JSDoc, to match the
company React boilerplate. Every file in `src/` is JavaScript except
`vite-env.d.ts`, a type-declaration file with no JS form. Interfaces with
`readonly` members are type-literal typedefs, so readonly is kept.
When a TypeScript file is converted, follow
`docs/frontend-standard/JS-CONVERSION-PLAYBOOK.md`: the draft tool deletes comments
and loosens types, and `scripts/codemods/check-comments-kept.mjs` must report 0
lost. Any spec or gate that scans files uses `src/test/sourceFiles.js` (or a
pattern naming all of `.ts/.tsx/.js/.jsx`); `languageNeutralScanners.guard`
fails on a TypeScript-only filter.

## Gates
ESLint (`eslint.config.js`), Prettier (`.prettierrc.json`) and a Husky pre-commit
hook (`lint-staged.config.js`) are part of the repo; each file's header explains
its rules and why. `lint.maxWarnings` in `scripts/floor.json` is a ceiling: lint
may not report more warnings than it records there. The forecast module is
linted like every other file. The gates are exactly five:
- `npm run build`  → `tsc && vite build` (typecheck + bundle)
- `tsc -p tsconfig.vitest.json --noEmit` → **typechecks the SPEC surface**, which
  `tsconfig.json` excludes. Added when `TSC-SKIPS-TESTS-01` was closed: for the
  life of the suite no gate typechecked a test, and the remedy the register had
  booked did not work (the child config `include`s the specs and then inherits
  the base `exclude`, which wins). The override `"exclude": []` is what closes
  it, and `npm run gates` ASSERTS the override is present — without it the gate
  would pass while checking nothing.
- `npx vitest run` → the test floor, which never regresses
- `npm run test:gate` → the SEC-GATE-01 session/HMAC suite (`gate/`, outside `src/`)
- `npm run lint` + `npm run format:check` → ESLint with zero errors and warnings
  at or below the ceiling in `scripts/floor.json`; Prettier on converted
  JavaScript in `src/`

### `npm run gates` — the five, run and ASSERTED (CP-3a)
`npm run gates` (`scripts/gates.mjs`) runs exactly those five, in that order,
and then asserts that each one did something: the build emitted a bundle, the
suite collected at least the recorded number of tests across at least the
recorded number of files, and the gate suite passed at least its recorded count.
The counts live in `scripts/floor.json` and are a **FLOOR, not an equality**
(operator ruling, CP-3a): **below it fails; above it passes and prints a note
asking you to bump the file.** Exact matching was rejected — it reddens every
legitimate test-adding PR until somebody edits a number, which trains people to
edit the number, and a floor that gets edited routinely is not a floor.
**The trade, recorded: a suite that shrinks but still clears the floor is
invisible to this gate** (the skipped/todo refusal covers the common shape).
**Bump `scripts/floor.json` when the note asks.**

#### ⚠️ A RETIREMENT BATCH MAY LOWER THE FLOOR, AND LOWERING IT IS THEN THE
#### HONEST ACT — WRITING TESTS TO CLEAR IT IS NOT

**The floor records what the suite PROVES. It is not a number to defend.** If a
batch retires tests — a guard whose premise died, a probe that can no longer
fail — the suite legitimately shrinks, and the floor moves down with it. That is
the floor doing its job, not failing at it.

⚠️ **THE DISCRIMINATOR IS MECHANICAL, AND IT IS THE LOAD-BEARING HALF: THE TWO
CASES ARE TOLD APART BY WHETHER THE DIFF *DELETES ASSERTIONS* OR MERELY *STOPS
RUNNING THEM*.** A rule with a test beats a rule with a judgement. Deleting an
`expect` is a retirement and the floor follows it down; a suite that collects
fewer tests while every assertion is still on disk is the REGRESSION the floor
exists to catch — a spec silently skipped, a file dropped from collection, a
`describe` commented out. Same arithmetic, opposite meanings, and only the diff
separates them.

**Then the number is bumped back UP the moment the suite grows again** — the
floor tracks the suite in both directions or it is not a floor.

⚠️ **THE FAILURE MODE THIS EXISTS TO PREVENT IS WRITING TESTS TO CLEAR A FLOOR
YOU JUST LOWERED HONESTLY.** #325 retired five guards whose premise this project
had deliberately removed, and the suite landed at 4538 against a floor of 4541.
The batch had a commissioned spec to hand, so it wrote that and cleared the
floor legitimately — but the sequencing was disclosed at the time precisely
because *"I added tests to clear a floor"* is the shape that must never become
routine. **Without a commissioned spec, the correct move was to ship at 4538 and
lower the floor.** A batch that pads is buying a green number with tests nobody
asked for, which is how a floor stops recording anything.

⚠️ **AND THIS RULE IS NOT CHECKABLE. SAID PLAINLY RATHER THAN LEFT OPEN, BECAUSE
CANON NOBODY READS HAS BEEN WRONG AT FIVE SITES IN THIS TREE.** Three
measurements, not an impression:

1. **`scripts/gates.mjs` never invokes git** — derived: its four `git` substring
   hits are inside the words *legitimate* and *digits*. It sees a WORKING TREE,
   never a diff, so the discriminator above is structurally out of its reach.
   `.github/workflows/gates.yml` uses `actions/checkout@v5` with no
   `fetch-depth`, so CI has no history to diff against either.
2. **The existing pointer gate would NOT protect this paragraph.** It asserts
   only that `CLAUDE.md` CONTAINS the string `scripts/floor.json`, and that
   string occurs at several sites outside this section — so deleting this
   section leaves the gate green. **No count is written here**: the first draft
   of this line said *"THREE times"* and was wrong before it was saved, because
   the paragraph itself adds one. `FLOOR-IN-PROSE-01`, inside the rule about
   the floor. Derive it: `grep -c 'scripts/floor.json' CLAUDE.md`, and check
   that more than one match sits outside this section.
3. **The tree has already ruled on gating prose, and the ruling stands.**
   `gates.mjs` says it at the README: *"THE README'S CLAIMS ARE DELIBERATELY NOT
   ASSERTED. Prose stays prose. A gate that tried to check what the paragraph
   MEANS would fire on the block quoting the retired lines."* This paragraph
   quotes its own counter-example (4538 against 4541), so a digit-hunting gate
   would fire on it — the exact trap that ruling names.

So this is canon enforced by reading, and it is worth knowing which of the two
kinds it is. What IS gated is unchanged and narrow: the floor's counts, and the
pointer at the file that holds them.

`npm run gates` adds no notion of green beyond the gates listed above; it is
those gates plus the assertion that they ran. **CI runs this exact command** and nothing
else. **Since 2026-10-14 the merge gate is GitLab** (`.gitlab-ci.yml`, owner ruling: GitHub
Actions minutes are budget-limited): on every merge request and on a manual pipeline.
**No scheduled run exists.** `.gitlab-ci.yml` describes a daily 00:17 UTC pipeline schedule on `main`, but it was not created, and its `npm run drift` step runs only on a schedule, so a clock-decay
break like 2026-08-01 (see `docs/findings.md`, CP-3a) is caught only when a session runs `npm run drift`
and `npm run gates` on `main` under Node 24 after each merge to it. `.github/workflows/gates.yml` is now manual-dispatch only. **It no longer runs on a push to `main`**
(removed 2026-09-29, `d053d2e`, to save Actions minutes): a merge commit's tree is
the tree its MR run already gated, so a push to `main` is covered by that MR's run.
Run `npm run gates` locally on `main` when you need a record for the merge commit itself.

## Deploy
Vite root is app/ — never edit app/index.html directly.
Deploy is Vercel-only: Vercel builds from source via vercel.json (npm run build → dist/).
Nothing is copied to repo root; there are no committed build artifacts.
Source entry: app/index.html  |  vite.config.js root: app  |  outDir: ../dist

### Access gate (SEC-GATE-01)
A Vercel Routing Middleware (`middleware.js`) runs BEFORE the SPA rewrite and
fronts the entire app shell and every `/assets/*` chunk behind an HMAC-SHA256
signed, HttpOnly, 7-day session cookie — the bundle never ships to an
unauthenticated client. Credentials validate at the edge against NON-`VITE_`
env (`GATE_USER` / `GATE_PASSWORD` / `GATE_SECRET`, never bundled); the gate
fails CLOSED (503) if unprovisioned. Gate logic lives outside `src/` (`gate/`,
`middleware.js`) so it does not touch the vitest floor. noindex is shipped
(meta + robots.txt + `X-Robots-Tag`). The in-app persona / CurrentIdentity flow
is separate and untouched by the gate.
