// ────────────────────────────────────────────────────────────────────────────
// CP-0 · 2e-c-4 — the confirm-before-commit dialog that records (or
// supersedes) an FX pin. Moved out of `BuyerSourcing.jsx` by the Phase 5 page
// split (no behaviour change). The typed-field refusal maps live HERE, beside
// the two fields that render them.
// ────────────────────────────────────────────────────────────────────────────
/** @import React from 'react' */
/** @import { TFunction } from 'i18next' */
/** @import { FxPinSource } from '@lib/fxPin' */
/** @import { VerbAvailability } from '@services/transitions/handoff' */
/** @import { FxRateRefusalReason, FxVintageRefusalReason } from '../../sourcing/fxRateInput' */
/** @import { PinDraft } from '../const' */
import Data from '@components/ui-v2/Data';
import Button from '@components/ui-v2/Button';
import ModalOverlay from '@components/ui-v2/ModalOverlay';
import { HandoffNotice } from '@components/ui-v2/HandoffNotice';
import { formatDate, formatMoney } from '@lib/format';
import { BASE_CURRENCY, FX_PIN_MAX_AGE_DAYS } from '@lib/currencyPolicy';
import { readFxRate, readFxVintage } from '../../sourcing/fxRateInput';
import { inputClass, labelClass } from '../const';

/** @type {Record<FxRateRefusalReason, string>} */
export const FX_RATE_REFUSAL_KEY = {
  EMPTY_QTY: 'sourcing.fx.refused.EMPTY_QTY',
  NOT_NUMERIC: 'sourcing.fx.refused.NOT_NUMERIC',
  AMBIGUOUS_QTY: 'sourcing.fx.refused.AMBIGUOUS_QTY',
  ZERO_RATE: 'sourcing.fx.refused.ZERO_RATE'
};

/** @type {Record<FxVintageRefusalReason, string>} */
export const FX_VINTAGE_REFUSAL_KEY = {
  EMPTY_VINTAGE: 'sourcing.fx.refused.EMPTY_VINTAGE',
  UNREADABLE_VINTAGE: 'sourcing.fx.refused.UNREADABLE_VINTAGE',
  FUTURE_VINTAGE: 'sourcing.fx.refused.FUTURE_VINTAGE'
};

/**
 * The refusal key for a typed pin field, or `null` when it reads (and when it is
 * still untouched — an empty field does not nag, it blocks at the button).
 *
 * One parser call, properly narrowed. The retired form called the parser TWICE
 * per render and reached the reason through `as { reason: string }` — a cast
 * that would have gone on compiling if the outcome shape changed underneath it.
 * @param {string} raw
 * @returns {string | null}
 */
const fxRateRefusalKey = (raw) => {
  if (raw.trim() === '') return null;
  const outcome = readFxRate(raw);
  return outcome.ok ? null : FX_RATE_REFUSAL_KEY[outcome.reason];
};

/**
 * @param {string} raw
 * @returns {string | null}
 */
const fxVintageRefusalKey = (raw) => {
  if (raw.trim() === '') return null;
  const outcome = readFxVintage(raw);
  return outcome.ok ? null : FX_VINTAGE_REFUSAL_KEY[outcome.reason];
};

/** A field-level refusal line in the pin dialog — same DOM as before, so the
 * @type {React.FC<{ messageKey: string | null; testId: string; t: TFunction }>}
 *  `fx-rate-refusal` / `fx-asof-refusal` witnesses are untouched. */
const FieldRefusal = ({ messageKey, testId, t }) =>
  messageKey === null ? null : (
    <div
      role="alert"
      data-testid={testId}
      className="mt-1 text-[length:var(--fs-label-3)] text-danger"
    >
      {t(messageKey)}
    </div>
  );

