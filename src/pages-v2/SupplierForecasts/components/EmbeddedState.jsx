/** @import React from 'react' */
import { useTranslation } from 'react-i18next';
import Button from '@components/ui-v2/Button';
import { useCurrentIdentity } from '@context/CurrentIdentityContext';

/**
 * P-04 (IA-S03) — the honest states (loading, error, no supplier, empty) when
 * the hub is a tab of the supplier's commitments page. The full-page states
 * each render their own shell, which a tab inside another page's shell must
 * not; these say the same things, inline.
 * @type {React.FC<{
 *   kind: 'loading' | 'error' | 'noSupplier' | 'empty';
 *   supplierName?: string;
 *   onRetry?: () => void;
 * }>}
 */
const EmbeddedState = ({ kind, supplierName = '', onRetry }) => {
  const { t } = useTranslation();
  const { identity } = useCurrentIdentity();
  const arm = identity.personaType === 'supplier' ? 'unresolvedTenant' : 'noSupplier';
  const heading =
    kind === 'error'
      ? t('errorState.heading')
      : kind === 'noSupplier'
        ? t(`identity.${arm}.heading`)
        : kind === 'empty'
          ? t('sdcSup.empty.title')
          : null;
  const body =
    kind === 'loading'
      ? t('loadingState.message')
      : kind === 'error'
        ? t('errorState.subtitle')
        : kind === 'noSupplier'
          ? t(`identity.${arm}.body`)
          : `${t('sdcSup.empty.subtitle', { supplier: supplierName })} ${t('sdcSup.empty.message')}`;
  return (
    <div
      role={kind === 'error' ? 'alert' : 'status'}
      className="py-10 px-6 flex flex-col items-center text-center"
      data-testid={`sdcsup-embedded-${kind}`}
    >
      {heading ? (
        <div className="text-base font-semibold text-text-primary mb-1">{heading}</div>
      ) : null}
      <div className="text-sm text-text-tertiary">{body}</div>
      {onRetry ? (
        <Button variant="secondary" onClick={onRetry} className="mt-4">
          {t('errorState.retry')}
        </Button>
      ) : null}
    </div>
  );
};

export default EmbeddedState;
