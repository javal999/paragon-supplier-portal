/** @import React from 'react' */
import { useTranslation } from 'react-i18next';
import { Ship, Truck } from 'lucide-react';
import { userVerbsFrom } from '@services/transitions';
import StatusPill from '@components/ui-v2/StatusPill';
import Button from '@components/ui-v2/Button';
import Data from '@components/ui-v2/Data';
import { HandoffNotice } from '@components/ui-v2/HandoffNotice';
/** @import { VerbAvailability } from '@services/transitions/handoff' */
/** @import { IncomingShipmentView } from '@services/query/sdcSupplierHooks' */
/** @import { IncomingShipment } from '@services/sdc' */
import { formatDate, formatNumber } from '@lib/format';
import { statusTone } from '@lib/statusTone';
import { CHIP, DIRECTION_LABEL_KEY, LIFECYCLE_LABEL_KEY } from '../const';
import { materialLabel } from '../utils';

// ── WAVE D — WHERE THE THREE ADVANCE VERBS MAY BE OFFERED ────────────────────
//
// ── THE GATE IS PER-VERB, NOT PER-DIRECTION ───────────────────────────
//
// ⚠️ **THIS RULE HAS BEEN RESTATED TWICE AND BOTH EARLIER FORMS WERE WRONG IN
// THE SAME WAY — THEY GENERALISED FROM ONE VERB TO THE DIRECTION.** Wave D
// withheld all three advance verbs on a to-paragon leg because the card showed
// the linked ASN's state, so nothing the supplier did was visible. The
// shadowed-lifecycle batch removed that, and the comment was rewritten to rest
// on the DUPLICATION argument alone — still applied to the whole direction.
// Neither form asked the question one verb at a time.
//
// ⚠️ **ASKED PER VERB, THE ANSWER SPLITS, AND THE MEASUREMENT IS THE EMPTY
// INTERSECTION.** `AsnStatus` is `Draft | Submitted | In Transit | Delivered |
// Discrepancy`; `ShipmentLifecycle` is `Booked | Shipped | Arrived | Cancelled`.
// They share NO member (asserted in `sdc/shipmentAxes.test.js`), but the ASN
// vocabulary does report the same PHYSICAL MOVEMENT that `_ship` and `_arrive`
// record — departure and arrival — and it reports NOTHING that means a leg was
// called off. So:
//
//   · `_ship` / `_arrive` on a to-paragon leg DUPLICATE the tracker. Design
//     §2.3: a to-paragon line *"LINKS to an ASN … never duplicating the
//     tracker"*; `t_incomingshipment_arrive`'s own note: *"the linked ASN
//     machine is the tracker of record"*. The supplier advances that movement
//     on `SupplierShipments`, where the ASN lives.
//   · `_cancel` DUPLICATES NOTHING. No ASN status means cancelled, so there is
//     no second tracker to disagree with — and cancellation is the one act only
//     the supplier can perform. Withholding it left a to-paragon leg with no way
//     to be called off from ANY surface.
//
// ⚠️ **AND §2.3 GOVERNS THE DATA MODEL, WHICH IS WHY IT CANNOT CARRY THE WHOLE
// GATE ON ITS OWN.** Its enforcement is the symmetric CREATION pair
// (`ISH_TOPARAGON_ASN_LINKED` / `ISH_P2D_NO_ASN`), which makes direction ⇔
// linkage 1:1 at birth. Neither guard says a supplier may not update a linked
// leg's own state, and the leg HAS a stored lifecycle the machine writes and the
// buyer's coverage reads.
//
// ⚠️ **IT IS A DECLARATION, NOT A DERIVATION, AND THAT IS DELIBERATE.** The
// discriminator is semantic — "does the ASN report this movement?" — and the
// one function that mapped between the two vocabularies was DELETED by the
// shadowed-lifecycle batch precisely so nothing could substitute one for the
// other. Re-deriving it here to compute this set would rebuild that bridge. A
// bilateral gate in `SupplierForecastsAdvance.test.jsx` pins the set against the
// flow's own verb list instead, so a new advance verb cannot land unclassified.
/** @type {ReadonlySet<string>} */
const ASN_TRACKED_VERBS = new Set(['t_incomingshipment_ship', 't_incomingshipment_arrive']);

/**
 * Would offering this verb on this leg duplicate the ASN tracker? Only a
 * to-paragon leg has an ASN at all, so a p2d leg is never duplicative — but the
 * direction is the second condition here, not the first.
 * @param {IncomingShipment} s
 * @param {string} transitionId
 * @returns {boolean}
 */
