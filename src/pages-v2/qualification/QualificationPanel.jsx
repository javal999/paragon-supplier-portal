/** @import React from 'react' */
import { useTranslation } from 'react-i18next';
import { Award, Clock } from 'lucide-react';
import StatusPill from '@components/ui-v2/StatusPill';
import Button from '@components/ui-v2/Button';
import Data from '@components/ui-v2/Data';
import Table from '@components/ui-v2/Table';
import TableHeader, { TableHeaderCell } from '@components/ui-v2/TableHeader';
import TableRow from '@components/ui-v2/TableRow';
import TableCell from '@components/ui-v2/TableCell';
import { useCategoryLabel } from '@hooks/useCategoryLabel';
import { certTypeLabelKey } from '@lib/complianceView';
import { formatDate } from '@lib/format';
/** @import { QualificationLevel, QualificationRequiredDoc, SupplierDocumentCategory, VendorQualification } from '@services/data/types' */

// ─────────────────────────────────────────────────────────────────────────────
// A VENDOR'S QUALIFICATION — Material G1 (MR-10 BR-01 to BR-03, AC-01, AC-06).
//
// One panel, two readers. The supplier sees its level, what the next level
// still needs (with a way to declare each document), and the documents about
// to drop it. The buyer sees the same plus the history, replayed from the
// documents and the lists (plan AD-2). Everything shown is computed at read by
// `getVendorQualifications`; this panel decides nothing.
// ─────────────────────────────────────────────────────────────────────────────

/** @type {Record<QualificationLevel, 'neutral' | 'info' | 'success'>} */
export const LEVEL_VARIANT = {
  registered: 'neutral',
  approved: 'info',
  preferred: 'success'
};

/** Categories a supplier can declare from the documents page: the declaration
 * @type {readonly SupplierDocumentCategory[]}
 *  form files a certificate under the category its certificate type implies. */
const DECLARABLE = ['Halal Compliance', 'BPOM Regulatory', 'Quality', 'Other'];

/**
 * @param {QualificationRequiredDoc} req
 * @returns {boolean}
 */
export const canDeclare = (req) => DECLARABLE.includes(req.category);

/**
 * The level pill, labelled.
 * @type {React.FC<{ level: QualificationLevel; testId?: string }>}
 */
export const QualificationLevelPill = ({ level, testId }) => {
  const { t } = useTranslation();
  return (
    <span data-testid={testId}>
      <StatusPill variant={LEVEL_VARIANT[level]}>{t(`qualification.level.${level}`)}</StatusPill>
    </span>
  );
};

/**
 * The placeholder label (MAT-D15, MAT-R14).
 * @type {React.FC<{ className?: string }>}
 */
export const PlaceholderRulesLabel = ({ className = '' }) => {
  const { t } = useTranslation();
  return (
    <span
      data-testid="qualification-placeholder"
      className={`inline-flex items-center gap-1.5 text-label font-semibold uppercase tracking-wider text-warning-hover ${className}`}
    >
      <span aria-hidden="true" className="h-1.5 w-1.5 rounded-full border border-warning" />
      {t('qualification.placeholder')}
    </span>
  );
};

/**
 * One required document as a line: its category, its certificate type, and the list's wording.
 * @type {React.FC<{ req: QualificationRequiredDoc }>}
 */
export const RequirementText = ({ req }) => {
  const { t } = useTranslation();
  const categoryLabel = useCategoryLabel();
  return (
    <span>
      <span className="font-medium text-text-primary">{categoryLabel(req.category)}</span>
      {req.certType ? (
        <span className="text-text-secondary"> · {t(certTypeLabelKey(req.certType))}</span>
      ) : null}
      {/* i18n-defer: the requirement as Procurement and Quality wrote it is data */}
      <span className="text-text-tertiary"> — {req.label}</span>
    </span>
  );
};

/**
 * `reader`:  Supplier: offers a way to declare each missing document. Buyer: shows the history.
 *
 * @typedef {{
 *     readonly row: VendorQualification;
 *     readonly reader: 'supplier' | 'buyer';
 *     readonly onDeclare?: (req: QualificationRequiredDoc) => void;
 *   }} Props
 */

