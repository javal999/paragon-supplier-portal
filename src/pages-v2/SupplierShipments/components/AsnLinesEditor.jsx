/** @import React from 'react' */
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import TermLabel from '@components/ui-v2/TermLabel';
import Data from '@components/ui-v2/Data';
import MaterialSearch, {
  MaterialMatchReason,
  useMaterialSearch
} from '@components/ui-v2/MaterialSearch';
/** @import { AvailableBatch } from '@services/transitions/fulfilmentRules' */
/** @import { AsnLinesRead, LineEntry, OpenLine } from '../../shipments/asnLines' */
import { EMPTY_LINE } from '../../shipments/asnLines';
import { ShelfLifeLineNote } from '../../shipments/ShelfLifeParts';
import { inputClass, labelClass } from '../const';
import { qty } from '../../callOffs/callOffDisplay';
import BatchCell from './BatchCell';

/**
 * The shared line editor: shipped quantity, batch and expiry per PO line.
 * Used by the wizard's details step and by the Submit drawer; `read` is the
 * caller's pass of the one line rule over `entries`, so both paths flag the
 * same lines.
 * @type {React.FC<{ open: readonly OpenLine[]; entries: Record<string, LineEntry>; read: AsnLinesRead; batches: Readonly<Record<string, readonly AvailableBatch[]>>; onChange: (materialCode: string, patch: Partial<LineEntry>) => void; overShipReason: string; onReasonChange: (v: string) => void; }>}
 */
const AsnLinesEditor = ({
  open,
  entries,
  read,
  batches,
  onChange,
  overShipReason,
  onReasonChange
}) => {
  const { t } = useTranslation();
  // Material C3 — the one material search over the PO's lines (MR-3 BR-04):
  // a supplier finds a line by PTI code, PTI description or its own approved
  // trade name. Hidden lines keep what was typed; the search only narrows.
  const [query, setQuery] = useState('');
  const found = useMaterialSearch(query, open, (l) => ({
    code: l.materialCode,
    description: l.description
  }));
  if (open.length === 0) {
    return <p className="text-sm text-text-tertiary">{t('fc.asn.lines.empty')}</p>;
  }
  return (
    <div className="space-y-3">
      <MaterialSearch
        mode="filter"
        query={query}
        onQueryChange={setQuery}
        testId="asn-lines-search"
      />
      <div className="overflow-x-auto">
        <table className="w-full text-xs">
          <thead>
            <tr className="text-text-tertiary uppercase">
              <th className="text-left py-1 pr-2">{t('fc.asn.col.material')}</th>
              <th className="text-right py-1 pr-2">
                <TermLabel term="asnOpenQuantity" />
              </th>
              <th className="text-left py-1 pr-2">
                <TermLabel term="asnShippedQuantity" />
              </th>
              <th className="text-left py-1 pr-2">{t('fc.asn.col.batch')}</th>
              <th className="text-left py-1">{t('fc.asn.col.expiry')}</th>
            </tr>
          </thead>
          <tbody>
            {found.map(({ item: l, match }) => {
              const e = entries[l.materialCode] ?? EMPTY_LINE;
              const r = read.lines.find((x) => x.line.materialCode === l.materialCode);
              const bad = !!r && !r.qtyOk;
              const over = !!r && r.over;
              return (
                <tr key={l.materialCode} className="border-t border-border-subtle align-top">
                  <td className="py-1.5 pr-2">
                    <Data as="div" className="text-[length:var(--fs-label-3)] text-text-tertiary">
                      {l.materialCode}
                    </Data>
                    <div className="text-text-primary">{l.description}</div>
                    <MaterialMatchReason
                      match={match}
                      testId={`asn-line-match-${l.materialCode}`}
                    />
                  </td>
                  <td className="py-1.5 pr-2 text-right whitespace-nowrap">
                    <Data>{`${qty(l.open)} ${l.uom}`}</Data>
                  </td>
                  <td className="py-1.5 pr-2">
                    <input
                      type="text"
                      inputMode="decimal"
                      aria-label={t('fc.asn.shippedFor', { material: l.materialCode })}
                      aria-invalid={bad || over}
                      // BL-84 — the line's own refusal, named by its material.
                      aria-describedby={
                        bad || over ? `asn-qty-${l.materialCode}-invalid` : undefined
                      }
                      value={e.qty}
                      onChange={(ev) => onChange(l.materialCode, { qty: ev.target.value })}
                      className={`${inputClass} min-w-[96px]`}
                    />
                    {bad && (
                      <div
                        id={`asn-qty-${l.materialCode}-invalid`}
                        className="mt-1 text-[length:var(--fs-label-3)] text-danger"
                      >
                        {t('fc.asn.qty.invalid')}
                      </div>
                    )}
                  </td>
                  <td className="py-1.5 pr-2">
                    <BatchCell
                      materialCode={l.materialCode}
                      entry={e}
                      options={batches[l.materialCode] ?? []}
                      onChange={(patch) => onChange(l.materialCode, patch)}
                    />
                  </td>
                  <td className="py-1.5">
                    <input
                      type="date"
                      aria-label={t('fc.asn.expiryFor', { material: l.materialCode })}
                      // BL-84 — an expiry the rule refuses says which note.
                      aria-invalid={
                        r?.refusal === 'expiry' ||
                        r?.refusal === 'expiryRequired' ||
                        r?.refusal === 'shelfLife' ||
                        (r?.shelfLife ? !r.shelfLife.ok : false)
                      }
                      aria-describedby={
                        r?.refusal === 'expiryRequired' ||
                        (r?.shelfLife?.monthsLeft ?? null) !== null
                          ? `asn-expiry-${l.materialCode}-note`
                          : undefined
                      }
                      value={e.expiry}
                      onChange={(ev) => onChange(l.materialCode, { expiry: ev.target.value })}
                      className={inputClass}
                    />
                    {/* MR-6 d step 4 — "Expiry <date> · <n> months left at ETA". */}
                    <ShelfLifeLineNote
                      view={r?.shelfLife ?? null}
                      expiry={e.expiry}
                      refusal={r?.refusal ?? null}
                      materialCode={l.materialCode}
                    />
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
      {read.overCount > 0 && (
        <div className="bg-warning-soft border-l-2 border-warning rounded px-3 py-2 space-y-2">
          <p role="alert" className="text-xs text-warning-hover">
            {read.overCount === 1
              ? t('fc.asn.overOpen.one')
              : t('fc.asn.overOpen.other', { count: read.overCount })}
          </p>
          <label className="block">
            <span className={labelClass}>{t('fc.asn.overOpen.reason')}</span>
            <textarea
              rows={2}
              value={overShipReason}
              onChange={(ev) => onReasonChange(ev.target.value)}
              className={`${inputClass} resize-y`}
            />
          </label>
        </div>
      )}
    </div>
  );
};

export default AsnLinesEditor;
