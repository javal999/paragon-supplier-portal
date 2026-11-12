import { describe, it, expect } from 'vitest';
import { screen } from '@testing-library/react';
import { renderWithProviders } from '@test/test-utils';
import '@lib/i18n';
import { DECLARED_PRESENT } from '@services/data/fixturePresent';
import { EMPTY_FORM } from './const';
import { missingLogistics, newAsnForm } from './utils';
import WizardDetailsStep from './components/WizardDetailsStep';

// BL-303 (UL-05, UI layering review 2026-11). On GitLab main a8eecbc7 the ASN
// wizard's Next stayed disabled with Carrier, Ship date and Estimated arrival
// filled, because the step rule also required the tracking number, which the
// form did not mark; and the ship date opened on 2026-04-07.

/** @param {Partial<import('./const').AsnForm>} patch */
const form = (patch) => ({ ...newAsnForm(), ...patch });

/** @param {import('./const').AsnForm} f */
const renderStep = (f) =>
  renderWithProviders(
    <WizardDetailsStep
      form={f}
      updateForm={() => {}}
      onLineChange={() => {}}
      wizardOpenLines={[]}
      wizardRead={/** @type {any} */ ({ complete: true, onlyShelfLife: false, lines: [] })}
      declaredBatches={{}}
    />
  );

describe('ASN wizard step 2 says what blocks Next (BL-303)', () => {
  it('the ship date opens on the hub today, not 2026-04-07', () => {
    expect(EMPTY_FORM.shipDate).toBe(DECLARED_PRESENT);
    expect(EMPTY_FORM.shipDate).not.toBe('2026-04-07');
  });

  it('names the tracking number as missing when it is the only gap (the defect the review hit)', () => {
    const f = form({ carrier: 'Sample Express', eta: '2026-09-28', shipDate: '2026-09-25' });
    expect(missingLogistics(f)).toEqual(['tracking']);
    renderStep(f);
    expect(screen.getByTestId('asn-wizard-missing')).toHaveTextContent(
      'To continue, fill in: Tracking or vehicle number.'
    );
    // The required marker is drawn after the label, as "Carrier *" reads.
    expect(screen.getByText('Tracking or vehicle number').className).toContain(
      "after:content-['_*']"
    );
    expect(screen.getByLabelText(/Tracking or vehicle number/)).toHaveAttribute(
      'aria-required',
      'true'
    );
  });

  it('says the arrival is before the ship date', () => {
    const f = form({
      carrier: 'Sample Express',
      trackingNumber: 'TRK-1',
      shipDate: '2026-09-25',
      eta: '2026-09-20'
    });
    expect(missingLogistics(f)).toEqual(['etaBeforeShip']);
    renderStep(f);
    expect(screen.getByTestId('asn-wizard-missing')).toHaveTextContent(
      'Estimated arrival is before the ship date.'
    );
  });

  it('shows nothing once the logistics are complete', () => {
    const f = form({
      carrier: 'Sample Express',
      trackingNumber: 'TRK-1',
      shipDate: '2026-09-25',
      eta: '2026-09-28'
    });
    expect(missingLogistics(f)).toEqual([]);
    renderStep(f);
    expect(screen.queryByTestId('asn-wizard-missing')).toBeNull();
  });
});
