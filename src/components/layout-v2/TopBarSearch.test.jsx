import { describe, it, expect, afterEach, beforeEach, vi } from 'vitest';
import { screen, fireEvent, act, within } from '@testing-library/react';
import { useLocation } from 'react-router-dom';
import { renderWithProviders, SUPPLIER } from '@test/test-utils';
import { getHubRole, setHubRole } from './hubRole';
import TopBarSearch, { SEARCH_DEBOUNCE_MS } from './TopBarSearch';

const LocationProbe = () => {
  const location = useLocation();
  return <div data-testid="location">{location.pathname}</div>;
};

/** @param {import('@context/CurrentIdentityContext').CurrentIdentity} [identity] */
function renderSearch(identity) {
  renderWithProviders(
    <>
      <TopBarSearch />
      <button type="button">outside</button>
      <LocationProbe />
    </>,
    { route: '/buyer/home', ...(identity ? { identity } : {}) }
  );
  return /** @type {HTMLInputElement} */ (
    screen.getByRole('combobox', { name: 'Search the portal' })
  );
}

/** @param {HTMLInputElement} input @param {string} text */
function type(input, text) {
  fireEvent.change(input, { target: { value: text } });
  act(() => {
    vi.advanceTimersByTime(SEARCH_DEBOUNCE_MS);
  });
}

const optionLabels = () => screen.queryAllByRole('option').map((o) => o.textContent);

/** @type {import('./hubRole').HubRole} */
let savedRole;
beforeEach(() => {
  vi.useFakeTimers();
  savedRole = getHubRole();
  setHubRole('ALL');
});
afterEach(() => {
  vi.useRealTimers();
  setHubRole(savedRole);
});

describe('TopBarSearch — the dropdown', () => {
  it('keeps the placeholder and shows no list before anything is typed', () => {
    const input = renderSearch();
    expect(input).toHaveAttribute('placeholder', 'Search... (Ctrl K)');
    expect(input).toHaveAttribute('type', 'search');
    expect(input).toHaveAttribute('aria-expanded', 'false');
    expect(screen.queryByRole('listbox')).toBeNull();
  });

  it('waits for the debounce before filtering', () => {
    const input = renderSearch();
    fireEvent.change(input, { target: { value: 'supplier' } });
    expect(screen.queryByRole('listbox')).toBeNull();
    act(() => {
      vi.advanceTimersByTime(SEARCH_DEBOUNCE_MS);
    });
    expect(screen.getByRole('listbox')).toBeInTheDocument();
  });

  it('lists every match grouped under its menu section, with the match marked', () => {
    const input = renderSearch();
    type(input, 'supplier');
    expect(input).toHaveAttribute('aria-expanded', 'true');
    expect(input).toHaveAttribute('aria-controls', screen.getByRole('listbox').id);

    const home = screen.getByRole('group', { name: 'Home' });
    expect(
      within(home)
        .getAllByRole('option')
        .map((o) => o.textContent)
    ).toEqual(['Supplier replies']);
    const sourcing = screen.getByRole('group', { name: 'Sourcing' });
    expect(within(sourcing).getByRole('option', { name: 'Suppliers' })).toBeInTheDocument();
    expect(screen.getByRole('group', { name: 'Help & administration' })).toBeInTheDocument();

    const mark = within(screen.getByRole('option', { name: 'Supplier replies' })).getByText(
      'Supplier'
    );
    expect(mark.tagName).toBe('MARK');
    expect(optionLabels()).not.toContain('Purchase orders');
  });

  it('shows a no-results message, not an empty list, when nothing matches', () => {
    const input = renderSearch();
    type(input, 'zzqx');
    expect(screen.queryByRole('listbox')).toBeNull();
    expect(input).toHaveAttribute('aria-expanded', 'false');
    expect(screen.getByRole('status')).toHaveTextContent('No pages match “zzqx”');
  });

  it('scrolls a long list inside a fixed height instead of growing', () => {
    const input = renderSearch();
    type(input, 'e');
    expect(screen.getAllByRole('option').length).toBeGreaterThan(8);
    expect(screen.getByRole('listbox')).toHaveClass('max-h-80', 'overflow-y-auto');
  });

  it('below `sm` spans the viewport under the header; from `sm` hangs from the input, at least 20rem wide', () => {
    const input = renderSearch();
    type(input, 'supplier');
    const popup = /** @type {HTMLElement} */ (screen.getByRole('listbox').parentElement);
    expect(popup).toHaveClass('fixed', 'inset-x-4', 'top-14', 'mt-1');
    expect(popup).toHaveClass(
      'sm:absolute',
      'sm:left-auto',
      'sm:right-0',
      'sm:top-full',
      'sm:w-full',
      'sm:min-w-[min(20rem,calc(100vw-2rem))]'
    );
    expect(popup).not.toHaveClass('left-0');
    expect(screen.getByRole('listbox')).toHaveClass('max-h-80', 'overflow-y-auto');
  });

  it('uses 16px text below `sm`, so iOS Safari does not zoom the page when the input is focused', () => {
    // iOS Safari zooms into any focused input whose text is under 16px and
    // keeps the zoom after navigating, which cut off the right edge of the
    // page opened from a result. 14px is kept from `sm` up.
    const input = renderSearch();
    expect(input).toHaveClass('text-base', 'sm:text-sm');
    expect(input).not.toHaveClass('text-sm');
  });

  it('searches the supplier menu for a supplier seat', () => {
    const input = renderSearch(SUPPLIER);
    type(input, 'invitations');
    expect(optionLabels()).toEqual(['RFI invitations', 'RFQ invitations', 'RFP invitations']);
  });
});

