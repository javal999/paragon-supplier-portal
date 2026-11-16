# Deriving a population: the rules and the instances that earned them

> Moved out of `CLAUDE.md` so that the always-loaded file keeps the rules in one line each and this file keeps the
> instances. The text below is verbatim from `CLAUDE.md` at `gitlab/main` `66a3c8be`, lines 750-1280. The numbering of
> rules 1-3 and the heading "probe the guard both ways" are unchanged; `CLAUDE.md` links here.

## Deriving a population — STANDING HEURISTIC (not arc history)

Whenever you answer "which things are X?" by scanning the tree — dead modules,
uncalled verbs, unbacked affordances, missing i18n keys — **derive the
population; never work an inherited list.** A scope written before its
predecessors ran is a list. The rules below were earned across the arcs recorded
in `docs/findings.md` (`CENSUS-MUST-DERIVE-01`, the bilateral loose-end census,
`ENF-SEED-LIST-IS-NOT-THE-VOCABULARY-01`, `FLOOR-IN-PROSE-01`, the R1
false-affordance sweep, and GL-1) — **the rules are numbered below and the
numbering is the count.** (It read *"Two rules"* while three were numbered
underneath it, from GL-0 until GL-1 corrected it: a cardinality restated in
prose, in the section that forbids restating cardinalities in prose. §27 /
`FLOOR-IN-PROSE-01`, in its own house.)

1. ⚠️ **A DERIVED POPULATION THAT COMES BACK SUSPICIOUSLY SMALL OR SUSPICIOUSLY
   ROUND IS REPORTING ON ITS OWN MATCHER, NOT ON THE TREE.** Treat a clean
   result as a bug report about the instrument until you have proved otherwise.
   Both of R1's were this signal: **"0 verbs with no caller"** (two catalog
   files name all 91 by construction) and **"16 orphans"** (an import matcher
   that could not cross a newline — it condemned ~2,000 lines of live code,
   including a walkthrough the operator had specifically ruled to build).
   Sanity-check by asserting a known-true member is present and a known-false
   one is absent, before reporting anything.

   ⚠️ **GL-1 · THE RULE FIRED ON THE SEAT THAT WROTE IT.** The refusal sites were
   derived **from a list of map names read off an earlier grep — a list, not a
   derivation.** The proper derivation (registered vocabularies →
   `Record<Vocab, string>` declarations → uses) immediately named a **21st site
   the list never contained**, because its map is
   `Record<Exclude<QtyRefusalReason, 'EMPTY_QTY'>, string>` — **a shape the eye
   would never catch**, and one no name-list could have held. A grep output
   pasted forward is an inherited list wearing a derivation's clothes.

2. **Widening a matcher creates false accusations as readily as narrowing it
   creates blind spots.** R1 widened handler matching to `on[A-Z]\w*` and swept
   in `onSuccess`/`onError` — react-query lifecycle callbacks, not affordances —
   which accused fully-wired code of lying. Re-derive after every widening too,
   not only after every narrowing.

   ⚠️ **GL-1 · SECOND INSTANCE, SAME BATCH.** The first refusal-site matcher
   keyed **only on the union** (`Record<QtyRefusalReason, …>`) and produced
   **three false accusations** against `services/sdc/ingest.js` — a
   union-to-union translation table (`Record<QtyRefusalReason, ParseReason>`) in
   a service, with no message and no surface to attach anything to. The fix was
   to test **both halves of the generic**: the VALUE must be `string`, which is
   what makes it a message map.

   ⚠️ **D-F · THIRD INSTANCE, AND THE FIRST WHERE WIDENING DELETED TRUE
   FINDINGS RATHER THAN ADDING FALSE ONES.** The stored-field gate's first
   population matcher walked interfaces syntactically and returned 10 DTOs;
   re-deriving through the TypeScript CHECKER instead **gained 17 and silently
   lost 5**, because an OPTIONAL property's type widens to `… | undefined` — a
   fresh union whose `aliasSymbol` is gone — so `reason?: QtyRefusalReason` no
   longer names its own union. **The number went UP, which is what a widening
   is supposed to look like**, and the loss was visible only by diffing against
   the narrower run. Fixed by reading BOTH halves — the declared type NODE
   (sees optionals, blind to `extends`) and the checker alias (sees `extends`,
   blind to optionals) — and unioning them. §40e.

   ⚠️ **AND IT SHARPENS THE RULE: RE-DERIVE MEANS COMPARE THE SETS, NOT THE
   COUNTS.** Rules 1–3 all assume a wrong population ANNOUNCES ITSELF BY SIZE —
   suspiciously small, suspiciously round, a red list of files. This one grew,
   which is what a correct widening looks like, and the losses sat inside the
   gain where no check on the total could see them.

   ⚠️ **WHY RULES 1 AND 2 ARE WORTH READING AS A PAIR, AND WHY GL-1 IS FILED
   AGAINST BOTH:** widening creates false accusations as readily as narrowing
   creates blind spots — **on the same instrument, in the same hour, on the seat
   that wrote the rule.** Neither error is the careless opposite of the other;
   they are the two ways one matcher is wrong, and a batch that fixes one
   without re-deriving is simply choosing which way to be wrong next.

