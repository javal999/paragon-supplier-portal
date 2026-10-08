/** @import React from 'react' */
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import Button from '@components/ui-v2/Button';
import { FIELD_FOCUS_RING } from '@components/forecast/focusRing';
import { useToast } from '@hooks/useToast';
import { useRefusalText } from '@hooks/useRefusalText';
import { formatIDR } from '@lib/format';
import { useWarehouseDecisionCommand } from '@services/query/commandHooks';
/** @import { WarehousePlanView } from '@services/data/types' */
/** @import { ShortfallWeek } from '@services/engine/orderSizing' */
/** @import { WarehouseDecisionChoice } from '@services/transitions/warehouseDecisionRules' */
import {
  DECISION_NOTE_REQUIRED,
  WAREHOUSE_DECISION_CHOICES,
  warehouseDecisionRefusal
} from '@services/transitions/warehouseDecisionRules';
import { pal, weekLabel } from '../utils';
import LaterDeliveries from './LaterDeliveries';

// C2 (WCAG 2.4.7): the field draws a focus ring, not only a 1 px border tint.
const inputClass = `w-full px-3 py-2 text-sm text-text-primary bg-white border border-border-input rounded-md focus:outline-none focus:border-action placeholder:text-text-tertiary ${FIELD_FOCUS_RING}`;

/**
 * One week's choice control: the four ways, the note, and the save. Rendered only for a seat holding the atom.
 * @type {React.FC<{ sw: ShortfallWeek; plan: WarehousePlanView; rate: number }>}
 */
const DecisionControl = ({ sw, plan, rate }) => {
  const { t } = useTranslation();
  const { toast } = useToast();
  const refusalText = useRefusalText();
  const command = useWarehouseDecisionCommand();
  const [picked, setPicked] = useState(/** @type {WarehouseDecisionChoice | null} */ (null));
  const [note, setNote] = useState('');
  const refusal = picked === null ? null : warehouseDecisionRefusal(picked, note);
  /**
   * @param {WarehouseDecisionChoice} c
   * @returns {string}
   */
  const detail = (c) => {
    if (c === 'rent')
      return t('rs.decide.detail.rent', {
        pallets: pal(sw.rent.pallets),
        cost: formatIDR(Math.round(sw.rent.costIdr)),
        rate: formatIDR(rate)
      });
    if (c === 'pushOut')
      return sw.later.deliveries.length === 0
        ? t('rs.decide.later.none')
        : t(sw.later.enough ? 'rs.decide.later.enough' : 'rs.decide.later.notEnough', {
            count: sw.later.deliveries.length,
            movable: pal(sw.later.movablePallets)
          });
    return t(`rs.decide.detail.${c}`);
  };
  const save = async () => {
    if (picked === null || refusal !== null) return;
    try {
      const res = await command.mutateAsync({
        stream: plan.kind,
        weekStart: sw.weekStart,
        choice: picked,
        note: note.trim() || null
      });
      if (res.status === 'failed') {
        toast({
          variant: 'warning',
          title: t('rs.decide.toast.refused'),
          description: refusalText(res.reason) ?? res.reason ?? ''
        });
        return;
      }
      setPicked(null);
      setNote('');
      toast({
        variant: 'success',
        title: t('rs.decide.toast.saved'),
        description: t('rs.decide.toast.savedDesc', { week: weekLabel(sw.weekStart) })
      });
    } catch {
      toast({ variant: 'error', title: t('rs.decide.toast.refused') });
    }
  };
  const noteId = `rs-decide-note-${plan.kind}-${sw.weekStart}`;
  // C2 (WCAG 4.1.2, 3.3.2): a switched-off Save says why — no option chosen
  // yet, or the refusal below — and the note field names its own rule.
  const noteHintId = `${noteId}-hint`;
  const saveWhyId = `rs-decide-save-why-${plan.kind}-${sw.weekStart}`;
  const refusalId = `rs-decide-refusal-${plan.kind}-${sw.weekStart}`;
  const saveWhy = picked === null ? saveWhyId : refusal !== null ? refusalId : undefined;
  return (
    <div>
      <div
        className="grid grid-cols-1 sm:grid-cols-2 gap-3"
        role="group"
        aria-label={t('rs.decide.choose')}
      >
        {WAREHOUSE_DECISION_CHOICES.map((c) => (
          <button
            key={c}
            type="button"
            aria-pressed={picked === c}
            onClick={() => setPicked(c)}
            className={`text-left border rounded-md p-3 ${picked === c ? 'border-action bg-action-soft' : 'border-border-subtle hover:border-action'}`}
            data-testid={`rs-decide-choose-${c}-${sw.weekStart}`}
          >
            <div className="text-sm font-medium text-text-primary">
              {t(`rs.decide.choice.${c}`)}
            </div>
            <div className="text-xs text-text-secondary mt-1">{detail(c)}</div>
          </button>
        ))}
      </div>
      {picked === 'pushOut' && sw.later.deliveries.length > 0 && (
        <LaterDeliveries sw={sw} plan={plan} />
      )}
      <div className="mt-3 flex flex-col sm:flex-row sm:items-end gap-3">
        <div className="flex-1">
          <label htmlFor={noteId} className="block text-label text-text-tertiary uppercase mb-1">
            {t('rs.decide.note')}
          </label>
          <input
            id={noteId}
            type="text"
            maxLength={500}
            className={inputClass}
            aria-required={picked === 'accept'}
            aria-describedby={noteHintId}
            value={note}
            onChange={(e) => setNote(e.target.value)}
            data-testid={`rs-decide-note-${sw.weekStart}`}
          />
          <p id={noteHintId} className="text-xs text-text-tertiary mt-1">
            {t(picked === 'accept' ? 'rs.decide.note.required' : 'rs.decide.note.optional')}
          </p>
        </div>
        <Button
          variant="outline"
          onClick={() => void save()}
          disabled={picked === null || refusal !== null || command.isPending}
          aria-describedby={saveWhy}
          data-testid={`rs-decide-save-${sw.weekStart}`}
        >
          {t('rs.decide.save')}
        </Button>
        {picked === null ? (
          <span id={saveWhyId} className="sr-only">
            {t('rs.decide.save.needChoice')}
          </span>
        ) : null}
      </div>
      {refusal !== null && (
        <p
          id={refusalId}
          className="text-xs text-warning-hover mt-2"
          role="status"
          data-testid={`rs-decide-refusal-${sw.weekStart}`}
        >
          {t(
            refusal.startsWith(DECISION_NOTE_REQUIRED)
              ? 'rs.decide.refusal.note'
              : 'rs.decide.refusal.choice'
          )}
        </p>
      )}
    </div>
  );
};

export default DecisionControl;
