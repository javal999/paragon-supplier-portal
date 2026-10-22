import fs from 'node:fs';
import path from 'node:path';
import { afterEach, describe, expect, it } from 'vitest';
import { cleanup, screen, waitFor } from '@testing-library/react';
import { renderWithProviders, BUYER, SUPPLIER } from '@test/test-utils';
import { SEEDED_SEAT_ROLES } from '@services/transitions/businessRoles';
import { setHubRole } from '@components/layout-v2/hubRole';
import BuyerHome from '../BuyerHome';
import SupplierHome from '../SupplierHome';

// ─────────────────────────────────────────────────────────────────────────────
// SC-01 — a Home task's severity is COMPUTED (taskSeverity.js), never assigned
// per task type. The old pages wrote `severity: 'critical'` / `'warning'` on each
// row, which put half the list in red. This guard keeps that from coming back on
// either Home page, and checks the rendered result: at most 3 red rows.
// ─────────────────────────────────────────────────────────────────────────────

const PAGES = ['BuyerHome.jsx', 'SupplierHome.jsx'];
const PLANNER = { ...BUYER, businessRoles: SEEDED_SEAT_ROLES.buyer };

/**
 * The per-type severity literals in a source: a `critical` or `warning` string
 * literal anywhere in the page. (`info` is allowed — it is not an urgency.)
 * @param {string} source
 * @returns {string[]}
 */
export const hardcodedSeverities = (source) => source.match(/['"](critical|warning)['"]/g) ?? [];

describe('Home pages assign no severity by task type', () => {
  it('the matcher catches the old assignment and passes the new wiring (probed both ways)', () => {
    // Known-bad: the shape BuyerHome.jsx carried before SC-01 severity.
    expect(hardcodedSeverities(`{ id: 'escalated-po', severity: 'critical', to: '/' }`)).toEqual([
      "'critical'"
    ]);
    expect(hardcodedSeverities(`severity: rows.some(x) ? 'critical' : 'warning'`)).toHaveLength(2);
    // Known-good: the computed wiring, and the one non-urgency row.
    expect(hardcodedSeverities(`return withSeverity(rows, nowIso, t);`)).toEqual([]);
    expect(hardcodedSeverities(`severity: /** @type {const} */ ('none')`)).toEqual([]);
  });

  it.each(PAGES)(
    '%s rates its tasks through withSeverity and holds no severity literal',
    (page) => {
      const source = fs.readFileSync(path.resolve(__dirname, '..', page), 'utf8');
      // Population control: the file was read and is the page we mean.
      expect(source).toContain('withSeverity(');
      expect(hardcodedSeverities(source)).toEqual([]);
    }
  );
});

/** The stripe colour of every rendered task row, by id. */
const stripes = () =>
  Object.fromEntries(
    [...document.querySelectorAll('[data-testid^="home-task-"]')]
      .filter((el) => !el.getAttribute('data-testid')?.startsWith('home-task-detail-'))
      .map((el) => [
        el.getAttribute('data-testid')?.replace('home-task-', ''),
        el.querySelector('span[aria-hidden]')?.className.match(/bg-\S+/)?.[0]
      ])
  );

/**
 * The list renders as soon as ONE read resolves, so wait for rows that come
 * from several different reads before judging the colours.
 * @param {readonly string[]} ids
 */
const rowsLoaded = (ids) =>
  waitFor(
    () => {
      for (const id of ids) expect(screen.getByTestId(`home-task-${id}`)).toBeInTheDocument();
    },
    { timeout: 15000 }
  );

describe('Home pages render at most 3 red rows on the sample data', () => {
  afterEach(() => {
    cleanup();
    setHubRole('ALL');
  });

  it.each(/** @type {const} */ (['MP', 'ALL']))('Buyer Home as %s', async (role) => {
    setHubRole(role);
    renderWithProviders(<BuyerHome />, { identity: PLANNER, route: '/buyer/home' });
    // Purchase orders, call-offs, alerts, chase and shipments: five reads.
    await rowsLoaded([
      'escalated-po',
      'calloffs-drift',
      'inventory-high-alerts',
      'chase',
      'inbound-asn'
    ]);
    const red = Object.entries(stripes()).filter(([, c]) => c === 'bg-danger');
    expect(red.length).toBeGreaterThan(0);
    expect(red.length).toBeLessThanOrEqual(3);
  });

  it('Supplier Home (sup-007): at most 3 red rows, each with its reason line', async () => {
    renderWithProviders(<SupplierHome />, { identity: SUPPLIER, route: '/supplier/home' });
    // Orders, forecast lines, invoices, documents, stock and RFQs: six reads.
    await rowsLoaded([
      'confirm-orders',
      'commitments-overdue',
      'invoices',
      'certs',
      // Inventory UX S-02 — a manual supplier's stock is the one weekly row.
      'weekly-update',
      'rfq'
    ]);
    const all = stripes();
    const red = Object.entries(all).filter(([, c]) => c === 'bg-danger');
    expect(red.length).toBeGreaterThan(0);
    expect(red.length).toBeLessThanOrEqual(3);
    for (const [id] of red) {
      // S-02 — the weekly row's reason is its figures out of date since a day.
      expect(screen.getByTestId(`home-task-detail-${id}`)).toHaveTextContent(
        /Overdue|Cover|out of date since/
      );
    }
    // Money PTI owes the supplier stays outside the ranking, as "To review", last.
    expect(screen.getByTestId('home-task-invoices')).toHaveTextContent('To review');
    expect(Object.keys(all).slice(-1)).toEqual(['invoices']);
  });
});
