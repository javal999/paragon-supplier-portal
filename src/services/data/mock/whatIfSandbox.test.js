// ────────────────────────────────────────────────────────────────────────────
// BL-202 (DRC-17) — the what-if sandbox through the REAL MockCommandService and
// the REAL procurement service.
//
//   · the live inputs: the current plan in the sandbox IS the live plan's
//     figure (DA, ROP Supplier); RM runs 52 weeks, PM 24 (BR-04);
//   · saving (BR-05): a buyer seat saves; a supplier is refused at SCOPE and a
//     seat without the atom at the ROLE gate; every outcome is in the audit
//     trail; the store only grows; three scenarios compare; a scenario saved
//     under an older rules version is flagged;
//   · BR-06: running and saving scenarios leaves every live store unchanged;
//   · BR-07: a supplier persona reads nothing.
// ────────────────────────────────────────────────────────────────────────────

import { beforeEach, describe, expect, it } from 'vitest';
import { MockCommandService, commandAuditSink } from './MockCommandService';
import { MockProcurementService } from './MockProcurementService';
import { whatIfScenarioStore } from './stores/whatIfScenarioStore';
import { whatIfLiveInputs, whatIfPairs, whatIfSandbox } from './whatIfSandboxReadModel';
import { allDemandAnticipation } from './demandAnticipationReadModel';
import { observeNpdTags, systemRopSuppliers } from './osipRopReadModel';
import { demandAnticipationStore } from './stores/demandAnticipationStore';
import { purchaseOrderStore } from './stores/purchaseOrderStore';
import { callOffStore } from './stores/callOffStore';
import { osipLevelStore } from './stores/osipLevelStore';
import { ptiStockStore } from './stores/ptiStockStore';
import { callOffTriggerStore } from './stores/callOffTriggerStore';
import { npdTagStore } from './stores/npdTagStore';
import { consumptionStore } from './stores/consumptionStore';
import { feedstockConfirmationStore } from './stores/feedstockConfirmationStore';
import { engineDataset } from './fixtures/engineDataset';
import { primarySource } from '../../engine/requirement';
import { simulationOverrideStore } from './stores/simulationOverrideStore';
import { purchaseRequisitionStore } from './stores/purchaseRequisitionStore';
import { materialOverlayStore } from './stores/materialOverlayStore';
import { warehouseDecisionStore } from './stores/warehouseDecisionStore';
import { planningGroupStore } from './stores/planningGroupStore';
import { hubSettingsStore } from '../../transitions/hubSettingsStore';
import { PERSONA_SYSTEM_ROLES } from '../../transitions/businessRoles';
import { RULES_VERSION } from '../../transitions/osipRules';
import {
  DEFAULT_SWITCHES,
  PPT7_SUPPLIER_ID,
  compareRuns,
  headlinesOf,
  mergeSwitches,
  runWhatIf,
  withSwitch
} from '../../transitions/whatIfSandboxRules';
import { sdcClock } from '../../sdc';
import { SSTP_SUPPLIER_ID, sstpInputs } from '../../transitions/whatIfSstpPreset';
import { hubWeeks } from '../../transitions/demandAnticipationRules';
import { NO_PERSON } from '@context/noPerson';
/** @import { QueryScope } from '../types' */
/** @import { WhatIfInputs, WhatIfSwitches } from '../../transitions/whatIfSandboxRules' */

const svc = new MockCommandService();
const reads = new MockProcurementService();

/** @type {QueryScope} */
const buyer = {
  personaType: 'buyer',
  supplierId: null,
  businessRoles: PERSONA_SYSTEM_ROLES.buyer,
  actor: NO_PERSON
};
/** @type {QueryScope} */
const finance = { ...buyer, businessRoles: ['finance'] };
/** @type {QueryScope} */
const supplier = {
  personaType: 'supplier',
  supplierId: 'sup-007',
  businessRoles: PERSONA_SYSTEM_ROLES.supplier,
  actor: NO_PERSON
};

