// ─────────────────────────────────────────────────────────────────────────────
// BL-326 — the Stock entry form's error wiring, at the surface (BL-84 follow-up).
//
// MR !151 tied the completion date to ANY `productionProblem` reason and the
// batch expiry to ANY `batchDatesProblem` field. Both are wrong: a refusal is
// about ONE control, and `aria-describedby` must resolve to the message that
// explains that control — not merely appear in the source.
// ─────────────────────────────────────────────────────────────────────────────

import { screen, fireEvent, within } from '@testing-library/react';
import { beforeEach, describe, expect, it } from 'vitest';
import { renderWithProviders, SUPPLIER } from '@test/test-utils';
import { inventoryDeclarationStore } from '@services/data/mock/stores/inventoryDeclarationStore';
import SupplierInventory from '../SupplierInventory';

const panel = () =>
  within(/** @type {HTMLElement} */ (document.querySelector('aside[role="dialog"]')));

beforeEach(() => inventoryDeclarationStore.reset());

/** @param {string} testId */
const openPanel = async (testId = 'stock-entry-open') => {
  renderWithProviders(<SupplierInventory />, { identity: SUPPLIER });
  fireEvent.click(await screen.findByTestId(testId));
};

/**
 * The text an `aria-describedby` resolves to, read through the DOM — a dangling
 * id resolves to `null`, which is the defect these tests exist to catch.
 * @param {HTMLElement} el
 * @returns {string}
 */
const describedText = (el) => {
  const ids = (el.getAttribute('aria-describedby') ?? '').split(/\s+/).filter(Boolean);
  return ids
    .map((id) => document.getElementById(id)?.textContent ?? '')
    .join(' ')
    .trim();
};

describe('BL-326 · the production completion date takes only its own refusal', () => {
  it('a pristine form blames the in-production quantity, never the date field', async () => {
    await openPanel();
    const inProduction = panel().getByLabelText(/^In production/);
    // MAT-D4 — the quantity is the missing field on an untouched form.
    expect(inProduction).toHaveAttribute('aria-invalid', 'true');
    expect(describedText(inProduction)).toContain('In production is required');

    const date = panel().getByLabelText('Expected production completion');
    expect(date).not.toHaveAttribute('aria-invalid');
    expect(date).not.toHaveAttribute('aria-describedby');
  });

  it('once a quantity is stated, the missing completion date is the date field’s refusal', async () => {
    await openPanel();
    fireEvent.change(panel().getByLabelText('Material'), { target: { value: 'PK-PETB-8801' } });
    fireEvent.change(panel().getByLabelText(/^Stock on hand/), { target: { value: '100' } });
    fireEvent.change(panel().getByLabelText(/^In production/), { target: { value: '5' } });

    const date = panel().getByLabelText('Expected production completion');
    expect(date).toHaveAttribute('aria-invalid', 'true');
    expect(describedText(date)).toContain('Enter the expected completion date');
    // The in-production field is no longer the one at fault.
    expect(panel().getByLabelText(/^In production/)).not.toHaveAttribute('aria-invalid');
  });
});

describe('BL-326 · a batch date refusal blames the date it is about', () => {
  it('a manufacturing date after the expiry marks the manufacturing field only', async () => {
    await openPanel();
    fireEvent.change(panel().getByLabelText('Material'), { target: { value: 'PK-PETB-8801' } });
    fireEvent.change(panel().getByLabelText(/^Stock on hand/), { target: { value: '100' } });
    fireEvent.change(panel().getByLabelText(/^In production/), { target: { value: '0' } });
    fireEvent.click(panel().getByRole('button', { name: 'Add batch' }));
    fireEvent.change(panel().getByLabelText('Batch number'), { target: { value: 'B-1' } });
    fireEvent.change(panel().getByLabelText('Quantity'), { target: { value: '100' } });
    fireEvent.change(panel().getByLabelText('Manufacturing date'), {
      target: { value: '2027-06-30' }
    });
    fireEvent.change(panel().getByLabelText(/^Expiry date/), { target: { value: '2027-01-01' } });

    const mfg = panel().getByLabelText('Manufacturing date');
    expect(mfg).toHaveAttribute('aria-invalid', 'true');
    expect(describedText(mfg)).toContain('The manufacturing date cannot be after the expiry date');

    const expiry = panel().getByLabelText(/^Expiry date/);
    expect(expiry).not.toHaveAttribute('aria-invalid');
    expect(expiry).not.toHaveAttribute('aria-describedby');
  });
});

describe('BL-326 · no description points at an element that is not on screen', () => {
  /**
   * The defect class in one sweep: every control that claims a description
   * resolves it to rendered text, and every invalid control claims one.
   */
  const assertWired = () => {
    const root = /** @type {HTMLElement} */ (panel().getByTestId('stock-entry-panel'));
    const described = [...root.querySelectorAll('[aria-describedby]')];
    expect(described.length).toBeGreaterThan(0);
    for (const el of described)
      expect(describedText(/** @type {HTMLElement} */ (el)), el.id).not.toBe('');
    const invalid = [...root.querySelectorAll('[aria-invalid="true"]')];
    for (const el of invalid) {
      expect(el.getAttribute('aria-describedby'), el.id).not.toBeNull();
      expect(describedText(/** @type {HTMLElement} */ (el)), el.id).not.toBe('');
    }
  };

  it('holds on the pristine form and while a batch refusal is on screen', async () => {
    await openPanel();
    assertWired();

    fireEvent.change(panel().getByLabelText('Material'), { target: { value: 'PK-PETB-8801' } });
    fireEvent.change(panel().getByLabelText(/^Stock on hand/), { target: { value: '100' } });
    fireEvent.change(panel().getByLabelText(/^In production/), { target: { value: '0' } });
    fireEvent.click(panel().getByRole('button', { name: 'Add batch' }));
    fireEvent.change(panel().getByLabelText('Batch number'), { target: { value: 'B-1' } });
    fireEvent.change(panel().getByLabelText('Quantity'), { target: { value: '100' } });
    fireEvent.change(panel().getByLabelText('Manufacturing date'), {
      target: { value: '2027-06-30' }
    });
    fireEvent.change(panel().getByLabelText(/^Expiry date/), { target: { value: '2027-01-01' } });

    assertWired();
    expect(describedText(panel().getByLabelText('Manufacturing date'))).toContain(
      'The manufacturing date cannot be after the expiry date'
    );
  });
});
