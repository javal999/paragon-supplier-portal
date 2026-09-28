// ────────────────────────────────────────────────────────────────────────────
// SelectField — the shared standard/combobox select primitive. The rule this
// component exists to satisfy: >10 options → searchable combobox, ≤10 →
// plain native <select>, re-decided from `options.length` on every render so
// a data set that grows or shrinks across the threshold switches on its own
// (no caller-side branching). See src/components/ui-v2/SelectField.tsx.
//
// The combobox has ONE control, not a button that opens a panel containing a
// second search box: the same field is unwritable while ≤10 (a native
// <select>) and becomes a writable filter the moment it's opened while >10
// (an <input role="combobox">). Tests below query that single element by its
// `combobox` role once past the threshold — there is no separate trigger.
// ────────────────────────────────────────────────────────────────────────────

import React, { useState } from 'react';
import { describe, it, expect, afterEach, vi } from 'vitest';
import { render, screen, fireEvent, cleanup, within, act } from '@testing-library/react';
import { I18nextProvider } from 'react-i18next';
import i18n from '../../lib/i18n';
import SelectField, { type SelectOption } from './SelectField';
import SidePanel from './SidePanel';
import { pickSelectFieldOption } from '../../test/test-utils';

function renderField(node: React.ReactNode) {
  return render(<I18nextProvider i18n={i18n}>{node}</I18nextProvider>);
}

afterEach(async () => {
  cleanup();
  await i18n.changeLanguage('en');
});

const smallOptions: SelectOption[] = [
  { value: 'a', label: 'Alpha' },
  { value: 'b', label: 'Bravo' },
  { value: 'c', label: 'Charlie' },
];

function bigOptions(n: number): SelectOption[] {
  return Array.from({ length: n }, (_, i) => ({ value: `v${i}`, label: `Option ${i}` }));
}

describe('SelectField — mode is decided by option count, not by the caller', () => {
  it('renders a plain <select> for ≤10 options — not writable', () => {
    const { container } = renderField(
      <SelectField options={smallOptions} value={null} onChange={() => {}} placeholder="Pick one" />,
    );
    // A native <select> is itself exposed with an implicit role of
    // "combobox" (html-aam) — the thing that actually distinguishes "not
    // writable" is the tag, not the accessibility role, plus the absence of
    // any popup listbox.
    const select = container.querySelector('select');
    expect(select).toBeInTheDocument();
    expect(container.querySelector('input')).not.toBeInTheDocument();
    expect(screen.queryByRole('listbox')).not.toBeInTheDocument();
  });

  it('renders a writable combobox input for >10 options', () => {
    renderField(<SelectField options={bigOptions(12)} value={null} onChange={() => {}} placeholder="Pick one" />);
    const field = screen.getByRole('combobox');
    expect(field.tagName).toBe('INPUT');
    expect(document.querySelector('select')).not.toBeInTheDocument();
  });

  it('the threshold is configurable via comboboxThreshold', () => {
    const { container } = renderField(
      <SelectField options={bigOptions(12)} value={null} onChange={() => {}} comboboxThreshold={15} placeholder="Pick one" />,
    );
    expect(container.querySelector('select')).toBeInTheDocument();
  });

  it('switches mode live when the same instance receives more options than the threshold', () => {
    const Harness: React.FC = () => {
      const [opts, setOpts] = useState(smallOptions);
      return (
        <>
          <button type="button" onClick={() => setOpts(bigOptions(11))}>
            grow
          </button>
          <SelectField options={opts} value={null} onChange={() => {}} placeholder="Pick one" />
        </>
      );
    };
    const { container } = renderField(<Harness />);
    expect(container.querySelector('select')).toBeInTheDocument();
    fireEvent.click(screen.getByText('grow'));
    expect(container.querySelector('select')).not.toBeInTheDocument();
    expect(screen.getByRole('combobox')).toBeInTheDocument();
  });
});