3. ⚠️ **NEVER CONCLUDE ABSENCE FROM A TRUNCATED VIEW OF A DERIVATION.** Rules 1
   and 2 guard the matcher; this one guards the READING. At GL-0 the union
   derivation was correct (143/580) and a `sed -n '80,200p'` window over its
   265-line output did not show the halal/BPOM unions — briefly read as "the
   tree is missing them" when they were present throughout. **Assert membership
   programmatically** (`grep -c` the derived output, or filter the derivation)
   rather than paging it: a `head`/`sed` window is a sampling instrument, and
   reading absence out of a sample is the same error one layer up — a
   conclusion reporting on the instrument rather than on the tree.

   ⚠️ **§42 · AND THE SAME RULE GOVERNS WHAT A MATCH *MEANS*, NOT ONLY WHICH
   MATCHES YOU FOUND. THE SCAN MATCHED A CALL SITE; THE DERIVATION MATCHED A
   REGISTRATION SITE; ONLY THE SECOND IS WHAT A KEY COLLISION NEEDS.** A verb
   appearing in a call is not a verb claiming a key. Four premises inverted on
   measurement in one arc — two of them naming identifiers that do not exist in
   the tree at all — and each was a scan's match read as if it were a
   registration's. **Name the site the claim REQUIRES, then assert membership at
   THAT site.** A correct-sounding claim resting on the wrong site is the same
   defect as `COUNT-RESTATED-ACROSS-INSTRUMENTS-01` (§40k) with a location
   standing in for a number.

   ⚠️ **§83 · AND THE SHARPEST INSTANCE OF IT, BECAUSE THE INSTRUMENT RETURNS
   THE SAME ANSWER FOR A LIVE VERB AND A DEAD ONE.** A census of *"which verbs
   are dispatched?"* run as `grep "transitionId: '<id>'"` returns **0 for
   `t_gr_approve`, which fires on every goods receipt the wizard commits, and 0
   for `t_gr_hold`, which nothing has ever fired.** The literal is real — it
   lives in a `switch` return (`grRollup.js`), not at the call site, because the
   GR header disposition is DERIVED rather than chosen and the call site reads
   `transitionId: headerVerb`. **A dispatch census must RESOLVE every
   non-literal id to its concrete returns before it reports anything**; derive
   the non-literal sources rather than assuming there is one (today: the GR
   header verb, and the cascade fan-out's `link.targetTransitionId`, which is
   the dispatcher firing at itself rather than a page firing). Thirteen verbs
   were reported dead on the literal scan and three of them were live.
   ⚠️ **AND A VERB WITH A CALLER IS STILL NOT REACHABLE IF NO DISPATCHED VERB
   PRODUCES ITS FROM-STATE** — that is a third answer, distinct from live and
   from dead, and it decides whether the remedy is a surface or a machine.
   Carry rule 4's bilateral control on the instrument itself: a verb known
   dispatched must be FOUND and one known undispatched must be ABSENT, by the
   same instrument in the same run.

   ⚠️ **§43 · AND THE RULE BINDS THE SEAT THAT DISPATCHES, NOT ONLY THE ONE
   THAT MEASURES. A PLAN READ AS A RESULT IS THE SAME DEFECT CLASS AS A SCAN
   READ AS A DERIVATION.** The cascade arc ended on its SEVENTH inverted
   premise: a ruling to *merge PR #226* when no PR, no branch and no code
   existed — the number, the string, the surfaces and a demo risk all read off
   a PLAN as though it were a RESULT. Six premises inverted on measurement and
   each cost a report; the seventh cost nothing **only because it was refused**,
   and it is the one that mattered most: **it required an OUTWARD, IRREVERSIBLE
   ACTION to act on.** Six wrong premises can be corrected by measuring again;
   a merge cannot. So before ANY outward or irreversible step — merge, push,
   publish, delete — assert the object exists **at the site the action names**
   (`gh pr list`, `git branch`, the file itself), never from the conversation
   that described it. §43a.

