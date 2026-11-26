import { useState } from 'react';
/** @import { QualificationRequiredDoc, SupplierDocument } from '@services/data/types' */
/** @import { CoaForm, DeclarationForm, PanelMode } from '../const' */
import {
  useSupplierDocumentAnswerCoa,
  useSupplierDocumentDeclare,
  useSupplierDocumentRenew,
  useSupplierDocumentSubmit
} from '@services/query/commandHooks';
import { useVerbAvailability } from '@hooks/useVerbAvailability';
import { useToast } from '@hooks/useToast';
import { useRefusalText } from '@hooks/useRefusalText';
import { useTranslation } from 'react-i18next';
import { CERT_TYPE_FOR_CATEGORY, EMPTY_COA_FORM, EMPTY_FORM } from '../const';
import { coaComplete, declarationComplete, renewalFormFrom } from '../utils';

/**
 * The declaration side panel's state and handlers: which mode it is in, the
 * document it answers (`activeDoc`, or none for a new declaration), the two
 * forms (certificate and COA), whether the act was recorded, the supply verbs
 * and their availability, and the open / close / record handlers. Called by the
 * page, not by `DeclarationPanel`, because the header action, each table row
 * and the qualification panel all open it, and the state stays owned by the
 * page component as before the Phase 5 split.
 *
 * UCX-P5 (BL-366) added two modes: `answer-coa` (a COA request's own form) and
 * `renew` (the declaration filled from the expiring record — UCX-F21).
 * @param {string | null | undefined} supplierId  The seat's supplier; a new
 *   declaration is filed under it.
 */
