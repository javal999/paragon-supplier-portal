// ────────────────────────────────────────────────────────────────────────────
// REQ-E14-13 BR-07 / ENG-D16 — "taken to SAP" marks.
//
// The Hub does not edit a PO (REQ-E07-01 BR-02): a PO-line proposal from the
// reschedule report is agreed with the supplier and changed in SAP by the
// Material Planner, and the Hub records only that it was taken there, when,
// and by whom. Append-only; the latest mark per line is the one in force.
// Empty at start: nothing has been taken to SAP.
// ────────────────────────────────────────────────────────────────────────────

import type { SapChangeMark } from '../../types';

let rows: SapChangeMark[] = [];
let seq = 0;

export const sapChangeMarkStore = {
  all(): readonly SapChangeMark[] {
    return rows;
  },
  get(id: string): SapChangeMark | undefined {
    return rows.find((r) => r.id === id);
  },
  add(row: Omit<SapChangeMark, 'id'>): SapChangeMark {
    seq += 1;
    const made: SapChangeMark = { ...row, id: `sap-${String(seq).padStart(4, '0')}` };
    rows = [...rows, made];
    return made;
  },
  reset(): void {
    rows = [];
    seq = 0;
  },
};
