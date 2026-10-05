/** @import React from 'react' */
/** @import { ReactNode } from 'react' */
import { createContext, useContext } from 'react';
/** @import { CountryCode } from '@data/communicationProfiles' */
import { COUNTRY_PROFILES, CHANNEL_CONFIG, MESSAGE_TEMPLATES } from '@data/communicationProfiles';

/** @typedef {typeof COUNTRY_PROFILES[CountryCode]} CountryProfile */
/** @typedef {typeof CHANNEL_CONFIG[keyof typeof CHANNEL_CONFIG]} ChannelConfig */

/**
 * @typedef {object} AdaptiveContextType
 * @property {(country: string) => CountryProfile} getSupplierProfile
 * @property {(channel: string) => ChannelConfig} getChannelConfig
 * @property {(type: keyof typeof MESSAGE_TEMPLATES, language: string, ...args: string[]) => string} getMessageTemplate
 * @property {(amount: number, currency: string) => string} formatCurrency
 * @property {(date: string, country: string) => string} formatDate
 * @property {(country: string) => boolean} isBusinessHours
 * @property {(country: string) => string} getLocalTime
 * @property {(country: string, category: string) => string[]} getComplianceRequirements
 */

const AdaptiveContext = createContext(/** @type {AdaptiveContextType | undefined} */ (undefined));

const FALLBACK_PROFILE = COUNTRY_PROFILES['SG'];

// ─── Helper: get UTC offset in minutes from IANA zone ─────────────────────────
// Uses Intl.DateTimeFormat — works in all modern browsers without a timezone lib
/**
 * @param {string} timezone
 * @returns {string}
 */
function getLocalTimeStr(timezone) {
  try {
    return new Date().toLocaleTimeString('en-US', {
      timeZone: timezone,
      hour: '2-digit',
      minute: '2-digit',
      hour12: false
    });
  } catch {
    return '--:--';
  }
}

/**
 * @param {string} timezone
 * @returns {{ h: number; m: number }}
 */
function getLocalDateObj(timezone) {
  try {
    const parts = new Intl.DateTimeFormat('en-US', {
      timeZone: timezone,
      hour: 'numeric',
      minute: 'numeric',
      hour12: false
    }).formatToParts(new Date());
    const h = parseInt(parts.find((p) => p.type === 'hour')?.value ?? '0', 10);
    const m = parseInt(parts.find((p) => p.type === 'minute')?.value ?? '0', 10);
    return { h, m };
  } catch {
    return { h: 0, m: 0 };
  }
}

/**
 * @param {string} t
 * @returns {number}
 */
function timeToMins(t) {
  const [hh, mm] = t.split(':').map(Number);
  return hh * 60 + mm;
}

// ─── Currency Formatter ───────────────────────────────────────────────────────
/**
 * @param {number} amount
 * @param {string} currency
 * @returns {string}
 */
function formatCurrency(amount, currency) {
  switch (currency) {
    case 'IDR':
      return 'Rp ' + amount.toLocaleString('id-ID');
    case 'EUR':
      return '€' + amount.toLocaleString('de-DE', { minimumFractionDigits: 2 });
    case 'USD':
      return '$' + amount.toLocaleString('en-US', { minimumFractionDigits: 2 });
    case 'CNY':
      return '¥' + amount.toLocaleString('zh-CN', { minimumFractionDigits: 2 });
    case 'MYR':
      return 'RM ' + amount.toLocaleString('en-MY', { minimumFractionDigits: 2 });
    case 'SGD':
      return 'S$' + amount.toLocaleString('en-SG', { minimumFractionDigits: 2 });
    case 'SAR':
      return '﷼ ' + amount.toLocaleString('ar-SA', { minimumFractionDigits: 2 });
    case 'JPY':
      return '¥' + amount.toLocaleString('ja-JP');
    case 'BRL':
      return 'R$ ' + amount.toLocaleString('pt-BR', { minimumFractionDigits: 2 });
    case 'INR':
      return '₹' + amount.toLocaleString('en-IN', { minimumFractionDigits: 2 });
    default:
      return currency + ' ' + amount.toLocaleString('en-US', { minimumFractionDigits: 2 });
  }
}

