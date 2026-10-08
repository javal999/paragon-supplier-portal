// ────────────────────────────────────────────────────────────────────────────
// /register — THE FORM'S OBSERVABLE STATES, pinned before the form state moves
// from `useState` to react-hook-form (PAGE-SPLIT-GUIDE, "Forms").
//
// Written against the `useState` implementation and required to pass, unchanged,
// against the react-hook-form one. Everything here drives the real entrance —
// type card, Continue, then the wizard's own Next / Back / Submit — and reads
// only what a person sees: field values, button enablement, review rows, the end
// screen.
//
// ⚠️ **THE VALIDATION MESSAGES ARE PINNED AS NEVER SHOWN, BECAUSE THEY NEVER
// ARE.** `Wizard` disables Next while `isStepValid(step)` is false, and
// `isStepValid` runs the same validators `handleStepChange` would run to
// produce the messages. So a step with a missing field cannot be left, and a
// step that can be left has nothing to report: the `registration.validation.*`
// strings render on no path a person can take. The tests below assert exactly
// that, so a conversion that starts showing them (a different validation mode)
// goes red and has to be called out.
//
// ⚠️ **AND THE KOL SUBMIT IS PINNED AS A DEAD END, BECAUSE IT IS ONE.** The KOL
// wizard has no agreements step, yet `handleComplete` checks the agreements for
// every type; for KOL they are always unticked, so Submit sets two errors that
// no KOL step renders and returns. Nothing happens on screen. That is a defect,
// recorded here so the conversion keeps it rather than fixing it silently —
// fixing it is its own change.
// ────────────────────────────────────────────────────────────────────────────

import { describe, it, expect, beforeEach } from 'vitest';
import { screen, fireEvent, within } from '@testing-library/react';
import { renderWithProviders } from '@test/test-utils';
import i18n from '@lib/i18n';
import SupplierRegistration from './SupplierRegistration';

/** @param {string} key @param {Record<string, unknown>} [opts] */
const t = (key, opts) => i18n.t(key, opts);

/**
 * A field by its caption; a required caption carries a trailing `*`.
 * @param {string} key
 * @returns {RegExp}
 */
const caption = (key) => new RegExp(`^${t(key).replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\*?$`);

/** @param {string} key @returns {HTMLInputElement} */
const input = (key) => /** @type {HTMLInputElement} */ (screen.getByLabelText(caption(key)));

/** @param {string} key @returns {HTMLInputElement[]} */
const inputs = (key) => /** @type {HTMLInputElement[]} */ (screen.getAllByLabelText(caption(key)));

/** @param {HTMLElement} el @param {string} value */
const type = (el, value) => fireEvent.change(el, { target: { value } });

const nextButton = () => screen.getByRole('button', { name: t('wizard.next') });
const backButton = () => screen.getByRole('button', { name: t('wizard.back') });
const submitButton = () => screen.getByRole('button', { name: t('registration.submit') });

/** The wizard's current step heading (the `<h2>` above the content). */
const stepHeading = () => screen.getByRole('heading', { level: 2 }).textContent;

/** Every `registration.validation.*` message, in the current language. */
const VALIDATION_KEYS = [
  'registration.validation.legalName.required',
  'registration.validation.npwp.required',
  'registration.validation.city.required',
  'registration.validation.address.required',
  'registration.validation.province.required',
  'registration.validation.name.required',
  'registration.validation.email.required',
  'registration.validation.email.invalid',
  'registration.validation.whatsapp.required',
  'registration.validation.bankName.required',
  'registration.validation.accountNumber.required',
  'registration.validation.accountHolder.required',
  'registration.validation.agreed1.required',
  'registration.validation.agreed2.required',
  'registration.validation.category.required'
];

const expectNoValidationMessage = () => {
  for (const key of VALIDATION_KEYS) expect(screen.queryByText(t(key)), key).toBeNull();
  expect(document.querySelector('[aria-invalid="true"]')).toBeNull();
};