const PM = { supplierId: 'sup-007', materialCode: 'PK-PETB-8802' };
const RM = { supplierId: 'sup-002', materialCode: 'RM-EMUL-9410' };

/** @param {{ supplierId: string; materialCode: string }} pair */
const live = (pair) =>
  /** @type {WhatIfInputs} */ (whatIfLiveInputs(pair.supplierId, pair.materialCode));

/**
 * @param {string} name
 * @param {WhatIfSwitches} switches
 * @param {QueryScope} [scope]
 * @param {WhatIfInputs} [inputs]
 */
const save = (name, switches, scope = buyer, inputs = live(PM)) =>
  svc.dispatch(scope, {
    transitionId: 't_whatifscenario_save',
    entity: 'whatIfScenario',
    payload: {
      name,
      supplierId: inputs.supplierId,
      materialCode: inputs.materialCode,
      inputs,
      switches
    }
  });

beforeEach(() => {
  whatIfScenarioStore.reset();
  commandAuditSink.clear();
  sdcClock.reset();
});

describe('the fixture pairs this file rests on (population control)', () => {
  it('PK-PETB-8802 × sup-007 is packaging and RM-EMUL-9410 × sup-002 raw material, both in the plan', () => {
    const pairs = whatIfPairs();
    const pm = pairs.find(
      (p) => p.supplierId === PM.supplierId && p.materialCode === PM.materialCode
    );
    const rm = pairs.find(
      (p) => p.supplierId === RM.supplierId && p.materialCode === RM.materialCode
    );
    expect(pm).toMatchObject({ materialClass: 'PM', horizonWeeks: 24, inPlan: true });
    expect(rm).toMatchObject({ materialClass: 'RM', horizonWeeks: 52, inPlan: true });
    expect(pairs[0]).toMatchObject({ supplierId: PPT7_SUPPLIER_ID, preset: true });
    expect(whatIfScenarioStore.all()).toEqual([]);
  });

  it('U-09 (BL-247): each material marks one pair primary, its primarySource supplier; the sandbox read agrees', () => {
    const pairs = whatIfPairs().filter((p) => !p.preset);
    const { sources } = engineDataset();
    for (const code of new Set(pairs.map((p) => p.materialCode))) {
      const primary = pairs.filter((p) => p.materialCode === code && p.primary);
      expect(primary).toHaveLength(1);
      expect(primary[0].supplierId).toBe(primarySource(sources, code)?.supplierId);
      expect(whatIfSandbox(primary[0].supplierId, code)?.pair.primary).toBe(true);
    }
    // Runs the sandbox once per material (about 2 s alone); the full suite's parallel load
    // took it past the 5 s default in two gates runs, so this one test is given room.
  }, 30_000);
});

describe('BR-04 · the horizon: RM 52 weeks, PM 24', () => {
  it('a raw material runs 52 weeks and a packaging material 24, from the hub week', () => {
    expect(live(RM).weeks).toHaveLength(52);
    expect(live(PM).weeks).toHaveLength(24);
    expect(runWhatIf(live(RM)).weeks).toHaveLength(52);
    expect(live(PM).planningWeek).toBe(live(PM).weeks[0]);
  });
});

