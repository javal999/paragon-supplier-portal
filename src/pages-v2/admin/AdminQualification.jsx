/** @import React from 'react' */
import { useMemo, useRef, useState, useSyncExternalStore } from 'react';
import { useTranslation } from 'react-i18next';
import { Plus, ShieldCheck, Trash2 } from 'lucide-react';
import AppShellV2 from '@components/layout-v2/AppShellV2';
import PageHeader from '@components/ui-v2/PageHeader';
import PageMetaLine from '@components/ui-v2/PageMetaLine';
import Table from '@components/ui-v2/Table';
import TableHeader, { TableHeaderCell } from '@components/ui-v2/TableHeader';
import TableRow from '@components/ui-v2/TableRow';
import TableCell from '@components/ui-v2/TableCell';
import Button from '@components/ui-v2/Button';
import Data from '@components/ui-v2/Data';
import LoadingState from '@components/ui-v2/LoadingState';
import ErrorState from '@components/ui-v2/ErrorState';
import { HandoffNotice } from '@components/ui-v2/HandoffNotice';
import { useVerbAvailability } from '@hooks/useVerbAvailability';
import { useRefusalText } from '@hooks/useRefusalText';
import { useToast } from '@hooks/useToast';
import { useCategoryLabel } from '@hooks/useCategoryLabel';
import { certTypeLabelKey } from '@lib/complianceView';
import { formatDateTime } from '@lib/format';
import { useDocuments, useVendorQualifications } from '@services/query/hooks';
import { useQualificationRuleSet } from '@services/query/commandHooks';
import {
  CERT_TYPES,
  DOCUMENT_CATEGORIES,
  QUALIFICATION_LEVELS,
  QUALIFICATION_RULE_LEVELS,
  levelChanges,
  qualificationRuleRefusal,
  withRule
} from '@services/transitions/qualificationRules';
import { qualificationRuleStore } from '@services/transitions/qualificationRuleStore';
import { sdcClock } from '@services/sdc/clock';
/** @import { CertType, QualificationRequiredDoc, QualificationRuleLevel, SupplierDocument, SupplierDocumentCategory } from '@services/data/types' */
/** @import { ActorAttribution } from '@lib/enforcement' */
import {
  PlaceholderRulesLabel,
  QualificationLevelPill,
  RequirementText
} from '../qualification/QualificationPanel';
import AdminSectionNav from './AdminSectionNav';

// ─────────────────────────────────────────────────────────────────────────────
// ADMINISTRATION · VENDOR QUALIFICATION — Material G1 (MR-10 BR-04, edge case 2).
//
// The documents each level requires, per list. The 3PL / suppliers pages'
// shape, followed:
//   · ONE FORM, the only entrance to `t_qualification_rule_set`; the list
//     buttons only PRE-FILL it, and the gate sits on the form (§84). A seat
//     without `qualification:manage` reads everything and is told whose act a
//     change is.
//   · BEFORE SAVING, the form says how many vendors the change would move up
//     or down (edge case 2), computed by the same pure rule the read model uses.
//   · The pre-check calls the same refusal the verb's policy hook calls (MAT-R2).
//   · The placeholder lists are labelled until a person sets them (MAT-D15).
// ─────────────────────────────────────────────────────────────────────────────

const INPUT_CLASS = 'w-full mt-1 px-3 py-2 text-sm border border-border-subtle rounded-md bg-white';
const ANY_CERT = '';

/**
 * `key`:  Stable key for the row while it is edited; never sent.
 *
 * @typedef {{
 *     readonly key: number;
 *     category: SupplierDocumentCategory;
 *     certType: CertType | typeof ANY_CERT;
 *     label: string;
 *   }} DraftItem
 */

/**
 * @typedef {object} Draft
 * @property {QualificationRuleLevel | ''} level
 * @property {DraftItem[]} items
 */

/** @type {Draft} */
const EMPTY_DRAFT = { level: '', items: [] };

/**
 * @param {readonly DraftItem[]} items
 * @returns {QualificationRequiredDoc[]}
 */
const toRequired = (items) =>
  items.map((i) => ({
    category: i.category,
    ...(i.certType !== ANY_CERT ? { certType: i.certType } : {}),
    label: i.label.trim()
  }));

