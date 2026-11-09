// ─────────────────────────────────────────────────────────────────────────────
// BL-205 — the PTI Capacity page shows the protection buffer (DRC-9c) beside
// the strategic buffer: "Proposed: awaiting owner review (BL-205, C3)",
// "Provisional" on the level and MPQ defaults, and the "planned to be absorbed"
// note, in EN and ID. Every figure is read back from the rule the page reads.
// ─────────────────────────────────────────────────────────────────────────────

import { screen, within } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { renderWithProviders, BUYER } from '@test/test-utils';
import { SEEDED_SEAT_ROLES } from '@services/transitions/businessRoles';
import { capacityStore, inventoryAlertLedger } from '@services/data/mock/stores/inventoryHubStores';
import { osipLevelStore } from '@services/data/mock/stores/osipLevelStore';
import { osipParamStore } from '@services/data/mock/stores/osipParamStore';
import { allCommitmentLines } from '@services/data/mock/forecastReadModel';
import { protectionBufferInputs } from '@services/data/mock/protectionBufferReadModel';
import { protectionBufferRows } from '@services/transitions/drcBufferRules';
import { sdcClock } from '@services/sdc';
import { NO_PERSON } from '@context/noPerson';
import i18n from '@lib/i18n';
import { qty } from './inventory/inventoryDisplay';
import BuyerCapacity from './BuyerCapacity';
import ProtectionBufferSection from './inventory/ProtectionBufferSection';

beforeEach(() => {
  capacityStore.reset();
  inventoryAlertLedger.reset();
  osipLevelStore.reset();
  osipParamStore.reset();
  sdcClock.reset();
});
afterEach(() => {
  osipLevelStore.reset();
  osipParamStore.reset();
});

const PLANNER = { ...BUYER, businessRoles: SEEDED_SEAT_ROLES.buyer };

/** The first live pair with LTP and a sourced MPQ; set its material to `level`. */
function pickPair() {
  const inputs = protectionBufferInputs();
  const lines = allCommitmentLines(null);
  const pair = inputs.find(
    (i) =>
      i.mpq !== null &&
      lines.some((l) => l.supplierId === i.supplierId && l.materialCode === i.materialCode)
  );
  expect(pair, 'a live pair with LTP and MPQ').toBeDefined();
  return /** @type {NonNullable<typeof pair>} */ (pair);
}

/** @param {string} materialCode @param {number} level */
const setLevel = (materialCode, level) =>
  osipLevelStore.append({
    materialCode,
    level,
    previous: 4,
    source: 'planner',
    setAt: sdcClock.now(),
    setBy: NO_PERSON
  });

describe('DRC-9c — protection buffer section [Proposed BL-205]', () => {
  it('is Proposed (C3), Provisional (C2; MPQ as words, BL-262), and says the stock is planned to be absorbed', async () => {
    renderWithProviders(<BuyerCapacity />, { identity: PLANNER, route: '/buyer/capacity' });
    await screen.findByTestId('protection-buffer-table');
    expect(screen.getByTestId('protection-buffer-proposed')).toHaveTextContent(
      'Proposed: awaiting owner review (BL-205, C3)'
    );
    expect(screen.getByTestId('protection-buffer-provisional')).toHaveTextContent(
      'Provisional: rule awaiting Material Planning (C2; MPQ = order multiple until master data)'
    );
    expect(screen.getByTestId('protection-buffer-absorbed')).toHaveTextContent(
      'Planned stock: PTI absorbs it even if demand does not rise'
    );
  });

  it('at the default level 4 every pair reads "Level 4: no protection buffer"', async () => {
    const { supplierId, materialCode } = pickPair();
    renderWithProviders(<BuyerCapacity />, { identity: PLANNER, route: '/buyer/capacity' });
    await screen.findByTestId('protection-buffer-table');
    const k = `${supplierId}-${materialCode}`;
    expect(screen.getByTestId(`protection-buffer-level-${k}`)).toHaveTextContent(
      'Level 4 (default)'
    );
    expect(screen.getByTestId(`protection-buffer-none-${k}`)).toHaveTextContent(
      'Level 4: no protection buffer'
    );
  });

  it('a material set to level 5 shows each month as the rule computes it', async () => {
    const { supplierId, materialCode, mpq } = pickPair();
    setLevel(materialCode, 5);
    const row = protectionBufferRows(allCommitmentLines(null), protectionBufferInputs()).find(
      (r) => r.supplierId === supplierId && r.materialCode === materialCode
    );
    expect(row?.applies).toBe(true);
    renderWithProviders(<BuyerCapacity />, { identity: PLANNER, route: '/buyer/capacity' });
    const table = await screen.findByTestId('protection-buffer-table');
    const k = `${supplierId}-${materialCode}`;
    expect(within(table).getByTestId(`protection-buffer-level-${k}`)).toHaveTextContent('Level 5');
    expect(within(table).getByTestId(`protection-buffer-mpq-${k}`)).toHaveTextContent(
      `MPQ ${qty(/** @type {number} */ (mpq))}`
    );
    let compared = 0;
    for (const m of row?.months ?? []) {
      const cell = within(table).getByTestId(`protection-buffer-value-${k}-${m.month}`);
      if (m.status === 'ok') {
        expect(cell).toHaveTextContent(qty(/** @type {number} */ (m.buffer)));
        compared += 1;
      } else if (m.status === 'baselineIncomplete')
        expect(cell).toHaveTextContent('Baseline incomplete');
    }
    // Known-good control: at least one month had a full baseline and was compared.
    expect(compared).toBeGreaterThan(0);
  });

  it("a material's switch off shows 'Switched off' and no figure (PEX-13)", async () => {
    const { supplierId, materialCode } = pickPair();
    setLevel(materialCode, 5);
    osipParamStore.append({
      key: `protectionBufferOn|${materialCode}`,
      param: 'protectionBufferOn',
      value: false,
      previous: null,
      reason: 'Planner reviewed the festive plan',
      setAt: sdcClock.now(),
      setBy: NO_PERSON
    });
    renderWithProviders(
      <ProtectionBufferSection supplierId={supplierId} materialCode={materialCode} />,
      { identity: PLANNER }
    );
    expect(
      await screen.findByTestId(`protection-buffer-none-${supplierId}-${materialCode}`)
    ).toHaveTextContent('Switched off');
    expect(screen.queryByTestId('protection-buffer-table')).not.toBeNull();
  });

  it('reads in Indonesian', async () => {
    await i18n.changeLanguage('id');
    const view = renderWithProviders(<BuyerCapacity />, {
      identity: PLANNER,
      route: '/buyer/capacity'
    });
    try {
      await screen.findByTestId('protection-buffer-table');
      expect(screen.getByTestId('protection-buffer-proposed')).toHaveTextContent(
        'Usulan: menunggu tinjauan pemilik (BL-205, C3)'
      );
      expect(screen.getByTestId('protection-buffer-provisional')).toHaveTextContent(
        'Sementara: aturan menunggu Material Planning (C2; MPQ = kelipatan pesanan sampai data master)'
      );
      expect(screen.getByTestId('protection-buffer-absorbed')).toHaveTextContent(
        'Stok terencana: PTI menyerapnya walaupun permintaan tidak naik'
      );
      const { supplierId, materialCode } = pickPair();
      expect(
        screen.getByTestId(`protection-buffer-none-${supplierId}-${materialCode}`)
      ).toHaveTextContent('Level 4: tanpa protection buffer');
    } finally {
      view.unmount();
      await i18n.changeLanguage('en');
    }
  });
});
