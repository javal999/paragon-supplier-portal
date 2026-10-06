// ────────────────────────────────────────────────────────────────────────────
// The item-type library, the break rules, the template store's honest read and
// the session attachment store (RFx spec 2026-09-21). Each probed both ways.
// ────────────────────────────────────────────────────────────────────────────

import { describe, it, expect, beforeEach } from 'vitest';
import { resources } from '@lib/i18n';

const enResources = /** @type {Record<string, string>} */ (resources.en.translation);
const idResources = /** @type {Record<string, string>} */ (resources.id.translation);
import { RFQ_ITEM_TYPES, rfqItemType, specSheetFor } from './rfqItemTypes';
import {
  RFQ_ITEM_TYPE_IDS,
  addTier,
  deriveQuoteHeader,
  readTierQty,
  refusalCode,
  tierPieces,
  tiersForItem
} from './rfqModel';
import {
  RFQ_TEMPLATES_KEY,
  SYSTEM_RFQ_TEMPLATES,
  rfqTemplateStore,
  templateContentRefusal
} from './rfqTemplates';
import { sessionAttachments, formatBytes } from '../attachments/sessionAttachments';

describe('the item-type library', () => {
  it('every item type the model names has a library entry, and nothing else does', () => {
    expect(RFQ_ITEM_TYPES.map((t) => t.id).sort()).toEqual([...RFQ_ITEM_TYPE_IDS].sort());
    for (const id of RFQ_ITEM_TYPE_IDS) expect(rfqItemType(id).id).toBe(id);
  });

  it('the sticker splits the sheet the way the Oslo sample does', () => {
    /** @param {string} who */
    const by = (who) =>
      specSheetFor('sticker')
        .filter((f) => f.filledBy === who)
        .map((f) => f.key);
    expect(by('buyer')).toEqual([
      'material',
      'size',
      'printingColours',
      'finishing',
      'form',
      'inkStandard'
    ]);
    expect(by('supplier')).toEqual(['brand', 'machine', 'dieCutType']);
    expect(specSheetFor('sticker').find((f) => f.key === 'form')?.options).toEqual([
      'roll',
      'sheet'
    ]);
    expect(specSheetFor('sticker').find((f) => f.key === 'dieCutType')?.options).toEqual([
      'flexible',
      'flatbed'
    ]);
  });

  it('the unit box is filled by the buyer alone; the bottle names the supplier product code', () => {
    expect(specSheetFor('unitBox').every((f) => f.filledBy === 'buyer')).toBe(true);
    expect(specSheetFor('unitBox').map((f) => f.key)).toEqual([
      'boxType',
      'materialGsm',
      'formedSize',
      'flatSize',
      'printing',
      'finishing',
      'decoration',
      'dieCutType',
      'inkNote'
    ]);
    expect(
      specSheetFor('bottleClosure')
        .filter((f) => f.filledBy === 'supplier')
        .map((f) => f.key)
    ).toEqual(['supplierProductCode']);
  });

  it('the mold component asks the moulder for cavities, cycle time, capacity and lead time, and requests the mold', () => {
    const m = rfqItemType('moldComponent');
    expect(m.fields.filter((f) => f.filledBy === 'supplier').map((f) => f.key)).toEqual([
      'cavities',
      'cycleTime',
      'weeklyCapacity',
      'developmentLeadTime'
    ]);
    expect(
      m.fields.filter((f) => f.filledBy === 'supplier').every((f) => f.kind === 'number')
    ).toBe(true);
    expect(m.oneTimeCosts).toEqual(['mold']);
    // KNOWN-GOOD twin — a bottle requests no one-time cost by default.
    expect(rfqItemType('bottleClosure').oneTimeCosts).toEqual([]);
  });

  it('every label, unit and option the library names is a key in BOTH languages', () => {
    const keys = /** @type {Set<string>} */ (new Set());
    for (const t of RFQ_ITEM_TYPES) {
      keys.add(t.labelKey);
      for (const f of t.fields) {
        if (f.labelKey) keys.add(f.labelKey);
        if (f.unitKey) keys.add(f.unitKey);
        for (const o of f.options ?? []) keys.add(`rfqAuthoring.opt.${o}`);
      }
    }
    for (const k of keys) {
      expect(enResources[k], `EN ${k}`).toBeTruthy();
      expect(idResources[k], `ID ${k}`).toBeTruthy();
    }
    expect(enResources['rfqAuthoring.field.sticker.nope']).toBeUndefined();
  });

  it('a fresh sheet is a COPY — editing it cannot edit the library', () => {
    const a = specSheetFor('sticker');
    /** @type {{ value?: string }} */ (a[0]).value = 'mutated';
    expect(
      /** @type {import('./rfqModel').RfqSpecField} */ (specSheetFor('sticker')[0]).value
    ).toBeUndefined();
  });
});

