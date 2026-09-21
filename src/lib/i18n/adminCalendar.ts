// ─────────────────────────────────────────────────────────────────────────────
// ADMINISTRATION · WORKING CALENDAR (BL-50, REQUIREMENTS §3.4). Namespace:
// adminCal.*
//
// The first page of the administration area (BL-32 adds reason codes,
// tolerances, alert thresholds and stale periods beside it). No plural forms:
// every count here is a date or a name, never a number of things.
// ─────────────────────────────────────────────────────────────────────────────

export const adminCalendarEn: Record<string, string> = {
  'adminCal.crumb.administration': 'Administration',
  'adminCal.crumb.calendar': 'Working calendar',
  'adminCal.title': 'Working calendar',
  'adminCal.subtitle':
    'Every deadline in the hub counts working days on this calendar: responses to purchase orders and call-offs, and forecast commitments.',

  'adminCal.sections.label': 'Administration sections',
  'adminCal.section.workingCalendar': 'Working calendar',

  'adminCal.meta.source': 'Loaded from SAP factory calendar {{id}} on {{date}}',
  'adminCal.meta.covers': 'Covers {{from}} to {{to}}',
  'adminCal.meta.hours': 'Working hours {{start}}:00 to {{end}}:00 WIB, Monday to Friday',

  'adminCal.deadlines.title': 'Deadlines this calendar decides now',
  'adminCal.deadlines.intro':
    'The commitment deadlines of the current forecast versions. Rule a day below and they move at once.',
  'adminCal.deadlines.published': 'Published {{date}}',
  'adminCal.deadlines.firm': 'Firm periods due',
  'adminCal.deadlines.other': 'Trade-off and Forecast periods due',
  'adminCal.deadlines.none': 'No forecast version is published.',

  'adminCal.list.title': 'Non-working days',
  'adminCal.list.weekends': 'Saturdays and Sundays are non-working unless a date is ruled a working day.',
  'adminCal.col.date': 'Date',
  'adminCal.col.day': 'Day',
  'adminCal.col.status': 'Status',
  'adminCal.col.source': 'Set by',
  'adminCal.col.reason': 'Reason',
  'adminCal.col.action': 'Action',
  'adminCal.status.working': 'Working day',
  'adminCal.status.nonWorking': 'Non-working',
  'adminCal.source.sap': 'SAP factory calendar',
  'adminCal.source.administrator': 'Hub administrator',
  'adminCal.overridesSap': 'Overrides SAP',
  'adminCal.action.makeWorking': 'Make working',
  'adminCal.action.makeNonWorking': 'Make non-working',

  'adminCal.form.title': 'Rule a day',
  'adminCal.form.intro':
    'Add a holiday, remove one, or override what SAP says for one date. A reason is required and is kept with the ruling.',
  'adminCal.form.date': 'Date',
  'adminCal.form.kind': 'The day is',
  'adminCal.form.kind.working': 'A working day',
  'adminCal.form.kind.nonWorking': 'A non-working day',
  'adminCal.form.reason': 'Reason',
  'adminCal.form.reasonHint': 'For example: collective leave, plant shutdown, make-up working day.',
  'adminCal.form.submit': 'Record ruling',
  'adminCal.form.cancel': 'Cancel',
  'adminCal.form.attribution':
    'Kept in this browser and survives a reload; not shared with anyone and not stored on a server. Recorded as done by a person the platform cannot name yet, because no user directory is connected.',

  'adminCal.toast.nowWorking': '{{date}} is now a working day. Deadlines that span it have moved.',
  'adminCal.toast.nowNonWorking': '{{date}} is now a non-working day. Deadlines that span it have moved.',
  'adminCal.toast.refused': 'Refused: {{reason}}',

  'adminCal.history.title': 'Rulings on record',
  'adminCal.history.empty': 'No rulings yet. The calendar is exactly as SAP loaded it.',
  'adminCal.history.col.date': 'Date',
  'adminCal.history.col.ruled': 'Ruled',
  'adminCal.history.col.reason': 'Reason',
  'adminCal.history.col.by': 'By',
  'adminCal.history.col.at': 'Recorded',
  'adminCal.by.unattributed': 'Not attributed (no user directory)',

  'adminCal.gate.title': 'Changing the working calendar',
  'adminCal.gate.body':
    'The calendar moves every deadline in the hub, so only the Hub administrator and Compliance can change it. You can read it.',

  'adminCal.store.unreadableTitle': 'Saved rulings could not be read',
  'adminCal.store.unreadableBody':
    'This browser holds calendar data that cannot be parsed, so no saved rulings were loaded. That is not the same as having none. Recording a ruling will replace the unreadable data.',
  'adminCal.store.rejectedTitle': 'Some saved rulings were not loaded',
  'adminCal.store.rejectedBody':
    'Saved rulings are checked again when they are read, by the same rules that checked them when they were made. These were refused:',
};

