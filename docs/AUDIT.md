# Paragon Supplier Portal — Pre-Release Audit

Date: 2026-10-27 · Commit: `17c403c4` (`main`, merge of MR !44) · Scope: the
access gate (`middleware.js`, `gate/`), deploy config (`vercel.json`), CI
(`.gitlab-ci.yml`, `.github/workflows/gates.yml`), dependencies, the build
output, and the client-side data, authorization and file-handling paths in
`src/`.
Method: targeted source read of the gate and every path named below; grep
sweeps for injection sinks, secrets and scheme handling; `npm audit`; one
production build. Every figure here comes from a command run on this date; raw
audit output is in [`docs/evidence/npm-audit-2026-10-27.json`](evidence/npm-audit-2026-10-27.json).

**The governing fact.** The portal is a browser-only prototype on sample data:
no backend, no database, no SAP link ([`README.md:17-18`](../README.md)). Every
client-side weakness below can only change the attacker's *own* in-browser
state, so none rates High today. Several become High the day
`httpDataService` ships; those carry a **Before backend** tag.

## 0. Baseline measurements

**Machine:** Apple M5, 24 GB RAM, macOS 27.0.1, Node 26.8.1, npm 11.19.0.

| Measure | Value | Command |
|---|--:|---|
| Tracked files | 2,423 | `git ls-files \| wc -l` |
| `npm audit`, all dependencies | **15** (2 critical, 9 high, 3 moderate, 1 low) of 604 packages | `npm audit --json` |
| `npm audit`, production tree | **4 high** (`@vercel/functions → @vercel/oidc → @vercel/cli-config → zod`) | `npm audit --omit=dev --json` |
| Production build time | 5.93 s | `npm run build` |
| `dist/` size | 5.3 MB | `du -sh dist` |
| Largest JS chunk | **5,104 KB** raw, **1,338,836 B** gzip | `du -k`, `gzip -c \| wc -c` |
| JS chunks / source maps emitted | 4 / 0 | `ls dist/assets` |
| `<Route>` entries / `lazy()` calls in the router | 97 / **0** | `grep -c` on `src/router/AppRouter.jsx` |
| Secret patterns in tracked files | 0 hits | `git grep` for key, token and private-key patterns |
| HTML-injection sinks in `src/`, `gate/`, `app/` | 0 | `git grep` for `innerHTML`, `eval(`, `new Function(`, `document.write` |

**Not measured.** `npm run gates` was not run (no Node 24 on this machine;
Node 26 fails 36 known tests). No load time, no Lighthouse score and no live
check of the Vercel deployment's response headers or WAF settings.

## 1. Findings — ranked

Severity: **Medium** = a real weakness on an internet-reachable path, or a
measured cost every user pays. **Low** = confirmed, but impact bounded by
sample data or the attacker's own session. Each finding is
*confirmed* unless marked otherwise.

### M1 — The gate login has no rate limit or lockout (Security)

- Entry: `POST /__gate/login` — [`gate/handler.js:78`](../gate/handler.js)
- Control: none; `checkCredentials` runs on every request — [`gate/handler.js:55-59`](../gate/handler.js)
- Sink: session issued on match — [`gate/handler.js:89-92`](../gate/handler.js)

The gate is the only thing between the internet and the whole prototype
(app bundle, business rules, sample data). A wrong guess costs one request and
returns 401 immediately; nothing counts attempts. **Medium, not High:** what it
guards is a prototype on sample data, and password strength is unknown (O1).
**Not Low:** it is the single, externally reachable control.
**Fix:** a Vercel WAF rate-limit rule on `/__gate/login`, or a per-IP counter
in the gate returning 429.

### M2 — No dependency audit in the merge gate; 15 advisories accumulated (Supply chain)

- Control missing: [`.gitlab-ci.yml`](../.gitlab-ci.yml) (the merge gate since
  2026-10-14) and the manual [`.github/workflows/gates.yml`](../.github/workflows/gates.yml)
  run no `npm audit`.
- Evidence: 15 advisories, including critical `vitest` / `tinypool` and high
  `vite`, `postcss`, `@vercel/functions` (raw output above).

**Medium:** the advisories exist and nothing in CI would surface the next one.
**Not High:** none is shown reachable in production (see Ruled out R5).
**Fix:** add `npm audit --omit=dev --audit-level=high` as a gate step; upgrade
`@vercel/functions`, `vite`, `vitest`.

### M3 — One 5.1 MB JavaScript chunk; no route is code-split (Performance)

- Location: [`src/router/AppRouter.jsx`](../src/router/AppRouter.jsx) — 97
  routes, 0 `lazy()`; Vite warns on every build.

Every user downloads and parses 1.34 MB gzip before the first screen, whatever
page they open. **Medium:** measured, and paid on every cold load. **Not High:**
no load-time target exists to miss, and load time was not measured.
**Fix:** `React.lazy` per page folder in `src/pages-v2/`, then re-measure.

