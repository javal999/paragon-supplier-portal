// Administration · Planning groups i18n fragment. Namespace: adminPg.*
//
// Material C5 — MR-8 BR-01 to BR-05: Material Planning splits SAP material
// groups into planning groups, the groups supplier capacity is kept by.
// A planning group's own name is data, never a key here (MAT-R6).
// Business language only (SC-04). Indonesian plurals carry `_other` only.

/** @type {Record<string, string>} */
export const adminPlanningGroupsEn = {
  'adminPg.crumb.administration': 'Administration',
  'adminPg.crumb.page': 'Planning groups',
  'adminPg.title': 'Planning groups',
  'adminPg.subtitle':
    'Planning groups are the groups supplier capacity is kept by. Each SAP material group starts with one default planning group holding all its materials; split it when its materials run on different lines at the supplier.',
  'adminPg.meta.count_one': '{{count}} planning group',
  'adminPg.meta.count_other': '{{count}} planning groups',
  'adminPg.meta.split_one': '{{count}} created by Material Planning',
  'adminPg.meta.split_other': '{{count}} created by Material Planning',

  'adminPg.form.sapGroup': 'SAP material group',
  'adminPg.form.chooseSap': 'Choose an SAP material group…',
  'adminPg.form.name': 'Planning group name',
  'adminPg.form.group': 'Planning group',
  'adminPg.form.chooseGroup': 'Choose a planning group…',
  'adminPg.form.newName': 'New name',

  'adminPg.create.title': 'Create a planning group',
  'adminPg.create.intro':
    'A new group starts empty, under one SAP material group. Then move materials of that SAP group into it.',
  'adminPg.create.submit': 'Create group',
  'adminPg.rename.title': 'Rename a planning group',
  'adminPg.rename.intro': 'Suppliers and planners see this name on capacity and alerts.',
  'adminPg.rename.group': 'Planning group to rename',
  'adminPg.rename.submit': 'Rename',
  'adminPg.move.title': 'Move materials',
  'adminPg.move.intro':
    'Choose the group the materials move into. Only materials of the same SAP material group can move.',
  'adminPg.move.into': 'Move into',
  'adminPg.move.materials': 'Materials',
  'adminPg.move.none': 'Every material of this SAP group is already in this planning group.',
  'adminPg.move.from': 'now in {{group}}',
  'adminPg.move.reEntry':
    'Capacity suppliers entered for the weeks ahead on both groups is marked “Needs re-entry”, and they are asked to confirm it again.',
  'adminPg.move.submit': 'Move materials',

  'adminPg.gate.title': 'Planning groups are maintained by Material Planning',
  'adminPg.gate.body':
    'You can read every planning group and its changes. A change is made from a seat that holds the planning role.',

  'adminPg.list.title': 'Planning groups',
  'adminPg.list.intro':
    'Grouped by SAP material group. A group with materials cannot be retired; move them out first.',
  'adminPg.col.group': 'Planning group',
  'adminPg.col.sapGroup': 'SAP material group',
  'adminPg.col.state': 'Status',
  'adminPg.col.materials': 'Materials',
  'adminPg.col.action': 'Action',
  'adminPg.default': 'Default',
  'adminPg.state.active': 'Active',
  'adminPg.state.retired': 'Retired',
  'adminPg.materials.none': 'No materials',
  'adminPg.action.retire': 'Retire',

  'adminPg.history.title': 'Changes on record',
  'adminPg.history.empty':
    'No planning group has been changed yet. Every SAP material group has its default group.',
  'adminPg.history.col.change': 'Change',
  'adminPg.history.col.by': 'By',
  'adminPg.history.col.at': 'When',
  'adminPg.history.by.unattributed': 'Not attributed (no person in session)',
  'adminPg.event.created': 'Created “{{name}}” under {{sap}}',
  'adminPg.event.renamed': 'Renamed to “{{name}}”',
  'adminPg.event.moved': 'Moved {{materials}} from {{from}} into {{to}}',
  'adminPg.event.retired': 'Retired {{name}}',

  'adminPg.toast.created': 'Planning group “{{name}}” created',
  'adminPg.toast.renamed': 'Planning group renamed to “{{name}}”',
  'adminPg.toast.moved_one': '{{count}} material moved into {{group}}',
  'adminPg.toast.moved_other': '{{count}} materials moved into {{group}}',
  'adminPg.toast.retired': '{{name}} retired',
  'adminPg.toast.refused': 'The change was not made: {{reason}}',

  'adminPg.refusal.NAME_REQUIRED': 'Enter a name for the planning group.',
  'adminPg.refusal.UNKNOWN_SAP_GROUP': 'Choose an SAP material group that has materials.',
  'adminPg.refusal.NO_MATERIALS': 'Choose at least one material to move.',
  'adminPg.refusal.UNKNOWN_MATERIAL': 'A chosen material is not in the material master.',
  'adminPg.refusal.MIXED_SAP_GROUP':
    'A planning group holds materials of one SAP material group only.',
  'adminPg.refusal.ALREADY_IN_GROUP': 'A chosen material is already in this planning group.',
  'adminPg.refusal.RETIRE_NOT_EMPTY': 'Move every material out of this group before retiring it.'
};

