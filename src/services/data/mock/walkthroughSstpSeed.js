// ────────────────────────────────────────────────────────────────────────────
// E2E WALKTHROUGH 2026-11-12 — THE PAIR'S LEDGER INPUTS, GROWN THROUGH THE VERBS.
//
// The fixtures (`fixtures/walkthroughSstp.js`) hold the pair's documents and its
// stock submission (the stock verbs are dispatched from ONE site, BL-73). What
// the hub records only through a governed verb is recorded here the same way,
// so each row carries its verb's audit event and passes its policy:
//   · t_ltpinput_set           — LTP A, the sheet's row 20 (planner seat);
//   · t_osipparam_set maxPti   — Max stock fisik PTI 25,488 (planner seat);
//   · t_feedstock_confirm      — the supplier's feedstock today.
// Called once at startup (`main.jsx`), after the other seeds and before the
// first render, so the DA publication the store seeds on first read already
// reads LTP A. Idempotent: an input already recorded is skipped. Tests never
// call it unless they mean to, so every suite still starts from the fixtures.
// ────────────────────────────────────────────────────────────────────────────

import { NO_PERSON } from '@context/noPerson';
import { PERSONA_SYSTEM_ROLES } from '../../transitions/businessRoles';
import { dayOf } from '../../engine/dates';
import { sdcClock } from '../../sdc';
import { MockCommandService } from './MockCommandService';
import { SSTP, SSTP_FIGURES, SSTP_LTP_WEEKS } from './fixtures/walkthroughSstp';
import { ltpInputStore } from './stores/ltpInputStore';
import { osipParamStore } from './stores/osipParamStore';
import { feedstockConfirmationStore } from './stores/feedstockConfirmationStore';
/** @import { QueryScope } from '../types' */

/** @type {QueryScope} */
const PLANNER = {
  personaType: 'buyer',
  supplierId: null,
  businessRoles: ['planning'],
  actor: NO_PERSON
};
/** @type {QueryScope} */
const SUPPLIER = {
  personaType: 'supplier',
  supplierId: SSTP.supplierId,
  businessRoles: PERSONA_SYSTEM_ROLES.supplier,
  actor: NO_PERSON
};

/** The file name the LTP upload records, so the grid says where A came from. */
export const SSTP_LTP_SOURCE_FILE =
  'Coret-coret demand ROP.xlsx — Simulasi SSTP - stable (2), row 20';

/**
 * `seeded`: verbs that landed now. `skipped`: inputs already on record.
 * `refused`: the verbs that refused, with the dispatcher's words.
 * @typedef {{
 *   readonly seeded: readonly string[];
 *   readonly skipped: readonly string[];
 *   readonly refused: readonly { readonly verb: string; readonly reason?: string }[];
 * }} WalkthroughSeedOutcome
 */

/**
 * Record the pair's ledger inputs.
 * @param {MockCommandService} [commands]
 * @returns {Promise<WalkthroughSeedOutcome>}
 */
export async function seedWalkthroughSstp(commands = new MockCommandService()) {
  /** @type {string[]} */ const seeded = [];
  /** @type {string[]} */ const skipped = [];
  /** @type {{ verb: string; reason?: string }[]} */ const refused = [];
  /**
   * @param {string} verb
   * @param {boolean} already
   * @param {() => Promise<import('../types').CommandResult>} run
   */
  const step = async (verb, already, run) => {
    if (already) {
      skipped.push(verb);
      return;
    }
    const r = await run();
    if (r.status === 'failed') refused.push({ verb, reason: r.reason });
    else seeded.push(verb);
  };
  const { materialCode, supplierId } = SSTP;

  await step(
    't_ltpinput_set',
    ltpInputStore.all().some((r) => r.materialCode === materialCode && r.series === 'A'),
    () =>
      commands.dispatch(PLANNER, {
        transitionId: 't_ltpinput_set',
        entity: 'ltpInput',
        entityId: `upload|${materialCode}|A`,
        payload: { weeks: { ...SSTP_LTP_WEEKS }, sourceFile: SSTP_LTP_SOURCE_FILE }
      })
  );
  await step(
    't_osipparam_set',
    osipParamStore.valueOf(`maxPti|${supplierId}|${materialCode}`) !== undefined &&
      osipParamStore.valueOf(`maxPti|${supplierId}|${materialCode}`) !== null,
    () =>
      commands.dispatch(PLANNER, {
        transitionId: 't_osipparam_set',
        entity: 'osipParam',
        entityId: `maxPti|${supplierId}|${materialCode}`,
        payload: { osipParamValue: SSTP_FIGURES.maxStockFisikPti }
      })
  );
  await step(
    't_feedstock_confirm',
    feedstockConfirmationStore
      .all()
      .some((f) => f.supplierId === supplierId && f.materialCode === materialCode),
    () =>
      commands.dispatch(SUPPLIER, {
        transitionId: 't_feedstock_confirm',
        entity: 'feedstockConfirmation',
        payload: {
          supplierId,
          materialCode,
          feedstockQty: SSTP_FIGURES.supplierFeedstock,
          confirmedOn: dayOf(sdcClock.now())
        }
      })
  );
  return { seeded, skipped, refused };
}
