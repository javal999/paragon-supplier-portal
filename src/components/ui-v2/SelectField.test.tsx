// ────────────────────────────────────────────────────────────────────────────
// SelectField — the shared standard/combobox select primitive. The rule this
// component exists to satisfy: >10 options → searchable combobox, ≤10 →
// plain native <select>, re-decided from `options.length` on every render so
// a data set that grows or shrinks across the threshold switches on its own
// (no caller-side branching). See src/components/ui-v2/SelectField.tsx.
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
  it('renders a plain <select> for ≤10 options', () => {
    const { container } = renderField(
      <SelectField options={smallOptions} value="" onChange={() => {}} placeholder="Pick one" />,
    );
    expect(container.querySelector('select')).toBeInTheDocument();
    expect(screen.queryByRole('listbox')).not.toBeInTheDocument();
  });

  it('renders a searchable combobox for >10 options', () => {
    renderField(<SelectField options={bigOptions(12)} value="" onChange={() => {}} placeholder="Pick one" />);
    expect(screen.getByRole('button', { name: 'Pick one' })).toBeInTheDocument();
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
    expect(screen.getByRole('button', { name: 'Pick one' })).toBeInTheDocument();
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

  it('an unavailable selected value gets a clear fallback in combobox mode', () => {
    renderField(<SelectField options={bigOptions(12)} value="ghost" onChange={() => {}} placeholder="Pick one" />);
    expect(screen.getByRole('button', { name: 'Pick one' })).toHaveTextContent('Unavailable: ghost');
  });

  it('long labels carry a title attribute for full-value accessibility (combobox trigger)', () => {
    const long = 'A'.repeat(120);
    renderField(
      <SelectField
        options={[{ value: 'x', label: long }, ...bigOptions(11)]}
        value="x"
        onChange={() => {}}
        placeholder="Pick one"
      />,
    );
    const trigger = screen.getByRole('button', { name: 'Pick one' });
    expect(within(trigger).getByTitle(long)).toBeInTheDocument();
  });

  it('duplicate labels are disambiguated via the description line', () => {
    const dupes: SelectOption[] = [
      { value: 's1', label: 'PT Sample Supplier', description: 'sup-001 · Jakarta' },
      { value: 's2', label: 'PT Sample Supplier', description: 'sup-002 · Surabaya' },
      ...bigOptions(10),
    ];
    renderField(<SelectField options={dupes} value="" onChange={() => {}} placeholder="Pick supplier" />);
    fireEvent.click(screen.getByRole('button', { name: 'Pick supplier' }));
    expect(screen.getByText('sup-001 · Jakarta')).toBeInTheDocument();
    expect(screen.getByText('sup-002 · Surabaya')).toBeInTheDocument();
  });
});

describe('SelectField — combobox search, highlighting, keyboard nav', () => {
  it('typing filters the list and highlights the matched substring', () => {
    renderField(<SelectField options={bigOptions(20)} value="" onChange={() => {}} placeholder="Pick one" />);
    fireEvent.click(screen.getByRole('button', { name: 'Pick one' }));
    const search = screen.getByRole('combobox');
    fireEvent.change(search, { target: { value: 'Option 1' } });

    const listbox = screen.getByRole('listbox');
    const rows = within(listbox).getAllByRole('option');
    // "Option 1", "Option 10".."Option 19" all match — "Option 2".."9" do not.
    expect(rows.length).toBe(11);
    const mark = within(listbox).getAllByText('Option 1')[0].closest('li')!.querySelector('mark');
    expect(mark).toHaveTextContent('Option 1');
  });

  it('no matches shows the no-results state with guidance, distinct from the empty-list state', () => {
    renderField(<SelectField options={bigOptions(20)} value="" onChange={() => {}} placeholder="Pick one" />);
    fireEvent.click(screen.getByRole('button', { name: 'Pick one' }));
    fireEvent.change(screen.getByRole('combobox'), { target: { value: 'zzz-nope' } });
    expect(screen.getByText('No matching results')).toBeInTheDocument();
    expect(screen.getByText('Try a different search term.')).toBeInTheDocument();
  });

  it('opening pre-highlights the first row; Enter alone selects it', () => {
    const onChange = vi.fn();
    renderField(<SelectField options={bigOptions(12)} value="" onChange={onChange} placeholder="Pick one" />);
    fireEvent.click(screen.getByRole('button', { name: 'Pick one' }));
    fireEvent.keyDown(screen.getByRole('combobox'), { key: 'Enter' });
    expect(onChange).toHaveBeenCalledWith('v0');
    expect(screen.queryByRole('listbox')).not.toBeInTheDocument();
  });

  it('ArrowDown moves the highlight forward; Enter then selects that row', () => {
    const onChange = vi.fn();
    renderField(<SelectField options={bigOptions(12)} value="" onChange={onChange} placeholder="Pick one" />);
    fireEvent.click(screen.getByRole('button', { name: 'Pick one' }));
    const search = screen.getByRole('combobox');
    fireEvent.keyDown(search, { key: 'ArrowDown' });
    fireEvent.keyDown(search, { key: 'Enter' });
    expect(onChange).toHaveBeenCalledWith('v1');
    expect(screen.queryByRole('listbox')).not.toBeInTheDocument();
  });

  it('Escape closes without changing the value and returns focus to the trigger', () => {
    const onChange = vi.fn();
    renderField(<SelectField options={bigOptions(12)} value="v3" onChange={onChange} placeholder="Pick one" />);
    const trigger = screen.getByRole('button', { name: 'Pick one' });
    fireEvent.click(trigger);
    fireEvent.keyDown(screen.getByRole('combobox'), { key: 'Escape' });
    expect(onChange).not.toHaveBeenCalled();
    expect(screen.queryByRole('listbox')).not.toBeInTheDocument();
    expect(document.activeElement).toBe(trigger);
  });

  it('clicking a row selects it', () => {
    const onChange = vi.fn();
    renderField(<SelectField options={bigOptions(12)} value="" onChange={onChange} placeholder="Pick one" />);
    fireEvent.click(screen.getByRole('button', { name: 'Pick one' }));
    fireEvent.click(screen.getByText('Option 4'));
    expect(onChange).toHaveBeenCalledWith('v4');
  });
});

describe('SelectField — large datasets are windowed', () => {
  it('renders far fewer option rows than exist once past the virtualize threshold', () => {
    renderField(
      <SelectField options={bigOptions(500)} value="" onChange={() => {}} placeholder="Pick one" virtualizeThreshold={50} />,
    );
    fireEvent.click(screen.getByRole('button', { name: 'Pick one' }));
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
    fireEvent.click(screen.getByRole('button', { name: 'Pilih' }));
    fireEvent.change(screen.getByRole('combobox'), { target: { value: 'zzz' } });
    expect(screen.getByText('Tidak ada hasil yang cocok')).toBeInTheDocument();
  });
});