describe('BR-03 · the current plan in the sandbox is the live plan', () => {
  it('the DA figure equals the rolling DA read’s own (today’s) figure', () => {
    const row = allDemandAnticipation().find(
      (r) => r.supplierId === PM.supplierId && r.materialCode === PM.materialCode
    );
    expect(row).toBeDefined();
    expect(runWhatIf(live(PM)).da).toEqual(row?.today);
  });

  it('ROP Supplier equals the system figure the PTI stock view shows (DRC-D15)', () => {
    const run = runWhatIf(live(PM));
    expect(run.rops.supplier.ropSupplier).toEqual(
      systemRopSuppliers().get(`${PM.supplierId}|${PM.materialCode}`)
    );
  });

  // [Owner FSR-D6, 2026-11-03] BL-261 (U-01) — PK-PETB-8801 × sup-007, the pair
  // the Foresight review walked: on DRC-B37 one draft of 22,800 and "PR 0"
  // beside 22 weeks of negative stock; on the default a chain of call-offs
  // until the OSPO balance (122,000) is used up, then a PR for what no open PO
  // covers.
  it('PK-PETB-8801 × sup-007: a chain of call-offs plus a PR on the default; the review’s figures on DRC-B37', () => {
    const inputs = live({ supplierId: 'sup-007', materialCode: 'PK-PETB-8801' });
    expect(inputs.ospoStart).toBe(122_000);
    const chain = runWhatIf(inputs);
    expect(chain.rops.ropFisik.value).toBe(12_000);
    expect(chain.callOffs.map((c) => c.qty)).toEqual([22_800, 38_000, 30_400, 30_400, 400]);
    expect(chain.totalDrafted).toBe(122_000);
    // PEX-2 — 657,193 under the 13-week grid. Weeks 14 to 17 are weekly lines
    // now and January 2027 starts on 28 December (BR-03); the LTP read spreads
    // a month line over its calendar month, so the weekly LTP from 28 December
    // shifts and the PR moves by 3.
    expect(chain.triggerPr).toBe(657_196);
    expect(chain.firstShortageWeek).toBe('2026-10-05');
    expect(chain.weeks.filter((w) => w.soh < 0)).toHaveLength(19);
    const b37 = runWhatIf(inputs, withSwitch(DEFAULT_SWITCHES, 'reArm', 'aboveRopFisik'));
    expect(b37.callOffs.map((c) => c.qty)).toEqual([22_800]);
    expect(b37.triggerPr).toBe(0);
    expect(b37.firstShortageWeek).toBe('2026-09-14');
    expect(b37.weeks.filter((w) => w.soh < 0)).toHaveLength(22);
  });
});

