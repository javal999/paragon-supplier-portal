// Week grid i18n fragment (CAP-1 wave 1, SC-HUB-CAPACITY-WAVE1-SPEC-2026-10).
// Namespace: weekGrid.*
//
// The shared `WeekGrid` primitive's own words. The week number (`W36`) and the
// Monday's date are data, rendered through <Data> and never keyed.

/** @type {Record<string, string>} */
export const weekGridEn = {
  // G-04 — under the date of the current week's column header.
  'weekGrid.thisWeek': 'This week',
  // CAP-2 BR-01 — the Weekly/Monthly toggle and its group name.
  'weekGrid.view.label': 'View',
  'weekGrid.view.weekly': 'Weekly',
  'weekGrid.view.monthly': 'Monthly',
  // CAP-2 BR-04 / BR-06 — a month column's header.
  'weekGrid.month.corner': 'Month',
  'weekGrid.month.weeks': '{{count}} wk',
  'weekGrid.month.partial': 'Partial',
  'weekGrid.thisMonth': 'This month',
  // CAP-2 BR-03 — under a month's worst status: how many of its weeks hold it.
  'weekGrid.month.weeksOf': '{{count}} of {{of}} wk',
  // CAP-2 BR-05 — an editable grid in Monthly.
  'weekGrid.monthlyReadOnly': 'Switch to Weekly to edit.'
};

/** @type {Record<string, string>} */
export const weekGridId = {
  'weekGrid.thisWeek': 'Minggu ini',
  'weekGrid.view.label': 'Tampilan',
  'weekGrid.view.weekly': 'Mingguan',
  'weekGrid.view.monthly': 'Bulanan',
  'weekGrid.month.corner': 'Bulan',
  'weekGrid.month.weeks': '{{count}} mg',
  'weekGrid.month.partial': 'Sebagian',
  'weekGrid.thisMonth': 'Bulan ini',
  'weekGrid.month.weeksOf': '{{count}} dari {{of}} mg',
  'weekGrid.monthlyReadOnly': 'Beralih ke Mingguan untuk mengubah.'
};
