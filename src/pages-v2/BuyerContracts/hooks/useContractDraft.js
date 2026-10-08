/** @import { Supplier } from '@services/data/types' */
/** @import { DraftContract, DraftObligation } from '../const' */
import { useMemo, useState } from 'react';
import {
  normalizeContractNumbers,
  readContractValue,
  readNoticeRequiredDays
} from '../../contracts/contractCreateModel';
import { EMPTY_DRAFT } from '../const';

let obligationSeq = 0;
/**
 * A unique id for a new draft obligation row (see `DraftObligation.id`).
 * @returns {string}
 */
const newObligationId = () => `obl-${++obligationSeq}`;

/**
 * The contract wizard's collected draft and every edit to it: the draft
 * itself, the supplier picker's search, the custom-obligation input, the
 * obligation list edits, the ONE parse of the two numbers, and the per-step
 * gate. The wizard's open/step state and the terminal `stoppedDraft` stay in
 * the workspace. Moved out of `BuyerContracts.jsx`'s workspace by the Phase 5
 * page split (no behaviour change).
 * @param {Supplier[]} suppliers The supplier list the picker filters.
 */
export function useContractDraft(suppliers) {
  const [draft, setDraft] = useState(/** @type {DraftContract} */ (EMPTY_DRAFT));
  const [supplierSearch, setSupplierSearch] = useState('');
  const [customObligationTitle, setCustomObligationTitle] = useState('');

  /**
   * @template {keyof DraftContract} K
   * @param {K} key
   * @param {DraftContract[K]} value
   */
  const updateDraft = (key, value) => setDraft((d) => ({ ...d, [key]: value }));

  // ── CP-0 · W1 · 2f-b — THE ONE READ of the wizard's two numbers ────────────
  // The composite is what the step gate and the created entity read; the two
  // per-field reads exist so each input can report ITSELF. All three go through
  // the same `normalizeQty` on the same string, so the inline message, the gate
  // and the stored value cannot disagree — which is precisely what the three
  // separate `Number()` calls could not promise.
  const contractNumbers = useMemo(
    () =>
      normalizeContractNumbers({
        value: draft.value,
        noticeRequiredDays: draft.noticeRequiredDays
      }),
    [draft.value, draft.noticeRequiredDays]
  );
  const valueRead = useMemo(() => readContractValue(draft.value), [draft.value]);
  const noticeRead = useMemo(
    () => readNoticeRequiredDays(draft.noticeRequiredDays),
    [draft.noticeRequiredDays]
  );

  /** @param {string} b */
  const toggleBrand = (b) =>
    setDraft((d) => ({
      ...d,
      brands: d.brands.includes(b) ? d.brands.filter((x) => x !== b) : [...d.brands, b]
    }));

  /**
   * @param {string} title
   * @param {DraftObligation['owner']} owner
   */
  const toggleSuggestedObligation = (title, owner) =>
    setDraft((d) => {
      const idx = d.obligations.findIndex((o) => o.title === title);
      if (idx >= 0) {
        return {
          ...d,
          obligations: d.obligations.filter((_, i) => i !== idx)
        };
      }
      return {
        ...d,
        obligations: [...d.obligations, { id: newObligationId(), title, owner, dueDate: '' }]
      };
    });

  const addCustomObligation = () => {
    if (!customObligationTitle.trim()) return;
    setDraft((d) => ({
      ...d,
      obligations: [
        ...d.obligations,
        { id: newObligationId(), title: customObligationTitle.trim(), owner: 'Both', dueDate: '' }
      ]
    }));
    setCustomObligationTitle('');
  };

  /** @param {number} i */
  const removeObligation = (i) =>
    setDraft((d) => ({
      ...d,
      obligations: d.obligations.filter((_, idx) => idx !== i)
    }));

  /**
   * @template {keyof DraftObligation} K
   * @param {number} i
   * @param {K} key
   * @param {DraftObligation[K]} value
   */
  const updateObligation = (i, key, value) =>
    setDraft((d) => ({
      ...d,
      obligations: d.obligations.map((o, idx) => (idx === i ? { ...o, [key]: value } : o))
    }));

  const supplierTableFiltered = useMemo(() => {
    if (!supplierSearch) return suppliers;
    const q = supplierSearch.toLowerCase();
    return suppliers.filter(
      (s) => s.name.toLowerCase().includes(q) || s.country.toLowerCase().includes(q)
    );
  }, [supplierSearch, suppliers]);

  /**
   * @param {number} step
   * @returns {boolean}
   */
  const isStepValid = (step) => {
    if (step === 0) {
      return (
        draft.title.trim().length > 0 &&
        draft.type !== '' &&
        draft.supplierId !== '' &&
        draft.category !== ''
      );
    }
    if (step === 1) {
      if (!draft.startDate || !draft.endDate) return false;
      if (new Date(draft.endDate) <= new Date(draft.startDate)) return false;
      // Reads the ONE parse. A refusal on EITHER number holds the step — the
      // notice period had no gate at all before, which is how `|| 0` turned a
      // cleared field into a stated zero-day notice requirement.
      if (!contractNumbers.ok) return false;
      // The pre-existing `> 0` rule, PRESERVED VERBATIM. Whether a zero-value
      // contract should be legal is a commercial question, not a parsing one;
      // this batch only stops the value being misread on the way to it.
      return contractNumbers.value.value > 0;
    }
    return true;
  };

  return {
    draft,
    setDraft,
    updateDraft,
    supplierSearch,
    setSupplierSearch,
    customObligationTitle,
    setCustomObligationTitle,
    contractNumbers,
    valueRead,
    noticeRead,
    toggleBrand,
    toggleSuggestedObligation,
    addCustomObligation,
    removeObligation,
    updateObligation,
    supplierTableFiltered,
    isStepValid
  };
}
