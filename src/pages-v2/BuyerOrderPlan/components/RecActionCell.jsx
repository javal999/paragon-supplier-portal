/** @import React from 'react' */
import { useTranslation } from 'react-i18next';
import StatusPill from '@components/ui-v2/StatusPill';
import TableCell from '@components/ui-v2/TableCell';
import Button from '@components/ui-v2/Button';
import { HandoffNotice } from '@components/ui-v2/HandoffNotice';
import OpenCallOffLink from '../../callOffs/OpenCallOffLink';
/** @import { VerbAvailability } from '@services/transitions/handoff' */
/** @import { Recommendation } from '@services/engine/orderSizing' */
/** @import { umbrellaLineFor } from '@pages-v2/orderPlan/orderPlanRelease' */

/**
 * @typedef {NonNullable<ReturnType<typeof umbrellaLineFor>>} UmbrellaLine
 */

/**
 * @typedef {object} RecActionCellProps
 * @property {Recommendation} r The recommendation this cell acts on.
 * @property {UmbrellaLine | null} line The supplier's open umbrella line for the material, if any.
 * @property {string | null} draftId The call-off this page drafted for it, or `null` (`''` when the command named no id).
 * @property {VerbAvailability} planAvailability The seat's answer for `calloff:plan`.
 * @property {boolean} pending A draft command is in flight (disables the button).
 * @property {boolean} releaseWithheld X-03: release refuses engine drafts while the dataset is not live.
 * @property {(r: Recommendation, line: UmbrellaLine) => Promise<void>} onDraft Drafts the call-off.
 */

/**
 * The "Action" cell of a recommended order (BR-05): no umbrella PO line (with
 * the reason read out), already drafted (with the link to that draft on
 * Call-offs, IA-B13), the Draft button for a seat holding
 * `calloff:plan` (with the PO it lands on and the X-03 release note), or the
 * handoff notice naming who acts instead.
 * @type {React.FC<RecActionCellProps>}
 */
const RecActionCell = ({
  r,
  line,
  draftId,
  planAvailability,
  pending,
  releaseWithheld,
  onDraft
}) => {
  const { t } = useTranslation();
  return (
    <TableCell className="align-top">
      {!line ? (
        // C2 (WCAG 1.3.1): the reason is read out too, not only shown on hover.
        <span
          title={t('op.action.noPo.hint')}
          data-testid={`op-nopo-${r.materialCode}-${r.weekStart}`}
        >
          <StatusPill variant="neutral">{t('op.action.noPo')}</StatusPill>
          <span className="sr-only">{t('op.action.noPo.hint')}</span>
        </span>
      ) : draftId !== null ? (
        <div>
          <StatusPill variant="success">{t('op.action.drafted')}</StatusPill>
          {draftId ? (
            <div>
              <OpenCallOffLink
                callOffId={draftId}
                label={t('op.action.openDraft')}
                testId={`op-open-draft-${r.materialCode}-${r.weekStart}`}
              />
            </div>
          ) : null}
        </div>
      ) : planAvailability.kind === 'held' ? (
        <div>
          <Button
            variant="outline"
            onClick={() => void onDraft(r, line)}
            disabled={pending}
            data-testid={`op-draft-${r.materialCode}-${r.weekStart}`}
          >
            {t('op.action.draft')}
          </Button>
          <div className="text-xs text-text-tertiary mt-1">
            {t('op.action.onPo', { po: line.po.poNumber })}
          </div>
          {releaseWithheld && (
            <div
              className="text-xs text-warning-hover mt-1 max-w-[16rem]"
              data-testid={`op-release-withheld-${r.materialCode}-${r.weekStart}`}
            >
              {t('op.action.releaseWithheld')}
            </div>
          )}
        </div>
      ) : (
        <HandoffNotice availability={planAvailability} testId="handoff-orderplan-draft" />
      )}
    </TableCell>
  );
};

export default RecActionCell;