/**
 * @typedef {object} FxPinDialogProps
 * @property {PinDraft} pinDraft The draft being confirmed; the dialog edits it in place.
 * @property {(d: PinDraft | null) => void} setPinDraft `null` closes the dialog.
 * @property {VerbAvailability} fxPinAvailability The seat's `rfq:fx-pin`.
 * @property {boolean} fxPinPending Whether the pin dispatch is in flight.
 * @property {() => void} handlePinConfirm Records the pin.
 * @property {TFunction} t
 */

/**
 * The rate, vintage, source (and SAP rate type) fields, and the confirm act.
 * @type {React.FC<Omit<FxPinDialogProps, 'fxPinAvailability' | 'fxPinPending' | 'handlePinConfirm'>>}
 */
const FxPinFields = ({ pinDraft, setPinDraft, t }) => (
  <div className="flex flex-col gap-3">
    <div>
      <label className={labelClass} htmlFor="fx-rate">
        {t('sourcing.fx.dialog.rate', {
          currency: pinDraft.currency,
          base: BASE_CURRENCY
        })}
      </label>
      {/* type="text", NOT number (Ruling 6.2): a number input lets the
          BROWSER rewrite the value per its own locale before React
          sees it, which is how a locale-ambiguous rate would bypass
          the one parse entirely. */}
      <input
        id="fx-rate"
        type="text"
        inputMode="decimal"
        // Not "17.250": a placeholder must never model a token the
        // field would refuse as ambiguous.
        placeholder="17250"
        aria-invalid={pinDraft.rate.trim() !== '' && !readFxRate(pinDraft.rate).ok}
        value={pinDraft.rate}
        onChange={(e) => setPinDraft({ ...pinDraft, rate: e.target.value })}
        className={inputClass}
      />
      <div className="mt-1 text-[length:var(--fs-label-3)] text-text-tertiary">
        {t('sourcing.fx.dialog.rateHint')}
      </div>
      {/* An untouched blank does not nag; a TYPED rate that cannot be
          read says so, and says what to do about it. */}
      <FieldRefusal messageKey={fxRateRefusalKey(pinDraft.rate)} testId="fx-rate-refusal" t={t} />
    </div>

    <div>
      <label className={labelClass} htmlFor="fx-asof">
        {t('sourcing.fx.dialog.asOf')}
      </label>
      <input
        id="fx-asof"
        type="date"
        value={pinDraft.asOf}
        onChange={(e) => setPinDraft({ ...pinDraft, asOf: e.target.value })}
        className={inputClass}
      />
      <div className="mt-1 text-[length:var(--fs-label-3)] text-text-tertiary">
        {t('sourcing.fx.dialog.asOfHint', { days: FX_PIN_MAX_AGE_DAYS })}
      </div>
      <FieldRefusal
        messageKey={fxVintageRefusalKey(pinDraft.asOf)}
        testId="fx-asof-refusal"
        t={t}
      />
    </div>

    <div>
      <label className={labelClass} htmlFor="fx-source">
        {t('sourcing.fx.dialog.source')}
      </label>
      <select
        id="fx-source"
        value={pinDraft.source}
        onChange={(e) =>
          setPinDraft({
            ...pinDraft,
            source: /** @type {FxPinSource} */ (e.target.value)
          })
        }
        className={inputClass}
      >
        <option value="MANUAL">{t('sourcing.cmp.fx.basis.source.MANUAL')}</option>
        <option value="SAP_EXHGRATE">{t('sourcing.cmp.fx.basis.source.SAP_EXHGRATE')}</option>
      </select>
    </div>

    {/* Only meaningful for an SAP-sourced rate: a MANUAL pin has no
        rate type, and offering the field would invite a buyer to
        dress a typed number as an SAP-governed one. */}
    {pinDraft.source === 'SAP_EXHGRATE' && (
      <div>
        <label className={labelClass} htmlFor="fx-ratetype">
          {t('sourcing.fx.dialog.rateType')}
        </label>
        <input
          id="fx-ratetype"
          type="text"
          placeholder="M"
          value={pinDraft.rateType}
          onChange={(e) => setPinDraft({ ...pinDraft, rateType: e.target.value })}
          className={inputClass}
        />
      </div>
    )}
  </div>
);

