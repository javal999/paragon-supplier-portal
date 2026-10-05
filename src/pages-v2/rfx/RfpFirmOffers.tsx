import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import Button from '@components/ui-v2/Button';
import Data from '@components/ui-v2/Data';
import StatusPill from '@components/ui-v2/StatusPill';
import { HandoffNotice } from '@components/ui-v2/HandoffNotice';
import SessionAttachments from '@components/ui-v2/SessionAttachments';
import { useVerbAvailability } from '@hooks/useVerbAvailability';
import type { GateResult } from '@services/sourcing/complianceGate';
import type { RfpEventView, RfpOfferRoundView } from '@services/sourcing/views';
import type { RfxCommandVars } from '@services/query/commandHooks';
import { RFP_ROUND_READY_STATUSES, rfpOfferRoundRefusal, rfpOptionRef } from '@services/sourcing/rfpFirmOffer';
import type { RfpOptionSettlement } from '@services/sourcing/rfpAward';
import { DeadlinePill, GateMarker, qty } from './rfxDisplay';
import { refusalCode } from './RfxQuestionEditor';

// ────────────────────────────────────────────────────────────────────────────
// RFx D3 — THE BUYER'S FIRM-OFFER ROUNDS ON AN RFP (NR-2 buyer steps 2 to 4,
// BR-02). On a Closed or Partly awarded RFP (RFX-D15), "Ask for firm offers"
// picks options (PTI's and those a supplier proposed, in the proposer's
// words), quantity points, suppliers and a deadline, and dispatches
// `openRfpRound`. An option already settled (awarded on the RFP, or sourced by
// an RFQ created from it) is listed disabled with how it was settled, so a
// Partly awarded RFP asks only for its open options. A supplier that fails
// CR-23 is listed with the reason and cannot be picked. Every round is listed,
// open and closed, with its deadline, who has offered, and "Close round".
//
// The form is pre-checked with the verb's own rule (`rfpOfferRoundRefusal`,
// RFX-R2), over the same CR-23 gate the policy judges with (`supplierGate`
// with no material codes: an RFP names none).
// ────────────────────────────────────────────────────────────────────────────

/** One option a round can name: its ref, its words, and who proposed it. */
interface RoundOptionChoice {
  readonly ref: string;
  readonly title: string;
  readonly proposer?: string;
}

/** The options a round may name on this RFP: PTI's own, then those in submitted proposals. */
export function roundOptionChoices(event: RfpEventView): readonly RoundOptionChoice[] {
  return [
    ...(event.pricing?.options ?? []).map((o) => ({ ref: rfpOptionRef(o.id), title: o.title })),
    ...event.responses.flatMap((r) =>
      (r.pricing?.proposedOptions ?? []).map((o) => ({
        ref: rfpOptionRef(o.id, r.supplierId),
        title: o.title,
        proposer: r.supplierName,
      })),
    ),
  ];
}

export interface RfpFirmOfferRoundsProps {
  event: RfpEventView;
  /** This RFP's rounds (the buyer's read: every invitee and offer). */
  rounds: readonly RfpOfferRoundView[];
  gateOf: (supplierId: string) => GateResult;
  /**
   * RFX-D15 — this RFP's options that are no longer open, with how each was
   * settled (`rfpSettledOptionRefs`, the rule the round policy judges by).
   */
  settled: ReadonlyMap<string, RfpOptionSettlement>;
  pending: boolean;
  run: (vars: RfxCommandVars, successKey: string) => void;
}

export const RfpFirmOfferRounds: React.FC<RfpFirmOfferRoundsProps> = ({
  event,
  rounds,
  gateOf,
  settled,
  pending,
  run,
}) => {
  const { t } = useTranslation();
  const negotiate = useVerbAvailability('rfp:negotiate');
  const [asking, setAsking] = useState(false);
  const canAsk = RFP_ROUND_READY_STATUSES.includes(event.status) && !!event.pricing;
  return (
    <div
      className="bg-bg-surface border border-border-subtle rounded-lg shadow-sm p-4 space-y-4"
      data-testid={`rfp-rounds-${event.id}`}
    >
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h4 className="text-sm font-semibold text-text-primary">{t('rfx.firm.title')}</h4>
        {canAsk && !asking && negotiate.kind === 'held' && (
          <Button variant="outline" onClick={() => setAsking(true)} data-testid={`rfp-ask-firm-${event.id}`}>
            {t('rfx.firm.ask')}
          </Button>
        )}
        {canAsk && negotiate.kind !== 'held' && (
          <HandoffNotice availability={negotiate} testId="handoff-rfp-negotiate" />
        )}
      </div>
      {event.status === 'Open' && !!event.pricing && (
        <p className="text-xs text-text-tertiary">{t('rfx.firm.needsClosed')}</p>
      )}
      {asking && negotiate.kind === 'held' && (
        <RoundForm
          event={event}
          gateOf={gateOf}
          settled={settled}
          pending={pending}
          onCancel={() => setAsking(false)}
          onOpen={(vars) => {
            run(vars, 'rfx.toast.firmRoundOpened');
            setAsking(false);
          }}
        />
      )}
      {rounds.length === 0 ? (
        <p className="text-sm text-text-tertiary" data-testid={`rfp-rounds-empty-${event.id}`}>
          {t('rfx.firm.empty')}
        </p>
      ) : (
        <ul className="space-y-3">
          {[...rounds]
            .sort((a, b) => b.roundNumber - a.roundNumber)
            .map((round) => (
              <RoundCard
                key={round.id}
                event={event}
                round={round}
                canClose={negotiate.kind === 'held'}
                pending={pending}
                onClose={() => run({ verb: 'closeRfpRound', roundId: round.id }, 'rfx.toast.firmRoundClosed')}
              />
            ))}
        </ul>
      )}
    </div>
  );
};

