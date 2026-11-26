import { describe, it, expect, vi } from 'vitest';
import { screen, fireEvent, within } from '@testing-library/react';
import { renderWithProviders } from '@test/test-utils';
import '@lib/i18n';
import { DECLARED_PRESENT } from '@services/data/fixturePresent';
import { EMPTY_FORM } from './const';
import { missingDeliveryFields, missingLogistics, newAsnForm } from './utils';
import WizardDetailsStep from './components/WizardDetailsStep';

// BL-303 (UL-05, UI layering review 2026-11). On GitLab main a8eecbc7 the ASN
// wizard's Next stayed disabled with Carrier, Ship date and Estimated arrival
// filled, because the step rule also required the tracking number, which the
// form did not mark; and the ship date opened on 2026-04-07.
//
// UCX-P3 (BL-364) — the details step names EVERY missing field in ONE message
// (UCX-F8, UCX-F32), marks the batch column required, and explains Sequence and
// Surat Jalan with visible hints (UCX-D30: no (i) tip on a form field).

const MATERIAL = 'PK-PETB-8801';

/** @param {Partial<import('./const').AsnForm>} patch */
const form = (patch) => ({ ...newAsnForm(), ...patch });

/** The open line the step lists. */
const open = [
  { materialCode: MATERIAL, description: 'PET Bottle 200ml Frosted', uom: 'PCS', open: 10_000 }
];

/**
 * The read the step receives: one carried line with no batch, and whatever
 * sequence read the case needs.
 * @param {any} [sequenceRead]
 * @returns {any}
 */
const readOf = (sequenceRead = null) => ({
  complete: false,
  onlyShelfLife: false,
  overCount: 0,
  aboveAvailable: [],
  sequenceRead,
  lines: [
    {
      line: open[0],
      input: { materialCode: MATERIAL, shippedQty: 10_000, batchNumber: '' },
      refusal: 'batch',
      qtyOk: true,
      over: false,
      batchSource: 'declared',
      aboveAvailable: null,
      shelfLife: null
    }
  ]
});

/**
 * @param {import('./const').AsnForm} f
 * @param {any} [read]
 * @param {{ sequencesInUse?: readonly string[]; updateForm?: (p: Partial<import('./const').AsnForm>) => void; withLine?: boolean }} [opts]
 */
const renderStep = (f, read = readOf(), opts = {}) =>
  renderWithProviders(
    <WizardDetailsStep
      form={f}
      updateForm={opts.updateForm ?? (() => {})}
      onLineChange={() => {}}
      wizardOpenLines={opts.withLine === false ? [] : open}
      wizardRead={read}
      declaredBatches={{}}
      sequencesInUse={opts.sequencesInUse ?? []}
    />
  );

/** The complete logistics-only form, before UCX-P3's inbound fields. */
const logisticsOnly = () =>
  form({ carrier: 'Sample Express', trackingNumber: 'TRK-1', eta: '2026-09-28' });

describe('ASN wizard step 2 says what blocks Next (BL-303)', () => {
  it('the ship date opens on the hub today, not 2026-04-07', () => {
    expect(EMPTY_FORM.shipDate).toBe(DECLARED_PRESENT);
    expect(EMPTY_FORM.shipDate).not.toBe('2026-04-07');
  });

  it('names the tracking number when it is the only logistics gap', () => {
    const f = form({
      carrier: 'Sample Express',
      eta: '2026-09-28',
      shipDate: '2026-09-25',
      sequence: '4',
      externalId: 'SJ-1'
    });
    expect(missingLogistics(f)).toEqual(['tracking']);
    renderStep(f, { ...readOf(), lines: [] }, { withLine: false });
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
      eta: '2026-09-20',
      sequence: '4',
      externalId: 'SJ-1'
    });
    expect(missingLogistics(f)).toEqual(['etaBeforeShip']);
    renderStep(f, { ...readOf(), lines: [] }, { withLine: false });
    expect(screen.getByTestId('asn-wizard-missing')).toHaveTextContent(
      'Estimated arrival is before the ship date.'
    );
  });

  it('shows nothing once every field is complete', () => {
    const f = form({
      carrier: 'Sample Express',
      trackingNumber: 'TRK-1',
      shipDate: '2026-09-25',
      eta: '2026-09-28',
      sequence: '4',
      externalId: 'SJ-1'
    });
    renderStep(f, { ...readOf(), lines: [] }, { withLine: false });
    expect(screen.queryByTestId('asn-wizard-missing')).toBeNull();
  });
});

