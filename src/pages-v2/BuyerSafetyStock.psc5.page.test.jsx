import { afterEach, describe, expect, it } from 'vitest';
import { fireEvent, screen, waitFor, within } from '@testing-library/react';
import { renderWithProviders, BUYER } from '@test/test-utils';
import BuyerSafetyStock from './BuyerSafetyStock';
import { consumptionStore } from '@services/data/mock/stores/consumptionStore';
import { goodsReceiptStore } from '@services/data/mock/stores/goodsReceiptStore';
import { osipLevelStore } from '@services/data/mock/stores/osipLevelStore';
import { npdTagStore } from '@services/data/mock/stores/npdTagStore';
import { osipParamStore } from '@services/data/mock/stores/osipParamStore';
import i18n from '@lib/i18n';

// ─────────────────────────────────────────────────────────────────────────────
// PSC-5 BR-02 (BL-341) — the ROP-level view on Safety stock targets.
//
//   · grouped by the material's OSIP level — a material moved to level 5 sits
//     under the level 5 group and not under level 4;
//   · the PTI ROP per material, read from PTI's stock record;
//   · AC-03 — a material below its ROP carries the below-ROP warning;
//   · AC-02's other half — a material at its Max carries the max-stock warning.
//
// Seed reads at the declared present (PTI_STOCK):
//   RM-STEAR-7300 — PTI 900 / ROP 2,500 KG, Max 1,400 → below ROP, not at Max;
//   PK-PETB-8801  — PTI 30,000 / ROP 40,000 PCS, Max 15,200 → below ROP AND at Max;
//   PK-PETB-8810  — PTI 20,000 / ROP 15,000 PCS, Max "not available" → neither.
// ─────────────────────────────────────────────────────────────────────────────

afterEach(() => {
  consumptionStore.reset();
  goodsReceiptStore.reset();
  osipLevelStore.reset();
  osipParamStore.reset();
  npdTagStore.reset();
  void i18n.changeLanguage('en');
});

const render = async () => {
  renderWithProviders(<BuyerSafetyStock />, { identity: BUYER, route: '/buyer/safety-stock' });
  return screen.findByTestId('sst-rop-level');
};

/** The Max figures resolve only when the inventory read lands. */
/** @param {string} materialCode */
const findRop = async (materialCode) => {
  const cell = await screen.findByTestId(`sst-rop-level-rop-${materialCode}`);
  await waitFor(() => expect(cell).not.toHaveTextContent('—'));
  return cell;
};

describe('PSC-5 BR-02 — the ROP-level view groups materials by OSIP level', () => {
  it('every material sits under its level group; a planner-set level moves the row', async () => {
    await render();
    const group4 = await screen.findByTestId('sst-rop-level-group-4');
    expect(within(group4).getByTestId('sst-rop-level-row-RM-STEAR-7300')).toBeInTheDocument();
    expect(screen.queryByTestId('sst-rop-level-group-5')).toBeNull();
    // The planner sets level 5 in the material's panel (the governed verb).
    fireEvent.click(screen.getByTestId('sst-row-RM-STEAR-7300'));
    const select = /** @type {HTMLSelectElement} */ (await screen.findByTestId('sst-level-select'));
    const option = /** @type {HTMLOptionElement} */ (
      select.querySelector('option[data-value="5"]')
    );
    fireEvent.change(select, { target: { value: option.value } });
    fireEvent.click(screen.getByTestId('sst-level-save'));
    await waitFor(() =>
      expect(screen.getByTestId('sst-level-RM-STEAR-7300')).toHaveTextContent('Level 5')
    );
    await waitFor(() =>
      expect(
        within(screen.getByTestId('sst-rop-level-group-5')).getByTestId(
          'sst-rop-level-row-RM-STEAR-7300'
        )
      ).toBeInTheDocument()
    );
    expect(
      within(screen.getByTestId('sst-rop-level-group-4')).queryByTestId(
        'sst-rop-level-row-RM-STEAR-7300'
      )
    ).toBeNull();
  });
});

describe('PSC-5 BR-02 / AC-03 — the PTI ROP and the below-ROP warning', () => {
  it('shows the PTI ROP of the material', async () => {
    await render();
    expect(await findRop('RM-STEAR-7300')).toHaveTextContent('2,500 KG');
    expect(await findRop('PK-PETB-8801')).toHaveTextContent('40,000 PCS');
  });

  it('a material below its ROP carries the warning; one above it does not', async () => {
    await render();
    // RM-STEAR-7300: PTI 900 under ROP 2,500.
    expect(await screen.findByTestId('sst-rop-level-below-RM-STEAR-7300')).toHaveTextContent(
      'Below ROP'
    );
    // PK-PETB-8810: PTI 20,000 above ROP 15,000.
    expect(screen.queryByTestId('sst-rop-level-below-PK-PETB-8810')).toBeNull();
  });
});

describe('PSC-5 BR-02 / AC-02 — the max-stock case', () => {
  it('a material at its Max carries the max-stock warning; one below it does not', async () => {
    await render();
    // PK-PETB-8801: PTI 30,000 at Max 15,200.
    expect(await screen.findByTestId('sst-rop-level-atmax-PK-PETB-8801')).toHaveTextContent(
      'At or above Max'
    );
    // RM-STEAR-7300: PTI 900 under Max 1,400.
    expect(screen.queryByTestId('sst-rop-level-atmax-RM-STEAR-7300')).toBeNull();
  });

  it('shows the Max beside the stock; a pair with no Max shows a dash', async () => {
    await render();
    await findRop('PK-PETB-8801');
    expect(screen.getByTestId('sst-rop-level-max-PK-PETB-8801')).toHaveTextContent('15,200 PCS');
    expect(screen.getByTestId('sst-rop-level-max-PK-PETB-8810')).toHaveTextContent('—');
  });
});
