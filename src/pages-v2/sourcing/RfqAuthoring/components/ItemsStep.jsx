import { useTranslation } from 'react-i18next';
/** @import React from 'react' */
/** @import { ItemDraft } from '../../rfqDraft' */
import { Plus } from 'lucide-react';
import Button from '@components/ui-v2/Button';
import { newItemDraft } from '../../rfqDraft';
import { ItemCard } from './ItemCard';
import { StepRefusal } from './StepRefusal';

/**
 * The wizard's Items step: one `ItemCard` per item, the add-item button, and why
 * Next is refused (`refusal`, from the page's step gate).
 * @type {React.FC<{ items: readonly ItemDraft[]; onChange: (next: ItemDraft[]) => void; refusal: string | null; }>}
 */
export const ItemsStep = ({ items, onChange, refusal }) => {
  const { t } = useTranslation();
  return (
    <div className="space-y-4" data-testid="rfq-items-step">
      {items.map((item, i) => (
        <ItemCard
          key={item.uid}
          item={item}
          index={i}
          canRemove={items.length > 1}
          onChange={(next) => onChange(items.map((x) => (x.uid === item.uid ? next : x)))}
          onRemove={() => onChange(items.filter((x) => x.uid !== item.uid))}
        />
      ))}
      <Button
        variant="secondary"
        icon={Plus}
        onClick={() => onChange([...items, newItemDraft('other')])}
        data-testid="rfq-item-add"
      >
        {t('rfqAuthoring.items.add')}
      </Button>
      <StepRefusal reason={refusal} testId="rfq-items-refusal" />
    </div>
  );
};