/** @type {React.FC} */
const AdminQualification = () => {
  const { t } = useTranslation();
  const refusalText = useRefusalText();
  const categoryLabel = useCategoryLabel();
  const { toast } = useToast();
  const qualifications = useVendorQualifications();
  const documents = useDocuments();
  const setRule = useQualificationRuleSet();
  const availability = useVerbAvailability('qualification:manage');
  const held = availability.kind === 'held';
  const formRef = useRef(/** @type {HTMLElement | null} */ (null));
  const [draft, setDraft] = useState(/** @type {Draft} */ (EMPTY_DRAFT));
  const [nextKey, setNextKey] = useState(1);

  const version = useSyncExternalStore(
    qualificationRuleStore.subscribe,
    qualificationRuleStore.version
  );
  // eslint-disable-next-line react-hooks/exhaustive-deps -- `version` is the store's change signal, so the memo re-reads the store
  const rules = useMemo(() => qualificationRuleStore.all(), [version]);
  // eslint-disable-next-line react-hooks/exhaustive-deps -- `version` is the store's change signal, so the memo re-reads the store
  const changes = useMemo(() => [...qualificationRuleStore.changes()].reverse(), [version]);

  const rows = qualifications.data?.items ?? [];
  /** @type {readonly SupplierDocument[]} */
  const docs = useMemo(() => documents.data?.items ?? [], [documents.data]);
  const docsBySupplier = useMemo(() => {
    const m = /** @type {Map<string, SupplierDocument[]>} */ (new Map());
    for (const d of docs) m.set(d.supplierId, [...(m.get(d.supplierId) ?? []), d]);
    return m;
  }, [docs]);

  const CRUMB = [t('adminQual.crumb.administration'), t('adminQual.crumb.page')];
  if (qualifications.isPending || documents.isPending) return <LoadingState breadcrumb={CRUMB} />;
  if (qualifications.isError)
    return (
      <ErrorState
        breadcrumb={CRUMB}
        error={qualifications.error}
        onRetry={() => qualifications.refetch()}
      />
    );
  if (documents.isError)
    return (
      <ErrorState breadcrumb={CRUMB} error={documents.error} onRetry={() => documents.refetch()} />
    );

  /** @param {ActorAttribution} a */
  const byLabel = (a) =>
    a.kind === 'RESOLVED' ? a.person.displayName : t('adminQual.history.by.unattributed');
  /** @param {string} l */
  const levelLabel = (l) => t(`qualification.level.${l}`);
  /** @param {string} l */
  const countAt = (l) => rows.filter((r) => r.level === l).length;

  const required = toRequired(draft.items);
  const precheck =
    draft.level === '' ? null : qualificationRuleRefusal(draft.level, required, rules);
  const impact =
    draft.level === '' || precheck !== null
      ? null
      : levelChanges(
          docsBySupplier,
          rows.map((r) => r.supplierId),
          rules,
          withRule(rules, draft.level, required),
          sdcClock.now()
        );

  /** @param {QualificationRuleLevel} level */
  const edit = (level) => {
    const rule = rules.find((r) => r.level === level);
    const items = (rule?.requiredDocs ?? []).map(
      /** @returns {DraftItem} */ (r, i) => ({
        key: nextKey + i,
        category: r.category,
        certType: r.certType ?? ANY_CERT,
        label: r.label
      })
    );
    setNextKey((k) => k + items.length);
    setDraft({ level, items });
    formRef.current?.scrollIntoView?.({ behavior: 'smooth', block: 'start' });
  };

  /**
   * @param {number} key
   * @param {Partial<DraftItem>} patch
   */
  const setItem = (key, patch) =>
    setDraft((d) => ({
      ...d,
      items: d.items.map((i) => (i.key === key ? { ...i, ...patch } : i))
    }));
  const addItem = () => {
    setDraft((d) => ({
      ...d,
      items: [...d.items, { key: nextKey, category: 'Quality', certType: ANY_CERT, label: '' }]
    }));
    setNextKey((k) => k + 1);
  };
  /** @param {number} key */
  const removeItem = (key) =>
    setDraft((d) => ({ ...d, items: d.items.filter((i) => i.key !== key) }));

  /** @param {React.FormEvent} e */
  const submit = async (e) => {
    e.preventDefault();
    if (draft.level === '' || precheck !== null) return;
    const result = await setRule.mutateAsync({ level: draft.level, requiredDocs: required });
    if (result.status === 'failed') {
      toast({
        variant: 'error',
        title:
          refusalText(result.reason) ??
          t('adminQual.toast.refused', { reason: result.reason ?? '' })
      });
      return;
    }
    toast({
      variant: 'success',
      title: t('adminQual.toast.saved', { level: levelLabel(draft.level) })
    });
    setDraft(EMPTY_DRAFT);
  };

  return (
    <AppShellV2>
      <PageHeader
        breadcrumb={CRUMB}
        title={t('adminQual.title')}
        subtitle={t('adminQual.subtitle')}
      />
      <PageMetaLine className="-mt-6 mb-6">
        <span data-testid="adminqual-meta">
          {QUALIFICATION_LEVELS.map((l) => `${levelLabel(l)} ${countAt(l)}`).join(' · ')}
        </span>
        {rules.some((r) => r.placeholder) ? (
          <PlaceholderRulesLabel className="ml-3 align-middle" />
        ) : null}
      </PageMetaLine>

      <AdminSectionNav />

      {/* ── The lists in force ───────────────────────────────────────────── */}
      <section className="mb-5 grid grid-cols-1 lg:grid-cols-2 gap-4" data-testid="adminqual-lists">
        {rules.map((rule) => (
          <div
            key={rule.level}
            className="rounded-lg border border-border-subtle bg-white p-5 shadow-sm"
            data-testid={`adminqual-list-${rule.level}`}
          >
            <div className="flex flex-wrap items-center gap-2 mb-2">
              <QualificationLevelPill level={rule.level} />
              {rule.placeholder ? <PlaceholderRulesLabel /> : null}
            </div>
            <p className="text-xs text-text-secondary mb-3">
              {t(`adminQual.list.intro.${rule.level}`)}
            </p>
            <ul className="flex flex-col gap-2 text-sm">
              {rule.requiredDocs.map((req) => (
                <li key={`${req.category}|${req.certType ?? ''}`}>
                  <RequirementText req={req} />
                </li>
              ))}
            </ul>
            {held ? (
              <Button
                type="button"
                variant="secondary"
                className="mt-3"
                data-testid={`adminqual-edit-${rule.level}`}
                onClick={() => edit(rule.level)}
              >
                {t('adminQual.action.change')}
              </Button>
            ) : null}
          </div>
        ))}
      </section>

      {/* ── The one entrance to the verb ─────────────────────────────────── */}
      {held ? (
        <section
          ref={formRef}
          className="mb-5 rounded-lg border border-border-subtle bg-white p-5 shadow-sm"
          data-testid="adminqual-form"
        >
          <h2 className="text-section text-text-primary">{t('adminQual.form.title')}</h2>
          <p className="text-xs text-text-secondary mt-1 mb-3">{t('adminQual.form.intro')}</p>
          <form className="flex flex-col gap-3" onSubmit={submit}>
            <label className="block max-w-xs">
              <span className="text-label text-text-tertiary uppercase">
                {t('adminQual.form.level')}
              </span>
              <select
                className={INPUT_CLASS}
                data-testid="adminqual-level"
                aria-label={t('adminQual.form.level')}
                value={draft.level}
                onChange={(e) =>
                  e.target.value === ''
                    ? setDraft(EMPTY_DRAFT)
                    : edit(/** @type {QualificationRuleLevel} */ (e.target.value))
                }
              >
                <option value="">{t('adminQual.form.choose')}</option>
                {QUALIFICATION_RULE_LEVELS.map((l) => (
                  <option key={l} value={l}>
                    {levelLabel(l)}
                  </option>
                ))}
              </select>
            </label>

            {draft.level !== '' ? (
              <DraftItems
                items={draft.items}
                categoryLabel={categoryLabel}
                onChange={setItem}
                onRemove={removeItem}
              />
            ) : null}

            {draft.level !== '' ? (
              <div>
                <Button
                  type="button"
                  variant="secondary"
                  onClick={addItem}
                  data-testid="adminqual-add"
                >
                  <Plus size={14} className="mr-1" />
                  {t('adminQual.form.add')}
                </Button>
              </div>
            ) : null}

            {precheck !== null ? (
              <p className="text-sm text-danger" data-testid="adminqual-precheck">
                {t(`adminQual.refusal.${precheck.split(':')[0]}`)}
              </p>
            ) : null}
            {impact !== null ? (
              <p className="text-sm text-text-primary" data-testid="adminqual-impact">
                {t('adminQual.form.impact', { down: impact.down, up: impact.up })}
              </p>
            ) : null}

            <p className="text-xs text-text-tertiary">{t('adminQual.form.attribution')}</p>
            <div className="flex gap-2">
              <Button
                type="submit"
                variant="outline"
                disabled={setRule.isPending || draft.level === '' || precheck !== null}
                data-testid="adminqual-submit"
              >
                {t('adminQual.form.submit')}
              </Button>
              {draft.level !== '' ? (
                <Button type="button" variant="secondary" onClick={() => setDraft(EMPTY_DRAFT)}>
                  {t('adminQual.form.cancel')}
                </Button>
              ) : null}
            </div>
          </form>
        </section>
      ) : (
        <section
          className="mb-5 border border-border-subtle rounded-lg bg-bg-hover p-4 flex gap-3"
          data-testid="adminqual-gate"
        >
          <ShieldCheck size={16} className="text-teal shrink-0 mt-0.5" />
          <div>
            <div className="flex flex-wrap items-center gap-2">
              <span className="text-sm font-medium text-text-primary">
                {t('adminQual.gate.title')}
              </span>
              <HandoffNotice availability={availability} testId="handoff-qualification-manage" />
            </div>
            <p className="text-xs text-text-secondary mt-1">{t('adminQual.gate.body')}</p>
          </div>
        </section>
      )}

      {/* ── The changes on record ────────────────────────────────────────── */}
      <section data-testid="adminqual-history">
        <h2 className="text-section text-text-primary mb-3">{t('adminQual.history.title')}</h2>
        {changes.length === 0 ? (
          <p className="text-sm text-text-tertiary" data-testid="adminqual-history-empty">
            {t('adminQual.history.empty')}
          </p>
        ) : (
          <div className="bg-bg-surface border border-border-subtle rounded-lg shadow-sm overflow-x-auto">
            <Table>
              <TableHeader>
                <TableHeaderCell term="qualLevel" />
                <TableHeaderCell term="qualDocuments" />
                <TableHeaderCell>{t('adminQual.history.col.by')}</TableHeaderCell>
                <TableHeaderCell>{t('adminQual.history.col.at')}</TableHeaderCell>
              </TableHeader>
              <tbody>
                {changes.map((c, i) => (
                  <TableRow
                    key={`${c.level}-${changes.length - i}`}
                    data-testid={`adminqual-change-${c.level}`}
                  >
                    <TableCell className="text-sm text-text-primary">
                      {levelLabel(c.level)}
                    </TableCell>
                    <TableCell className="text-sm text-text-secondary">
                      {c.requiredDocs.map((r) => categoryLabel(r.category)).join(' · ')}
                    </TableCell>
                    <TableCell className="text-sm text-text-secondary">
                      {byLabel(c.setBy)}
                    </TableCell>
                    <TableCell className="whitespace-nowrap">
                      <Data>{formatDateTime(c.setAt)}</Data>
                    </TableCell>
                  </TableRow>
                ))}
              </tbody>
            </Table>
          </div>
        )}
      </section>
    </AppShellV2>
  );
};

