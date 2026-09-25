# Prompt: RFx A2 · File seam on the data service, and the file-limit rule

**How to use:** Paste into Claude Code opened at the root of `paragon-supplier-portal`, on an up-to-date `main` that contains `RFX-BUILD-PLAN-2026-09.md`. No slots to fill.
**Target:** paragon-supplier-portal · React 18 + TypeScript strict + Tailwind 3, mock data layer · rules from `portal-fit.md` and `rfx-build-00-brief.md`
**Assumptions made:**
- The seam is asynchronous (`put` returns a Promise), because the future BL-27 adapter uploads over the network. The session adapter resolves immediately.
- File limits follow decision D-3, which the owner accepted on 2026-09-25: 25 MB per file, 30 files per response, a fixed list of allowed types, and ZIP and executables refused.
- This task builds the rule and the seam. Wiring the rule into supplier responses is B1 and B4.
- Target model: Claude Opus 5 with thinking on.

---

## CONTEXT

Read `docs/supplier-hub/prompts/rfx-build-00-brief.md` first, and follow RFX-R1 to RFX-R12. Then read `CLAUDE.md` ("Backend is greenfield", on the `httpDataService` swap), finding AR-07 in `docs/supplier-hub/RFX-BUILD-PLAN-2026-09.md`, and rule NR-1 BR-05 in `docs/supplier-hub/RFX-IMPROVEMENT-REQUIREMENTS-2026-09.md`.

Then read these files:
- `src/services/attachments/sessionAttachments.ts`
- `src/components/ui-v2/SessionAttachments.tsx`
- `src/services/data/types.ts` (`IDataService` at :2759)
- `src/services/data/mock/mockDataService.ts`
- `src/services/data/DataServiceContext.tsx`
- `docs/contracts/C1-methods.md`
- `src/services/contracts/__tests__/c1MethodSurface.contract.test.ts`

File bytes live in a module-level map that the upload component calls directly. They should sit behind the data service like every other read and write, so that BL-27 becomes an adapter swap.

## OBJECTIVE

Add a `files` sub-service to `IDataService` with a session adapter, move `SessionAttachments` onto it, and add 1 pure file-limit rule with its tests.

## STANDARD

- Define `IFileService` in `src/services/data/types.ts` with 4 methods: `put(file: File): Promise<AttachmentMeta>`, `urlFor(id): string | null`, `release(id): void`, `isHeld(id): boolean`. Add `files: IFileService` to `IDataService`. [RFX-R1, pattern: `IDataService`]
- Implement the session adapter by wrapping `sessionAttachments`, register it in `mockDataService.ts`, and keep the chaos wrapper working. Keep the honest session-only note and the `urlFor` returning `null` after reload exactly as they behave today (CE-11). [RFX-R9]
- Change `SessionAttachments.tsx` to read files through `useDataService().files`. Keep its props and rendered output unchanged, except that the pick handler now awaits `put`. [RFX-R9]
- Add `fileLimitRefusal(file: { name: string; size: number; type: string }, filesAlready: number)` in `src/services/attachments/fileRules.ts`. It returns `null` or a named code: `FILE_TOO_LARGE` (over 25 MB), `FILE_TYPE_NOT_ALLOWED` (only PDF, DOC, DOCX, XLS, XLSX, PPT, PPTX, JPG, JPEG, PNG, DWG, DXF, STEP and STP pass; ZIP and executables always fail) or `FILE_COUNT_EXCEEDED` (a 31st file). Export the limits as named constants. [RFX-R2]
- Document the new sub-service and its 4 methods in `docs/contracts/C1-methods.md`, so the C1 contract test passes. Derive the counts from the test. Do not type them from memory. [RFX-R5]

## CONSTRAINTS

- Out of scope: using `fileLimitRefusal` in any screen or policy (B1, B4), real storage, a download log (B5), and ZIP download.
- Add no dependency.

## DONE WHEN

- `npm run gates` passes on Node 22.
- `src/services/attachments/fileRules.test.ts` covers each code firing and not firing: 25 MB passes, 25 MB + 1 byte fails, `.zip` and `.exe` fail, `.PDF` in upper case passes, the 30th file passes and the 31st fails.
- `src/components/ui-v2/SessionAttachments.test.tsx` renders through `renderWithProviders` with a stub `files` service. It asserts that picking a file calls `put` and shows the file name, and that a file the service no longer holds shows the session-only note instead of a link.
- A PR is open per RFX-R11.

## OUTPUT

Report in the brief's format, at most 25 lines. Be concise.

Build the seam, the rule and the tests, run the gates and open the PR now.

---

## Notes on design decisions

- The seam is async now, because making it async later would touch every caller again. That is the cost AR-07 exists to avoid.
- The limits are the owner's D-3 values, as named constants, so a later change is a 1-line edit with a failing test beside it.
- No screen uses the rule yet. Wiring it here would pull the supplier response work into a foundation PR.
- `SessionAttachments` had no dedicated test (per the code map), so this task adds one while it changes the component.
