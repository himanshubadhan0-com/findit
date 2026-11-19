import type { ComponentProps } from 'react';
import type { Ionicons } from '@expo/vector-icons';

/** Item categories (from the spec). `as const` lets TypeScript turn this into a union type. */
export const CATEGORIES = [
  'Phone',
  'Wallet',
  'ID Card',
  'Keys',
  'Bag',
  'Laptop/Accessories',
  'Books',
  'Other',
] as const;

export type Category = (typeof CATEGORIES)[number];

type IconName = ComponentProps<typeof Ionicons>['name'];

/** An icon for each category, shown on cards when an item has no photo. */
export const CATEGORY_ICONS: Record<Category, IconName> = {
  Phone: 'phone-portrait-outline',
  Wallet: 'wallet-outline',
  'ID Card': 'card-outline',
  Keys: 'key-outline',
  Bag: 'bag-handle-outline',
  'Laptop/Accessories': 'laptop-outline',
  Books: 'book-outline',
  Other: 'help-circle-outline',
};

/** Ready-made options for pickers: [{ value, label, icon }]. */
export const CATEGORY_OPTIONS = CATEGORIES.map((c) => ({ value: c, label: c, icon: CATEGORY_ICONS[c] }));
