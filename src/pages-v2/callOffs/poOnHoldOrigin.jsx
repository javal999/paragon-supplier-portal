/** @import React from 'react' */
import { useTranslation } from 'react-i18next';
import { Link } from 'react-router-dom';
import StatusPill from '@components/ui-v2/StatusPill';
import TermTip from '@components/forecast/TermTip';

// ─────────────────────────────────────────────────────────────────────────────
// A call-off the end-of-grace execution of a PO On Hold line created
// (`origin: 'poOnHold'`, PEX-8). It has no author on the Call-offs page, so the
// row says where it came from: a quiet marker, an (i) tip in plain words, and a
// link to the PO On Hold line. The words are i18n keys in both locales; the tip
// reads them in the active language the way the glossary tips do. The name
// "PO On Hold" is the agreed label (`poh.title`), and the page it points to is
// named with that page's own nav label. [Proposed] wording, no source in the
// docs for the marker itself.
// ─────────────────────────────────────────────────────────────────────────────

/**
 * @type {React.FC<{ testId: string; persona: 'buyer' | 'supplier' }>}
 */
export const PoOnHoldOriginMarker = ({ testId, persona }) => {
  const { t, i18n } = useTranslation();
  const pageKey = persona === 'buyer' ? 'hub.nav.pti.stockCheck' : 'hub.nav.sup.fsReconcile';
  /** @param {'en' | 'id'} lng */
  const text = (lng) => {
    const fixed = i18n.getFixedT(lng);
    return fixed('co.origin.poOnHold.tip', { page: fixed(pageKey) });
  };
  const label = t('co.origin.poOnHold');
  return (
    <span className="inline-flex flex-wrap items-center gap-1" data-testid={testId}>
      <StatusPill variant="neutral">{label}</StatusPill>
      <TermTip
        entry={{ en: text('en'), id: text('id'), label: { en: label, id: label } }}
        name={label}
        slugId="po-on-hold-origin"
      />
      <Link
        to={persona === 'buyer' ? '/buyer/fs-reconcile' : '/supplier/fs-reconcile'}
        className="text-[length:var(--fs-label-3)] text-action-hover hover:underline"
        data-testid={`${testId}-link`}
      >
        {t('poh.link.go')}
      </Link>
    </span>
  );
};
