// ────────────────────────────────────────────────────────────────────────────
// BL-93 — EDITING A DRAFT RFI, RFP OR RFQ: the pieces the three surfaces share.
//
// - `DraftRevisionNote` is the CE-08 trail on the event: who last edited the
//   draft and when. It reads `revisions`, which the revise-draft verbs append
//   (the session's actor, the store's clock — never the payload's).
// - `draftEditRefusal` says a STALE_STATE refusal in the buyer's words: the
//   draft was sent (or cancelled) by someone else while this buyer edited, and
//   the verb refused rather than overwrite it.
// ────────────────────────────────────────────────────────────────────────────

import React from 'react';
import { useTranslation } from 'react-i18next';
import type { TFunction } from 'i18next';
import Data from '@components/ui-v2/Data';
import { formatDate } from '@lib/format';
import type { ActorAttribution, UnattributedReason } from '@lib/enforcement';
import type { DraftRevision } from '@services/sourcing/types';

const UNATTRIBUTED_KEY: Record<UnattributedReason, string> = {
  NO_PERSON_IN_SESSION: 'rfxEdit.who.noPerson',
  IDENTITY_PROVIDER_UNAVAILABLE: 'rfxEdit.who.idpDown',
};

/**
 * An RFx actor as the lane names it: the person, or the lane's wording for why
 * nobody could be named. Party-neutral, so a supplier's upload (CE-11i) reads
 * through it as a buyer's draft edit does.
 */
export const rfxActorName = (t: TFunction, actor: ActorAttribution): string =>
  actor.kind === 'RESOLVED' ? actor.person.displayName : t(UNATTRIBUTED_KEY[actor.reason]);

/** "Last edited 22 Sep 2026 by …" — nothing when the draft was never edited. */
export const DraftRevisionNote: React.FC<{ revisions?: readonly DraftRevision[]; testId: string }> = ({
  revisions,
  testId,
}) => {
  const { t } = useTranslation();
  const last = revisions && revisions.length > 0 ? revisions[revisions.length - 1] : undefined;
  if (!last) return null;
  return (
    <p className="text-xs text-text-tertiary mt-1" data-testid={testId}>
      {t('rfxEdit.lastEdited')} <Data>{formatDate(last.at)}</Data> {t('rfxEdit.by', { who: rfxActorName(t, last.by) })}
    </p>
  );
};

/** The buyer-language text for a revise/send refusal, or `null` to use the generic one. */
export const draftEditRefusal = (t: TFunction, reason: string | undefined): string | null =>
  reason && reason.startsWith('STALE_STATE') ? t('rfxEdit.toast.stale') : null;
