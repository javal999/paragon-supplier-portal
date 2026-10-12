/** @import React from 'react' */
import { useTranslation } from 'react-i18next';
import Button from '@components/ui-v2/Button';
import SidePanel from '@components/ui-v2/SidePanel';
import ActionPanelBody from './ActionPanelBody';
import { moveView } from '../utils';
/** @import { Action } from '../const' */

/**
 * The side panel for the planner's action (BR-05): titled by the action, its
 * confirm switched off until the note (revise, reassign) is given and, for
 * Move demand, until the quantities pass the shortfall rule (CAP-8 BR-03) —
 * and naming what it waits for (C2, WCAG 4.1.2) — and the body from
 * `ActionPanelBody`. Closed while `action` is null.
 * @type {React.FC<{
 *   action: Action | null;
 *   onClose: () => void;
 *   pending: boolean;
 *   note: string;
 *   onNoteChange: (note: string) => void;
 *   qtys: Readonly<Record<string, string>>;
 *   onQtyChange: (supplierId: string, raw: string) => void;
 *   headroomOf: (supplierId: string) => number | null;
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
  qtys,
  onQtyChange,
  headroomOf,
  onSubmit,
  periodLabel
}) => {
  const { t } = useTranslation();
  const move = action?.kind === 'reassign' ? moveView(action.line, qtys) : null;
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
              (move !== null && move.refused !== null)
            }
            // C2 (WCAG 4.1.2): a switched-off confirm names the field it waits for.
            aria-describedby={
              [
                move !== null && move.refused !== null ? 'fc-reassign-why' : null,
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
          move={move}
          qtys={qtys}
          onQtyChange={onQtyChange}
          headroomOf={headroomOf}
          periodLabel={periodLabel}
        />
      )}
    </SidePanel>
  );
};

export default ActionPanel;
