/** @import React from 'react' */
import { useTranslation } from 'react-i18next';
import Button from '@components/ui-v2/Button';
import SidePanel from '@components/ui-v2/SidePanel';
import ActionPanelBody from './ActionPanelBody';
/** @import { Action } from '../const' */

/**
 * The side panel for the planner's action (BR-05): titled by the action, its
 * confirm switched off until the note (revise, reassign) and the target
 * supplier (reassign) are given — and naming the field it waits for (C2,
 * WCAG 4.1.2) — and the body from `ActionPanelBody`. Closed while `action` is
 * null.
 * @type {React.FC<{
 *   action: Action | null;
 *   onClose: () => void;
 *   pending: boolean;
 *   note: string;
 *   onNoteChange: (note: string) => void;
 *   toSupplier: string;
 *   onToSupplierChange: (id: string) => void;
 *   onSubmit: () => Promise<void>;
 *   periodLabel: (bucket: string) => string;
 * }>}
 */
const ActionPanel = ({
  action,
  onClose,
  pending,
  note,
  onNoteChange,
  toSupplier,
  onToSupplierChange,
  onSubmit,
  periodLabel
}) => {
  const { t } = useTranslation();
  return (
    <SidePanel
      open={action !== null}
      onClose={onClose}
      title={action ? t(`fc.pti.gaps.panel.${action.kind}`) : ''}
      footerActions={
        action ? (
          <Button
            variant="outline"
            data-testid="fc-action-submit"
            disabled={
              pending ||
              (action.kind !== 'accept' && note.trim() === '') ||
              (action.kind === 'reassign' && toSupplier === '')
            }
            // C2 (WCAG 4.1.2): a switched-off confirm names the field it waits for.
            aria-describedby={
              [
                action.kind === 'reassign' && toSupplier === '' ? 'fc-reassign-why' : null,
                action.kind !== 'accept' && note.trim() === '' ? 'fc-action-note-hint' : null
              ]
                .filter(Boolean)
                .join(' ') || undefined
            }
            onClick={() => void onSubmit()}
          >
            {t(`fc.pti.gaps.panel.confirm.${action.kind}`)}
          </Button>
        ) : undefined
      }
    >
      {action && (
        <ActionPanelBody
          action={action}
          note={note}
          onNoteChange={onNoteChange}
          toSupplier={toSupplier}
          onToSupplierChange={onToSupplierChange}
          periodLabel={periodLabel}
        />
      )}
    </SidePanel>
  );
};

export default ActionPanel;