describe('SelectField — edge cases', () => {
  it('empty option list shows a clear empty state, standard or combobox alike', () => {
    renderField(<SelectField options={[]} value={null} onChange={() => {}} ariaLabel="Pick one" />);
    const btn = screen.getByRole('button', { name: 'Pick one' });
    expect(btn).toBeDisabled();
    expect(btn).toHaveTextContent('No options available');
  });

  it('loading state shows a loading indicator regardless of option count', () => {
    renderField(<SelectField options={bigOptions(20)} value={null} onChange={() => {}} loading ariaLabel="Pick one" />);
    expect(screen.getByText('Loading options…')).toBeInTheDocument();
  });

  it('an unavailable selected value gets a clear fallback in standard mode', () => {
    const { container } = renderField(
      <SelectField options={smallOptions} value="ghost" onChange={() => {}} placeholder="Pick one" />,
    );
    const select = container.querySelector('select') as HTMLSelectElement;
    expect(select.selectedOptions[0]).toHaveTextContent('Unavailable: ghost');
  });

  it('an unavailable selected value gets a clear fallback in combobox mode, while closed', () => {
    renderField(<SelectField options={bigOptions(12)} value="ghost" onChange={() => {}} placeholder="Pick one" />);
    expect(screen.getByRole('combobox')).toHaveValue('Unavailable: ghost');
  });

  it('long labels carry a title attribute for full-value accessibility (combobox, closed)', () => {
    const long = 'A'.repeat(120);
    renderField(
      <SelectField
        options={[{ value: 'x', label: long }, ...bigOptions(11)]}
        value="x"
        onChange={() => {}}
        placeholder="Pick one"
      />,
    );
    expect(screen.getByRole('combobox')).toHaveAttribute('title', long);
  });

  it('duplicate labels are disambiguated via the description line', () => {
    // Not a real corporate name on purpose — a `label:` value in this shape
    // reads to src/data/thirdPartyIdentifiers.test.ts as a material identity,
    // which flags any corporate legal form found there. This is a generic UI
    // fixture, not a material/supplier registry entry, so it stays generic.
    const dupes: SelectOption[] = [
      { value: 's1', label: 'Sample Duplicate Entry', description: 'sup-001 · Jakarta' },
      { value: 's2', label: 'Sample Duplicate Entry', description: 'sup-002 · Surabaya' },
      ...bigOptions(10),
    ];
    renderField(<SelectField options={dupes} value={null} onChange={() => {}} placeholder="Pick supplier" />);
    fireEvent.click(screen.getByRole('combobox'));
    expect(screen.getByText('sup-001 · Jakarta')).toBeInTheDocument();
    expect(screen.getByText('sup-002 · Surabaya')).toBeInTheDocument();
  });
});

describe('SelectField — the field itself becomes writable only past the threshold', () => {
  it('closed, the combobox input still rejects typing being the point: it opens instead and starts a fresh filter', () => {
    renderField(<SelectField options={bigOptions(20)} value={null} onChange={() => {}} placeholder="Pick one" />);
    const field = screen.getByRole('combobox');
    expect(screen.queryByRole('listbox')).not.toBeInTheDocument();
    fireEvent.change(field, { target: { value: 'Option 3' } });
    // Typing directly (no prior click) still opens it — same field either way.
    expect(screen.getByRole('listbox')).toBeInTheDocument();
    expect(field).toHaveValue('Option 3');
  });

  it('opening (click, no typing yet) shows the full list — browsing by scroll, not just search', () => {
    renderField(<SelectField options={bigOptions(20)} value="v5" onChange={() => {}} placeholder="Pick one" />);
    const field = screen.getByRole('combobox');
    expect(field).toHaveValue('Option 5');
    fireEvent.click(field);
    // Clearing to a blank, fully-browsable list is deliberate — the prior
    // selection reappears once the panel closes again (see the next test).
    expect(field).toHaveValue('');
    expect(within(screen.getByRole('listbox')).getAllByRole('option')).toHaveLength(20);
  });

  it('closing without picking anything restores the prior selection as plain display text', () => {
    renderField(<SelectField options={bigOptions(20)} value="v5" onChange={() => {}} placeholder="Pick one" />);
    const field = screen.getByRole('combobox');
    fireEvent.click(field);
    fireEvent.change(field, { target: { value: 'garbage query' } });
    fireEvent.keyDown(field, { key: 'Escape' });
    expect(field).toHaveValue('Option 5');
  });
});

