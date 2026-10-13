/** @import React from 'react' */
import { useTranslation } from 'react-i18next';
import { AlertTriangle } from 'lucide-react';
import Data from '@components/ui-v2/Data';
/** @import { HubSettingReadState } from '@services/transitions/hubSettingsStore' */

/**
 * The notices above the form, in order: the last refusal (named until the next
 * attempt), an unreadable settings store, and stored changes refused on read.
 * Each renders only when it has something to say.
 * @type {React.FC<{
 *   refusal: string | null;
 *   readState: HubSettingReadState;
 * }>}
 */
const PageNotices = ({ refusal, readState }) => {
  const { t } = useTranslation();
  return (
    <>
      {refusal && (
        <section
          role="alert"
          className="mb-5 rounded-lg border border-danger/30 bg-danger-soft p-4 flex gap-3"
          data-testid="admin-set-refusal"
        >
          <AlertTriangle size={16} className="text-danger shrink-0 mt-0.5" />
          <p className="text-sm text-text-primary">{refusal}</p>
        </section>
      )}

      {readState.unreadable && (
        <section
          className="mb-5 rounded-lg border border-warning/30 bg-warning-soft p-4 flex gap-3"
          data-testid="admin-set-store-unreadable"
        >
          <AlertTriangle size={16} className="text-warning-hover shrink-0 mt-0.5" />
          <div>
            <div className="text-sm font-medium text-text-primary">
              {t('adminSet.store.unreadableTitle')}
            </div>
            <p className="text-xs text-text-secondary mt-1">{t('adminSet.store.unreadableBody')}</p>
          </div>
        </section>
      )}
      {readState.rejected.length > 0 && (
        <section
          className="mb-5 rounded-lg border border-warning/30 bg-warning-soft p-4 flex gap-3"
          data-testid="admin-set-store-rejected"
        >
          <AlertTriangle size={16} className="text-warning-hover shrink-0 mt-0.5" />
          <div>
            <div className="text-sm font-medium text-text-primary">
              {t('adminSet.store.rejectedTitle')}
            </div>
            <p className="text-xs text-text-secondary mt-1">{t('adminSet.store.rejectedBody')}</p>
            <ul className="text-xs text-text-secondary mt-1 list-disc pl-4">
              {readState.rejected.map((r) => (
                <li key={`${r.row}-${r.reason}`}>
                  <Data>{r.row}</Data>: {r.reason}
                </li>
              ))}
            </ul>
          </div>
        </section>
      )}
    </>
  );
};

export default PageNotices;