// ─── Date Formatter ───────────────────────────────────────────────────────────
/**
 * @param {string} date
 * @param {string} country
 * @returns {string}
 */
function formatDate(date, country) {
  const profile = COUNTRY_PROFILES[/** @type {CountryCode} */ (country)] ?? FALLBACK_PROFILE;
  const d = new Date(date);
  if (isNaN(d.getTime())) return date;
  const dd = String(d.getDate()).padStart(2, '0');
  const mm = String(d.getMonth() + 1).padStart(2, '0');
  const yyyy = String(d.getFullYear());
  switch (profile.dateFormat) {
    case 'MM/DD/YYYY':
      return `${mm}/${dd}/${yyyy}`;
    case 'YYYY/MM/DD':
      return `${yyyy}/${mm}/${dd}`;
    case 'DD.MM.YYYY':
      return `${dd}.${mm}.${yyyy}`;
    default:
      return `${dd}/${mm}/${yyyy}`;
  }
}

// ─── Compliance Requirements ──────────────────────────────────────────────────
//
// ── CP-3 · H2 — ⚠️ THE SECOND PROSE PARSE IS RETIRED HERE ────────────────────
// This function carried the twin of `inferHalal`, and it was the one nobody had
// found:
//
//   const isHalal = cat.includes('halal') || cat.includes('food')
//                || cat.includes('raw')   || cat.includes('packaging');
//
// It decided WHICH HALAL CERTIFICATE A SUPPLIER IS TOLD TO PROVIDE by substring-
// matching a category label — **an unlicensed second opinion on exactly the
// question `D-COMP-HALAL-1` leaves open**, and it answered `true` FOR A PET
// BOTTLE. Zero consumers today, which is why it survived review; but it is
// EXPOSED ON THE CONTEXT VALUE (`getComplianceRequirements`) and reachable by any
// caller, so "dormant" is a property of today's callers, not of the code.
//
// ── RESHAPED, NOT RETIRED, AND THE ARGUMENT IS WORTH THE FOUR LINES ─────────
// Deleting the halal entries outright was the other candidate. It was rejected:
// it would have removed a TRUE statement along with a false discrimination, and
// left the Indonesian list quieter than the truth — the *tidier-than-true*
// direction this register keeps finding.
//
// The false part was never "Indonesia has a halal certification regime". It was
// **the per-category discrimination**: which materials fall inside it is a
// compliance ruling nobody has made, and a substring is not it. So the
// discrimination goes and the country-level fact stays — which is the shape
// `SA` in this same function has always had (`GCC Halal Certificate
// (mandatory)`, unconditional). Three countries, three shapes, and one of them
// was already right.
//
// ⚠️ WHAT THIS FUNCTION MAY AND MAY NOT SAY, stated so it is not re-litigated:
// it may say a supplier operating in ID/MY faces a halal certification regime.
// It may NOT say a given MATERIAL needs a halal check — that is `halalOf`
// (`services/sdc/halal.ts`), it is keyed on a material code, and this function
// is not given one. Reshaping it to "read the master" would have required
// inventing a category→material join, which is the fabrication the whole arc
// refuses. **NO BEHAVIOUR CHANGES TODAY** — the function still has zero
// consumers; what changes is that a caller who arrives tomorrow is not handed a
// regulatory determination derived from a label.
/**
 * @param {string} country
 * @param {string} category
 * @returns {string[]}
 */