describe('SelectField — combobox search, highlighting, keyboard nav', () => {
  it('typing filters the list and highlights the matched substring', () => {
    renderField(<SelectField options={bigOptions(20)} value={null} onChange={() => {}} placeholder="Pick one" />);
    const field = screen.getByRole('combobox');
    fireEvent.click(field);
    fireEvent.change(field, { target: { value: 'Option 1' } });

    const listbox = screen.getByRole('listbox');
    const rows = within(listbox).getAllByRole('option');
    // "Option 1", "Option 10".."Option 19" all match — "Option 2".."9" do not.
    expect(rows.length).toBe(11);
    const mark = within(listbox).getAllByText('Option 1')[0].closest('li')!.querySelector('mark');
    expect(mark).toHaveTextContent('Option 1');
  });

  it('no matches shows the no-results state with guidance, distinct from the empty-list state', () => {
    renderField(<SelectField options={bigOptions(20)} value={null} onChange={() => {}} placeholder="Pick one" />);
    const field = screen.getByRole('combobox');
    fireEvent.click(field);
    fireEvent.change(field, { target: { value: 'zzz-nope' } });
    expect(screen.getByText('No matching results')).toBeInTheDocument();
    expect(screen.getByText('Try a different search term.')).toBeInTheDocument();
  });

  it('opening pre-highlights the first row; Enter alone selects it', () => {
    const onChange = vi.fn();
    renderField(<SelectField options={bigOptions(12)} value={null} onChange={onChange} placeholder="Pick one" />);
    const field = screen.getByRole('combobox');
    fireEvent.click(field);
    fireEvent.keyDown(field, { key: 'Enter' });
    expect(onChange).toHaveBeenCalledWith('v0');
    expect(screen.queryByRole('listbox')).not.toBeInTheDocument();
  });

  it('ArrowDown moves the highlight forward; Enter then selects that row', () => {
    const onChange = vi.fn();
    renderField(<SelectField options={bigOptions(12)} value={null} onChange={onChange} placeholder="Pick one" />);
    const field = screen.getByRole('combobox');
    fireEvent.click(field);
    fireEvent.keyDown(field, { key: 'ArrowDown' });
    fireEvent.keyDown(field, { key: 'Enter' });
    expect(onChange).toHaveBeenCalledWith('v1');
    expect(screen.queryByRole('listbox')).not.toBeInTheDocument();
  });

  it('ArrowDown while closed opens it too (keyboard parity with a native <select>)', () => {
    renderField(<SelectField options={bigOptions(12)} value={null} onChange={() => {}} placeholder="Pick one" />);
    const field = screen.getByRole('combobox');
    fireEvent.keyDown(field, { key: 'ArrowDown' });
    expect(screen.getByRole('listbox')).toBeInTheDocument();
  });

  it('Escape closes without changing the value and leaves focus on the field', () => {
    const onChange = vi.fn();
    renderField(<SelectField options={bigOptions(12)} value="v3" onChange={onChange} placeholder="Pick one" />);
    const field = screen.getByRole('combobox');
    fireEvent.click(field);
    fireEvent.keyDown(field, { key: 'Escape' });
    expect(onChange).not.toHaveBeenCalled();
    expect(screen.queryByRole('listbox')).not.toBeInTheDocument();
    expect(document.activeElement).toBe(field);
  });

  it('clicking a row selects it', () => {
    const onChange = vi.fn();
    renderField(<SelectField options={bigOptions(12)} value={null} onChange={onChange} placeholder="Pick one" />);
    fireEvent.click(screen.getByRole('combobox'));
    fireEvent.click(screen.getByText('Option 4'));
    expect(onChange).toHaveBeenCalledWith('v4');
  });
});

describe('SelectField — the panel always opens below the trigger, height-capped to the viewport', () => {
  it('uses its full max height when there is plenty of room below', () => {
    renderField(<SelectField options={bigOptions(20)} value={null} onChange={() => {}} placeholder="Pick one" />);
    const field = screen.getByRole('combobox');
    field.getBoundingClientRect = () =>
      ({ top: 100, bottom: 140, left: 0, right: 200, width: 200, height: 40, x: 0, y: 100 }) as DOMRect;
    fireEvent.click(field);
    const listbox = screen.getByRole('listbox');
    const panel = listbox.parentElement as HTMLElement;
    expect(panel.style.top).toBe('144px'); // rect.bottom + 4
    expect(parseInt(listbox.style.maxHeight, 10)).toBe(288);
  });

  it('never flips above the trigger — it shrinks instead, stopping 24px short of the viewport bottom', () => {
    renderField(<SelectField options={bigOptions(20)} value={null} onChange={() => {}} placeholder="Pick one" />);
    const field = screen.getByRole('combobox');
    // Room below is well under the 288px ceiling but well over the 120px
    // floor, so the 24px-margin math is what's under test here (not the
    // floor — that's the next test).
    const bottom = window.innerHeight - 268;
    field.getBoundingClientRect = () =>
      ({ top: bottom - 40, bottom, left: 0, right: 200, width: 200, height: 40, x: 0, y: bottom - 40 }) as DOMRect;
    fireEvent.click(field);
    const listbox = screen.getByRole('listbox');
    const panel = listbox.parentElement as HTMLElement;
    // Still below, never a `bottom`-anchored flip.
    expect(panel.style.top).toBe(`${bottom + 4}px`);
    expect(panel.style.bottom).toBe('');
    // Bottom edge of the panel = top + maxHeight, and it must land exactly
    // 24px above the viewport edge — not flush with it, not further off.
    const maxHeight = parseInt(listbox.style.maxHeight, 10);
    expect(bottom + 4 + maxHeight).toBe(window.innerHeight - 24);
  });

  it('never shrinks below a usable floor, even with almost no room at all', () => {
    renderField(<SelectField options={bigOptions(20)} value={null} onChange={() => {}} placeholder="Pick one" />);
    const field = screen.getByRole('combobox');
    // 10px of room below — nowhere near enough even for the margin.
    const bottom = window.innerHeight - 10;
    field.getBoundingClientRect = () =>
      ({ top: bottom - 40, bottom, left: 0, right: 200, width: 200, height: 40, x: 0, y: bottom - 40 }) as DOMRect;
    fireEvent.click(field);
    const listbox = screen.getByRole('listbox');
    expect(parseInt(listbox.style.maxHeight, 10)).toBe(120);
  });
});

