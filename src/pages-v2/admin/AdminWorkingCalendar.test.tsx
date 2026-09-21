import { describe, it, expect, beforeEach } from 'vitest';
import { screen, fireEvent, waitFor, within } from '@testing-library/react';
import { renderWithProviders, BUYER } from '../../test/test-utils';
import { workingCalendarStore } from '../../services/transitions/workingCalendarStore';
import AdminWorkingCalendar from './AdminWorkingCalendar';

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
    // Only built admin sections are listed — the rest are named in words.
    expect(screen.getByTestId('admin-section-working-calendar')).toBeTruthy();
    expect(screen.getByTestId('admin-sections-later').textContent).toMatch(/not built yet/);
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

  it('BL50-PAGE-03 · recording a ruling dispatches the verb, lists the day as the administrator\'s, and keeps the record', async () => {
    renderWithProviders(<AdminWorkingCalendar />, { identity: BUYER });
    expect(screen.queryByTestId('admin-cal-day-2026-09-02')).toBeNull();
    expect(screen.getByTestId('admin-cal-history-empty')).toBeTruthy();

    fireEvent.change(screen.getByTestId('admin-cal-date'), { target: { value: '2026-09-02' } });
    fireEvent.change(screen.getByTestId('admin-cal-kind'), { target: { value: 'non-working' } });
    fireEvent.change(screen.getByTestId('admin-cal-reason'), { target: { value: 'Plant shutdown for maintenance' } });
    fireEvent.click(screen.getByTestId('admin-cal-submit'));

    const row = await screen.findByTestId('admin-cal-day-2026-09-02');
    expect(within(row).getByText('Hub administrator')).toBeTruthy();
    expect(within(row).getByText('Overrides SAP')).toBeTruthy();
    expect(within(row).getByText('Plant shutdown for maintenance')).toBeTruthy();
    const record = screen.getByTestId('admin-cal-ruling-2026-09-02');
    expect(within(record).getByText('Not attributed (no user directory)')).toBeTruthy();
    expect(workingCalendarStore.rulings().map((r) => r.date)).toEqual(['2026-09-02']);
  });

  it('BL50-PAGE-04 · a row button only PRE-FILLS the form with the opposite answer; nothing is recorded yet', async () => {
    renderWithProviders(<AdminWorkingCalendar />, { identity: BUYER });
    fireEvent.click(screen.getByTestId('admin-cal-prefill-2026-08-17'));
    await waitFor(() =>
      expect((screen.getByTestId('admin-cal-date') as HTMLInputElement).value).toBe('2026-08-17'),
    );
    expect((screen.getByTestId('admin-cal-kind') as HTMLSelectElement).value).toBe('working');
    expect(workingCalendarStore.rulings()).toHaveLength(0);
  });
});