/**
 * The value shown beside a review row's label. `index` picks among repeated
 * labels (one set per contact).
 * @param {string} key
 * @param {number} [index]
 * @returns {string | null | undefined}
 */
const reviewValue = (key, index = 0) =>
  screen.getAllByText(t(key), { selector: 'span' })[index].nextElementSibling?.textContent;

/** @param {'external' | 'internal' | 'kol'} kind */
const start = (kind) => {
  renderWithProviders(<SupplierRegistration />);
  fireEvent.click(screen.getByText(t(`registration.type.${kind}.label`)));
  fireEvent.click(screen.getByRole('button', { name: t('registration.selector.continue') }));
};

// NPWP and NIB are deliberately NOT in their registry formats: a value in the
// real format is a statutory identifier as far as `thirdPartyIdentifiers` can
// tell, and this spec needs only that the field carries what was typed.
const fillCompany = () => {
  type(input('registration.step.company.field.legalName.label'), 'PT Uji Coba');
  type(input('registration.step.company.field.npwp.label'), 'NPWP-UJI-001');
  type(input('registration.step.company.field.nib.label'), 'NIB-UJI-001');
  type(input('registration.step.company.field.province.label'), 'Jawa Barat');
  type(input('registration.step.company.field.city.label'), 'Bandung');
  type(input('registration.step.company.field.address.label'), 'Jl. Asia Afrika 1');
  type(input('registration.step.company.field.website.label'), 'https://uji.example');
};

/** @param {number} i */
const fillContact = (i, name = `Kontak ${i + 1}`, email = `k${i + 1}@uji.example`) => {
  type(inputs('registration.step.contacts.field.name.label')[i], name);
  type(inputs('registration.step.contacts.field.email.label')[i], email);
  type(inputs('registration.step.contacts.field.whatsapp.label')[i], `+62 812 000 00${i}`);
};

const fillBank = () => {
  type(input('registration.step.bank.field.bankName.label'), 'Mandiri');
  type(input('registration.step.bank.field.accountNumber.label'), '1300012345');
  type(input('registration.step.bank.field.accountHolder.label'), 'PT Uji Coba');
};

/** @param {string} key */
const toggleCategory = (key) => fireEvent.click(screen.getByRole('checkbox', { name: t(key) }));

beforeEach(async () => {
  await i18n.changeLanguage('en');
});

// ─────────────────────────────────────────────────────────────────────────────
describe('the type selector', () => {
  it('Continue is disabled until a type is picked, and the pick shows its banner', () => {
    renderWithProviders(<SupplierRegistration />);
    const cont = screen.getByRole('button', { name: t('registration.selector.continue') });
    expect(cont).toBeDisabled();
    // The detail line shows once on its card; the banner repeats it once picked.
    expect(screen.getAllByText(t('registration.type.kol.detail'), { exact: false })).toHaveLength(
      1
    );
    fireEvent.click(screen.getByText(t('registration.type.kol.label')));
    expect(cont).toBeEnabled();
    expect(screen.getAllByText(t('registration.type.kol.detail'), { exact: false })).toHaveLength(
      2
    );
  });
});

