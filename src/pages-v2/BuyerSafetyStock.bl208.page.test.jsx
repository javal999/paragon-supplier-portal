import { afterEach, describe, expect, it } from 'vitest';
import { fireEvent, screen, waitFor } from '@testing-library/react';
import { renderWithProviders, BUYER } from '@test/test-utils';
import BuyerSafetyStock from './BuyerSafetyStock';
import { commandAuditSink } from '@services/data/mock/MockCommandService';
import { consumptionStore } from '@services/data/mock/stores/consumptionStore';
import { osipLevelStore } from '@services/data/mock/stores/osipLevelStore';
import { npdTagStore } from '@services/data/mock/stores/npdTagStore';
import { NO_PERSON } from '@context/noPerson';
import i18n from '@lib/i18n';

// ─────────────────────────────────────────────────────────────────────────────
// BL-208 (DRC-19) [Proposed] on the Safety stock targets page: the suggested
// OSIP level beside the level control, its reason, the inputs it lacks, the
// "Proposed" and "Provisional" labels, and "Use suggestion" — which fires the
// existing level verb only when the planner clicks it.
//
// Sample data (CV over the last 6 full months of parent-SKU demand, DRC-11
// [Team C1, 2026-10-28]):
//   RM-STEAR-7300: CV 0.10, stable → level 4, the default in force.
//   FR-ROUD-4470:  CV 0.33, stable → level 4 (it read 0.51, fluctuative, on
//                  26 weekly buckets). Monthly buckets leave NO sample material
//                  fluctuative, so the level-3 path is pinned in
//                  `osipLevelSuggestion.test.js`, not here. To exercise "Use
//                  suggestion", FR-ROUD-4470 starts at a planner-set level 5.
// ─────────────────────────────────────────────────────────────────────────────

afterEach(() => {
  consumptionStore.reset();
  osipLevelStore.reset();
  npdTagStore.reset();
  commandAuditSink.clear();
  void i18n.changeLanguage('en');
});

/** 14,000 and 7,000 KG of RM-STEAR-7300 consumed: 1,500 a day; MPQ 25. */
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

/**
 * @param {string} material
 * @param {typeof BUYER} [identity]
 */
const open = async (material, identity = BUYER) => {
  renderWithProviders(<BuyerSafetyStock />, {
    identity,
    route: `/buyer/safety-stock?material=${material}`
  });
  return screen.findByTestId('sst-level-suggestion');
};

/** FR-ROUD-4470 at a planner-set level 5, so the suggested level 4 differs from it. */
const atLevel5 = () =>
  osipLevelStore.append({
    materialCode: 'FR-ROUD-4470',
    level: 5,
    previous: 4,
    source: 'planner',
    setAt: '2026-08-31T03:00:00.000Z',
    setBy: NO_PERSON
  });

describe('BL-208 — the suggested level', () => {
  it('stable → level 4 with its reason; the missing tag and the pallet-mix gap are named; it matches the level in force', async () => {
    recordConsumption();
    await open('RM-STEAR-7300');
    expect(screen.getByTestId('sst-level-suggestion-text')).toHaveTextContent(
      'Suggested: level 4 (Periodic Review), because CV 0.1 is below 0.5 (stable).'
    );
    const gaps = screen.getByTestId('sst-level-suggestion-gaps');
    expect(gaps).toHaveTextContent('No order-method tag in the hub: decided by demand pattern.');
    expect(gaps).toHaveTextContent('JIT (level 6) needs pallet-mix data.');
    expect(screen.getByTestId('sst-level-suggestion-proposed')).toHaveTextContent(
      'Proposed: awaiting owner review (BL-208, C2, F5)'
    );
    expect(screen.getByTestId('sst-level-suggestion-prov')).toHaveTextContent(
      'Provisional: rule awaiting Material Planning (C2, F5, MPQ)'
    );
    expect(screen.getByTestId('sst-level-suggestion-matches')).toBeInTheDocument();
    expect(screen.queryByTestId('sst-level-use-suggestion')).toBeNull();
  });

  it('with no consumption recorded, the JIT check names the missing input', async () => {
    await open('RM-STEAR-7300');
    expect(screen.getByTestId('sst-level-suggestion-gaps')).toHaveTextContent(
      'No recorded consumption: no MPQ rate, so JIT (level 6) is not checked.'
    );
  });

  it('[Team C1] FR-ROUD-4470 on six monthly buckets: CV 0.33 → stable, level 4; reading the page changes no level', async () => {
    atLevel5();
    await open('FR-ROUD-4470');
    expect(screen.getByTestId('sst-level-suggestion-text')).toHaveTextContent(
      'Suggested: level 4 (Periodic Review), because CV 0.33 is below 0.5 (stable).'
    );
    expect(screen.getByTestId('sst-rop-detail-level')).toHaveTextContent('OSIP level 5');
    expect(osipLevelStore.all()).toHaveLength(1);
    expect(commandAuditSink.byEvent('t_osiplevel_set')).toEqual([]);
  });

  it('"Use suggestion" sets level 4 through the verb, recorded as a confirmed suggestion and audited', async () => {
    atLevel5();
    await open('FR-ROUD-4470');
    fireEvent.click(screen.getByTestId('sst-level-use-suggestion'));
    await waitFor(() =>
      expect(screen.getByTestId('sst-rop-detail-level')).toHaveTextContent('OSIP level 4')
    );
    expect(screen.getByTestId('sst-rop-detail-level')).toHaveTextContent(
      'Suggested level, confirmed by the planner'
    );
    expect(osipLevelStore.all()[1]).toEqual(
      expect.objectContaining({
        materialCode: 'FR-ROUD-4470',
        level: 4,
        previous: 5,
        source: 'classification'
      })
    );
    expect(
      commandAuditSink.byEvent('t_osiplevel_set').filter((e) => e.outcome === 'done')
    ).toHaveLength(1);
  });

  it('a seat without osiplevel:set reads the suggestion but gets no "Use suggestion"', async () => {
    atLevel5();
    await open('FR-ROUD-4470', { ...BUYER, businessRoles: ['procurement'] });
    expect(screen.getByTestId('sst-level-suggestion-text')).toHaveTextContent('level 4');
    expect(screen.queryByTestId('sst-level-use-suggestion')).toBeNull();
  });

  it('reads in Indonesian', async () => {
    atLevel5();
    await open('FR-ROUD-4470');
    await i18n.changeLanguage('id');
    expect(await screen.findByTestId('sst-level-suggestion-text')).toHaveTextContent(
      'Saran: level 4 (Periodic Review), karena CV 0,33 di bawah 0,5 (stabil).'
    );
    expect(screen.getByTestId('sst-level-suggestion-proposed')).toHaveTextContent(
      'Usulan: menunggu tinjauan pemilik (BL-208, C2, F5)'
    );
    expect(screen.getByTestId('sst-level-suggestion-gaps')).toHaveTextContent(
      'Tidak ada tag metode order di hub'
    );
    expect(screen.getByTestId('sst-level-use-suggestion')).toHaveTextContent('Pakai saran');
  });
});
