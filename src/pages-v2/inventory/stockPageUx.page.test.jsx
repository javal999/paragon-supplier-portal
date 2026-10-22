import { beforeEach, describe, expect, it } from 'vitest';
import { fireEvent, screen, within } from '@testing-library/react';
import { renderWithProviders, SUPPLIER } from '@test/test-utils';
import { inventoryCapacityEn, inventoryCapacityId } from '@lib/i18n/inventoryCapacity';
import { inventoryDeclarationStore } from '@services/data/mock/stores/inventoryDeclarationStore';
import { stockTemplateCsv } from '@services/transitions/inventoryRules';
import { sdcClock } from '@services/sdc';
import SupplierInventory from '../SupplierInventory';
import SupplierHome from '../SupplierHome';

// ─────────────────────────────────────────────────────────────────────────────
// Inventory UX lane 1C — the supplier Stock page and the weekly status, on the
// real pages and the sample data (sup-007, a manual supplier).
//
//   S-01  the page leads with this week and the table; feedstock, my
//         materials and the template guide are tabs.
//   S-02  one weekly status (INV-D4): the To do Stock row and the panel say
//         the same two lines; no "Stock figures to update" row, no "Missed".
//   S-03  a template row left blank is not an error (INV-D10).
// ─────────────────────────────────────────────────────────────────────────────

beforeEach(() => {
  inventoryDeclarationStore.reset();
  sdcClock.reset();
});

/**
 * True when `a` comes before `b` in the document.
 * @param {Element} a
 * @param {Element} b
 */
const before = (a, b) => (a.compareDocumentPosition(b) & Node.DOCUMENT_POSITION_FOLLOWING) !== 0;

describe('S-01 · the Stock page leads with this week and the table', () => {
  it('header actions, then the weekly status, then the tabs with the table on the first', async () => {
    renderWithProviders(<SupplierInventory />, { identity: SUPPLIER });
    const table = (await screen.findByTestId('sup-stock-row-PK-PETB-8801')).closest('table');
    const enter = screen.getByTestId('stock-entry-open');
    const upload = screen.getByTestId('stock-upload-open');
    expect(enter).toHaveTextContent(/^Enter stock on screen$/);
    expect(upload).toHaveTextContent(/^Upload template$/);
    const weekly = screen.getByTestId('weekly-update');
    const tabs = screen.getByRole('tablist');
    expect(
      within(tabs)
        .getAllByRole('tab')
        .map((t) => t.textContent)
    ).toEqual(['My stock', 'Feedstock to confirm', 'My materials', 'Template guide']);
    expect(before(upload, weekly)).toBe(true);
    expect(before(weekly, tabs)).toBe(true);
    expect(before(tabs, /** @type {Element} */ (table))).toBe(true);
    // The stacked panels moved to their tabs; the out-of-date banner is the
    // weekly status's second line now. The "PTI is asking" block (S-04, lane
    // 2A) sits between the weekly status and the tabs: ptiAsks.s04.page.test.jsx.
    expect(screen.queryByTestId('feedstock-confirm')).toBeNull();
    expect(screen.queryByTestId('stock-template-guide')).toBeNull();
    expect(screen.queryByTestId('sup-stock-banner')).toBeNull();
  });

  it('the Template guide tab holds the download, the columns and the incoming cards, not the table', async () => {
    renderWithProviders(<SupplierInventory />, { identity: SUPPLIER });
    await screen.findByTestId('sup-stock-row-PK-PETB-8801');
    fireEvent.click(screen.getByRole('tab', { name: 'Template guide' }));
    const guide = await screen.findByTestId('stock-template-guide');
    expect(within(guide).getByTestId('stock-template-download')).toBeInTheDocument();
    expect(within(guide).getByTestId('stock-template-columns')).toBeInTheDocument();
    expect(within(guide).getByTestId('stock-upload-incoming')).toBeInTheDocument();
    expect(screen.queryByTestId('sup-stock-row-PK-PETB-8801')).toBeNull();
    // The upload control stays in the header on every tab.
    expect(screen.getByTestId('stock-upload-open')).toBeInTheDocument();
  });

  it('labels in Indonesian', () => {
    expect(inventoryCapacityId['inv.sup.enterOnScreen']).toBe('Isi stok di layar');
    expect(inventoryCapacityId['inv.upload.uploadTemplate']).toBe('Unggah templat');
    expect(inventoryCapacityId['inv.sup.tab.feedstock']).toBe('Feedstock untuk dikonfirmasi');
  });
});