describe('quantity breaks', () => {
  it('reads "3K" as 3,000 and refuses what the one parser refuses', () => {
    expect(readTierQty('3K')).toEqual({ ok: true, value: 3_000 });
    expect(readTierQty('50000')).toEqual({ ok: true, value: 50_000 });
    expect(readTierQty('2.400')).toMatchObject({ ok: false, reason: 'AMBIGUOUS_QTY' });
    expect(readTierQty('0')).toMatchObject({ ok: false, reason: 'NOT_POSITIVE' });
    expect(readTierQty('lots')).toMatchObject({ ok: false });
  });

  it('adding keeps the set strictly increasing and refuses a duplicate or a ninth', () => {
    const r = addTier([{ qty: 5_000, basis: 'total' }], { qty: 3_000, basis: 'total' });
    expect(r.ok && r.tiers.map((t) => t.qty)).toEqual([3_000, 5_000]);
    expect(addTier([{ qty: 5_000, basis: 'total' }], { qty: 5_000, basis: 'perVariant' })).toEqual({
      ok: false,
      reason: 'DUPLICATE'
    });
    const eight = Array.from({ length: 8 }, (_, i) => ({
      qty: i + 1,
      basis: /** @type {const} */ ('total')
    }));
    expect(addTier(eight, { qty: 99, basis: 'total' })).toEqual({ ok: false, reason: 'TOO_MANY' });
  });

  it('an item override replaces the RFQ breaks; per variant multiplies by the variants', () => {
    const item = {
      lineNo: 1,
      itemType: /** @type {const} */ ('other'),
      description: 'x',
      variantCount: 8,
      uom: 'PCS',
      specFields: []
    };
    const rfq = { tiers: [{ qty: 3_000, basis: /** @type {const} */ ('perVariant') }] };
    expect(tiersForItem(rfq, item)).toEqual(rfq.tiers);
    expect(tiersForItem(rfq, { ...item, tiers: [{ qty: 1, basis: 'total' }] })).toEqual([
      { qty: 1, basis: 'total' }
    ]);
    expect(tierPieces({ qty: 3_000, basis: 'perVariant' }, item)).toBe(24_000);
    expect(tierPieces({ qty: 3_000, basis: 'total' }, item)).toBe(3_000);
  });

  it('the derived header refuses to invent a price for a missing break', () => {
    const item = {
      lineNo: 1,
      itemType: /** @type {const} */ ('other'),
      description: 'x',
      variantCount: 2,
      uom: 'PCS',
      specFields: []
    };
    const rfq = {
      items: [item],
      tiers: [{ qty: 100, basis: /** @type {const} */ ('perVariant') }],
      totalQty: 200
    };
    expect(
      deriveQuoteHeader(rfq, [
        {
          itemLineNo: 1,
          tierPrices: [{ tierQty: 100, unitPrice: 10 }],
          oneTimeCosts: [{ name: 'Plate', amount: 500 }]
        }
      ])
    ).toEqual({ totalPrice: 2_500, unitPrice: 12.5 });
    expect(
      deriveQuoteHeader(rfq, [{ itemLineNo: 1, tierPrices: [{ tierQty: 999, unitPrice: 10 }] }])
    ).toBeNull();
  });

  it('refusalCode reads the code through the dispatcher envelope', () => {
    expect(
      refusalCode('POLICY_REJECTED:rfq_create_valid:NO_ITEMS: an RFQ sources at least one item')
    ).toBe('NO_ITEMS');
    expect(refusalCode('TIER_COUNT: x')).toBe('TIER_COUNT');
  });
});