Handler shapes in THIS codebase that a naive matcher misses: custom props
(`onQualify`, `onInviteRfq`, `onUpdate`), and **named handlers hoisted out of
the JSX** (`const handleExport = () => …`) — which is where the largest pages
keep their affordances. Full list: `docs/findings.md` §19.

**A count you publish must be derived at read time or name the derivation that
produces it** (§27). Do not restate a cardinality in prose — the "four unwired
flows / 10 wired targets" sentence was wrong twice, in one sentence, for exactly
that reason.

⚠️ **THE REMEDY IS DELETION IN FAVOUR OF A DERIVATION, NEVER CORRECTION TO A
NEWER NUMBER — AND THE REASON IS THAT A CORRECTED NUMBER IS THE SAME DEFECT WITH
A FRESHER DATE.** This class has now failed in THIS FILE at every sentence
carrying a `FLOOR-IN-PROSE-01` marker; **run `grep -c 'FLOOR-IN-PROSE-01'
CLAUDE.md` — the markers ARE the count, and it is deliberately not written
here**, because a tally of stale-count incidents is itself a count in prose. The
recovered members, each measured against its own instrument: the test floor
(drifted past 1400 tests behind the suite); the wired-`CommandTarget` figure
(*"6"* → *"10"* → *"11"*, all three right the day they were typed); *"10
lifecycle machines … across 13 flow files"*; the target-less flow LIST (*"four"*
corrected to seven, then silently wrong again the day `supplierDocument` was
wired); the BPJPH countdown (*"58 days"*, the one variant that decays with
nobody touching the file); *"Two rules"* above three numbered rules; *"Three"*
identifiers above a list that wanted a fourth; the handoff surface count (wrong
TWICE, once per batch); and — added by the batch that wrote this paragraph —
*"six system roles + a supplier role"* against a `SystemRoleId` union holding
twelve members, sitting **three lines above the instruction not to restate role
counts.**

⚠️ **AND THE DISPATCH THAT ORDERED THIS PARAGRAPH SAID THE CLASS HAD FAILED
"FOUR TIMES". THAT WAS ITSELF AN UNDERCOUNT, DERIVED AGAINST.** Which is the
whole argument in one line: **the tally of a self-reported failure class is the
number least likely to be re-measured, because everyone assumes the register
already did it.** Do not accept one — including from this paragraph. Derive it.

⚠️ **AND A COUNT IS COMPARABLE ONLY TO A COUNT FROM THE SAME INSTRUMENT**
(`COUNT-RESTATED-ACROSS-INSTRUMENTS-01`, §40k). A prototype and the thing it
became are TWO instruments — especially then, because the differences are the
deliberate improvements, which is exactly what changes the count. D-F subtracted
a prototype's figure from the shipped gate's, got a gap of 7 where the truth was
2, and **wrote a plausible, specific, quantified explanation for the gap rather
than re-running.** The general form, and it is the reason this sits under the
derivation rules: **A BARE WRONG NUMBER GETS CHECKED; A WRONG NUMBER WITH AN
EXPLANATION GETS BELIEVED.** The explanation is not a failed catch — it is the
mechanism by which the error survives. **Re-run; do not reconcile.**

### And the rule above the three: PROBE THE GUARD BOTH WAYS
Rules 1–3 guard a POPULATION. They say nothing about the instrument that guards
an INVARIANT. **A guard is habitually probed in one direction only — "does it
catch the bad thing?" — so a guard that is wrong about what it should ACCEPT
ships looking like a working guard.** GL-1's chip-ref type was exactly this: it
rejected the bad ref *and the known-good one*, because a mapped type collapsed
`term` to `never`. A one-sided probe would have shipped it.
**Assert a known-GOOD input passes before you believe a known-BAD input failed.**
The running count of this class lives in `docs/findings.md` §39 — it is a table,
and the table is the count.

⚠️ **D-F IS THE FIRST BATCH IN WHICH THE REFLEX PAID FOR ITSELF, AND IT PAID ON
THE FIRST RUN.** The stored-field gate came back GREEN against the real tree
while its own known-good probe was failing: the synthetic harness put its files
outside `src/`, so the derivation returned an EMPTY population, and a
one-directional probe would have read that as *"yes, it catches the bad thing —
there is nothing bad here."* The good-input probe and its bad-input twin now run
against the SAME synthetic program, so neither can be believed alone. §40e.

