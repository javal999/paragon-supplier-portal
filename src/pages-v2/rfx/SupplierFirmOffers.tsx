import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import Button from '../../components/ui-v2/Button';
import Data from '../../components/ui-v2/Data';
import StatusPill from '../../components/ui-v2/StatusPill';
import Table from '../../components/ui-v2/Table';
import TableHeader, { TableHeaderCell } from '../../components/ui-v2/TableHeader';
import TableRow from '../../components/ui-v2/TableRow';
import TableCell from '../../components/ui-v2/TableCell';
import { HandoffNotice } from '../../components/ui-v2/HandoffNotice';
import SessionAttachments from '../../components/ui-v2/SessionAttachments';
import { useVerbAvailability } from '../../hooks/useVerbAvailability';
import { formatDate } from '../../lib/format';
import type { RfxCommandVars } from '../../services/query/commandHooks';
import type { AttachmentMeta } from '../../services/attachments/sessionAttachments';
import type { RfpFirmOffer, RfpFirmPrice } from '../../services/sourcing/types';
import type { RfpAwardView, RfpEventView, RfpOfferRoundView } from '../../services/sourcing/views';
import { firmOfferRefusal } from '../../services/sourcing/rfpFirmOffer';
import { supplierOptionOutcomes, type SupplierItemOutcome } from '../../services/sourcing/awardOutcome';
import { DeadlinePill, money, qty, rfxNow } from './rfxDisplay';
import { FirmPill } from './rfxAuthoringDisplay';
import { refusalCode } from './RfxQuestionEditor';
import { optionsOfRounds } from './AwardPanel';

// ────────────────────────────────────────────────────────────────────────────
// RFx D3 — THE SUPPLIER'S FIRM-OFFER REQUESTS AND AWARD OUTCOME ON AN RFP
// (NR-2 supplier steps 2 to 4, BR-01, BR-03, BR-04, BR-09; AC-07).
//
// A firm-offer request says, before anything else, that the prices given are
// FIRM until the validity date the supplier sets. Then the grid: option ×
// quantity point, a required validity date, and `submitFirmOffer` (first
// time) or `reviseFirmOffer` (after) until the round's deadline. Once the
// round is closed or past its deadline the offer is shown read-only.
//
// The form is pre-checked with the verb's own rule (`firmOfferRefusal`,
// RFX-R2). The read gives this supplier only the rounds it was asked to and
// only its own offer (RFX-R4), so nothing here can show a rival's price.
//
// BL-129 (CE-11h) — the firm offer carries its own files: a round often
// changes the drawing or the material (NR-1 BR-09), so the supplier can attach
// the revised ones. They travel on the verb (`documents`) and are checked by
// the same rule; a revision sends the files in force, so one left untouched is
// kept, and every version keeps the files it was sent with.
// ────────────────────────────────────────────────────────────────────────────

const cellKey = (ref: string, point: number) => `${ref}@${point}`;

export interface SupplierFirmOffersProps {
  event: RfpEventView;
  /** The rounds of this RFP this supplier was asked to (its own read). */
  rounds: readonly RfpOfferRoundView[];
  /** This supplier's awards on this RFP (its own lines and outcome only). */
  awards: readonly RfpAwardView[];
  supplierId: string;
  pending: boolean;
  send: (vars: RfxCommandVars, successKey: string) => void;
}

export const SupplierFirmOffers: React.FC<SupplierFirmOffersProps> = ({
  event,
  rounds,
  awards,
  supplierId,
  pending,
  send,
}) => {
  const verb = useVerbAvailability('rfpfirmoffer:submit');
  if (rounds.length === 0 && awards.length === 0) return null;
  return (
    <div className="px-4 py-4 space-y-4 border-t border-border-subtle" data-testid={`supplier-firm-${event.id}`}>
      {verb.kind !== 'held' && rounds.some((r) => !r.closed && !r.overdue) && (
        <HandoffNotice availability={verb} testId="handoff-rfp-firm-offer" />
      )}
      {[...rounds]
        .sort((a, b) => b.roundNumber - a.roundNumber)
        .map((round) => (
          <FirmOfferRequest
            key={round.id}
            round={round}
            offer={round.offers.find((o) => o.supplierId === supplierId)}
            supplierId={supplierId}
            editable={verb.kind === 'held' && !round.closed && !round.overdue}
            pending={pending}
            send={send}
          />
        ))}
      <OptionOutcomes event={event} rounds={rounds} awards={awards} supplierId={supplierId} />
    </div>
  );
};