describe('SelectField — large datasets are windowed', () => {
  it('renders far fewer option rows than exist once past the virtualize threshold', () => {
    renderField(
      <SelectField options={bigOptions(500)} value={null} onChange={() => {}} placeholder="Pick one" virtualizeThreshold={50} />,
    );
    fireEvent.click(screen.getByRole('combobox'));
    const rows = screen.getAllByRole('option');
    expect(rows.length).toBeGreaterThan(0);
    expect(rows.length).toBeLessThan(500);
  });
});

describe('SelectField — i18n', () => {
  it('localizes the empty and no-results strings', async () => {
    await i18n.changeLanguage('id');
    const { unmount } = renderField(<SelectField options={[]} value={null} onChange={() => {}} ariaLabel="Pilih" />);
    expect(screen.getByText('Tidak ada opsi tersedia')).toBeInTheDocument();
    unmount();

    renderField(<SelectField options={bigOptions(20)} value={null} onChange={() => {}} placeholder="Pilih" />);
    const field = screen.getByRole('combobox');
    fireEvent.click(field);
    fireEvent.change(field, { target: { value: 'zzz' } });
    expect(screen.getByText('Tidak ada hasil yang cocok')).toBeInTheDocument();
  });
});

describe('SelectField — accessible name comes from the visible <label>, not the placeholder', () => {
  it('combobox mode: no aria-label unless ariaLabel is passed, so <label htmlFor> names it', () => {
    renderField(
      <>
        <label htmlFor="who">Whose conversation is this?</label>
        <SelectField id="who" options={bigOptions(12)} value={null} onChange={() => {}} placeholder="Select the supplier…" />
      </>,
    );
    const field = screen.getByRole('combobox', { name: 'Whose conversation is this?' });
    expect(field).not.toHaveAttribute('aria-label');
  });

  it('combobox mode: an explicit ariaLabel is still honoured', () => {
    renderField(<SelectField options={bigOptions(12)} value={null} onChange={() => {}} ariaLabel="Supplier" />);
    expect(screen.getByRole('combobox', { name: 'Supplier' })).toHaveAttribute('aria-label', 'Supplier');
  });
});

describe('SelectField — clearable', () => {
  it('combobox mode: a set value shows a clear (✕) button instead of the chevron; clicking it emits null', () => {
    const onChange = vi.fn();
    renderField(
      <SelectField options={bigOptions(12)} value="v3" onChange={onChange} placeholder="Pick one" clearable testId="f" />,
    );
    fireEvent.click(screen.getByRole('button', { name: 'Clear selection' }));
    expect(onChange).toHaveBeenCalledWith(null);
    expect(screen.queryByRole('listbox')).not.toBeInTheDocument();
  });

  it('combobox mode: an empty value shows the chevron, no clear button', () => {
    renderField(<SelectField options={bigOptions(12)} value={null} onChange={() => {}} placeholder="Pick one" clearable />);
    expect(screen.queryByRole('button', { name: 'Clear selection' })).not.toBeInTheDocument();
  });

  it('combobox mode: not clearable → no clear button even with a value', () => {
    renderField(<SelectField options={bigOptions(12)} value="v3" onChange={() => {}} placeholder="Pick one" />);
    expect(screen.queryByRole('button', { name: 'Clear selection' })).not.toBeInTheDocument();
  });

  it('standard mode: the placeholder option stays selectable once a value is set', () => {
    const onChange = vi.fn();
    const { container } = renderField(
      <SelectField options={smallOptions} value="b" onChange={onChange} placeholder="Pick one" clearable />,
    );
    const select = container.querySelector('select') as HTMLSelectElement;
    const placeholderOpt = within(select).getByText('Pick one') as HTMLOptionElement;
    expect(placeholderOpt.disabled).toBe(false);
    fireEvent.change(select, { target: { value: '' } });
    expect(onChange).toHaveBeenCalledWith(null);
  });
});

