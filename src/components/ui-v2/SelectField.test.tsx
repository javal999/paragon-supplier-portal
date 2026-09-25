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
import { render, screen, fireEvent, cleanup, within } from '@testing-library/react';
import { I18nextProvider } from 'react-i18next';
import i18n from '../../lib/i18n';
import SelectField, { type SelectOption } from './SelectField';

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
      <SelectField options={smallOptions} value="" onChange={() => {}} placeholder="Pick one" />,
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
    renderField(<SelectField options={bigOptions(12)} value="" onChange={() => {}} placeholder="Pick one" />);
    const field = screen.getByRole('combobox', { name: 'Pick one' });
    expect(field.tagName).toBe('INPUT');
    expect(document.querySelector('select')).not.toBeInTheDocument();
  });

  it('the threshold is configurable via comboboxThreshold', () => {
    const { container } = renderField(
      <SelectField options={bigOptions(12)} value="" onChange={() => {}} comboboxThreshold={15} placeholder="Pick one" />,
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
          <SelectField options={opts} value="" onChange={() => {}} placeholder="Pick one" />
        </>
      );
    };
    const { container } = renderField(<Harness />);
    expect(container.querySelector('select')).toBeInTheDocument();
    fireEvent.click(screen.getByText('grow'));
    expect(container.querySelector('select')).not.toBeInTheDocument();
    expect(screen.getByRole('combobox', { name: 'Pick one' })).toBeInTheDocument();
  });
});

describe('SelectField — edge cases', () => {
  it('empty option list shows a clear empty state, standard or combobox alike', () => {
    renderField(<SelectField options={[]} value="" onChange={() => {}} ariaLabel="Pick one" />);
    const btn = screen.getByRole('button', { name: 'Pick one' });
    expect(btn).toBeDisabled();
    expect(btn).toHaveTextContent('No options available');
  });

  it('loading state shows a loading indicator regardless of option count', () => {
    renderField(<SelectField options={bigOptions(20)} value="" onChange={() => {}} loading ariaLabel="Pick one" />);
    expect(screen.getByText('Loading options…')).toBeInTheDocument();
  });

  it('an unavailable selected value gets a clear fallback in standard mode', () => {
    const { container } = renderField(
      <SelectField options={smallOptions} value="ghost" onChange={() => {}} placeholder="Pick one" />,
    );
    const select = container.querySelector('select') as HTMLSelectElement;
    expect(select.value).toBe('ghost');
    expect(within(select).getByText('Unavailable: ghost')).toBeInTheDocument();
  });

  it('an unavailable selected value gets a clear fallback in combobox mode, while closed', () => {
    renderField(<SelectField options={bigOptions(12)} value="ghost" onChange={() => {}} placeholder="Pick one" />);
    expect(screen.getByRole('combobox', { name: 'Pick one' })).toHaveValue('Unavailable: ghost');
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
    expect(screen.getByRole('combobox', { name: 'Pick one' })).toHaveAttribute('title', long);
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
    renderField(<SelectField options={dupes} value="" onChange={() => {}} placeholder="Pick supplier" />);
    fireEvent.click(screen.getByRole('combobox', { name: 'Pick supplier' }));
    expect(screen.getByText('sup-001 · Jakarta')).toBeInTheDocument();
    expect(screen.getByText('sup-002 · Surabaya')).toBeInTheDocument();
  });
});

describe('SelectField — the field itself becomes writable only past the threshold', () => {
  it('closed, the combobox input still rejects typing being the point: it opens instead and starts a fresh filter', () => {
    renderField(<SelectField options={bigOptions(20)} value="" onChange={() => {}} placeholder="Pick one" />);
    const field = screen.getByRole('combobox', { name: 'Pick one' });
    expect(screen.queryByRole('listbox')).not.toBeInTheDocument();
    fireEvent.change(field, { target: { value: 'Option 3' } });
    // Typing directly (no prior click) still opens it — same field either way.
    expect(screen.getByRole('listbox')).toBeInTheDocument();
    expect(field).toHaveValue('Option 3');
  });

  it('opening (click, no typing yet) shows the full list — browsing by scroll, not just search', () => {
    renderField(<SelectField options={bigOptions(20)} value="v5" onChange={() => {}} placeholder="Pick one" />);
    const field = screen.getByRole('combobox', { name: 'Pick one' });
    expect(field).toHaveValue('Option 5');
    fireEvent.click(field);
    // Clearing to a blank, fully-browsable list is deliberate — the prior
    // selection reappears once the panel closes again (see the next test).
    expect(field).toHaveValue('');
    expect(within(screen.getByRole('listbox')).getAllByRole('option')).toHaveLength(20);
  });

  it('closing without picking anything restores the prior selection as plain display text', () => {
    renderField(<SelectField options={bigOptions(20)} value="v5" onChange={() => {}} placeholder="Pick one" />);
    const field = screen.getByRole('combobox', { name: 'Pick one' });
    fireEvent.click(field);
    fireEvent.change(field, { target: { value: 'garbage query' } });
    fireEvent.keyDown(field, { key: 'Escape' });
    expect(field).toHaveValue('Option 5');
  });
});