describe('TopBarSearch — keyboard', () => {
  it('moves the highlight with the arrow keys and wraps at both ends', () => {
    const input = renderSearch();
    type(input, 'invoice');
    const options = screen.getAllByRole('option');
    expect(options).toHaveLength(1);
    expect(input).not.toHaveAttribute('aria-activedescendant');

    type(input, 'order');
    const all = screen.getAllByRole('option');
    const last = all.length - 1;
    fireEvent.keyDown(input, { key: 'ArrowDown' });
    expect(input).toHaveAttribute('aria-activedescendant', all[0].id);
    expect(all[0]).toHaveAttribute('aria-selected', 'true');
    expect(all[0]).toHaveClass('bg-action-soft');
    expect(all[1]).toHaveAttribute('aria-selected', 'false');

    fireEvent.keyDown(input, { key: 'ArrowUp' });
    expect(input).toHaveAttribute('aria-activedescendant', all[last].id);
    fireEvent.keyDown(input, { key: 'ArrowDown' });
    expect(input).toHaveAttribute('aria-activedescendant', all[0].id);
  });

  it('Enter with nothing highlighted opens the first result and clears the input', () => {
    const input = renderSearch();
    type(input, 'supplier');
    fireEvent.keyDown(input, { key: 'Enter' });
    expect(screen.getByTestId('location')).toHaveTextContent('/buyer/comm-hub');
    expect(input.value).toBe('');
    expect(screen.queryByRole('listbox')).toBeNull();
  });

  it('Enter opens the highlighted result', () => {
    const input = renderSearch();
    type(input, 'supplier');
    fireEvent.keyDown(input, { key: 'ArrowDown' });
    fireEvent.keyDown(input, { key: 'ArrowDown' });
    const second = screen.getAllByRole('option')[1].textContent;
    expect(second).toBe('Publish to suppliers');
    fireEvent.keyDown(input, { key: 'Enter' });
    expect(screen.getByTestId('location')).toHaveTextContent('/buyer/stabilise');
  });

  it('Enter typed faster than the debounce still opens the first match for the typed text', () => {
    const input = renderSearch();
    fireEvent.change(input, { target: { value: 'invoice' } });
    fireEvent.keyDown(input, { key: 'Enter' });
    expect(screen.getByTestId('location')).toHaveTextContent('/buyer/invoices');
  });

  it('Enter with no matches does nothing', () => {
    const input = renderSearch();
    type(input, 'zzqx');
    fireEvent.keyDown(input, { key: 'Enter' });
    expect(screen.getByTestId('location')).toHaveTextContent('/buyer/home');
    expect(input.value).toBe('zzqx');
  });

  it('Escape closes the list and keeps the text; ArrowDown reopens it', () => {
    const input = renderSearch();
    type(input, 'supplier');
    fireEvent.keyDown(input, { key: 'Escape' });
    expect(screen.queryByRole('listbox')).toBeNull();
    expect(input).toHaveAttribute('aria-expanded', 'false');
    expect(input.value).toBe('supplier');
    fireEvent.keyDown(input, { key: 'ArrowDown' });
    expect(screen.getByRole('listbox')).toBeInTheDocument();
  });

  it('Tab closes the list and keeps the text', () => {
    const input = renderSearch();
    type(input, 'supplier');
    fireEvent.keyDown(input, { key: 'Tab' });
    expect(screen.queryByRole('listbox')).toBeNull();
    expect(input).toHaveAttribute('aria-expanded', 'false');
    expect(input.value).toBe('supplier');
  });

  it('closing the list drops its highlight: Enter opens the first match, not the dismissed one', () => {
    const input = renderSearch();
    type(input, 'supplier');
    fireEvent.keyDown(input, { key: 'ArrowDown' });
    fireEvent.keyDown(input, { key: 'ArrowDown' });
    fireEvent.keyDown(input, { key: 'Escape' });
    fireEvent.keyDown(input, { key: 'Enter' });
    expect(screen.getByTestId('location')).toHaveTextContent('/buyer/comm-hub');
  });

  it('a reopened list starts with nothing highlighted', () => {
    const input = renderSearch();
    type(input, 'supplier');
    fireEvent.keyDown(input, { key: 'ArrowDown' });
    fireEvent.keyDown(input, { key: 'ArrowDown' });
    fireEvent.mouseDown(screen.getByRole('button', { name: 'outside' }));
    fireEvent.keyDown(input, { key: 'ArrowDown' });
    expect(screen.getByRole('listbox')).toBeInTheDocument();
    expect(input).not.toHaveAttribute('aria-activedescendant');
  });

  it('Enter that commits an IME composition does not open a page', () => {
    const input = renderSearch();
    type(input, 'supplier');
    fireEvent.keyDown(input, { key: 'Enter', isComposing: true });
    fireEvent.keyDown(input, { key: 'Enter', keyCode: 229 });
    expect(screen.getByTestId('location')).toHaveTextContent('/buyer/home');
    expect(input.value).toBe('supplier');
  });
});