⚠️ **§42 · SECOND INSTANCE, ONE DAY LATER, AND IT WOULD HAVE PRODUCED THE RIGHT
CONCLUSION BY AN INSTRUMENT THAT PROVED NOTHING.** A derivation asking "does any
transition-id keying collide?" returned **"0 colliding" on every keying** — over
an EMPTY population, because it imported `./registry` instead of `./index`, so no
shipped flow had self-registered and `getKnownFlows()` returned `[]`. The
conclusion it pointed at ("nothing collides") happens to be TRUE, which is what
makes this the dangerous shape: **a right answer from an instrument that examined
nothing looks exactly like a right answer.** Only the known-good control
(`expect(ids).toContain('t_gr_post')`) went red, beside `total transition ids: 0`.
Filed as `EMPTY-INPUT-REPORTS-CLEAN-01`, **not** in §39b's table — that table
counts the opposite half of the asymmetry, and one event under two classes
inflates both. The population guard is now the FIRST test in the shipped gate and
asserts MEMBERSHIP, never a count. §42b.

⚠️ **§71 · AND A THIRD WAY A CLEAN READING LIES, WHICH IS NEITHER OF THE OTHER
TWO — `CLEAN-AFTER-THE-FIX-REPORTS-THE-FIX-01`. THE OPERATIVE FORM: A CLEAN
RESULT TAKEN RIGHT AFTER THE FIX IS A REPORT ABOUT THE FIX.** The family now has
three members and they fail for three different reasons, so a note on either of
the first two would have been filed in the wrong place:

| | What the instrument examined | Why the clean reading is worthless |
|---|---|---|
| `EMPTY-INPUT-REPORTS-CLEAN-01` | **nothing** | there was no population |
| **rule 1** | a population, through a broken matcher | the result reports on the matcher |
| **this** | **everything, correctly** | **the defect was removed an hour earlier** |

The third is the hardest to distrust, because *nothing is wrong with it*: real
population, correct matcher, honest zero. At §70b a candidate gate for
`FORWARD-PROMISE-HAS-NO-HANDLER-01` measured **zero false positives across the
whole i18n layer** — a genuinely clean reading over a genuinely complete
population — and it was clean **because §69 had deleted both instances that
morning.**

⚠️ **AND THE CONSEQUENCE IS RULE 4's, ARRIVING THROUGH A DIFFERENT DOOR: AN
INSTRUMENT VALIDATED ONLY AGAINST A REPAIRED TREE HAS NEVER BEEN SHOWN TO FIRE.**
Rule 4 says probe the guard both ways; this is the case where a seat believes it
already has, because the real-tree run came back green and green is what a
working guard looks like. **The zero proves the repair landed. It proves nothing
about whether the instrument can catch the next instance** — for that, fire it at
the defect the fix removed (§70b did: the proxy would have caught both §69
strings, which is a different measurement from the zero, taken against different
input). **A gate whose only evidence is a clean run on a just-repaired tree is
unprobed, whatever its output says.**

⚠️ **§86 · AND THE FOURTH WAY, WHICH IS NEITHER A BAD MATCHER NOR A ONE-SIDED
PROBE: A GATE MUST NOT DERIVE ITS POPULATION THROUGH THE CODE IT IS PROBING.**
Rules 1–3 ask whether a matcher sees the tree correctly. Rule 4 asks whether a
guard was probed both ways. This asks a question neither reaches, because the
matcher was correct AND the guard was probed both ways AND the probe still proved
nothing. `ownerlessScope.test.js` first derived "which targets are owner-less?"
by asking the dispatcher — the very predicate under test. Mutate that predicate
and the POPULATION collapses to empty: the suite goes red on its own population
control while **the assertion it exists to make never executes**, and the
remaining specs pass vacuously over zero rows.

⚠️ **A COUNTER WATCHING PASS/FAIL SCORES THAT AS A KILL.** It is red, on the
mutant, in the right file — the mutation moved the assertion and the population
together, so the gate cannot tell "I caught it" from "I have nothing to look at."
It was visible only because the probe's output was read ROW BY ROW rather than as
a count, which is §51 arriving from the other side (§51 is a counter that
UNDER-reports kills; this is one that would OVER-report one). **Derive the
population from something upstream that the mutation cannot reach** — here, the
target's own `readState` / `readScopeOwner`, which sit above every dispatcher
predicate, so the population is identical under the shipped code and under both
mutants.

