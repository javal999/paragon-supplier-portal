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
// Sample data (CV over 26 weeks of parent-SKU demand, DRC-11):
//   RM-STEAR-7300: CV 0.18, stable → level 4, the default in force.
//   FR-ROUD-4470:  CV 0.51, fluctuative → level 3.
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

describe('BL-208 — the suggested level', () => {
  it('stable → level 4 with its reason; the missing tag and the pallet-mix gap are named; it matches the level in force', async () => {
    recordConsumption();
    await open('RM-STEAR-7300');
    expect(screen.getByTestId('sst-level-suggestion-text')).toHaveTextContent(
      'Suggested: level 4 (Periodic Review), because CV 0.18 is below 0.5 (stable).'
    );
    const gaps = screen.getByTestId('sst-level-suggestion-gaps');
    expect(gaps).toHaveTextContent('No order-method tag in the hub: decided by demand pattern.');
    expect(gaps).toHaveTextContent('JIT (level 6) needs pallet-mix data.');
    expect(screen.getByTestId('sst-level-suggestion-proposed')).toHaveTextContent(
      'Proposed: awaiting owner review (BL-208, C2, F5)'
    );
    expect(screen.getByTestId('sst-level-suggestion-prov')).toHaveTextContent(
      'Provisional: rule awaiting Material Planning (C1, C2, F5, MPQ)'
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

  it('fluctuative → level 3; reading the page changes no level', async () => {
    await open('FR-ROUD-4470');
    expect(screen.getByTestId('sst-level-suggestion-text')).toHaveTextContent(
      'Suggested: level 3 (Continuous Review), because CV 0.51 is 0.5 or above (fluctuative).'
    );
    expect(screen.getByTestId('sst-rop-detail-level')).toHaveTextContent('OSIP level 4');
    expect(osipLevelStore.all()).toEqual([]);
    expect(commandAuditSink.byEvent('t_osiplevel_set')).toEqual([]);
  });

  it('"Use suggestion" sets level 3 through the verb, recorded as a confirmed suggestion and audited', async () => {
    await open('FR-ROUD-4470');
    fireEvent.click(screen.getByTestId('sst-level-use-suggestion'));
    await waitFor(() =>
      expect(screen.getByTestId('sst-rop-detail-level')).toHaveTextContent('OSIP level 3')
    );
    expect(screen.getByTestId('sst-rop-detail-level')).toHaveTextContent(
      'Suggested level, confirmed by the planner'
    );
    expect(osipLevelStore.all()).toEqual([
      expect.objectContaining({
        materialCode: 'FR-ROUD-4470',
        level: 3,
        previous: 4,
        source: 'classification'
      })
    ]);
    expect(
      commandAuditSink.byEvent('t_osiplevel_set').filter((e) => e.outcome === 'done')
    ).toHaveLength(1);
  });

  it('a seat without osiplevel:set reads the suggestion but gets no "Use suggestion"', async () => {
    await open('FR-ROUD-4470', { ...BUYER, businessRoles: ['procurement'] });
    expect(screen.getByTestId('sst-level-suggestion-text')).toHaveTextContent('level 3');
    expect(screen.queryByTestId('sst-level-use-suggestion')).toBeNull();
  });

  it('reads in Indonesian', async () => {
    await open('FR-ROUD-4470');
    await i18n.changeLanguage('id');
    expect(await screen.findByTestId('sst-level-suggestion-text')).toHaveTextContent(
      'Saran: level 3 (Continuous Review), karena CV 0,51 sama dengan atau di atas 0,5 (fluktuatif).'
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
