import { describe, it, expect, afterEach } from 'vitest';
import { screen, act } from '@testing-library/react';
import { renderWithProviders } from '@test/test-utils';
import i18n, { LANG_STORAGE_KEY } from '@lib/i18n';
import Login from './Login';

afterEach(async () => {
  await act(async () => {
    await i18n.changeLanguage('en');
  });
  localStorage.removeItem(LANG_STORAGE_KEY);
});

// WCAG relative luminance / contrast, the same shape as the border-input check
// in `ui-v2/sharedA11y.test.jsx`.
/** @param {string} hex */
const luminance = (hex) => {
  const [r, g, b] = [1, 3, 5].map((i) => {
    const c = parseInt(hex.slice(i, i + 2), 16) / 255;
    return c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4;
  });
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
};
/** @param {string} a @param {string} b */
const ratio = (a, b) => {
  const [hi, lo] = [luminance(a), luminance(b)].sort((x, y) => y - x);
  return (hi + 0.05) / (lo + 0.05);
};

describe('Login — BL-84 (WCAG 1.3.1 / 1.4.3 / 3.1.2)', () => {
  it('has one page heading and it is the product name', () => {
    renderWithProviders(<Login />);
    const headings = screen.getAllByRole('heading', { level: 1 });
    expect(headings).toHaveLength(1);
    expect(headings[0]).toHaveTextContent('Paragon Supplier Portal');
  });

  it('the demo notice and the page chrome are locale-aware (EN / ID)', async () => {
    const { container } = renderWithProviders(<Login />);
    expect(screen.getByText('Demo Mode')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Sign In' })).toBeInTheDocument();
    await act(async () => {
      await i18n.changeLanguage('id');
    });
    expect(screen.getByText('Mode Demo')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Masuk' })).toBeInTheDocument();
    expect(container.querySelector('h1')).toHaveTextContent('Portal Pemasok Paragon');
  });

  it('no text uses the retired #94A3B8 grey, which is 2.6:1 on white', () => {
    const { container } = renderWithProviders(<Login />);
    expect(container.innerHTML).not.toMatch(/#94A3B8/i);
  });

  it('the two inks it ships clear AA on the surfaces they sit on', () => {
    // MUTED resolves to `--pds-color-text-secondary` = `--neutral-700` = #5c5c5c
    // in the light theme (theme.css / colors.css); FOOTER_TEXT is literal and
    // sits on the navy page background, rgb(42, 61, 74).
    expect(ratio('#5c5c5c', '#ffffff')).toBeGreaterThanOrEqual(4.5);
    expect(ratio('#d3dae1', '#2a3d4a')).toBeGreaterThanOrEqual(4.5);
    // Known-bad control: the retired grey really fails the same check.
    expect(ratio('#94a3b8', '#ffffff')).toBeLessThan(4.5);
  });
});