⚠️ **AND ONE LAYER OUT, THE RULE THAT ORDERS ALL OF THESE — `SILENT-PESSIMISM-
TERMINATES-THE-INVESTIGATION-01` (§86g).** §85's note said an instrument that
errs toward pessimism is the dangerous one. Measured across five instances, that
is not quite the axis. **The dangerous direction is whichever one TERMINATES THE
INVESTIGATION.** A weak-looking gate gets strengthened; a strong-looking one gets
trusted. Four of the five instances lose information and read as modesty — a
`cp1252` decode that throws, a malformed 41-char control, a `$`-anchored probe
that never mutates under `core.autocrlf`, an i18n probe aimed at a token spelled
identically in both locales. **The fifth failed the OTHER way and is the worst of
them:** `git rev-parse <sha>:<path>` on a missing path echoes its argument to
stdout AND exits 128, so a `|| echo MISSING` wrapper captures both and a
truncated view shows a **plausible SHA prefix** where the marker should be — an
instrument manufacturing an object of exactly the shape the reader is hunting
for, inside a comparator. **Never let an instrument's fallback output share a
shape with its success output**, and classify before you truncate.

⚠️ **§51 · AND ONE LAYER ABOVE THE PROBE: THE INSTRUMENT THAT COUNTS THE PROBE.
RULE 4 COVERS THE PROBE. THIS COVERS THE THING THAT READS THE PROBE'S OUTPUT, AND
ITS FAILURE MODE IS FLATTERINGLY HUMBLE.** A mutation probe is trusted through a
counter, and a counter is an instrument like any other — with two ways to be
wrong that have both now happened, one batch apart, in the same harness:

- **§50e — the kill that never registers.** Thinning a `surfaceable` reason made
  the flow fail `assertValidFlow`, so it never registered, so vitest reported a
  FAILED SUITE with *"no tests"*. A counter watching `Tests N failed` saw
  nothing and reported **0 KILLED** on a probe that had killed everything.
- **§51f — the digit inside the escape code.** The same counter matched
  `Tests\D+(\d+) failed` against vitest's COLOURED summary, and `ESC[1m`
  contains a digit: `\D+` stopped short, `(\d+)` captured the `1` out of the
  formatting, ` failed` did not follow, and it again reported **0 KILLED** on a
  probe that killed a named test.

**BOTH MECHANISMS FAIL IN THE SAME DIRECTION — TOWARD "YOUR GATE IS WEAK" — AND
THAT IS THE READING THAT GETS BELIEVED, BECAUSE IT SOUNDS LIKE THE HUMBLE
ANSWER.** A counter that over-reports kills would be challenged immediately; one
that under-reports them is accepted as modesty and the gate gets rewritten to fix
a hole it does not have. **STRIP THE FORMATTING BEFORE PARSING AN INSTRUMENT'S
OUTPUT, AND CONFIRM ONE KILL BY NAME BEFORE TRUSTING A COUNT.**

⚠️ **§85 · AND IT FAILED A THIRD TIME TODAY, ON A THIRD MECHANISM, IN THE SAME
DIRECTION — WHICH IS THE POINT OF FILING IT RATHER THAN FIXING IT QUIETLY.** The
module-scope-literal probe captured vitest's output with Python's
`subprocess(text=True)`, which decodes using the CONSOLE CODEPAGE (`cp1252`
here) and **throws** on the UTF-8 the suite emits. Every mutant came back
`named=False` — *"the gate went red but could not name the string"* — on a probe
where all three mutants were in fact named. **Three mechanisms now, all reporting
"your gate is weak":** a kill that never registers (§50e), a digit captured out
of an escape code (§51f), and now a decode that throws before the match runs.
The direction is not a coincidence — **every parsing failure loses matches, and
losing matches always reads as the humble answer.** Decode instrument output as
BYTES with an explicit encoding, never through the ambient codepage.

⚠️ **AND THE RESTORE HALF OF A MUTATION PROBE NEEDS ITS OWN AUTHORITY, NAMED
BEFORE THE RUN.** A probe that mutates shipped source is only honest if the
restore is provably byte-identical, and **`sha256` of the file bytes is that
authority** — it decides, full stop. But it is not sufficient EVIDENCE on its
own here: `core.autocrlf` is on in this repo (git says so on every write —
*"LF will be replaced by CRLF"*), so a bare sha256 computed on a working-copy
file is not reproducible by a reader on another platform, and a reader who
recomputes it and gets a different digest cannot tell a line-ending policy from
a failed restore. **So report BOTH: sha256 as the authority, and `git
hash-object` beside it** — the blob id is what a reviewer on any platform can
recompute and compare, because it is normalized. State which bytes were hashed.

