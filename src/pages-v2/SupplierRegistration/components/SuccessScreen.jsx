/** @import React from 'react' */
import { Info } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import Button from '@components/ui-v2/Button';

/**
 * ⚠️ **THE END OF THE WALKTHROUGH. ONE TRUE SENTENCE, WHERE THERE WERE SEVEN
 * CLAIMS AND ONE OF THEM WAS TRUE.**
 *
 * What stood here, measured: a green success tick; the heading *Registration
 * submitted*; the subtitle *received and is under review*; a fabricated
 * `APP-2026-{random}` under the label "Application number"; then a numbered
 * list whose FIRST item said *"your application has not been submitted to
 * anyone, and no review will take place"* — and whose items 2, 3 and 4
 * promised an email with the outcome, onboarding credentials on approval, and
 * a support address to contact *quoting your application number*.
 *
 * The one honest line was buried at position 1 of a list, under a green tick,
 * beside a document number that named nothing. Everything except that line is
 * deleted; that line is now the heading, reworded to say what the page IS
 * rather than what it did not do.
 *
 * ⚠️ **AND THERE IS NO PERSONA GUARD, DELIBERATELY.** `NoSupplierIdentity` is
 * this tree's refusal precedent and its principle transfers — refuse in full,
 * name the arm, never suggest an act that changes nothing. Its SHAPE does not:
 * a refusal must name the party it refuses, and there is no applicant here to
 * name. `middleware.js` matches `'/(.*)'`, so every visitor to `/register`
 * already holds Paragon's shared credential; the page has always been a
 * walkthrough shown to credentialed visitors. It now says so instead of
 * refusing somebody who does not exist.
 *
 * ⚠️ **THE RESTART IS NOT DECORATION.** Deleting the copy left the last step of
 * a five-step wizard with nothing after it — a dead end, which is the shape
 * this batch exists to remove, not to relocate. `Start again` is the only act
 * this page can honestly perform, and it performs it: it resets the wizard.
 */
/**
 * @typedef {object} SuccessScreenProps
 * @property {() => void} onRestart
 */

/**
 * The screen after Submit: one honest sentence and a restart button.
 * @type {React.FC<SuccessScreenProps>}
 */
const SuccessScreen = ({ onRestart }) => {
  const { t } = useTranslation();
  return (
    <div className="bg-bg-surface border border-border-subtle rounded-lg shadow-md p-6 sm:p-10 text-center">
      {/* Neutral, not a success tick. A green check IS a claim — it says the
          thing you did worked — and nothing here was submitted. */}
      <div className="inline-flex w-14 h-14 rounded-full bg-bg-hover border border-border-subtle items-center justify-center mb-4">
        <Info size={32} className="text-text-tertiary" />
      </div>
      <h1 className="text-title text-text-primary mb-3 max-w-xl mx-auto">
        {t('registration.success.headline')}
      </h1>
      <p className="text-sm text-text-secondary mb-8 max-w-xl mx-auto">
        {t('registration.success.body')}
      </p>
      <Button variant="secondary" onClick={onRestart}>
        {t('registration.success.restart')}
      </Button>
    </div>
  );
};

export default SuccessScreen;