export const adminCalendarId: Record<string, string> = {
  'adminCal.crumb.administration': 'Administrasi',
  'adminCal.crumb.calendar': 'Kalender kerja',
  'adminCal.title': 'Kalender kerja',
  'adminCal.subtitle':
    'Setiap tenggat di hub menghitung hari kerja pada kalender ini: tanggapan atas pesanan pembelian dan call-off, serta komitmen prakiraan.',

  'adminCal.sections.label': 'Bagian administrasi',
  'adminCal.section.workingCalendar': 'Kalender kerja',

  'adminCal.meta.source': 'Dimuat dari kalender pabrik SAP {{id}} pada {{date}}',
  'adminCal.meta.covers': 'Mencakup {{from}} sampai {{to}}',
  'adminCal.meta.hours': 'Jam kerja {{start}}.00 sampai {{end}}.00 WIB, Senin sampai Jumat',

  'adminCal.deadlines.title': 'Tenggat yang saat ini ditentukan kalender ini',
  'adminCal.deadlines.intro':
    'Tenggat komitmen dari versi prakiraan yang berlaku. Tetapkan satu hari di bawah dan tenggat ini langsung bergeser.',
  'adminCal.deadlines.published': 'Diterbitkan {{date}}',
  'adminCal.deadlines.firm': 'Tenggat periode Pasti',
  'adminCal.deadlines.other': 'Tenggat periode Kompromi dan Prakiraan',
  'adminCal.deadlines.none': 'Belum ada versi prakiraan yang diterbitkan.',

  'adminCal.list.title': 'Hari libur',
  'adminCal.list.weekends': 'Sabtu dan Minggu adalah hari libur kecuali suatu tanggal ditetapkan sebagai hari kerja.',
  'adminCal.col.date': 'Tanggal',
  'adminCal.col.day': 'Hari',
  'adminCal.col.status': 'Status',
  'adminCal.col.source': 'Ditetapkan oleh',
  'adminCal.col.reason': 'Alasan',
  'adminCal.col.action': 'Tindakan',
  'adminCal.status.working': 'Hari kerja',
  'adminCal.status.nonWorking': 'Hari libur',
  'adminCal.source.sap': 'Kalender pabrik SAP',
  'adminCal.source.administrator': 'Administrator hub',
  'adminCal.overridesSap': 'Mengganti SAP',
  'adminCal.action.makeWorking': 'Jadikan hari kerja',
  'adminCal.action.makeNonWorking': 'Jadikan hari libur',

  'adminCal.form.title': 'Tetapkan satu hari',
  'adminCal.form.intro':
    'Tambahkan hari libur, hapus satu, atau ganti ketetapan SAP untuk satu tanggal. Alasan wajib diisi dan disimpan bersama ketetapannya.',
  'adminCal.form.date': 'Tanggal',
  'adminCal.form.kind': 'Hari ini adalah',
  'adminCal.form.kind.working': 'Hari kerja',
  'adminCal.form.kind.nonWorking': 'Hari libur',
  'adminCal.form.reason': 'Alasan',
  'adminCal.form.reasonHint': 'Misalnya: cuti bersama, penghentian pabrik, hari kerja pengganti.',
  'adminCal.form.submit': 'Catat ketetapan',
  'adminCal.form.cancel': 'Batal',
  'adminCal.form.attribution':
    'Disimpan di peramban ini dan tetap ada setelah dimuat ulang; tidak dibagikan kepada siapa pun dan tidak disimpan di server. Dicatat sebagai dilakukan oleh orang yang belum dapat disebut namanya oleh platform, karena belum ada direktori pengguna yang terhubung.',

  'adminCal.toast.nowWorking': '{{date}} kini hari kerja. Tenggat yang melewatinya telah bergeser.',
  'adminCal.toast.nowNonWorking': '{{date}} kini hari libur. Tenggat yang melewatinya telah bergeser.',
  'adminCal.toast.refused': 'Ditolak: {{reason}}',

  'adminCal.history.title': 'Ketetapan yang tercatat',
  'adminCal.history.empty': 'Belum ada ketetapan. Kalender persis seperti yang dimuat dari SAP.',
  'adminCal.history.col.date': 'Tanggal',
  'adminCal.history.col.ruled': 'Ditetapkan',
  'adminCal.history.col.reason': 'Alasan',
  'adminCal.history.col.by': 'Oleh',
  'adminCal.history.col.at': 'Dicatat',
  'adminCal.by.unattributed': 'Tanpa atribusi (belum ada direktori pengguna)',

  'adminCal.gate.title': 'Mengubah kalender kerja',
  'adminCal.gate.body':
    'Kalender menggeser setiap tenggat di hub, sehingga hanya Administrator hub dan Kepatuhan yang dapat mengubahnya. Anda dapat membacanya.',

  'adminCal.store.unreadableTitle': 'Ketetapan tersimpan tidak dapat dibaca',
  'adminCal.store.unreadableBody':
    'Peramban ini menyimpan data kalender yang tidak dapat diurai, sehingga tidak ada ketetapan tersimpan yang dimuat. Itu tidak sama dengan tidak memiliki satu pun. Mencatat ketetapan akan menimpa data yang tidak terbaca itu.',
  'adminCal.store.rejectedTitle': 'Sebagian ketetapan tersimpan tidak dimuat',
  'adminCal.store.rejectedBody':
    'Ketetapan tersimpan diperiksa ulang saat dibaca, dengan aturan yang sama yang memeriksanya saat dibuat. Berikut yang ditolak:',
};
