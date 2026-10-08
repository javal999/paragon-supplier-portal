/** @import * as React from 'react' */
// ────────────────────────────────────────────────────────────────────────────
// BL-31 (SC-07) — the keyboard and screen-reader contract of the SHARED
// primitives, rendered. Every property is checked by one helper that returns
// the list of properties a surface FAILS, and each helper is fired at the
// pre-BL-31 shape first (it must fail, by name) before it is believed on the
// fixed shape (it must return nothing). PROBE THE GUARD BOTH WAYS.
// ────────────────────────────────────────────────────────────────────────────
import { useState } from 'react';
import { describe, it, expect, afterEach } from 'vitest';
import { render, screen, fireEvent, cleanup, within } from '@testing-library/react';
import i18n from '@lib/i18n';
import { renderWithProviders } from '@test/test-utils';
import SidePanel from './SidePanel';
import ModalOverlay from './ModalOverlay';
import Wizard from './Wizard';
import TableRow from './TableRow';
import SearchBar from './SearchBar';
import FormSection from './FormSection';
import Toaster from './Toaster';
import AppShellV2 from '../layout-v2/AppShellV2';
afterEach(async () => {
  cleanup();
  await i18n.changeLanguage('en');
});
// ── The modal contract, as one measurement ────────────────────────────────
// Opens the surface from a real button, then reports which of the five
// properties failed. An empty list is the contract held.
/**
 * @param {(open: boolean, close: () => void) => React.ReactNode} renderSurface
 * @returns {string[]}
 */
