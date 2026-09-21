// ─────────────────────────────────────────────────────────────────────────────
// BL-72 — NO `{{placeholder}}` MAY REACH THE READER.
//
// THE DEFECT: `rfx.cmp.round` is `'Round {{round}}'`. It is the right key for a
// ROW ("Round 1"), and it was ALSO used bare as the column header of the quote
// versions table and of the negotiation-rounds table — `t('rfx.cmp.round')`
// with no `round`. i18next does not refuse a missing variable; it prints the
// placeholder, and the header's `uppercase` class turned that into
// "ROUND {{ROUND}}". The fix is a separate header key (`rfx.cmp.roundColumn`),
// not a value smuggled into the header.
//
// TWO INSTRUMENTS, because they fail differently:
//  1. RENDERED — the affected page in EN and ID must contain no `{{`. This is
//     the one that reads what a person reads, and it cannot be fooled by how
//     the key was spelled.
//  2. SOURCE — every `t('<literal key>', …)` in `src/` must pass every variable
//     its EN and ID strings interpolate. This is the derivation that found the
//     SECOND instance of the class (`applications.toast.raised.title` spoke of
//     `{{number}}` while its only caller passes `company`). It reaches literal
//     keys, including those chosen by a `?:`; a key built at runtime or read
//     from a map is OUT of its reach, and it says so rather than implying
//     coverage it does not have.
//
// Both are probed both ways: the pre-fix header line is re-fired at the source
// matcher (it must be named), and its fixed twin must not be.
// ─────────────────────────────────────────────────────────────────────────────

import fs from 'node:fs';
import path from 'node:path';
import ts from 'typescript';
import { Routes, Route } from 'react-router-dom';
import { screen } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import i18n, { resources } from '../lib/i18n';
import { renderWithProviders, BUYER } from '../test/test-utils';
import { SEEDED_SEAT_ROLES } from '../services/transitions/businessRoles';
import { resetRfxStores } from '../services/data/mock/stores/rfxStores';
import { rfqStore } from '../services/data/mock/stores/rfqStore';
import { quotationStore } from '../services/data/mock/stores/quotationStore';
import { sdcClock } from '../services/sdc';
import BuyerSourcingEvent from './BuyerSourcingEvent';

// ── 1 · RENDERED ─────────────────────────────────────────────────────────────

const BUYER_SEAT = { ...BUYER, businessRoles: SEEDED_SEAT_ROLES.buyer };

const renderEvent = (rfqId: string) =>
  renderWithProviders(
    <Routes>
      <Route path="/buyer/sourcing/rfq/:rfqId" element={<BuyerSourcingEvent />} />
    </Routes>,
    { identity: BUYER_SEAT, route: `/buyer/sourcing/rfq/${rfqId}` },
  );

beforeEach(() => {
  resetRfxStores();
  rfqStore.reset();
  quotationStore.reset();
  sdcClock.reset();
});
afterEach(async () => {
  await i18n.changeLanguage('en');
});

describe('BL-72 — the RFQ event page renders no raw placeholder', () => {
  it.each([
    ['en', 'Round', 'Round 1'],
    ['id', 'Putaran', 'Putaran 1'],
  ])('%s — both "Round" headers are plain, the rows carry the number', async (lng, header, row) => {
    await i18n.changeLanguage(lng);
    // rfq-014 carries BOTH tables: a revised quote (versions) and an open round.
    const { container } = renderEvent('rfq-014');

    // POPULATION CONTROL — the two tables that carried the defect are on the page,
    // so a clean reading below is about them and not about an empty render.
    const version = await screen.findByTestId('quote-version-qt-014d-r1');
    const round = screen.getByTestId('round-nr-0001');

    expect(container.textContent).not.toContain('{{');

    const versionHeaders = [...version.closest('table')!.querySelectorAll('th')].map((th) => th.textContent);
    const roundHeaders = [...round.closest('table')!.querySelectorAll('th')].map((th) => th.textContent);
    expect(versionHeaders).toContain(header);
    expect(roundHeaders[0]).toBe(header);

    // The row still interpolates — the fix must not have flattened the row too.
    expect(version).toHaveTextContent(row);
    expect(round).toHaveTextContent(row);
  });
});

// ── 2 · SOURCE ───────────────────────────────────────────────────────────────

type Bundle = Record<string, string>;
const BUNDLES: Bundle[] = Object.values(resources).map(
  (lng) => Object.assign({}, ...Object.values(lng as Record<string, Bundle>)) as Bundle,
);

const PLACEHOLDER = /\{\{\s*-?\s*([\w.]+)[^}]*\}\}/g;
const PLURAL_SUFFIXES = ['', '_zero', '_one', '_two', '_few', '_many', '_other'];