/** One round: its status, deadline, options, points, and who has offered. */
const RoundCard: React.FC<{
  event: RfpEventView;
  round: RfpOfferRoundView;
  canClose: boolean;
  pending: boolean;
  onClose: () => void;
}> = ({ event, round, canClose, pending, onClose }) => {
  const { t } = useTranslation();
  const nameOf = (sid: string) => event.responses.find((r) => r.supplierId === sid)?.supplierName ?? sid;
  const status = round.closed ? 'closed' : round.overdue ? 'overdue' : 'open';
  return (
    <li className="border border-border-subtle rounded-md p-3 space-y-2" data-testid={`rfp-round-${round.id}`}>
      <div className="flex flex-wrap items-center gap-3">
        <span className="text-sm font-semibold text-text-primary">{t('rfx.firm.round', { n: round.roundNumber })}</span>
        <StatusPill variant={round.closed ? 'neutral' : 'info'}>{t(`rfx.firm.status.${status}`)}</StatusPill>
        <DeadlinePill deadline={round.deadline} done={round.closed} />
        {!round.closed && canClose && (
          <Button
            variant="secondary"
            disabled={pending}
            onClick={onClose}
            data-testid={`rfp-round-close-${round.id}`}
          >
            {t('rfx.firm.closeRound')}
          </Button>
        )}
      </div>
      <p className="text-xs text-text-secondary">
        {t('rfx.firm.options')}: {round.options.map((o) => o.title).join(' · ')}
      </p>
      <p className="text-xs text-text-secondary">
        {t('rfx.firm.points')}: <Data>{round.quantityPoints.map((q) => qty(q)).join(' / ')}</Data>
      </p>
      <ul className="flex flex-wrap gap-2">
        {round.invitedSupplierIds.map((sid) => {
          const offered = round.offers.some((o) => o.supplierId === sid);
          return (
            <li key={sid} className="text-xs" data-testid={`rfp-round-invitee-${round.id}-${sid}`}>
              <StatusPill variant={offered ? 'success' : 'neutral'}>
                {nameOf(sid)} · {offered ? t('rfx.firm.offerIn') : t('rfx.firm.noOffer')}
              </StatusPill>
            </li>
          );
        })}
      </ul>
      {/* BL-129 — the files each supplier sent with its firm offer in force, read-only. */}
      {round.offers
        .filter((o) => (o.documents ?? []).length > 0)
        .map((o) => (
          <SessionAttachments
            key={o.id}
            value={o.documents ?? []}
            readOnly
            label={t('rfx.firm.documentsOf', { supplier: nameOf(o.supplierId) })}
            testId={`rfp-round-docs-${round.id}-${o.supplierId}`}
          />
        ))}
    </li>
  );
};

const inputClass =
  'bg-white border border-border-input rounded-md px-3 h-10 text-sm focus:outline-none focus:border-action';

