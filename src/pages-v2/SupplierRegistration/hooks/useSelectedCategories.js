import { useFormContext, useWatch } from 'react-hook-form';
/** @import { RegistrationForm } from '../utils' */

/**
 * The supply categories ticked so far, and a toggle for one of them. Both
 * category steps (External SR step 3, Internal SR step 1) write `selCats`
 * through this. A newly ticked category is APPENDED, so the review lists the
 * categories in the order they were picked, not in the list's order — a
 * react-hook-form checkbox group registered on `selCats` would store them in
 * DOM order instead, which is why the value is set by hand.
 * @returns {{ selCats: string[]; toggleCat: (cat: string) => void; error: string | undefined }}
 */
export function useSelectedCategories() {
  const {
    setValue,
    getValues,
    formState: { errors },
    control
  } = /** @type {RegistrationForm} */ (useFormContext());
  const selCats = useWatch({ control, name: 'selCats' });
  /** @param {string} cat */
  const toggleCat = (cat) => {
    const current = getValues('selCats');
    setValue(
      'selCats',
      current.includes(cat) ? current.filter((c) => c !== cat) : [...current, cat]
    );
  };
  return { selCats, toggleCat, error: errors.selCats?.message };
}
