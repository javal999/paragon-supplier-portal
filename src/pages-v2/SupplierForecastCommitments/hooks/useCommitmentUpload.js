import { useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
/** @import { ForecastCommitmentLine } from '@services/data/types' */
/** @import { ForecastRun, UploadResult } from '../const' */
import { parseWorkbook } from '@services/sdc';
import { validateCommitmentRows } from '@services/transitions/forecastRules';
import { parseCsv } from '@services/transitions/inventoryRules';
import { readFileText } from '../../inventory/inventoryDisplay';
import { lineRef } from '../../forecasts/forecastDisplay';

/**
 * The commitment spreadsheet upload (BR-06): read a .csv or .xlsx, check it
 * row by row against the stream's lines, send each accepted row as a commit or
 * an acknowledgement, and keep the saved count and the refused rows for the
 * result table. Also owns the hidden file input's ref, cleared after a run.
 * @param {ForecastRun} run  The forecast runner.
 * @param {ForecastCommitmentLine[]} streamLines  The active stream's lines.
 */
export function useCommitmentUpload(run, streamLines) {
  const { t } = useTranslation();
  const [upload, setUpload] = useState(/** @type {UploadResult | null} */ (null));
  const [fileError, setFileError] = useState(/** @type {string | null} */ (null));
  const [busy, setBusy] = useState(false);
  const fileRef = useRef(/** @type {HTMLInputElement | null} */ (null));

  /** @param {File | undefined} file */
  const handleFile = async (file) => {
    if (!file) return;
    setBusy(true);
    setFileError(null);
    setUpload(null);
    /** @type {Record<string, string>[]} */
    let rows;
    if (file.name.toLowerCase().endsWith('.xlsx')) {
      const book = await parseWorkbook(file);
      if (!book.ok) {
        setFileError(t('fc.upload.error.unreadable'));
        setBusy(false);
        return;
      }
      rows = [...book.rows];
    } else {
      rows = parseCsv(await readFileText(file)).rows;
    }
    if (rows.length === 0) {
      setFileError(t('fc.upload.error.empty'));
      setBusy(false);
      return;
    }
    const checked = validateCommitmentRows(rows, streamLines);
    /** @type {UploadResult} */
    const out = { saved: 0, refused: checked.refused.map((r) => ({ ...r })) };
    for (const draft of checked.accepted) {
      const res =
        draft.kind === 'acknowledge'
          ? await run({
              verb: 'acknowledge',
              line: lineRef(draft.line),
              ...(draft.note ? { note: draft.note } : {})
            })
          : await run({
              verb: 'commit',
              line: lineRef(draft.line),
              committedQty: draft.committedQty,
              commitmentDate: draft.commitmentDate,
              ...(draft.upsideQty !== undefined ? { upsideQty: draft.upsideQty } : {}),
              ...(draft.reason
                ? { reason: draft.reason, ...(draft.note ? { note: draft.note } : {}) }
                : {})
            });
      if (res.ok) out.saved += 1;
      else
        out.refused.push({
          row: draft.row,
          materialCode: draft.line.materialCode,
          period: draft.line.periodBucket,
          message: res.reason
        });
    }
    out.refused.sort((a, b) => a.row - b.row);
    setUpload(out);
    setBusy(false);
    if (fileRef.current) fileRef.current.value = '';
  };

  return { upload, fileError, busy, fileRef, handleFile };
}
