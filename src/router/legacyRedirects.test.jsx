import fs from 'node:fs';
import path from 'node:path';
// ─────────────────────────────────────────────────────────────────────────────
// The retired RFx paths (operator decision 2026-09-21: RFI, RFQ and RFP became
// three modules with their own routes) and, since IA P-02, the retired Order
// summary paths (now a view of Purchase orders). Every old path must still land, and
// must land CARRYING what the old link carried — `?rfi=<id>`, router state, an
// event id. The redirect rows are DERIVED from AppRouter's source, never listed
// here, so a redirect added later is covered without anybody remembering to.
// ─────────────────────────────────────────────────────────────────────────────

/** @import React from 'react' */
import { MemoryRouter, Routes, Route, useLocation, generatePath } from 'react-router-dom';
import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import LegacyRedirect from './LegacyRedirect';
import { isTestFile } from '@test/sourceFiles';

const SRC_DIR = path.resolve(__dirname, '..');
const ROUTER_SRC = fs.readFileSync(path.resolve(__dirname, 'AppRouter.jsx'), 'utf8');

/**
 * @typedef {{
 *   readonly from: string;
 *   readonly to: string;
 * }} RedirectRow
 */

const chunks = ROUTER_SRC.split('<Route')
  .slice(1)
  .map((c) => c.split('<Route')[0]);
/** @type {RedirectRow[]} */
const REDIRECTS = chunks
  .map((chunk) => {
    const p = /path="([^"]+)"/.exec(chunk);
    const r = /<LegacyRedirect\s+to="([^"]+)"/.exec(chunk);
    return p && r ? { from: p[1], to: r[1] } : null;
  })
  .filter(/** @returns {r is RedirectRow} */ (r) => r !== null);
const PAGES = chunks
  .filter((chunk) => !/<(Navigate|LegacyRedirect)\b/.test(chunk))
  .map((chunk) => /path="([^"]+)"/.exec(chunk)?.[1])
  .filter(/** @returns {p is string} */ (p) => typeof p === 'string');

/** @type {React.FC} */
const Probe = () => {
  const loc = useLocation();
  return (
    <output data-testid="probe">
      {JSON.stringify({ pathname: loc.pathname, search: loc.search, state: loc.state })}
    </output>
  );
};

/** @param {string} pattern */
const fill = (pattern) =>
  pattern.replace(/:(\w+)/g, /** @param {string} name */ (_m, name) => `${name}-x1`);

describe('the retired paths redirect to their pages', () => {
  it('the population is derived from the router, and holds the known members', () => {
    // Population guard FIRST: a derivation that returns nothing reports clean.
    const from = REDIRECTS.map((r) => r.from);
    expect(from).toContain('/buyer/sourcing');
    expect(from).toContain('/buyer/sourcing/rfq/:rfqId');
    expect(from).toContain('/supplier/rfqs/rounds');
    // A page route is not a redirect row.
    expect(from).not.toContain('/buyer/rfq');
    expect(PAGES).toContain('/buyer/rfq');
    expect(PAGES).not.toContain('/buyer/sourcing');
  });

  it('IA P-02 — the retired Order summary paths are rows, each naming its view', () => {
    expect(REDIRECTS).toContainEqual({
      from: '/buyer/order-summary',
      to: '/buyer/orders?view=summary'
    });
    expect(REDIRECTS).toContainEqual({
      from: '/supplier/order-summary',
      to: '/supplier/orders?view=summary'
    });
  });

  it('every redirect points at a page the router serves, never at another redirect', () => {
    const missing = REDIRECTS.filter((r) => !PAGES.includes(r.to.split('?')[0]));
    expect(missing).toEqual([]);
  });

  it.each(REDIRECTS)('$from lands on $to, keeping query, state and params', ({ from, to }) => {
    const [toPath, toQuery = ''] = to.split('?');
    render(
      <MemoryRouter
        initialEntries={[
          { pathname: fill(from), search: '?rfi=rfi-001', state: { sourceRequisitionId: 'PR-1' } }
        ]}
      >
        <Routes>
          <Route path={from} element={<LegacyRedirect to={to} />} />
          <Route path={toPath} element={<Probe />} />
        </Routes>
      </MemoryRouter>
    );
    const seen = JSON.parse(screen.getByTestId('probe').textContent ?? '{}');
    expect(seen.pathname).toBe(
      generatePath(
        toPath,
        Object.fromEntries([...toPath.matchAll(/:(\w+)/g)].map((m) => [m[1], `${m[1]}-x1`]))
      )
    );
    // The redirect's own params come first; the incoming ones ride along after.
    expect(seen.search).toBe(toQuery ? `?${toQuery}&rfi=rfi-001` : '?rfi=rfi-001');
    expect(seen.state).toEqual({ sourceRequisitionId: 'PR-1' });
  });

  it("a redirect's own param wins over an incoming one of the same name; the rest are kept", () => {
    render(
      <MemoryRouter
        initialEntries={[{ pathname: '/buyer/order-summary', search: '?view=list&po=po-001' }]}
      >
        <Routes>
          <Route
            path="/buyer/order-summary"
            element={<LegacyRedirect to="/buyer/orders?view=summary" />}
          />
          <Route path="/buyer/orders" element={<Probe />} />
        </Routes>
      </MemoryRouter>
    );
    const seen = JSON.parse(screen.getByTestId('probe').textContent ?? '{}');
    expect(seen.pathname).toBe('/buyer/orders');
    expect(seen.search).toBe('?view=summary&po=po-001');
  });

  it('no in-app link still names a retired path — only the router does', () => {
    /** @type {string[]} */
    const offenders = [];
    /** @param {string} dir */
    const walk = (dir) => {
      for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
        const full = path.join(dir, entry.name);
        if (entry.isDirectory()) walk(full);
        else if (/\.(ts|tsx|js|jsx)$/.test(entry.name) && !isTestFile(entry.name)) {
          if (full === path.resolve(__dirname, 'AppRouter.jsx')) continue;
          const text = fs.readFileSync(full, 'utf8');
          for (const { from } of REDIRECTS) {
            const stem = from.replace(/\/:\w+.*$/, '');
            if (new RegExp(`['"\`]${stem.replace(/\//g, '\\/')}(?![\\w-])`).test(text)) {
              offenders.push(`${path.relative(SRC_DIR, full)} → ${stem}`);
            }
          }
        }
      }
    };
    walk(SRC_DIR);
    expect(offenders).toEqual([]);
  });
});
