// A11y findings 30, 31, 15 and 32 (docs/supplier-hub/research/
// FORECAST-UX-ACCESSIBILITY-2026-10.md): chip arrow keys, coarse-pointer touch
// targets, and the field border token. jsdom has no layout and no pointer
// media, so the touch target is asserted as the class plus the CSS rule.
import fs from 'node:fs';
import path from 'node:path';
import { useState } from 'react';
import { describe, it, expect, afterEach } from 'vitest';
import { render, screen, fireEvent, cleanup } from '@testing-library/react';
import tailwindConfig from '../../../tailwind.config.js';
import FilterChipsBar from './FilterChipsBar';
import Button from './Button';

afterEach(cleanup);

const OPTIONS = [
  { id: 'a', label: 'Alpha' },
  { id: 'b', label: 'Beta' },
  { id: 'c', label: 'Gamma' }
];

/** @param {{ initial: string }} props */
const Harness = ({ initial }) => {
  const [value, setValue] = useState(initial);
  return (
    <>
      <FilterChipsBar options={OPTIONS} value={value} onChange={setValue} />
      <output data-testid="value">{value}</output>
    </>
  );
};

const radios = () => screen.getAllByRole('radio');
const tabbable = () => radios().filter((r) => r.tabIndex === 0);

describe('FilterChipsBar · ARIA radio group (finding 30)', () => {
  it('makes only the checked chip a Tab stop', () => {
    render(<Harness initial="b" />);
    expect(tabbable()).toEqual([screen.getByRole('radio', { name: 'Beta' })]);
    expect(radios().map((r) => r.tabIndex)).toEqual([-1, 0, -1]);
  });

  it('makes the first chip the Tab stop when none is checked', () => {
    render(<Harness initial="none" />);
    expect(tabbable()).toEqual([screen.getByRole('radio', { name: 'Alpha' })]);
  });

  it('Right/Down move focus and selection forward and wrap from the last chip', () => {
    render(<Harness initial="b" />);
    const beta = screen.getByRole('radio', { name: 'Beta' });
    beta.focus();
    fireEvent.keyDown(beta, { key: 'ArrowRight' });
    const gamma = screen.getByRole('radio', { name: 'Gamma' });
    expect(gamma).toHaveFocus();
    expect(gamma).toHaveAttribute('aria-checked', 'true');
    expect(screen.getByTestId('value')).toHaveTextContent('c');
    fireEvent.keyDown(gamma, { key: 'ArrowDown' });
    expect(screen.getByRole('radio', { name: 'Alpha' })).toHaveFocus();
    expect(screen.getByTestId('value')).toHaveTextContent('a');
    expect(tabbable()).toHaveLength(1);
  });

  it('Left/Up move backward and wrap from the first chip', () => {
    render(<Harness initial="a" />);
    const alpha = screen.getByRole('radio', { name: 'Alpha' });
    alpha.focus();
    fireEvent.keyDown(alpha, { key: 'ArrowLeft' });
    const gamma = screen.getByRole('radio', { name: 'Gamma' });
    expect(gamma).toHaveFocus();
    expect(screen.getByTestId('value')).toHaveTextContent('c');
    fireEvent.keyDown(gamma, { key: 'ArrowUp' });
    expect(screen.getByRole('radio', { name: 'Beta' })).toHaveFocus();
    expect(screen.getByTestId('value')).toHaveTextContent('b');
  });

  it('Home and End go to the first and last chip', () => {
    render(<Harness initial="b" />);
    const beta = screen.getByRole('radio', { name: 'Beta' });
    beta.focus();
    fireEvent.keyDown(beta, { key: 'End' });
    expect(screen.getByRole('radio', { name: 'Gamma' })).toHaveFocus();
    expect(screen.getByTestId('value')).toHaveTextContent('c');
    fireEvent.keyDown(screen.getByRole('radio', { name: 'Gamma' }), { key: 'Home' });
    expect(screen.getByRole('radio', { name: 'Alpha' })).toHaveFocus();
    expect(screen.getByTestId('value')).toHaveTextContent('a');
  });

  it('ignores other keys (Tab leaves the group untouched)', () => {
    render(<Harness initial="b" />);
    fireEvent.keyDown(screen.getByRole('radio', { name: 'Beta' }), { key: 'a' });
    expect(screen.getByTestId('value')).toHaveTextContent('b');
  });

  it('known-good probe: clicking a chip still selects it and moves the Tab stop', () => {
    render(<Harness initial="a" />);
    fireEvent.click(screen.getByRole('radio', { name: 'Gamma' }));
    expect(screen.getByTestId('value')).toHaveTextContent('c');
    expect(tabbable()).toEqual([screen.getByRole('radio', { name: 'Gamma' })]);
  });

  it('multi-select keeps one Tab stop per chip and no arrow handling', () => {
    render(<FilterChipsBar multiSelect options={OPTIONS} value={['a']} onChange={() => {}} />);
    const boxes = screen.getAllByRole('checkbox');
    expect(boxes.map((b) => b.tabIndex)).toEqual([0, 0, 0]);
  });
});

const CSS = fs.readFileSync(path.resolve(__dirname, '../../index.css'), 'utf8');

describe('coarse-pointer touch target (findings 31 and 15)', () => {
  it('index.css widens .touch-target to 44 px only inside @media (pointer: coarse)', () => {
    const block = CSS.slice(CSS.indexOf('@media (pointer: coarse)'));
    expect(block).toMatch(/\.touch-target\s*\{\s*position:\s*relative;/);
    expect(block).toMatch(/\.touch-target::before\s*\{[^}]*width:\s*max\(100%,\s*44px\)/);
    expect(block).toMatch(/\.touch-target::before\s*\{[^}]*height:\s*max\(100%,\s*44px\)/);
    // Outside the coarse-pointer block the class has no rule, so desktop is unchanged.
    expect(CSS.slice(0, CSS.indexOf('@media (pointer: coarse)'))).not.toMatch(
      /\.touch-target\s*[{:]/
    );
  });

  it('Button carries the touch-target class and keeps its 40 px visual padding', () => {
    render(<Button>Save</Button>);
    const btn = screen.getByRole('button', { name: 'Save' });
    expect(btn).toHaveClass('touch-target');
    expect(btn).toHaveClass('py-2.5');
  });
});

describe('border-input token (finding 32)', () => {
  it('is #8291A0 (3.23:1 on white, WCAG 1.4.11)', () => {
    const config = /** @type {{ theme: { extend: { colors: Record<string, unknown> } } }} */ (
      /** @type {unknown} */ (tailwindConfig)
    );
    expect(config.theme.extend.colors['border-input']).toBe('#8291A0');
  });
});
