// BL-280 — TL-D11/TL-D17 on the planning pages BL-263 did not reach, on the
// owner's ruling of 2026-11-09 (planning pages only; RFx, admin and the
// supplier-, storefront- and buyer-facing dictionaries are not in scope). The
// team's term "lead time" stays English inside the Indonesian text, and the
// four glossary labels held from BL-263 follow it.

import { describe, expect, it } from 'vitest';
import { rescheduleId } from './reschedule';
import { orderPlanId } from './orderPlan';
import { stabiliseId } from './stabilise';
import { dataHealthId } from './dataHealth';
import { planGridId } from './planGrid';
import { materialRequirementId } from './materialRequirement';
import { modelBacktestId } from './modelBacktest';
import { stockSimulationId } from './stockSimulation';
import { safetyStockId } from './safetyStock';
import { TERM_LABEL_GLOSSARY } from '@lib/glossary/termLabels.glossary';
import { PLANNING_TERM_GLOSSARY } from '@lib/glossary/planning.glossary';

const DICTS = /** @type {const} */ ([
  ['reschedule', rescheduleId],
  ['orderPlan', orderPlanId],
  ['stabilise', stabiliseId],
  ['dataHealth', dataHealthId],
  ['planGrid', planGridId],
  ['materialRequirement', materialRequirementId],
  ['modelBacktest', modelBacktestId],
  ['stockSimulation', stockSimulationId],
  ['safetyStock', safetyStockId]
]);

describe('BL-280 — lead time stays English in the planning dictionaries', () => {
  it.each(DICTS)('%s has no "waktu tunggu" left', (_name, dict) => {
    const left = Object.entries(dict)
      .filter(([, v]) => /waktu tunggu/i.test(v))
      .map(([k]) => k);
    expect(left).toEqual([]);
  });

  it('the held safety lead time sentences say safety lead time', () => {
    expect(safetyStockId['sst.subtitle']).toContain('safety lead time');
    expect(safetyStockId['sst.def.slt']).toMatch(/^Safety lead time:/);
  });

  it('the four held glossary labels and the tips follow the team term', () => {
    expect(TERM_LABEL_GLOSSARY.poLeadTime.label.id).toBe('Lead time PO');
    expect(TERM_LABEL_GLOSSARY.safetyLeadTime.label.id).toBe('Safety lead time');
    expect(TERM_LABEL_GLOSSARY.sltGroupDefault.label.id).toBe(
      'Safety lead time dari nilai bawaan grup'
    );
    expect(TERM_LABEL_GLOSSARY.sltGroupDefault.id).toContain('safety lead time-nya');
    expect(TERM_LABEL_GLOSSARY.bottleneckLeadTime.label.id).toBe(
      'Lead time produksi bottleneck (ROP Supplier)'
    );
    for (const t of Object.values(PLANNING_TERM_GLOSSARY)) {
      expect(JSON.stringify(t)).not.toMatch(/waktu tunggu/i);
    }
  });
});
