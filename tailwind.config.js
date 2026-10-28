// Paradise 0.2.0-alpha.6 stages 2, 4 and 5 (paradise-migration-plan.md). Every value is
// a var(...) reference to a Paradise token, never a resolved hex. Values with no
// Paradise match keep their original value and are marked "no match: decide".
//
// Colours go through color-mix so Tailwind's opacity modifiers
// (border-warning/30, bg-danger-soft/40 ...) keep working with var() colours.
/**
 * @param {string} token A Paradise colour token name, such as `--pds-color-text-primary`.
 * @returns {string}
 */
const pds = (token) => `color-mix(in srgb, var(${token}) calc(<alpha-value> * 100%), transparent)`;

/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        // Surfaces
        'bg-page': pds('--pds-color-background-canvas'),
        'bg-sidebar': pds('--pds-color-background-surface'),
        'bg-surface': pds('--pds-color-background-surface'),
        'bg-hover': pds('--pds-color-background-subtle'),
        'bg-active-soft': pds('--pds-color-brand-subtle'),
        // Text
        'text-primary': pds('--pds-color-text-primary'),
        'text-secondary': pds('--pds-color-text-secondary'),
        // Paradise has no tertiary text tone: merged into secondary (decision).
        'text-tertiary': pds('--pds-color-text-secondary'),
        // Brand
        'action': {
          DEFAULT: pds('--pds-color-action-primary'),
          hover: pds('--pds-color-action-primary-hover'),
          soft: pds('--pds-color-brand-subtle'),
          muted: pds('--pds-color-brand-primary'),
        },
        'teal': {
          DEFAULT: pds('--pds-color-accent'),
          hover: pds('--pds-color-brand-subtle-text'),
          soft: pds('--pds-color-brand-subtle'),
        },
        'navy': pds('--pds-color-text-primary'),
        // no match: decide (DP2-DATA-NAVY-01 data colour has no Paradise token)
        'data-navy': '#1E3A5F',
        'mid': pds('--pds-color-text-secondary'),
        // Status
        'success': { DEFAULT: pds('--pds-color-feedback-success'), soft: pds('--pds-color-feedback-success-background') },
        // DP2-WARN-01 split kept (review of MR !16): Paradise has no graphical
        // warning token, so DEFAULT (bars, dots, edges) stays bright amber and
        // hover (warning TEXT on light) is Paradise's dark warning ink.
        'warning': {
          DEFAULT: '#D97706',
          hover: pds('--pds-color-feedback-warning'),
          soft: pds('--pds-color-feedback-warning-background'),
        },
        'danger': { DEFAULT: pds('--pds-color-feedback-danger'), soft: pds('--pds-color-feedback-danger-background') },
        'info': { DEFAULT: pds('--pds-color-feedback-info'), soft: pds('--pds-color-feedback-info-background') },
        // Borders
        'border-subtle': pds('--pds-color-border-default'),
        'border-input': pds('--pds-color-border-strong'),
      },
      fontFamily: {
        sans: ['var(--font-body)'],
        // DP-3 data face (owner ruling 2026-10-28): JetBrains Mono, self-hosted in
        // src/styles/fonts/, then Paradise's system mono stack as the fallback.
        mono: ['"JetBrains Mono"', 'var(--font-mono)'],
      },
      fontSize: {
        xs: ['var(--fs-body-3)', { lineHeight: '1rem' }],
        sm: ['var(--fs-body-2)', { lineHeight: '1.25rem' }],
        base: ['var(--fs-body-1)', { lineHeight: '1.5rem' }],
        lg: ['var(--fs-heading-8)', { lineHeight: '1.75rem' }],
        xl: ['var(--fs-heading-7)', { lineHeight: '1.75rem' }],
        '2xl': ['var(--fs-heading-6)', { lineHeight: '2rem' }],
        // '3xl' (30px): no match: decide — Tailwind default kept.
        // title 30px: no match: decide — value kept.
        'title': ['30px', { lineHeight: '1.2', fontWeight: 'var(--fw-semibold)' }],
        'section': ['var(--fs-title-2)', { lineHeight: '1.4', fontWeight: 'var(--fw-semibold)' }],
        'kpi': ['var(--fs-display-3)', { lineHeight: '1.1', fontWeight: 'var(--fw-semibold)' }],
        'eyebrow': ['var(--fs-label-2)', { lineHeight: '1.4', letterSpacing: '0.08em', fontWeight: 'var(--fw-semibold)' }],
        'label': ['var(--fs-label-2)', { lineHeight: '1.3', letterSpacing: '0.06em', fontWeight: 'var(--fw-semibold)' }],
        // meta 13px: no match: decide — value kept.
        'meta': ['13px', { lineHeight: '1.4', fontWeight: 'var(--fw-regular)' }],
      },
      fontWeight: {
        light: 'var(--fw-light)',
        normal: 'var(--fw-regular)',
        medium: 'var(--fw-medium)',
        semibold: 'var(--fw-semibold)',
        bold: 'var(--fw-bold)',
        extrabold: 'var(--fw-extrabold)',
      },
      spacing: {
        '0.5': 'var(--space-1)',
        '1': 'var(--space-2)',
        '1.5': 'var(--space-3)',
        '2': 'var(--space-4)',
        '2.5': 'var(--space-5)',
        '3': 'var(--space-6)',
        '3.5': 'var(--space-7)',
        '4': 'var(--space-8)',
        '5': 'var(--space-10)',
        '6': 'var(--space-11)',
        '7': 'var(--space-12)',
        '8': 'var(--space-13)',
        '9': 'var(--space-14)',
        '10': 'var(--space-15)',
        '12': 'var(--space-16)',
        '14': 'var(--space-17)',
        '16': 'var(--space-18)',
        '20': 'var(--space-19)',
        '24': 'var(--space-20)',
        '28': 'var(--space-21)',
        '32': 'var(--space-22)',
        '36': 'var(--space-23)',
        '40': 'var(--space-24)',
      },
      borderRadius: {
        DEFAULT: 'var(--radius-base)',
        'sm': 'var(--radius-medium)',
        // md 10px: no match: decide (Paradise steps are 8px and 12px) — value kept.
        'md': '10px',
        'lg': 'var(--radius-xl)',
        'xl': 'var(--radius-xl)',
        '2xl': 'var(--radius-2xl)',
        '3xl': 'var(--radius-3xl)',
        'full': 'var(--radius-full)',
      },
      boxShadow: {
        DEFAULT: 'var(--shadow-light)',
        'sm': 'var(--shadow-light)',
        'md': 'var(--shadow-medium)',
        'lg': 'var(--shadow-medium)',
        '2xl': 'var(--shadow-strong)',
      },
      // Motion is a later run (stage 5 here is limited to shadows): unchanged.
      keyframes: {
        'panel-in': {
          from: { transform: 'translateX(100%)' },
          to: { transform: 'translateX(0)' },
        },
        'overlay-in': {
          from: { opacity: '0' },
          to: { opacity: '1' },
        },
      },
      animation: {
        'panel-in': 'panel-in 300ms cubic-bezier(0, 0, 0.2, 1)',
        'overlay-in': 'overlay-in 300ms cubic-bezier(0, 0, 0.2, 1)',
      },
    },
  },
  plugins: [],
}
