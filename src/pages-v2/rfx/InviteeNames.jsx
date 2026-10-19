/** @import React from 'react' */
import { useTranslation } from 'react-i18next';
import { useInviteeCandidates } from '@services/query/hooks';

/**
 * RFx UX 2A (B-11) — the invited suppliers BY NAME on a wizard's Review step,
 * where it read "1 selected". Names come from the candidate read the invitee
 * step picked them from; an id the read does not list (it left the pool since)
 * is shown as the id rather than dropped, so the count never shrinks silently.
 * @type {React.FC<{ supplierIds: readonly string[]; testId: string }>}
 */
const InviteeNames = ({ supplierIds, testId }) => {
  const { t } = useTranslation();
  const candidates = useInviteeCandidates();
  if (supplierIds.length === 0)
    return <span data-testid={testId}>{t('rfx.create.review.noInvitees')}</span>;
  // While the read loads, the count — never a list of raw ids.
  if (candidates.isPending)
    return (
      <span data-testid={testId}>{t('rfx.invite.selected', { count: supplierIds.length })}</span>
    );
  const nameOf = (/** @type {string} */ id) =>
    (candidates.data?.items ?? []).find((c) => c.supplierId === id)?.supplierName ?? id;
  return (
    <ul className="list-disc pl-5 space-y-0.5" data-testid={testId}>
      {supplierIds.map((id) => (
        <li key={id}>{nameOf(id)}</li>
      ))}
    </ul>
  );
};

export default InviteeNames;
