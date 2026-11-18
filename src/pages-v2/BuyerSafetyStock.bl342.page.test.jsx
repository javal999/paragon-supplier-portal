// ────────────────────────────────────────────────────────────────────────────
// BL-342 (PSC-5 BR-03) on Safety stock targets — the CV explanation, folded the
// way BL-208's "How the level is suggested" is.
//
// The guide states the DRC-11 calculation the page already runs: the 6-month
// window, standard deviation ÷ average, the component weighting and the 0.5
// threshold. The calculation is unchanged; this is the explanation beside it.
// ────────────────────────────────────────────────────────────────────────────

import { afterEach, describe, expect, it } from 'vitest';
import { fireEvent, screen } from '@testing-library/react';
import { renderWithProviders, BUYER } from '@test/test-utils';
import BuyerSafetyStock from './BuyerSafetyStock';
import { consumptionStore } from '@services/data/mock/stores/consumptionStore';
import { osipLevelStore } from '@services/data/mock/stores/osipLevelStore';
import { npdTagStore } from '@services/data/mock/stores/npdTagStore';
import i18n from '@lib/i18n';

afterEach(() => {
  consumptionStore.reset();
  osipLevelStore.reset();
  npdTagStore.reset();
  void i18n.changeLanguage('en');
});

/**
 * @param {string} material
 * @param {typeof BUYER} [identity]
 */
const open = async (material = 'RM-STEAR-7300', identity = BUYER) => {
  renderWithProviders(<BuyerSafetyStock />, {
    identity,
    route: `/buyer/safety-stock?material=${material}`
  });
  return screen.findByTestId('sst-cv-guide');
};

describe('BL-342 — how the CV is calculated', () => {
  it('is a folded guide beside the material, and states the window, the formula and the threshold', async () => {
    const guide = await open();
    expect(guide.tagName).toBe('DETAILS');
    expect(guide).not.toHaveAttribute('open');
    fireEvent.click(screen.getByText('How the CV is calculated'));

    // The material's own figure, read off the rules in force.
    expect(screen.getByTestId('sst-cv-guide-current')).toHaveTextContent(
      'RM-STEAR-7300: CV 0.1 (Stable) over the last 6 full calendar months'
    );
    // The window, the DRC-11 calculation, the component weighting and the split.
    expect(guide).toHaveTextContent('The last 6 full calendar months of finished-goods demand');
    expect(guide).toHaveTextContent('each week is spread over its 7 days');
    expect(guide).toHaveTextContent(
      'CV = the standard deviation of a finished good’s monthly demand ÷ its average monthly demand'
    );
    expect(guide).toHaveTextContent('weighted by each one’s average demand');
    expect(guide).toHaveTextContent('Stable below 0.5, fluctuative at 0.5 or above');
    expect(guide).toHaveTextContent('each finished good is its own variant');
  });

  it('shows to a seat without osiplevel:set — it explains a figure, it gates nothing', async () => {
    await open('RM-STEAR-7300', { ...BUYER, businessRoles: ['procurement'] });
    expect(screen.getByTestId('sst-cv-guide')).toBeInTheDocument();
  });

  it('says plainly when a material has no CV', async () => {
    // 2000028400's CV column reads "No BOM line": no finished good names it.
    await open('2000028400');
    fireEvent.click(screen.getByText('How the CV is calculated'));
    expect(screen.getByTestId('sst-cv-guide-current')).toHaveTextContent(
      'This material has no CV: no BOM line names it'
    );
  });

  it('reads in Indonesian', async () => {
    await open();
    await i18n.changeLanguage('id');
    expect(await screen.findByText('Cara CV dihitung')).toBeInTheDocument();
    expect(screen.getByTestId('sst-cv-guide-current')).toHaveTextContent(
      'RM-STEAR-7300: CV 0,1 (Stabil) selama 6 bulan kalender penuh terakhir'
    );
  });
});