describe('SelectField — combobox search, highlighting, keyboard nav', () => {
  it('typing filters the list and highlights the matched substring', () => {
    renderField(<SelectField options={bigOptions(20)} value="" onChange={() => {}} placeholder="Pick one" />);
    const field = screen.getByRole('combobox', { name: 'Pick one' });
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
    renderField(<SelectField options={bigOptions(20)} value="" onChange={() => {}} placeholder="Pick one" />);
    const field = screen.getByRole('combobox', { name: 'Pick one' });
    fireEvent.click(field);
    fireEvent.change(field, { target: { value: 'zzz-nope' } });
    expect(screen.getByText('No matching results')).toBeInTheDocument();
    expect(screen.getByText('Try a different search term.')).toBeInTheDocument();
  });

  it('opening pre-highlights the first row; Enter alone selects it', () => {
    const onChange = vi.fn();
    renderField(<SelectField options={bigOptions(12)} value="" onChange={onChange} placeholder="Pick one" />);
    const field = screen.getByRole('combobox', { name: 'Pick one' });
    fireEvent.click(field);
    fireEvent.keyDown(field, { key: 'Enter' });
    expect(onChange).toHaveBeenCalledWith('v0');
    expect(screen.queryByRole('listbox')).not.toBeInTheDocument();
  });

  it('ArrowDown moves the highlight forward; Enter then selects that row', () => {
    const onChange = vi.fn();
    renderField(<SelectField options={bigOptions(12)} value="" onChange={onChange} placeholder="Pick one" />);
    const field = screen.getByRole('combobox', { name: 'Pick one' });
    fireEvent.click(field);
    fireEvent.keyDown(field, { key: 'ArrowDown' });
    fireEvent.keyDown(field, { key: 'Enter' });
    expect(onChange).toHaveBeenCalledWith('v1');
    expect(screen.queryByRole('listbox')).not.toBeInTheDocument();
  });

  it('ArrowDown while closed opens it too (keyboard parity with a native <select>)', () => {
    renderField(<SelectField options={bigOptions(12)} value="" onChange={() => {}} placeholder="Pick one" />);
    const field = screen.getByRole('combobox', { name: 'Pick one' });
    fireEvent.keyDown(field, { key: 'ArrowDown' });
    expect(screen.getByRole('listbox')).toBeInTheDocument();
  });

  it('Escape closes without changing the value and leaves focus on the field', () => {
    const onChange = vi.fn();
    renderField(<SelectField options={bigOptions(12)} value="v3" onChange={onChange} placeholder="Pick one" />);
    const field = screen.getByRole('combobox', { name: 'Pick one' });
    fireEvent.click(field);
    fireEvent.keyDown(field, { key: 'Escape' });
    expect(onChange).not.toHaveBeenCalled();
    expect(screen.queryByRole('listbox')).not.toBeInTheDocument();
    expect(document.activeElement).toBe(field);
  });

  it('clicking a row selects it', () => {
    const onChange = vi.fn();
    renderField(<SelectField options={bigOptions(12)} value="" onChange={onChange} placeholder="Pick one" />);
    fireEvent.click(screen.getByRole('combobox', { name: 'Pick one' }));
    fireEvent.click(screen.getByText('Option 4'));
    expect(onChange).toHaveBeenCalledWith('v4');
  });
});

describe('SelectField — the panel always opens below the trigger, height-capped to the viewport', () => {
  it('uses its full max height when there is plenty of room below', () => {
    renderField(<SelectField options={bigOptions(20)} value="" onChange={() => {}} placeholder="Pick one" />);
    const field = screen.getByRole('combobox', { name: 'Pick one' });
    field.getBoundingClientRect = () =>
      ({ top: 100, bottom: 140, left: 0, right: 200, width: 200, height: 40, x: 0, y: 100 }) as DOMRect;
    fireEvent.click(field);
    const listbox = screen.getByRole('listbox');
    const panel = listbox.parentElement as HTMLElement;
    expect(panel.style.top).toBe('144px'); // rect.bottom + 4
    expect(parseInt(listbox.style.maxHeight, 10)).toBe(288);
  });

  it('never flips above the trigger — it shrinks instead, stopping 24px short of the viewport bottom', () => {
    renderField(<SelectField options={bigOptions(20)} value="" onChange={() => {}} placeholder="Pick one" />);
    const field = screen.getByRole('combobox', { name: 'Pick one' });
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
    renderField(<SelectField options={bigOptions(20)} value="" onChange={() => {}} placeholder="Pick one" />);
    const field = screen.getByRole('combobox', { name: 'Pick one' });
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
      <SelectField options={bigOptions(500)} value="" onChange={() => {}} placeholder="Pick one" virtualizeThreshold={50} />,
    );
    fireEvent.click(screen.getByRole('combobox', { name: 'Pick one' }));
    const rows = screen.getAllByRole('option');
    expect(rows.length).toBeGreaterThan(0);
    expect(rows.length).toBeLessThan(500);
  });
});

describe('SelectField — i18n', () => {
  it('localizes the empty and no-results strings', async () => {
    await i18n.changeLanguage('id');
    const { unmount } = renderField(<SelectField options={[]} value="" onChange={() => {}} ariaLabel="Pilih" />);
    expect(screen.getByText('Tidak ada opsi tersedia')).toBeInTheDocument();
    unmount();

    renderField(<SelectField options={bigOptions(20)} value="" onChange={() => {}} placeholder="Pilih" />);
    const field = screen.getByRole('combobox', { name: 'Pilih' });
    fireEvent.click(field);
    fireEvent.change(field, { target: { value: 'zzz' } });
    expect(screen.getByText('Tidak ada hasil yang cocok')).toBeInTheDocument();
  });
});
