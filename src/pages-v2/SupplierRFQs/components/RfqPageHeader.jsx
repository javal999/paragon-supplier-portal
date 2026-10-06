/** @import React from 'react' */
import { useTranslation } from 'react-i18next';
import { Link } from 'react-router-dom';
import PageHeader from '@components/ui-v2/PageHeader';
import PageMetaLine from '@components/ui-v2/PageMetaLine';
import ProvenanceMarker from '@components/ui-v2/ProvenanceMarker';

/**
 * @typedef {object} RfqPageHeaderProps
 * @property {string[]} crumb -  The eyebrow: the menu section alone (the `PageHeader` rule).
 * @property {string} supplierName -  The seat's supplier, named in the subtitle.
 * @property {number} openCount -  RFQs still waiting on this supplier (declined ones excluded).
 * @property {number} submittedCount -  This supplier's quotation versions.
 */

/**
 * The page header: title with the open count, the meta line (open events and
 * quotes, with the provenance marker), and the link to the negotiation rounds.
 * @type {React.FC<RfqPageHeaderProps>}
 */
const RfqPageHeader = ({ crumb, supplierName, openCount, submittedCount }) => {
  const { t } = useTranslation();
  return (
    <>
      <PageHeader
        breadcrumb={crumb}
        title={t('rfqs.header.title')}
        count={openCount}
        subtitle={t('rfqs.header.subtitle', { supplier: supplierName })}
      />

      <PageMetaLine className="-mt-6 mb-6">
        {openCount} {t(openCount !== 1 ? 'rfqs.meta.event.other' : 'rfqs.meta.event.one')} ·{' '}
        {submittedCount} {t(submittedCount !== 1 ? 'rfqs.meta.quote.other' : 'rfqs.meta.quote.one')}
        {/* D-CENSUS-8 — PARTLY REAL, both axes. Quotation submit dispatches through
            the wired `quotation` target and drives the real RFQ→award cascade; the
            RFQs being answered are fixtures. */}
        <ProvenanceMarker capability="rfqs" className="ml-3 align-middle" />
      </PageMetaLine>

      {/* The supplier's negotiation thread sits under this module (its route is
          /supplier/rfq/rounds), so it is reached from here and the RFQ menu item
          stays highlighted on it (NV-03). */}
      <div className="flex justify-end mb-4">
        <Link
          to="/supplier/rfq/rounds"
          className="text-sm text-action hover:underline"
          data-testid="rfq-rounds-link"
        >
          {t('rfqs.rounds.link')}
        </Link>
      </div>
    </>
  );
};

export default RfqPageHeader;