// CP-0 · 2e-c-4 — CONFIRM BEFORE COMMIT. Recording the basis a contract
// will be awarded on is a governed act that lands in the DR-10 trail, so
// it gets the same deliberate confirmation every other governed act on
// this surface gets. A SUPERSEDE reads as a NEW RECORDED ACT throughout —
// different title, different body, and an explicit statement that the
// prior basis is kept — because "edit" would describe a mutation that
// cannot happen and would misrepresent what the trail will show.
/**
 * The FX-pin dialog.
 * @type {React.FC<FxPinDialogProps>}
 */
const FxPinDialog = ({
  pinDraft,
  setPinDraft,
  fxPinAvailability,
  fxPinPending,
  handlePinConfirm,
  t
}) => (
  <ModalOverlay
    onClose={() => setPinDraft(null)}
    label={t(
      pinDraft.superseding
        ? 'sourcing.fx.dialog.title.supersede'
        : 'sourcing.fx.dialog.title.record',
      { currency: pinDraft.currency }
    )}
    testId="fx-pin-dialog"
  >
    <div className="w-full max-w-md bg-white rounded-lg border border-border-subtle p-5">
      <h3 className="text-section text-text-primary mb-1">
        {t(
          pinDraft.superseding
            ? 'sourcing.fx.dialog.title.supersede'
            : 'sourcing.fx.dialog.title.record',
          { currency: pinDraft.currency }
        )}
      </h3>
      <p className="text-xs text-text-secondary mb-4">
        {t(
          pinDraft.superseding
            ? 'sourcing.fx.dialog.body.supersede'
            : 'sourcing.fx.dialog.body.record',
          { currency: pinDraft.currency, base: BASE_CURRENCY }
        )}
      </p>

      {/* What is being replaced, stated in full — a buyer superseding a
          rate must see the one they are superseding, or they cannot tell
          whether they are correcting a typo or reacting to a real move. */}
      {pinDraft.superseding && (
        <div
          data-testid="fx-supersede-prior"
          className="mb-4 rounded-md border border-border-subtle bg-surface-subtle px-3 py-2 text-xs"
        >
          <span className="text-text-tertiary">{t('sourcing.fx.dialog.prior')} </span>
          <Data as="span" className="font-semibold">
            {formatMoney(pinDraft.superseding.rate, pinDraft.superseding.base)}
          </Data>
          <span className="text-text-secondary">
            {' '}
            {t('sourcing.cmp.fx.basis.asOf', {
              date: formatDate(pinDraft.superseding.asOf)
            })}
          </span>
        </div>
      )}

      <FxPinFields pinDraft={pinDraft} setPinDraft={setPinDraft} t={t} />

      <div className="flex justify-end gap-2 mt-5">
        <Button variant="secondary" onClick={() => setPinDraft(null)}>
          {t('sourcing.fx.dialog.cancel')}
        </Button>
        {/* DP2-BUTTON-01: SOLID is reserved for the irreversible commit,
            and this is one — an appended pin cannot be taken back, only
            superseded. */}
        <HandoffNotice availability={fxPinAvailability} testId="handoff-rfq-fxpin" />
        {fxPinAvailability.kind === 'held' && (
          <Button
            variant="outline"
            onClick={handlePinConfirm}
            disabled={
              !readFxRate(pinDraft.rate).ok || !readFxVintage(pinDraft.asOf).ok || fxPinPending
            }
          >
            {fxPinPending
              ? t('sourcing.fx.dialog.submitting')
              : t(
                  pinDraft.superseding
                    ? 'sourcing.fx.dialog.confirm.supersede'
                    : 'sourcing.fx.dialog.confirm.record'
                )}
          </Button>
        )}
      </div>
    </div>
  </ModalOverlay>
);

export default FxPinDialog;
