/**
 * FilterBar: a horizontal row of filter chips under the search bar:
 *   [Lost] [Found] [Category ▾] [Location ▾] [Date ▾] [Clear]
 * Category/Location open a SelectSheet; Date opens a small range sheet.
 */
import { useState } from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';

import { Chip } from './Controls';
import { SelectSheet } from './SelectSheet';
import BottomSheet from './BottomSheet';
import DateField from './DateField';
import { ListRow, Section } from './Section';
import { CATEGORY_OPTIONS } from '../constants/categories';
import { LOCATION_OPTIONS } from '../constants/locations';
import { colors, spacing, typography } from '../constants/theme';
import { formatItemDate, toISODate } from '../utils/dateHelpers';
import type { ItemFilters } from '../types';

interface Props {
  filters: ItemFilters;
  onChange: (filters: ItemFilters) => void;
}

const daysAgo = (n: number) => {
  const d = new Date();
  d.setDate(d.getDate() - n);
  return toISODate(d);
};

export function countActiveFilters(f: ItemFilters): number {
  return [f.type, f.category, f.location, f.dateFrom || f.dateTo].filter(Boolean).length;
}

export default function FilterBar({ filters, onChange }: Props) {
  const [sheet, setSheet] = useState<'category' | 'location' | 'date' | null>(null);
  const set = (patch: Partial<ItemFilters>) => onChange({ ...filters, ...patch });
  const active = countActiveFilters(filters);

  const dateLabel =
    filters.dateFrom || filters.dateTo
      ? `${filters.dateFrom ? formatItemDate(filters.dateFrom) : '…'} – ${filters.dateTo ? formatItemDate(filters.dateTo) : 'Today'}`
      : 'Any date';

  return (
    <View>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.row}>
        <Chip
          label="Lost"
          icon="search"
          selected={filters.type === 'lost'}
          selectedColor={colors.lost}
          onPress={() => set({ type: filters.type === 'lost' ? null : 'lost' })}
        />
        <Chip
          label="Found"
          icon="hand-left-outline"
          selected={filters.type === 'found'}
          selectedColor={colors.found}
          onPress={() => set({ type: filters.type === 'found' ? null : 'found' })}
        />
        <Chip label={filters.category ?? 'Category'} selected={!!filters.category} dropdown onPress={() => setSheet('category')} />
        <Chip label={filters.location ?? 'Location'} selected={!!filters.location} dropdown onPress={() => setSheet('location')} />
        <Chip label={dateLabel} selected={!!(filters.dateFrom || filters.dateTo)} dropdown onPress={() => setSheet('date')} />
        {active > 0 && (
          <Chip
            label="Clear"
            icon="close"
            onPress={() => onChange({ search: filters.search, type: null, category: null, location: null, dateFrom: null, dateTo: null })}
          />
        )}
      </ScrollView>

      <SelectSheet
        visible={sheet === 'category'}
        title="Category"
        options={CATEGORY_OPTIONS}
        selected={filters.category ?? null}
        clearLabel="Any category"
        onSelect={(category) => set({ category })}
        onClose={() => setSheet(null)}
      />
      <SelectSheet
        visible={sheet === 'location'}
        title="Location"
        options={LOCATION_OPTIONS}
        selected={filters.location ?? null}
        clearLabel="Anywhere on campus"
        onSelect={(location) => set({ location })}
        onClose={() => setSheet(null)}
      />
      <DateRangeSheet
        visible={sheet === 'date'}
        from={filters.dateFrom ?? null}
        to={filters.dateTo ?? null}
        onApply={(dateFrom, dateTo) => set({ dateFrom, dateTo })}
        onClose={() => setSheet(null)}
      />
    </View>
  );
}

function DateRangeSheet({
  visible,
  from,
  to,
  onApply,
  onClose,
}: {
  visible: boolean;
  from: string | null;
  to: string | null;
  onApply: (from: string | null, to: string | null) => void;
  onClose: () => void;
}) {
  const [draftFrom, setDraftFrom] = useState(from ?? daysAgo(7));
  const [draftTo, setDraftTo] = useState(to ?? toISODate(new Date()));

  const quick = (label: string, days: number | null) => (
    <ListRow
      key={label}
      title={label}
      icon="time-outline"
      chevron={false}
      onPress={() => {
        onApply(days === null ? null : daysAgo(days), null);
        onClose();
      }}
    />
  );

  return (
    <BottomSheet
      visible={visible}
      title="Date range"
      onClose={onClose}
      doneLabel="Apply"
      onDone={() => {
        // Swap if the user picked them backwards.
        const [a, b] = draftFrom <= draftTo ? [draftFrom, draftTo] : [draftTo, draftFrom];
        onApply(a, b);
        onClose();
      }}
    >
      <Section title="Quick">{[quick('Last 7 days', 7), quick('Last 30 days', 30), quick('Any time', null)]}</Section>
      <Section title="Custom range" padded>
        <DateField label="From" value={draftFrom} onChange={setDraftFrom} />
        <DateField label="To" value={draftTo} onChange={setDraftTo} />
        <Text style={styles.hint}>Tap Apply to use the custom range.</Text>
      </Section>
    </BottomSheet>
  );
}

const styles = StyleSheet.create({
  row: { gap: spacing.sm, paddingHorizontal: spacing.md, paddingVertical: spacing.sm },
  hint: { ...typography.footnote, color: colors.textMuted },
});
