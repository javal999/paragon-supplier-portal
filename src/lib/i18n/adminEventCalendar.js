// PSC-4 BR-07 (BL-339) — the Material Buffer's event calendar (CNY, Typhoon),
// maintained by the Hub administrator. EN + ID.
export const adminEventCalendarEn = {
  'eventCal.section': 'Event calendar',
  'eventCal.crumb.administration': 'Administration',
  'eventCal.crumb.eventCalendar': 'Event calendar',
  'eventCal.title': 'Event calendar',
  'eventCal.subtitle':
    'The CNY and Typhoon windows the Material Buffer switches on in. Administered by the Hub administrator; a planner can override a material’s switch on Safety stock targets, with a reason.',
  'eventCal.note.title': 'Material Buffer windows',
  'eventCal.intro':
    'A window switches the Material Buffer on for the hub weeks it touches and off after it. It moves ROP Order only: the change is recorded with the figure’s stored inputs and rules version, and writes no DA version.',
  'eventCal.form.title': 'Set a window',
  'eventCal.form.intro':
    'One window per event kind and start day: saving the same start again replaces that window.',
  'eventCal.form.kind': 'Event',
  'eventCal.form.landfall': 'Landfall',
  'eventCal.form.landfallHint':
    'The window defaults to the {{days}} days before landfall; the dates below show it.',
  'eventCal.form.from': 'From',
  'eventCal.form.to': 'To',
  'eventCal.form.reason': 'Reason',
  'eventCal.form.attribution':
    'The change is recorded against the unattributed placeholder until a sign-in identity exists.',
  'eventCal.form.submit': 'Save the window',
  'eventCal.form.cancel': 'Clear the form',
  'eventCal.kind.CNY': 'Chinese New Year',
  'eventCal.kind.Typhoon': 'Typhoon',
  'eventCal.gate.title': 'Only the Hub administrator sets a window',
  'eventCal.gate.body':
    'You can read every window. A window moves ROP Order for every material while it is open, so the seat that maintains it is the administrator’s.',
  'eventCal.list.title': 'Windows in force',
  'eventCal.list.empty': 'No window is set.',
  'eventCal.col.kind': 'Event',
  'eventCal.col.from': 'From',
  'eventCal.col.to': 'To',
  'eventCal.col.reason': 'Reason',
  'eventCal.col.by': 'Set by',
  'eventCal.col.at': 'Set at',
  'eventCal.by.unattributed': 'Not attributed (no person in session)',
  'eventCal.toast.saved': '{{kind}} window saved',
  'eventCal.toast.refused': 'Could not save the window: {{reason}}',
  'eventCal.footnote':
    'Sample data: the seed stands where the administrator’s entries will. A window that covers a planning week switches the Material Buffer on for that week.'
};

export const adminEventCalendarId = {
  'eventCal.section': 'Kalender peristiwa',
  'eventCal.crumb.administration': 'Administrasi',
  'eventCal.note.title': 'Jendela Material Buffer',
  'eventCal.crumb.eventCalendar': 'Kalender peristiwa',
  'eventCal.title': 'Kalender peristiwa',
  'eventCal.subtitle':
    'Jendela CNY dan topan tempat Material Buffer menyala. Dikelola administrator Hub; perencana dapat mengoverride saklar satu material di Safety stock targets, dengan alasan.',
  'eventCal.intro':
    'Jendela menyalakan Material Buffer pada minggu hub yang disentuhnya dan mematikannya setelahnya. Hanya menggerakkan ROP Order: perubahannya dicatat dengan input tersimpan dan versi aturan angka itu, dan tidak menulis versi DA.',
  'eventCal.form.title': 'Tetapkan jendela',
  'eventCal.form.intro':
    'Satu jendela per jenis peristiwa dan hari mulai: menyimpan hari mulai yang sama mengganti jendela itu.',
  'eventCal.form.kind': 'Peristiwa',
  'eventCal.form.landfall': 'Hari topan mendarat',
  'eventCal.form.landfallHint':
    'Jendela bawaannya {{days}} hari sebelum topan mendarat; tanggal di bawah menampilkannya.',
  'eventCal.form.from': 'Dari',
  'eventCal.form.to': 'Sampai',
  'eventCal.form.reason': 'Alasan',
  'eventCal.form.attribution':
    'Perubahan dicatat atas placeholder tanpa atribusi sampai identitas masuk tersedia.',
  'eventCal.form.submit': 'Simpan jendela',
  'eventCal.form.cancel': 'Kosongkan formulir',
  'eventCal.kind.CNY': 'Tahun Baru Imlek',
  'eventCal.kind.Typhoon': 'Topan',
  'eventCal.gate.title': 'Hanya administrator Hub yang menetapkan jendela',
  'eventCal.gate.body':
    'Anda dapat membaca semua jendela. Jendela menggerakkan ROP Order setiap material selama terbuka, jadi kursi yang mengelolanya adalah milik administrator.',
  'eventCal.list.title': 'Jendela yang berlaku',
  'eventCal.list.empty': 'Belum ada jendela.',
  'eventCal.col.kind': 'Peristiwa',
  'eventCal.col.from': 'Dari',
  'eventCal.col.to': 'Sampai',
  'eventCal.col.reason': 'Alasan',
  'eventCal.col.by': 'Ditetapkan oleh',
  'eventCal.col.at': 'Ditetapkan pada',
  'eventCal.by.unattributed': 'Tanpa atribusi (tidak ada orang dalam sesi)',
  'eventCal.toast.saved': 'Jendela {{kind}} disimpan',
  'eventCal.toast.refused': 'Jendela tidak dapat disimpan: {{reason}}',
  'eventCal.footnote':
    'Data contoh: seed menggantikan entri administrator nanti. Jendela yang mencakup minggu perencanaan menyalakan Material Buffer minggu itu.'
};
