// ────────────────────────────────────────────────────────────────────────────
// THE QUALIFICATION LISTS — Material G1 (MR-10 BR-04; MAT-D15; plan AD-8).
//
// The documents each level requires, as Procurement and Quality set them.
// Seeded with the placeholder lists (`PLACEHOLDER_RULES`, `placeholder: true`),
// which apply — labelled — until a person sets a list.
//
// APPEND ONLY (MAT-R3): every change of a list is a new row, and the latest row
// per level is in force. Nothing is edited, so the store is its own history,
// and the qualification replay reads it to know which lists were in force when
// (plan AD-2). Written by the `t_qualification_rule_set` target and nothing
// else. Held in memory like every other record in the prototype.
// ────────────────────────────────────────────────────────────────────────────

import type { QualificationRule, QualificationRuleChange, QualificationRuleLevel } from '../data/types';
import { PLACEHOLDER_RULES, QUALIFICATION_RULE_LEVELS, type RuleEpoch } from './qualificationRules';

let changes: QualificationRuleChange[] = [];
let version = 0;
const listeners = new Set<() => void>();

function changed(): void {
  version += 1;
  listeners.forEach((l) => l());
}

/** The lists in force after the first `n` changes. */
function rulesAfter(n: number): QualificationRule[] {
  return QUALIFICATION_RULE_LEVELS.map((level) => {
    let rule: QualificationRule = PLACEHOLDER_RULES.find((r) => r.level === level)!;
    for (let i = 0; i < n; i += 1) {
      const c = changes[i];
      if (c.level === level) rule = { level, requiredDocs: c.requiredDocs, placeholder: c.placeholder };
    }
    return rule;
  });
}

export const qualificationRuleStore = {
  /** The lists in force: the placeholder seed with the latest change per level applied. */
  all(): readonly QualificationRule[] {
    return rulesAfter(changes.length);
  },
  get(level: QualificationRuleLevel): QualificationRule {
    return rulesAfter(changes.length).find((r) => r.level === level)!;
  },
  /** Every change on record, oldest first. */
  changes(): readonly QualificationRuleChange[] {
    return changes;
  },
  /** The lists in force over time — the seed, then one epoch per change. */
  epochs(): readonly RuleEpoch[] {
    return [
      { at: null, rules: rulesAfter(0) },
      ...changes.map((c, i) => ({ at: c.setAt, rules: rulesAfter(i + 1), changed: c.level })),
    ];
  },
  /** APPEND ONLY — called by the `t_qualification_rule_set` target and nothing else. */
  append(change: QualificationRuleChange): void {
    changes = [...changes, change];
    changed();
  },
  /** Back to the placeholder lists — test isolation. */
  reset(): void {
    changes = [];
    changed();
  },
  version(): number {
    return version;
  },
  subscribe(listener: () => void): () => void {
    listeners.add(listener);
    return () => listeners.delete(listener);
  },
};