describe('BR-05 · saving a scenario (t_whatifscenario_save)', () => {
  it('a buyer seat saves; who, when, the inputs, the switches and RULES_VERSION are recorded', async () => {
    const switches = withSwitch(DEFAULT_SWITCHES, 'osip.z', 2);
    const r = await save('  Z at 2.0  ', switches);
    expect(r.status, r.reason).toBe('done');
    const row = whatIfScenarioStore.get(/** @type {string} */ (r.entityId));
    expect(row).toMatchObject({
      name: 'Z at 2.0',
      supplierId: PM.supplierId,
      materialCode: PM.materialCode,
      rulesVersion: RULES_VERSION,
      savedAt: sdcClock.now(),
      savedBy: NO_PERSON
    });
    expect(row?.inputs).toEqual(live(PM));
    expect(row?.switches.osip.z).toBe(2);
    // DRC-D16 — the headline figures at save, stamped with the rules version.
    expect(row?.figuresAtSave.rulesVersion).toBe(RULES_VERSION);
    expect(row?.figuresAtSave.value).toEqual(headlinesOf(runWhatIf(live(PM), switches)));
  });

  it('a supplier is refused at SCOPE, and nothing is stored', async () => {
    await expect(save('mine', DEFAULT_SWITCHES, supplier)).rejects.toMatchObject({
      code: 'SCOPE_DENIED'
    });
    expect(whatIfScenarioStore.all()).toEqual([]);
  });

  it('a seat without whatifscenario:save is refused at the role gate', async () => {
    const r = await save('finance', DEFAULT_SWITCHES, finance);
    expect(r.status).toBe('failed');
    expect(r.reason?.split(':')[0]).toBe('ROLE_NOT_PERMITTED');
    expect(whatIfScenarioStore.all()).toEqual([]);
  });

  it('the policy refuses a nameless scenario, an unknown pair and a bad switch', async () => {
    const noName = await save(' ', DEFAULT_SWITCHES);
    expect(noName.reason).toBe('POLICY_REJECTED:whatifscenario_valid:NAME_REQUIRED');
    const unknown = await save('x', DEFAULT_SWITCHES, buyer, {
      ...live(PM),
      supplierId: 'sup-999'
    });
    expect(unknown.reason).toBe('POLICY_REJECTED:whatifscenario_valid:UNKNOWN_PAIR');
    const bad = await save('x', withSwitch(DEFAULT_SWITCHES, 'maxCap', 'up'));
    expect(bad.reason).toBe('POLICY_REJECTED:whatifscenario_valid:SWITCHES_INVALID:maxCap');
    expect(whatIfScenarioStore.all()).toEqual([]);
  });

  it('every outcome is written to the audit trail', async () => {
    await save('ok', DEFAULT_SWITCHES);
    await save(' ', DEFAULT_SWITCHES);
    const events = commandAuditSink.byEvent('t_whatifscenario_save');
    expect(events.map((e) => e.outcome)).toEqual(['done', 'failed']);
    expect(events[1]?.reason).toBe('POLICY_REJECTED:whatifscenario_valid:NAME_REQUIRED');
  });

  it('append-only: saving the same name again is a new scenario; nothing is replaced', async () => {
    const a = await save(
      'Spread',
      withSwitch(DEFAULT_SWITCHES, 'osip.daSafetyPlacement', 'spread')
    );
    const b = await save('Spread', DEFAULT_SWITCHES);
    expect(a.entityId).not.toBe(b.entityId);
    expect(whatIfScenarioStore.all().map((s) => s.id)).toEqual([a.entityId, b.entityId]);
    expect(
      whatIfScenarioStore.get(/** @type {string} */ (a.entityId))?.switches.osip.daSafetyPlacement
    ).toBe('spread');
  });

  it('the PPT 7 case saves like any pair, so the team can record the result it confirms', async () => {
    const ppt7 = /** @type {WhatIfInputs} */ (whatIfLiveInputs(PPT7_SUPPLIER_ID, '2000041501'));
    const r = await save(
      'PPT 7, sheet ROP Fisik',
      withSwitch(DEFAULT_SWITCHES, 'osip.fisikSafety', 'sheet'),
      buyer,
      ppt7
    );
    expect(r.status, r.reason).toBe('done');
    expect(whatIfSandbox(PPT7_SUPPLIER_ID, '2000041501')?.scenarios).toHaveLength(1);
  });

  it('the SSTP planner Excel is offered second, opens on the sheet inputs and saves like any pair', async () => {
    const pairs = whatIfPairs();
    expect(pairs[1]).toMatchObject({
      supplierId: SSTP_SUPPLIER_ID,
      materialCode: '2000028400',
      preset: true,
      materialClass: 'PM'
    });
    const sstp = /** @type {WhatIfInputs} */ (whatIfLiveInputs(SSTP_SUPPLIER_ID, '2000028400'));
    expect(sstp).toEqual(sstpInputs(hubWeeks(sdcClock.now(), 24)));
    expect(whatIfLiveInputs(SSTP_SUPPLIER_ID, '2000041501')).toBeNull();
    const r = await save('SSTP as the sheet', DEFAULT_SWITCHES, buyer, sstp);
    expect(r.status, r.reason).toBe('done');
    expect(whatIfSandbox(SSTP_SUPPLIER_ID, '2000028400')?.scenarios).toHaveLength(1);
  });
});

describe('BR-05 · comparing three scenarios with the current plan', () => {
  it('each saved scenario recalculates from its stored inputs and compares with the plan', async () => {
    await save('Z 2.0', withSwitch(DEFAULT_SWITCHES, 'osip.z', 2));
    await save('g 3 days', withSwitch(DEFAULT_SWITCHES, 'osip.fixedSafetyDays', 3));
    await save('Max by sheet', withSwitch(DEFAULT_SWITCHES, 'osip.maxRule', 'sheetGuidance'));
    const box = whatIfSandbox(PM.supplierId, PM.materialCode);
    expect(box?.scenarios.map((s) => s.name)).toEqual(['Z 2.0', 'g 3 days', 'Max by sheet']);
    const plan = runWhatIf(/** @type {NonNullable<typeof box>} */ (box).live);
    const moved = (box?.scenarios ?? []).map((s) =>
      compareRuns(plan, runWhatIf(s.inputs, mergeSwitches(s.switches)))
        .filter((d) => d.changed)
        .map((d) => d.key)
    );
    expect(moved[0]).toContain('safetyOrder');
    expect(moved[1]).toContain('ropFisik');
    expect(moved[1]).not.toContain('safetyOrder');
    expect(moved[2]).toContain('max');
    expect(moved[2]).not.toContain('ropFisik');
  });
});

