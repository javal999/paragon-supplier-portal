/** @import React from 'react' */
import { useEffect, useLayoutEffect, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Link } from 'react-router-dom';
import Button from '@components/ui-v2/Button';
import Data from '@components/ui-v2/Data';
import TermTip from '@components/forecast/TermTip';
import { formatDate, formatNumber } from '@lib/format';
import { useMaterialRequirement, useSafetyStock } from '@services/query/hooks';
/** @import { MaterialOrderPlanView } from '@services/data/types' */
/** @import { Recommendation } from '@services/engine/orderSizing' */
import { isoWeek } from '@services/engine/dates';
import { qtyOf } from '@pages-v2/materialPlan/planDisplay';

// ─────────────────────────────────────────────────────────────────────────────
// WHY THIS QUANTITY — Forecast UX phase 2, task B3 (F-07, F-17).
//
// One recommended order, explained without leaving What to order: the
// Material requirement numbers for its material in the order's week (gross,
// safety stock, stock at start, confirmed deliveries, net — the engine's
// weekly netting, so they reconcile), the Safety stock numbers (safety stock, safety
// lead time, reorder point) and the order sizing that turned the net
// requirement into the quantity (MOQ, order multiple, space). Read-only: every
// figure comes from the same hooks the 2 full pages read, keyed by
// `materialCode` in all 3, so the panel and the pages show the same numbers.
// Neither full page keeps a material filter in its address, so the links open
// the pages unfiltered.
//
// Narrow screens (FUX phase 3, C1). The panel opens in a full-width row of the
// order table, whose own wrapper scrolls sideways (`ui-v2/Table`). A row that
// wide put the 3rd block off screen at 1024 px. So the panel measures the
// visible width of that scroll area, takes that width less the cell's padding,
// sticks to its left edge, and stacks the 3 blocks once 3 columns no longer
// fit (`STACK_BELOW_PX`).
// ─────────────────────────────────────────────────────────────────────────────

/** Below this visible width of the table's scroll area, the 3 blocks stack. */
const STACK_BELOW_PX = 880;
/** The panel cell's horizontal padding (`px-4` on each side, in the page). */
const CELL_PADDING_PX = 32;

/**
 * The visible width of the scroll area holding the table the panel sits in; null outside a table.
 * @param {React.RefObject<HTMLElement | null>} ref
 * @returns {number | null}
 */
function useScrollAreaWidth(ref) {
  const [width, setWidth] = useState(/** @type {number | null} */ (null));
  useLayoutEffect(() => {
    const area = ref.current?.closest('table')?.parentElement ?? null;
    if (!area) return undefined;
    const read = () => setWidth(area.clientWidth);
    read();
    if (typeof ResizeObserver === 'undefined') {
      window.addEventListener('resize', read);
      return () => window.removeEventListener('resize', read);
    }
    const observer = new ResizeObserver(read);
    observer.observe(area);
    return () => observer.disconnect();
  }, [ref]);
  return width;
}

/**
 * @typedef {{
 *     readonly id: string;
 *     readonly rec: Recommendation;
 *     readonly material: MaterialOrderPlanView;
 *     readonly onClose: () => void;
 *   }} WhyQuantityPanelProps
 */

/** @type {React.FC<{ label: React.ReactNode; value: React.ReactNode; testId: string }>} */
const Row = ({ label, value, testId }) => (
  <div className="flex items-baseline justify-between gap-3 py-1 border-b border-border-subtle last:border-b-0">
    <dt className="text-xs text-text-secondary">{label}</dt>
    <dd>
      <Data data-testid={testId}>{value}</Data>
    </dd>
  </div>
);

/** @type {React.FC<{ title: string; testId: string; link?: { to: string; label: string; testId: string }; children: React.ReactNode; }>} */
const Block = ({ title, testId, link, children }) => (
  <section
    className="border border-border-subtle rounded-md p-3 bg-bg-surface"
    data-testid={testId}
  >
    <h4 className="text-sm font-semibold text-text-primary mb-2">{title}</h4>
    {children}
    {link ? (
      <Link
        to={link.to}
        className="inline-block mt-2 text-xs text-action underline"
        data-testid={link.testId}
      >
        {link.label}
      </Link>
    ) : null}
  </section>
);

