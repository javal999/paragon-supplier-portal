/** @import React from 'react' */
import { useTranslation } from 'react-i18next';
import StatusPill from '@components/ui-v2/StatusPill';
import TableRow from '@components/ui-v2/TableRow';
import TableCell from '@components/ui-v2/TableCell';
import Data from '@components/ui-v2/Data';
import WhyQuantityPanel from '@components/forecast/WhyQuantityPanel';
import { TOUCH_TARGET } from '@components/forecast/focusRing';
import { formatDate, formatIDR, formatNumber } from '@lib/format';
/** @import { MaterialOrderPlanView } from '@services/data/types' */
/** @import { Recommendation } from '@services/engine/orderSizing' */
/** @import { VerbAvailability } from '@services/transitions/handoff' */
/** @import { UmbrellaLine } from './RecActionCell' */
import { qtyOf } from '../../materialPlan/planDisplay';
import { weekLabel, whyId } from '../utils';
import RecActionCell from './RecActionCell';
import TryWhatIfLink from '../../BuyerWhatIfSandbox/TryWhatIfLink';

/**
 * @typedef {object} RecommendationRowProps
 * @property {Recommendation} r The recommended order.
 * @property {MaterialOrderPlanView} m The material it is for.
 * @property {UmbrellaLine | null} line The supplier's open umbrella line for the material, if any.
 * @property {boolean} whyIsOpen Whether this order's "Why this quantity" panel is open.
 * @property {() => void} onOpenWhy Opens this order's panel (and closes any other).
 * @property {(r: Recommendation) => void} onCloseWhy Closes the panel and returns focus to its toggle.
 * @property {string | null} draftId The call-off this page drafted for it, or `null`.
 * @property {VerbAvailability} planAvailability The seat's answer for `calloff:plan`.
 * @property {boolean} pending A draft command is in flight.
 * @property {boolean} releaseWithheld X-03: release refuses engine drafts while the dataset is not live.
 * @property {(r: Recommendation, line: UmbrellaLine) => Promise<void>} onDraft Drafts the call-off.
 */

/**
 * One recommended order: material (with the MOQ flag), supplier, need week,
 * release week (late flag), quantity with pallets and cover, the binding
 * constraint with what it saved and the "Why this quantity" toggle, last
 * week's plan (BR-03), the sizing method (BR-02) and the action cell. When the
 * toggle is open, a second row below carries the `WhyQuantityPanel` (FUX2 B3).
 * @type {React.FC<RecommendationRowProps>}
 */
