import { useTranslation } from 'react-i18next';
import Button from '@components/ui-v2/Button';
import Data from '@components/ui-v2/Data';
import ModalOverlay from '@components/ui-v2/ModalOverlay';

// ─────────────────────────────────────────────────────────────────────────────
// UCX-P2 v2 (BL-363) — THE REVIEW STEP OF A BULK CONFIRM.
//
// The safeguard the ruling leans on: nothing is sent from the list. The dialog
// repeats every selected record with its quantity and date, so the supplier
// answers over the figures rather than over a count. A refused record is
// reported here with its reason while the others stay confirmed (the
// [Proposed] partial-failure default: no rollback).
//
// Shared by Purchase orders and Call-offs: the page supplies the labels and
// the rows; this component owns no rule.
// ─────────────────────────────────────────────────────────────────────────────

/**
 * @typedef {{
 *   readonly key: string;
 *   readonly title: string;
 *   readonly facts: readonly string[];
 * }} BulkReviewRow
 */

/**
 * @typedef {{
 *   readonly done: readonly string[];
 *   readonly refused: readonly { title: string; reason: string }[];
 * }} BulkReviewResult
 */

/**
 * @param {{
 *   readonly open: boolean;
 *   readonly title: string;
 *   readonly intro: string;
 *   readonly rows: readonly BulkReviewRow[];
 *   readonly confirmLabel: string;
 *   readonly onConfirm: () => void;
 *   readonly onClose: () => void;
 *   readonly busy: boolean;
 *   readonly result: BulkReviewResult | null;
 * }} props
 */
const BulkReviewDialog = ({
  open,
  title,
  intro,
  rows,
  confirmLabel,
  onConfirm,
  onClose,
  busy,
  result
}) => {
  const { t } = useTranslation();
  if (!open) return null;
  return (
    <ModalOverlay label={title} onClose={onClose} testId="bulk-confirm-dialog">
      <div className="w-full max-w-lg bg-bg-surface border border-border-subtle rounded-lg shadow-lg p-5">
        <h2 className="text-section text-text-primary mb-1">{title}</h2>
        <p className="text-sm text-text-secondary mb-3" data-testid="bulk-confirm-intro">
          {intro}
        </p>
        <ul className="space-y-2 mb-3" data-testid="bulk-confirm-list">
          {rows.map((r) => (
            <li
              key={r.key}
              className="text-sm text-text-primary"
              data-testid={`bulk-confirm-row-${r.key}`}
            >
              <Data className="font-semibold">{r.title}</Data>
              {r.facts.map((f) => (
                <span key={f} className="block text-xs text-text-secondary">
                  {f}
                </span>
              ))}
            </li>
          ))}
        </ul>
        {result ? (
          <div className="mb-3 space-y-1" data-testid="bulk-confirm-result">
            <p className="text-sm text-text-primary">
              {t('bulk.confirm.done', { count: result.done.length })}
            </p>
            {result.refused.map((r) => (
              <p
                key={r.title}
                className="text-sm text-warning-hover"
                data-testid="bulk-confirm-refused"
              >
                {t('bulk.confirm.refused', { record: r.title, reason: r.reason })}
              </p>
            ))}
          </div>
        ) : null}
        <div className="flex justify-end gap-2">
          <Button variant="secondary" onClick={onClose} data-testid="bulk-confirm-close">
            {t('bulk.confirm.close')}
          </Button>
          <Button
            variant="outline"
            disabled={busy || rows.length === 0}
            onClick={onConfirm}
            data-testid="bulk-confirm-submit"
          >
            {confirmLabel}
          </Button>
        </div>
      </div>
    </ModalOverlay>
  );
};

export default BulkReviewDialog;
