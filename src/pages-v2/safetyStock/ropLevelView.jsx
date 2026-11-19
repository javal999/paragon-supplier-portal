/** @import React from 'react' */
/** @import { InventoryPosition, MaterialSafetyStockView } from '@services/data/types' */
import { useTranslation } from 'react-i18next';
import Data from '@components/ui-v2/Data';
import StatusPill from '@components/ui-v2/StatusPill';
import Table from '@components/ui-v2/Table';
import TableHeader, { TableHeaderCell } from '@components/ui-v2/TableHeader';
import TableRow from '@components/ui-v2/TableRow';
import TableCell from '@components/ui-v2/TableCell';
import { isPtiAtOrAboveMax, isPtiBelowRop } from '@services/transitions/inventoryRules';
import { qtyOf } from '../materialPlan/planDisplay';

// ─────────────────────────────────────────────────────────────────────────────
// PSC-5 BR-02 (BL-341) — the ROP-level view on Safety stock targets.
//
// Materials grouped by their OSIP level, each with PTI stock against the PTI
// ROP and the DRC-10 Max. Two warnings:
//   · below the ROP — `isPtiBelowRop`, THE predicate the `ptiBelowRop` alert
//     reads, so the view and the alert agree;
//   · at or above Max — `isPtiAtOrAboveMax` over the Max the position carries
//     (`systemMax`, `osipRops`), the figure the `ptiAtOrAboveMax` alert reads.
// The page renders and does not compute: the level is the read's, the figures
// are the inventory read's, and the two predicates are the rules'.
//
// A material PTI holds no stock record for shows "No PTI stock record" and no
// warning: there is no figure to compare.
// ─────────────────────────────────────────────────────────────────────────────

/**
 * The first PTI stock figure of a material (PTI SOH is material-level: every
 * supplier row of the same material carries the same record).
 * @param {readonly InventoryPosition[]} positions
 * @param {string} materialCode
 * @returns {InventoryPosition | null}
 */
const ptiRowOf = (positions, materialCode) =>
  positions.find((p) => p.materialCode === materialCode && p.ptiSoh !== null) ?? null;

/**
 * The largest DRC-10 Max across the material's supplier rows — the figure the
 * Max Stock column shows; null when no row carries one.
 * @param {readonly InventoryPosition[]} positions
 * @param {string} materialCode
 * @returns {number | null}
 */
const maxOf = (positions, materialCode) => {
  /** @type {number | null} */
  let best = null;
  for (const p of positions) {
    if (p.materialCode !== materialCode) continue;
    const v = p.systemMax?.value ?? null;
    if (v !== null && (best === null || v > best)) best = v;
  }
  return best;
};

/**
 * @type {React.FC<{
 *   materials: readonly MaterialSafetyStockView[];
 *   positions: readonly InventoryPosition[];
 * }>}
 */
export const RopLevelView = ({ materials, positions }) => {
  const { t } = useTranslation();
  /** @type {Map<number, MaterialSafetyStockView[]>} */
  const byLevel = new Map();
  for (const m of materials) {
    const level = m.rop.level.level;
    byLevel.set(level, [...(byLevel.get(level) ?? []), m]);
  }
  const levels = [...byLevel.keys()].sort((a, b) => a - b);
  return (
    <section
      className="bg-bg-surface border border-border-subtle rounded-lg shadow-sm overflow-x-auto mb-6"
      data-testid="sst-rop-level"
    >
      <div className="px-4 pt-4">
        <h2 className="text-section text-text-primary">{t('sst.ropLevel.title')}</h2>
        <p className="text-xs text-text-tertiary mb-3">{t('sst.ropLevel.intro')}</p>
      </div>
      <Table>
        <TableHeader>
          <TableHeaderCell>{t('sst.col.material')}</TableHeaderCell>
          <TableHeaderCell term="ptiStock" />
          <TableHeaderCell term="ptiRop" />
          <TableHeaderCell term="maxStock" />
          <TableHeaderCell>{t('sst.ropLevel.col.warning')}</TableHeaderCell>
        </TableHeader>
        {levels.map((level) => (
          <tbody key={level} data-testid={`sst-rop-level-group-${level}`}>
            <tr className="border-t border-border-subtle bg-bg-hover">
              <th
                scope="rowgroup"
                colSpan={5}
                className="text-left text-xs font-semibold text-text-primary py-2 px-4"
              >
                {t('sst.rop.level', { level })}
              </th>
            </tr>
            {(byLevel.get(level) ?? []).map((m) => {
              const own = positions.filter((p) => p.materialCode === m.materialCode);
              const pti = ptiRowOf(positions, m.materialCode);
              const max = maxOf(positions, m.materialCode);
              const below = pti !== null && isPtiBelowRop(pti);
              const atMax = own.some(isPtiAtOrAboveMax);
              return (
                <TableRow key={m.materialCode} data-testid={`sst-rop-level-row-${m.materialCode}`}>
                  <TableCell className="align-top">
                    <div className="text-sm text-text-primary">{m.materialLabel}</div>
                    <Data className="text-xs text-text-tertiary">{m.materialCode}</Data>
                  </TableCell>
                  <TableCell className="align-top whitespace-nowrap">
                    {pti === null ? (
                      <span
                        className="text-xs text-text-tertiary"
                        data-testid={`sst-rop-level-pti-${m.materialCode}`}
                      >
                        {t('sst.ropLevel.noFigures')}
                      </span>
                    ) : (
                      <Data data-testid={`sst-rop-level-pti-${m.materialCode}`}>
                        {`${qtyOf(pti.ptiSoh ?? 0, m.uom)} ${m.uom}`}
                      </Data>
                    )}
                  </TableCell>
                  <TableCell className="align-top whitespace-nowrap">
                    <Data data-testid={`sst-rop-level-rop-${m.materialCode}`}>
                      {pti === null || pti.ptiRop === null
                        ? t('inv.figure.none')
                        : `${qtyOf(pti.ptiRop, m.uom)} ${m.uom}`}
                    </Data>
                  </TableCell>
                  <TableCell className="align-top whitespace-nowrap">
                    <Data data-testid={`sst-rop-level-max-${m.materialCode}`}>
                      {max === null ? t('inv.figure.none') : `${qtyOf(max, m.uom)} ${m.uom}`}
                    </Data>
                  </TableCell>
                  <TableCell className="align-top">
                    <div className="flex flex-wrap items-center gap-2">
                      {below ? (
                        <span data-testid={`sst-rop-level-below-${m.materialCode}`}>
                          <StatusPill variant="warning">{t('sst.ropLevel.belowRop')}</StatusPill>
                        </span>
                      ) : null}
                      {atMax ? (
                        <span data-testid={`sst-rop-level-atmax-${m.materialCode}`}>
                          <StatusPill variant="warning">{t('sst.ropLevel.atMax')}</StatusPill>
                        </span>
                      ) : null}
                    </div>
                  </TableCell>
                </TableRow>
              );
            })}
          </tbody>
        ))}
      </Table>
    </section>
  );
};