const duplicatesAsnTracker = (s, transitionId) =>
  s.direction === 'to-paragon' && ASN_TRACKED_VERBS.has(transitionId);

/** The reason copy is PER VERB, never shared. It used to be one string rendered
 *  once for the whole leg, which is only expressible while the answer is the
 *  same for all three — and it no longer is. Splitting it beats rewording it
 *  into something vague enough to cover both answers.
 *
 *  ⚠️ It is NOT a `HandoffNotice`: the seat HOLDS the atom. Nothing is
 *  withheld by role, so naming an owner would blame a person for a boundary
 * @type {Readonly<Record<string, string>>}
 *  between two machines. That distinction was correct in Wave D and survives. */
const VIA_ASN_KEY = {
  t_incomingshipment_ship: 'sdcSup.ship.advance.viaAsn.ship',
  t_incomingshipment_arrive: 'sdcSup.ship.advance.viaAsn.arrive'
};

/** The three advance verbs as DATA, so the gate above is applied to each of them
 *  by one code path. `key` is the availability key (three DISTINCT atoms — a
 *  seat may hold one and not another). */
const ADVANCE_VERBS = /** @type {const} */ ([
  {
    transitionId: 't_incomingshipment_ship',
    key: 'ship',
    labelKey: 'sdcSup.ship.advance.ship',
    okTitleKey: 'sdcSup.ship.advance.shipped.title',
    icon: Ship,
    variant: 'outline'
  },
  {
    transitionId: 't_incomingshipment_arrive',
    key: 'arrive',
    labelKey: 'sdcSup.ship.advance.arrive',
    okTitleKey: 'sdcSup.ship.advance.arrived.title',
    icon: Truck,
    variant: 'outline'
  },
  {
    transitionId: 't_incomingshipment_cancel',
    key: 'cancel',
    labelKey: 'sdcSup.ship.advance.cancel',
    okTitleKey: 'sdcSup.ship.advance.cancelled.title',
    icon: undefined,
    variant: 'secondary'
  }
]);

/** @typedef {(typeof ADVANCE_VERBS)[number]['key']} AdvanceKey */

/**
 * @param {IncomingShipment} s
 * @param {string} transitionId
 * @returns {boolean}
 */
const legalOn = (s, transitionId) =>
  userVerbsFrom('incomingShipment', s.lifecycle).some((v) => v.id === transitionId);

/**
 * One reported shipment leg on the Shipments tab: material and direction, the
 * supplier's declared lifecycle beside Paragon's ASN observation, the leg's
 * facts, and the three advance verbs, each gated per verb in its own slot.
 *
 * `advance` holds the three verb availabilities (keyed like `ADVANCE_VERBS`);
 * `pending` disables the verbs while an advance on this leg is in flight;
 * `onAdvance(key, okTitleKey)` runs the verb `key` on this leg.
 * @type {React.FC<{ view: IncomingShipmentView; advance: Record<AdvanceKey, VerbAvailability>; pending: boolean; onAdvance: (key: AdvanceKey, okTitleKey: string) => void; }>}
 */