/** @type {Record<string, string>} */
export const adminPlanningGroupsId = {
  'adminPg.crumb.administration': 'Administrasi',
  'adminPg.crumb.page': 'Grup perencanaan',
  'adminPg.title': 'Grup perencanaan',
  'adminPg.subtitle':
    'Grup perencanaan adalah grup tempat kapasitas pemasok dicatat. Setiap grup material SAP dimulai dengan satu grup perencanaan bawaan berisi semua materialnya; pecah grup itu bila materialnya diproduksi di lini berbeda di pemasok.',
  'adminPg.meta.count_other': '{{count}} grup perencanaan',
  'adminPg.meta.split_other': '{{count}} dibuat oleh Material Planning',

  'adminPg.form.sapGroup': 'Grup material SAP',
  'adminPg.form.chooseSap': 'Pilih grup material SAP…',
  'adminPg.form.name': 'Nama grup perencanaan',
  'adminPg.form.group': 'Grup perencanaan',
  'adminPg.form.chooseGroup': 'Pilih grup perencanaan…',
  'adminPg.form.newName': 'Nama baru',

  'adminPg.create.title': 'Buat grup perencanaan',
  'adminPg.create.intro':
    'Grup baru dimulai kosong, di bawah satu grup material SAP. Lalu pindahkan material dari grup SAP itu ke dalamnya.',
  'adminPg.create.submit': 'Buat grup',
  'adminPg.rename.title': 'Ganti nama grup perencanaan',
  'adminPg.rename.intro': 'Pemasok dan perencana melihat nama ini pada kapasitas dan peringatan.',
  'adminPg.rename.group': 'Grup perencanaan yang diganti namanya',
  'adminPg.rename.submit': 'Ganti nama',
  'adminPg.move.title': 'Pindahkan material',
  'adminPg.move.intro':
    'Pilih grup tujuan material. Hanya material dari grup material SAP yang sama yang dapat dipindahkan.',
  'adminPg.move.into': 'Pindahkan ke',
  'adminPg.move.materials': 'Material',
  'adminPg.move.none': 'Semua material grup SAP ini sudah berada di grup perencanaan ini.',
  'adminPg.move.from': 'sekarang di {{group}}',
  'adminPg.move.reEntry':
    'Kapasitas yang diisi pemasok untuk minggu-minggu mendatang pada kedua grup ditandai “Perlu diisi ulang”, dan pemasok diminta mengonfirmasinya kembali.',
  'adminPg.move.submit': 'Pindahkan material',

  'adminPg.gate.title': 'Grup perencanaan dikelola oleh Material Planning',
  'adminPg.gate.body':
    'Anda dapat membaca setiap grup perencanaan dan perubahannya. Perubahan dilakukan dari kursi yang memegang peran perencanaan.',

  'adminPg.list.title': 'Grup perencanaan',
  'adminPg.list.intro':
    'Dikelompokkan menurut grup material SAP. Grup yang masih berisi material tidak dapat dinonaktifkan; pindahkan materialnya terlebih dahulu.',
  'adminPg.col.group': 'Grup perencanaan',
  'adminPg.col.sapGroup': 'Grup material SAP',
  'adminPg.col.state': 'Status',
  'adminPg.col.materials': 'Material',
  'adminPg.col.action': 'Tindakan',
  'adminPg.default': 'Bawaan',
  'adminPg.state.active': 'Aktif',
  'adminPg.state.retired': 'Nonaktif',
  'adminPg.materials.none': 'Tidak ada material',
  'adminPg.action.retire': 'Nonaktifkan',

  'adminPg.history.title': 'Perubahan yang tercatat',
  'adminPg.history.empty':
    'Belum ada grup perencanaan yang diubah. Setiap grup material SAP memiliki grup bawaannya.',
  'adminPg.history.col.change': 'Perubahan',
  'adminPg.history.col.by': 'Oleh',
  'adminPg.history.col.at': 'Waktu',
  'adminPg.history.by.unattributed': 'Tanpa atribusi (tidak ada orang dalam sesi)',
  'adminPg.event.created': 'Membuat “{{name}}” di bawah {{sap}}',
  'adminPg.event.renamed': 'Mengganti nama menjadi “{{name}}”',
  'adminPg.event.moved': 'Memindahkan {{materials}} dari {{from}} ke {{to}}',
  'adminPg.event.retired': 'Menonaktifkan {{name}}',

  'adminPg.toast.created': 'Grup perencanaan “{{name}}” dibuat',
  'adminPg.toast.renamed': 'Nama grup perencanaan diganti menjadi “{{name}}”',
  'adminPg.toast.moved_other': '{{count}} material dipindahkan ke {{group}}',
  'adminPg.toast.retired': '{{name}} dinonaktifkan',
  'adminPg.toast.refused': 'Perubahan tidak dilakukan: {{reason}}',

  'adminPg.refusal.NAME_REQUIRED': 'Isi nama grup perencanaan.',
  'adminPg.refusal.UNKNOWN_SAP_GROUP': 'Pilih grup material SAP yang memiliki material.',
  'adminPg.refusal.NO_MATERIALS': 'Pilih setidaknya satu material untuk dipindahkan.',
  'adminPg.refusal.UNKNOWN_MATERIAL': 'Material yang dipilih tidak ada di data induk material.',
  'adminPg.refusal.MIXED_SAP_GROUP':
    'Satu grup perencanaan hanya berisi material dari satu grup material SAP.',
  'adminPg.refusal.ALREADY_IN_GROUP': 'Material yang dipilih sudah berada di grup perencanaan ini.',
  'adminPg.refusal.RETIRE_NOT_EMPTY':
    'Pindahkan semua material keluar dari grup ini sebelum menonaktifkannya.'
};