describe('SelectField — typed text never binds', () => {
  const setup = () => {
    const onChange = vi.fn();
    renderField(
      <>
        <SelectField options={bigOptions(20)} value={null} onChange={onChange} placeholder="Pick one" />
        <button type="button">elsewhere</button>
      </>,
    );
    const field = screen.getByRole('combobox');
    fireEvent.click(field);
    fireEvent.change(field, { target: { value: 'Option 3' } });
    return { onChange, field };
  };

  it('leaving via Escape does not call onChange', () => {
    const { onChange, field } = setup();
    fireEvent.keyDown(field, { key: 'Escape' });
    expect(onChange).not.toHaveBeenCalled();
  });

  it('leaving via Tab does not call onChange', () => {
    const { onChange, field } = setup();
    fireEvent.keyDown(field, { key: 'Tab' });
    fireEvent.blur(field);
    expect(onChange).not.toHaveBeenCalled();
    expect(screen.queryByRole('listbox')).not.toBeInTheDocument();
  });

  it('leaving via an outside mousedown does not call onChange', () => {
    const { onChange } = setup();
    fireEvent.mouseDown(screen.getByText('elsewhere'));
    expect(onChange).not.toHaveBeenCalled();
    expect(screen.queryByRole('listbox')).not.toBeInTheDocument();
  });
});

describe('SelectField — inside a SidePanel', () => {
  it('Escape closes only the list, not the enclosing drawer', () => {
    const onClose = vi.fn();
    renderField(
      <SidePanel open onClose={onClose} title="Drawer">
        <SelectField options={bigOptions(12)} value={null} onChange={() => {}} ariaLabel="Pick one" />
      </SidePanel>,
    );
    const field = screen.getByRole('combobox');
    fireEvent.click(field);
    expect(screen.getByRole('listbox')).toBeInTheDocument();
    fireEvent.keyDown(field, { key: 'Escape' });
    expect(screen.queryByRole('listbox')).not.toBeInTheDocument();
    expect(onClose).not.toHaveBeenCalled();
    // With the list already closed, Escape reaches the drawer as before.
    fireEvent.keyDown(field, { key: 'Escape' });
    expect(onClose).toHaveBeenCalledTimes(1);
  });
});

describe('SelectField — scroll state across open/close', () => {
  it('reopening after a deep scroll windows from the top, not from the stale offset', () => {
    renderField(
      <SelectField options={bigOptions(500)} value={null} onChange={() => {}} placeholder="Pick one" virtualizeThreshold={50} />,
    );
    const field = screen.getByRole('combobox');
    fireEvent.click(field);
    const listbox = screen.getByRole('listbox');
    listbox.scrollTop = 400 * 36;
    fireEvent.scroll(listbox);
    expect(within(listbox).queryByText('Option 0')).not.toBeInTheDocument();
    fireEvent.keyDown(field, { key: 'Escape' });
    fireEvent.click(field);
    expect(within(screen.getByRole('listbox')).getByText('Option 0')).toBeInTheDocument();
  });

  it('a preselected row is scrolled into view on the FIRST open', () => {
    renderField(<SelectField options={bigOptions(40)} value="v20" onChange={() => {}} placeholder="Pick one" />);
    fireEvent.click(screen.getByRole('combobox'));
    expect(screen.getByRole('listbox').scrollTop).toBeGreaterThan(0);
  });
});

describe('SelectField — form participation', () => {
  it('combobox mode submits `name` through a hidden input', () => {
    const { container } = renderField(
      <form>
        <SelectField options={bigOptions(12)} value="v7" onChange={() => {}} placeholder="Pick one" name="choice" />
      </form>,
    );
    const form = container.querySelector('form') as HTMLFormElement;
    expect(new FormData(form).get('choice')).toBe('v7');
  });
});

