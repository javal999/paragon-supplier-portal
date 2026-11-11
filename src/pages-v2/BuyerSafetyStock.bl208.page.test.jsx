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
      'Provisional: rule awaiting Material Planning (C2, F5; MPQ = order multiple until master data)'
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

// The rules behind the suggestion, folded under "How the level is suggested":
// every tag rule, both CV rules and the JIT rule, in `suggestOsipLevel`'s
// order, each saying whether the hub can apply it with the data it holds.
describe('BL-208 — how the level is suggested', () => {
  it('lists the seven rules in order, with the figures in force and what the hub can apply today', async () => {
    await open('RM-STEAR-7300');
    const guide = screen.getByTestId('sst-level-guide');
    expect(guide.tagName).toBe('DETAILS');
    expect(guide).not.toHaveAttribute('open');
    fireEvent.click(screen.getByText('How the level is suggested'));

    const rows = screen.getByTestId('sst-level-guide-table').querySelectorAll('tbody tr');
    expect([...rows].map((r) => r.getAttribute('data-testid'))).toEqual([
      'sst-level-guide-row-tag-pipo',
      'sst-level-guide-row-tag-oneShot',
      'sst-level-guide-row-tag-festive',
      'sst-level-guide-row-tag-commodity',
      'sst-level-guide-row-cv-fluctuative',
      'sst-level-guide-row-cv-stable',
      'sst-level-guide-row-jit'
    ]);
    expect(screen.getByTestId('sst-level-guide-row-tag-pipo')).toHaveTextContent(
      '1The material is tagged PIPOLevel 1, Manual OrderNot used: the material master has no order-method tag yet.'
    );
    expect(screen.getByTestId('sst-level-guide-row-tag-festive')).toHaveTextContent(
      'Exception Based, strategic buffer, no OSIP level'
    );
    expect(screen.getByTestId('sst-level-guide-row-tag-commodity')).toHaveTextContent(
      'Level 5, Fixed Order'
    );
    expect(screen.getByTestId('sst-level-guide-row-cv-fluctuative')).toHaveTextContent(
      'No tag, and demand CV is 0.5 or above (fluctuative)Level 3, Continuous ReviewUsed.'
    );
    expect(screen.getByTestId('sst-level-guide-row-cv-stable')).toHaveTextContent(
      'No tag, and demand CV is below 0.5 (stable)Level 4, Periodic ReviewUsed.'
    );
    expect(screen.getByTestId('sst-level-guide-row-jit')).toHaveTextContent(
      'MPQ ÷ daily consumption is 6 days or less'
    );
    expect(screen.getByTestId('sst-level-guide-row-jit')).toHaveTextContent(
      'Level 6, JITNever suggested: the hub has no pallet-mix data.'
    );
    expect(screen.getByTestId('sst-level-guide-cv')).toHaveTextContent(
      'over the last 6 full calendar months'
    );
    expect(screen.getByTestId('sst-level-guide-cv')).toHaveTextContent(
      'No CV, no level is suggested.'
    );
    expect(screen.getByTestId('sst-level-guide-fallback')).toHaveTextContent(
      'Levels 1 and 2 have no ROP Fisik formula of their own: the hub calculates them with the level 4 formula and flags it. A material nobody has set is at level 4.'
    );
  });

  it('shows to a seat without osiplevel:set too, and reads in Indonesian', async () => {
    await open('FR-ROUD-4470', { ...BUYER, businessRoles: ['procurement'] });
    expect(screen.queryByTestId('sst-level-use-suggestion')).toBeNull();
    expect(screen.getByTestId('sst-level-guide')).toBeInTheDocument();
    await i18n.changeLanguage('id');
    expect(await screen.findByText('Cara level disarankan')).toBeInTheDocument();
    expect(screen.getByTestId('sst-level-guide-row-cv-stable')).toHaveTextContent(
      'Tanpa tag, dan CV permintaan di bawah 0,5 (stabil)Level 4, Periodic ReviewDipakai.'
    );
    expect(screen.getByTestId('sst-level-guide-row-tag-commodity')).toHaveTextContent(
      'Material ditandai komoditas'
    );
  });
});
