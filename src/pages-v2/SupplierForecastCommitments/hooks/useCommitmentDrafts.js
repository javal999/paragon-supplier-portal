import { useState } from 'react';
/** @import { ForecastCommitmentLine } from '@services/data/types' */
/** @import { RowDraft } from '../const' */
import { draftOf, readDraft } from '../utils';

/**
 * The commitment rows' drafts as typed on this page, keyed by line. A row
 * nobody has edited reads its saved draft or response (`draftOf`). Returns the
 * state, its setter (a landed commit drops its row's draft), and the per-row
 * read, patch and parse that the table and Submit all share.
 */
export function useCommitmentDrafts() {
  const [drafts, setDrafts] = useState(/** @type {Record<string, RowDraft>} */ ({}));

  /** @param {ForecastCommitmentLine} l */
  const rowDraft = (l) => drafts[l.key] ?? draftOf(l);
  /**
   * @param {ForecastCommitmentLine} l
   * @param {Partial<RowDraft>} patch
   */
  const setRow = (l, patch) =>
    setDrafts((prev) => ({ ...prev, [l.key]: { ...rowDraft(l), ...patch } }));
  /** @param {ForecastCommitmentLine} l */
  const readRow = (l) => readDraft(l, rowDraft(l));

  return { drafts, setDrafts, rowDraft, setRow, readRow };
}