// Review F7: `onSearch` has no caller in the app yet, so these fake-timer
// specs are its ONLY evidence. They pin WHEN it fires, not how a real server
// consumer behaves with it — see the limitation noted on the prop.
describe('SelectField — onSearch fires only for a query the user typed while open', () => {
  afterEach(() => {
    vi.useRealTimers();
  });

  const renderSearchable = (onSearch: (q: string) => void) =>
    renderField(<SelectField options={bigOptions(20)} value={null} onChange={() => {}} placeholder="Pick one" onSearch={onSearch} />);

  it('never fires on mount', () => {
    vi.useFakeTimers();
    const onSearch = vi.fn();
    renderSearchable(onSearch);
    act(() => vi.advanceTimersByTime(1000));
    expect(onSearch).not.toHaveBeenCalled();
  });

  it('never fires for an open and close with nothing typed', () => {
    vi.useFakeTimers();
    const onSearch = vi.fn();
    renderSearchable(onSearch);
    const field = screen.getByRole('combobox');
    fireEvent.click(field);
    act(() => vi.advanceTimersByTime(1000));
    fireEvent.keyDown(field, { key: 'Escape' });
    act(() => vi.advanceTimersByTime(1000));
    expect(onSearch).not.toHaveBeenCalled();
  });

  it('fires once, debounced, with the typed query — and not again on close', () => {
    vi.useFakeTimers();
    const onSearch = vi.fn();
    renderSearchable(onSearch);
    const field = screen.getByRole('combobox');
    fireEvent.click(field);
    fireEvent.change(field, { target: { value: 'abc' } });
    act(() => vi.advanceTimersByTime(299));
    expect(onSearch).not.toHaveBeenCalled();
    act(() => vi.advanceTimersByTime(1));
    expect(onSearch).toHaveBeenCalledTimes(1);
    expect(onSearch).toHaveBeenCalledWith('abc');
    fireEvent.keyDown(field, { key: 'Escape' });
    act(() => vi.advanceTimersByTime(1000));
    expect(onSearch).toHaveBeenCalledTimes(1);
  });

  it('clearing a typed query back to blank while open fires "" so the consumer can restore its page', () => {
    vi.useFakeTimers();
    const onSearch = vi.fn();
    renderSearchable(onSearch);
    const field = screen.getByRole('combobox');
    fireEvent.click(field);
    fireEvent.change(field, { target: { value: 'abc' } });
    act(() => vi.advanceTimersByTime(300));
    fireEvent.change(field, { target: { value: '' } });
    act(() => vi.advanceTimersByTime(300));
    expect(onSearch).toHaveBeenLastCalledWith('');
    expect(onSearch).toHaveBeenCalledTimes(2);
  });
});

describe('SelectField — review round 2 (G1–G5)', () => {
  it('G1: re-picking the current value does not call onChange (a native <select> never does)', () => {
    const onChange = vi.fn();
    renderField(<SelectField options={bigOptions(12)} value="v3" onChange={onChange} placeholder="Pick one" />);
    const field = screen.getByRole('combobox');
    fireEvent.click(field);
    fireEvent.keyDown(field, { key: 'Enter' }); // the highlight opens on the current value
    expect(onChange).not.toHaveBeenCalled();
    expect(screen.queryByRole('listbox')).not.toBeInTheDocument();
    fireEvent.click(field);
    fireEvent.click(screen.getByText('Option 3'));
    expect(onChange).not.toHaveBeenCalled();
  });

  it('G2: typing then Enter commits the FIRST match, not the row at the old highlight index', () => {
    const onChange = vi.fn();
    renderField(<SelectField options={bigOptions(20)} value="v5" onChange={onChange} placeholder="Pick one" />);
    const field = screen.getByRole('combobox');
    fireEvent.click(field);
    fireEvent.change(field, { target: { value: 'Option 1' } });
    fireEvent.keyDown(field, { key: 'Enter' });
    expect(onChange).toHaveBeenCalledWith('v1');
  });

  it('G3: with onSearch, a small result page stays a combobox and the query stays editable', () => {
    const { container, rerender } = renderField(
      <SelectField options={bigOptions(3)} value={null} onChange={() => {}} placeholder="Pick one" onSearch={() => {}} />,
    );
    expect(container.querySelector('select')).not.toBeInTheDocument();
    const field = screen.getByRole('combobox');
    expect(field.tagName).toBe('INPUT');
    fireEvent.click(field);
    fireEvent.change(field, { target: { value: 'zzz' } });
    // An empty page is "no results" inside the open list, not the disabled empty state.
    rerender(
      <I18nextProvider i18n={i18n}>
        <SelectField options={[]} value={null} onChange={() => {}} placeholder="Pick one" onSearch={() => {}} />
      </I18nextProvider>,
    );
    expect(screen.getByRole('combobox')).toHaveValue('zzz');
    expect(screen.getByText('No matching results')).toBeInTheDocument();
    expect(screen.queryByText('No options available')).not.toBeInTheDocument();
  });

  it('G4: a failed read states the failure and offers retry — never "No options available"', () => {
    const onRetry = vi.fn();
    renderField(<SelectField options={[]} value={null} onChange={() => {}} ariaLabel="Pick one" error onRetry={onRetry} />);
    expect(screen.getByRole('alert')).toHaveTextContent('Couldn’t load options');
    expect(screen.queryByText('No options available')).not.toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Retry' }));
    expect(onRetry).toHaveBeenCalledTimes(1);
  });

  it('G5: the test helper refuses a value with no option on the <select> path', async () => {
    const onChange = vi.fn();
    const Controlled: React.FC = () => {
      const [v, setV] = useState<string | null>(null);
      return (
        <SelectField
          options={smallOptions}
          value={v}
          onChange={(next) => {
            onChange(next);
            setV(next);
          }}
          placeholder="Pick one"
          testId="small"
        />
      );
    };
    renderField(<Controlled />);
    await expect(pickSelectFieldOption('small', 'no-such-value')).rejects.toThrow(/no option with value/);
    expect(onChange).not.toHaveBeenCalled();
    await pickSelectFieldOption('small', 'b');
    expect(onChange).toHaveBeenCalledWith('b');
  });
});