### L1 — Authorization and tenant scoping run only in the browser (Security) · Before backend

- Control: `dispatcher.js` refuses with `SCOPE_DENIED` — [`src/services/transitions/dispatcher.js:4-7`](../src/services/transitions/dispatcher.js)
- Bypass: persona and tenant are read from `localStorage` — [`src/context/identitySources.js:50-100`](../src/context/identitySources.js)

The checks are real but sit in code the user controls. **Low:** with no
backend, a bypass only changes the attacker's own sample data. This is already
the stated design ([`README.md:290-291`](../README.md)). **High the day real
data exists** unless every check moves server-side.

### L2 — Every tenant's fixtures ship in the bundle (Information disclosure) · Before backend

- Location: `mockDataService` mounted unconditionally — [`src/main.jsx:9,24-25`](../src/main.jsx)

Any user past the gate can read every supplier's sample records from the
JavaScript. **Low:** the records are sample data. **Fix:** none needed until
real data; then the data must come from the backend, scoped per tenant.

### L3 — Security headers are set on gate pages only (Security)

- Control: `SECURITY_HEADERS` — [`gate/handler.js:15-20`](../gate/handler.js), applied only by `htmlResponse`
- Gap: authenticated requests pass through `next()` — [`gate/handler.js:99`](../gate/handler.js), [`middleware.js`](../middleware.js); [`vercel.json`](../vercel.json) has no `headers` block

So the app itself has no `X-Frame-Options` (clickjacking), `nosniff` or
`Referrer-Policy`. **Low:** a framed click can only act on the victim's own
in-browser state. **Fix:** a `headers` block in `vercel.json` with the same four
headers.

### L4 — No Content-Security-Policy anywhere (Security)

- Gap: neither `gate/handler.js` nor `vercel.json` sets one.

No injection sink was found (Ruled out R4), so this is defence in depth.
**Low.** **Fix:** start with `default-src 'self'` in report-only mode.

### L5 — Sessions last 7 days and cannot be revoked one at a time (Security)

- Location: `TTL_SECONDS` — [`gate/handler.js:13`](../gate/handler.js); cookie — [`gate/handler.js:50`](../gate/handler.js)

The only revocation is rotating `GATE_SECRET`, which signs everyone out.
**Low:** one shared identity, so there is no single user to revoke. **Fix:**
shorter TTL now; a session store with real sign-in (BL-28).

### L6 — Credential length leaks through timing (Security)

- Location: `timingSafeEqual` returns early on length mismatch — [`gate/session.js:43-46`](../gate/session.js), called at [`gate/handler.js:56-57`](../gate/handler.js)

The comparison is constant-time only for equal lengths, so response time can
reveal the username and password lengths. **Low:** narrows a brute force (M1)
but does not bypass anything. **Fix:** compare HMACs of both strings.

### L7 — Logout is a GET, so any page can sign a user out (Security)

- Location: [`gate/handler.js:74-76`](../gate/handler.js)

A cross-site link or image to `/__gate/logout` clears the session. **Low:**
nuisance only. **Fix:** accept logout on POST only.

### L8 — Uploaded files open as same-origin `blob:` pages (Security) · Before backend

- Entry: file inputs; `accept` is a browser hint only (e.g. [`SupplierRfp/index.jsx:324`](../src/pages-v2/SupplierRfp/index.jsx))
- Sink: `URL.createObjectURL(file)` — [`src/services/attachments/sessionAttachments.js:28-29`](../src/services/attachments/sessionAttachments.js), opened with `target="_blank"` — [`src/components/ui-v2/SessionAttachments.jsx:149-151`](../src/components/ui-v2/SessionAttachments.jsx)

An uploaded `.html` file opened from the list runs script in the portal's
origin. **Low:** attachments live in the uploader's own session, so this is
self-XSS. **High once files are shared** through a backend (BL-27): serve them
with `Content-Disposition: attachment` from a separate origin.

### L9 — Failed gate logins are not logged (Repudiation)

- Location: the 401 branch — [`gate/handler.js:93`](../gate/handler.js)

A brute force (M1) would leave no trace in the repo's code; only Vercel's
platform logs exist. **Low.** **Fix:** log failed attempts with IP and time.

### L10 — No automated accessibility check (Accessibility)

- Gap: no `axe-core`, `jest-axe` or `eslint-plugin-jsx-a11y` in
  [`package.json`](../package.json) or [`eslint.config.js`](../eslint.config.js),
  against 747 `aria-` attributes in `src/`.

The intent is visible; nothing verifies it. **Low:** no WCAG target is stated.
**Fix:** `eslint-plugin-jsx-a11y` under the existing lint ceiling, then axe in
the route smoke tests.

### L11 — Nothing enforces Node 24 outside CI (Correctness)

- Location: no `engines` field in [`package.json`](../package.json); [`.nvmrc`](../.nvmrc) says `24`, and CI uses `image: node:24` ([`.gitlab-ci.yml:32`](../.gitlab-ci.yml))

