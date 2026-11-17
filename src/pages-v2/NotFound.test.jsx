import { describe, it, expect, afterEach } from 'vitest';
import { screen, fireEvent, act } from '@testing-library/react';
import { useLocation } from 'react-router-dom';
import { renderWithProviders } from '@test/test-utils';
import i18n, { LANG_STORAGE_KEY } from '@lib/i18n';
import NotFound from './NotFound';

const LocationProbe = () => {
  const loc = useLocation();
  return <div data-testid="loc">{loc.pathname}</div>;
};

afterEach(async () => {
  await act(async () => {
    await i18n.changeLanguage('en');
  });
  localStorage.removeItem(LANG_STORAGE_KEY);
});

describe('NotFound — real 404 (NAV-02)', () => {
  it('renders a 404 surface instead of silently redirecting', () => {
    renderWithProviders(<NotFound />, { route: '/buyer/does-not-exist' });
    expect(screen.getByText('Page not found')).toBeInTheDocument();
    expect(screen.getByText('404 — Not found')).toBeInTheDocument();
  });

  it('offers a route back to Home', () => {
    renderWithProviders(
      <>
        <NotFound />
        <LocationProbe />
      </>,
      { route: '/buyer/does-not-exist' }
    );
    fireEvent.click(screen.getByRole('button', { name: 'Back to Home' }));
    expect(screen.getByTestId('loc')).toHaveTextContent('/buyer/home');
  });
});

// BL-84 (WCAG 3.1.2): the 404 title was an English literal in BOTH locales.
describe('NotFound — the title follows the locale', () => {
  it('EN: "Page not found" is the page heading', () => {
    renderWithProviders(<NotFound />);
    expect(screen.getByRole('heading', { level: 1, name: 'Page not found' })).toBeInTheDocument();
  });

  it('ID: "Halaman tidak ditemukan", and no English title survives', async () => {
    await act(async () => {
      await i18n.changeLanguage('id');
    });
    renderWithProviders(<NotFound />);
    expect(
      screen.getByRole('heading', { level: 1, name: 'Halaman tidak ditemukan' })
    ).toBeInTheDocument();
    expect(screen.getByText('404 — Tidak ditemukan')).toBeInTheDocument();
    expect(screen.queryByText('Page not found')).not.toBeInTheDocument();
  });
});
