import { describe, it, expect, afterEach } from 'vitest';
import { screen, render, fireEvent, within } from '@testing-library/react';
import { renderWithProviders, BUYER } from '@test/test-utils';
import i18n from '@lib/i18n';
import { SEEDED_SEAT_ROLES } from '@services/transitions/businessRoles';
import { commitmentDeadlineWorkingDays } from '@services/transitions/forecastConfig';
import BuyerCommitments from '@pages-v2/BuyerCommitments';
import BuyerOrderPlan from '@pages-v2/BuyerOrderPlan';
import BuyerReschedule from '@pages-v2/BuyerReschedule';
import BuyerDataHealth from '@pages-v2/BuyerDataHealth';
import { FORECAST_PAGES } from './forecastPages';
import { headerNamed } from '@test/termText';

// ─────────────────────────────────────────────────────────────────────────────
// Accessibility findings 19 and 33 (docs/supplier-hub/research/
// FORECAST-UX-ACCESSIBILITY-2026-10.md).
//
// 19 — Supplier responses: the Due column's rule is one visible line under the
//      exceptions heading, outside the table, and the header carries no `title`.
// 33 — Collapsed sections: the `h2` is not inside `<summary>` (whose children
//      are presentational to some screen readers); it keeps its level and names
//      the section, and the summary stays the details' keyboard toggle.
// ─────────────────────────────────────────────────────────────────────────────

const PLANNER = { ...BUYER, businessRoles: SEEDED_SEAT_ROLES.buyer };

afterEach(() => {
  void i18n.changeLanguage('en');
});

/**
 * Every heading that sits inside a `<summary>` under `root`.
 * @param {ParentNode} root
 * @returns {string[]}
 */
const headingsInSummary = (root) =>
  Array.from(root.querySelectorAll('summary h1, summary h2, summary h3, summary h4')).map(
    (h) => h.textContent ?? ''
  );

/**
 * The check for one collapsed section, by its `<details>` test id: the
 * heading is outside the summary, is an `h2`, names the section, and the
 * summary is the details' first child (the element Enter and Space activate).
 * A section that is the whole of a tab (P-12, `defaultOpen`) starts open and
 * the same toggle closes and reopens it.
 * @param {string} testId
 * @param {{ open?: boolean }} [opts]
 */
const expectCollapsedSection = (testId, { open = false } = {}) => {
  const details = screen.getByTestId(testId);
  expect(details.tagName).toBe('DETAILS');
  expect(headingsInSummary(details), testId).toEqual([]);
  const section = /** @type {HTMLElement} */ (details.closest('section'));
  const labelledBy = section.getAttribute('aria-labelledby') ?? '';
  const heading = /** @type {HTMLElement} */ (document.getElementById(labelledBy));
  expect(heading.tagName, testId).toBe('H2');
  expect(heading.closest('summary'), testId).toBeNull();
  expect(
    heading.compareDocumentPosition(details) & Node.DOCUMENT_POSITION_FOLLOWING,
    testId
  ).toBeTruthy();
  const summary = /** @type {HTMLElement} */ (details.firstElementChild);
  expect(summary.tagName).toBe('SUMMARY');
  // Keyboard activation of a summary (Enter, Space) dispatches its click; the
  // click toggles the details open and closed again.
  const shown = () =>
    open ? expect(details).toHaveAttribute('open') : expect(details).not.toHaveAttribute('open');
  const toggled = () =>
    open ? expect(details).not.toHaveAttribute('open') : expect(details).toHaveAttribute('open');
  shown();
  fireEvent.click(summary);
  toggled();
  fireEvent.click(summary);
  shown();
};

/**
 * P-12 — opens one of the page's tabs, by its visible name.
 * @param {string} name
 */
const openTab = async (name) =>
  fireEvent.click(await screen.findByRole('tab', { name }, { timeout: 15000 }));

describe('finding 33 — the probe fails on the old AboutThisPage markup', () => {
  it('finds the heading the old component put inside its summary', () => {
    const { container } = render(
      <details data-testid="about-this-page">
        <summary className="cursor-pointer">
          <h2 className="inline text-section text-text-primary">About this page</h2>
        </summary>
        <div>Body</div>
      </details>
    );
    expect(headingsInSummary(container)).toEqual(['About this page']);
  });
});

