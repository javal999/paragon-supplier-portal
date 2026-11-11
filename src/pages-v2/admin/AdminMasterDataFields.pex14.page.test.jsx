import { afterEach, describe, expect, it } from 'vitest';
import { screen, within } from '@testing-library/react';
import { renderWithProviders, BUYER } from '@test/test-utils';
import AdminMasterDataFields from './AdminMasterDataFields';
import { RFI_QUESTION_LIBRARY } from '@services/sourcing/rfxConfig';
import i18n from '@lib/i18n';

// PEX-14 (BL-278) [Proposed] — the catalogue page: a row per field, mandatory marked, no blocking.

afterEach(() => void i18n.changeLanguage('en'));

const render = () =>
  renderWithProviders(<AdminMasterDataFields />, {
    identity: BUYER,
    route: '/buyer/admin/master-data-fields'
  });

describe('PEX-14 master data fields page', () => {
  it('lists the planning parameters and every RFI field, mandatory marked, in the warning period', async () => {
    render();
    const planning = await screen.findByTestId('md-group-planning');
    for (const id of ['leadTimeDays', 'moq', 'orderMultiple'])
      expect(within(planning).getByTestId(`md-field-${id}`)).toHaveTextContent('* Mandatory');
    for (const q of RFI_QUESTION_LIBRARY)
      expect(screen.getByTestId(`md-field-${q.id}`)).toBeTruthy();
    const required = RFI_QUESTION_LIBRARY.find((q) => q.required);
    const optional = RFI_QUESTION_LIBRARY.find((q) => !q.required);
    expect(screen.getByTestId(`md-field-${required?.id}`)).toHaveTextContent('* Mandatory');
    expect(screen.getByTestId(`md-field-${optional?.id}`)).toHaveTextContent('Optional');
    expect(screen.getByTestId('md-mode')).toHaveTextContent('can still be saved');
    expect(screen.getByTestId('md-proposed')).toHaveTextContent('Proposed catalogue');
  });

  it('reads in Indonesian', async () => {
    await i18n.changeLanguage('id');
    render();
    expect(await screen.findByTestId('md-mode')).toHaveTextContent('Masa peringatan');
  });
});
