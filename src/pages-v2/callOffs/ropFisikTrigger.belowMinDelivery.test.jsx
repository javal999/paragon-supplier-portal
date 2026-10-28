// BL-232 (owner, 2026-10-28): a draft the hub made at ROP Fisik on a PO line
// whose balance (1,200) is under the supplier's minimum delivery (2,000) is
// still drafted, and its panel says so: a "Below minimum delivery" warning
// with the 800 left as a PR recommendation. BL-230's ABOVE_MAX shows the same
// way. The figures are built here because no sample PO line is that short.
import { afterEach, describe, expect, it } from 'vitest';
import { screen } from '@testing-library/react';
import { renderWithProviders, BUYER } from '@test/test-utils';
import { RopFisikFigures } from './ropFisikTrigger';
import { stamp } from '@services/transitions/osipRules';
import i18n from '@lib/i18n';

/**
 * @param {Partial<import('@services/transitions/callOffTriggerRules').TriggerFigures>} over
 * @returns {import('@services/data/types').CallOff}
 */
const draft = (over = {}) =>
  /** @type {any} */ ({
    id: 'co-test',
    origin: 'ropFisik',
    uom: 'KG',
    trigger: stamp(
      {
        soh: 500,
        plants: [{ plant: 'J6', soh: 500 }],
        ropFisik: 1000,
        max: 20000,
        openSupply: 0,
        room: 19500,
        quantity: 1200,
        prQty: 800,
        demandPerDay: null,
        leadTimeDays: null,
        minDelivery: 2000,
        flags: ['BELOW_MIN_DELIVERY'],
        ...over
      },
      {}
    )
  });

afterEach(() => {
  void i18n.changeLanguage('en');
});

describe('BL-232 — a ROP Fisik draft below the supplier’s minimum delivery', () => {
  it('shows the minimum delivery, the warning, and the 800 left as a PR', () => {
    renderWithProviders(<RopFisikFigures callOff={draft()} />, { identity: BUYER });
    expect(screen.getByTestId('calloff-trigger-min-delivery')).toHaveTextContent('2,000 KG');
    const w = screen.getByTestId('calloff-trigger-below-min-delivery');
    expect(w).toHaveTextContent('Below minimum delivery');
    expect(w).toHaveTextContent(
      'This draft is 1,200 KG, below the supplier’s minimum delivery of 2,000 KG, because the PO line’s balance ran out. 800 KG is left as a PR recommendation.'
    );
  });

  it('without a PR left, the warning says nothing about one', () => {
    renderWithProviders(<RopFisikFigures callOff={draft({ prQty: 0 })} />, { identity: BUYER });
    const w = screen.getByTestId('calloff-trigger-below-min-delivery');
    expect(w).toHaveTextContent('below the supplier’s minimum delivery of 2,000 KG');
    expect(w).not.toHaveTextContent('PR recommendation');
  });

  it('known-good: a full minimum delivery shows no warning', () => {
    renderWithProviders(
      <RopFisikFigures callOff={draft({ quantity: 2000, prQty: 0, flags: [] })} />,
      { identity: BUYER }
    );
    expect(screen.getByTestId('calloff-trigger-min-delivery')).toHaveTextContent('2,000 KG');
    expect(screen.queryByTestId('calloff-trigger-below-min-delivery')).toBeNull();
    expect(screen.queryByTestId('calloff-trigger-above-max')).toBeNull();
  });

  it('[BL-230] ABOVE_MAX shows its own warning', () => {
    renderWithProviders(
      <RopFisikFigures callOff={draft({ quantity: 2000, prQty: 0, flags: ['ABOVE_MAX'] })} />,
      { identity: BUYER }
    );
    expect(screen.getByTestId('calloff-trigger-above-max')).toHaveTextContent('Above Max');
    expect(screen.queryByTestId('calloff-trigger-below-min-delivery')).toBeNull();
  });

  it('in Indonesian, the warning is Indonesian', async () => {
    await i18n.changeLanguage('id');
    renderWithProviders(<RopFisikFigures callOff={draft()} />, { identity: BUYER });
    expect(screen.getByTestId('calloff-trigger-below-min-delivery')).toHaveTextContent(
      'Di bawah pengiriman minimum'
    );
  });
});