const RecommendationRow = ({
  r,
  m,
  line,
  whyIsOpen,
  onOpenWhy,
  onCloseWhy,
  draftId,
  planAvailability,
  pending,
  releaseWithheld,
  onDraft
}) => {
  const { t } = useTranslation();
  const changed = r.previousQuantity !== null && r.previousQuantity !== r.quantity;
  return (
    <>
      <TableRow data-testid={`op-rec-${r.materialCode}-${r.weekStart}`}>
        <TableCell className="align-top">
          <div className="text-sm text-text-primary">{m.materialLabel}</div>
          <Data className="text-xs text-text-tertiary">{m.materialCode}</Data>
          {m.moqExceedsHorizonDemand && (
            <div>
              <StatusPill variant="warning">{t('op.moqFlag')}</StatusPill>
            </div>
          )}
          {/* P-07 (IA-B10) — the what-if sandbox opens on this supplier × material. */}
          {r.supplierId ? (
            <div>
              <TryWhatIfLink
                materialCode={r.materialCode}
                supplierId={r.supplierId}
                supplierName={m.supplierName ?? r.supplierId}
                testId={`op-whatif-${r.materialCode}-${r.weekStart}`}
              />
            </div>
          ) : null}
        </TableCell>
        <TableCell className="align-top">{m.supplierName ?? '—'}</TableCell>
        <TableCell className="align-top whitespace-nowrap">
          <Data>{weekLabel(r.weekStart)}</Data>
          <div className="text-xs text-text-tertiary">
            <Data>{formatDate(r.weekStart)}</Data>
          </div>
        </TableCell>
        <TableCell className="align-top whitespace-nowrap">
          <Data>{weekLabel(r.releaseWeek)}</Data>
          {r.lateToRelease && (
            <div>
              <StatusPill variant="danger">{t('op.late')}</StatusPill>
            </div>
          )}
        </TableCell>
        <TableCell className="align-top">
          <Data
            data-testid={`op-qty-${r.materialCode}-${r.weekStart}`}
          >{`${qtyOf(r.quantity, m.uom)} ${m.uom}`}</Data>
          <div className="text-xs text-text-tertiary">
            <Data>
              {t('op.pallets', {
                value: formatNumber(Math.round(r.pallets * 10) / 10)
              })}
            </Data>{' '}
            · {t('op.cover', { count: r.coverWeeks })}
          </div>
        </TableCell>
        <TableCell className="align-top">
          <div
            className="text-sm text-text-primary"
            data-testid={`op-binding-${r.materialCode}-${r.weekStart}`}
          >
            {t(`op.binding.${r.binding}`)}
          </div>
          <div
            className="text-xs text-text-tertiary"
            data-testid={`op-saved-${r.materialCode}-${r.weekStart}`}
          >
            {r.savedIdr === null || r.alternativeQuantity === null ? (
              t('op.saved.none')
            ) : (
              <>
                {t('op.saved', {
                  // BL-83 — a rupiah amount is formatIDR's, not a plain number's.
                  value: formatIDR(Math.round(r.savedIdr)),
                  quantity: `${qtyOf(r.alternativeQuantity, m.uom)} ${m.uom}`
                })}
              </>
            )}
          </div>
          <button
            type="button"
            id={`${whyId(r)}-toggle`}
            className={`mt-1 text-xs text-action-hover underline ${TOUCH_TARGET}`}
            aria-expanded={whyIsOpen}
            aria-controls={whyId(r)}
            aria-label={t('op.wq.openAria', {
              material: m.materialLabel,
              week: weekLabel(r.weekStart)
            })}
            onClick={() => (whyIsOpen ? onCloseWhy(r) : onOpenWhy())}
            data-testid={`op-wq-open-${r.materialCode}-${r.weekStart}`}
          >
            {t('op.wq.open')}
          </button>
        </TableCell>
        <TableCell className="align-top">
          {r.previousQuantity === null ? (
            <span className="text-text-tertiary">—</span>
          ) : r.previousQuantity === 0 ? (
            <span className="text-xs text-text-tertiary">{t('op.previous.none')}</span>
          ) : (
            <Data>{qtyOf(r.previousQuantity, m.uom)}</Data>
          )}
          {changed && r.insideLeadTime && (
            <div>
              <StatusPill variant="warning">{t('op.previous.changed')}</StatusPill>
            </div>
          )}
        </TableCell>
        <TableCell className="align-top">
          <span
            className={r.method === 'joint' ? 'text-sm' : 'text-sm text-warning-hover'}
            data-testid={`op-method-${r.materialCode}-${r.weekStart}`}
          >
            {t(`op.method.${r.method}`)}
          </span>
        </TableCell>
        <RecActionCell
          r={r}
          line={line}
          draftId={draftId}
          planAvailability={planAvailability}
          pending={pending}
          releaseWithheld={releaseWithheld}
          onDraft={onDraft}
        />
      </TableRow>
      {whyIsOpen ? (
        <tr>
          <td colSpan={9} className="px-4 pb-4">
            <WhyQuantityPanel id={whyId(r)} rec={r} material={m} onClose={() => onCloseWhy(r)} />
          </td>
        </tr>
      ) : null}
    </>
  );
};

export default RecommendationRow;