/** One round's request: the notice, the grid, the validity, and the send. */
const FirmOfferRequest: React.FC<{
  round: RfpOfferRoundView;
  offer: RfpFirmOffer | undefined;
  supplierId: string;
  editable: boolean;
  pending: boolean;
  send: (vars: RfxCommandVars, successKey: string) => void;
}> = ({ round, offer, supplierId, editable, pending, send }) => {
  const { t } = useTranslation();
  const [cells, setCells] = useState<Record<string, string>>(() =>
    Object.fromEntries((offer?.prices ?? []).map((p) => [cellKey(p.optionRef, p.qty), String(p.unitPrice)])),
  );
  const [validUntil, setValidUntil] = useState(offer?.validUntil ?? '');
  const [documents, setDocuments] = useState<readonly AttachmentMeta[]>(offer?.documents ?? []);
  const prices: RfpFirmPrice[] = round.options.flatMap((o) =>
    round.quantityPoints.flatMap((point) => {
      const raw = cells[cellKey(o.ref, point)]?.trim() ?? '';
      return raw === '' ? [] : [{ optionRef: o.ref, qty: point, unitPrice: Number(raw) }];
    }),
  );
  const refusal = firmOfferRefusal(
    {
      optionRefs: round.optionRefs,
      quantityPoints: round.quantityPoints,
      invitedSupplierIds: round.invitedSupplierIds,
      deadline: round.deadline,
      closed: round.closed,
    },
    supplierId,
    { prices, validUntil, documents },
    rfxNow(),
  );
  // Always sent, even empty: a revision without them drops the files in force.
  const files = { documents: [...documents] };
  const submit = () =>
    send(
      offer
        ? { verb: 'reviseFirmOffer', offerId: offer.id, prices, validUntil, ...files }
        : { verb: 'submitFirmOffer', roundId: round.id, supplierId, prices, validUntil, ...files },
      'rfx.toast.firmOfferSent',
    );
  const priceOf = (ref: string, point: number) =>
    offer?.prices.find((p) => p.optionRef === ref && p.qty === point)?.unitPrice;
  return (
    <section className="border border-border-subtle rounded-md p-3 space-y-3" data-testid={`supplier-round-${round.id}`}>
      <div className="flex flex-wrap items-center gap-3">
        <h4 className="text-sm font-semibold text-text-primary">{t('rfx.firm.supplier.title', { n: round.roundNumber })}</h4>
        <DeadlinePill deadline={round.deadline} done={round.closed} />
      </div>
      <p
        className="text-sm text-action-hover bg-action-soft rounded px-3 py-2"
        data-testid={`supplier-round-notice-${round.id}`}
      >
        {t('rfx.firm.supplier.notice')}
      </p>
      {!!round.message && (
        <p className="text-sm text-text-secondary">
          {t('rfx.firm.supplier.message')}: {round.message}
        </p>
      )}
      {!!offer && (
        <div className="flex flex-wrap items-center gap-2 text-xs text-text-secondary" data-testid={`supplier-round-offer-${round.id}`}>
          <FirmPill />
          <span>{t('rfx.firm.validUntil', { date: formatDate(offer.validUntil) })}</span>
          <span>
            {t('rfx.firm.supplier.sent', { n: offer.versions.length, date: formatDate(offer.submittedAt) })}
          </span>
        </div>
      )}
      {!editable && (
        <p className="text-xs text-text-tertiary">
          {offer ? t('rfx.firm.supplier.closed') : t('rfx.firm.supplier.none')}
        </p>
      )}
      <div className="overflow-x-auto">
        <FirmPriceGrid
          round={round}
          editable={editable}
          typedOf={(ref, point) => cells[cellKey(ref, point)] ?? ''}
          sentOf={priceOf}
          onChange={(ref, point, v) => setCells((prev) => ({ ...prev, [cellKey(ref, point)]: v }))}
        />
      </div>
      {(editable || (offer?.documents ?? []).length > 0) && (
        <SessionAttachments
          value={editable ? documents : (offer?.documents ?? [])}
          onChange={editable ? setDocuments : undefined}
          label={t('rfx.firm.documents')}
          testId={`supplier-round-docs-${round.id}`}
        />
      )}
      {editable && (
        <div className="flex flex-wrap items-end gap-3">
          <div>
            <label className="block text-xs font-semibold text-text-secondary mb-1" htmlFor={`supplier-round-valid-${round.id}`}>
              {t('rfx.firm.supplier.validity')}
            </label>
            <input
              id={`supplier-round-valid-${round.id}`}
              type="date"
              required
              value={validUntil}
              onChange={(e) => setValidUntil(e.target.value)}
              className="bg-white border border-border-input rounded-md px-3 h-10 text-sm focus:outline-none focus:border-action"
            />
          </div>
          <Button
            variant="outline"
            disabled={pending || refusal !== null}
            onClick={submit}
            data-testid={`supplier-round-send-${round.id}`}
          >
            {offer ? t('rfx.firm.supplier.revise') : t('rfx.firm.supplier.submit')}
          </Button>
        </div>
      )}
      {editable && !!refusal && (
        <p className="text-sm text-danger" role="alert" data-testid={`supplier-round-refusal-${round.id}`}>
          {t(`rfx.firm.refusal.${refusalCode(refusal)}`, { defaultValue: refusal })}
        </p>
      )}
    </section>
  );
};

