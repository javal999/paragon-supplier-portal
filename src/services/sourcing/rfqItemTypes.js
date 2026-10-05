// ────────────────────────────────────────────────────────────────────────────
// THE ITEM-TYPE LIBRARY — the spec templates an RFQ item starts from (RFx
// working spec, "Buyer authoring", step 2).
//
// Config that Procurement owns. There is no admin screen for it in this batch
// (the spec's "later" list), so it is data in code, the `rfxConfig.js`
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

/** @import { RfqItemTypeId, RfqOneTimeCostId, RfqSpecField } from './rfqModel' */

/**
 * @typedef {object} RfqItemTypeDefinition
 * @property {RfqItemTypeId} id
 * @property {string} labelKey
 * @property {string} defaultUom -  The unit an item of this type is usually counted in.
 * @property {readonly RfqSpecField[]} fields
 * @property {readonly RfqOneTimeCostId[]} oneTimeCosts -  The one-time costs requested by default for this type.
 */

/**
 * @param {string} type
 * @param {string} key
 */
const L = (type, key) => `rfqAuthoring.field.${type}.${key}`;

/**
 * @param {string} type
 * @param {string} key
 * @param {Partial<Pick<RfqSpecField, 'kind' | 'unitKey' | 'options' | 'required'>>} [opts]
 * @returns {RfqSpecField}
 */
const buyer = (type, key, opts = {}) => ({
  key,
  labelKey: L(type, key),
  kind: opts.kind ?? 'text',
  ...(opts.unitKey ? { unitKey: opts.unitKey } : {}),
  ...(opts.options ? { options: opts.options } : {}),
  filledBy: 'buyer',
  required: opts.required ?? true
});

/**
 * @param {string} type
 * @param {string} key
 * @param {Partial<Pick<RfqSpecField, 'kind' | 'unitKey' | 'options' | 'required'>>} [opts]
 * @returns {RfqSpecField}
 */
const supplier = (type, key, opts = {}) => ({ ...buyer(type, key, opts), filledBy: 'supplier' });

const DIE_CUT = /** @type {const} */ (['flexible', 'flatbed']);

/** @type {readonly RfqItemTypeDefinition[]} */
export const RFQ_ITEM_TYPES = [
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
      supplier('sticker', 'dieCutType', { kind: 'choice', options: DIE_CUT })
    ],
    oneTimeCosts: ['dieCutPlate', 'printingPlate']
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
      buyer('unitBox', 'inkNote', { required: false })
    ],
    oneTimeCosts: ['dieCutPlate', 'printingPlate']
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
      supplier('bottleClosure', 'supplierProductCode', { required: false })
    ],
    oneTimeCosts: []
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
      supplier('moldComponent', 'cycleTime', {
        kind: 'number',
        unitKey: 'rfqAuthoring.unit.seconds'
      }),
      supplier('moldComponent', 'weeklyCapacity', {
        kind: 'number',
        unitKey: 'rfqAuthoring.unit.pcs'
      }),
      supplier('moldComponent', 'developmentLeadTime', {
        kind: 'number',
        unitKey: 'rfqAuthoring.unit.weeks'
      })
    ],
    oneTimeCosts: ['mold']
  },
  {
    id: 'other',
    labelKey: 'rfqAuthoring.itemType.other',
    defaultUom: 'PCS',
    fields: [buyer('other', 'specification', { required: false })],
    oneTimeCosts: []
  }
];

/**
 * The library entry for a type. Every `RfqItemTypeId` has one (pinned by test).
 * @param {RfqItemTypeId} id
 * @returns {RfqItemTypeDefinition}
 */
export function rfqItemType(id) {
  return (
    RFQ_ITEM_TYPES.find((t) => t.id === id) ??
    /** @type {RfqItemTypeDefinition} */ (RFQ_ITEM_TYPES[RFQ_ITEM_TYPES.length - 1])
  );
}

/**
 * A fresh spec sheet for a type: the library fields, no values yet.
 * @param {RfqItemTypeId} id
 * @returns {RfqSpecField[]}
 */
export function specSheetFor(id) {
  return rfqItemType(id).fields.map((f) => ({ ...f }));
}