⚠️ **AND THE SAME REFLEX APPLIES TO AN ARTIFACT NAMED IN A DISPATCH.** The
identifiers named as existing code and measured absent are
`getInvoiceAction`, the FX-page `<span lang="en">` (§45), `SurfaceExpectation`
(§51), **`blockingReasons` (§63b)**, and — all four in ONE dispatch (§64a) —
**`roleMatches`**, **`buyer:planner`**, **`t_asn_confirm`** and
**`t_asn_dispatch`** — beside a SHA (`c95e8ce`) and a PR number the tree never
held.

⚠️ **§64a ADDS THE VARIANT THAT IS HARDEST TO CATCH: A MISDESCRIBED MECHANISM
ATTACHED TO A CORRECT CONCLUSION.** The dispatch said `buyer:all` was a wildcard
that `roleMatches` short-circuits, on 32 of 44. `buyer:all` is a `requiredRole`
on **0 of 91** transitions (it is the DR-10 audit ACTOR string) and `roleMatches`
does not exist — the gate is a bare `Array.includes`. **And the conclusion was
right anyway**: the persona-wide grant WAS a wildcard, because holding all 48
atoms by virtue of being a buyer is exactly that. The wildcard was the SHAPE of
the grant, not a token in it. **A hunt for the named token finds nothing and
concludes there is no wildcard** — so grep the artifact, keep the property. **THE LIST IS THE COUNT; do not restate it as a number** —
the sentence that stood here opened with *"Three"* while it was already time to
write a fourth, which is `FLOOR-IN-PROSE-01` in the paragraph that teaches the
reflex. `blockingReasons` was the load-bearing mechanism of a ruling — *"your own
finding shows how: `qualityValid` ALREADY WRITES INTO `blockingReasons`"* — and it
cost nothing only because it was grepped before it was built on. **The register
under-counts this class by construction:** an invented artifact that is REFUSED in
conversation leaves no trace, so only the ones that reached a batch were ever
written down. Before building on a named artifact, `grep` for it —
absence is a one-line measurement and a wrong premise with a specific name is the
most believable kind.

⚠️ **§70 · AND WHAT TO DO WITH ONE, WHICH §64a DOES NOT SAY —
`FALSE-MECHANISM-MUST-NOT-BE-FILED-01`. A FINDING WHOSE MECHANISM IS FALSE MUST
NOT BE FILED, EVEN WHEN ITS CONCLUSION IS RIGHT: THE REGISTER IS WHAT THE NEXT
BATCH BUILDS ON, AND A FALSE BLOCKER COSTS MORE THAN THE BATCH IT STOPPED.**
**AND THE BOUND IS PART OF THE RULE, NOT A FOOTNOTE TO IT: AN UNVERIFIED
MECHANISM IS STILL FILED, WITH ITS UNCERTAINTY STATED — ONLY A MECHANISM
*MEASURED FALSE* IS WITHHELD. THE DISTINCTION IS WHETHER THE MEASUREMENT WAS
TAKEN.** Unbounded, the rule licenses withholding anything a seat has not proven,
**which would empty the register of exactly the findings that most need
checking** — so the limit is what keeps the rule from inverting into the harm it
exists to prevent, and it is stated before the argument rather than after it.
§64a stops at detection (*grep the artifact, keep the property*), so the default
survives — the conclusion held, and filing is what this project does with
survivors. **That default is wrong, and asymmetrically:** a finding filed with a
correct mechanism costs ONE batch to act on; one filed with a false mechanism
costs EVERY batch that reads it, because "X cannot do Y" invites a Y-shaped
replacement for X, and **nobody re-measures a blocker — a blocker is why you
stopped.** At §69 the finding was *"the policy hook cannot reach the document"*,
attached to a conclusion that was RIGHT (*the bands are not where the work is*),
which is exactly what would have carried it past review; filed, it would have sat
in front of every value-based policy this platform will ever want, while
`readEntity` was documented for that purpose and four shipped hooks already used
it. **The disposal is re-measure, then file the TRUE finding** — which was the
opposite shape and sharper: the hook reaches the document, and what is missing is
the RIGHT-HAND SIDE of the comparison. One is a dead end; the other names what to
build.

⚠️ **AND WHEN A RE-IMPLEMENTATION DISAGREES WITH THE INSTRUMENT, THE
RE-IMPLEMENTATION IS THE THING UNDER TEST — `REIMPLEMENTATION-CONTRADICTS-THE-
INSTRUMENT-01`.** Rules 1–3 say a suspicious population is reporting on its
matcher. This is the same defect with the operands swapped, and it is missed
because it arrives wearing the clothes of a discovery: a seat re-derives by hand
what a shipped instrument already computes, the two disagree, and **the hand
derivation is believed because it is the newer measurement and it is the one the
seat understands.** It is not newer evidence. It is a second instrument, written
in an afternoon, with no probe, no bilateral control and no history of having
fired — set against one that has all four. **The prior is not close.**

