import { beforeEach, describe, expect, it } from 'vitest';
import { fireEvent, screen, waitFor, within } from '@testing-library/react';
import { renderWithProviders, SUPPLIER } from '@test/test-utils';
import { inventoryCapacityEn, inventoryCapacityId } from '@lib/i18n/inventoryCapacity';
import { supplierAskStore } from '@services/data/mock/stores/supplierAskStore';
import { sdcClock } from '@services/sdc';
import i18n from '@lib/i18n';
import SupplierInventory from '../SupplierInventory';
import SupplierHome from '../SupplierHome';

// ─────────────────────────────────────────────────────────────────────────────
// Inventory UX S-04 (INV-D9) — "PTI has N questions for you" (BL-227: an ask
// may name a planning group and week, not a material, so it counts questions), on
// the real supplier To do and Stock page with the sample asks (sup-007).
//
//   · the block sits above the To do lanes (RFX-D20 keeps the lanes) and,
//     on Stock, between the weekly status and the tabs;
//   · each line: class, topic, material or planning group and week, PTI's
//     question, the due date, and "Answer" opening a reply form;
//   · empty: "Nothing PTI is waiting on"; the Stock menu item counts the asks;
//   · a seat without `supplierask:answer` reads the asks and is told whose act
//     it is (§84).
// ─────────────────────────────────────────────────────────────────────────────

beforeEach(() => {
  supplierAskStore.reset();
  sdcClock.reset();
});

/**
 * True when `a` comes before `b` in the document.
 * @param {Element} a
 * @param {Element} b
 */
const before = (a, b) => (a.compareDocumentPosition(b) & Node.DOCUMENT_POSITION_FOLLOWING) !== 0;

describe('S-04 · the block on the supplier To do', () => {
  it('sits above the lanes, says how many, High first, each line with its ask', async () => {
    renderWithProviders(<SupplierHome />, { identity: SUPPLIER });
    const title = await screen.findByTestId('pti-asks-title');
    expect(title).toHaveTextContent('PTI has 2 questions for you');
    const block = screen.getByTestId('pti-asks');
    const lanes = await screen.findByTestId('home-tasks');
    expect(before(block, lanes)).toBe(true);
    // RFX-D20 — the lanes are unchanged.
    expect(within(lanes).getAllByRole('heading').length).toBeGreaterThan(0);

    const lines = within(block).getAllByRole('listitem');
    expect(lines.map((l) => l.getAttribute('data-testid'))).toEqual([
      'pti-ask-ask-0001',
      'pti-ask-ask-0002'
    ]);
    const first = /** @type {HTMLElement} */ (lines[0]);
    expect(first).toHaveTextContent('High');
    expect(first).toHaveTextContent('Production date');
    expect(within(first).getByText('PK-PETB-8802')).toBeInTheDocument();
    expect(first).toHaveTextContent('When does production of this material start?');
    expect(first).toHaveTextContent(/Due\s*03/);
    const second = /** @type {HTMLElement} */ (lines[1]);
    expect(second).toHaveTextContent('Capacity gap');
    expect(second).toHaveTextContent('W38');
  });

  it('"Answer" opens the reply form; sending it records the answer and the line leaves the block', async () => {
    renderWithProviders(<SupplierHome />, { identity: SUPPLIER });
    fireEvent.click(await screen.findByTestId('pti-ask-answer-ask-0001'));
    const send = screen.getByTestId('pti-ask-send-ask-0001');
    // An empty answer is refused by the verb's own rule: the button waits.
    expect(send).toBeDisabled();
    fireEvent.change(screen.getByTestId('pti-ask-reply-ask-0001'), {
      target: { value: 'Production starts on 4 Sept.' }
    });
    fireEvent.change(screen.getByTestId('pti-ask-reply-date-ask-0001'), {
      target: { value: '2026-09-04' }
    });
    expect(send).not.toBeDisabled();
    fireEvent.click(send);
    await waitFor(() =>
      expect(screen.getByTestId('pti-asks-title')).toHaveTextContent('PTI has 1 question for you')
    );
    const row = supplierAskStore.get('ask-0001');
    expect(row?.state).toBe('Answered');
    expect(row?.history.slice(-1)[0]).toMatchObject({
      kind: 'answered',
      text: 'Production starts on 4 Sept.',
      date: '2026-09-04'
    });
  });

  it('empty: "Nothing PTI is waiting on" for a supplier PTI has not asked', async () => {
    renderWithProviders(<SupplierHome />, {
      identity: { ...SUPPLIER, supplierId: 'sup-002', supplierName: 'Other' }
    });
    expect(await screen.findByTestId('pti-asks-empty')).toHaveTextContent(
      'Nothing PTI is waiting on'
    );
    expect(screen.queryByTestId('pti-asks-title')).toBeNull();
  });

  it('a seat without the answer atom reads the asks and is told whose act it is (§84)', async () => {
    renderWithProviders(<SupplierHome />, {
      identity: { ...SUPPLIER, businessRoles: ['supplier', 'commercial'] }
    });
    expect(await screen.findByTestId('pti-asks-title')).toBeInTheDocument();
    expect(screen.getByTestId('handoff-supplierask-answer')).toBeInTheDocument();
    expect(screen.queryByTestId('pti-ask-answer-ask-0001')).toBeNull();
  });

  it('the copy has its Indonesian text', () => {
    expect(inventoryCapacityEn['supplierAsk.block.empty']).toBe('Nothing PTI is waiting on');
    expect(inventoryCapacityId['supplierAsk.block.title_other']).toBe(
      'PTI punya {{count}} pertanyaan untuk Anda'
    );
    expect(inventoryCapacityId['supplierAsk.block.empty']).toBe(
      'Tidak ada yang sedang ditunggu PTI'
    );
  });
});

describe('BL-227 · the title counts questions, not materials', () => {
  it.each([
    ['en', 1, 'PTI has 1 question for you'],
    ['en', 3, 'PTI has 3 questions for you'],
    ['id', 1, 'PTI punya 1 pertanyaan untuk Anda'],
    ['id', 3, 'PTI punya 3 pertanyaan untuk Anda']
  ])('%s, %i ask(s): "%s"', (lng, count, text) => {
    expect(i18n.getFixedT(lng)('supplierAsk.block.title', { count })).toBe(text);
  });
});

describe('S-04 · the block on the Stock page, and the menu count', () => {
  it('sits between the weekly status and the tabs', async () => {
    renderWithProviders(<SupplierInventory />, { identity: SUPPLIER });
    const block = await screen.findByTestId('pti-asks');
    await screen.findByTestId('pti-asks-title');
    expect(before(screen.getByTestId('weekly-update'), block)).toBe(true);
    expect(before(block, screen.getByRole('tablist'))).toBe(true);
  });

  it('the Stock menu item counts the asks PTI is waiting on', async () => {
    renderWithProviders(<SupplierInventory />, { identity: SUPPLIER });
    expect(await screen.findByTestId('nav-count-/supplier/inventory')).toHaveTextContent('2');
  });
});