describe('UCX-P3 — one message names every missing field (UCX-F8, UCX-F32)', () => {
  it('names logistics, Sequence, Surat Jalan and the line without a batch in one sentence', () => {
    const f = form({ carrier: 'Sample Express' }); // no tracking, ETA, sequence, SJ
    expect(missingDeliveryFields(f, readOf())).toEqual([
      'tracking',
      'eta',
      'sequence',
      'externalId',
      `batch:${MATERIAL}`
    ]);
    renderStep(f);
    expect(screen.getByTestId('asn-wizard-missing')).toHaveTextContent(
      'To continue, fill in: Tracking or vehicle number, Estimated arrival, Sequence, Surat Jalan (External ID), Batch number for PK-PETB-8801.'
    );
    // ONE message: the second paragraph the two used to be does not exist.
    expect(screen.queryByTestId('asn-wizard-missing-inbound')).toBeNull();
  });

  it('marks the batch column required, like every required field', () => {
    renderStep(logisticsOnly(), readOf(), { withLine: true });
    const header = screen.getByText('Batch number').closest('th');
    expect(header?.className).toContain("after:content-['_*']");
  });
});

describe('UCX-P3 — Sequence and Surat Jalan are explained by visible hints (UCX-D30)', () => {
  it('the sequence field is prefilled, editable, and carries a visible hint — not an (i) tip', () => {
    const updateForm = vi.fn();
    renderStep(
      form({
        carrier: 'Sample Express',
        trackingNumber: 'TRK-1',
        eta: '2026-09-28',
        sequence: '4',
        externalId: 'SJ-1'
      }),
      readOf(),
      { updateForm, sequencesInUse: ['1', '2', '3'] }
    );
    const input = screen.getByLabelText('Sequence');
    expect(input).toHaveValue('4');
    expect(input).not.toBeDisabled();
    expect(input).not.toHaveAttribute('readonly');
    fireEvent.change(input, { target: { value: '7' } });
    expect(updateForm).toHaveBeenCalledWith({ sequence: '7' });
    // The hint is a plain sentence in the DOM, and the field holds no tip button.
    expect(screen.getByTestId('asn-wizard-sequence-hint')).toHaveTextContent(
      'The next free number is filled in; you can change it.'
    );
    expect(screen.getByTestId('asn-wizard-sequence-in-use')).toHaveTextContent('In use: 1, 2, 3.');
    const field = input.closest('div');
    expect(field).not.toBeNull();
    expect(within(/** @type {HTMLElement} */ (field)).queryByRole('button')).toBeNull();
  });

  it('the Surat Jalan carries its visible hint too', () => {
    renderStep(logisticsOnly(), readOf());
    expect(screen.getByTestId('asn-wizard-external-id-hint')).toHaveTextContent(
      'The number printed on your delivery note (Surat Jalan) for this shipment.'
    );
  });
});

describe('UCX-P3 — the SAP sequence rules still run (UCX-D13)', () => {
  it('an in-use sequence is refused with a message that names the ASN holding it', () => {
    renderStep(
      form({
        carrier: 'Sample Express',
        trackingNumber: 'TRK-1',
        eta: '2026-09-28',
        sequence: '4',
        externalId: 'SJ-1'
      }),
      readOf({
        ok: false,
        sequenceMissing: false,
        externalIdMissing: false,
        alreadyUsedBy: 'ASN-2025-00211',
        lines: []
      })
    );
    expect(screen.getByTestId('asn-wizard-sequence-used')).toHaveTextContent(
      'Sequence 4 already belongs to ASN-2025-00211.'
    );
  });

  it('a sequence that names another PO is refused with a message that names both POs', () => {
    renderStep(
      form({
        carrier: 'Sample Express',
        trackingNumber: 'TRK-1',
        eta: '2026-09-28',
        sequence: '1'
      }),
      readOf({
        ok: false,
        sequenceMissing: false,
        externalIdMissing: false,
        alreadyUsedBy: null,
        lines: [
          {
            materialCode: MATERIAL,
            code: 'po',
            value: '4200000199',
            expected: '4200000113'
          }
        ]
      })
    );
    expect(
      screen.getByText('This line names PO 4200000199 but the sequence names 4200000113.')
    ).toBeInTheDocument();
  });
});
