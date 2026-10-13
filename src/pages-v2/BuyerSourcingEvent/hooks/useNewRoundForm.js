import { useState } from 'react';

/**
 * The "new negotiation round" form's fields: the shortlisted suppliers, the
 * round deadline, the buyer's message, the target unit price and the
 * best-and-final flag. Called by the page itself (not by the form), so the
 * values live exactly as long as they did when they were the page's own state.
 * Moved out of `BuyerSourcingEvent.jsx` by the Phase 5 page split (no
 * behaviour change).
 */
export function useNewRoundForm() {
  const [shortlist, setShortlist] = useState(/** @type {string[]} */ ([]));
  const [roundDeadline, setRoundDeadline] = useState('');
  const [roundMessage, setRoundMessage] = useState('');
  const [roundTarget, setRoundTarget] = useState('');
  const [bestAndFinal, setBestAndFinal] = useState(false);
  return {
    shortlist,
    setShortlist,
    roundDeadline,
    setRoundDeadline,
    roundMessage,
    setRoundMessage,
    roundTarget,
    setRoundTarget,
    bestAndFinal,
    setBestAndFinal
  };
}

/** @typedef {ReturnType<typeof useNewRoundForm>} NewRoundFormState */