/** @type {React.FC<WhyQuantityPanelProps>} */
const WhyQuantityPanel = ({ id, rec, material, onClose }) => {
  const { t } = useTranslation();
  const requirement = useMaterialRequirement();
  const safety = useSafetyStock();
  const headingRef = useRef(/** @type {HTMLHeadingElement | null} */ (null));
  const rootRef = useRef(/** @type {HTMLDivElement | null} */ (null));
  const areaWidth = useScrollAreaWidth(rootRef);
  useEffect(() => {
    headingRef.current?.focus();
  }, []);
  // Outside a table (never on the page) the panel keeps the plain responsive grid.
  const fitted = areaWidth !== null && areaWidth > CELL_PADDING_PX;
  const stacked = fitted && areaWidth < STACK_BELOW_PX;
  const gridCols = !fitted ? 'grid-cols-1 lg:grid-cols-3' : stacked ? 'grid-cols-1' : 'grid-cols-3';

  const uom = material.uom;
  /** @param {number} x */
  const q = (x) => `${qtyOf(x, uom)} ${uom}`;
  const plan = requirement.data?.materials.find((m) => m.materialCode === rec.materialCode) ?? null;
  const week = plan?.weeks.find((w) => w.weekStart === rec.weekStart) ?? null;
  const ss = safety.data?.materials.find((m) => m.materialCode === rec.materialCode) ?? null;
  const wk = `W${isoWeek(rec.weekStart)}`;

  const loading = <p className="text-xs text-text-tertiary">{t('op.wq.loading')}</p>;
  const missing = <p className="text-xs text-text-tertiary">{t('op.wq.missing')}</p>;

  return (
    <div
      id={id}
      ref={rootRef}
      role="region"
      aria-labelledby={`${id}-title`}
      className={`border border-border-subtle rounded-md p-4 bg-bg-hover${fitted ? ' sticky left-4' : ''}`}
      style={fitted ? { width: areaWidth - CELL_PADDING_PX } : undefined}
      data-testid="op-wq-panel"
      data-layout={!fitted ? undefined : stacked ? 'stacked' : 'columns'}
      onKeyDown={(e) => {
        if (e.key === 'Escape') {
          e.stopPropagation();
          onClose();
        }
      }}
    >
      <div className="flex items-center justify-between gap-3 mb-3">
        <h3
          id={`${id}-title`}
          ref={headingRef}
          tabIndex={-1}
          className="text-sm font-semibold text-text-primary focus:outline-none"
        >
          {t('op.wq.title')} · <Data>{material.materialCode}</Data> · <Data>{wk}</Data>
        </h3>
        <Button variant="secondary" onClick={onClose} data-testid="op-wq-close">
          {t('op.wq.close')}
        </Button>
      </div>
      <div className={`grid ${gridCols} gap-3`} data-testid="op-wq-blocks">
        <Block
          title={t('op.wq.req.title')}
          testId="op-wq-requirement"
          link={{
            to: '/buyer/material-requirement',
            label: t('op.wq.req.link'),
            testId: 'op-wq-link-requirement'
          }}
        >
          {requirement.isPending ? (
            loading
          ) : !plan || !week ? (
            missing
          ) : (
            <>
              {/* The order's own week, as netted by the engine (requirement.js
                  netMaterial): net = max(0, gross + safety stock − (stock at
                  start + confirmed receipts in the week)), and the stock at
                  start carries the orders planned for earlier weeks. So these
                  5 figures reconcile; the horizon total does not, being a sum
                  of weekly nets. */}
              <dl>
                <Row
                  label={t('op.wq.req.gross', { week: wk })}
                  value={q(week.gross)}
                  testId="op-wq-gross"
                />
                <Row
                  label={t('op.wq.req.safety')}
                  value={q(week.safetyStock)}
                  testId="op-wq-req-safety"
                />
                <Row
                  label={t('op.wq.req.stock')}
                  value={q(week.projectedStart)}
                  testId="op-wq-stock"
                />
                <Row
                  label={t('op.wq.req.confirmed')}
                  value={q(week.receipts)}
                  testId="op-wq-confirmed"
                />
                <Row
                  label={t('op.wq.req.net', { week: wk })}
                  value={q(week.net)}
                  testId="op-wq-net"
                />
              </dl>
              <p className="text-xs text-text-secondary mt-1" data-testid="op-wq-rule">
                {t('op.wq.req.rule')}
              </p>
              <p className="text-xs text-text-tertiary mt-1">
                {t('op.wq.req.total', { count: requirement.data?.weeks.length ?? 0 })}{' '}
                <Data data-testid="op-wq-net-total">{q(plan.totals.net)}</Data>
                {plan.stockDate ? (
                  <>
                    {' '}
                    · {t('op.wq.req.stockDate')} <Data>{formatDate(plan.stockDate)}</Data>
                  </>
                ) : null}
              </p>
            </>
          )}
        </Block>
        <Block
          title={t('op.wq.ss.title')}
          testId="op-wq-safety"
          link={{
            to: '/buyer/safety-stock',
            label: t('op.wq.ss.link'),
            testId: 'op-wq-link-safety'
          }}
        >
          {safety.isPending ? (
            loading
          ) : !ss ? (
            missing
          ) : (
            <dl>
              <Row
                label={<TermTip term="Safety stock">{t('op.wq.ss.safetyStock')}</TermTip>}
                value={q(ss.safetyStock)}
                testId="op-wq-ss"
              />
              <Row
                label={t('op.wq.ss.slt')}
                value={t('op.wq.ss.days', { count: ss.safetyLeadTimeDays })}
                testId="op-wq-slt"
              />
              <Row
                label={<TermTip term="Reorder point">{t('op.wq.ss.rop')}</TermTip>}
                value={q(ss.reorderPoint)}
                testId="op-wq-rop"
              />
            </dl>
          )}
        </Block>
        <Block title={t('op.wq.size.title')} testId="op-wq-sizing">
          <dl>
            <Row
              label={t('op.wq.size.net', { week: wk })}
              value={week ? q(week.net) : '—'}
              testId="op-wq-week-net"
            />
            <Row label={t('op.wq.size.moq')} value={q(material.moq)} testId="op-wq-moq" />
            <Row
              label={t('op.wq.size.multiple')}
              value={q(material.orderMultiple)}
              testId="op-wq-multiple"
            />
            <Row
              label={t('op.wq.size.space')}
              value={t('op.pallets', { value: formatNumber(Math.round(rec.pallets * 10) / 10) })}
              testId="op-wq-space"
            />
            <Row label={t('op.wq.size.quantity')} value={q(rec.quantity)} testId="op-wq-quantity" />
          </dl>
          <p className="text-xs text-text-secondary mt-1" data-testid="op-wq-binding">
            {t('op.wq.size.binding', { constraint: t(`op.binding.${rec.binding}`) })}
          </p>
        </Block>
      </div>
    </div>
  );
};

export default WhyQuantityPanel;