describe('SelectField — type contract (checked by tsc, not at runtime)', () => {
  it('refuses a threshold with onSearch; accepts null and a real "" option', () => {
    // Each @ts-expect-error below MUST be an error, or `tsc -p tsconfig.vitest.json`
    // fails — that is the probe that the union really rejects these.
    const rejected = [
      // @ts-expect-error — a threshold means nothing when options are a search page (G3)
      <SelectField key="a" options={[]} value={null} onChange={() => {}} onSearch={() => {}} comboboxThreshold={5} />,
      // @ts-expect-error — "nothing selected" is null now, so onChange must accept it
      <SelectField key="b" options={[]} value={null} onChange={(v: string) => v} />,
    ];
    const accepted = [
      <SelectField key="c" options={[{ value: '', label: 'None of these' }]} value="" onChange={() => {}} />,
      <SelectField key="d" options={[]} value={null} onChange={(v: string | null) => v} onSearch={() => {}} />,
    ];
    expect(rejected).toHaveLength(2);
    expect(accepted).toHaveLength(2);
  });
});

describe('SelectField — "" is an ordinary option, null is "nothing selected"', () => {
  const withEmpty: SelectOption[] = [{ value: '', label: 'None of these' }, ...smallOptions];

  it('standard mode: null shows the placeholder; "" selects the real "" option', () => {
    const { container, rerender } = renderField(
      <SelectField options={withEmpty} value={null} onChange={() => {}} placeholder="Pick one" />,
    );
    const select = () => container.querySelector('select') as HTMLSelectElement;
    expect(select().selectedOptions[0]).toHaveTextContent('Pick one');
    rerender(
      <I18nextProvider i18n={i18n}>
        <SelectField options={withEmpty} value="" onChange={() => {}} placeholder="Pick one" />
      </I18nextProvider>,
    );
    expect(select().selectedOptions[0]).toHaveTextContent('None of these');
    expect(screen.queryByText(/Unavailable/)).not.toBeInTheDocument();
  });

  it('standard mode: picking the "" option emits "", never null', () => {
    const onChange = vi.fn();
    const { container } = renderField(
      <SelectField options={withEmpty} value={null} onChange={onChange} placeholder="Pick one" />,
    );
    const select = container.querySelector('select') as HTMLSelectElement;
    const emptyOpt = select.querySelector('option[data-value=""]') as HTMLOptionElement;
    fireEvent.change(select, { target: { value: emptyOpt.value } });
    expect(onChange).toHaveBeenCalledWith('');
  });

  it('combobox mode: the "" option is shown as selected, not as "Unavailable"', () => {
    renderField(
      <SelectField options={[{ value: '', label: 'None of these' }, ...bigOptions(12)]} value="" onChange={() => {}} />,
    );
    expect(screen.getByRole('combobox')).toHaveValue('None of these');
  });

  it('standard mode submits the real value (not the index) under `name`', () => {
    const { container } = renderField(
      <form>
        <SelectField options={smallOptions} value="c" onChange={() => {}} name="choice" />
      </form>,
    );
    expect(new FormData(container.querySelector('form') as HTMLFormElement).get('choice')).toBe('c');
  });
});