**Measured, in the lane that wrote this rule.** A hand matcher for *"which
instruments guard their population?"* returned **five with no defence at all** —
`simUsrNamespace`, `thirdPartyIdentifiers`, `glossary.coverage`, `toastHonesty`,
`retiredDayFields`. Every one was false. The matcher tested `toBeGreaterThan\(0\)`
and all five guard with `(200)`, `(400)`, `(10)`, `(5)`. **The instruments were
right and the re-implementation was wrong, and the re-implementation is what
nearly got written down** — as a finding, in the direction §86g names as the
dangerous one, because it *manufactured* work rather than dissolving it.

**So the disposal, and it is an ORDER rather than a preference: when a hand
derivation contradicts a shipped instrument, debug the hand derivation FIRST and
say you did.** Only after it survives is the disagreement evidence about the
tree. And the confirmation is cheap and specific — **fire the hand matcher at a
member the instrument already accepts**; if it rejects that, the instrument was
never the subject. ⚠️ **AND IT COMPOUNDS WITH `FALSE-MECHANISM-MUST-NOT-BE-FILED-
01` (§70):** a false contradiction filed as a finding reads as *"the gate is
weak"*, which is the reading that gets believed and the one that staffs a lane.

⚠️ **AND THE RULE THAT ORDERS EVERY PROBE IN THIS SECTION, PROMOTED OUT OF ONE
MODULE'S COMMENT BECAUSE IT GOVERNS ALL OF THEM — `PROBE-MUST-FIRE-AT-A-REAL-
DEFECT-01`.** It was written at #326 inside `src/services/data/clockDrift.js`,
where it reads as local to that instrument. It is not:

> **WHAT IS MISSING IS NOT A FAMILY — IT IS A PROBE THAT FIRES THE INSTRUMENT AT
> A DEFECT THE TREE REALLY HAD.**

**A synthetic subject agrees with the matcher by construction**, which is
`EMPTY-INPUT-REPORTS-CLEAN-01`'s cousin: a subject built to be found. It is not
worthless — a synthetic probe still separates a matcher that runs from one that
does not — but it can never tell you the matcher is aimed at the right thing,
because the seat that aimed it also built the target. **Only a defect the tree
really carried was aimed by something other than the seat.**

**The specimen is `dayProjection.test.js` @ `3e0c1d2`, quoted into a comment
there rather than deleted, and it is the model to copy rather than to redesign:**
run the SHIPPED matcher over the LIVE population at an input that reconstructs a
geometry the tree really occupied, and require it to return **NAMED members**.
Never a count — a count is satisfied by the wrong match. Its retirement was
correct and is instructive: with one side of its comparison deleted it could no
longer fail, and *a guard that can no longer fail is worse than none.*

**Where this is already honoured, so it is copied and not reinvented:**
`chartPalette.guard.test.jsx:578` (the walk must REACH `ScoreBadge`'s `TONE`, the
object its class was named for, with an anti-vacuity control saying so), and
`thirdPartyIdentifiers.test.js`, whose ISO 6346 probe fires at a dead regex this
file really shipped — `[A-Z]{4}U` where the standard has three letters, which
matched nothing while the guard read green.

⚠️ **THE PRIORITY THIS SETS, STATED SO IT IS NOT RE-DERIVED WRONGLY: when an
instrument is repaired, THE DEFECT IT REMOVED IS THE PROBE INPUT, and it is
cheapest to capture on the day of the repair.** After that it survives only as
prose, and prose is what this section exists because it does not trust.

⚠️ **AND THE FIFTH SILENCING MODE, WHICH NONE OF THE FOUR ABOVE REACHES —
`DATA-POPULATION-INSTRUMENT-SURVIVES-ITS-CORPUS-01`. AN INSTRUMENT WHOSE
POPULATION IS *DATA* MUST PIN A NAMED MEMBER OR A NAMED VALUE. A ROW COUNT OR AN
ID IS NOT A PIN.** The four modes ask whether the instrument still RUNS. This
asks whether it is still looking at the same THING — and the answer can be no
while every one of the four says yes.

**THE MECHANISM IN ONE LINE: A REPLACEMENT KEEPS IDS AND CHANGES VALUES, SO AN
ID-ONLY CONTROL IS EXACTLY THE CONTROL A REPLACEMENT WALKS THROUGH.** A
count-based control is worse still — a replacement usually preserves the count by
construction.

**Measured in this tree's own history, not hypothesised.** #319 wrapped four
corpora in `shiftFields(...)`:

```
-export const DOCUMENTS: SupplierDocument[] = [ …      -export const mockShipments: Shipment[] = [ …
+const DOCUMENTS_RAW: SupplierDocument[] = [ …         +const mockShipmentsRaw: Shipment[] = [ …
```

**Same export name, same rows, same ids — every date different, computed rather
than authored.** Nine data-population instruments read a replaced corpus, none
was touched, and all stayed green. ⚠️ **AND IT IS INVISIBLE TO THE OBVIOUS
CHECK:** no date literal was *removed* from those files, because the literals did
not move — the read did. A diff hunting for changed values comes back empty on a
corpus that was entirely replaced.

**Then #325 changed `doc-001`'s stored `status` and the mode produced a live
falsehood.** `SupplierCertsExpiringWidget.test.jsx` had *traded away* a
behavioural probe, stating in its header that the projection and the stored
status *"now agree on every row, so no rendered assertion can separate them any
more."* #325 made them disagree again. The file was last touched at #324, its
population control checks that doc-001/005/008 still **exist**, and the suite
stayed green while the header stayed wrong. **A weaker assertion was being held
on a premise measurement had already falsified.**

**THE SPECIMEN IS ALREADY IN THE TREE AND IS §71's SHAPE APPLIED TO DATA** —
`supplierDocumentRefusal.test.js`:

```ts
const refused = DOCUMENTS.filter((d) => d.status === 'Rejected');
expect(refused.map((d) => d.id)).toEqual(['doc-012']);
```

A NAMED MEMBER, reached through a VALUE. Replace the corpus and it goes red.

⚠️ **AND THE COUNTER-RULE IS PART OF THE RULE, NOT A CAVEAT TO IT: DO NOT PIN
VALUES ON AN INSTRUMENT THAT IS *CORRECTLY* INSENSITIVE TO A SHIFT.** Most
data-population instruments assert over ids, codes and relationships and are
right to survive a re-anchor untouched. Pinning values there reddens the tree on
every legitimate `shiftFields` re-anchor — which is
`ANCHOR-POPULATION-GUARD-OFF-BATCH`, an improving tree turned red, and it is the
failure this rule is most likely to cause if it is read as a sweep. **The test is
not "does this spec read a corpus?" but "does this spec's CLAIM depend on a value
in it?"** If the claim is about the value, pin the value; if it is about identity
or shape, an id control is the correct instrument and adding a value pin makes it
worse. **Never sweep this rule across a corpus of instruments.**

⚠️ **AND THE FLOOR IS NOT THE ANSWER HERE, WHICH IS WORTH STATING BECAUSE IT IS
THE ANSWER TO MODES 1–3.** `it.each(POPULATION)` binds population size to
collected test count, and the floor watches that at zero headroom — but only
because CODE volume grows deliberately and under review. **DATA volume grows when
the product works**: arc 1's operator-editable certificate registry makes
`COMPLIANCE_REGISTRY` grow by design, and binding it to the floor would make every
legitimate row a floor bump — CP-3a's *"trains people to edit the number"*
failure, imported into the one place the floor cannot defend. Three of the 42
data-population instruments bind this way today and **the binding must not be
extended** (operator ruling).

The gate itself is `src/lib/storedFieldGate/` — every stored field on a
glossary-covered DTO has a non-fixture reader or a bilateral allowlist row with
its reason stated. It is deliberately TEST-level, not type-level, precisely so
#179's mutation practice CAN reach it; both directions of the bilateral
assertion are mutation-probed.

`src/lib/moduleScopeLiteralGate/` is the second gate on that pattern: no
reader-visible literal may sit where `t()` cannot reach it — a parameter
default that renders, or a module-scope const consumed by `.map()`. ⚠️ **Its
discriminator is DERIVED, and that is the part worth copying: a default is a
defect iff some JSX call site OMITS the prop.** No allowlist, no
"looks-like-a-sentence" heuristic, and — the property a marker cannot have — it
RE-DECIDES ITSELF: the day a new call site omits `title`, that literal becomes a
defect with nobody editing the gate. Content is never inspected. Where
reachability cannot answer (a mapped const always renders) the reason is stated
AT THE SITE via the tree's existing `i18n-defer:` convention, which cannot go
stale because it is the same bytes as the code it acquits — **and which is
UNVERIFIED, buying a stated reason and a visible diff, never enforcement.**
`grandfathered.js` carries the consts that predate the gate as a bilateral set
that can only shrink; it is the S2 worklist, not an exemption.