describe('TopBarSearch — announcements', () => {
  it('keeps one polite status region mounted, empty until a filter has run', () => {
    const input = renderSearch();
    const status = screen.getByRole('status');
    expect(status).toHaveAttribute('aria-live', 'polite');
    expect(status).toHaveClass('sr-only');
    expect(status).toHaveTextContent(/^$/);

    fireEvent.change(input, { target: { value: 'invoice' } });
    expect(screen.getByRole('status')).toBe(status);
    expect(status).toHaveTextContent(/^$/);
  });

  it('announces the result count after each debounce, singular and plural', () => {
    const input = renderSearch();
    type(input, 'invoice');
    const status = screen.getByRole('status');
    expect(status).toHaveTextContent(/^1 page$/);
    type(input, 'supplier');
    expect(screen.getByRole('status')).toBe(status);
    expect(status).toHaveTextContent(`${screen.getAllByRole('option').length} pages`);
    type(input, 'zzqx');
    expect(status).toHaveTextContent('No pages match “zzqx”');
    fireEvent.keyDown(input, { key: 'Escape' });
    expect(status).toHaveTextContent(/^$/);
  });
});

describe('TopBarSearch — mouse', () => {
  it('clicking a result opens it and clears the input', () => {
    const input = renderSearch();
    type(input, 'supplier');
    fireEvent.click(screen.getByRole('option', { name: 'Suppliers' }));
    expect(screen.getByTestId('location')).toHaveTextContent('/buyer/suppliers');
    expect(input.value).toBe('');
    expect(screen.queryByRole('listbox')).toBeNull();
  });

  it('pressing on a result does not move focus out of the input', () => {
    const input = renderSearch();
    type(input, 'supplier');
    const notCancelled = fireEvent.mouseDown(screen.getByRole('option', { name: 'Suppliers' }));
    expect(notCancelled).toBe(false);
  });

  it('a click outside closes the list and keeps the text', () => {
    const input = renderSearch();
    type(input, 'supplier');
    fireEvent.mouseDown(screen.getByRole('button', { name: 'outside' }));
    expect(screen.queryByRole('listbox')).toBeNull();
    expect(input.value).toBe('supplier');
    fireEvent.click(input);
    expect(screen.getByRole('listbox')).toBeInTheDocument();
  });

  it('clearing the input closes the list', () => {
    const input = renderSearch();
    type(input, 'supplier');
    type(input, '');
    expect(screen.queryByRole('listbox')).toBeNull();
    expect(screen.queryByText(/No pages match/)).toBeNull();
    expect(screen.getByRole('status')).toHaveTextContent(/^$/);
  });
});

