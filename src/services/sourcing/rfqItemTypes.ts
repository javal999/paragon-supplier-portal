// ────────────────────────────────────────────────────────────────────────────
// THE ITEM-TYPE LIBRARY — the spec templates an RFQ item starts from (RFx
// working spec, "Buyer authoring", step 2).
//
// Config that Procurement owns. There is no admin screen for it in this batch
// (the spec's "later" list), so it is data in code, the `rfxConfig.ts`
// precedent. Each field is taken from the real Paragon samples:
//
//   · Sticker/label   — the Oslo RFQ (material, size, colours, finishing, roll
//                        or sheet, ink standard; the printer states brand,
//                        machine and die-cut type).
//   · Unit box/carton — the Iron RFQ (box type, board and gsm, formed and flat
//                        size, printing, finishing, decoration, die-cut, ink).
//   · Bottle/closure  — the Tundra RFQ (component, material, colour, net
//                        volume, decoration; the supplier's own product code).
//   · Mold component  — the Redwood 2.0 RFQ (component, material, decoration
//                        processes; the moulder states cavities, cycle time,
//                        weekly capacity and development lead time — and the
//                        mold itself is quoted as a one-time cost).
//
// Every label is an i18n KEY, never text: this module is evaluated at load,
// where `t()` does not exist (the module-scope literal gate).
// ────────────────────────────────────────────────────────────────────────────

import type { RfqItemTypeId, RfqOneTimeCostId, RfqSpecField } from './rfqModel';

export interface RfqItemTypeDefinition {
  readonly id: RfqItemTypeId;
  readonly labelKey: string;
  /** The unit an item of this type is usually counted in. */
  readonly defaultUom: string;
  readonly fields: readonly RfqSpecField[];
  /** The one-time costs requested by default for this type. */
  readonly oneTimeCosts: readonly RfqOneTimeCostId[];
}

const L = (type: string, key: string) => `rfqAuthoring.field.${type}.${key}`;

const buyer = (
  type: string,
  key: string,
  opts: Partial<Pick<RfqSpecField, 'kind' | 'unitKey' | 'options' | 'required'>> = {},
): RfqSpecField => ({
  key,
  labelKey: L(type, key),
  kind: opts.kind ?? 'text',
  ...(opts.unitKey ? { unitKey: opts.unitKey } : {}),
  ...(opts.options ? { options: opts.options } : {}),
  filledBy: 'buyer',
  required: opts.required ?? true,
});

const supplier = (
  type: string,
  key: string,
  opts: Partial<Pick<RfqSpecField, 'kind' | 'unitKey' | 'options' | 'required'>> = {},
): RfqSpecField => ({ ...buyer(type, key, opts), filledBy: 'supplier' });

const DIE_CUT = ['flexible', 'flatbed'] as const;

export const RFQ_ITEM_TYPES: readonly RfqItemTypeDefinition[] = [
  {
    id: 'sticker',
    labelKey: 'rfqAuthoring.itemType.sticker',
    defaultUom: 'PCS',
    fields: [
      buyer('sticker', 'material'),
      buyer('sticker', 'size', { unitKey: 'rfqAuthoring.unit.mm' }),
      buyer('sticker', 'printingColours'),
      buyer('sticker', 'finishing', { required: false }),
      buyer('sticker', 'form', { kind: 'choice', options: ['roll', 'sheet'] }),
      buyer('sticker', 'inkStandard', { required: false }),
      supplier('sticker', 'brand', { required: false }),
      supplier('sticker', 'machine', { required: false }),
      supplier('sticker', 'dieCutType', { kind: 'choice', options: DIE_CUT }),
    ],
    oneTimeCosts: ['dieCutPlate', 'printingPlate'],
  },
  {
    id: 'unitBox',
    labelKey: 'rfqAuthoring.itemType.unitBox',
    defaultUom: 'PCS',
    fields: [
      buyer('unitBox', 'boxType'),
      buyer('unitBox', 'materialGsm'),
      buyer('unitBox', 'formedSize', { unitKey: 'rfqAuthoring.unit.mm' }),
      buyer('unitBox', 'flatSize', { unitKey: 'rfqAuthoring.unit.mm', required: false }),
      buyer('unitBox', 'printing'),
      buyer('unitBox', 'finishing', { required: false }),
      buyer('unitBox', 'decoration', { required: false }),
      buyer('unitBox', 'dieCutType', { kind: 'choice', options: DIE_CUT, required: false }),
      buyer('unitBox', 'inkNote', { required: false }),
    ],
    oneTimeCosts: ['dieCutPlate', 'printingPlate'],
  },
  {
    id: 'bottleClosure',
    labelKey: 'rfqAuthoring.itemType.bottleClosure',
    defaultUom: 'PCS',
    fields: [
      buyer('bottleClosure', 'component'),
      buyer('bottleClosure', 'material'),
      buyer('bottleClosure', 'colour'),
      buyer('bottleClosure', 'netVolume', { kind: 'number', unitKey: 'rfqAuthoring.unit.ml' }),
      buyer('bottleClosure', 'decoration', { required: false }),
      supplier('bottleClosure', 'supplierProductCode', { required: false }),
    ],
    oneTimeCosts: [],
  },
  {
    id: 'moldComponent',
    labelKey: 'rfqAuthoring.itemType.moldComponent',
    defaultUom: 'PCS',
    fields: [
      buyer('moldComponent', 'componentName'),
      buyer('moldComponent', 'material'),
      buyer('moldComponent', 'decorationProcesses', { required: false }),
      supplier('moldComponent', 'cavities', { kind: 'number' }),
      supplier('moldComponent', 'cycleTime', { kind: 'number', unitKey: 'rfqAuthoring.unit.seconds' }),
      supplier('moldComponent', 'weeklyCapacity', { kind: 'number', unitKey: 'rfqAuthoring.unit.pcs' }),
      supplier('moldComponent', 'developmentLeadTime', { kind: 'number', unitKey: 'rfqAuthoring.unit.weeks' }),
    ],
    oneTimeCosts: ['mold'],
  },
  {
    id: 'other',
    labelKey: 'rfqAuthoring.itemType.other',
    defaultUom: 'PCS',
    fields: [buyer('other', 'specification', { required: false })],
    oneTimeCosts: [],
  },
];

/** The library entry for a type. Every `RfqItemTypeId` has one (pinned by test). */
export function rfqItemType(id: RfqItemTypeId): RfqItemTypeDefinition {
  return RFQ_ITEM_TYPES.find((t) => t.id === id) ?? RFQ_ITEM_TYPES[RFQ_ITEM_TYPES.length - 1]!;
}

/** A fresh spec sheet for a type: the library fields, no values yet. */
export function specSheetFor(id: RfqItemTypeId): RfqSpecField[] {
  return rfqItemType(id).fields.map((f) => ({ ...f }));
}