describe('S-02 · one weekly status on To do and on the panel (INV-D4)', () => {
  it('the To do Stock row reads as the panel: same headline, same second line; no separate rows', async () => {
    renderWithProviders(<SupplierHome />, { identity: SUPPLIER, route: '/supplier/home' });
    const row = await screen.findByTestId('home-task-weekly-update');
    const status = screen.getByTestId('weekly-status').textContent ?? '';
    expect(status).toMatch(
      /^Weekly stock update · \d+ of \d+ sent · due \w{3} \d{1,2} \w+ 23:59 WIB$/
    );
    expect(row).toHaveTextContent(status);
    const outOfDate = screen.getByTestId('weekly-out-of-date').textContent ?? '';
    expect(outOfDate).toMatch(/^\d+ out of date( since \d{1,2} \w+)?$/);
    expect(screen.getByTestId('home-task-detail-weekly-update').textContent).toBe(outOfDate);
    // The row sits in the Stock lane; the old rows and strip are gone.
    expect(
      within(screen.getByTestId('home-lane-stock')).getByTestId('home-task-weekly-update')
    ).toBe(row);
    expect(screen.queryByTestId('home-task-stale-stock')).toBeNull();
    expect(screen.queryByTestId('weekly-missed')).toBeNull();
    expect(screen.queryByText('Stock figures to update')).toBeNull();
  });

  it('the status words exist in English and Indonesian', () => {
    expect(inventoryCapacityEn['inv.weekly.sent']).toBe('{{sent}} of {{total}} sent');
    expect(inventoryCapacityId['inv.weekly.sent']).toBe('{{sent}} dari {{total}} terkirim');
    expect(inventoryCapacityEn['inv.weekly.outOfDateSince']).toBe(
      '{{count}} out of date since {{date}}'
    );
    expect(inventoryCapacityId['inv.weekly.outOfDateSince']).toBe(
      '{{count}} belum diperbarui sejak {{date}}'
    );
  });
});

describe('S-03 · template result: blank rows are not errors (INV-D10)', () => {
  it('names what was sent, counts the blank rows in neutral text, refuses nothing, under the control', async () => {
    renderWithProviders(<SupplierInventory />, { identity: SUPPLIER });
    await screen.findByTestId('stock-upload-open');
    // The downloaded template, with one material filled and the rest untouched.
    const template = stockTemplateCsv(
      [
        { materialCode: 'PK-PETB-8801', uom: 'PCS' },
        { materialCode: 'PK-PETB-8802', uom: 'PCS' },
        { materialCode: 'PK-CAPF-8820', uom: 'PCS' }
      ],
      'en'
    ).replace('PK-PETB-8801,,PCS,,,,,,,', 'PK-PETB-8801,45000,PCS,,0,,,,,');
    fireEvent.change(screen.getByTestId('stock-upload-file'), {
      target: { files: [new File([template], 'stock.csv', { type: 'text/csv' })] }
    });
    const result = await screen.findByTestId('stock-upload-result');
    expect(within(result).getByTestId('stock-upload-sent')).toHaveTextContent(
      /^Sent to PTI: PK-PETB-8801$/
    );
    const blank = within(result).getByTestId('stock-upload-blank');
    expect(blank).toHaveTextContent(/^2 rows left blank, not sent$/);
    expect(blank.className).toContain('text-text-secondary');
    expect(within(result).queryByTestId('stock-upload-refused')).toBeNull();
    expect(before(result, screen.getByTestId('weekly-update'))).toBe(true);
    expect(inventoryDeclarationStore.latestFor('sup-007', 'PK-PETB-8801')).toMatchObject({
      totalQty: 45000,
      channel: 'template'
    });
  });

  it('a filled row that breaks a rule is still refused with row, material and reason', async () => {
    renderWithProviders(<SupplierInventory />, { identity: SUPPLIER });
    await screen.findByTestId('stock-upload-open');
    const csv = [
      'Material code,Stock on hand,Unit,In-production quantity',
      'PK-PETB-8801,,PCS,0', // row 2 — filled, no stock on hand
      'PK-PETB-8802,,PCS,' // row 3 — blank
    ].join('\n');
    fireEvent.change(screen.getByTestId('stock-upload-file'), {
      target: { files: [new File([csv], 's.csv', { type: 'text/csv' })] }
    });
    const result = await screen.findByTestId('stock-upload-result');
    expect(within(result).getByTestId('stock-upload-sent')).toHaveTextContent(
      'Nothing was sent to PTI.'
    );
    expect(within(result).getByTestId('stock-upload-blank')).toHaveTextContent(
      /^1 row left blank, not sent$/
    );
    const refused = within(result).getByTestId('stock-upload-refused-row-2');
    expect(refused).toHaveTextContent('PK-PETB-8801');
    expect(refused).toHaveTextContent('Stock on hand is required');
    expect(within(result).queryByTestId('stock-upload-refused-row-3')).toBeNull();
  });

  it('the blank line in Indonesian', () => {
    expect(inventoryCapacityId['inv.upload.blank_other']).toBe(
      '{{count}} baris kosong, tidak dikirim'
    );
  });
});
