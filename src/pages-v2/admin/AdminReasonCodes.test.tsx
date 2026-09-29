import React from 'react';
import { describe, it, expect, beforeEach } from 'vitest';
import { screen, fireEvent, waitFor, within } from '@testing-library/react';
import { renderWithProviders, BUYER } from '../../test/test-utils';
import { reasonCodeStore } from '../../services/transitions/reasonCodes';
import AdminReasonCodes from './AdminReasonCodes';
import { useActiveReasonCodes, useReasonLabel } from './reasonCodeDisplay';

// ─────────────────────────────────────────────────────────────────────────────
// BL-32 · the administration page for reason codes, and the label every record
// reads a code through.
// ─────────────────────────────────────────────────────────────────────────────

const PLANNER = { ...BUYER, businessRoles: ['planning'] };
const NOBODY = { kind: 'UNATTRIBUTED', reason: 'NO_PERSON_IN_SESSION' } as const;

beforeEach(() => reasonCodeStore.reset());

/** What a record and a picker show for the capacity list. */
const Probe: React.FC<{ code: string }> = ({ code }) => {
  const label = useReasonLabel();
  const offered = useActiveReasonCodes('capacityShortfall');
  return (
    <div>
      <span data-testid="probe-label">{label('capacityShortfall', code)}</span>
      <span data-testid="probe-offered">{offered.join(',')}</span>
    </div>
  );
};

describe('BL-32 · Reason codes', () => {
  it('BL32-RSN-PAGE-01 · lists the four coded lists with their starter codes, and says which reasons are free text', () => {
    renderWithProviders(<AdminReasonCodes />, { identity: BUYER });
    for (const list of ['poAdjust', 'poReject', 'capacityShortfall', 'commitmentShortfall']) {
      expect(screen.getByTestId(`admin-rsn-list-${list}`)).toBeTruthy();
    }
    const row = screen.getByTestId('admin-rsn-row-poReject-date');
    expect(within(row).getByText('Date')).toBeTruthy();
    expect(within(row).getByText('Tanggal')).toBeTruthy();
    expect(within(row).getByText('Starter list')).toBeTruthy();
    expect(screen.getByTestId('admin-rsn-free-text').textContent).toMatch(/Call-off rejections/);
    expect(screen.getByTestId('admin-rsn-attribution').textContent).toMatch(/cannot name yet/);
  });

  it('MAT-A3-RSN-PAGE · the alert close list (MR-9 BR-05) is shown with its starter codes in EN and ID', () => {
    renderWithProviders(<AdminReasonCodes />, { identity: BUYER });
    const list = screen.getByTestId('admin-rsn-list-alertClose');
    expect(within(list).getByText('Alert — close')).toBeTruthy();
    for (const code of ['calloff-raised', 'po-raised', 'supplier-updated', 'supplier-confirmed-other', 'data-error', 'risk-accepted', 'other']) {
      expect(screen.getByTestId(`admin-rsn-row-alertClose-${code}`)).toBeTruthy();
    }
    const other = screen.getByTestId('admin-rsn-row-alertClose-other');
    expect(within(other).getByText('Other (note required)')).toBeTruthy();
    expect(within(other).getByText('Lainnya (catatan wajib)')).toBeTruthy();
    const po = screen.getByTestId('admin-rsn-row-alertClose-po-raised');
    expect(within(po).getByText('PO raised')).toBeTruthy();
    expect(within(po).getByText('PO dibuat')).toBeTruthy();
  });

  it('BL32-RSN-PAGE-02 · a planner reads the lists and gets the wait, not the form', () => {
    renderWithProviders(<AdminReasonCodes />, { identity: PLANNER });
    expect(screen.queryByTestId('admin-rsn-form')).toBeNull();
    expect(screen.getByTestId('handoff-reasoncode-maintain').textContent).toMatch(/Awaiting Compliance/);
    expect(screen.getByTestId('admin-rsn-row-poAdjust-capacity')).toBeTruthy();
  });

  it('BL32-RSN-PAGE-03 · adding a code goes through the verb, is offered at once, and is on the record', async () => {
    renderWithProviders(
      <>
        <AdminReasonCodes />
        <Probe code="machine-breakdown" />
      </>,
      { identity: BUYER },
    );
    expect(screen.getByTestId('probe-offered').textContent).not.toMatch(/machine-breakdown/);
    fireEvent.change(screen.getByTestId('admin-rsn-list'), { target: { value: 'capacityShortfall' } });
    fireEvent.change(screen.getByTestId('admin-rsn-label-en'), { target: { value: 'Machine breakdown' } });
    fireEvent.change(screen.getByTestId('admin-rsn-label-id'), { target: { value: 'Mesin rusak' } });
    expect(screen.getByTestId('admin-rsn-code').textContent).toBe('machine-breakdown');
    fireEvent.click(screen.getByTestId('admin-rsn-submit'));
    const row = await screen.findByTestId('admin-rsn-row-capacityShortfall-machine-breakdown');
    expect(within(row).getByText('Added by the administrator')).toBeTruthy();
    expect(screen.getByTestId('probe-offered').textContent).toMatch(/machine-breakdown/);
    expect(screen.getByTestId('probe-label').textContent).toBe('Machine breakdown');
    expect(screen.getByTestId('admin-rsn-change-capacityShortfall-machine-breakdown').textContent).toMatch(
      /added → Machine breakdown · Offered/,
    );
  });

  it('BL32-RSN-PAGE-04 · retire only PRE-FILLS; recorded, the code leaves the picker and old records read "(retired)"', async () => {
    renderWithProviders(
      <>
        <AdminReasonCodes />
        <Probe code="logistics" />
      </>,
      { identity: BUYER },
    );
    fireEvent.click(screen.getByTestId('admin-rsn-toggle-capacityShortfall-logistics'));
    expect((screen.getByTestId('admin-rsn-active') as HTMLInputElement).checked).toBe(false);
    expect(screen.getByTestId('probe-offered').textContent).toMatch(/logistics/);
    fireEvent.click(screen.getByTestId('admin-rsn-submit'));
    await waitFor(() => expect(screen.getByTestId('probe-offered').textContent).not.toMatch(/logistics/));
    expect(screen.getByTestId('probe-label').textContent).toBe('Logistics (retired)');
    expect(within(screen.getByTestId('admin-rsn-row-capacityShortfall-logistics')).getByText('Retired')).toBeTruthy();
  });

  it('BL32-RSN-PAGE-05 · an empty label is refused on the page, by name', async () => {
    renderWithProviders(<AdminReasonCodes />, { identity: BUYER });
    fireEvent.click(screen.getByTestId('admin-rsn-rename-poAdjust-quality'));
    fireEvent.change(screen.getByTestId('admin-rsn-label-en'), { target: { value: ' ' } });
    fireEvent.click(screen.getByTestId('admin-rsn-submit'));
    await waitFor(() =>
      expect(screen.getByTestId('admin-rsn-refusal').textContent).toMatch(/the English label for quality is empty/),
    );
    expect(reasonCodeStore.changes()).toHaveLength(0);
  });

  it('BL32-RSN-PAGE-06 · a record whose code the list never held shows the code itself, not a guess', () => {
    reasonCodeStore.append({
      list: 'capacityShortfall', code: 'power-cut', labelEn: 'Power cut', labelId: 'Listrik padam', active: true,
      setBy: NOBODY, setAt: '2026-09-21T00:00:00.000Z',
    });
    renderWithProviders(<Probe code="weather" />, { identity: BUYER });
    expect(screen.getByTestId('probe-label').textContent).toBe('weather');
  });
});