/**
 * @typedef {{
 *     readonly items: readonly DraftItem[];
 *     readonly categoryLabel: (c: string) => string;
 *     readonly onChange: (key: number, patch: Partial<DraftItem>) => void;
 *     readonly onRemove: (key: number) => void;
 *   }} DraftItemsProps
 */

/**
 * The list being edited, one row per required document.
 * @type {React.FC<DraftItemsProps>}
 */
const DraftItems = ({ items, categoryLabel, onChange, onRemove }) => {
  const { t } = useTranslation();
  return (
    <ul className="flex flex-col gap-2" data-testid="adminqual-items">
      {items.map((item) => (
        <li
          key={item.key}
          className="grid grid-cols-1 md:grid-cols-[1fr_1fr_2fr_auto] gap-2 items-end"
        >
          <label className="block">
            <span className="text-label text-text-tertiary uppercase">
              {t('adminQual.form.category')}
            </span>
            <select
              className={INPUT_CLASS}
              aria-label={t('adminQual.form.category')}
              value={item.category}
              onChange={(e) =>
                onChange(item.key, {
                  category: /** @type {SupplierDocumentCategory} */ (e.target.value)
                })
              }
            >
              {DOCUMENT_CATEGORIES.map((c) => (
                <option key={c} value={c}>
                  {categoryLabel(c)}
                </option>
              ))}
            </select>
          </label>
          <label className="block">
            <span className="text-label text-text-tertiary uppercase">
              {t('adminQual.form.certType')}
            </span>
            <select
              className={INPUT_CLASS}
              aria-label={t('adminQual.form.certType')}
              value={item.certType}
              onChange={(e) =>
                onChange(item.key, {
                  certType: /** @type {CertType | typeof ANY_CERT} */ (e.target.value)
                })
              }
            >
              <option value={ANY_CERT}>{t('adminQual.form.anyCert')}</option>
              {CERT_TYPES.map((c) => (
                <option key={c} value={c}>
                  {t(certTypeLabelKey(c))}
                </option>
              ))}
            </select>
          </label>
          <label className="block">
            <span className="text-label text-text-tertiary uppercase">
              {t('adminQual.form.label')}
            </span>
            <input
              className={INPUT_CLASS}
              aria-label={t('adminQual.form.label')}
              placeholder={t('adminQual.form.labelPlaceholder')}
              value={item.label}
              onChange={(e) => onChange(item.key, { label: e.target.value })}
            />
          </label>
          <Button
            type="button"
            variant="secondary"
            aria-label={t('adminQual.form.remove')}
            onClick={() => onRemove(item.key)}
          >
            <Trash2 size={14} />
          </Button>
        </li>
      ))}
    </ul>
  );
};

export default AdminQualification;
