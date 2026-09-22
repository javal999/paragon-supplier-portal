import { describe, it, expect, beforeEach } from 'vitest';
import { screen, fireEvent, waitFor, within } from '@testing-library/react';
import { renderWithProviders, BUYER } from '../../test/test-utils';
import { hubSettingsStore, settingValue } from '../../services/transitions/hubSettingsStore';
import { staleOverrideKey } from '../../services/transitions/hubSettings';
import { AdminAlertThresholds, AdminTolerances } from './AdminRuleValues';

// ─────────────────────────────────────────────────────────────────────────────
// BL-32 · the administration pages for the hub's rule values: tolerances and
// rule values, alert thresholds and stale periods.
// ─────────────────────────────────────────────────────────────────────────────

const PLANNER = { ...BUYER, businessRoles: ['planning'] };

beforeEach(() => hubSettingsStore.reset());

const change = (key: string, value: string) => {
  fireEvent.click(screen.getByTestId(`admin-set-change-${key}`));
  fireEvent.change(screen.getByTestId('admin-set-value'), { target: { value } });
  fireEvent.click(screen.getByTestId('admin-set-submit'));
};

describe('BL-32 · Tolerances and rule values', () => {
  it('BL32-PAGE-01 · lists every value with its value in force and default, and names the placeholders', () => {
    renderWithProviders(<AdminTolerances />, { identity: BUYER });
    expect(screen.getByTestId('admin-set-value-callOff.overPct').textContent).toBe('5%');
    expect(screen.getByTestId('admin-set-value-invoice.standardCapIdr').textContent).toBe('Rp 500.000');
    expect(screen.getByTestId('admin-set-placeholder-invoice.standardCapIdr').textContent).toBe(
      'Placeholder until Finance decides (BL-54)',
    );
    expect(screen.getByTestId('admin-set-placeholder-gate.minOtifPct').textContent).toBe(
      'Placeholder until Procurement decides (BL-55)',
    );
    expect(screen.getByTestId('admin-set-placeholder-callOff.earlyAllowanceDays').textContent).toBe(
      'Placeholder until the Warehouse (with the Material Planner) decides (BL-56)',
    );
    // Known-false: a decided value carries no placeholder.
    expect(screen.queryByTestId('admin-set-placeholder-callOff.overPct')).toBeNull();
    // The alert thresholds are on their own page, not here.
    expect(screen.queryByTestId('admin-set-row-bands.criticalBelowDays')).toBeNull();
    expect(screen.getByTestId('admin-set-attribution').textContent).toMatch(/cannot name yet/);
  });

  it('BL32-PAGE-02 · a seat holding setting:set gets the one form; a planner reads and gets the wait', () => {
    const { unmount } = renderWithProviders(<AdminTolerances />, { identity: BUYER });
    expect(screen.getByTestId('admin-set-form')).toBeTruthy();
    expect(screen.getByTestId('admin-set-change-callOff.overPct')).toBeTruthy();
    unmount();
    renderWithProviders(<AdminTolerances />, { identity: PLANNER });
    expect(screen.queryByTestId('admin-set-form')).toBeNull();
    expect(screen.queryByTestId('admin-set-change-callOff.overPct')).toBeNull();
    expect(screen.getByTestId('handoff-setting-set').textContent).toMatch(/Awaiting Compliance/);
    expect(screen.getByTestId('admin-set-value-callOff.overPct').textContent).toBe('5%');
  });

  it('BL32-PAGE-03 · a change goes through the verb, shows old → new in the history, and reset writes the default back', async () => {
    renderWithProviders(<AdminTolerances />, { identity: BUYER });
    expect(screen.getByTestId('admin-set-history-empty')).toBeTruthy();
    change('callOff.overPct', '10');
    await waitFor(() => expect(screen.getByTestId('admin-set-value-callOff.overPct').textContent).toBe('10%'));
    expect(settingValue('callOff.overPct')).toBe(10);
    const row = screen.getAllByTestId('admin-set-change-row-callOff.overPct')[0];
    expect(row.textContent).toMatch(/5% → 10%/);
    expect(within(row).getByText('Not attributed (no user directory)')).toBeTruthy();

    // Reset only PRE-FILLS the default; the form records it.
    fireEvent.click(screen.getByTestId('admin-set-reset-callOff.overPct'));
    expect((screen.getByTestId('admin-set-value') as HTMLInputElement).value).toBe('5');
    expect(settingValue('callOff.overPct')).toBe(10);
    fireEvent.click(screen.getByTestId('admin-set-submit'));
    await waitFor(() => expect(settingValue('callOff.overPct')).toBe(5));
    expect(screen.getAllByTestId('admin-set-change-row-callOff.overPct')[0].textContent).toMatch(/10% → 5%/);
    expect(screen.queryByTestId('admin-set-reset-callOff.overPct')).toBeNull();
  });

  it('BL32-PAGE-04 · nonsense is refused and nothing changes', async () => {
    renderWithProviders(<AdminTolerances />, { identity: BUYER });
    change('invoice.standardPct', '-2');
    await waitFor(() =>
      expect(screen.getByTestId('admin-set-refusal').textContent).toMatch(/invoice\.standardPct cannot be negative, got -2/),
    );
    expect(settingValue('invoice.standardPct')).toBe(2);
    expect(hubSettingsStore.changes()).toHaveLength(0);
  });
});

describe('BL-32 · Alert thresholds and stale periods', () => {
  it('BL32-PAGE-05 · shows the thresholds and the stale period per supplier and material', async () => {
    renderWithProviders(<AdminAlertThresholds />, { identity: BUYER });
    expect(screen.getByTestId('admin-set-value-risk.mediumBelowMultiple').textContent).toBe('1.5 × lead time');
    expect(screen.getByTestId('admin-set-value-stale.defaultDays').textContent).toBe('7 days');
    const row = await screen.findByTestId('admin-set-stale-row-sup-001-RM-COCO-8200');
    expect(within(row).getByText('1 day')).toBeTruthy();
    expect(within(row).getByText('Its own period')).toBeTruthy();
  });

  it('BL32-PAGE-06 · a band out of order is refused by name', async () => {
    renderWithProviders(<AdminAlertThresholds />, { identity: BUYER });
    change('bands.criticalBelowDays', '40');
    await waitFor(() => expect(screen.getByTestId('admin-set-refusal').textContent).toMatch(/bands out of order: Critical/));
    expect(settingValue('bands.criticalBelowDays')).toBe(14);
  });

  it('BL32-PAGE-07 · setting a pair its own period goes through the verb; "use the default" records null', async () => {
    renderWithProviders(<AdminAlertThresholds />, { identity: BUYER });
    await screen.findByTestId('admin-set-stale-row-sup-007-PK-PETB-8801');
    const key = staleOverrideKey('sup-007', 'PK-PETB-8801');
    fireEvent.change(screen.getByTestId('admin-set-stale-pair'), { target: { value: key } });
    fireEvent.change(screen.getByTestId('admin-set-stale-days'), { target: { value: '5' } });
    fireEvent.click(screen.getByTestId('admin-set-stale-submit'));
    await waitFor(() => expect(settingValue(key)).toBe(5));

    fireEvent.click(screen.getByTestId('admin-set-stale-remove-sup-007-PK-PETB-8801'));
    expect(settingValue(key)).toBe(5);
    fireEvent.click(screen.getByTestId('admin-set-stale-submit'));
    await waitFor(() => expect(settingValue(key)).toBeNull());
    await waitFor(() =>
      expect(within(screen.getByTestId('admin-set-stale-row-sup-007-PK-PETB-8801')).getByText('Default')).toBeTruthy(),
    );
  });
});
