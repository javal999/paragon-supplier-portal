/** @import React from 'react' */
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import TermLabel from '@components/ui-v2/TermLabel';
import Data from '@components/ui-v2/Data';
import MaterialSearch, {
  MaterialMatchReason,
  useMaterialSearch
} from '@components/ui-v2/MaterialSearch';
import { formatIDR } from '@lib/format';
/** @import { AvailableBatch } from '@services/transitions/fulfilmentRules' */
import { sequenceErrorFor, valueLimitLocked } from '@services/transitions/fulfilmentRules';
/** @import { AsnLinesRead, LineEntry, OpenLine } from '../../shipments/asnLines' */
/** @import { CallOff } from '@services/data/types' */
import { EMPTY_LINE } from '../../shipments/asnLines';
import { ShelfLifeLineNote } from '../../shipments/ShelfLifeParts';
import { inputClass, labelClass } from '../const';
import { qty } from '../../callOffs/callOffDisplay';
import BatchCell from './BatchCell';

/**
 * The shared line editor: shipped quantity, batch and expiry per PO line.
 * Used by the wizard's details step and by the Submit drawer; `read` is the
 * caller's pass of the one line rule over `entries`, so both paths flag the
 * same lines. `callOff`:  BL-140 — the released call-off the ASN names; a
 * value-limit line is not offered unless it covers the line.
 * @type {React.FC<{ open: readonly OpenLine[]; entries: Record<string, LineEntry>; read: AsnLinesRead; batches: Readonly<Record<string, readonly AvailableBatch[]>>; onChange: (materialCode: string, patch: Partial<LineEntry>) => void; overShipReason: string; onReasonChange: (v: string) => void; callOff?: Pick<CallOff, 'materialCode' | 'quantity'>; }>}
 */
const AsnLinesEditor = ({
  open,
  entries,
  read,
  batches,
  onChange,
  overShipReason,
  onReasonChange,
  callOff
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
              // BL-140 — a value-limit line carries no quantity: it is raised
              // against the released call-off that covers it, and it is not
              // offered as a standalone line until that call-off is named.
              const locked = valueLimitLocked(l, callOff?.materialCode);
              const valueRefusal =
                r?.refusal === 'overCallOff' || r?.refusal === 'overValueLimit' ? r.refusal : null;
              // AIB-1 BR-05 (BL-348) — each failed line shows its sequence
              // error, naming both values where two differ (AC-02: both POs).
              const seqError = read.sequenceRead
                ? sequenceErrorFor(read.sequenceRead, l.materialCode)
                : null;
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
                    {seqError && (
                      <div
                        id={`asn-sequence-${l.materialCode}-invalid`}
                        role="alert"
                        className="mt-1 text-[length:var(--fs-label-3)] text-danger"
                      >
                        {t(`fc.asn.sequence.error.${seqError.code}`, {
                          value: seqError.value,
                          expected: seqError.expected
                        })}
                      </div>
                    )}
                  </td>
                  <td className="py-1.5 pr-2 text-right whitespace-nowrap">
                    {l.valueLimit !== undefined ? (
                      <Data>{t('fc.asn.valueLimit.open', { value: formatIDR(l.valueLimit) })}</Data>
                    ) : (
                      <Data>{`${qty(l.open)} ${l.uom}`}</Data>
                    )}
                  </td>
                  <td className="py-1.5 pr-2">
                    <input
                      type="text"
                      inputMode="decimal"
                      aria-label={t('fc.asn.shippedFor', { material: l.materialCode })}
                      aria-invalid={!locked && (bad || over || valueRefusal !== null)}
                      // BL-326 / BL-140 — an over-open line is not `bad`, so its
                      // note is the form-level over-open alert (rendered below
                      // whenever any line is over). A value-limit line describes
                      // its own reason: the lock when no call-off covers it, else
                      // the bound it broke. Each reference is to an element this
                      // row renders on the same condition.
                      aria-describedby={
                        locked
                          ? `asn-qty-${l.materialCode}-value-limit`
                          : bad
                            ? `asn-qty-${l.materialCode}-invalid`
                            : valueRefusal
                              ? `asn-qty-${l.materialCode}-value-limit`
                              : over
                                ? 'asn-over-open-alert'
                                : undefined
                      }
                      disabled={locked}
                      value={e.qty}
                      onChange={(ev) => onChange(l.materialCode, { qty: ev.target.value })}
                      className={`${inputClass} min-w-[96px] ${locked ? 'opacity-60 cursor-not-allowed' : ''}`}
                    />
                    {locked && (
                      <div
                        id={`asn-qty-${l.materialCode}-value-limit`}
                        className="mt-1 text-[length:var(--fs-label-3)] text-text-tertiary"
                      >
                        {t('fc.asn.valueLimit.callOffRequired')}
                      </div>
                    )}
                    {!locked && valueRefusal === 'overCallOff' && (
                      <div
                        id={`asn-qty-${l.materialCode}-value-limit`}
                        className="mt-1 text-[length:var(--fs-label-3)] text-danger"
                      >
                        {t('fc.asn.valueLimit.overCallOff')}
                      </div>
                    )}
                    {!locked && valueRefusal === 'overValueLimit' && (
                      <div
                        id={`asn-qty-${l.materialCode}-value-limit`}
                        className="mt-1 text-[length:var(--fs-label-3)] text-danger"
                      >
                        {t('fc.asn.valueLimit.overValue')}
                      </div>
                    )}
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
                      // BL-84 / BL-326 — an expiry the rule refuses says which
                      // note. A date the rule cannot read (`expiry`) has its own
                      // message; the shelf-life note renders only when it has a
                      // figure to show, so it is referenced only then.
                      aria-invalid={
                        r?.refusal === 'expiry' ||
                        r?.refusal === 'expiryRequired' ||
                        r?.refusal === 'shelfLife' ||
                        (r?.shelfLife ? !r.shelfLife.ok : false)
                      }
                      aria-describedby={
                        r?.refusal === 'expiry'
                          ? `asn-expiry-${l.materialCode}-invalid`
                          : r?.refusal === 'expiryRequired' ||
                              (r?.shelfLife?.monthsLeft ?? null) !== null
                            ? `asn-expiry-${l.materialCode}-note`
                            : undefined
                      }
                      value={e.expiry}
                      onChange={(ev) => onChange(l.materialCode, { expiry: ev.target.value })}
                      className={inputClass}
                    />
                    {r?.refusal === 'expiry' && (
                      <div
                        id={`asn-expiry-${l.materialCode}-invalid`}
                        className="mt-1 text-[length:var(--fs-label-3)] text-danger"
                      >
                        {t('fc.asn.expiry.invalid')}
                      </div>
                    )}
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
          <p id="asn-over-open-alert" role="alert" className="text-xs text-warning-hover">
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
