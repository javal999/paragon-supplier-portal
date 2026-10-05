/** @import { ActorAttribution } from '@lib/enforcement' */
/** @import React from 'react' */
import { createContext, useCallback, useContext, useState } from 'react';

/** @typedef {'buyer' | 'supplier'} PersonaType */

/**
 * The business roles this seat holds. Typed as bare strings here on purpose:
 * `SystemRoleId` lives in `services/transitions/businessRoles.ts`, and the role
 * VOCABULARY is a service concern while the SEAT is a context one. Validated at
 * the boundary (`identitySources.js`), resolved to atoms by `atomsFor`.
 */
/** @typedef {readonly string[]} SeatRoles */

/** Re-exported so a consumer needs one import for the whole seat. */
/** @typedef {import('@lib/enforcement').ActorAttribution} ActorAttribution */

/**
 * @typedef {object} CurrentIdentity
 * @property {PersonaType} personaType
 * @property {string | null} supplierId
 * @property {string | null} supplierName
 * @property {SeatRoles} businessRoles - ⚠️ **THE AUTHORISATION HALF OF THE SEAT, AND IT IS NOT `personaType`.**
 *   Before this arc a persona spanned all 48 buyer atoms unconditionally, so
 *   `requiredRole` discriminated at the TENANCY boundary and nowhere else —
 *   award, post-to-SAP and release-payment were one seat. The roles a seat
 *   holds are now carried here and injected into the command scope; the
 *   dispatcher resolves atoms from THESE, never from the persona.
 * @property {ActorAttribution} actor - ⚠️ **WHO IS ACTING — A DISCRIMINATED ATTRIBUTION, NEVER A BARE NAME**
 *   (C10 §6.2 / `ENF-NO-PERSON-IN-IDENTITY-01`). An act either names a person
 *   or says WHY IT CANNOT; there is deliberately no third shape and no
 *   nullable `person`, because a nullable one lets an absence pass every check
 *   a presence passes — which is how an anonymous unlock gets written down as
 *   an override.
 *
 *   **Today this is ALWAYS `UNATTRIBUTED: NO_PERSON_IN_SESSION`, and that is
 *   the honest value rather than a stub.** The portal contains no persons: the
 *   corporate IdP owns Paragon staff identity (F1) and supplier-side person
 *   identity is unprocured (D-ID-2, OPEN). What this field changes is that the
 *   SEAM now exists and is SESSION-SCOPED — a resolved actor injected here
 *   flows to the dispatcher with no further plumbing, which is what §63a's
 *   enforcement ceiling waits on: `rigour('OBSERVE') < rigour('BLOCK')`, so
 *   EVERY mode below `BLOCK` is a loosening and every loosening needs a named
 *   actor. The ramp opens the day this is `RESOLVED`, not before.
 *
 *   ⚠️ **IT LIVES IN CONTEXT, NOT IN A DISPATCH-TIME CLOSURE**, so a component
 *   can read it (`useCurrentIdentity()`). That is deliberate and is what keeps
 *   an identity panel an additive consumer rather than a rewrite.
 */

/**
 * @typedef {object} IdentitySource
 * @property {() => CurrentIdentity} load
 * @property {(next: CurrentIdentity) => void} save
 */

/**
 * @typedef {object} CurrentIdentityContextValue
 * @property {CurrentIdentity} identity
 * @property {(next: CurrentIdentity) => void} setIdentity
 */

const CurrentIdentityContext = createContext(
  /** @type {CurrentIdentityContextValue | undefined} */ (undefined)
);

/**
 * @typedef {object} ProviderProps
 * @property {IdentitySource} source
 * @property {React.ReactNode} children
 */

/** @type {React.FC<ProviderProps>} */
export const CurrentIdentityProvider = ({ source, children }) => {
  const [identity, setIdentityState] = useState(
    /** @type {() => CurrentIdentity} */ (() => source.load())
  );

  const setIdentity = useCallback(
    /** @param {CurrentIdentity} next */ (next) => {
      setIdentityState(next);
      source.save(next);
    },
    [source]
  );

  return (
    <CurrentIdentityContext.Provider value={{ identity, setIdentity }}>
      {children}
    </CurrentIdentityContext.Provider>
  );
};

/** @returns {CurrentIdentityContextValue} */
export const useCurrentIdentity = () => {
  const ctx = useContext(CurrentIdentityContext);
  if (!ctx) throw new Error('useCurrentIdentity must be used within CurrentIdentityProvider');
  return ctx;
};
