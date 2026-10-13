/** @import React from 'react' */
/** @import { RfpEventView } from '@services/sourcing/views' */
/** @import { VerbAvailability } from '@services/transitions/handoff' */
/** @import { RfxCommandVars } from '@services/query/commandHooks' */
import { useTranslation } from 'react-i18next';
import Button from '@components/ui-v2/Button';
import { HandoffNotice } from '@components/ui-v2/HandoffNotice';

/**
 * The acts the open event's STATE allows: Edit draft / Send / Discard on a
 * Draft, Close on an Open one. `create` gates Edit (`rfp:create`), `publish`
 * gates the rest (`rfp:publish`); every verb goes through the page's `run`.
 * Moved out of `BuyerRfp.jsx` by the Phase 5 page split (no behaviour change).
 * @type {React.FC<{
 *   open: RfpEventView;
 *   create: VerbAvailability;
 *   publish: VerbAvailability;
 *   run: (vars: RfxCommandVars, successKey: string) => void;
 *   setEditingId: (id: string | null) => void;
 * }>}
 */
const RfpEventActions = ({ open, create, publish, run, setEditingId }) => {
  const { t } = useTranslation();
  return (
    <div className="flex flex-wrap items-center gap-3">
      {open.status === 'Draft' &&
        (create.kind === 'held' ? (
          <Button
            variant="secondary"
            onClick={() => setEditingId(open.id)}
            data-testid={`rfp-edit-${open.id}`}
          >
            {t('rfxEdit.edit')}
          </Button>
        ) : (
          <HandoffNotice availability={create} testId={`handoff-rfp-edit-${open.id}`} />
        ))}
      {open.status === 'Draft' && (
        <Button
          variant="outline"
          disabled={publish.kind !== 'held'}
          data-testid={`rfp-send-${open.id}`}
          onClick={() => run({ verb: 'publishRfp', rfpId: open.id }, 'rfx.toast.published')}
        >
          {t('rfx.rfp.publish')}
        </Button>
      )}
      {/* BL-93 — DISCARD a draft: the existing `t_rfp_cancel` (legal
          from Draft), the same `rfp:publish` atom as Send; a seat
          without it reads the page's publish notice. */}
      {open.status === 'Draft' && (
        <Button
          variant="secondary"
          className="text-danger"
          disabled={publish.kind !== 'held'}
          data-testid={`rfp-discard-${open.id}`}
          onClick={() => run({ verb: 'discardRfp', rfpId: open.id }, 'rfxEdit.toast.discarded')}
        >
          {t('rfxEdit.discard')}
        </Button>
      )}
      {open.status === 'Open' && (
        <Button
          variant="secondary"
          disabled={publish.kind !== 'held'}
          data-testid={`rfp-close-${open.id}`}
          onClick={() => run({ verb: 'closeRfp', rfpId: open.id }, 'rfx.toast.closed')}
        >
          {t('rfx.rfp.closeEvent')}
        </Button>
      )}
    </div>
  );
};

export default RfpEventActions;
