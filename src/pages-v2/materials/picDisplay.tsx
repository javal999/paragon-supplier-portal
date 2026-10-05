import React, { useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import { useSearchParams } from 'react-router-dom';
import Data from '@components/ui-v2/Data';
import LivenessPill from '@components/ui-v2/LivenessPill';
import { useMyMrpController } from '@components/layout-v2/mrpControllerSeat';
import type { MrpControllerRef } from '@services/data/types';
import { PIC_FILTER_MINE, mrpControllerRef, picFilterMatches, picKeyOf } from '@services/transitions/mrpControllerStore';
import { materialEntry } from '@services/sdc/materialMaster';

/**
 * The PIC of a material for a PTI page that lists something other than a
 * material row — the call-off page groups by agreement line, and an agreement
 * line with no call-off yet still has a planner. PTI-ONLY: a supplier's PIC
 * always comes narrowed from the read model, never from here.
 */
export const ptiPicOf = (materialCode: string): MrpControllerRef | undefined =>
  mrpControllerRef(materialEntry(materialCode)?.mrpController, 'buyer');

// ─────────────────────────────────────────────────────────────────────────────
// Material C4 — THE MRP CONTROLLER (PIC) ON MATERIAL SURFACES (MR-5 BR-03).
//
// One cell, one header and one filter, shared by the inventory list and
// detail, alerts, call-offs and the ASN line, so "who handles this material"
// reads the same everywhere:
//   · the cell renders exactly what the read model sent. PTI gets `P12 · name`,
//     or the code alone for an unmapped code (BR-02); a supplier's read carries
//     the name only (BR-04), so there is no code here to hide;
//   · the header carries the `materialMasterSap` pill (AR-19): the code is an
//     SAP copy, fixture data until the MDM feed runs;
//   · the filter is kept in the page address (`?pic=`), and "My materials"
//     (`?pic=mine`) is offered to a PTI seat that has chosen its own code.
// ─────────────────────────────────────────────────────────────────────────────

/** The PIC, as text: `P12 · name`, the code alone, or the name alone. */
export const picText = (ref: MrpControllerRef | undefined): string | null =>
  ref ? [ref.code, ref.name].filter((v): v is string => !!v).join(' · ') : null;

/** The PIC cell. An em-dash when the reader has nothing to see. */
export const PicCell: React.FC<{ value: MrpControllerRef | undefined; testId?: string }> = ({ value, testId }) => (
  <span className="text-xs text-text-secondary" data-testid={testId}>
    {value ? (
      <>
        {!!value.code && <Data className="text-text-primary">{value.code}</Data>}
        {!!value.code && !!value.name && ' · '}
        {!!value.name && <span>{value.name}</span>}
      </>
    ) : (
      <span className="text-text-tertiary">—</span>
    )}
  </span>
);

/**
 * The PIC column header with its liveness pill beside it (AR-19). `wrap` lets
 * the pill drop under "PIC" in a narrow grouped column (BL-38, the supplier
 * call-offs table); every other table keeps the one-line default.
 */
export const PicHeader: React.FC<{ wrap?: boolean }> = ({ wrap = false }) => {
  const { t } = useTranslation();
  return (
    <span className={wrap ? 'inline-flex flex-wrap items-center gap-x-2 gap-y-0.5' : 'inline-flex items-center gap-2 whitespace-nowrap'}>
      {t('pic.col')}
      <LivenessPill capability="materialMasterSap" />
    </span>
  );
};

/** The PIC filter held in the page address, and the seat's own code. */
export function usePicFilter(): {
  filter: string;
  setFilter: (next: string) => void;
  myCode: string | null;
  matches: (ref: MrpControllerRef | undefined) => boolean;
} {
  const [params, setParams] = useSearchParams();
  const [myCode] = useMyMrpController();
  const filter = params.get('pic') ?? '';
  const setFilter = useCallback(
    (next: string) => {
      setParams(
        (prev) => {
          const p = new URLSearchParams(prev);
          if (next === '') p.delete('pic');
          else p.set('pic', next);
          return p;
        },
        { replace: true },
      );
    },
    [setParams],
  );
  const matches = useCallback((ref: MrpControllerRef | undefined) => picFilterMatches(ref, filter, myCode), [filter, myCode]);
  return { filter, setFilter, myCode, matches };
}

/**
 * The PIC filter. Options come from the rows on the page, so a supplier (whose
 * rows carry names only) filters by name and PTI by code. "My materials" is
 * offered only to PTI, and says so when the seat has not chosen its code.
 */
export const PicFilter: React.FC<{
  refs: readonly (MrpControllerRef | undefined)[];
  persona: 'buyer' | 'supplier';
  filter: string;
  setFilter: (next: string) => void;
  myCode: string | null;
}> = ({ refs, persona, filter, setFilter, myCode }) => {
  const { t } = useTranslation();
  const options = new Map<string, string>();
  for (const r of refs) {
    const key = picKeyOf(r);
    if (key && !options.has(key)) options.set(key, picText(r) ?? key);
  }
  // A PIC from the address that no row on this view carries stays selectable,
  // so the control never silently reads "All" while the list is filtered.
  if (filter !== '' && filter !== PIC_FILTER_MINE && !options.has(filter)) options.set(filter, filter);
  const sorted = [...options.entries()].sort((a, b) => a[0].localeCompare(b[0]));
  return (
    <div className="inline-flex items-center gap-2 flex-wrap" data-testid="pic-filter">
      <label htmlFor="pic-filter-select" className="text-xs text-text-secondary">
        {t('pic.filter.label')}
      </label>
      <select
        id="pic-filter-select"
        data-testid="pic-filter-select"
        value={filter}
        onChange={(e) => setFilter(e.target.value)}
        className="h-8 rounded-md border border-border-input bg-white px-2 text-sm text-text-primary max-w-[280px]"
      >
        <option value="">{t('pic.filter.all')}</option>
        {persona === 'buyer' && (
          <option value={PIC_FILTER_MINE}>
            {myCode ? t('pic.filter.mine', { code: myCode }) : t('pic.filter.mineUnset')}
          </option>
        )}
        {sorted.map(([key, label]) => (
          <option key={key} value={key}>
            {label}
          </option>
        ))}
      </select>
      <LivenessPill capability="materialMasterSap" />
      {filter === PIC_FILTER_MINE && myCode === null && (
        <span className="text-xs text-text-tertiary" data-testid="pic-filter-mine-unset">
          {t('pic.filter.mineUnsetHint')}
        </span>
      )}
    </div>
  );
};
