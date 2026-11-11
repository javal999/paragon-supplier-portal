// ─────────────────────────────────────────────────────────────────────────────
// User feedback 2026-11-10 (item 1 Owner-ruled 2026-11-10, raw only):
// 1. a raw material's stock entry needs its batches, each with an expiry date
//    (the warehouse controls near-expiry stock by batch); packaging is unchanged;
// 2. "Download template" sits in the Stock page header beside "Upload template".
// ─────────────────────────────────────────────────────────────────────────────

import { screen, fireEvent, within } from '@testing-library/react';
import { beforeEach, describe, expect, it } from 'vitest';
import { renderWithProviders, SUPPLIER } from '@test/test-utils';
import { inventoryDeclarationStore } from '@services/data/mock/stores/inventoryDeclarationStore';
import SupplierInventory from '../SupplierInventory';

/** sup-002 supplies raw materials (RM-EMUL-3310, ROH, unit KG). */
const RAW_SUPPLIER = { ...SUPPLIER, supplierId: 'sup-002', supplierName: 'Sample raw supplier' };

const panel = () =>
  within(/** @type {HTMLElement} */ (document.querySelector('aside[role="dialog"]')));

beforeEach(() => inventoryDeclarationStore.reset());

/** @param {string} material @param {typeof SUPPLIER} identity */
const openWith = async (material, identity) => {
  renderWithProviders(<SupplierInventory />, { identity });
  fireEvent.click(await screen.findByTestId('stock-entry-open'));
  fireEvent.change(panel().getByLabelText('Material'), { target: { value: material } });
  fireEvent.change(panel().getByLabelText(/^Stock on hand/), { target: { value: '100' } });
  fireEvent.change(panel().getByLabelText(/^In production/), { target: { value: '0' } });
};

describe('raw material: batches with expiry are required on the stock entry form', () => {
  it('blocks Save without a batch, then without an expiry, and allows it with both', async () => {
    await openWith('RM-EMUL-3310', RAW_SUPPLIER);
    expect(panel().getByTestId('stock-entry-batches-label')).toHaveTextContent(
      'Batches (required for raw material)'
    );
    expect(panel().getByTestId('stock-entry-raw-hint')).toBeInTheDocument();
    expect(panel().getByTestId('stock-entry-raw-batch')).toHaveTextContent(
      'This is a raw material: add its batches'
    );
    expect(panel().getByTestId('stock-entry-submit')).toBeDisabled();

    fireEvent.click(panel().getByRole('button', { name: 'Add batch' }));
    fireEvent.change(panel().getByLabelText('Batch number'), { target: { value: 'B-1' } });
    fireEvent.change(panel().getByLabelText('Quantity'), { target: { value: '100' } });
    expect(panel().getByTestId('stock-entry-raw-batch')).toHaveTextContent(
      'every batch needs its expiry date'
    );
    expect(panel().getByTestId('stock-entry-submit')).toBeDisabled();

    fireEvent.change(panel().getByLabelText(/^Expiry date/), { target: { value: '2027-06-30' } });
    expect(panel().queryByTestId('stock-entry-raw-batch')).toBeNull();
    expect(panel().getByTestId('stock-entry-submit')).toBeEnabled();
  });

  it('packaging keeps batches optional (known-good: Save is enabled with no batch)', async () => {
    await openWith('PK-PETB-8801', SUPPLIER);
    expect(panel().getByTestId('stock-entry-batches-label')).toHaveTextContent(
      'Batches (optional)'
    );
    expect(panel().queryByTestId('stock-entry-raw-hint')).toBeNull();
    expect(panel().getByTestId('stock-entry-submit')).toBeEnabled();
  });
});

describe('the Stock page header offers the template download', () => {
  it('shows Download template beside Upload template', async () => {
    renderWithProviders(<SupplierInventory />, { identity: SUPPLIER });
    expect(await screen.findByTestId('stock-template-download-header')).toHaveTextContent(
      'Download template'
    );
    expect(screen.getByTestId('stock-upload-open')).toBeInTheDocument();
  });
});
