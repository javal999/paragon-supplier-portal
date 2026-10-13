import { screen, act } from '@testing-library/react';
import { renderWithProviders, SUPPLIER } from '@test/test-utils';
import i18n from '@lib/i18n';
import { mockDataService } from '@services/data/mock/mockDataService';
import { withChaos } from '@services/data/mock/withChaos';
import SupplierMyStorefront from './SupplierMyStorefront';
import CertificatesSection from './SupplierMyStorefront/components/CertificatesSection';
/** @import { ProfileCert, ProfileCertStatus } from '@services/data/types' */

const alwaysFails = withChaos(mockDataService, { minMs: 0, maxMs: 0, failureRate: 1 });
const alwaysPending = withChaos(mockDataService, { minMs: 1e7, maxMs: 1e7, failureRate: 0 });

describe('SupplierMyStorefront — honest states + wired reads', () => {
  it('data: renders the storefront with the scoped catalog read', async () => {
    renderWithProviders(<SupplierMyStorefront />, { identity: SUPPLIER });
    expect(await screen.findByText('My Catalog')).toBeInTheDocument();
    // A real sup-007 catalog material proves useStorefrontCatalog drove the table.
    expect(await screen.findByText('PET Bottle 100ml Airless Pump')).toBeInTheDocument();
  });

  it('loading: shows LoadingState while the supplier read is pending', () => {
    renderWithProviders(<SupplierMyStorefront />, {
      identity: SUPPLIER,
      service: alwaysPending
    });
    expect(screen.getByText('Loading…')).toBeInTheDocument();
    expect(screen.queryByText('My Catalog')).not.toBeInTheDocument();
  });

  it('error: shows ErrorState when the supplier read throws', async () => {
    renderWithProviders(<SupplierMyStorefront />, {
      identity: SUPPLIER,
      service: alwaysFails
    });
    expect(await screen.findByText('Unable to load this page')).toBeInTheDocument();
  });
});

// Certificate-status pills: `CERT_LABEL` holds the CANONICAL EN status tokens,
// and StatusPill localizes canonical tokens centrally (statusLabel.js), so the
// pill already reads Indonesian in ID. Pinned here so a future re-key of
// `CERT_LABEL` to non-canonical text (which StatusPill would pass through
// verbatim) fails loudly instead of leaking English.
describe('SupplierMyStorefront — certificate status pills localize', () => {
  afterEach(async () => {
    await act(async () => {
      await i18n.changeLanguage('en');
    });
  });

  /** @type {ProfileCertStatus[]} */
  const statuses = ['valid', 'expiring', 'expired', 'missing', 'pending'];
  /** @type {ProfileCert[]} */
  const certs = statuses.map((status) => ({
    supplierId: 'sup-007',
    name: `Cert ${status}`,
    visible: true,
    status,
    expiry: null
  }));

  it('renders every status in Indonesian under the ID locale', async () => {
    await act(async () => {
      await i18n.changeLanguage('id');
    });
    renderWithProviders(<CertificatesSection certs={certs} toggleCertVisibility={() => {}} />, {
      identity: SUPPLIER
    });
    for (const id of ['Berlaku', 'Akan Kedaluwarsa', 'Kedaluwarsa', 'Hilang', 'Menunggu']) {
      expect(screen.getByText(id)).toBeInTheDocument();
    }
    for (const en of ['Valid', 'Expiring', 'Expired', 'Missing', 'Pending']) {
      expect(screen.queryByText(en)).not.toBeInTheDocument();
    }
  });
});
