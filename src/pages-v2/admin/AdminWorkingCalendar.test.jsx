import { describe, it, expect, beforeEach } from 'vitest';
import { screen, fireEvent, waitFor, within } from '@testing-library/react';
import { renderWithProviders, BUYER } from '@test/test-utils';
import { workingCalendarStore } from '@services/transitions/workingCalendarStore';
import AdminWorkingCalendar from './AdminWorkingCalendar';
import { ADMIN_SECTIONS } from './adminSections';

// ─────────────────────────────────────────────────────────────────────────────
// BL-50 · the administration page for the hub's working calendar.
// ─────────────────────────────────────────────────────────────────────────────

const PLANNER = { ...BUYER, businessRoles: ['planning'] };

beforeEach(() => workingCalendarStore.reset());

describe('BL-50 · AdminWorkingCalendar', () => {
  it('BL50-PAGE-01 · shows the SAP load as sample data, and lists its holidays by source', () => {
    renderWithProviders(<AdminWorkingCalendar />, { identity: BUYER });
    expect(screen.getByTestId('admin-cal-source').textContent).toMatch(/SAP factory calendar ID/);
    expect(screen.getAllByTestId('sample-data-badge').length).toBeGreaterThan(0);
    const independence = screen.getByTestId('admin-cal-day-2026-08-17');
    expect(within(independence).getByText('SAP factory calendar')).toBeTruthy();
    expect(within(independence).getByText('Non-working')).toBeTruthy();
    // ⚠️ PREMISE CHANGED AT BL-32: the page used to list only itself and name
    // the unbuilt sections in words ("not built yet"). Every section is built
    // now, so every section in ADMIN_SECTIONS is a tab here and the sentence
    // is gone — a sentence promising sections that exist would be as false as
    // a tab for one that does not.
    for (const s of ADMIN_SECTIONS)
      expect(screen.getByTestId(`admin-section-${s.id}`)).toBeTruthy();
    expect(screen.getByTestId('admin-section-tolerances')).toBeTruthy();
    expect(screen.queryByTestId('admin-sections-later')).toBeNull();
  });

  it('BL50-PAGE-02 · a seat holding calendar:set gets the one form; a planner gets the wait, not the form', () => {
    const { unmount } = renderWithProviders(<AdminWorkingCalendar />, { identity: BUYER });
    expect(screen.getByTestId('admin-cal-form')).toBeTruthy();
    expect(screen.queryByTestId('admin-cal-gate')).toBeNull();
    expect(screen.getByTestId('admin-cal-prefill-2026-08-17')).toBeTruthy();
    unmount();

    renderWithProviders(<AdminWorkingCalendar />, { identity: PLANNER });
    expect(screen.queryByTestId('admin-cal-form')).toBeNull();
    expect(screen.queryByTestId('admin-cal-prefill-2026-08-17')).toBeNull();
    expect(screen.getByTestId('admin-cal-gate')).toBeTruthy();
    expect(screen.getByTestId('handoff-calendar-set').textContent).toMatch(/Awaiting Compliance/);
    // The planner can still READ the calendar.
    expect(screen.getByTestId('admin-cal-day-2026-08-17')).toBeTruthy();
  });

  it("BL50-PAGE-03 · recording a ruling dispatches the verb, lists the day as the administrator's, and keeps the record", async () => {
    renderWithProviders(<AdminWorkingCalendar />, { identity: BUYER });
    expect(screen.queryByTestId('admin-cal-day-2026-09-09')).toBeNull();
    // The demo ruling (Friday 4 September) is on record before anybody acts.
    expect(screen.getByTestId('admin-cal-ruling-2026-09-04')).toBeTruthy();
    const before = workingCalendarStore.rulings().length;

    fireEvent.change(screen.getByTestId('admin-cal-date'), { target: { value: '2026-09-09' } });
    fireEvent.change(screen.getByTestId('admin-cal-kind'), { target: { value: 'non-working' } });
    fireEvent.change(screen.getByTestId('admin-cal-reason'), {
      target: { value: 'Plant shutdown for maintenance' }
    });
    fireEvent.click(screen.getByTestId('admin-cal-submit'));

    const row = await screen.findByTestId('admin-cal-day-2026-09-09');
    expect(within(row).getByText('Hub administrator')).toBeTruthy();
    expect(within(row).getByText('Overrides SAP')).toBeTruthy();
    expect(within(row).getByText('Plant shutdown for maintenance')).toBeTruthy();
    const record = screen.getByTestId('admin-cal-ruling-2026-09-09');
    expect(within(record).getByText('Not attributed (no user directory)')).toBeTruthy();
    expect(workingCalendarStore.rulings()).toHaveLength(before + 1);
    expect(workingCalendarStore.rulings().map((r) => r.date)).toContain('2026-09-09');
  });

  it('BL50-PAGE-05 · recording a holiday MOVES a deadline shown on the page that made it', async () => {
    renderWithProviders(<AdminWorkingCalendar />, { identity: BUYER });
    // Packaging version 2 was published Friday 28 August 09:00 WIB; one working
    // day later is Monday 31 August 09:00.
    const firm = await screen.findByTestId('admin-cal-due-packaging-firm');
    expect(firm.textContent).toBe('31 Aug 2026, 09:00 WIB');

    fireEvent.change(screen.getByTestId('admin-cal-date'), { target: { value: '2026-08-31' } });
    fireEvent.change(screen.getByTestId('admin-cal-kind'), { target: { value: 'non-working' } });
    fireEvent.change(screen.getByTestId('admin-cal-reason'), {
      target: { value: 'Collective leave' }
    });
    fireEvent.click(screen.getByTestId('admin-cal-submit'));

    await waitFor(() =>
      // ICU spells September 'Sep' or 'Sept' depending on its version.
      expect(screen.getByTestId('admin-cal-due-packaging-firm').textContent).toMatch(
        /^01 Sept? 2026, 09:00 WIB$/
      )
    );
  });

  it('BL50-PAGE-04 · a row button only PRE-FILLS the form with the opposite answer; nothing is recorded yet', async () => {
    renderWithProviders(<AdminWorkingCalendar />, { identity: BUYER });
    fireEvent.click(screen.getByTestId('admin-cal-prefill-2026-08-17'));
    await waitFor(() =>
      expect(/** @type {HTMLInputElement} */ (screen.getByTestId('admin-cal-date')).value).toBe(
        '2026-08-17'
      )
    );
    expect(/** @type {HTMLSelectElement} */ (screen.getByTestId('admin-cal-kind')).value).toBe(
      'working'
    );
    expect(workingCalendarStore.rulings().map((r) => r.date)).not.toContain('2026-08-17');
  });
});