describe('SelectField — global kill switch VITE_SELECTFIELD_MODE=native (review Q6)', () => {
  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it('forces the native <select> above the threshold', () => {
    vi.stubEnv('VITE_SELECTFIELD_MODE', 'native');
    const { container } = renderField(<SelectField options={bigOptions(20)} value="v3" onChange={() => {}} />);
    const select = container.querySelector('select') as HTMLSelectElement;
    expect(select).toBeInTheDocument();
    expect(select.selectedOptions[0]).toHaveTextContent('Option 3');
    expect(screen.getByRole('combobox')).toBe(select);
  });

  it('forces the native <select> in search mode too (listing the current page)', () => {
    vi.stubEnv('VITE_SELECTFIELD_MODE', 'native');
    const { container } = renderField(
      <SelectField options={bigOptions(20)} value={null} onChange={() => {}} onSearch={() => {}} />,
    );
    expect(container.querySelector('select')).toBeInTheDocument();
  });

  it('any other value leaves the normal behaviour alone', () => {
    vi.stubEnv('VITE_SELECTFIELD_MODE', 'auto');
    const { container } = renderField(<SelectField options={bigOptions(20)} value={null} onChange={() => {}} />);
    expect(container.querySelector('select')).not.toBeInTheDocument();
    expect(screen.getByRole('combobox').tagName).toBe('INPUT');
  });
});

describe('SelectField — ARIA while closed vs open (review Q5 probe)', () => {
  it('aria-activedescendant is absent while closed and points at a rendered row while open', () => {
    renderField(<SelectField options={bigOptions(12)} value="v2" onChange={() => {}} ariaLabel="Pick one" />);
    const field = screen.getByRole('combobox');
    expect(field).not.toHaveAttribute('aria-activedescendant');
    fireEvent.click(field);
    const id = field.getAttribute('aria-activedescendant');
    expect(id).toBeTruthy();
    expect(document.getElementById(id as string)).toHaveTextContent('Option 2');
    fireEvent.keyDown(field, { key: 'Escape' });
    expect(field).not.toHaveAttribute('aria-activedescendant');
  });

  it('the listbox is named by the visible <label>, not the placeholder', () => {
    renderField(
      <>
        <label htmlFor="who2">Whose conversation is this?</label>
        <SelectField id="who2" options={bigOptions(12)} value={null} onChange={() => {}} placeholder="Select the supplier…" />
      </>,
    );
    fireEvent.click(screen.getByRole('combobox'));
    expect(screen.getByRole('listbox', { name: 'Whose conversation is this?' })).toBeInTheDocument();
  });
});

describe('SelectField — the list lives inside an aria-modal dialog (review Q5)', () => {
  it('outside any dialog it is portaled to <body>', () => {
    renderField(<SelectField options={bigOptions(12)} value={null} onChange={() => {}} ariaLabel="Pick one" />);
    fireEvent.click(screen.getByRole('combobox'));
    expect(screen.getByRole('listbox').parentElement?.parentElement).toBe(document.body);
  });

  it('inside a SidePanel it is portaled INTO the dialog, and picking a row does not close the drawer', () => {
    const onClose = vi.fn();
    const onChange = vi.fn();
    renderField(
      <SidePanel open onClose={onClose} title="Drawer">
        <SelectField options={bigOptions(12)} value={null} onChange={onChange} ariaLabel="Pick one" />
      </SidePanel>,
    );
    fireEvent.click(screen.getByRole('combobox'));
    const dialog = screen.getByRole('dialog');
    const listbox = screen.getByRole('listbox');
    expect(dialog).toContainElement(listbox);
    fireEvent.mouseDown(screen.getByText('Option 4'));
    fireEvent.click(screen.getByText('Option 4'));
    expect(onChange).toHaveBeenCalledWith('v4');
    expect(onClose).not.toHaveBeenCalled();
  });

  it('a transformed dialog does not offset the panel (fixed coords measured from it)', () => {
    renderField(
      <div role="dialog" aria-modal="true" data-testid="dlg" style={{ transform: 'translate(50px, 30px)' }}>
        <SelectField options={bigOptions(12)} value={null} onChange={() => {}} ariaLabel="Pick one" />
      </div>,
    );
    const dlg = screen.getByTestId('dlg');
    dlg.getBoundingClientRect = () =>
      ({ top: 30, left: 50, bottom: 530, right: 550, width: 500, height: 500, x: 50, y: 30 }) as DOMRect;
    const field = screen.getByRole('combobox');
    field.getBoundingClientRect = () =>
      ({ top: 100, bottom: 140, left: 60, right: 260, width: 200, height: 40, x: 60, y: 100 }) as DOMRect;
    fireEvent.click(field);
    const panel = screen.getByRole('listbox').parentElement as HTMLElement;
    expect(dlg).toContainElement(panel);
    expect(panel.style.top).toBe(`${140 + 4 - 30}px`);
    expect(panel.style.left).toBe(`${60 - 50}px`);
  });
});
