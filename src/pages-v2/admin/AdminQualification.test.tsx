import { describe, it, expect, beforeEach } from 'vitest';
import { screen, fireEvent, within } from '@testing-library/react';
import { renderWithProviders, BUYER } from '../../test/test-utils';
import { qualificationRuleStore } from '../../services/transitions/qualificationRuleStore';
import { supplierDocumentStore } from '../../services/data/mock/stores/supplierDocumentStore';
import { qualificationFor } from '../../services/data/mock/qualificationReadModel';
import AdminQualification from './AdminQualification';

// ─────────────────────────────────────────────────────────────────────────────
// Material G1 · Administration → Vendor qualification (MR-10 BR-04, edge case 2).
// ─────────────────────────────────────────────────────────────────────────────

const PLANNER = { ...BUYER, businessRoles: ['planning'] };

beforeEach(() => {
  qualificationRuleStore.reset();
  supplierDocumentStore.reset();
});

describe('Material G1 · AdminQualification', () => {
  it('shows both placeholder lists, labelled, and the vendors per level', async () => {
    renderWithProviders(<AdminQualification />, { identity: BUYER });
    const approved = await screen.findByTestId('adminqual-list-approved');
    expect(within(approved).getByTestId('qualification-placeholder')).toBeTruthy();
    expect(within(approved).getByText(/Business licence \(NIB\) and tax ID \(NPWP\)/)).toBeTruthy();
    expect(within(screen.getByTestId('adminqual-list-preferred')).getByText(/GMP \/ ISO 22716 or ISO 9001/)).toBeTruthy();
    expect(screen.getByTestId('adminqual-meta').textContent).toMatch(/Preferred 1/);
    expect(screen.getByTestId('admin-section-qualification')).toBeTruthy();
  });

  it('before saving, says how many vendors a new Preferred document would move down (edge case 2)', async () => {
    renderWithProviders(<AdminQualification />, { identity: BUYER });
    fireEvent.click(await screen.findByTestId('adminqual-edit-preferred'));
    fireEvent.click(screen.getByTestId('adminqual-add'));
    const items = screen.getByTestId('adminqual-items').querySelectorAll('li');
    const added = items[items.length - 1] as HTMLElement;
    fireEvent.change(within(added).getByLabelText('Document category'), { target: { value: 'Contract' } });
    // Blank requirement: the shared pre-check refuses and the save stays disabled.
    expect(screen.getByTestId('adminqual-precheck').textContent).toMatch(/needs a requirement/);
    expect((screen.getByTestId('adminqual-submit') as HTMLButtonElement).disabled).toBe(true);
    fireEvent.change(within(added).getByLabelText('Requirement'), { target: { value: 'Supply agreement' } });
    // sup-007 holds a valid contract, so nobody drops; ask for a BPJPH halal certificate instead.
    fireEvent.change(within(added).getByLabelText('Document category'), { target: { value: 'Halal Compliance' } });
    fireEvent.change(within(added).getByLabelText('Certificate type'), { target: { value: 'HALAL_BPJPH' } });
    expect(screen.getByTestId('adminqual-impact').textContent).toBe(
      'If saved: 1 vendor(s) move down and 0 move up, at once.',
    );
    fireEvent.click(screen.getByTestId('adminqual-submit'));
    expect(await screen.findByTestId('adminqual-change-preferred')).toBeTruthy();
    expect(qualificationRuleStore.get('preferred').placeholder).toBe(false);
    expect(qualificationFor('sup-007').level).toBe('approved');
  });

  it('a Preferred list without an Approved document is refused before it is sent', async () => {
    renderWithProviders(<AdminQualification />, { identity: BUYER });
    fireEvent.click(await screen.findByTestId('adminqual-edit-preferred'));
    const first = screen.getByTestId('adminqual-items').querySelector('li') as HTMLElement;
    fireEvent.click(within(first).getByRole('button', { name: 'Remove document' }));
    expect(screen.getByTestId('adminqual-precheck').textContent).toBe(
      'The Preferred list must include every Approved document.',
    );
    expect((screen.getByTestId('adminqual-submit') as HTMLButtonElement).disabled).toBe(true);
  });

  it('a planner reads the lists and gets the wait, not the form', async () => {
    renderWithProviders(<AdminQualification />, { identity: PLANNER });
    expect(await screen.findByTestId('adminqual-gate')).toBeTruthy();
    expect(screen.queryByTestId('adminqual-form')).toBeNull();
    expect(screen.queryByTestId('adminqual-edit-approved')).toBeNull();
    expect(screen.getByTestId('handoff-qualification-manage')).toBeTruthy();
    expect(screen.getByTestId('adminqual-list-approved')).toBeTruthy();
  });
});
