# Paradise migration plan — Paragon Supplier Portal

- **Paradise snapshot:** 0.2.0-alpha.6 (status: preview; it may still change)
- **Stack:** React 19 + Tailwind CSS 3.4, Vite 7, npm (package-lock.json), tests `npx vitest run` (plus `npm run gates` for the full five-gate check)
- **Run date:** 2026-10-19 · **App commit at run:** `2cfbf2b84e0d9336717d4bd43f5f489788e6e405` (branch `fix/currency-number-format`)
- **Scope approved (2026-10-19):** whole system, stages 1, 2, 3, 4, 5, 5a, 5b. Applied on branch `feat/paradise-foundations`, starting from `main` @ `7062d1bc30becbcac843131fff77d00ec9812eac`. Values marked "no match: decide" keep their current values until decided.
- **Preview report:** not in the repository. The preview kit (`paradise/preview/`) was the author's local before/after check and was removed in the review of MR !16; the runtime does not need it.
- **Split (review of MR !16):** one merge request per stage group, each revertible alone: stages 1 and 3 (tokens and type), stage 2 (colour), stages 4 and 5 (spacing, radius, shadows), stage 5a (logo), stage 5b (icons). The sign-in page change is its own merge request.
- **This run covers 6 foundations:** Brand, Colours, Typography, Spacing, Radius and Shadows, Icons. Components, motion, dark and auto theme are a later run.

## Where Paradise files go

