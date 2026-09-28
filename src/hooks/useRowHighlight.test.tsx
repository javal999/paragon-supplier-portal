import React from 'react';
import { screen, fireEvent } from '@testing-library/react';
import { renderWithProviders } from '../test/test-utils';
import { HIGHLIGHTED_ROW_CLASS, useRowHighlight } from './useRowHighlight';

// ────────────────────────────────────────────────────────────────────────────
// The shared "scroll to and select one row" half of the deep-link pattern.
// Three states a destination page must handle without erroring (REQUIRED
// BEHAVIOR / constraint 6): the row exists, the row no longer exists, and no
// row was named at all.
// ────────────────────────────────────────────────────────────────────────────

const ROWS = ['row-1', 'row-2', 'row-3'];

const scrollIntoView = () => {};

const Probe: React.FC = () => {
  const highlight = useRowHighlight((id) => ROWS.includes(id));
  return (
    <div>
      <span data-testid="missing">{String(highlight.missing)}</span>
      <button type="button" data-testid="clear" onClick={highlight.clear}>
        clear
      </button>
      <ul>
        {ROWS.map((id) => {
          const isHighlighted = highlight.id === id;
          return (
            <li
              key={id}
              data-testid={`row-${id}`}
              ref={isHighlighted ? highlight.scrollRef : undefined}
              aria-selected={isHighlighted || undefined}
              className={isHighlighted ? HIGHLIGHTED_ROW_CLASS : undefined}
            >
              {id}
            </li>
          );
        })}
      </ul>
    </div>
  );
};

describe('useRowHighlight', () => {
  beforeAll(() => {
    // jsdom has no layout, so `scrollIntoView` is not implemented.
    Element.prototype.scrollIntoView = scrollIntoView;
  });

  it('no `highlight` param: nothing is selected, nothing is reported missing', () => {
    renderWithProviders(<Probe />, { route: '/buyer/inventory' });
    expect(screen.getByTestId('missing').textContent).toBe('false');
    for (const id of ROWS) expect(screen.getByTestId(`row-${id}`)).not.toHaveAttribute('aria-selected');
  });

  it('a row that exists is selected in the existing aria-selected / highlight style', () => {
    renderWithProviders(<Probe />, { route: '/buyer/inventory?highlight=row-2' });
    const row = screen.getByTestId('row-row-2');
    expect(row).toHaveAttribute('aria-selected', 'true');
    expect(row).toHaveClass(HIGHLIGHTED_ROW_CLASS);
    expect(screen.getByTestId('missing').textContent).toBe('false');
  });

  it('a row that no longer exists is reported missing, without error, and nothing is selected', () => {
    renderWithProviders(<Probe />, { route: '/buyer/inventory?highlight=row-404' });
    expect(screen.getByTestId('missing').textContent).toBe('true');
    for (const id of ROWS) expect(screen.getByTestId(`row-${id}`)).not.toHaveAttribute('aria-selected');
  });

  it('clear() removes the highlight (a later row pick / filter change)', () => {
    renderWithProviders(<Probe />, { route: '/buyer/inventory?highlight=row-1' });
    expect(screen.getByTestId('row-row-1')).toHaveAttribute('aria-selected', 'true');
    fireEvent.click(screen.getByTestId('clear'));
    expect(screen.getByTestId('row-row-1')).not.toHaveAttribute('aria-selected');
  });
});