/** The grid: option × quantity point, each cell a firm unit price (typed, or as sent). */
const FirmPriceGrid: React.FC<{
  round: RfpOfferRoundView;
  editable: boolean;
  typedOf: (ref: string, point: number) => string;
  sentOf: (ref: string, point: number) => number | undefined;
  onChange: (ref: string, point: number, value: string) => void;
}> = ({ round, editable, typedOf, sentOf, onChange }) => {
  const { t } = useTranslation();
  const cell = (ref: string, title: string, point: number) => {
    if (editable) {
      return (
        <input
          type="number"
          min={0}
          aria-label={`${title} — ${qty(point)}`}
          value={typedOf(ref, point)}
          onChange={(e) => onChange(ref, point, e.target.value)}
          className="w-32 bg-white border border-border-input rounded-md px-3 h-9 text-sm focus:outline-none focus:border-action"
        />
      );
    }
    const sent = sentOf(ref, point);
    return <Data>{sent === undefined ? '—' : money(sent, round.currency)}</Data>;
  };
  return (
    <Table>
      <TableHeader>
        <TableHeaderCell>{t('rfx.firm.options')}</TableHeaderCell>
        {round.quantityPoints.map((point) => (
          <TableHeaderCell key={point}>
            <Data>{qty(point)}</Data>
            <FirmPill className="ml-2 normal-case" />
          </TableHeaderCell>
        ))}
      </TableHeader>
      <tbody>
        {round.options.map((o) => (
          <TableRow key={o.ref} data-testid={`supplier-round-row-${round.id}-${o.ref}`}>
            <TableCell className="text-sm text-text-primary">{o.title}</TableCell>
            {round.quantityPoints.map((point) => (
              <TableCell key={point}>{cell(o.ref, o.title, point)}</TableCell>
            ))}
          </TableRow>
        ))}
      </tbody>
    </Table>
  );
};

/** NR-2 BR-09 — this supplier's outcome, option by option, once any award is recorded. */
const OptionOutcomes: React.FC<{
  event: RfpEventView;
  rounds: readonly RfpOfferRoundView[];
  awards: readonly RfpAwardView[];
  supplierId: string;
}> = ({ event, rounds, awards, supplierId }) => {
  const { t } = useTranslation();
  const decided = awards.length > 0 || event.status === 'Awarded' || event.status === 'Partly awarded';
  if (!decided) return null;
  const options = optionsOfRounds(rounds);
  const refs = [...new Set([...options.map((o) => o.ref), ...awards.flatMap((a) => a.lines.map((l) => l.optionRef))])];
  const titleOf = (ref: string) =>
    options.find((o) => o.ref === ref)?.title ??
    awards.flatMap((a) => a.lines).find((l) => l.optionRef === ref)?.optionTitle ??
    ref;
  const rows = supplierOptionOutcomes(refs, awards, supplierId, event.status);
  return (
    <div data-testid={`supplier-rfp-outcome-${event.id}`}>
      <h4 className="text-sm font-semibold text-text-primary mb-2">{t('rfx.rfpAward.outcome')}</h4>
      <ul className="space-y-1">
        {rows.map(({ optionRef, outcome }) => (
          <li
            key={optionRef}
            className="flex flex-wrap items-center gap-2 text-sm"
            data-testid={`supplier-rfp-outcome-${event.id}-${optionRef}`}
          >
            <span className="text-text-secondary">{titleOf(optionRef)}</span>
            <OptionOutcomePill outcome={outcome} />
          </li>
        ))}
      </ul>
    </div>
  );
};

const OptionOutcomePill: React.FC<{ outcome: SupplierItemOutcome }> = ({ outcome }) => {
  const { t } = useTranslation();
  switch (outcome.kind) {
    case 'awarded':
      return (
        <StatusPill variant="success">
          {t('rfx.award.yourShare', { share: outcome.sharePct, qty: qty(outcome.quantity) })}
          {outcome.breakQty !== undefined ? ` ${t('rfx.rfpAward.atPoint', { qty: qty(outcome.breakQty) })}` : ''}
        </StatusPill>
      );
    case 'notAwarded':
      return <StatusPill variant="neutral">{t('rfx.award.notAwarded')}</StatusPill>;
    case 'withdrawn':
      return (
        <StatusPill variant="warning">
          {t('rfx.award.outcome.withdrawn', { date: formatDate(outcome.withdrawnAt) })}
        </StatusPill>
      );
    case 'pending':
      return <StatusPill variant="info">{t('rfx.award.outcome.pending')}</StatusPill>;
  }
};
