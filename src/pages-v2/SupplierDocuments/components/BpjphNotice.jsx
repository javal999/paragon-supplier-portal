/** @import React from 'react' */
import { BookOpen, ExternalLink, FileText } from 'lucide-react';
import { useTranslation } from 'react-i18next';

/**
 * The BPJPH notice under the table: the halal-certification note, the
 * halal.go.id link, and the standalone "How to renew" entry that opens the
 * read-only walkthrough. `setLessonOpen` is page state because each row's
 * "Renew" action opens the same walkthrough. Moved out of
 * `SupplierDocuments.jsx` by the Phase 5 page split (no behaviour change).
 * @type {React.FC<{ setLessonOpen: (open: boolean) => void }>}
 */
const BpjphNotice = ({ setLessonOpen }) => {
  const { t } = useTranslation();
  return (
    <div className="bg-warning-soft border-l-2 border-warning rounded px-4 py-3 text-sm text-text-secondary flex items-start gap-2">
      <FileText size={14} className="text-warning-hover shrink-0 mt-0.5" />
      <div>
        <strong className="text-warning-hover">{t('supplierDocuments.bpjph.title')}</strong>{' '}
        {t('supplierDocuments.bpjph.body')}{' '}
        <a
          href="https://halal.go.id"
          target="_blank"
          rel="noopener noreferrer"
          className="text-warning-hover font-semibold inline-flex items-center gap-1 hover:underline"
        >
          halal.go.id
          <ExternalLink size={11} />
        </a>
        {/* Deadline-floor discoverable entry (I3.4): findable without being
            mid-action on a specific document. Opens the read-only walkthrough. */}
        <div className="mt-2">
          <button
            type="button"
            onClick={() => setLessonOpen(true)}
            className="inline-flex items-center gap-1.5 text-action-hover font-semibold hover:underline"
          >
            <BookOpen size={14} aria-hidden="true" />
            {t('learn.halalRenewal.entry')}
          </button>
        </div>
      </div>
    </div>
  );
};

export default BpjphNotice;
