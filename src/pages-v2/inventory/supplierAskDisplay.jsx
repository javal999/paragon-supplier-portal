/** @import React from 'react' */
/** @import { SupplierAsk } from '@services/data/types' */
/** @import { SupplierAskRefusal } from '@services/transitions/supplierAskRules' */
/** @import { TFunction } from 'i18next' */
import { useTranslation } from 'react-i18next';
import Data from '@components/ui-v2/Data';
import StatusPill from '@components/ui-v2/StatusPill';
import { formatDate } from '@lib/format';
import { isoWeek } from '@services/engine/dates';
import { SUPPLIER_ASK_RULES } from '@services/transitions/supplierAskRules';
import { usePlanningGroupLabel } from './planningGroupDisplay';

// ─────────────────────────────────────────────────────────────────────────────
// INV-D9 — the pieces both sides of a hub ask show: what it is about, its
// state, and the refusal text for each rule code.
// ─────────────────────────────────────────────────────────────────────────────

/**
 * What an ask is about: the material code, or the planning group and week.
 * @type {React.FC<{ subject: Pick<SupplierAsk, 'materialCode' | 'planningGroupId' | 'week'> }>}
 */
export const AskSubject = ({ subject }) => {
  const groupLabel = usePlanningGroupLabel();
  if (subject.materialCode) return <Data>{subject.materialCode}</Data>;
  return (
    <span>
      {groupLabel(subject.planningGroupId ?? '')} ·{' '}
      <Data>
        W{subject.week ? isoWeek(subject.week) : ''} ({formatDate(subject.week)})
      </Data>
    </span>
  );
};

/** @type {Record<SupplierAsk['state'], 'info' | 'success' | 'neutral'>} */
const STATE_TONE = { Open: 'info', Answered: 'success', Closed: 'neutral', Withdrawn: 'neutral' };

/** @type {React.FC<{ state: SupplierAsk['state'] }>} */
export const AskStatePill = ({ state }) => {
  const { t } = useTranslation();
  return <StatusPill variant={STATE_TONE[state]}>{t(`supplierAsk.state.${state}`)}</StatusPill>;
};

/**
 * The screen text for a rule code.
 * @param {TFunction} t
 * @param {SupplierAskRefusal} code
 * @returns {string}
 */
export const askRefusalText = (t, code) =>
  t(`supplierAsk.refusal.${code}`, { max: SUPPLIER_ASK_RULES.textMaxLength });

/**
 * The latest `answered` step of an ask, if any.
 * @param {SupplierAsk} ask
 * @returns {SupplierAsk['history'][number] | undefined}
 */
export const latestAnswer = (ask) => [...ask.history].reverse().find((h) => h.kind === 'answered');

/** Class order for sorting: High first, then Medium, Low, and asks with no class. */
const RISK_ORDER = { high: 0, medium: 1, low: 2 };

/**
 * High first, then the earliest due date, then the oldest ask.
 * @param {SupplierAsk} a
 * @param {SupplierAsk} b
 * @returns {number}
 */
export const askOrder = (a, b) =>
  (a.riskClass ? RISK_ORDER[a.riskClass] : 3) - (b.riskClass ? RISK_ORDER[b.riskClass] : 3) ||
  (a.dueDate ?? '9999').localeCompare(b.dueDate ?? '9999') ||
  a.id.localeCompare(b.id);