describe('the template store — an honest read', () => {
  beforeEach(() => {
    rfqTemplateStore.reset();
  });

  const content = /** @type {import('./rfqTemplates').RfqTemplate} */ (SYSTEM_RFQ_TEMPLATES[0])
    .content;

  it('ABSENT: nothing saved yet — the two system templates, and the read says absent', () => {
    expect(rfqTemplateStore.all().map((t) => t.id)).toEqual([
      'sys-sticker-roll-tiered',
      'sys-unit-box-papercard'
    ]);
    expect(rfqTemplateStore.readState()).toMatchObject({
      absent: true,
      unreadable: false,
      saved: []
    });
  });

  it('the system templates are sound by the rule a saved one is read with', () => {
    for (const t of SYSTEM_RFQ_TEMPLATES)
      expect(templateContentRefusal(t.content), t.id).toBeNull();
  });

  it('a saved template survives a reload, and is never a system template', () => {
    const r = rfqTemplateStore.save('  Oslo sticker set ', content);
    expect(r.ok && r.persisted).toBe(true);
    rfqTemplateStore.rehydrate();
    const saved = rfqTemplateStore.readState().saved;
    expect(saved.map((t) => t.name)).toEqual(['Oslo sticker set']);
    expect(/** @type {import('./rfqTemplates').RfqTemplate} */ (saved[0]).system).toBe(false);
    expect(window.localStorage.getItem(RFQ_TEMPLATES_KEY)).not.toContain('sys-sticker');
  });

  it('EMPTY: a stored empty list is "nothing saved", NOT absent and NOT corrupt', () => {
    window.localStorage.setItem(RFQ_TEMPLATES_KEY, JSON.stringify({ v: 1, templates: [] }));
    rfqTemplateStore.rehydrate();
    expect(rfqTemplateStore.readState()).toMatchObject({
      absent: false,
      unreadable: false,
      saved: []
    });
  });

  it('CORRUPT: unparseable storage is reported as unreadable, never as an empty success', () => {
    window.localStorage.setItem(RFQ_TEMPLATES_KEY, '{not json');
    rfqTemplateStore.rehydrate();
    expect(rfqTemplateStore.readState()).toMatchObject({ unreadable: true, absent: false });
    // The system templates still stand — they were never in storage.
    expect(rfqTemplateStore.all()).toHaveLength(2);
    // A wrong envelope is corrupt too.
    window.localStorage.setItem(RFQ_TEMPLATES_KEY, JSON.stringify({ v: 2, templates: [] }));
    rfqTemplateStore.rehydrate();
    expect(rfqTemplateStore.readState().unreadable).toBe(true);
  });

  it('each row is RE-VALIDATED: a bad row is refused BY NAME, the good row beside it stands', () => {
    const good = { id: 'tpl-good', name: 'Good', content };
    const badTiers = {
      id: 'tpl-bad',
      name: 'Bad',
      content: {
        ...content,
        tiers: [
          { qty: 5, basis: 'total' },
          { qty: 1, basis: 'total' }
        ]
      }
    };
    const system = { id: 'sys-unit-box-papercard', name: 'Shadow', content };
    window.localStorage.setItem(
      RFQ_TEMPLATES_KEY,
      JSON.stringify({ v: 1, templates: [good, badTiers, system, 'junk'] })
    );
    rfqTemplateStore.rehydrate();
    const s = rfqTemplateStore.readState();
    expect(s.saved.map((t) => t.id)).toEqual(['tpl-good']);
    expect(s.rejected).toEqual([
      { id: 'tpl-bad', reason: expect.stringMatching(/^TIERS_NOT_INCREASING/) },
      { id: 'sys-unit-box-papercard', reason: expect.stringMatching(/^TEMPLATE_SYSTEM_ID/) },
      { id: 'row 3', reason: expect.stringMatching(/^TEMPLATE_MALFORMED/) }
    ]);
  });

  it('save refuses what the read would refuse, and a nameless template', () => {
    expect(rfqTemplateStore.save('X', { ...content, items: [] })).toMatchObject({
      ok: false,
      reason: expect.stringMatching(/^NO_ITEMS/)
    });
    expect(rfqTemplateStore.save('   ', content)).toMatchObject({
      ok: false,
      reason: expect.stringMatching(/^TEMPLATE_UNNAMED/)
    });
    expect(rfqTemplateStore.readState().saved).toHaveLength(0);
  });

  it('a template may leave buyer values blank; the create verb may not', () => {
    const blank = {
      ...content,
      items: [
        {
          .../** @type {import('./rfqModel').RfqItem} */ (content.items[0]),
          specFields: specSheetFor('sticker')
        }
      ]
    };
    expect(templateContentRefusal(blank)).toBeNull();
  });
});

describe('session attachments — metadata on the record, the file for this session only', () => {
  beforeEach(() => sessionAttachments.reset());

  it('keeps name, size and type; the URL lives only in the session store', () => {
    const meta = sessionAttachments.add(
      new File(['hello'], 'brief.pdf', { type: 'application/pdf' })
    );
    expect(meta).toMatchObject({ name: 'brief.pdf', size: 5, type: 'application/pdf' });
    expect(Object.keys(meta).sort()).toEqual(['addedAt', 'id', 'name', 'size', 'type']);
    sessionAttachments.release(meta.id);
    expect(sessionAttachments.urlFor(meta.id)).toBeNull();
  });

  it('formats sizes', () => {
    expect(formatBytes(512)).toBe('512 B');
    expect(formatBytes(2048)).toBe('2 KB');
    expect(formatBytes(1_572_864)).toBe('1.5 MB');
  });
});
