import { beforeEach, describe, expect, it, vi } from 'vitest';
import { fireEvent, screen, within } from '@testing-library/react';
import { renderWithProviders, BUYER } from '@test/test-utils';
import { NO_PERSON } from '@context/noPerson';
import { qualificationRuleStore } from '@services/transitions/qualificationRuleStore';
import { sourcingTypeStore } from '@services/transitions/sourcingTypeStore';
import RfxInviteeStep from './RfxInviteeStep';
import AdminSourcingTypes from '../admin/AdminSourcingTypes';

// ─────────────────────────────────────────────────────────────────────────────
// Material G2 · the invitee step on an event's sourcing type (MR-10 BR-05,
// section d step 2), in both modes of the owner ruling of 2026-09-29, and
// Administration → Sourcing types (BR-06).
// ─────────────────────────────────────────────────────────────────────────────

/** Real lists: Approved = [Quality]; Preferred = [Quality, Halal] — sup-005 is Approved only. */
function realLists(): void {
  const at = '2026-01-01T00:00:00.000Z';
  const quality = { category: 'Quality' as const, label: 'GMP / ISO certificate' };
  const halal = { category: 'Halal Compliance' as const, label: 'Halal certificate' };
  qualificationRuleStore.append({ level: 'approved', requiredDocs: [quality], placeholder: false, setAt: at, setBy: NO_PERSON });
  qualificationRuleStore.append({ level: 'preferred', requiredDocs: [quality, halal], placeholder: false, setAt: at, setBy: NO_PERSON });
}

const step = (onToggle = vi.fn()) =>
  renderWithProviders(
    <RfxInviteeStep supplierCategory="Active Ingredient" selected={[]} onToggle={onToggle} testIdPrefix="t" sourcingType="direct" />,
    { identity: BUYER },
  );

beforeEach(() => {
  qualificationRuleStore.reset();
  sourcingTypeStore.reset();
});

describe('Material G2 · the invitee step', () => {
  it('REAL LIST — an Approved-only vendor on a direct event is greyed, not selectable, and says what is missing', async () => {
    realLists();
    const onToggle = vi.fn();
    step(onToggle);
    const row = await screen.findByTestId('t-invitee-row-sup-005');
    expect(row.getAttribute('data-offered')).toBe('false');
    const box = within(row).getByRole('checkbox') as HTMLInputElement;
    expect(box.disabled).toBe(true);
    fireEvent.click(row);
    expect(onToggle).not.toHaveBeenCalled();
    const marker = screen.getByTestId('t-invitee-elig-sup-005');
    expect(marker.getAttribute('data-state')).toBe('refused');
    expect(marker.textContent).toMatch(/Not qualified/);
    expect(marker.textContent).toMatch(/Is Approved; this Direct event needs Preferred/);
    expect(marker.textContent).toMatch(/Missing: Halal certificate/);
    expect(screen.getByTestId('t-sourcing-type').textContent).toMatch(/Sourcing type\s*Direct/);
  });

  it('PLACEHOLDER — the same vendor is offered and marked "Not qualified (placeholder rules)"', async () => {
    const onToggle = vi.fn();
    step(onToggle);
    const row = await screen.findByTestId('t-invitee-row-sup-005');
    expect(row.getAttribute('data-offered')).toBe('true');
    fireEvent.click(row);
    expect(onToggle).toHaveBeenCalledWith('sup-005');
    const marker = screen.getByTestId('t-invitee-elig-sup-005');
    expect(marker.getAttribute('data-state')).toBe('warn');
    expect(marker.textContent).toMatch(/Not qualified \(placeholder rules\)/);
  });
});

describe('Material G2 · Administration → Sourcing types', () => {
  it('lists every category and purchasing group as Direct, and saves a change through the verb', async () => {
    renderWithProviders(<AdminSourcingTypes />, { identity: BUYER });
    const select = (await screen.findByTestId('adminsourcing-select-pg:104')) as HTMLSelectElement;
    expect(select.value).toBe('direct');
    expect(screen.getByTestId('adminsourcing-row-category:Packaging')).toBeTruthy();
    const save = screen.getByTestId('adminsourcing-save-pg:104') as HTMLButtonElement;
    expect(save.disabled).toBe(true);
    fireEvent.change(select, { target: { value: 'indirect' } });
    fireEvent.click(save);
    await vi.waitFor(() => expect(sourcingTypeStore.get('pg:104')).toBe('indirect'));
  });
});