/** "Ask for firm offers": options, quantity points, suppliers, deadline and message. */
const RoundForm: React.FC<{
  event: RfpEventView;
  gateOf: (supplierId: string) => GateResult;
  settled: ReadonlyMap<string, RfpOptionSettlement>;
  pending: boolean;
  onCancel: () => void;
  onOpen: (vars: RfxCommandVars) => void;
}> = ({ event, gateOf, settled, pending, onCancel, onOpen }) => {
  const { t } = useTranslation();
  const choices = roundOptionChoices(event);
  const allPoints = event.pricing?.quantityPoints ?? [];
  const [optionRefs, setOptionRefs] = useState<string[]>([]);
  const [points, setPoints] = useState<number[]>([...allPoints]);
  const [invited, setInvited] = useState<string[]>([]);
  const [deadline, setDeadline] = useState('');
  const [message, setMessage] = useState('');
  const toggle = <T,>(list: T[], v: T): T[] => (list.includes(v) ? list.filter((x) => x !== v) : [...list, v]);
  const refusal = rfpOfferRoundRefusal(
    { optionRefs, quantityPoints: [...points].sort((a, b) => a - b), invitedSupplierIds: invited, deadline },
    {
      rfpStatus: event.status,
      knownOptionRefs: choices.map((c) => c.ref),
      settledOptionRefs: [...settled.keys()],
      respondedSupplierIds: event.responses.map((r) => r.supplierId),
      gate: gateOf,
    },
  );
  const send = () =>
    onOpen({
      verb: 'openRfpRound',
      rfpId: event.id,
      optionRefs,
      quantityPoints: [...points].sort((a, b) => a - b),
      invitedSupplierIds: invited,
      deadline,
      ...(message.trim() ? { message: message.trim() } : {}),
    });
  return (
    <div className="border border-border-subtle rounded-md p-3 space-y-3" data-testid={`rfp-round-form-${event.id}`}>
      <p className="text-xs text-text-tertiary">{t('rfx.firm.askHint')}</p>
      <fieldset className="space-y-1">
        <legend className="text-xs font-semibold text-text-secondary mb-1">{t('rfx.firm.options')}</legend>
        {choices.map((c) => {
          // RFX-D15 — a settled option is shown, disabled, with how it was
          // settled. One ticked before it was settled (the form outlives the
          // read) can still be unticked, and the pre-check names it.
          const done = settled.get(c.ref);
          return (
            <label key={c.ref} className="flex items-start gap-2 text-sm text-text-primary">
              <input
                type="checkbox"
                className="mt-1"
                disabled={done !== undefined && !optionRefs.includes(c.ref)}
                checked={optionRefs.includes(c.ref)}
                onChange={() => setOptionRefs((prev) => toggle(prev, c.ref))}
                data-testid={`rfp-round-option-${c.ref}`}
              />
              <span className={done ? 'text-text-tertiary' : undefined}>
                {c.title}
                <span className="block text-xs text-text-tertiary">
                  {c.proposer ? t('rfx.rfp.toRfq.proposedBy', { supplier: c.proposer }) : t('rfx.rfp.toRfq.pti')}
                </span>
                {done && (
                  <span className="block text-xs text-text-secondary" data-testid={`rfp-round-option-settled-${c.ref}`}>
                    {done.by === 'award'
                      ? t('rfx.firm.settled.award')
                      : t('rfx.firm.settled.rfq', { rfq: done.rfqNumber })}
                  </span>
                )}
              </span>
            </label>
          );
        })}
      </fieldset>
      <fieldset className="flex flex-wrap gap-3">
        <legend className="text-xs font-semibold text-text-secondary mb-1">{t('rfx.firm.points')}</legend>
        {allPoints.map((q) => (
          <label key={q} className="flex items-center gap-2 text-sm text-text-primary">
            <input
              type="checkbox"
              checked={points.includes(q)}
              onChange={() => setPoints((prev) => toggle(prev, q))}
              data-testid={`rfp-round-point-${q}`}
            />
            <Data>{qty(q)}</Data>
          </label>
        ))}
      </fieldset>
      <fieldset className="space-y-1">
        <legend className="text-xs font-semibold text-text-secondary mb-1">{t('rfx.firm.suppliers')}</legend>
        {event.responses.map((r) => {
          const gate = gateOf(r.supplierId);
          return (
            <label key={r.supplierId} className="flex flex-wrap items-center gap-2 text-sm text-text-primary">
              <input
                type="checkbox"
                disabled={!gate.passes}
                checked={invited.includes(r.supplierId)}
                onChange={() => setInvited((prev) => toggle(prev, r.supplierId))}
                data-testid={`rfp-round-supplier-${r.supplierId}`}
              />
              {r.supplierName}
              <GateMarker gate={gate} testId={`rfp-round-gate-${r.supplierId}`} />
            </label>
          );
        })}
      </fieldset>
      <div className="flex flex-wrap items-end gap-3">
        <div>
          <label className="block text-xs font-semibold text-text-secondary mb-1" htmlFor={`rfp-round-deadline-${event.id}`}>
            {t('rfx.firm.deadline')}
          </label>
          <input
            id={`rfp-round-deadline-${event.id}`}
            type="date"
            value={deadline}
            onChange={(e) => setDeadline(e.target.value)}
            className={inputClass}
          />
        </div>
      </div>
      <div>
        <label className="block text-xs font-semibold text-text-secondary mb-1" htmlFor={`rfp-round-message-${event.id}`}>
          {t('rfx.firm.message')}
        </label>
        <textarea
          id={`rfp-round-message-${event.id}`}
          rows={2}
          value={message}
          onChange={(e) => setMessage(e.target.value)}
          className="w-full bg-white border border-border-input rounded-md px-3 py-2 text-sm focus:outline-none focus:border-action"
        />
      </div>
      {!!refusal && (
        <p className="text-sm text-danger" role="alert" data-testid={`rfp-round-refusal-${event.id}`}>
          {t(`rfx.firm.refusal.${refusalCode(refusal)}`, { defaultValue: refusal })}
        </p>
      )}
      <div className="flex flex-wrap gap-3">
        <Button
          variant="outline"
          disabled={pending || refusal !== null}
          onClick={send}
          data-testid={`rfp-round-open-${event.id}`}
        >
          {t('rfx.firm.openRound')}
        </Button>
        <Button variant="secondary" onClick={onCancel}>
          {t('rfx.firm.cancel')}
        </Button>
      </div>
    </div>
  );
};