// ─────────────────────────────────────────────────────────────────────────────
describe('External SR · company step', () => {
  it('starts empty on Indonesia, with Next disabled and no message shown', () => {
    start('external');
    expect(stepHeading()).toBe(t('registration.step.company.title'));
    expect(input('registration.step.company.field.legalName.label').value).toBe('');
    expect(input('registration.step.company.field.country.label').value).toBe('Indonesia');
    expect(input('registration.step.company.field.province.label').value).toBe('');
    expect(nextButton()).toBeDisabled();
    fireEvent.click(nextButton());
    expect(stepHeading()).toBe(t('registration.step.company.title'));
    expectNoValidationMessage();
  });

  it('each required field holds Next back until it is filled', () => {
    start('external');
    fillCompany();
    expect(nextButton()).toBeEnabled();
    for (const key of [
      'registration.step.company.field.legalName.label',
      'registration.step.company.field.npwp.label',
      'registration.step.company.field.city.label',
      'registration.step.company.field.address.label'
    ]) {
      const el = input(key);
      const was = el.value;
      type(el, '   ');
      expect(nextButton(), key).toBeDisabled();
      type(el, was);
      expect(nextButton(), key).toBeEnabled();
    }
    // NIB and website are optional.
    type(input('registration.step.company.field.nib.label'), '');
    type(input('registration.step.company.field.website.label'), '');
    expect(nextButton()).toBeEnabled();
    expectNoValidationMessage();
  });

  it('province is required only for Indonesia, and changing country clears it', () => {
    start('external');
    fillCompany();
    expect(nextButton()).toBeEnabled();
    type(input('registration.step.company.field.country.label'), 'Singapore');
    expect(
      screen.queryByLabelText(caption('registration.step.company.field.province.label'))
    ).toBeNull();
    expect(nextButton()).toBeEnabled();
    type(input('registration.step.company.field.country.label'), 'Indonesia');
    expect(input('registration.step.company.field.province.label').value).toBe('');
    expect(nextButton()).toBeDisabled();
  });
});

// ─────────────────────────────────────────────────────────────────────────────
describe('External SR · contacts step', () => {
  const reachContacts = () => {
    start('external');
    fillCompany();
    fireEvent.click(nextButton());
    expect(stepHeading()).toBe(t('registration.step.contacts.title'));
  };

  it('one blank contact, Primary Contact role, Next disabled', () => {
    reachContacts();
    expect(inputs('registration.step.contacts.field.name.label')).toHaveLength(1);
    expect(input('registration.step.contacts.field.role.label').value).toBe('Primary Contact');
    expect(nextButton()).toBeDisabled();
    expect(screen.queryByRole('button', { name: t('registration.contacts.remove') })).toBeNull();
    expectNoValidationMessage();
  });

  it('a malformed email keeps Next disabled; a valid one releases it', () => {
    reachContacts();
    fillContact(0, 'Ana', 'not-an-email');
    expect(nextButton()).toBeDisabled();
    type(input('registration.step.contacts.field.email.label'), 'ana@uji.example');
    expect(nextButton()).toBeEnabled();
    expectNoValidationMessage();
  });

  it('up to three contacts; a blank one holds Next; removing keeps the others’ values', () => {
    reachContacts();
    fillContact(0, 'Ana');
    const add = () => screen.getByRole('button', { name: t('registration.contacts.add') });
    fireEvent.click(add());
    expect(inputs('registration.step.contacts.field.name.label')).toHaveLength(2);
    expect(nextButton()).toBeDisabled();
    fillContact(1, 'Budi');
    expect(nextButton()).toBeEnabled();
    fireEvent.click(add());
    fillContact(2, 'Citra');
    expect(inputs('registration.step.contacts.field.name.label')).toHaveLength(3);
    expect(screen.queryByRole('button', { name: t('registration.contacts.add') })).toBeNull();
    // Remove the middle one: Ana and Citra stay, in order.
    fireEvent.click(screen.getAllByRole('button', { name: t('registration.contacts.remove') })[1]);
    expect(inputs('registration.step.contacts.field.name.label').map((el) => el.value)).toEqual([
      'Ana',
      'Citra'
    ]);
    expect(screen.getByText(t('registration.contacts.label', { index: 2 }))).toBeInTheDocument();
    expect(nextButton()).toBeEnabled();
  });
});

