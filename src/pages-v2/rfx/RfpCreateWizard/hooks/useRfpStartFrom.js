import { useMemo, useState } from 'react';
import { rfxFamilyForCategory } from '@services/sourcing/rfxConfig';
import { rfpTemplateStore } from '@services/sourcing/rfxTemplates';
/** @import { RfpEvent } from '@services/sourcing/types' */
/** @import { StartOption } from '../../RfxStartFrom' */
import { rfxNow } from '../../rfxDisplay';
import { EMPTY } from '../const';
/** @import { Draft, SetDraft } from '../const' */
import { splitTerms, templateContentOf } from '../utils';

/**
 * The wizard's "start from" and "save as template" half (D2): the saved RFP
 * templates (re-read whenever one is saved or deleted), the options the start
 * picker offers (saved templates, then past events to copy), and the handlers
 * that apply one to the draft, delete a saved one, or save the draft as one.
 * @param {readonly RfpEvent[]} pastEvents  past events the buyer may copy
 * @param {Draft} draft  the current draft, saved as a template's content
 * @param {SetDraft} setDraft  the wizard's draft setter, which a start option replaces
 */
export const useRfpStartFrom = (pastEvents, draft, setDraft) => {
  const [storeVersion, setStoreVersion] = useState(0);
  const saved = useMemo(() => rfpTemplateStore.readState(), [storeVersion]);

  /** @type {StartOption[]} */
  const startOptions = [
    ...saved.templates.map((tpl) => ({
      key: `saved:${tpl.id}`,
      label: tpl.name,
      group: /** @type {const} */ ('saved')
    })),
    ...pastEvents.map((e) => ({
      key: `past:${e.id}`,
      label: `${e.eventNumber} · ${e.title}`,
      group: /** @type {const} */ ('past')
    }))
  ];

  /** @param {string} key */
  const applyStart = (key) => {
    const [kind, id] = [key.slice(0, key.indexOf(':')), key.slice(key.indexOf(':') + 1)];
    if (kind === 'saved') {
      const c = saved.templates.find((x) => x.id === id)?.content;
      if (!c) return;
      setDraft((d) => ({
        ...d,
        family: c.familyId,
        scope: c.scope,
        currency: c.currency,
        ...splitTerms(c.terms),
        questions: c.questions,
        customSections: c.customSections,
        pricing: c.pricing,
        confidential: c.confidential,
        confidentialityTerms: c.confidentialityTerms ?? '',
        termsText: c.termsText ?? '',
        documentRequests: c.documentRequests ?? []
      }));
    } else if (kind === 'past') {
      const e = pastEvents.find((x) => x.id === id);
      if (!e) return;
      // A COPY carries content and invitees; its dates are cleared (D2).
      setDraft({
        ...EMPTY,
        title: e.title,
        family: rfxFamilyForCategory(e.materialCategory)?.id ?? '',
        scope: e.scope,
        currency: e.currency,
        ...splitTerms(e.terms),
        questions: e.questions ?? [],
        customSections: e.customSections ?? [],
        pricing: e.pricing,
        invitedSupplierIds: e.invitees.map((i) => i.supplierId),
        attachments: e.attachments ?? [],
        confidential: !!e.confidentiality,
        confidentialityTerms: e.confidentiality?.terms ?? '',
        termsText: e.termsDocument?.text ?? '',
        termsFile: e.termsDocument?.attachment ? [e.termsDocument.attachment] : [],
        // NR-1 BR-11 — the buyer's requests copy; supplier documents never do.
        documentRequests: e.documentRequests ?? []
      });
    }
  };

  /** @param {string} key */
  const deleteSaved = (key) => {
    rfpTemplateStore.remove(key.slice('saved:'.length));
    setStoreVersion((v) => v + 1);
  };

  /** @param {string} name */
  const saveTemplate = (name) => {
    const res = rfpTemplateStore.save(name, templateContentOf(draft), rfxNow());
    setStoreVersion((v) => v + 1);
    return res;
  };

  return { saved, startOptions, applyStart, deleteSaved, saveTemplate };
};