export function useDeclarationPanel(supplierId) {
  const { t } = useTranslation();
  const refusalText = useRefusalText();
  const { toast } = useToast();
  const [panelMode, setPanelMode] = useState(/** @type {PanelMode} */ ('closed'));
  const [activeDoc, setActiveDoc] = useState(/** @type {SupplierDocument | null} */ (null));
  const [uploaded, setUploaded] = useState(false);
  const [form, setForm] = useState(/** @type {DeclarationForm} */ (EMPTY_FORM));
  // UCX-P5 — the COA form is its own state: different fields, optional scope.
  const [coaForm, setCoaForm] = useState(/** @type {CoaForm} */ (EMPTY_COA_FORM));
  // §82 — the two supply verbs. `_declare` mints a document nobody asked for;
  // `_submit` answers a slot the buyer opened, or re-answers after a refusal.
  // UCX-P5 — two more: the COA answer (same `_submit` atom) and the renewal
  // (the `_declare` atom, acting on the expiring record itself).
  const declare = useSupplierDocumentDeclare();
  const submit = useSupplierDocumentSubmit();
  const answerCoa = useSupplierDocumentAnswerCoa();
  const renew = useSupplierDocumentRenew();
  // ⚠️ ONE NOTICE PER VERB, IN THAT VERB'S OWN SLOT (§76). The supply verbs are
  // never co-reachable on one panel — the MODE decides which is in play — so
  // the panel footer carries whichever applies and never more than one.
  const declareAvailability = useVerbAvailability('supplierdoc:upload');
  const submitAvailability = useVerbAvailability('supplierdoc:submit');
  const supplyAvailability =
    panelMode === 'answer-coa'
      ? submitAvailability
      : panelMode === 'renew'
        ? declareAvailability
        : activeDoc
          ? submitAvailability
          : declareAvailability;
  const pending = declare.isPending || submit.isPending || answerCoa.isPending || renew.isPending;

  /** @param {SupplierDocument} doc */
  const openUploadFor = (doc) => {
    setActiveDoc(doc);
    setUploaded(false);
    // Pre-fill from what the document already carries. A re-declaration after a
    // refusal is a CORRECTION, and making the supplier retype five correct
    // fields to fix one wrong one is how a remedy becomes a deterrent.
    setForm(
      doc.declaration
        ? {
            certType: doc.declaration.certType,
            certNumber: doc.declaration.certNumber,
            issuer: doc.declaration.issuer,
            issuedOn: doc.declaration.issuedOn,
            expiresOn: doc.declaration.expiresOn ?? '',
            scopeText: doc.declaration.scopeText
          }
        : EMPTY_FORM
    );
    setPanelMode('upload-existing');
  };

  const openNewUpload = () => {
    setActiveDoc(null);
    setUploaded(false);
    setForm(EMPTY_FORM);
    setPanelMode('new');
  };

  // Material G1 — the "declare" link beside a missing qualification document
  // opens the same declaration form, with the certificate type that files the
  // document under the required category.
  /** @param {QualificationRequiredDoc} req */
  const openDeclareFor = (req) => {
    openNewUpload();
    setForm({
      ...EMPTY_FORM,
      certType: req.certType ?? CERT_TYPE_FOR_CATEGORY[req.category] ?? 'OTHER'
    });
  };

  /**
   * UCX-P5 · UCX-F14/UCX-D23 — answer a COA request with the COA form. The
   * batch comes from the request (`requestBatch`), never from parsing the ask's
   * prose.
   * @param {SupplierDocument} doc
   */
  const openAnswerFor = (doc) => {
    setActiveDoc(doc);
    setUploaded(false);
    setCoaForm({ ...EMPTY_COA_FORM, batch: doc.requestBatch ?? '' });
    setPanelMode('answer-coa');
  };

  /**
   * UCX-P5 · UCX-F21 — renew from the record: the declaration opens filled from
   * the expiring document, not behind a guide that cannot be submitted.
   * @param {SupplierDocument} doc
   */
  const openRenewFor = (doc) => {
    setActiveDoc(doc);
    setUploaded(false);
    setForm(renewalFormFrom(doc));
    setPanelMode('renew');
  };

  const closePanel = () => {
    setPanelMode('closed');
    setActiveDoc(null);
    setUploaded(false);
    setForm(EMPTY_FORM);
    setCoaForm(EMPTY_COA_FORM);
  };

  /**
   * ⚠️ **THIS FUNCTION USED TO SET A BOOLEAN AND FIRE A SUCCESS TOAST.** No
   * dispatch, no store, no file — while the panel it sat behind advertised
   * "PDF, JPG, PNG · Max 20 MB" and a drop zone whose `onDrop` called it and
   * never read `e.dataTransfer`. Three entry points reached it, and the toast
   * said "Document uploaded". §82 · `docs/findings.md`.
   *
   * ⚠️ **AND THE OUTCOME IS READ FROM THE RESULT, NOT ASSUMED FROM THE CALL.**
   * `CommandResult.status` can be `failed`, and a refusal that renders as a
   * success is the same defect one layer down.
   */
  const recordDeclaration = async () => {
    /** @param {import('@services/data/types').CommandResult} result */
    const failed = (result) => {
      if (result.status !== 'failed') return false;
      toast({
        variant: 'error',
        title: t('supplierDocuments.toast.declineFailed.title'),
        description: refusalText(result.reason) ?? result.reason
      });
      return true;
    };

    if (panelMode === 'answer-coa') {
      if (!activeDoc || !coaComplete(coaForm)) return;
      const result = await answerCoa.mutateAsync({
        docId: activeDoc.id,
        batch: coaForm.batch.trim(),
        coaNumber: coaForm.coaNumber.trim(),
        issuer: coaForm.issuer.trim(),
        issuedOn: coaForm.issuedOn,
        scopeText: coaForm.scopeText.trim()
      });
      if (failed(result)) return;
      setUploaded(true);
      toast({
        variant: 'success',
        title: t('supplierDocuments.toast.declared.title'),
        description: t('supplierDocuments.toast.declared.desc')
      });
      return;
    }

    if (!declarationComplete(form)) return;
    const vars = {
      certType: form.certType,
      certNumber: form.certNumber.trim(),
      issuer: form.issuer.trim(),
      issuedOn: form.issuedOn,
      // Blank means the certificate HAS no expiry (BPJPH, GR 42/2024) — `null`
      // is the answer, never a guessed date and never today.
      expiresOn: form.expiresOn === '' ? null : form.expiresOn,
      scopeText: form.scopeText.trim()
    };
    const result =
      panelMode === 'renew'
        ? activeDoc
          ? await renew.mutateAsync({ ...vars, docId: activeDoc.id })
          : undefined
        : activeDoc
          ? await submit.mutateAsync({ ...vars, docId: activeDoc.id })
          : await declare.mutateAsync({ ...vars, supplierId: supplierId ?? '' });
    if (!result || failed(result)) return;
    setUploaded(true);
    toast({
      variant: 'success',
      title: t('supplierDocuments.toast.declared.title'),
      description: t('supplierDocuments.toast.declared.desc')
    });
  };

  const docLabel = activeDoc ? activeDoc.name.split('—')[0].trim() : '';
  const panelTitle =
    panelMode === 'new'
      ? t('supplierDocuments.panel.newTitle')
      : panelMode === 'answer-coa'
        ? t('supplierDocuments.panel.answerTitle')
        : panelMode === 'renew' && activeDoc
          ? t('supplierDocuments.panel.renewTitle', { name: docLabel })
          : panelMode === 'upload-existing' && activeDoc
            ? t('supplierDocuments.panel.declareTitle', {
                name: docLabel
              })
            : '';

  return {
    panelMode,
    activeDoc,
    uploaded,
    form,
    setForm,
    coaForm,
    setCoaForm,
    supplyAvailability,
    pending,
    panelTitle,
    openUploadFor,
    openNewUpload,
    openDeclareFor,
    openAnswerFor,
    openRenewFor,
    closePanel,
    recordDeclaration
  };
}
