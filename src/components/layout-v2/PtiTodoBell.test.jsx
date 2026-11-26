import { describe, expect, it, vi } from 'vitest';
import { fireEvent, screen, within } from '@testing-library/react';
import { renderWithProviders } from '@test/test-utils';

// The empty To-do is a state the seeded buyer seat never shows: every case here
// replaces the derivation's output with no rows, so the bell's own 0 handling is
// the subject. The derivation itself is pinned in `home/buyerTodo.test.js`.
vi.mock('@pages-v2/home/buyerTodo', () => ({ buyerTodoTasks: () => [] }));

import { PtiTodoBell } from './PtiTodoBell';

describe('PtiTodoBell — the empty To-do (BL-361)', () => {
  it('names the count at 0 and shows no badge', async () => {
    renderWithProviders(<PtiTodoBell />);
    const bell = await screen.findByTestId('pti-notice-bell');
    expect(bell).toHaveAttribute('data-todo-count', '0');
    // BL-84 — the name states the count its badge would show, INCLUDING 0.
    expect(bell).toHaveAccessibleName('To-do: 0 open items');
    expect(screen.queryByTestId('pti-todo-badge')).toBeNull();
  });

  it('opening it explains the empty state instead of listing nothing', async () => {
    renderWithProviders(<PtiTodoBell />);
    fireEvent.click(await screen.findByTestId('pti-notice-bell'));
    const panel = screen.getByTestId('pti-todo-panel');
    expect(panel).toHaveTextContent('Nothing needs your action');
    expect(within(panel).queryAllByRole('button')).toEqual([]);
  });
});
