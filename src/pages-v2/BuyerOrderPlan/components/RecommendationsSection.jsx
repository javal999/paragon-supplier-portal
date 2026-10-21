/** @import React from 'react' */
import { useTranslation } from 'react-i18next';
import { Link } from 'react-router-dom';
import Table from '@components/ui-v2/Table';
import TableHeader, { TableHeaderCell } from '@components/ui-v2/TableHeader';
/** @import { PurchaseOrder } from '@services/data/types' */
/** @import { Recommendation } from '@services/engine/orderSizing' */
/** @import { VerbAvailability } from '@services/transitions/handoff' */
/** @import { UmbrellaLine } from './RecActionCell' */
/** @import { RecRow } from '../utils' */
import { umbrellaLineFor } from '../../orderPlan/orderPlanRelease';
import { keyOf } from '../utils';
import RecommendationRow from './RecommendationRow';

/**
 * @typedef {object} RecommendationsSectionProps
 * @property {RecRow[]} rows The selected warehouse's recommendations, by week then material.
 * @property {readonly PurchaseOrder[]} pos The open call-off POs, searched for each row's umbrella line.
 * @property {string | null} whyOpen The key of the row whose "Why this quantity" panel is open.
 * @property {(key: string) => void} onOpenWhy Opens one row's panel.
 * @property {(r: Recommendation) => void} onCloseWhy Closes the panel and returns focus to its toggle.
 * @property {ReadonlyMap<string, string>} drafted The rows this page has drafted, by key, with the call-off id each created.
 * @property {VerbAvailability} planAvailability The seat's answer for `calloff:plan`.
 * @property {boolean} pending A draft command is in flight.
 * @property {boolean} releaseWithheld X-03: release refuses engine drafts while the dataset is not live.
 * @property {(r: Recommendation, line: UmbrellaLine) => Promise<void>} onDraft Drafts the call-off.
 */

/**
 * "Recommended orders": the title, intro and the links to the two pages that
 * explain a quantity (Material requirement, Safety stock), then either the
 * empty line or the table of recommendations, one `RecommendationRow` each.
 * @type {React.FC<RecommendationsSectionProps>}
 */
const RecommendationsSection = ({
  rows,
  pos,
  whyOpen,
  onOpenWhy,
  onCloseWhy,
  drafted,
  planAvailability,
  pending,
  releaseWithheld,
  onDraft
}) => {
  const { t } = useTranslation();
  return (
    <section
      className="bg-bg-surface border border-border-subtle rounded-lg p-4 mb-6"
      data-testid="op-recs"
    >
      <h2 className="text-section text-text-primary mb-1">{t('op.recs.title')}</h2>
      <p className="text-xs text-text-tertiary mb-3">{t('op.recs.intro')}</p>
      <p className="text-xs text-text-secondary mb-3" data-testid="op-why">
        {t('op.why')}{' '}
        <Link
          to="/buyer/material-requirement"
          className="text-action-hover underline"
          data-testid="op-why-requirement"
        >
          {t('op.why.requirement')}
        </Link>{' '}
        ·{' '}
        <Link
          to="/buyer/safety-stock"
          className="text-action-hover underline"
          data-testid="op-why-safety"
        >
          {t('op.why.safety')}
        </Link>
      </p>
      {rows.length === 0 ? (
        <p className="text-sm text-text-tertiary py-6 text-center" data-testid="op-recs-empty">
          {t('op.recs.empty')}
        </p>
      ) : (
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableHeaderCell>{t('op.col.material')}</TableHeaderCell>
              <TableHeaderCell>{t('op.col.supplier')}</TableHeaderCell>
              <TableHeaderCell>{t('op.col.week')}</TableHeaderCell>
              <TableHeaderCell>{t('op.col.release')}</TableHeaderCell>
              <TableHeaderCell>{t('op.col.quantity')}</TableHeaderCell>
              <TableHeaderCell>{t('op.col.reason')}</TableHeaderCell>
              <TableHeaderCell>{t('op.col.previous')}</TableHeaderCell>
              <TableHeaderCell>{t('op.col.method')}</TableHeaderCell>
              <TableHeaderCell>{t('op.col.action')}</TableHeaderCell>
            </TableHeader>
            <tbody>
              {rows.map(({ rec: r, material: m }) => {
                const key = keyOf(r);
                return (
                  <RecommendationRow
                    key={key}
                    r={r}
                    m={m}
                    line={umbrellaLineFor(pos, r.supplierId, r.materialCode)}
                    whyIsOpen={whyOpen === key}
                    onOpenWhy={() => onOpenWhy(key)}
                    onCloseWhy={onCloseWhy}
                    draftId={drafted.get(key) ?? null}
                    planAvailability={planAvailability}
                    pending={pending}
                    releaseWithheld={releaseWithheld}
                    onDraft={onDraft}
                  />
                );
              })}
            </tbody>
          </Table>
        </div>
      )}
    </section>
  );
};

export default RecommendationsSection;
