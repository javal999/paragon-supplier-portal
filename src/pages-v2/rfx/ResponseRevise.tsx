import React from 'react';
import { useTranslation } from 'react-i18next';
import Button from '@components/ui-v2/Button';
import Data from '@components/ui-v2/Data';
import { formatDateTime } from '@lib/format';
import type { ResponseVersion } from '@services/sourcing/types';

// ─────────────────────────────────────────────────────────────────────────────
// NR-1 BR-08 (D-6) — "Revise response" on a SUBMITTED RFI or RFP response, and
// the version it stands at. Shared by `SupplierRfi` and `SupplierRfp`, so both
// say the same thing in the same place.
//
// Before the deadline the action re-opens the form on the latest version and
// the page dispatches the REVISE verb (never a save: the save verb refuses a
// Submitted response). After the deadline the action is ABSENT, not disabled,
// and the page says the response is read-only; the verb refuses anyway (AC-07).
// ─────────────────────────────────────────────────────────────────────────────

/** "Version n · submitted on <when>", for the latest submitted version. */
export const ResponseVersionLine: React.FC<{
  versions: readonly ResponseVersion<unknown>[];
  testId: string;
}> = ({ versions, testId }) => {
  const { t } = useTranslation();
  const latest = versions[versions.length - 1];
  if (!latest) return null;
  return (
    <p className="text-xs text-text-secondary" data-testid={testId}>
      {t('rfx.version.label', { n: latest.number })} · {t('rfx.version.submittedOn')}{' '}
      <Data>{formatDateTime(latest.submittedAt)}</Data>
    </p>
  );
};

export const ReviseControls: React.FC<{
  /** The deadline in force for this supplier has not passed and the event is Open. */
  windowOpen: boolean;
  /** The seat holds the answer atom (else the page's handoff notice speaks). */
  held: boolean;
  revising: boolean;
  /** The event is Closed or Cancelled: the page already says so. */
  closed: boolean;
  nextVersion: number;
  /** Something the verb would refuse is still open on the form. */
  blocked: boolean;
  onStart: () => void;
  onCancel: () => void;
  onSend: () => void;
  testIdPrefix: string;
}> = ({ windowOpen, held, revising, closed, nextVersion, blocked, onStart, onCancel, onSend, testIdPrefix }) => {
  const { t } = useTranslation();
  if (!windowOpen) {
    return closed ? null : (
      <p className="text-sm text-text-secondary bg-bg-hover rounded px-3 py-2" data-testid={`${testIdPrefix}-readonly`}>
        {t('rfx.revise.readOnly')}
      </p>
    );
  }
  if (!held) return null;
  if (!revising) {
    return (
      <div className="flex flex-wrap gap-3">
        <Button variant="outline" onClick={onStart} data-testid={`${testIdPrefix}-revise`}>
          {t('rfx.revise.action')}
        </Button>
      </div>
    );
  }
  return (
    <div className="space-y-3">
      <p className="text-sm text-action-hover bg-action-soft rounded px-3 py-2" data-testid={`${testIdPrefix}-revising`}>
        {t('rfx.revise.editing', { next: nextVersion })}
      </p>
      <div className="flex flex-wrap gap-3">
        <Button variant="secondary" onClick={onCancel} data-testid={`${testIdPrefix}-revise-cancel`}>
          {t('rfx.revise.cancel')}
        </Button>
        <Button variant="outline" disabled={blocked} onClick={onSend} data-testid={`${testIdPrefix}-revise-send`}>
          {t('rfx.revise.send')}
        </Button>
      </div>
    </div>
  );
};