/** Every variable any locale's string for `key` (or its plural forms) interpolates; null if not a key. */
function variablesOf(key: string): string[] | null {
  const out = new Set<string>();
  let known = false;
  for (const b of BUNDLES) {
    for (const s of PLURAL_SUFFIXES) {
      const v = b[key + s];
      if (typeof v !== 'string') continue;
      known = true;
      for (const m of v.matchAll(PLACEHOLDER)) out.add(m[1].split('.')[0]);
    }
  }
  return known ? [...out] : null;
}

interface Finding {
  readonly file: string;
  readonly line: number;
  readonly key: string;
  readonly missing: readonly string[];
}

/** Literal-key `t()` calls that leave an interpolated variable unset. */
function scan(file: string, text: string): { findings: Finding[]; examined: string[] } {
  const src = ts.createSourceFile(file, text, ts.ScriptTarget.Latest, true, ts.ScriptKind.TSX);
  const findings: Finding[] = [];
  const examined: string[] = [];
  const visit = (n: ts.Node): void => {
    if (ts.isStringLiteralLike(n)) {
      const vars = variablesOf(n.text);
      if (vars && vars.length > 0) {
        // Climb through `cond ? 'a' : 'b'`, parentheses and `as` to the call.
        let child: ts.Node = n;
        let parent = n.parent;
        while (
          (ts.isConditionalExpression(parent) && parent.condition !== child) ||
          ts.isParenthesizedExpression(parent) ||
          ts.isAsExpression(parent)
        ) {
          child = parent;
          parent = parent.parent;
        }
        if (ts.isCallExpression(parent) && parent.arguments[0] === child) {
          const line = src.getLineAndCharacterOfPosition(n.getStart()).line + 1;
          examined.push(`${file}:${line}:${n.text}`);
          const opt = parent.arguments[1];
          let given: Set<string> | null = new Set();
          if (opt && ts.isObjectLiteralExpression(opt)) {
            for (const p of opt.properties) {
              if (ts.isSpreadAssignment(p)) given = null; // cannot see through a spread
              else if (given && p.name) given.add(p.name.getText().replace(/['"]/g, ''));
            }
          } else if (opt) {
            given = null; // options built elsewhere — out of reach, not accused
          }
          const missing = given ? vars.filter((v) => !given!.has(v)) : [];
          if (missing.length > 0) findings.push({ file, line, key: n.text, missing });
        }
      }
    }
    ts.forEachChild(n, visit);
  };
  visit(src);
  return { findings, examined };
}

const SRC = path.join(__dirname, '..');
function sourceFiles(dir: string): string[] {
  return fs.readdirSync(dir, { withFileTypes: true }).flatMap((e) => {
    const p = path.join(dir, e.name);
    if (e.isDirectory()) return sourceFiles(p);
    return /\.tsx?$/.test(e.name) && !/\.test\.tsx?$/.test(e.name) && !e.name.endsWith('.d.ts') ? [p] : [];
  });
}

describe('BL-72 — every literal-key t() call passes the variables its strings interpolate', () => {
  const files = sourceFiles(SRC);
  const results = files.map((f) => scan(path.relative(SRC, f), fs.readFileSync(f, 'utf8')));
  const examined = results.flatMap((r) => r.examined);
  const findings = results.flatMap((r) => r.findings);

  it('POPULATION — it examined the calls it exists for (named members, not a count)', () => {
    // The row call that interpolates correctly is IN the population…
    expect(examined.some((e) => e.startsWith('pages-v2/BuyerSourcingEvent.tsx:') && e.endsWith(':rfx.cmp.round'))).toBe(true);
    // …and so is the second instance's call site.
    expect(examined.some((e) => e.endsWith(':applications.toast.raised.title'))).toBe(true);
    // And a conditional-chosen plural key is reached through the `?:`.
    expect(examined.some((e) => e.endsWith(':buyerInvoices.kpi.invoiceCount.one'))).toBe(true);
  });

  it('PROBE — fires at the defect the tree really shipped, and acquits its fixed twin', () => {
    const before = scan('probe.tsx', `const a = <TableHeaderCell>{t('rfx.cmp.round')}</TableHeaderCell>;`);
    expect(before.findings.map((f) => `${f.key}:${f.missing.join(',')}`)).toEqual(['rfx.cmp.round:round']);
    const row = scan('probe.tsx', `const a = t('rfx.cmp.round', { round: q.roundNumber });`);
    expect(row.findings).toEqual([]);
    const header = scan('probe.tsx', `const a = t('rfx.cmp.roundColumn');`);
    expect(header.findings).toEqual([]);
    // The second instance, as shipped: a variable passed under the wrong name.
    const toast = scan('probe.tsx', `t('applications.toast.raised.title', { number: n })`);
    expect(toast.findings.map((f) => f.missing.join(','))).toEqual(['company']);
  });

  it('THE TREE — no call leaves a placeholder unset', () => {
    expect(findings.map((f) => `${f.file}:${f.line} ${f.key} missing ${f.missing.join(',')}`)).toEqual([]);
  });
});