function getComplianceRequirements(country, category) {
  /** @type {string[]} */
  const reqs = [];
  const cat = category.toLowerCase();

  if (country === 'ID') {
    reqs.push('BPOM Registration');
    reqs.push('BPJPH Halal Certificate (MUI)');
    reqs.push('NPWP (Tax ID)', 'SNI Compliance');
  }
  if (country === 'MY') {
    reqs.push('SST Registration');
    reqs.push('JAKIM Halal Certificate');
    reqs.push('MeSTI Certification');
  }
  if (country === 'DE' || country === 'FR') {
    reqs.push('EU Cosmetics Regulation (EC 1223/2009)');
    reqs.push('REACH Compliance (SDS required)');
    if (cat.includes('fragrance')) reqs.push('IFRA Standards Certificate');
    reqs.push('ISO 9001');
  }
  if (country === 'US') {
    reqs.push('FDA Registration', 'cGMP Certificate', 'Certificate of Analysis (CoA)');
    if (cat.includes('raw') || cat.includes('active')) reqs.push('Safety Data Sheet (SDS)');
  }
  if (country === 'CN') {
    reqs.push('CIQ Certificate', 'Unified Social Credit Code');
    if (cat.includes('active') || cat.includes('cosmetic')) reqs.push('NMPA Approval');
    reqs.push('GB Standards Compliance');
  }
  if (country === 'SA') {
    reqs.push('SFDA Registration', 'SASO Certificate');
    reqs.push('GCC Halal Certificate (mandatory)');
  }
  if (country === 'JP') {
    reqs.push('PMDA Registration', 'JIS Standards', 'Qualified Invoice Number (T-number)');
  }
  if (country === 'IN') {
    reqs.push('CDSCO License', 'GSTIN', 'BIS Certificate');
  }
  if (reqs.length === 0) {
    reqs.push('ISO 9001', 'Country-specific import documentation');
  }
  return reqs;
}

// ─── Provider ─────────────────────────────────────────────────────────────────
/** @type {React.FC<{ children: ReactNode }>} */
export const AdaptiveProvider = ({ children }) => {
  /** @type {AdaptiveContextType} */
  const value = {
    /** @param {string} country */
    getSupplierProfile: (country) =>
      /** @type {CountryProfile} */ (
        COUNTRY_PROFILES[/** @type {CountryCode} */ (country)] ?? FALLBACK_PROFILE
      ),

    /** @param {string} channel */
    getChannelConfig: (channel) =>
      /** @type {ChannelConfig} */ (
        CHANNEL_CONFIG[/** @type {keyof typeof CHANNEL_CONFIG} */ (channel)] ?? CHANNEL_CONFIG.email
      ),

    getMessageTemplate: (type, language, ...args) => {
      const templates = /** @type {Record<string, (...a: string[]) => string>} */ (
        MESSAGE_TEMPLATES[type]
      );
      const fn = templates[language] ?? templates['en'];
      return fn ? fn(...args) : '';
    },

    formatCurrency,
    formatDate,

    /** @param {string} country */
    isBusinessHours: (country) => {
      const profile = COUNTRY_PROFILES[/** @type {CountryCode} */ (country)] ?? FALLBACK_PROFILE;
      const { h, m } = getLocalDateObj(profile.timezone);
      const current = h * 60 + m;
      return (
        current >= timeToMins(profile.businessHours.start) &&
        current < timeToMins(profile.businessHours.end)
      );
    },

    /** @param {string} country */
    getLocalTime: (country) => {
      const profile = COUNTRY_PROFILES[/** @type {CountryCode} */ (country)] ?? FALLBACK_PROFILE;
      return getLocalTimeStr(profile.timezone);
    },

    getComplianceRequirements
  };

  return <AdaptiveContext.Provider value={value}>{children}</AdaptiveContext.Provider>;
};

/** @returns {AdaptiveContextType} */
export const useAdaptive = () => {
  const ctx = useContext(AdaptiveContext);
  if (!ctx) throw new Error('useAdaptive must be used inside AdaptiveProvider');
  return ctx;
};