function modalContractFailures(renderSurface) {
  const Harness = () => {
    const [open, setOpen] = useState(false);
    return (
      <>
        <button type="button" onClick={() => setOpen(true)}>
          opener
        </button>
        <button type="button">page behind</button>
        {renderSurface(open, () => setOpen(false))}
      </>
    );
  };
  renderWithProviders(<Harness />);
  const failures = [];
  const opener = screen.getByText('opener');
  opener.focus();
  fireEvent.click(opener);
  const dialog = screen.queryByRole('dialog');
  if (!dialog) return ['renders a role=dialog'];
  if (!dialog.getAttribute('aria-labelledby') && !dialog.getAttribute('aria-label'))
    failures.push('is named');
  if (!dialog.contains(document.activeElement)) failures.push('moves focus in');
  const focusables = Array.from(
    /** @type {NodeListOf<HTMLElement>} */ (
      dialog.querySelectorAll(
        'button:not([disabled]), input:not([disabled]), select, textarea, a[href]'
      )
    )
  );
  if (focusables.length >= 2) {
    focusables[focusables.length - 1].focus();
    fireEvent.keyDown(document.activeElement ?? document.body, { key: 'Tab' });
    if (document.activeElement !== focusables[0]) failures.push('Tab wraps last→first');
    focusables[0].focus();
    fireEvent.keyDown(document.activeElement ?? document.body, { key: 'Tab', shiftKey: true });
    if (document.activeElement !== focusables[focusables.length - 1])
      failures.push('Shift+Tab wraps first→last');
  }
  fireEvent.keyDown(document.activeElement ?? document.body, { key: 'Escape' });
  if (screen.queryByRole('dialog')) failures.push('closes on Escape');
  else if (document.activeElement !== opener) failures.push('returns focus to the opener');
  return failures;
}
describe('BL-31 · modal keyboard contract — the probe fires on the pre-BL-31 shape', () => {
  it('✅ the bare wizard overlay as main shipped it fails every property it could', () => {
    // The shape of the five wizard overlays before BL-31: a scrim div, no role,
    // no name, no focus handling, no Escape.
    const failures = modalContractFailures((open, close) =>
      open ? (
        <div className="fixed inset-0 z-50">
          <div role="dialog" aria-modal="true">
            <button type="button" onClick={close}>
              Cancel
            </button>
            <button type="button">Next</button>
          </div>
        </div>
      ) : null
    );
    expect(failures).toEqual([
      'is named',
      'moves focus in',
      'Tab wraps last→first',
      'Shift+Tab wraps first→last',
      'closes on Escape'
    ]);
  });
});
describe('BL-31 · modal keyboard contract — held by the shared primitives', () => {
  it('SidePanel: named by its title, focus in, trapped, Escape closes, focus returns', () => {
    const failures = modalContractFailures((open, close) => (
      <SidePanel
        open={open}
        onClose={close}
        title="PO PO-2026-00121"
        footerActions={<button type="button">Confirm</button>}
      >
        <label>
          Note <input />
        </label>
      </SidePanel>
    ));
    expect(failures).toEqual([]);
    cleanup();
    // …and the name is the title, not merely present.
    renderWithProviders(
      <SidePanel open onClose={() => {}} title="PO PO-2026-00121">
        <p />
      </SidePanel>
    );
    expect(screen.getByRole('dialog', { name: 'PO PO-2026-00121' })).toBeInTheDocument();
  });
  it('ModalOverlay + Wizard (the RFQ/RFI/RFP/contract/GR overlays): the same five properties', () => {
    const failures = modalContractFailures((open, close) =>
      open ? (
        <ModalOverlay onClose={close}>
          <Wizard
            steps={[
              { id: 'a', title: 'Define scope', content: <input aria-label="Title" /> },
              { id: 'b', title: 'Invite suppliers', content: <p /> }
            ]}
            currentStep={0}
            onStepChange={() => {}}
            onCancel={close}
            onComplete={() => {}}
            completeLabel="Send"
          />
        </ModalOverlay>
      ) : null
    );
    expect(failures).toEqual([]);
  });
  it('nested: Escape closes only the topmost modal', () => {
    const Harness = () => {
      const [inner, setInner] = useState(true);
      const [outer, setOuter] = useState(true);
      return (
        <SidePanel open={outer} onClose={() => setOuter(false)} title="Drawer">
          <button type="button">in drawer</button>
          {inner ? (
            <ModalOverlay onClose={() => setInner(false)} label="Confirm">
              <button type="button">ok</button>
            </ModalOverlay>
          ) : null}
        </SidePanel>
      );
    };
    renderWithProviders(<Harness />);
    expect(screen.getAllByRole('dialog')).toHaveLength(2);
    fireEvent.keyDown(document.activeElement ?? document.body, { key: 'Escape' });
    expect(screen.getAllByRole('dialog')).toHaveLength(1);
    expect(screen.getByRole('dialog', { name: 'Drawer' })).toBeInTheDocument();
  });
});
describe('BL-31 · clickable rows open from the keyboard', () => {
  /** @param {{ onOpen?: () => void }} props */
  const Row = ({ onOpen }) => (
    <table>
      <tbody>
        <TableRow onClick={onOpen} data-testid="row">
          <td>PO-2026-00121</td>
          <td>
            <button type="button" onClick={(e) => e.stopPropagation()}>
              inner
            </button>
          </td>
        </TableRow>
      </tbody>
    </table>
  );
  it('✅ PROBE: a plain <tr onClick> (the pre-BL-31 row) is not in the tab order and ignores Enter', () => {
    let opened = 0;
    render(
      <table>
        <tbody>
          <tr data-testid="row" onClick={() => (opened += 1)}>
            <td>PO</td>
          </tr>
        </tbody>
      </table>
    );
    const row = screen.getByTestId('row');
    expect(row.tabIndex).toBe(-1);
    fireEvent.keyDown(row, { key: 'Enter' });
    expect(opened).toBe(0);
  });
  it('a TableRow with onClick is a tab stop and opens on Enter and on Space', () => {
    let opened = 0;
    render(<Row onOpen={() => (opened += 1)} />);
    const row = screen.getByTestId('row');
    expect(row.tabIndex).toBe(0);
    fireEvent.keyDown(row, { key: 'Enter' });
    fireEvent.keyDown(row, { key: ' ' });
    expect(opened).toBe(2);
  });
  it('keys pressed on a control inside the row are left to that control', () => {
    let opened = 0;
    render(<Row onOpen={() => (opened += 1)} />);
    fireEvent.keyDown(screen.getByText('inner'), { key: 'Enter' });
    expect(opened).toBe(0);
  });
  it('a TableRow with no onClick stays out of the tab order', () => {
    render(<Row />);
    expect(screen.getByTestId('row').hasAttribute('tabindex')).toBe(false);
  });
});
// ── Accessible names, measured the way assistive technology computes them ──
/** @type {readonly string[]} */
const ROLES = [
  'button',
  'textbox',
  'searchbox',
  'combobox',
  'checkbox',
  'radio',
  'switch',
  'tab',
  'link'
];
/**
 * @param {HTMLElement} root
 * @returns {string[]}
 */