// ─────────────────────────────────────────────────────────────────────────────
describe('External SR · the whole walk', () => {
  const walkToReview = () => {
    start('external');
    fillCompany();
    fireEvent.click(nextButton());
    fillContact(0, 'Ana');
    type(input('registration.step.contacts.field.role.label'), 'Finance');
    fireEvent.click(nextButton());

    // Categories & channel
    expect(stepHeading()).toBe(t('registration.title.categoriesChannel'));
    expect(nextButton()).toBeDisabled();
    expect(screen.getByRole('radio', { name: /WhatsApp/ })).toBeChecked();
    // Picked in this order; the review lists them in pick order — neither the
    // list's order nor alphabetical order, so either regression goes red.
    toggleCategory('registration.category.packaging');
    toggleCategory('registration.category.electronics');
    toggleCategory('registration.category.rawMaterials');
    toggleCategory('registration.category.rawMaterials');
    expect(nextButton()).toBeEnabled();
    fireEvent.click(screen.getByRole('radio', { name: /API Integration/ }));
    expect(screen.getByRole('radio', { name: /API Integration/ })).toBeChecked();
    expectNoValidationMessage();
    fireEvent.click(nextButton());

    // Documents & bank
    expect(stepHeading()).toBe(t('registration.title.documentsBank'));
    expect(nextButton()).toBeDisabled();
    const files = /** @type {NodeListOf<HTMLInputElement>} */ (
      document.querySelectorAll('input[type="file"]')
    );
    expect(files).toHaveLength(4);
    // NPWP has no expiry; NIB does.
    fireEvent.change(files[0], { target: { files: [new File(['x'], 'npwp.pdf')] } });
    expect(screen.getByText('↑ npwp.pdf')).toBeInTheDocument();
    expect(screen.queryByLabelText(t('registration.documents.expiry'))).toBeNull();
    fireEvent.change(files[1], { target: { files: [new File(['x'], 'nib.pdf')] } });
    type(screen.getByLabelText(t('registration.documents.expiry')), '2027-03-31');
    expect(screen.getAllByText(t('registration.documents.uploaded'))).toHaveLength(2);
    fillBank();
    expect(nextButton()).toBeEnabled();
    expectNoValidationMessage();
    fireEvent.click(nextButton());
    expect(stepHeading()).toBe(t('registration.step.review.title'));
  };

  it('Back carries every value across steps, in both directions', () => {
    walkToReview();
    fireEvent.click(backButton());
    expect(input('registration.step.bank.field.bankName.label').value).toBe('Mandiri');
    expect(screen.getByText('↑ nib.pdf')).toBeInTheDocument();
    expect(
      /** @type {HTMLInputElement} */ (screen.getByLabelText(t('registration.documents.expiry')))
        .value
    ).toBe('2027-03-31');
    fireEvent.click(backButton());
    expect(
      screen.getByRole('checkbox', { name: t('registration.category.packaging') })
    ).toBeChecked();
    expect(
      screen.getByRole('checkbox', { name: t('registration.category.rawMaterials') })
    ).not.toBeChecked();
    expect(screen.getByRole('radio', { name: /API Integration/ })).toBeChecked();
    fireEvent.click(backButton());
    expect(input('registration.step.contacts.field.name.label').value).toBe('Ana');
    expect(input('registration.step.contacts.field.role.label').value).toBe('Finance');
    fireEvent.click(backButton());
    expect(input('registration.step.company.field.legalName.label').value).toBe('PT Uji Coba');
    expect(input('registration.step.company.field.province.label').value).toBe('Jawa Barat');
    expect(backButton()).toBeDisabled();
    // …and forward again without re-entering anything.
    fireEvent.click(nextButton());
    fireEvent.click(nextButton());
    fireEvent.click(nextButton());
    fireEvent.click(nextButton());
    expect(stepHeading()).toBe(t('registration.step.review.title'));
  });

  it('the stepper goes back to an earlier step, never forward', () => {
    walkToReview();
    const steps = screen.getAllByRole('button', { name: /step|langkah/i });
    const first = steps.find((b) =>
      b.getAttribute('aria-label')?.includes(t('registration.step.company.title'))
    );
    fireEvent.click(/** @type {HTMLElement} */ (first));
    expect(stepHeading()).toBe(t('registration.step.company.title'));
    expect(input('registration.step.company.field.city.label').value).toBe('Bandung');
    // Every later step is now out of reach from the stepper.
    const later = screen
      .getAllByRole('button', { name: /step|langkah/i })
      .filter((b) => !b.getAttribute('aria-label')?.includes(t('registration.step.company.title')));
    expect(later).toHaveLength(4);
    for (const b of later) expect(b).toBeDisabled();
  });

  it('the review shows every entered value', () => {
    walkToReview();
    expect(reviewValue('registration.review.field.legalName')).toBe('PT Uji Coba');
    expect(reviewValue('registration.review.field.npwp')).toBe('NPWP-UJI-001');
    expect(reviewValue('registration.review.field.nib')).toBe('NIB-UJI-001');
    expect(reviewValue('registration.review.field.country')).toBe('Indonesia');
    expect(reviewValue('registration.review.field.province')).toBe('Jawa Barat');
    expect(reviewValue('registration.review.field.city')).toBe('Bandung');
    expect(reviewValue('registration.review.field.address')).toBe('Jl. Asia Afrika 1');
    expect(reviewValue('registration.review.field.website')).toBe('https://uji.example');
    expect(reviewValue('registration.review.field.name')).toBe('Ana');
    expect(reviewValue('registration.review.field.role')).toBe(t('registration.role.finance'));
    expect(reviewValue('registration.review.field.email')).toBe('k1@uji.example');
    expect(reviewValue('registration.review.field.whatsapp')).toBe('+62 812 000 000');
    // Phone was left blank, so its row is not rendered at all.
    expect(
      screen.queryByText(t('registration.review.field.phone'), { selector: 'span' })
    ).toBeNull();
    expect(reviewValue('registration.review.field.supplyCategories')).toBe(
      `${t('registration.category.packaging')}, ${t('registration.category.electronics')}`
    );
    expect(reviewValue('registration.review.field.channel')).toBe(
      t('registration.channel.api.label')
    );
    expect(reviewValue('registration.document.npwp')).toBe('npwp.pdf');
    expect(reviewValue('registration.document.nib')).toBe(
      `nib.pdf (${t('registration.review.expires', { date: '2027-03-31' })})`
    );
    expect(reviewValue('registration.document.halal')).toBe(t('registration.review.notUploaded'));
    expect(reviewValue('registration.review.field.bank')).toBe('Mandiri');
    expect(reviewValue('registration.review.field.accountNumber')).toBe('1300012345');
    expect(reviewValue('registration.review.field.accountHolder')).toBe('PT Uji Coba');
  });

  it('Submit waits for both agreements, then shows the end screen; Start again resets', () => {
    walkToReview();
    const boxes = screen.getAllByRole('checkbox');
    expect(boxes).toHaveLength(2);
    expect(submitButton()).toBeDisabled();
    fireEvent.click(boxes[0]);
    expect(submitButton()).toBeDisabled();
    fireEvent.click(boxes[1]);
    expect(submitButton()).toBeEnabled();
    fireEvent.click(boxes[0]);
    expect(submitButton()).toBeDisabled();
    expectNoValidationMessage();
    fireEvent.click(boxes[0]);
    fireEvent.click(submitButton());
    expect(screen.getByText(t('registration.success.headline'))).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: t('registration.submit') })).toBeNull();

    fireEvent.click(screen.getByRole('button', { name: t('registration.success.restart') }));
    expect(screen.getByText(t('registration.selector.title'))).toBeInTheDocument();
    expect(
      screen.getByRole('button', { name: t('registration.selector.continue') })
    ).toBeDisabled();
    // A fresh form: the next walk starts empty.
    fireEvent.click(screen.getByText(t('registration.type.external.label')));
    fireEvent.click(screen.getByRole('button', { name: t('registration.selector.continue') }));
    expect(input('registration.step.company.field.legalName.label').value).toBe('');
  });
});

