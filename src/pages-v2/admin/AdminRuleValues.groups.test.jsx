import { describe, it, expect, beforeEach } from 'vitest';
import { screen, fireEvent, waitFor, within } from '@testing-library/react';
import { renderWithProviders, BUYER } from '@test/test-utils';
import { hubSettingsStore, settingValue } from '@services/transitions/hubSettingsStore';
import { staleOverrideKey } from '@services/transitions/hubSettings';
import { AdminAlertThresholds } from './AdminRuleValues';

// ─────────────────────────────────────────────────────────────────────────────
// REQ-E08-05 BR-03 (owner, 2026-10-23) · Alert thresholds and stale periods →
// "Per material group": add, edit and clear a group's own value through the
// one verb, with the global value shown as the fallback.
// ─────────────────────────────────────────────────────────────────────────────

const PLANNER = { ...BUYER, businessRoles: ['planning'] };
const KEY = 'bands.criticalBelowDays@MG-20';

beforeEach(() => hubSettingsStore.reset());

/**
 * Fill the group form and record it.
 * @param {string} group
 * @param {string} baseKey
 * @param {string} value
 */
const record = (group, baseKey, value) => {
  fireEvent.change(screen.getByTestId('admin-set-groups-group'), { target: { value: group } });
  fireEvent.change(screen.getByTestId('admin-set-groups-key'), { target: { value: baseKey } });
  fireEvent.change(screen.getByTestId('admin-set-groups-value'), { target: { value } });
  fireEvent.click(screen.getByTestId('admin-set-groups-submit'));
};

describe('GRP-PAGE · per material group on the alert thresholds page', () => {
  it('GRP-PAGE-01 · add: the value goes through the verb, is listed beside the global value, and is in the history', async () => {
    renderWithProviders(<AdminAlertThresholds />, { identity: BUYER });
    expect(screen.getByTestId('admin-set-groups-empty')).toBeTruthy();

    fireEvent.change(screen.getByTestId('admin-set-groups-key'), {
      target: { value: 'bands.criticalBelowDays' }
    });
    // The global value is the placeholder and the stated fallback.
    expect(
      /** @type {HTMLInputElement} */ (screen.getByTestId('admin-set-groups-value')).placeholder
    ).toBe('14');
    expect(screen.getByTestId('admin-set-groups-global').textContent).toBe(
      'Leave empty to follow the global value (14 days).'
    );

    record('MG-20', 'bands.criticalBelowDays', '10');
    await waitFor(() => expect(settingValue(KEY)).toBe(10));
    const row = await screen.findByTestId(`admin-set-groups-row-${KEY}`);
    expect(within(row).getByText('MG-20')).toBeTruthy();
    expect(within(row).getByText('10 days')).toBeTruthy();
    expect(within(row).getByText('14 days')).toBeTruthy();
    expect(screen.queryByTestId('admin-set-groups-empty')).toBeNull();
    // The global value is untouched.
    expect(settingValue('bands.criticalBelowDays')).toBe(14);
    const history = screen.getAllByTestId(`admin-set-change-row-${KEY}`)[0];
    expect(history.textContent).toMatch(/Critical below \(days, no lead time on record\) · MG-20/);
    expect(history.textContent).toMatch(/No override \(default applies\) → 10 days/);
  });

  it('GRP-PAGE-02 · clear: the button only pre-fills an empty value; the form records "no override"', async () => {
    renderWithProviders(<AdminAlertThresholds />, { identity: BUYER });
    record('MG-20', 'bands.criticalBelowDays', '10');
    await screen.findByTestId(`admin-set-groups-row-${KEY}`);

    fireEvent.click(screen.getByTestId(`admin-set-groups-clear-${KEY}`));
    expect(
      /** @type {HTMLInputElement} */ (screen.getByTestId('admin-set-groups-value')).value
    ).toBe('');
    expect(settingValue(KEY)).toBe(10);
    fireEvent.click(screen.getByTestId('admin-set-groups-submit'));
    await waitFor(() => expect(settingValue(KEY)).toBeNull());
    await waitFor(() => expect(screen.getByTestId('admin-set-groups-empty')).toBeTruthy());
  });

  it('GRP-PAGE-03 · edit pre-fills the group value; a value out of order is refused by code on the page', async () => {
    renderWithProviders(<AdminAlertThresholds />, { identity: BUYER });
    record('MG-20', 'bands.criticalBelowDays', '10');
    await screen.findByTestId(`admin-set-groups-row-${KEY}`);
    fireEvent.click(screen.getByTestId(`admin-set-groups-edit-${KEY}`));
    expect(
      /** @type {HTMLInputElement} */ (screen.getByTestId('admin-set-groups-value')).value
    ).toBe('10');
    fireEvent.change(screen.getByTestId('admin-set-groups-value'), { target: { value: '40' } });
    fireEvent.click(screen.getByTestId('admin-set-groups-submit'));
    await waitFor(() =>
      expect(screen.getByTestId('admin-set-refusal').textContent).toMatch(
        /GROUP_OVERRIDE_ORDER: MG-20: bands out of order: Critical/
      )
    );
    expect(settingValue(KEY)).toBe(10);
  });

  it('GRP-PAGE-04 · the stale table names the group period where the pair has none', async () => {
    renderWithProviders(<AdminAlertThresholds />, { identity: BUYER });
    await screen.findByTestId('admin-set-stale-row-sup-007-PK-PETB-8810');
    // PK-PETB-8810 (MG-20, manual) has no pair period: the weekly cutoff.
    expect(screen.getByTestId('admin-set-stale-period-sup-007-PK-PETB-8810').textContent).toBe(
      'Weekly cutoff (manual)'
    );
    record('MG-20', 'stale.defaultDays', '5');
    await waitFor(() =>
      expect(screen.getByTestId('admin-set-stale-period-sup-007-PK-PETB-8810').textContent).toBe(
        '5 days'
      )
    );
    const row = screen.getByTestId('admin-set-stale-row-sup-007-PK-PETB-8810');
    expect(within(row).getByText('Material group MG-20')).toBeTruthy();
    // A pair with its own period keeps it.
    expect(settingValue(staleOverrideKey('sup-007', 'PK-PETB-8801'))).toBe(3);
    expect(screen.getByTestId('admin-set-stale-period-sup-007-PK-PETB-8801').textContent).toBe(
      '3 days'
    );
  });

  it('GRP-PAGE-05 · a seat without setting:set reads the overrides and gets no form or row buttons', async () => {
    hubSettingsStore.append({
      key: KEY,
      value: 10,
      setBy: { kind: 'UNATTRIBUTED', reason: 'NO_PERSON_IN_SESSION' },
      setAt: '2026-10-23T01:00:00.000Z'
    });
    renderWithProviders(<AdminAlertThresholds />, { identity: PLANNER });
    expect(screen.getByTestId(`admin-set-groups-row-${KEY}`)).toBeTruthy();
    expect(screen.queryByTestId('admin-set-groups-form')).toBeNull();
    expect(screen.queryByTestId(`admin-set-groups-clear-${KEY}`)).toBeNull();
  });
});
