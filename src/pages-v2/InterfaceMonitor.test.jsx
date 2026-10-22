import { screen, fireEvent, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it } from 'vitest';
import { renderWithProviders } from '@test/test-utils';
import InterfaceMonitor from './InterfaceMonitor';
import BuyerOrders from './BuyerOrders';
import BuyerHome from './BuyerHome';
import { UTILITY_NAV } from '@components/layout-v2/navConfig';
import { sapMessageStore } from '@services/data/mock/stores/sapMessageStore';

// ────────────────────────────────────────────────────────────────────────────
// REQ-E07-08 — the monitor and the data-age banner, rendered.
//
// CR-20 is asserted BOTH ways on the page, not only in the rules: the transport
// failure must OFFER a retry and the business refusal must NOT, and a retry
// that succeeds must change what the monitor shows.
// ────────────────────────────────────────────────────────────────────────────

describe('Interface monitor (REQ-E07-08)', () => {
  beforeEach(() => sapMessageStore.reset());

  it('lists every interface object with its direction and its failure count', async () => {
    renderWithProviders(<InterfaceMonitor />);
    expect(await screen.findByText('Interface monitor')).toBeInTheDocument();
    for (const object of [
      'umbrellaPo',
      'goodsReceipt',
      'invoiceStatus',
      'poResponse',
      'inboundDelivery',
      'invoiceOut'
    ]) {
      expect(await screen.findByTestId(`sap-object-${object}`)).toBeInTheDocument();
      expect(await screen.findByTestId(`sap-failures-${object}`)).toBeInTheDocument();
    }
    // BR-02 — three objects each way, and the page says which way each travels.
    expect(screen.getAllByText('From SAP into the hub')).toHaveLength(3);
    expect(screen.getAllByText('From the hub into SAP')).toHaveLength(3);
  });

  it('shows the failed message with its error, its reference and its time', async () => {
    renderWithProviders(<InterfaceMonitor />);
    const row = await screen.findByTestId('sap-message-sapmsg-0001');
    expect(row).toHaveTextContent('SAP did not answer in time');
    expect(row).toHaveTextContent('SAP-GR-2026-0044');
    expect(row).toHaveTextContent('Reference');
    expect(row).toHaveTextContent('Time');
  });

  it('CR-20 — a transport failure offers a retry; a business refusal offers NONE and says why', async () => {
    renderWithProviders(<InterfaceMonitor />);
    expect(await screen.findByTestId('sap-retry-sapmsg-0001')).toBeInTheDocument();
    expect(screen.queryByTestId('sap-retry-sapmsg-0002')).not.toBeInTheDocument();
    const refused = await screen.findByTestId('sap-noretry-sapmsg-0002');
    expect(refused).toHaveTextContent('trying again will not help');
    expect(await screen.findByTestId('sap-message-sapmsg-0002')).toHaveTextContent(
      'cost centre on the order is blocked'
    );
  });

  it('a retry that succeeds updates the monitor — the message is gone', async () => {
    renderWithProviders(<InterfaceMonitor />);
    fireEvent.click(await screen.findByTestId('sap-retry-sapmsg-0001'));
    await waitFor(() =>
      expect(screen.queryByTestId('sap-message-sapmsg-0001')).not.toBeInTheDocument()
    );
    // The refusal is untouched — a retry clears what it retried and nothing else.
    expect(screen.getByTestId('sap-message-sapmsg-0002')).toBeInTheDocument();
  });
});

describe('REQ-E07-08 AC-03 — the data-age banner sits on the pages that read SAP data', () => {
  beforeEach(() => sapMessageStore.reset());

  it('purchase orders show how old the SAP data is, in plain words', async () => {
    renderWithProviders(<BuyerOrders />, { route: '/buyer/orders?view=list' });
    const banner = await screen.findByTestId('sap-data-age-banner');
    expect(banner).toHaveTextContent('SAP data last updated');
  });
});

describe('REQ-E07-08 — the Home task and the menu placement', () => {
  beforeEach(() => sapMessageStore.reset());

  it('PTI Home lists "SAP messages failed" while a retryable failure is open', async () => {
    renderWithProviders(<BuyerHome />);
    const task = await screen.findByTestId('home-task-sap-messages-failed');
    expect(task).toHaveTextContent('SAP messages failed');
  });

  it('the task DISAPPEARS once the retryable failure is cleared — a refusal alone is not a task', async () => {
    sapMessageStore.retry('sapmsg-0001', '2026-09-30T12:00:00.000Z');
    renderWithProviders(<BuyerHome />);
    await screen.findByTestId('home-task-escalated-po');
    await waitFor(() =>
      expect(screen.queryByTestId('home-task-sap-messages-failed')).not.toBeInTheDocument()
    );
  });

  it('NV-01 — the monitor is in the user menu, not the main menu', () => {
    const paths = UTILITY_NAV.buyer.map((item) => item.path);
    expect(paths).toContain('/buyer/interface-monitor');
    expect(UTILITY_NAV.supplier.map((item) => item.path)).not.toContain('/buyer/interface-monitor');
  });
});
