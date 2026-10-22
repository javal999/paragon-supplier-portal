import { useState } from 'react';
/** @import { QualificationRequiredDoc, SupplierDocument } from '@services/data/types' */
/** @import { DeclarationForm, PanelMode } from '../const' */
import {
  useSupplierDocumentDeclare,
  useSupplierDocumentSubmit
} from '@services/query/commandHooks';
import { useVerbAvailability } from '@hooks/useVerbAvailability';
import { useToast } from '@hooks/useToast';
import { useRefusalText } from '@hooks/useRefusalText';
import { useTranslation } from 'react-i18next';
import { CERT_TYPE_FOR_CATEGORY, EMPTY_FORM } from '../const';
import { declarationComplete } from '../utils';

/**
 * The declaration side panel's state and handlers: which mode it is in, the
 * document it answers (`activeDoc`, or none for a new declaration), the form,
 * whether the act was recorded, the two supply verbs and their availability,
 * and the open / close / record handlers. Called by the page, not by
 * `DeclarationPanel`, because the header action, each table row and the
 * qualification panel all open it, and the state stays owned by the page
 * component as before the Phase 5 split.
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
  // §82 — the two supply verbs. `_declare` mints a document nobody asked for;
  // `_submit` answers a slot the buyer opened, or re-answers after a refusal.
  const declare = useSupplierDocumentDeclare();
  const submit = useSupplierDocumentSubmit();
  // ⚠️ ONE NOTICE PER VERB, IN THAT VERB'S OWN SLOT (§76). The two supply verbs
  // are never co-reachable on one panel — `activeDoc` decides which is in play —
  // so the panel footer carries whichever applies and never both.
  const declareAvailability = useVerbAvailability('supplierdoc:upload');
  const submitAvailability = useVerbAvailability('supplierdoc:submit');
  const supplyAvailability = activeDoc ? submitAvailability : declareAvailability;
  const pending = declare.isPending || submit.isPending;

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

  const closePanel = () => {
    setPanelMode('closed');
    setActiveDoc(null);
    setUploaded(false);
    setForm(EMPTY_FORM);
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
    const result = activeDoc
      ? await submit.mutateAsync({ ...vars, docId: activeDoc.id })
      : await declare.mutateAsync({ ...vars, supplierId: supplierId ?? '' });
    if (result.status === 'failed') {
      toast({
        variant: 'error',
        title: t('supplierDocuments.toast.declineFailed.title'),
        description: refusalText(result.reason) ?? result.reason
      });
      return;
    }
    setUploaded(true);
    toast({
      variant: 'success',
      title: t('supplierDocuments.toast.declared.title'),
      description: t('supplierDocuments.toast.declared.desc')
    });
  };

  const panelTitle =
    panelMode === 'new'
      ? t('supplierDocuments.panel.newTitle')
      : panelMode === 'upload-existing' && activeDoc
        ? t('supplierDocuments.panel.declareTitle', {
            name: activeDoc.name.split('—')[0].trim()
          })
        : '';

  return {
    panelMode,
    activeDoc,
    uploaded,
    form,
    setForm,
    supplyAvailability,
    pending,
    panelTitle,
    openUploadFor,
    openNewUpload,
    openDeclareFor,
    closePanel,
    recordDeclaration
  };
}