describe('TopBarSearch — Ctrl K shortcut', () => {
  it('Ctrl K from elsewhere on the page focuses the input and selects its text', () => {
    const input = renderSearch();
    type(input, 'supplier');
    const outside = screen.getByRole('button', { name: 'outside' });
    outside.focus();
    const event = new KeyboardEvent('keydown', {
      key: 'k',
      ctrlKey: true,
      bubbles: true,
      cancelable: true
    });
    act(() => {
      outside.dispatchEvent(event);
    });
    expect(event.defaultPrevented).toBe(true);
    expect(input).toHaveFocus();
    expect([input.selectionStart, input.selectionEnd]).toEqual([0, 'supplier'.length]);
  });

  it('⌘ K does the same, and an upper-case K counts', () => {
    const input = renderSearch();
    fireEvent.keyDown(document.body, { key: 'K', metaKey: true });
    expect(input).toHaveFocus();
  });

  it('K alone, or with Shift or Alt, does not move focus', () => {
    const input = renderSearch();
    const outside = screen.getByRole('button', { name: 'outside' });
    outside.focus();
    fireEvent.keyDown(outside, { key: 'k' });
    fireEvent.keyDown(outside, { key: 'k', ctrlKey: true, shiftKey: true });
    fireEvent.keyDown(outside, { key: 'k', ctrlKey: true, altKey: true });
    expect(input).not.toHaveFocus();
    expect(outside).toHaveFocus();
  });

  it('does nothing while a modal dialog is open, so focus stays in the dialog', () => {
    renderWithProviders(
      <>
        <TopBarSearch />
        <div role="dialog" aria-modal="true" aria-label="Confirm">
          <button type="button">inside</button>
        </div>
      </>,
      { route: '/buyer/home' }
    );
    const inside = screen.getByRole('button', { name: 'inside' });
    inside.focus();
    fireEvent.keyDown(inside, { key: 'k', ctrlKey: true });
    expect(inside).toHaveFocus();
  });

  it('stops listening once unmounted', () => {
    const { unmount } = renderWithProviders(<TopBarSearch />, { route: '/buyer/home' });
    unmount();
    const event = new KeyboardEvent('keydown', {
      key: 'k',
      ctrlKey: true,
      bubbles: true,
      cancelable: true
    });
    document.body.dispatchEvent(event);
    // Nothing claimed the key, so the browser keeps its own Ctrl K.
    expect(event.defaultPrevented).toBe(false);
  });
});
