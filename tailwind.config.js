// Paradise 0.2.0-alpha.6 stage 2 (paradise-migration-plan.md). Every value is
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
        mono: ['var(--font-mono)'],
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
      borderRadius: {
        'sm': '6px',
        'md': '10px',
        'lg': '12px',
      },
      boxShadow: {
        'sm': '0 1px 2px rgba(13, 27, 42, 0.04)',
        'md': '0 4px 12px rgba(13, 27, 42, 0.08)',
      },
      // SidePanel's slide-over. These are ANIMATIONS rather than transitions
      // deliberately: a transition needs the element to persist so a class
      // change has a previous frame to interpolate from, and the panel now
      // UNMOUNTS when closed (see `SidePanel.tsx`'s contract note). A keyframe
      // plays on mount and needs no previous frame, so the enter survives the
      // contract change. There is no exit pair — the panel is gone by then.
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
