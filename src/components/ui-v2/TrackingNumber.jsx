/** @import * as React from 'react' */
import { useSyncExternalStore } from 'react';
import { useTranslation } from 'react-i18next';
import { ExternalLink } from 'lucide-react';
import Data from './Data';
import { threePlStore, trackingUrlFor } from '@services/transitions/threePlStore';

// ─────────────────────────────────────────────────────────────────────────────
// AN ASN'S TRACKING NUMBER — BL-51, REQ-E07-04 BR-05.
//
// ONE component for every surface that shows an ASN's tracking number, supplier
// and PTI alike, so the rule cannot differ between screens:
//   · the ASN names a 3PL on the administrator's list, and that 3PL has a public
//     tracking address → the number is a link that opens the 3PL's page in a
//     new tab (`rel="noopener noreferrer"`: the 3PL's page gets no handle on
//     this window and no referrer);
//   · no 3PL, an unknown 3PL, or no real number yet → plain text, as before.
//
// ⚠️ THE ONE PLACE A DATA TOKEN IS A LINK, AND IT SAYS SO. DP-3 keeps
// identifiers out of the action colour so a value never reads as clickable.
// This value IS clickable, so it takes the action colour, an underline and the
// external-link icon — and the screen-reader label says a new tab opens.
// Nothing is read back from the 3PL's site.
// ─────────────────────────────────────────────────────────────────────────────

/**
 * @typedef {Object} TrackingNumberProps
 * @property {string} [threePlId]
 * @property {string} trackingNumber
 * @property {string} [className]
 * @property {string} [testId]
 */

/**
 * @param {TrackingNumberProps} props
 * @returns {React.ReactNode}
 */
const TrackingNumber = ({ threePlId, trackingNumber, className = '', testId }) => {
  const { t } = useTranslation();
  // Re-render when the administrator changes the list.
  useSyncExternalStore(threePlStore.subscribe, threePlStore.version, threePlStore.version);
  const href = trackingUrlFor(threePlId, trackingNumber);
  const name = threePlId ? threePlStore.get(threePlId)?.name : undefined;

  if (href === null) {
    return (
      <Data className={className} data-testid={testId} data-tracking="plain">
        {trackingNumber || '—'}
      </Data>
    );
  }
  return (
    <a
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      data-testid={testId}
      data-tracking="link"
      title={t('tpl.link.title', { name })}
      className={`inline-flex items-center gap-1 font-mono tabular-nums text-action underline underline-offset-2 hover:text-action-hover ${className}`}
    >
      {trackingNumber}
      <ExternalLink size={12} aria-hidden="true" />
      <span className="sr-only">{t('tpl.link.newTab', { name })}</span>
    </a>
  );
};

export default TrackingNumber;