function unnamedControls(root) {
  const out = [];
  for (const role of ROLES) {
    const all = within(root).queryAllByRole(role);
    const named = new Set(within(root).queryAllByRole(role, { name: /\S/ }));
    for (const el of all) if (!named.has(el)) out.push(`${role}: ${el.outerHTML.slice(0, 80)}`);
  }
  return out;
}
describe('BL-31 · accessible names in the shared primitives', () => {
  it('✅ PROBE: the measurement flags an unnamed control and accepts a labelled one', () => {
    const { container } = render(
      <div>
        <input type="text" />
        <button type="button">
          <svg aria-hidden="true" />
        </button>
        <label>
          Quantity <input type="text" />
        </label>
      </div>
    );
    expect(unnamedControls(container)).toHaveLength(2);
  });
  it('SearchBar is named even with no ariaLabel and no placeholder (was unnamed)', async () => {
    for (const lng of ['en', 'id']) {
      await i18n.changeLanguage(lng);
      const { container } = render(<SearchBar value="" onChange={() => {}} />);
      expect(unnamedControls(container)).toEqual([]);
      expect(
        screen.getByRole('textbox', { name: i18n.getFixedT(lng)('ui.search') })
      ).toBeInTheDocument();
      cleanup();
    }
  });
  it('the app shell: skip link first, search named, nav named, persona toggle states its choice', () => {
    const { container } = renderWithProviders(
      <AppShellV2>
        <h1>Page</h1>
      </AppShellV2>
    );
    expect(unnamedControls(container)).toEqual([]);
    const skip = screen.getByRole('link', { name: 'Skip to main content' });
    // First in document order among focusables → first Tab stop.
    const first = container.querySelector(
      'a[href], button, input, select, textarea, [tabindex="0"]'
    );
    expect(first).toBe(skip);
    fireEvent.click(skip);
    expect(document.activeElement).toBe(container.querySelector('main#main-content'));
    expect(screen.getByRole('navigation', { name: 'Main navigation' })).toBeInTheDocument();
    // The top bar search is an autocomplete, so its role is combobox, not searchbox.
    expect(screen.getByRole('combobox', { name: 'Search the portal' })).toBeInTheDocument();
    const group = screen.getByRole('group', { name: 'Portal view' });
    const pressed = within(group)
      .getAllByRole('button')
      .map((b) => b.getAttribute('aria-pressed'));
    expect(pressed.sort()).toEqual(['false', 'true']);
  });
  it('Wizard step circles carry the step name, in both languages', async () => {
    const steps = [
      { id: 'a', title: 'Define scope', content: <p /> },
      { id: 'b', title: 'Invite suppliers', content: <p /> }
    ];
    const ui = () => (
      <Wizard
        steps={steps}
        currentStep={1}
        onStepChange={() => {}}
        onCancel={() => {}}
        onComplete={() => {}}
        completeLabel="Send"
      />
    );
    renderWithProviders(ui());
    expect(
      screen.getByRole('button', { name: 'Step 1 of 2: Define scope (completed)' })
    ).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Step 2 of 2: Invite suppliers' })).toHaveAttribute(
      'aria-current',
      'step'
    );
    cleanup();
    await i18n.changeLanguage('id');
    renderWithProviders(ui());
    expect(
      screen.getByRole('button', { name: 'Langkah 2 dari 2: Invite suppliers' })
    ).toBeInTheDocument();
  });
  it('FormSection collapse control is named in the reader’s language (was an English literal)', async () => {
    await i18n.changeLanguage('id');
    renderWithProviders(
      <FormSection title="Detail" collapsible>
        <input aria-label="x" />
      </FormSection>
    );
    expect(screen.getByRole('button', { name: 'Tutup bagian' })).toHaveAttribute(
      'aria-expanded',
      'true'
    );
    expect(screen.queryByRole('button', { name: 'Collapse section' })).toBeNull();
  });
  it('the toast region exists before any toast, so the first one is announced', () => {
    const { container } = renderWithProviders(<Toaster />);
    expect(container.querySelector('[aria-live="polite"]')).not.toBeNull();
  });
});