describe('BR-05 · a rules-version change is flagged on the scenario', () => {
  it('a scenario saved under another RULES_VERSION reads rulesChanged; one saved now does not', async () => {
    await save('now', DEFAULT_SWITCHES);
    const inputs = live(PM);
    whatIfScenarioStore.add({
      name: 'before',
      supplierId: PM.supplierId,
      materialCode: PM.materialCode,
      inputs,
      switches: DEFAULT_SWITCHES,
      rulesVersion: 'osip-2026-10-01.1',
      figuresAtSave: {
        value: headlinesOf(runWhatIf(inputs)),
        inputs: {},
        rulesVersion: 'osip-2026-10-01.1'
      },
      savedAt: sdcClock.now(),
      savedBy: NO_PERSON
    });
    const flags = whatIfSandbox(PM.supplierId, PM.materialCode)?.scenarios.map((s) => [
      s.name,
      s.rulesChanged
    ]);
    expect(flags).toEqual([
      ['now', false],
      ['before', true]
    ]);
  });
});

describe('BR-06 · analysis only: running and saving leave every live store unchanged', () => {
  it('no DA, PO, call-off, level, stock, trigger, consumption or setting record moves', async () => {
    // The hub observes NPD tags around every command (BL-198); that is the
    // hub's own ledger, so it is taken before the snapshot, not left to the save.
    observeNpdTags();
    const snapshot = () =>
      JSON.stringify({
        da: demandAnticipationStore.all(),
        po: purchaseOrderStore.all(),
        callOffs: callOffStore.all(),
        levels: osipLevelStore.all(),
        stock: ptiStockStore.all(),
        trigger: callOffTriggerStore.all(),
        npd: npdTagStore.all(),
        consumption: consumptionStore.all(),
        feedstock: feedstockConfirmationStore.all(),
        simulation: simulationOverrideStore.all(),
        prs: purchaseRequisitionStore.all(),
        overlay: materialOverlayStore.all(),
        warehouse: warehouseDecisionStore.all(),
        planningGroups: planningGroupStore.all(),
        settings: hubSettingsStore.changes()
      });
    const before = snapshot();
    for (const pair of [PM, RM]) {
      const inputs = live(pair);
      runWhatIf({ ...inputs, soh: { J6: 0, J2: 0 }, upliftPct: 50, level: 6 });
      runWhatIf(inputs, withSwitch(DEFAULT_SWITCHES, 'osip.ospoIncludesNewPo', false));
      const r = await save(
        `what if ${pair.materialCode}`,
        withSwitch(DEFAULT_SWITCHES, 'osip.z', 3),
        buyer,
        {
          ...inputs,
          maxOverride: 1
        }
      );
      expect(r.status, r.reason).toBe('done');
    }
    await reads.getWhatIfSandbox(buyer, PM.supplierId, PM.materialCode);
    expect(snapshot()).toBe(before);
    expect(whatIfScenarioStore.all()).toHaveLength(2);
  });
});

describe('BR-07 · a supplier persona reads nothing', () => {
  it('the pairs read is empty and the sandbox read null for a supplier; PTI reads both', async () => {
    expect((await reads.getWhatIfPairs(supplier)).items).toEqual([]);
    expect(await reads.getWhatIfSandbox(supplier, PM.supplierId, PM.materialCode)).toBeNull();
    expect((await reads.getWhatIfPairs(buyer)).items.length).toBeGreaterThan(1);
    expect(
      (await reads.getWhatIfSandbox(buyer, PM.supplierId, PM.materialCode))?.live.materialCode
    ).toBe(PM.materialCode);
    expect(await reads.getWhatIfSandbox(buyer, 'sup-999', PM.materialCode)).toBeNull();
  });
});