// ─────────────────────────────────────────────────────────────────────────────
describe('changing the type resets the form', () => {
  it('Change registration type, and Cancel, both drop what was entered', () => {
    start('external');
    type(input('registration.step.company.field.legalName.label'), 'PT Dibuang');
    fireEvent.click(screen.getByRole('button', { name: t('registration.changeType') }));
    expect(screen.getByText(t('registration.selector.title'))).toBeInTheDocument();
    fireEvent.click(screen.getByText(t('registration.type.external.label')));
    fireEvent.click(screen.getByRole('button', { name: t('registration.selector.continue') }));
    expect(input('registration.step.company.field.legalName.label').value).toBe('');

    type(input('registration.step.company.field.legalName.label'), 'PT Dibuang Lagi');
    fireEvent.click(screen.getByRole('button', { name: t('wizard.cancel') }));
    expect(screen.getByText(t('registration.selector.title'))).toBeInTheDocument();
  });
});

// ─────────────────────────────────────────────────────────────────────────────
describe('Internal SR', () => {
  it('categories + reason, contacts, review, submit', () => {
    start('internal');
    expect(stepHeading()).toBe(t('registration.step.expansion.title'));
    expect(nextButton()).toBeDisabled();
    toggleCategory('registration.category.electronics');
    expect(nextButton()).toBeEnabled();
    type(input('registration.step.expansion.field.reason.label'), 'Butuh pemasok elektronik');
    expectNoValidationMessage();
    fireEvent.click(nextButton());

    expect(stepHeading()).toBe(t('registration.title.additionalContacts'));
    expect(nextButton()).toBeDisabled();
    fillContact(0, 'Dewi');
    type(inputs('registration.step.contacts.field.phone.label')[0], '+62 21 555 0000');
    fireEvent.click(nextButton());

    expect(stepHeading()).toBe(t('registration.step.review.title'));
    expect(reviewValue('registration.review.field.additionalCategories')).toBe(
      t('registration.category.electronics')
    );
    expect(reviewValue('registration.review.field.reason')).toBe('Butuh pemasok elektronik');
    expect(reviewValue('registration.review.field.name')).toBe('Dewi');
    // The Internal review lists no phone row, even when one was entered.
    expect(
      screen.queryByText(t('registration.review.field.phone'), { selector: 'span' })
    ).toBeNull();
    // The External sections are absent.
    expect(
      screen.queryByText(t('registration.review.field.legalName'), { selector: 'span' })
    ).toBeNull();

    fireEvent.click(backButton());
    fireEvent.click(backButton());
    expect(
      screen.getByRole('checkbox', { name: t('registration.category.electronics') })
    ).toBeChecked();
    expect(input('registration.step.expansion.field.reason.label').value).toBe(
      'Butuh pemasok elektronik'
    );
    fireEvent.click(nextButton());
    fireEvent.click(nextButton());

    const review =
      screen.getByText(t('registration.review.agreements.title')).closest('section') ??
      document.body;
    for (const box of within(/** @type {HTMLElement} */ (review)).getAllByRole('checkbox'))
      fireEvent.click(box);
    fireEvent.click(submitButton());
    expect(screen.getByText(t('registration.success.headline'))).toBeInTheDocument();
  });
});

// ─────────────────────────────────────────────────────────────────────────────
describe('KOL', () => {
  it('company, then bank; Submit enables but does not finish (pinned defect)', () => {
    start('kol');
    expect(stepHeading()).toBe(t('registration.step.company.title'));
    fillCompany();
    fireEvent.click(nextButton());
    expect(stepHeading()).toBe(t('registration.step.kolBank.title'));
    expect(submitButton()).toBeDisabled();
    fillBank();
    expect(submitButton()).toBeEnabled();
    fireEvent.click(submitButton());
    // Still on the bank step, no end screen, and no message says why.
    expect(stepHeading()).toBe(t('registration.step.kolBank.title'));
    expect(screen.queryByText(t('registration.success.headline'))).toBeNull();
    expectNoValidationMessage();
    // The values are still there.
    expect(input('registration.step.bank.field.accountNumber.label').value).toBe('1300012345');
    fireEvent.click(backButton());
    expect(input('registration.step.company.field.legalName.label').value).toBe('PT Uji Coba');
  });
});
