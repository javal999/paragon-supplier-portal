import { describe, it, expect, beforeEach } from 'vitest';
import { screen, fireEvent, within } from '@testing-library/react';
import { Routes, Route } from 'react-router-dom';
import { renderWithProviders, SUPPLIER } from '@test/test-utils';
/** @import { CurrentIdentity } from '@context/CurrentIdentityContext' */
import { PERSONA_SYSTEM_ROLES } from '@services/transitions/businessRoles';
import { NO_PERSON } from '@context/noPerson';
import { qualificationRuleStore } from '@services/transitions/qualificationRuleStore';
import { supplierDocumentStore } from '@services/data/mock/stores/supplierDocumentStore';
import SupplierDocuments from '../SupplierDocuments';
import BuyerSupplierProfile from '../BuyerSupplierProfile';

// ─────────────────────────────────────────────────────────────────────────────
// Material G1 · the qualification panel on the supplier profile (MR-10 AC-06)
// and on the buyer supplier detail (level and history).
// ─────────────────────────────────────────────────────────────────────────────

/** @type {CurrentIdentity} */
const SUP_002 = {
  personaType: 'supplier',
  supplierId: 'sup-002',
  supplierName: 'PT Sample Specialty Fats',
  businessRoles: PERSONA_SYSTEM_ROLES.supplier,
  actor: NO_PERSON
};

beforeEach(() => {
  qualificationRuleStore.reset();
  supplierDocumentStore.reset();
});

describe('Material G1 · supplier profile (AC-06)', () => {
  it('a Registered supplier sees its level, what Approved still needs, and the placeholder label', async () => {
    renderWithProviders(<SupplierDocuments />, { identity: SUP_002 });
    const panel = await screen.findByTestId('qualification-panel');
    expect(within(panel).getByTestId('qualification-level').textContent).toBe('Registered');
    expect(within(panel).getByText('For Approved, still needed:')).toBeTruthy();
    // Tax & Legal cannot be declared from this page; the panel says so rather than offering a dead link.
    const tax = within(panel).getByTestId('qualification-missing-Tax & Legal');
    expect(within(tax).getByText(/Send this document to Procurement/)).toBeTruthy();
    expect(within(panel).getByTestId('qualification-placeholder')).toBeTruthy();
    // A supplier never sees the history panel, nor another vendor's row.
    expect(within(panel).queryByTestId('qualification-history')).toBeNull();
  });

  it('a Preferred supplier sees the halal certificate that is about to drop it', async () => {
    renderWithProviders(<SupplierDocuments />, { identity: SUPPLIER });
    const panel = await screen.findByTestId('qualification-panel');
    expect(within(panel).getByTestId('qualification-level').textContent).toBe('Preferred');
    expect(within(panel).getByTestId('qualification-complete')).toBeTruthy();
    const expiring = within(panel).getByTestId('qualification-expiring');
    expect(within(expiring).getByText(/Halal Certificate/)).toBeTruthy();
  });

  it('a missing declarable document opens the declaration form with its certificate type', async () => {
    // Preferred for sup-002 also lacks BPOM, which a supplier can declare.
    qualificationRuleStore.append({
      level: 'approved',
      requiredDocs: [{ category: 'Halal Compliance', label: 'Halal certificate' }],
      placeholder: false,
      setAt: '2026-08-31T12:00:00.000Z',
      setBy: NO_PERSON
    });
    renderWithProviders(<SupplierDocuments />, { identity: SUP_002 });
    const panel = await screen.findByTestId('qualification-panel');
    expect(within(panel).getByTestId('qualification-level').textContent).toBe('Approved');
    const bpom = within(panel).getByTestId('qualification-missing-BPOM Regulatory');
    fireEvent.click(within(bpom).getByRole('button', { name: 'Declare document' }));
    const certType = /** @type {HTMLSelectElement} */ (await screen.findByDisplayValue('BPOM'));
    expect(certType.value).toBe('BPOM');
  });
});

describe('Material G1 · buyer supplier detail', () => {
  it('shows the level and the replayed history, each change naming its cause', async () => {
    renderWithProviders(
      <Routes>
        <Route path="/buyer/suppliers/:id" element={<BuyerSupplierProfile />} />
      </Routes>,
      { route: '/buyer/suppliers/sup-007' }
    );
    const panel = await screen.findByTestId('qualification-panel');
    expect(within(panel).getByTestId('qualification-level').textContent).toBe('Preferred');
    const history = within(panel).getByTestId('qualification-history');
    const causes = within(history)
      .getAllByTestId('qualification-history-cause')
      .map((c) => c.textContent);
    expect(causes).toEqual(['Document doc-005', 'Document doc-001']);
  });
});
