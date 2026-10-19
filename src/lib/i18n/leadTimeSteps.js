// Lead time by step i18n fragment (DRC-6, BL-192). Namespace: ltSteps.*
//
// The steps of a supplier × material lead time, per supply route [XLS Guidance].
// Day counts are mono data, rendered through <Data>, never keyed.

/** @type {Record<string, string>} */
export const leadTimeStepsEn = {
  'ltSteps.label': 'Lead time by step',
  'ltSteps.sample': 'Sample step split until the master data feed carries the steps.',
  'ltSteps.weeks_one': '{{count}} week',
  'ltSteps.weeks_other': '{{count}} weeks',
  'ltSteps.days_one': '{{count}} day',
  'ltSteps.days_other': '{{count}} days',
  'ltSteps.route.local': 'Local',
  'ltSteps.route.import': 'Import',
  'ltSteps.route.importedRawMaterial': 'Imported raw material',
  'ltSteps.step.orderToPrincipal': 'Order to principal',
  'ltSteps.step.orderingMaterial': 'Ordering material',
  'ltSteps.step.machineQueue': 'Machine queue',
  'ltSteps.step.production': 'Production',
  'ltSteps.step.shipment': 'Shipment',
  'ltSteps.step.delivery': 'Delivery',
  'ltSteps.none': 'No step breakdown held'
};

/** @type {Record<string, string>} */
export const leadTimeStepsId = {
  'ltSteps.label': 'Waktu tunggu per tahap',
  'ltSteps.sample': 'Pembagian tahap contoh sampai data master memuat tahapnya.',
  'ltSteps.weeks_other': '{{count}} minggu',
  'ltSteps.days_other': '{{count}} hari',
  'ltSteps.route.local': 'Lokal',
  'ltSteps.route.import': 'Impor',
  'ltSteps.route.importedRawMaterial': 'Bahan baku impor',
  'ltSteps.step.orderToPrincipal': 'Pesan ke prinsipal',
  'ltSteps.step.orderingMaterial': 'Pemesanan material',
  'ltSteps.step.machineQueue': 'Antrean mesin',
  'ltSteps.step.production': 'Produksi',
  'ltSteps.step.shipment': 'Pengapalan',
  'ltSteps.step.delivery': 'Pengiriman',
  'ltSteps.none': 'Tidak ada rincian tahap'
};
