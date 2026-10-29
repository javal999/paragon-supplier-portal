/** @import React from 'react' */
import { useTranslation } from 'react-i18next';
import Data from '@components/ui-v2/Data';
/** @import { UploadResult } from '../const' */

/**
 * The spreadsheet upload's result: how many rows were saved, and a table of
 * the refused rows with the row number, material, period and reason.
 * @type {React.FC<{ upload: UploadResult }>}
 */
const UploadResultTable = ({ upload }) => {
  const { t } = useTranslation();
  return (
    <div className="mt-4 space-y-2" data-testid="fc-upload-result">
      <p className="text-sm text-text-primary" data-testid="fc-upload-saved">
        {t('fc.upload.saved', { count: upload.saved })}
      </p>
      {upload.refused.length > 0 && (
        <table className="w-full text-sm" data-testid="fc-upload-refused">
          <thead>
            <tr className="text-label text-text-tertiary uppercase">
              <th className="text-left py-1">{t('fc.upload.col.row')}</th>
              <th className="text-left py-1">{t('fc.col.material')}</th>
              <th className="text-left py-1">{t('fc.col.period')}</th>
              <th className="text-left py-1">{t('fc.upload.col.reason')}</th>
            </tr>
          </thead>
          <tbody>
            {upload.refused.map((r, i) => (
              <tr
                // eslint-disable-next-line react/no-array-index-key -- one upload's refused rows; the list is static once shown
                key={`${r.row}-${i}`}
                className="border-t border-border-subtle"
                data-testid={`fc-upload-refused-row-${r.row}`}
              >
                <td className="py-1.5">
                  <Data>{r.row}</Data>
                </td>
                <td className="py-1.5">
                  <Data>{r.materialCode || '—'}</Data>
                </td>
                <td className="py-1.5">
                  <Data>{r.period || '—'}</Data>
                </td>
                <td className="py-1.5 text-text-secondary">
                  {r.reason ? t(`fc.upload.reason.${r.reason}`) : r.message}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  );
};

export default UploadResultTable;