const ShipmentCard = ({ view: { shipment: s, asnTracking }, advance, pending, onAdvance }) => {
  const { t } = useTranslation();
  return (
    <div className="bg-bg-surface border border-border-subtle rounded-lg shadow-sm border-l-2 border-l-teal p-5">
      <div className="flex items-start justify-between gap-3 flex-wrap">
        <div className="min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <Data className="text-sm font-bold text-text-primary">{s.materialCode}</Data>
            <span className={CHIP}>{t(DIRECTION_LABEL_KEY[s.direction])}</span>
          </div>
          <div className="text-base font-semibold text-text-primary mt-1">
            {materialLabel(s.materialCode)}
          </div>
        </div>
        <div className="flex flex-col items-end gap-1">
          {/* AXIS 1 — the supplier's DECLARED state. Always rendered, on
              every leg, in both directions. This is what `_ship`,
              `_arrive` and `_cancel` move, and until this batch a
              to-paragon leg never showed it. */}
          <StatusPill variant="neutral">
            {t(LIFECYCLE_LABEL_KEY[s.lifecycle] ?? 'sdcSup.ship.state.booked')}
          </StatusPill>
          {/* AXIS 2 — Paragon's inbound observation, BESIDE the declared
              state rather than instead of it. Present only where an ASN
              exists. The raw `AsnStatus` token is handed to StatusPill,
              which localises its own children. */}
          {asnTracking && (
            <div className="flex items-center gap-1.5" data-testid="ship-asn-tracking">
              <span className="text-[length:var(--fs-caption-1)] uppercase tracking-wide text-text-tertiary">
                {t('sdcSup.ship.asnAxis', { asn: asnTracking.asnRef })}
              </span>
              <StatusPill variant={statusTone(asnTracking.asnStatus)}>
                {asnTracking.asnStatus}
              </StatusPill>
            </div>
          )}
        </div>
      </div>
      <dl className="grid grid-cols-2 sm:grid-cols-4 gap-3 mt-4">
        <div className="bg-bg-hover rounded-md px-3 py-2">
          <dt className="text-label text-text-tertiary uppercase mb-0.5">
            {t('sdcSup.ship.col.qty')}
          </dt>
          <Data as="dd" className="text-sm font-semibold">
            {formatNumber(s.qty)} {s.uom}
          </Data>
        </div>
        <div className="bg-bg-hover rounded-md px-3 py-2">
          <dt className="text-label text-text-tertiary uppercase mb-0.5">
            {t('sdcSup.ship.col.eta')}
          </dt>
          <Data as="dd" className="text-sm font-semibold">
            {s.eta ? formatDate(s.eta) : '—'}
          </Data>
        </div>
        <div className="bg-bg-hover rounded-md px-3 py-2">
          <dt className="text-label text-text-tertiary uppercase mb-0.5">
            {t('sdcSup.ship.col.etd')}
          </dt>
          <Data as="dd" className="text-sm font-semibold">
            {s.etd ? formatDate(s.etd) : '—'}
          </Data>
        </div>
        <div className="bg-bg-hover rounded-md px-3 py-2">
          <dt className="text-label text-text-tertiary uppercase mb-0.5">
            {s.direction === 'to-paragon' ? t('sdcSup.ship.col.asn') : t('sdcSup.ship.col.awb')}
          </dt>
          <Data as="dd" className="text-sm font-semibold">
            {s.direction === 'to-paragon' ? (s.asnRef ?? '—') : (s.awb ?? '—')}
          </Data>
        </div>
      </dl>
      {/* the three advance verbs, each in its OWN slot */}
      <div className="flex items-center justify-end gap-2 flex-wrap mt-4 pt-4 border-t border-border-subtle">
        {/* ONE renderer, not three copies. The per-verb gate is applied in
            a SINGLE place so it cannot be applied inconsistently. The
            previous shape repeated four near-identical lines per verb
            around a gate that sat OUTSIDE all three — which is exactly
            what made a per-direction answer the only expressible one. */}
        {ADVANCE_VERBS.map(({ transitionId, key, labelKey, okTitleKey, icon, variant }) => {
          if (!legalOn(s, transitionId)) return null;
          const suffix = transitionId.replace('t_incomingshipment_', '');

          // 1. Does the linked ASN already track this movement? Then the
          //    act belongs to the ASN machine, and the line names it.
          if (duplicatesAsnTracker(s, transitionId)) {
            return (
              <span
                key={transitionId}
                className="text-xs text-text-tertiary"
                data-testid={`ship-advance-via-asn-${suffix}`}
              >
                {t(VIA_ASN_KEY[transitionId], { asn: s.asnRef ?? '—' })}
              </span>
            );
          }

          // 2. Does the seat hold the atom? A different question, asked
          //    SECOND: a role cannot grant an act the leg does not support,
          //    so "Awaiting <owner>" must never stand in for (1).
          const availability = advance[key];
          if (availability.kind !== 'held') {
            return (
              <HandoffNotice
                key={transitionId}
                availability={availability}
                testId={`handoff-incomingshipment-${suffix}`}
              />
            );
          }

          return (
            <Button
              key={transitionId}
              variant={variant}
              icon={icon}
              disabled={pending}
              onClick={() => onAdvance(key, okTitleKey)}
            >
              {t(labelKey)}
            </Button>
          );
        })}
        {/* A terminal leg has no verbs left. Say so rather than rendering
            an empty bar that reads as a loading state. */}
        {ADVANCE_VERBS.every(({ transitionId }) => !legalOn(s, transitionId)) && (
          <span className="text-xs text-text-tertiary" data-testid="ship-advance-terminal">
            {t('sdcSup.ship.advance.terminal')}
          </span>
        )}
      </div>
    </div>
  );
};

export default ShipmentCard;
