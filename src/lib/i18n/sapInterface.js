// SAP interface monitor + data-age banner i18n fragment. Namespace: sap.*
//
// REQUIREMENTS REQ-E07-08 (order data interface with SAP) and CR-20 (retry).
// Business language only (SC-04): no message types, no interface technology, no
// latency jargon on screen — the reader is told when data last arrived, what
// failed, and whether asking again helps.

/** @type {Record<string, string>} */
export const sapInterfaceEn = {
  'sap.crumb.administration': 'Administration',
  'sap.crumb.monitor': 'Interface monitor',
  'sap.header.title': 'Interface monitor',
  'sap.header.subtitle':
    'Follow the data exchanged with SAP, and try again when a record did not go through.',
  'sap.meta.target': 'Data is expected within {{minutes}} minutes',
  'sap.meta.openFailures_one': '{{count}} record needs attention',
  'sap.meta.openFailures_other': '{{count}} records need attention',

  'sap.object.umbrellaPo': 'Purchase orders',
  'sap.object.goodsReceipt': 'Goods receipts',
  'sap.object.invoiceStatus': 'Invoice status',
  'sap.object.poResponse': 'Order responses',
  'sap.object.inboundDelivery': 'Shipping notices',
  'sap.object.invoiceOut': 'Invoices sent',
  'sap.direction.inbound': 'From SAP into the hub',
  'sap.direction.outbound': 'From the hub into SAP',
  'sap.object.lastSuccess': 'Last received',
  'sap.object.failures': 'Records that failed',
  'sap.object.noFailures': 'Nothing has failed for this data.',

  'sap.message.reference': 'Reference',
  'sap.message.time': 'Time',
  'sap.message.noRetry':
    'SAP gave a reason, so trying again will not help until the data is corrected.',
  'sap.fault.transport': 'Did not get through',
  'sap.fault.refused': 'Refused by SAP',
  'sap.action.retry': 'Try again',
  'sap.toast.retried': 'Sent again: {{reference}}',
  'sap.toast.notRetryable': 'This record cannot be sent again until the data is corrected.',

  'sap.age.never': 'SAP data has not been received yet.',
  'sap.age.minutes_one': 'SAP data last updated {{count}} minute ago.',
  'sap.age.minutes_other': 'SAP data last updated {{count}} minutes ago.',
  'sap.age.hours_one': 'SAP data last updated {{count}} hour ago.',
  'sap.age.hours_other': 'SAP data last updated {{count}} hours ago.',
  'sap.age.days_one': 'SAP data last updated {{count}} day ago.',
  'sap.age.days_other': 'SAP data last updated {{count}} days ago.',

  'sap.task.title': 'Records from SAP that need to be sent again',
  'sap.task.body_one': '{{count}} record did not get through and can be sent again.',
  'sap.task.body_other': '{{count}} records did not get through and can be sent again.'
};

/** @type {Record<string, string>} */
export const sapInterfaceId = {
  'sap.crumb.administration': 'Administrasi',
  'sap.crumb.monitor': 'Monitor antarmuka',
  'sap.header.title': 'Monitor antarmuka',
  'sap.header.subtitle':
    'Pantau data yang dipertukarkan dengan SAP, dan kirim ulang bila ada catatan yang gagal.',
  'sap.meta.target': 'Data diharapkan tiba dalam {{minutes}} menit',
  'sap.meta.openFailures_other': '{{count}} catatan perlu ditangani',

  'sap.object.umbrellaPo': 'Pesanan pembelian',
  'sap.object.goodsReceipt': 'Penerimaan barang',
  'sap.object.invoiceStatus': 'Status faktur',
  'sap.object.poResponse': 'Jawaban pesanan',
  'sap.object.inboundDelivery': 'Pemberitahuan pengiriman',
  'sap.object.invoiceOut': 'Faktur terkirim',
  'sap.direction.inbound': 'Dari SAP ke hub',
  'sap.direction.outbound': 'Dari hub ke SAP',
  'sap.object.lastSuccess': 'Terakhir diterima',
  'sap.object.failures': 'Catatan yang gagal',
  'sap.object.noFailures': 'Tidak ada yang gagal untuk data ini.',

  'sap.message.reference': 'Referensi',
  'sap.message.time': 'Waktu',
  'sap.message.noRetry':
    'SAP memberikan alasan, sehingga mengirim ulang tidak membantu sebelum datanya diperbaiki.',
  'sap.fault.transport': 'Tidak sampai',
  'sap.fault.refused': 'Ditolak SAP',
  'sap.action.retry': 'Kirim ulang',
  'sap.toast.retried': 'Dikirim ulang: {{reference}}',
  'sap.toast.notRetryable': 'Catatan ini tidak dapat dikirim ulang sebelum datanya diperbaiki.',

  'sap.age.never': 'Data SAP belum pernah diterima.',
  'sap.age.minutes_other': 'Data SAP terakhir diperbarui {{count}} menit lalu.',
  'sap.age.hours_other': 'Data SAP terakhir diperbarui {{count}} jam lalu.',
  'sap.age.days_other': 'Data SAP terakhir diperbarui {{count}} hari lalu.',

  'sap.task.title': 'Catatan SAP yang perlu dikirim ulang',
  'sap.task.body_other': '{{count}} catatan tidak sampai dan dapat dikirim ulang.'
};