describe('finding 33 — collapsed section headings are outside the summary', () => {
  it('What to order: About this page and the 3 collapsed sections', async () => {
    renderWithProviders(<BuyerOrderPlan />, {
      identity: PLANNER,
      route: FORECAST_PAGES.whatToOrder.path
    });
    // P-12 — the fill is its own tab and opens shown; the rest sit under "How it is sized".
    await openTab('Warehouse fill');
    await screen.findByTestId('op-fill', {}, { timeout: 15000 });
    expectCollapsedSection('op-fill', { open: true });
    expect(headingsInSummary(document.body)).toEqual([]);
    await openTab('How it is sized');
    for (const id of ['about-this-page', 'op-costs', 'op-definitions']) {
      expectCollapsedSection(id);
    }
    expect(headingsInSummary(document.body)).toEqual([]);
    expect(screen.getAllByRole('heading', { level: 1 })).toHaveLength(1);
    expect(screen.getByRole('heading', { level: 2, name: 'About this page' })).toBeInTheDocument();
  });

  it('Make warehouse room: About this page and the 4 collapsed sections', async () => {
    renderWithProviders(<BuyerReschedule />, {
      identity: PLANNER,
      route: FORECAST_PAGES.makeRoom.path
    });
    // P-12 — the fill is its own tab and opens shown; the rest sit under "Values and method".
    await openTab('Warehouse fill');
    await screen.findByTestId('rs-fill', {}, { timeout: 15000 });
    expectCollapsedSection('rs-fill', { open: true });
    expect(headingsInSummary(document.body)).toEqual([]);
    await openTab('Values and method');
    await screen.findByTestId('rs-info', {}, { timeout: 15000 });
    for (const id of ['about-this-page', 'rs-info', 'rs-settings', 'rs-definitions']) {
      expectCollapsedSection(id);
    }
    expect(headingsInSummary(document.body)).toEqual([]);
  });

  it('Data health, in Indonesian: About this page keeps its h2 outside the toggle', async () => {
    await i18n.changeLanguage('id');
    renderWithProviders(<BuyerDataHealth />, {
      identity: PLANNER,
      route: FORECAST_PAGES.dataHealth.path
    });
    await screen.findByTestId('about-this-page', {}, { timeout: 15000 });
    expectCollapsedSection('about-this-page');
    expect(
      screen.getByRole('heading', { level: 2, name: 'Tentang halaman ini' })
    ).toBeInTheDocument();
    expect(screen.getByTestId('about-this-page').querySelector('summary')).toHaveTextContent(
      'Tampilkan rincian'
    );
  });
});

describe('finding 19 — the Due rule is visible text, not a header tooltip', () => {
  const days = commitmentDeadlineWorkingDays();

  /** @param {'en' | 'id'} lng */
  const renderResponses = async (lng) => {
    await i18n.changeLanguage(lng);
    renderWithProviders(<BuyerCommitments />, {
      identity: PLANNER,
      route: FORECAST_PAGES.responses.path
    });
    return screen.findByTestId('fc-due-rule', {}, { timeout: 15000 });
  };

  it('English: one line under the exceptions heading, outside the table; no title on the header', async () => {
    const note = await renderResponses('en');
    expect(note).toHaveTextContent(
      `Commitment due: Zone Liability: ${days.firm} working day${days.firm === 1 ? '' : 's'}.`
    );
    expect(note).toHaveTextContent('Counted from publication on the hub working calendar.');
    expect(note.closest('table')).toBeNull();
    const section = screen.getByTestId('fc-exceptions');
    expect(section).toContainElement(note);
    const header = within(section).getByRole('columnheader', {
      name: headerNamed('Commitment due')
    });
    expect(header).not.toHaveAttribute('title');
    expect(header.querySelector('[title]')).toBeNull();
    expect(section.textContent?.match(/Counted from publication/g)).toHaveLength(1);
  });

  it('Indonesian: the same line in Indonesian; no title on the header', async () => {
    const note = await renderResponses('id');
    expect(note).toHaveTextContent('Tenggat komitmen: Zone Liability:');
    expect(note).toHaveTextContent('Dihitung sejak penerbitan pada kalender kerja hub.');
    const header = within(screen.getByTestId('fc-exceptions')).getByRole('columnheader', {
      name: headerNamed('Tenggat komitmen')
    });
    expect(header.querySelector('[title]')).toBeNull();
    expect(header).not.toHaveAttribute('title');
  });
});