On Node 26, 36 tests fail in 5 files (stated in the workspace README; not
re-run here). `.nvmrc` only helps users of nvm. **Low.** **Fix:**
`"engines": { "node": "24.x" }` plus `engine-strict=true` in `.npmrc`.

## 2. Threat model summary (STRIDE)

| Threat | Surface | Status |
|---|---|---|
| **Spoofing** | Shared gate credential; persona and tenant in `localStorage` | Signed HMAC session, constant-time compare; open: M1, L1, L6, O1, O2 |
| **Tampering** | Client-side state, transition rules | Dispatcher checks run, but in the browser (L1); no server state exists to tamper with |
| **Repudiation** | Gate logins | No logging (L9); no per-user identity to attribute actions to |
| **Information disclosure** | App bundle, fixtures, headers | Bundle gated at the edge; no source maps (R1); all tenants' fixtures in the bundle (L2); app responses lack headers (L3) |
| **Denial of service** | Gate, bundle | No login throttle (M1); 1.34 MB gzip cold load (M3); production `zod` advisory not reachable (R5) |
| **Elevation of privilege** | Roles and scope | Stored roles filtered per persona, but persona chosen client-side (L1); uploaded HTML runs in-origin (L8) |

## 3. Fix plan

| Phase | Findings | Change | Effort |
|---|---|---|---|
| **1. Now** (one PR) | L3, L4, L6, L7 | `vercel.json` headers block plus report-only CSP; HMAC-based compare; POST-only logout; tests in `gate/session.test.js` | S |
| **2. Now** (one PR) | M2, L11 | `npm audit --omit=dev --audit-level=high` in `.gitlab-ci.yml`; upgrade `@vercel/functions`, `vite`, `vitest`; `engines` field | S |
| **3. Before wider sharing** | M1, L9, O3 | WAF rate-limit rule on `/__gate/login` (or an in-gate counter); log failed attempts; confirm deployment protection | S–M |
| **4. Next release** | M3, L10 | Route-level `React.lazy`; `eslint-plugin-jsx-a11y`; re-measure the chunk | M |
| **5. With the backend (BL-28, BL-27, BL-30)** | L1, L2, L5, L8 | Server-side authorization and tenant scoping; per-tenant data from `httpDataService`; real sessions; files served from a separate origin as attachments | L |

Residual risks for the README register map as follows: R-01 = L1, R-02 = M1,
R-03 = L5, R-04 = L3 and L4, R-05 = M2, R-06 = L6, R-07 = L7, R-08 = L9.

## Open items

- **O1 — Production gate password strength is unknown.** The README's local
  example uses `GATE_USER=demo GATE_PASSWORD=demo` ([`README.md:582`](../README.md)).
  Nothing in the repo shows what production uses, and nothing enforces a
  minimum. Matters because of M1.
- **O2 — `GATE_SECRET` strength is not enforced.** The gate checks only that it
  is set ([`gate/handler.js:70`](../gate/handler.js)); a short secret would make
  session forgery feasible. The production value was not inspected.
- **O3 — Vercel-side protections are not visible in the repo.** A WAF rule or
  Deployment Protection could already close M1; this audit could not check the
  Vercel project settings.

## Ruled out

- **R1 — Source code exposure through source maps.** Safe because Vite's
  default `build.sourcemap: false` applies ([`vite.config.js:64-67`](../vite.config.js)
  sets no override), and the measured build emitted 0 `.map` files.
- **R2 — Secrets in tracked files or history.** Safe because `.env*` is
  ignored ([`.gitignore:18`](../.gitignore)), the pattern scan of tracked files
  found 0 hits, and history holds only placeholder values (`demo`,
  `change-me`, `...`).
- **R3 — `javascript:` injection through 3PL tracking links.** Safe because
  `trackingPatternRefusal` requires `https://`
  ([`src/services/transitions/threePlStore.js:133`](../src/services/transitions/threePlStore.js))
  and `trackingUrlFor` returns `null` on any refusal before the `href` is built
  ([`threePlStore.js:285`](../src/services/transitions/threePlStore.js)); the
  tracking number is `encodeURIComponent`-escaped (`:288`).
- **R4 — HTML injection.** Safe because `src/`, `gate/` and `app/` contain no
  `dangerouslySetInnerHTML`, `innerHTML`, `eval` or `new Function`, so all
  rendered text passes through React's escaping. (L8 is a separate, file-based
  path.)
- **R5 — The production `zod` advisory being reachable at runtime.** Safe
  because `middleware.js` imports only `next` from the root of
  `@vercel/functions`, and only its `./oidc` subpath references `@vercel/oidc`,
  the package that pulls in `zod`.
- **R6 — Chaos fault injection in production.** Safe because it requires
  `import.meta.env.DEV` ([`src/main.jsx:23`](../src/main.jsx)), which a
  production build sets to `false`.