/** @type {React.FC<Props>} */
const QualificationPanel = ({ row, reader, onDeclare }) => {
  const { t } = useTranslation();
  /** @type {'approved' | 'preferred' | null} */
  const next =
    row.level === 'registered' ? 'approved' : row.level === 'approved' ? 'preferred' : null;
  const stillNeeded = next === null ? [] : row.missingFor[next];

  return (
    <section
      className="mb-5 rounded-lg border border-border-subtle bg-white p-5 shadow-sm"
      data-testid="qualification-panel"
    >
      <div className="flex flex-wrap items-center gap-3">
        <Award size={16} className="text-teal shrink-0" />
        <h2 className="text-section text-text-primary">{t('qualification.panel.title')}</h2>
        <QualificationLevelPill level={row.level} testId="qualification-level" />
        {row.placeholderRules ? <PlaceholderRulesLabel /> : null}
      </div>
      <p className="text-xs text-text-secondary mt-1">{t('qualification.panel.computed')}</p>

      {next === null ? (
        <p className="text-sm text-text-secondary mt-3" data-testid="qualification-complete">
          {t('qualification.panel.complete')}
        </p>
      ) : (
        <div className="mt-3" data-testid="qualification-missing">
          <div className="text-sm font-medium text-text-primary">
            {t('qualification.panel.stillNeeded', { level: t(`qualification.level.${next}`) })}
          </div>
          <ul className="mt-2 flex flex-col gap-2">
            {stillNeeded.map((req) => (
              <li
                key={`${req.category}|${req.certType ?? ''}`}
                className="flex flex-wrap items-center justify-between gap-2 text-sm border-b border-border-subtle pb-2"
                data-testid={`qualification-missing-${req.category}`}
              >
                <RequirementText req={req} />
                {reader === 'supplier' && canDeclare(req) && onDeclare ? (
                  <Button type="button" variant="secondary" onClick={() => onDeclare(req)}>
                    {t('qualification.panel.declare')}
                  </Button>
                ) : null}
                {reader === 'supplier' && !canDeclare(req) ? (
                  <span className="text-xs text-text-tertiary">
                    {t('qualification.panel.sendToProcurement')}
                  </span>
                ) : null}
              </li>
            ))}
          </ul>
        </div>
      )}

      {row.expiringSoon.length > 0 ? (
        <div className="mt-4" data-testid="qualification-expiring">
          <div className="flex items-center gap-2 text-sm font-medium text-warning-hover">
            <Clock size={14} />
            {t('qualification.panel.expiring', { level: t(`qualification.level.${row.level}`) })}
          </div>
          <ul className="mt-2 flex flex-col gap-1">
            {row.expiringSoon.map((d) => (
              <li key={d.documentId} className="text-sm text-text-secondary">
                {/* i18n-defer: a document's name is data */}
                {d.name} · {t('qualification.panel.expiresOn')}{' '}
                <Data>{formatDate(d.expiryDate)}</Data>
              </li>
            ))}
          </ul>
        </div>
      ) : null}

      {reader === 'buyer' ? <QualificationHistory row={row} /> : null}
    </section>
  );
};

/**
 * The replayed level changes, newest first (MR-10 flow step 2, AC-01).
 * @type {React.FC<{ row: VendorQualification }>}
 */
const QualificationHistory = ({ row }) => {
  const { t } = useTranslation();
  const changes = [...row.history].reverse();
  return (
    <div className="mt-5" data-testid="qualification-history">
      <h3 className="text-sm font-semibold text-text-primary">
        {t('qualification.history.title')}
      </h3>
      <p className="text-xs text-text-tertiary mb-2">{t('qualification.history.replayed')}</p>
      {changes.length === 0 ? (
        <p className="text-sm text-text-tertiary" data-testid="qualification-history-empty">
          {t('qualification.history.empty')}
        </p>
      ) : (
        <HistoryTable changes={changes} />
      )}
    </div>
  );
};

/** @type {React.FC<{ changes: VendorQualification['history'] }>} */
const HistoryTable = ({ changes }) => {
  const { t } = useTranslation();
  /** @param {VendorQualification['history'][number]} c */
  const cause = (c) =>
    c.causeDocumentId !== null ? (
      <>
        {t('qualification.history.cause.document')} <Data>{c.causeDocumentId}</Data>
      </>
    ) : (
      t('qualification.history.cause.rule', {
        level: t(`qualification.level.${c.causeRuleLevel ?? 'approved'}`)
      })
    );
  return (
    <div className="border border-border-subtle rounded-md overflow-x-auto">
      <Table>
        <TableHeader>
          <TableHeaderCell>{t('qualification.history.col.at')}</TableHeaderCell>
          <TableHeaderCell>{t('qualification.history.col.change')}</TableHeaderCell>
          <TableHeaderCell>{t('qualification.history.col.cause')}</TableHeaderCell>
        </TableHeader>
        <tbody>
          {changes.map((c) => (
            <TableRow key={`${c.at}|${c.causeDocumentId ?? c.causeRuleLevel ?? ''}|${c.to}`}>
              <TableCell className="whitespace-nowrap">
                <Data>{formatDate(c.at)}</Data>
              </TableCell>
              <TableCell className="whitespace-nowrap text-sm text-text-secondary">
                {t(`qualification.level.${c.from}`)} → {t(`qualification.level.${c.to}`)}
              </TableCell>
              <TableCell
                className="text-sm text-text-secondary"
                data-testid="qualification-history-cause"
              >
                {cause(c)}
              </TableCell>
            </TableRow>
          ))}
        </tbody>
      </Table>
    </div>
  );
};

export default QualificationPanel;