All Paradise files live in one folder, `paradise/`, at the app root: `paradise/tokens/`, `paradise/fonts/`, `paradise/icons/`, `paradise/adapters/`, `paradise/assets/`. (This run's `paradise/preview/` is kept out of the repository.) Not `src/styles/paradise/` as the skill's default suggests: the repository lints every `src/**/*.css` with `css/no-important`, and Paradise's `motion.css` contains `!important`, so copying the tokens into `src/` would fail `npm run lint`.

## Screens

Captured (Before and After, 1440×900): `/buyer/home`, `/buyer/dashboard`, `/buyer/suppliers`, `/buyer/orders`, `/buyer/rfq`, `/supplier/dashboard`, `/supplier/orders`.
Not captured: `/login` (sign-in, by rule). Other routes were not chosen; the captured ones are each persona's landing page and core lists (plus `/buyer/home`, added on request), because the app records no usage data.

## Inventory and mapping

Counts are occurrences in source (1201 files scanned, comments stripped). Totals: **297 distinct values, 187 mapped, 110 "no match: decide"**.

| Foundation | Found | Mapped | no match: decide |
| --- | --- | --- | --- |
| Colours | 67 | 51 | 16 |
| Font families | 3 | 2 | 1 |
| Font sizes | 34 | 25 | 9 |
| Font weights | 4 | 4 | 0 |
| Spacing | 19 | 17 | 2 |
| Radius | 19 | 13 | 6 |
| Shadows | 13 | 8 | 5 |
| Brand | 6 | 2 | 4 |
| Icons | 132 | 65 | 67 |

### Colours
| Value | Where | Uses | Paradise token | Note |
| --- | --- | --- | --- | --- |
| `#FAFBFC` | Tailwind `bg-page` (page background) | 8 | `--pds-color-background-canvas` |  |
| `#FFFFFF` | Tailwind `bg-surface`, `bg-sidebar` (cards, side menu) | 342 | `--pds-color-background-surface` | Also the WhatsApp mock bubble, which keeps #FFFFFF (third-party look). |
| `#F4F6F8` | Tailwind `bg-hover`; chart hover band; map land fill | 236 | `--pds-color-background-subtle` (map land: --pds-chart-neutral) |  |
| `#E6F4F7` | Tailwind `bg-active-soft`, `teal-soft` | 22 | `--pds-color-brand-subtle` |  |
| `#0D1B2A` | Tailwind `text-primary`, `navy`; `--paragon-navy`; sign-in text; chart series 2 | 987 | `--pds-color-text-primary` (chart series 2: --pds-chart-2) |  |
| `#354A5F` | Tailwind `text-secondary`, `mid`; `--paragon-blue`; chart mid/legend text; flow edge "operator" | 874 | `--pds-color-text-secondary` |  |
| `#5E6A78` | Tailwind `text-tertiary` (1,798 uses); data-grid header text | 1812 | `--pds-color-text-secondary` | Paradise has no tertiary tone, so tertiary and secondary text become one tone. Decide whether that is acceptable. |
| `#64748B` | `--text-secondary` in index.css | 1 | `--pds-color-text-secondary` |  |
| `#94A3B8` | `--text-muted` in index.css; sign-in hint and inactive tab text | 5 | no match: decide | Paradise only has --pds-color-text-disabled for this lightness, which means "disabled". Proposal: --pds-color-text-secondary. |
| `#475569` | sign-in secondary text | 3 | `--pds-color-text-secondary` |  |
| `#0070F2` | Tailwind `action` (primary buttons, links, selected states) | 277 | `--pds-color-action-primary` |  |
| `#0064D9` | Tailwind `action-hover` | 67 | `--pds-color-action-primary-hover` |  |
| `#E6F0FB` | Tailwind `action-soft` (selected backgrounds) | 53 | `--pds-color-brand-subtle` |  |
| `#2A6FBF` | Tailwind `action-muted` (avatars, identity marks); chart identity line | 4 | `--pds-color-brand-primary` |  |
| `#0A6ED1` | `--paragon-sap-blue`, `--status-info` in index.css | 2 | `--pds-color-feedback-info` (sap-blue: --pds-color-action-primary) |  |
| `#0097A7` | Tailwind `teal` (decorative accent); `--paragon-teal`; chart series 1; sign-in accent | 101 | `--pds-color-accent` (chart series 1: --pds-chart-1) | Paradise accent is Paragon blue unless a product theme is chosen, so teal accents turn blue. |
| `#00707E` | Tailwind `teal-hover` (teal used as text) | 56 | `--pds-color-brand-subtle-text` |  |
| `#66C2CD` | chart series 3 | 1 | `--pds-chart-3` |  |
| `#5C7186` | chart series 4 | 1 | `--pds-chart-4` |  |
| `#9BA8B5` | chart series 5 | 1 | `--pds-chart-5` |  |
| `#1E3A5F` | Tailwind `data-navy` (document numbers, amounts); `--paragon-navy-light`; scrollbar thumb; flow edge "birth" | 19 | no match: decide | Paradise has no data-value colour. Proposal: --pds-color-text-primary. The scrollbar thumb maps to --pds-color-border-strong. |
| `#1A2B3C` | `--paragon-navy-mid` (declared, not read) | 1 | no match: decide |  |
| `#00B4C8` | `--paragon-teal-light` (declared, not read) | 1 | no match: decide |  |
| `#107E3E` | Tailwind `success`; `--status-success`; chart/grade A/target met | 124 | `--pds-color-feedback-success` |  |
| `#E8F5EC` | Tailwind `success-soft`; grade A tint | 30 | `--pds-color-feedback-success-background` |  |
| `#DCFCE7` | `--status-success-bg` | 1 | `--pds-color-feedback-success-background` |  |
| `#5B9D6B` | grade B "fair" in chart palette | 1 | no match: decide |  |
| `#D97706` | Tailwind `warning` (dots, bars, borders); target "near" bar | 95 | `--pds-color-feedback-warning` | Bright amber marks become Paradise dark warning ink. Paradise has no separate bright warning fill. |
| `#8A5606` | Tailwind `warning-hover` (warning text) | 213 | `--pds-color-feedback-warning` |  |
| `#B45309` | chart warning; grade C; map highlight stroke | 8 | `--pds-color-feedback-warning` |  |
| `#E9730C` | `--status-warning` | 1 | `--pds-color-feedback-warning` |  |
| `#FEF3D6` | Tailwind `warning-soft`; grade C tint; map highlight fill | 78 | `--pds-color-feedback-warning-background` |  |
| `#FEF3C7` | `--status-warning-bg` | 1 | `--pds-color-feedback-warning-background` |  |
| `#BB0000` | Tailwind `danger`; `--status-error`; grade D; target missed | 294 | `--pds-color-feedback-danger` |  |
| `#FCE4E4` | Tailwind `danger-soft`; grade D tint | 41 | `--pds-color-feedback-danger-background` |  |
| `#FEE2E2` | `--status-error-bg` | 1 | `--pds-color-feedback-danger-background` |  |
| `#1E5BAE` | Tailwind `info`; grade B | 76 | `--pds-color-feedback-info` |  |
| `#E5F0FF` | Tailwind `info-soft`; grade B tint | 28 | `--pds-color-feedback-info-background` |  |
| `#EFF6FF` | `--status-info-bg` | 1 | `--pds-color-feedback-info-background` |  |
| `#5B21B6` | `--status-purple` (badge-purple) | 1 | no match: decide |  |
| `#EDE9FE` | `--status-purple-bg` | 1 | no match: decide |  |
| `#E5E9EE` | Tailwind `border-subtle` (732 uses); chart grid | 763 | `--pds-color-border-default` (chart grid: --pds-chart-grid) |  |
| `#8291A0` | Tailwind `border-input` (form field edges) | 145 | `--pds-color-border-strong` |  |
| `#E2E8F0` | `--surface-border`; sign-in dividers | 4 | `--pds-color-border-default` |  |
| `#CBD5E1` | sign-in input borders | 5 | `--pds-color-border-strong` |  |
| `#F0F4F8` | `--surface-page` | 1 | `--pds-color-background-canvas` |  |
| `#F8FAFC` | `--surface-card-hover` | 1 | `--pds-color-background-subtle` |  |
| `#6B7785` | chart neutral and axis text; flow edge "system" | 4 | `--pds-color-feedback-neutral` (axis text: --pds-color-text-secondary) |  |
| `#D1D8E0` | map land hairline; WhatsApp flow arrow | 2 | `--pds-chart-grid` (flow arrow: --pds-color-border-default) |  |
| `#1A1A1A` | phone mock-up bezel (WhatsApp / WeChat demo) | 3 | no match: decide | Device illustration, not UI. |
| `#07C160` | WeChat brand green | 2 | no match: decide | Third-party brand colour. |
| `#075E54` | WhatsApp header green | 1 | no match: decide | Third-party brand colour. |
| `#ECE5DD` | WhatsApp chat background | 1 | no match: decide | Third-party look. |
| `#DCF8C6` | WhatsApp sent bubble | 1 | no match: decide | Third-party look. |
| `#EDEDED` | WeChat chat background | 1 | no match: decide | Third-party look. |
| `rgba(13,27,42,0.4)` | drawer and modal backdrop | 5 | `--pds-color-scrim` |  |
| `rgba(13,27,42,0.5)` | modal backdrop | 1 | `--pds-color-scrim` |  |
| `rgba(0, 151, 167, 0.15)` | `--paragon-teal-dim` (teal tint) | 1 | `--pds-color-brand-subtle` |  |
| `rgba(13,27,42,0.18)` | week grid sticky-column edge shadow | 2 | no match: decide |  |
| `rgba(13,27,42,0.25)` | week grid sticky-column edge shadow | 1 | no match: decide |  |
| `rgba(0, 0, 0, 0.08)` | part of `--shadow-card` | 1 | `--shadow-light` | Colour inside a shadow; replaced with the shadow token (see Shadows). |
| `rgba(0, 0, 0, 0.04)` | part of `--shadow-card` | 1 | `--shadow-light` | As above. |
| `rgba(0, 0, 0, 0.12)` | part of `--shadow-panel` | 1 | `--shadow-strong` | As above. |
| `rgba(255, 255, 255, 0.04)` | part of `--shadow-topbar` (declared, not read) | 1 | no match: decide |  |
| `rgba(0,0,0,0.4)` | sign-in card shadow | 1 | `--shadow-strong` | As above. |
| `rgba(13, 27, 42, 0.04)` | Tailwind `shadow-sm` | 1 | `--shadow-light` | As above. |
| `rgba(13, 27, 42, 0.08)` | Tailwind `shadow-md` | 1 | `--shadow-medium` | As above. |

Mapped but not changed in the preview: `src/services/data/mock/fixtures/buyerAnalytics.js` (Colours inside a data fixture. Data stays as it is; move them to the chart palette in a later stage.); `src/data/communicationProfiles.js` (Colours stored as data per channel (includes WeChat brand green). Data stays as it is.); `src/pages-v2/SupplierWhatsApp/*` (Imitates WhatsApp / WeChat chrome. Third-party look; no Paradise role.)

### Typography
| Font family | Paradise | Note |
| --- | --- | --- |
| Inter (Tailwind `font-sans`, `--font-sans`, every element via `* {}`) | `--font-body` | Paradise Lato. Inter stops loading from Google Fonts. |
| JetBrains Mono (Tailwind `font-mono`, `.mono`, `--font-mono`) | `--font-mono` | Paradise mono is the system mono stack (Cascadia Code / Consolas on Windows). JetBrains Mono stops loading. |
| inherit (inline `fontFamily`) | no match: decide | Not a font; follows the parent. Nothing to map. |

| Size | px | Uses | Paradise token | Note |
| --- | --- | --- | --- | --- |
| `text-xs` | 12 | 1314 | `--fs-body-3` |  |
| `text-sm` | 14 | 1238 | `--fs-body-2` |  |
| `text-base` | 16 | 40 | `--fs-body-1` |  |
| `text-lg` | 18 | 13 | `--fs-heading-8` |  |
| `text-xl` | 20 | 7 | `--fs-heading-7` |  |
| `text-2xl` | 24 | 4 | `--fs-heading-6` |  |
| `text-3xl` | 30 | 1 | no match: decide | Paradise steps are 26 and 32. |
| `text-title (page h1)` | 30 | 5 | no match: decide | Paradise steps are 26 and 32. Proposal: --fs-heading-4 (32). |
| `text-kpi` | 36 | 14 | `--fs-display-3` |  |
| `text-section` | 16 | 162 | `--fs-title-2` |  |
| `text-label` | 12 | 293 | `--fs-label-2` |  |
| `text-eyebrow` | 12 | 4 | `--fs-label-2` |  |
| `text-meta` | 13 | 60 | no match: decide | No 13px step. Proposal: --fs-body-3 (12) or --fs-body-2 (14). |
| `text-[11px]` | 11 | 145 | `--fs-label-3` |  |
| `text-[10px]` | 10 | 79 | `--fs-caption-1` |  |
| `text-[9px]` | 9 | 9 | no match: decide |  |
| `text-[12px]` | 12 | 2 | `--fs-label-2` |  |
| `text-[13px]` | 13 | 1 | no match: decide |  |
| `text-[14px]` | 14 | 1 | `--fs-body-2` |  |
| `text-[15px]` | 15 | 1 | no match: decide |  |
| `inline fontSize 8` | 8 | 2 | `--fs-caption-2` | Chart tick sizes set as SVG attributes; same value, swap deferred. |
| `inline fontSize 9` | 9 | 8 | no match: decide |  |
| `inline fontSize 10` | 10 | 20 | `--fs-caption-1` | Same value; inline, swap deferred. |
| `inline fontSize 11 / 11px` | 11 | 22 | `--fs-label-3` | Same value; inline, swap deferred. |
| `inline fontSize 12 / 12px` | 12 | 9 | `--fs-body-3` | Same value; inline, swap deferred. |
| `inline fontSize 13px` | 13 | 2 | no match: decide |  |
| `inline fontSize 14px` | 14 | 2 | `--fs-body-2` | Same value; inline, swap deferred. |
| `inline fontSize 16px` | 16 | 1 | `--fs-body-1` | Same value; inline, swap deferred. |
| `inline fontSize 22px` | 22 | 1 | `--fs-title-1` | Same value; inline, swap deferred. |
| `.page-title / .portal-page-title (index.css)` | 20 | 1 | `--fs-heading-7` | Legacy classes, not used by any screen. |
| `.portal-card-header (index.css)` | 14 | 1 | `--fs-title-3` | Legacy class, not used by any screen. |
| `.page-subtitle (index.css)` | 13 | 1 | no match: decide |  |
| `.section-label (index.css)` | 10 | 1 | `--fs-caption-1` | Legacy class, not used by any screen. |
| `.badge (index.css)` | 12 | 1 | `--fs-label-2` | Legacy class, not used by any screen. |

| Weight | Value | Uses | Paradise token | Note |
| --- | --- | --- | --- | --- |
| `font-normal` | 400 | 21 | `--fw-regular` |  |
| `font-medium` | 500 | 183 | `--fw-medium` | Paradise sets --fw-medium to 400 (Lato has no 500), so medium text gets lighter. |
| `font-semibold` | 600 | 492 | `--fw-semibold` | Paradise sets --fw-semibold to 700, so semibold text gets bolder. |
| `font-bold` | 700 | 90 | `--fw-bold` |  |

### Spacing
| Tailwind step | px | Uses | Paradise token | Note |
| --- | --- | --- | --- | --- |
| `0.5` | 2 | 232 | `--space-1` |  |
| `1` | 4 | 880 | `--space-2` |  |
| `1.5` | 6 | 253 | `--space-3` |  |
| `2` | 8 | 1240 | `--space-4` |  |
| `2.5` | 10 | 29 | `--space-5` |  |
| `3` | 12 | 1442 | `--space-6` |  |
| `4` | 16 | 863 | `--space-8` |  |
| `5` | 20 | 261 | `--space-10` |  |
| `6` | 24 | 415 | `--space-11` |  |
| `8` | 32 | 54 | `--space-13` |  |
| `9` | 36 | 3 | `--space-14` |  |
| `10` | 40 | 39 | `--space-15` |  |
| `12` | 48 | 8 | `--space-16` |  |
| `16` | 64 | 5 | `--space-18` |  |
| `20` | 80 | 2 | `--space-19` |  |
| `[10px]` | 10 | 1 | `--space-5` | Arbitrary value; left as written in the After copy. |
| `px` | 1 | 10 | no match: decide | Hairline 1px; Paradise scale starts at 2px. |
| `0` | 0 | 10 | no match: decide | Zero needs no token. |

- .portal-card padding 20px, margin 16px; .kpi-card 16px 20px; .page-container 24px; .badge 2px 10px (index.css) → --space-10 · --space-8 · --space-11 · --space-1 / --space-5 (Legacy classes, not used by any screen.)

### Radius
| Radius | Value | Uses | Paradise token | Note |
| --- | --- | --- | --- | --- |
| `rounded-md` | 10px | 370 | no match: decide | Most used radius (370). Paradise steps are 8 (--radius-large) and 12 (--radius-xl). Proposal: --radius-large. |
| `rounded-lg` | 12px | 343 | `--radius-xl` |  |
| `rounded` | 4px | 134 | `--radius-base` |  |
| `rounded-full` | 9999px | 87 | `--radius-full` |  |
| `rounded-sm` | 6px | 26 | `--radius-medium` |  |
| `rounded-3xl` | 24px | 2 | `--radius-3xl` |  |
| `rounded-[6px]` | 6px | 3 | `--radius-medium` |  |
| `rounded-[10px]` | 10px | 1 | no match: decide |  |
| `rounded-[36px]` | 36px | 2 | no match: decide | Phone mock-up corners. |
| `rounded-[0_10px_10px_10px] / [10px_0_10px_10px]` | chat bubble | 3 | no match: decide | Chat bubble shape in the WhatsApp demo. |
| `inline borderRadius 6 / 6px` | 6px | 5 | `--radius-medium` | Inline style; swap deferred. |
| `inline borderRadius 10` | 10px | 1 | no match: decide |  |
| `inline borderRadius 12px` | 12px | 1 | `--radius-xl` | Inline style; swap deferred. |
| `inline borderRadius 50%` | circle | 1 | `--radius-full` | Inline style; swap deferred. |
| `--radius-sm (index.css)` | 4px | 1 | `--radius-base` |  |
| `--radius-md (index.css)` | 8px | 1 | `--radius-large` |  |
| `--radius-lg (index.css)` | 12px | 1 | `--radius-xl` |  |
| `--radius-pill (index.css)` | 9999px | 1 | `--radius-full` |  |
| `scrollbar thumb 3px (index.css)` | 3px | 1 | no match: decide |  |

### Shadows
| Shadow | Role | Uses | Paradise token | Note |
| --- | --- | --- | --- | --- |
| `shadow-sm` | cards at rest (201 uses) | 201 | `--shadow-light` |  |
| `shadow-md` | tooltips, toasts, side panel, card hover | 11 | `--shadow-medium` |  |
| `shadow-lg` | dropdowns and popovers (identity, select, language, search) | 5 | `--shadow-medium` |  |
| `shadow` | base elements | 224 | `--shadow-light` |  |
| `shadow-2xl` | phone mock-ups (WhatsApp demo) | 2 | `--shadow-strong` |  |
| `shadow-none` | removes a shadow | 1 | no match: decide | Not a value; nothing to map. |
| `shadow-[4px_0_6px_-4px_rgba(13,27,42,0.18)]` | sticky column edge | 2 | no match: decide |  |
| `shadow-[inset_-8px_0_8px_-8px_rgba(13,27,42,0.25)]` | sticky column edge | 1 | no match: decide |  |
| `shadow-[inset_1px_0_0_…action…]` | selected column outline | 1 | no match: decide | A drawn line, not elevation. |
| `inline boxShadow 0 20px 60px rgba(0,0,0,0.4)` | sign-in card | 1 | `--shadow-strong` |  |
| `--shadow-card (index.css)` | legacy cards | 1 | `--shadow-light` |  |
| `--shadow-panel (index.css)` | legacy panel | 1 | `--shadow-strong` |  |
| `--shadow-topbar (index.css)` | declared, not read | 1 | no match: decide |  |

### Brand
| Found | Paradise | Note |
| --- | --- | --- |
| Header product name: text "Paragon Supplier Portal", no logo | `assets/paragon-logo-primary.svg` | After: Paradise logo, then a thin vertical divider, then the unchanged text, on the white header (an approved light surface). |
| Favicon: 🏭 emoji as an inline SVG data URI (app/index.html) | no match: decide | Paradise ships no favicon or app icon. Kept as is. |
| public/favicon.ico (not linked; the data URI wins) | no match: decide | Kept as is. |
| src/assets/paragon-logo.svg, paragon-corp-white.svg (not imported by any file) | `assets/paragon-logo-primary.svg` | Unused files; left in place. |
| Product brand / accent: none set | no match: decide | Paradise product themes are digiso, heron, magpie, nova, sagitarius, siglive. Supplier Portal is none of them, so no data-pds-product is set. |
| Browser theme colour meta #0D1B2A (app/index.html) | no match: decide | A meta tag cannot read a CSS token, and CLAUDE.md says not to edit app/index.html directly. Kept. |

### Icons (lucide-react → Paradise)
| App icon | Uses | Paradise icon |
| --- | --- | --- |
| `AlertTriangle` | 40 | `WarningOutlineIcon` |
| `CheckCircle2` | 29 | `CheckOutlineIcon` |
| `Send` | 21 | `SendIcon` |
| `Info` | 21 | `InfoOutlineIcon` |
| `X` | 20 | `CloseIcon` |
| `Clock` | 20 | `TimeOutlineIcon` |
| `Plus` | 20 | `PlusIcon` |
| `ChevronRight` | 20 | `ChevronRightIcon` |
| `ChevronDown` | 15 | `ChevronDownIcon` |
| `ShieldCheck` | 14 | no match: decide |
| `FileText` | 12 | `FileIcon` |
| `Download` | 12 | `DownloadIcon` |
| `Truck` | 11 | `DeliveryIcon` |
| `FileSpreadsheet` | 10 | `ExcelFileOutlineIcon` |
| `MessageCircle` | 9 | no match: decide |
| `Lock` | 9 | `LockOutlineIcon` |
| `RefreshCw` | 9 | `RefreshIcon` |
| `Upload` | 8 | `UploadIcon` |
| `Globe` | 8 | no match: decide |
| `Inbox` | 7 | no match: decide |
| `ChevronUp` | 7 | `ChevronUpIcon` |
| `Wallet` | 7 | no match: decide |
| `RotateCcw` | 7 | `UndoIcon` |
| `Mail` | 7 | no match: decide |
| `Check` | 6 | `CheckIcon` |
| `ShoppingCart` | 6 | `TroliOutlineIcon` |
| `TrendingUp` | 6 | no match: decide |
| `TrendingDown` | 6 | no match: decide |
| `Award` | 5 | no match: decide |
| `ClipboardCheck` | 5 | no match: decide (kept as lucide by request, 2026-10-19; Paradise candidate was `CheckListIcon`) |
| `Users` | 5 | no match: decide |
| `ExternalLink` | 5 | `NewTabOutlineIcon` |
| `Activity` | 5 | no match: decide |
| `MessageSquare` | 5 | no match: decide |
| `ArrowRight` | 5 | `ArrowRightIcon` |
| `Trophy` | 5 | no match: decide |
| `BellRing` | 4 | `RemindBellOutlineIcon` |
| `BookOpen` | 4 | no match: decide |
| `Building2` | 4 | `CompanyIcon` |
| `XCircle` | 4 | `CloseOutlineIcon` |
| `Minus` | 4 | `MinusIcon` |
| `ClipboardList` | 4 | `CheckListIcon` |
| `PackageCheck` | 3 | no match: decide |
| `SlidersHorizontal` | 3 | `FilterOutlineIcon` |
| `Boxes` | 3 | no match: decide |
| `CalendarDays` | 3 | `CalendarOutlineIcon` |
| `FlaskConical` | 3 | no match: decide |
| `Layers` | 3 | `LayersIcon` |
| `Link2` | 3 | no match: decide |
| `Radio` | 3 | no match: decide |
| `Receipt` | 3 | no match: decide |
| `Search` | 3 | `SearchOutlineIcon` |
| `Bell` | 3 | `RemindBellOutlineIcon` |
| `Trash2` | 3 | `DeleteOutlineIcon` |
| `Database` | 3 | no match: decide |
| `ChevronLeft` | 3 | `ChevronLeftIcon` |
| `Sparkles` | 3 | no match: decide |
| `AlertOctagon` | 3 | `HazardOutlineIcon` |
| `Package` | 3 | `BoxIcon` |
| `Ship` | 3 | no match: decide |
| `Eye` | 3 | `EyeOpenOutlineIcon` |
| `Phone` | 3 | no match: decide |
| `ArrowLeft` | 3 | `ArrowLeftIcon` |
| `CreditCard` | 3 | no match: decide |
| `Anchor` | 2 | no match: decide |
| `CalendarClock` | 2 | no match: decide |
| `FileQuestion` | 2 | no match: decide |
| `ListChecks` | 2 | `CheckListIcon` |
| `Tags` | 2 | `TagOneIcon` |
| `Target` | 2 | no match: decide |
| `UserCog` | 2 | no match: decide |
| `Maximize2` | 2 | `FullScreenIcon` |
| `Loader2` | 2 | no match: decide |
| `User` | 2 | `UserOutlineIcon` |
| `ArrowUpRight` | 2 | no match: decide |
| `UploadCloud` | 2 | `UploadIcon` |
| `PenLine` | 2 | `EditOutlineIcon` |
| `Shield` | 2 | no match: decide |
| `FilePlus2` | 2 | no match: decide |
| `ScrollText` | 2 | no match: decide |
| `Globe2` | 2 | no match: decide |
| `Archive` | 2 | `ArchiveIcon` |
| `MapPin` | 2 | `LocationOutlineIcon` |
| `UserPlus` | 2 | `AddUserIcon` |
| `GitBranch` | 2 | no match: decide |
| `FileWarning` | 2 | no match: decide |
| `Languages` | 1 | no match: decide |
| `Scale` | 1 | no match: decide |
| `Container` | 1 | no match: decide |
| `CalendarCheck` | 1 | no match: decide |
| `CalendarSync` | 1 | no match: decide |
| `ChartLine` | 1 | no match: decide |
| `DatabaseZap` | 1 | no match: decide |
| `Factory` | 1 | no match: decide |
| `FileSearch` | 1 | no match: decide |
| `Gauge` | 1 | no match: decide |
| `KeyRound` | 1 | no match: decide |
| `LockKeyhole` | 1 | `LockOutlineIcon` |
| `ListTodo` | 1 | `CheckListIcon` |
| `MessageSquareReply` | 1 | no match: decide |
| `ShieldHalf` | 1 | no match: decide |
| `Workflow` | 1 | no match: decide |
| `Menu` | 1 | `HamburgerMenuIcon` |
| `Sigma` | 1 | no match: decide |
| `Paperclip` | 1 | `PaperClipIcon` |
| `Calendar` | 1 | `CalendarOutlineIcon` |
| `FileCheck2` | 1 | `FileSuccessIcon` |
| `MessageSquarePlus` | 1 | no match: decide |
| `ArrowDown` | 1 | `ArrowDownIcon` |
| `ArrowUp` | 1 | `ArrowUpIcon` |
| `Plane` | 1 | no match: decide |
| `ArrowLeftRight` | 1 | `SwitchIcon` |
| `Ban` | 1 | no match: decide |
| `Pencil` | 1 | `EditOutlineIcon` |
| `BarChart3` | 1 | no match: decide |
| `Settings` | 1 | `SettingOutlineIcon` |
| `PenSquare` | 1 | `EditOutlineIcon` |
| `Handshake` | 1 | no match: decide |
| `HelpCircle` | 1 | `HelpOutlineIcon` |
| `Compass` | 1 | no match: decide |
| `Circle` | 1 | no match: decide |
| `CircleDot` | 1 | no match: decide |
| `Minimize2` | 1 | no match: decide |
| `Files` | 1 | no match: decide |
| `CalendarRange` | 1 | no match: decide |
| `PencilLine` | 1 | `EditOutlineIcon` |
| `EyeOff` | 1 | `EyeCloseIcon` |
| `Edit3` | 1 | `EditOutlineIcon` |
| `AlertCircle` | 1 | no match: decide |
| `History` | 1 | `HistoryIcon` |
| `Gavel` | 1 | no match: decide |
| `ShieldAlert` | 1 | no match: decide |

## Variable name collisions (rename before stage 1)
| App name | Rename to | File | Why |
| --- | --- | --- | --- |
| --text-primary | --app-text-primary | src/index.css | Paradise theme.css defines --text-primary (compatibility alias). |
| --text-secondary | --app-text-secondary | src/index.css | Paradise theme.css defines --text-secondary. |
| --font-mono | --app-font-mono | src/index.css (declaration and the .mono rule) | Paradise typography.css defines --font-mono. |

## Adapters
- `paradise/adapters/lucide-react.jsx` (stage 5b). The Vite and Vitest configs point the module name `lucide-react` at it, so the 132 icon imports across the app keep working unchanged. Mapped icons render the Paradise glyph and keep lucide's class names; unmapped icons pass straight through from lucide-react. **To remove later:** move each call site to `<Icon name="…" />` from `paradise/icons/Icon.jsx`, then delete the alias entry in `vite.config.js` and `vitest.config.js`, then delete the adapter.

## Gaps and decisions
- **Text tones.** Paradise has primary, secondary and disabled text only. The app's tertiary grey (`text-tertiary`, 1,798 uses) is mapped to `--pds-color-text-secondary`, so two tones become one. Proposal: accept.
- **Teal accent.** Teal is the app's decorative accent (charts, dials, low-emphasis links). Paradise's `--pds-color-accent` is Paragon blue unless a product theme is set, and Supplier Portal is not one of the six approved products. Proposal: accept blue, or ask the Paradise team for a product theme.
- **Warning colour.** The app splits warning into a bright amber fill (#D97706) and a dark amber text colour. Paradise has one warning ink (`--pds-color-feedback-warning`, dark olive) plus a pale background. Bright amber dots and bars become dark. Proposal: accept, or request a graphical warning token.
- **Chart palette.** The app's 5-step teal/navy series ramp maps to `--pds-chart-1` to `--pds-chart-5`, a multi-hue categorical palette. This conflicts with the app's own DP-2 rule (no rainbow charts). Proposal: decide which rule wins before stage 2 reaches charts.
- **Data colour.** `data-navy` (#1E3A5F) colours every document number and amount; Paradise has no data-value colour. Kept as is. Proposal: `--pds-color-text-primary`.
- **Most-used radius.** `rounded-md` is 10px (370 uses); Paradise steps are 8px and 12px. Kept at 10px. Proposal: `--radius-large` (8px).
- **Page title and meta sizes.** `text-title` / `text-3xl` (30px) and `text-meta` (13px) have no Paradise step. Kept. Proposal: `--fs-heading-4` (32px) and `--fs-body-3` (12px).
- **Monospace.** The app's design rule DP-3 uses JetBrains Mono for all data; Paradise `--font-mono` is the system mono stack (Cascadia Code / Consolas on Windows). Applied in the preview. Proposal: accept, or keep JetBrains Mono as an override.
- **Two scrim strengths become one.** `ModalOverlay` has a light (40%) and dark (50%) backdrop; both map to `--pds-color-scrim`.
- **Third-party looks.** WhatsApp/WeChat demo colours, the phone bezel and channel colours stored in data files are kept as they are.
- **Favicon.** Paradise ships no favicon or app icon. The factory emoji stays. Proposal: ask the Paradise team for a Paragon mark, or derive one from the logo.
- **Browser theme colour.** `app/index.html` sets `theme-color` #0D1B2A, and the repository rule says not to edit `app/index.html` directly. Kept.

## Known unknowns
- **Lato missing from the snapshot.** `paradise/tokens/fonts.css` holds only a comment. Lato 400/700/900 (latin subset, woff2) was taken from the npm package `@fontsource/lato` 5.3.0 (SIL Open Font License 1.1) into the After copy only. Proposed decision: self-host these three files in `paradise/fonts/` when stage 3 is approved. Note: only the latin subset is included; it covers English and Indonesian.
- **Sign-in and backend.** No screen needed sign-in or a backend: the app runs on in-memory mock data and has no route guard. `/login` itself was left uncaptured by rule. The Vercel access gate (`middleware.js`) does not run in a local build.
- **Logo and favicon formats.** Paradise has one logo (SVG) and no favicon, no app icon, no white/reverse logo. See decisions.

## Stages

### Stage 1 · Load tokens (no visual change)
- **Status:** applied (whole system), not yet committed
- **What changes:** Copy the Paradise token files into `paradise/tokens/` and import them first from `src/index.css`, in the order colors, product-brands, typography, spacing, radius, shadow, motion, layout, theme. `base.css` is left out. Three app variables that share a name with Paradise are renamed first (`--text-primary`, `--text-secondary`, `--font-mono` → `--app-…`). The scope root gets `data-pds-theme="light"` and the Paradise focus ring rule, scoped to it.
- **What users will see:** Nothing, except a Paradise blue focus ring when moving through controls with the keyboard inside the approved scope.
- **Files:** new `paradise/tokens/*.css`, `paradise/VERSION.md`, `paradise/paradise.css`; edited `src/index.css` (one import, three renames); the scope root element (`src/main.jsx` for the whole system).
- **Check:** `npm run build`, `npx vitest run`; computed styles unchanged on the captured screens.
- **Risk:** Low. Only custom properties are added. Renames are local to `src/index.css`.
- **Rollback:** Revert the stage commit, or delete the import line in `src/index.css` and the `paradise/tokens/` folder.

### Stage 2 · Colour
- **Status:** applied (whole system), not yet committed
- **What changes:** Point every Tailwind theme colour, the colour variables in `src/index.css`, the chart palette, the grade colour maps, the sign-in inline colours and the drawer/modal backdrops at Paradise semantic tokens, by role. Tailwind colours use `color-mix(... var(--pds-…) ...)` so opacity modifiers like `border-warning/30` keep working. Values marked "no match: decide" keep their current value.
- **What users will see:** Paragon blue instead of bright blue on buttons and selected states; teal accents turn blue; warning marks turn dark olive; charts become multi-hue; text slightly warmer slate.
- **Files:** `tailwind.config.js`, `src/index.css`, `src/pages-v2/plan-grid/planGrid.css`, `src/lib/chartPalette.js`, `src/pages-v2/SupplierDashboard/components/GradeBadge.jsx`, `src/pages-v2/BuyerScorecard.jsx`, `src/pages-v2/SupplierPerformance.jsx`, `src/pages/auth/Login.jsx`, plus backdrop classes in `SidebarV2.jsx`, `ExpandableWidget.jsx`, `ModalOverlay.jsx`, `SidePanel.jsx`, `RfqAuthoring/components/Dialog.jsx`.
- **Check:** Build, tests, and the colour-contrast guard specs; compare screens.
- **Risk:** Medium. The largest visual change. Tests that pin hex values in `chartPalette` fail by design and need updating in the same change (see run record).
- **Rollback:** Revert the stage commit. Partial scope: remove `data-pds-theme` from the scope root.

### Stage 3 · Type: self-host Lato 400, 700 and 900
- **Status:** applied (whole system), not yet committed
- **What changes:** Self-host Lato in `paradise/fonts/` and switch the UI font to `--font-body`, the mono font to `--font-mono`, Tailwind size and weight utilities to `--fs-*` / `--fw-*`, and arbitrary sizes (`text-[11px]`, `text-[10px]`, `text-[12px]`, `text-[14px]`) to their tokens. Inter and JetBrains Mono stop loading from Google Fonts.
- **What users will see:** Lato everywhere instead of Inter; medium text lighter, semibold bolder; data in Consolas/Cascadia instead of JetBrains Mono. Sizes unchanged.
- **Files:** new `paradise/fonts/` (3 woff2, `lato.css`, licence); edited `tailwind.config.js`, `src/index.css`, `src/styles/tailwind.css`, and the source files carrying arbitrary text sizes (79 in the preview).
- **Check:** Build, tests; confirm `document.fonts.check('16px Lato')` is true on each screen; scan for text overflow in tables and buttons.
- **Risk:** Medium. Narrower glyphs and weight shifts can change line breaks; no external font request any more (a privacy plus).
- **Rollback:** Revert the stage commit.

### Stage 4 · Spacing and radius
- **Status:** applied (whole system), not yet committed
- **What changes:** Point Tailwind spacing steps and radius steps at `--space-*` and `--radius-*`. Every spacing step used is already an exact Paradise value. Radius: 4px, 6px, 12px, 24px and full map exactly; 10px is kept pending your decision.
- **What users will see:** Nothing for spacing. Radius: nothing until you decide on the 10px corners.
- **Files:** `tailwind.config.js`, `src/index.css` (radius variables), and `rounded-[6px]` in a few source files.
- **Check:** Build, tests; pixel compare of captured screens.
- **Risk:** Low.
- **Rollback:** Revert the stage commit.

### Stage 5 · Elevation (limited to shadows in this run)
- **Status:** applied (whole system), not yet committed
- **What changes:** Point Tailwind `shadow`, `shadow-sm`, `shadow-md`, `shadow-lg`, `shadow-2xl` and the CSS shadow variables at `--shadow-light`, `--shadow-medium` and `--shadow-strong` by role. Sticky-column edge shadows keep their values. Motion and z-index are a later run.
- **What users will see:** Cards gain a soft bottom shadow; dropdowns and popovers get a lighter, softer shadow than Tailwind's default.
- **Files:** `tailwind.config.js`, `src/index.css`, `src/pages/auth/Login.jsx` (card shadow).
- **Check:** Build, tests; compare screens.
- **Risk:** Low.
- **Rollback:** Revert the stage commit.

### Stage 5a · Brand
- **Status:** applied (whole system), not yet committed
- **What changes:** Show the Paradise logo (`assets/paragon-logo-primary.svg`, copied to `paradise/assets/`) at the left of the top bar, then a thin vertical divider (1px, `--pds-color-border-default` through the Tailwind `border-subtle` colour), then the unchanged product name. The logo and divider are marked decorative because the text beside it names the product. Favicon, theme-colour meta and product theme stay as they are (see decisions).
- **What users will see:** A Paragon logo in the header, separated from the product name by a thin vertical line.
- **Files:** new `paradise/assets/paragon-logo-primary.svg`; edited `src/components/layout-v2/TopBarV2.jsx` (one import, one `<img>`, one divider `<span>`).
- **Check:** Build, tests (`TopBarV2.test.jsx` still finds the product name text).
- **Risk:** Low.
- **Rollback:** Revert the stage commit, or delete the `<img>` line, the divider line and the logo import.

### Stage 5b · Icons
- **Status:** applied (whole system), not yet committed
- **What changes:** Copy `paradise/icons/` and add the adapter `paradise/adapters/lucide-react.jsx`; alias the module name `lucide-react` to it in `vite.config.js` and `vitest.config.js`. 65 icons with a same-meaning Paradise glyph render it; 67 without one stay lucide. No call site changes.
- **What users will see:** About half the icons change to Paradise glyphs (filled-outline style); screens mix the two styles until gaps are decided.
- **Files:** new `paradise/icons/*`, `paradise/adapters/lucide-react.jsx`; edited `vite.config.js`, `vitest.config.js`.
- **Check:** Build, tests; visually check each swapped icon's meaning in the report's icon table.
- **Review:** the author checked the meaning of every swapped icon in the icon table above (2026-10-27).
- **Risk:** Low to medium. A wrong-meaning match is the main risk; the table shows each pair.
- **Rollback:** Remove the alias entry from both configs (one line each); delete the adapter.

### Stage 6 · Components — later run
### Stage 7 · Themes (dark, auto) — later run
### Stage 8 · Conformance check — later run

## Preview run record

| Run | Before copy | After copy |
| --- | --- | --- |
| Baseline build | build passed | build passed |
| Baseline tests | 9,061 passed, 257 failed of 9,318 | 9,066 passed, 252 failed of 9,318 |
| After stages 1–5b: build | — | build passed |
| After stages 1–5b: tests | — | 9,183 passed, 135 failed of 9,318 |

Failing tests in the After copy:
- Caused by Paradise (3 files, 6 tests). All of them check an old hex value and are expected to fail when colours move to tokens; each needs updating in the same change as stage 2:
- `src/lib/chartPalette.test.js` (2 tests) expects TARGET_STATUS to be #107E3E / #D97706 / #8A5606 / #BB0000.
- `src/pages-v2/chartPalette.guard.test.jsx` (3 tests) are probes that expect raw hex to still exist in the grade maps and chartPalette so they are not vacuous. With hex gone they report themselves vacuous; the guard needs re-aiming, not deleting.
- `src/components/ui-v2/sharedA11y.test.jsx` (1 test) expects Tailwind border-input to be #8291A0. Paradise --pds-color-border-strong is #7A7A7A (4.3:1 on white, above the 3:1 it guards).
- Not caused by Paradise, fail identically in Before on this Windows machine: `src/router/pageWidth.guard.test.js` (backslash path), `src/lib/a11yGate/a11yGate.test.js`, `src/pages-v2/uninterpolatedPlaceholder.guard.test.jsx` and `src/services/sdc/__tests__/materialMasterRef.contract.test.js` (population probes), plus page tests that time out at 5 s.

## Apply record (whole system, 2026-10-19)

Applied with the same scripted, match-asserted edits as the preview, on `main` @ `7062d1bc` (which had moved since the preview; none of the files Paradise touches had changed). Differences from the preview, each needed for the repository's own checks:

- `src/index.css`: `font-family` on `*` and `.mono` gained a generic fallback (`sans-serif`, `monospace`), because the CSS lint rule `css/font-family-fallbacks` cannot see the fallback inside `var(--font-body)`.
- `src/index.css`: one `/* eslint-disable css/no-invalid-properties */` with its reason. The CSS linter does not follow `@import`, so it reported each Paradise token as unknown (41 warnings, which took the total over the ceiling in `scripts/floor.json`).
- 5 tests updated to read the new token values instead of the old hex, keeping what each checks: `src/lib/chartPalette.test.js` (2), `src/pages-v2/chartPalette.guard.test.jsx` (2 vacuity controls now match the declarations and token strings), `src/components/ui-v2/sharedA11y.test.jsx` (1).
- `tailwind.config.js`: the `@type {Config}` comment moved onto the export and the colour helper got its own JSDoc, so the spec typecheck (`tsc -p tsconfig.vitest.json`) passes.
- 35 changed source files re-wrapped by Prettier (longer class names).
- **Checks on the applied branch:** build passes; both typechecks pass; lint 0 errors, 701 warnings (ceiling 707); gate suite 7/7. Full test suite: 9,358 passed, 106 failed of 9,464 — 90 of the 106 were 5 s timeouts. Rerunning the 33 failing files one at a time with a 120 s timeout left 6 failures, and the same 6 fail identically on untouched `main` (Windows-path population probes in `pageWidth.guard`, `a11yGate`, `uninterpolatedPlaceholder.guard`, `materialMasterRef.contract`). None is caused by Paradise.
- **Rollback:** discard the branch, or revert its commit.

## Approval

Choose one scope and the stages to run in it:

- **One part of a page (for example the top bar on every screen).** Stages: 1, 5a, plus 2–3 limited to that part. Risk: Lowest. `data-pds-theme` goes on that part only; the rest of the app is unchanged. A styled part can look out of place beside unstyled neighbours. Rollback: Revert the one commit.
- **One page (proposed: `/buyer/dashboard`).** Stages: 1–5, 5a; 5b is app-wide by nature (one alias), so leave it for a wider scope. Risk: Low. Tailwind theme changes are global, so a page scope needs scoped utilities or a page-level wrapper; the plan would add the scope attribute on the page's top element and keep global theme values unchanged. Rollback: Revert the one commit.
- **Several pages (for example the six previewed screens).** Stages: 1–5, 5a. Risk: Medium. Same mechanism as one page, repeated; navigation between styled and unstyled pages will feel inconsistent. Rollback: Revert the one commit.
- **Whole system (what the preview shows).** Stages: 1–5, 5a, 5b (choose any subset). Risk: Medium. Largest visible change; tests that pin hex values or class names need updating in the same change; decisions above should be settled first. Rollback: Revert the one commit; each stage can also be its own commit so it can be reverted alone.

| Approved scope | Stages | Starting commit | Date |
| --- | --- | --- | --- |
| Whole system | 1, 2, 3, 4, 5, 5a, 5b | `7062d1bc30becbcac843131fff77d00ec9812eac` (main) | 2026-10-19 |
