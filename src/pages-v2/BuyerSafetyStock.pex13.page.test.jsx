import { afterEach, describe, expect, it } from 'vitest';
import { fireEvent, screen, waitFor, within } from '@testing-library/react';
import { renderWithProviders, BUYER } from '@test/test-utils';
import BuyerSafetyStock from './BuyerSafetyStock';
import { consumptionStore } from '@services/data/mock/stores/consumptionStore';
import { goodsReceiptStore } from '@services/data/mock/stores/goodsReceiptStore';
import { osipParamStore } from '@services/data/mock/stores/osipParamStore';
import { NO_PERSON } from '@context/noPerson';
import i18n from '@lib/i18n';

// PEX-13 (BL-275) — the per-material switches on the Safety stock detail panel: both on by
// default; a change needs a reason of at least 10 characters; off, the safety stock is 0.
// RM-STEAR-7300 × sup-002 with 14,000 and 7,000 KG consumption (as in BL-196's page test):
// ROP Order 20,850 = cycle stock 20,200 + safety order 650.

afterEach(() => {
  consumptionStore.reset();
  goodsReceiptStore.reset();
  osipParamStore.reset();
  void i18n.changeLanguage('en');
});

const ID = 'RM-STEAR-7300-sup-002';

const recordConsumption = () => {
  for (const [week, qty] of /** @type {const} */ ([
    ['2026-08-17', 14000],
    ['2026-08-24', 7000]
  ]))
    consumptionStore.add({
      materialCode: 'RM-STEAR-7300',
      week,
      qty,
      unit: 'KG',
      source: 'manual',
      recordedAt: '2026-08-31T12:00:00.000Z',
      actor: NO_PERSON
    });
};

const openPanel = async () => {
  renderWithProviders(<BuyerSafetyStock />, { identity: BUYER, route: '/buyer/safety-stock' });
  fireEvent.click(await screen.findByTestId('sst-row-RM-STEAR-7300'));
  return screen.findByTestId('sst-rop-detail');
};

describe('PEX-13 safety stock and protection buffer switches', () => {
  it('both are on by default and show no change note', async () => {
    recordConsumption();
    const panel = await openPanel();
    for (const p of ['safetyStockOn', 'protectionBufferOn']) {
      expect(within(panel).getByTestId(`pex-switch-${p}-toggle`)).toBeChecked();
      expect(within(panel).getByTestId(`pex-switch-${p}-state`)).toHaveTextContent('On');
      expect(within(panel).queryByTestId(`pex-switch-${p}-last`)).toBeNull();
    }
  });

  it('turning safety stock off needs a reason of 10+ characters; saved off, the safety order is 0 and the change is on the ledger', async () => {
    recordConsumption();
    const panel = await openPanel();
    expect(screen.getByTestId(`sst-rop-ropOrder-${ID}`)).toHaveTextContent('20,850 KG');
    fireEvent.click(within(panel).getByTestId('pex-switch-safetyStockOn-toggle'));
    const save = within(panel).getByTestId('pex-switch-safetyStockOn-save');
    expect(save).toBeDisabled();
    fireEvent.change(within(panel).getByTestId('pex-switch-safetyStockOn-reason'), {
      target: { value: 'too short' }
    });
    expect(save).toBeDisabled();
    fireEvent.change(within(panel).getByTestId('pex-switch-safetyStockOn-reason'), {
      target: { value: 'Discontinued, sell down stock' }
    });
    expect(save).toBeEnabled();
    fireEvent.click(save);
    await waitFor(() =>
      expect(screen.getByTestId(`sst-rop-ropOrder-${ID}`)).toHaveTextContent('20,200 KG')
    );
    expect(osipParamStore.all().map((r) => [r.key, r.value, r.reason])).toEqual([
      ['safetyStockOn|RM-STEAR-7300', false, 'Discontinued, sell down stock']
    ]);
    const last = await screen.findByTestId('pex-switch-safetyStockOn-last');
    expect(last).toHaveTextContent('Off');
    expect(last).toHaveTextContent('Discontinued, sell down stock');
    // The other switch is untouched.
    expect(screen.getByTestId('pex-switch-protectionBufferOn-toggle')).toBeChecked();
  });

  it('switching back on is a change too: it needs a reason and is a second ledger row', async () => {
    recordConsumption();
    let panel = await openPanel();
    fireEvent.click(within(panel).getByTestId('pex-switch-safetyStockOn-toggle'));
    fireEvent.change(within(panel).getByTestId('pex-switch-safetyStockOn-reason'), {
      target: { value: 'Switch off for the test' }
    });
    fireEvent.click(within(panel).getByTestId('pex-switch-safetyStockOn-save'));
    await screen.findByTestId('pex-switch-safetyStockOn-last');
    panel = screen.getByTestId('sst-rop-detail');
    fireEvent.click(within(panel).getByTestId('pex-switch-safetyStockOn-toggle'));
    expect(within(panel).getByTestId('pex-switch-safetyStockOn-save')).toBeDisabled();
    fireEvent.change(within(panel).getByTestId('pex-switch-safetyStockOn-reason'), {
      target: { value: 'Back in the range again' }
    });
    fireEvent.click(within(panel).getByTestId('pex-switch-safetyStockOn-save'));
    await waitFor(() =>
      expect(screen.getByTestId(`sst-rop-ropOrder-${ID}`)).toHaveTextContent('20,850 KG')
    );
    expect(osipParamStore.all().map((r) => [r.value, r.previous])).toEqual([
      [false, null],
      [true, false]
    ]);
  });

  it('a seat without osipparam:set cannot change a switch', async () => {
    renderWithProviders(<BuyerSafetyStock />, {
      identity: { ...BUYER, businessRoles: ['procurement'] },
      route: '/buyer/safety-stock?material=RM-STEAR-7300'
    });
    const panel = await screen.findByTestId('sst-rop-detail');
    expect(within(panel).getByTestId('pex-switch-safetyStockOn-toggle')).toBeDisabled();
  });

  it('reads in Indonesian', async () => {
    await i18n.changeLanguage('id');
    const panel = await openPanel();
    expect(within(panel).getByTestId('pex-switches')).toHaveTextContent('Saklar Safety stock');
  });
});
