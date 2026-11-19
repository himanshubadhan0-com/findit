import type { ComponentProps } from 'react';
import type { Ionicons } from '@expo/vector-icons';

/** Campus locations shown in the location dropdown (from the spec). */
export const LOCATIONS = [
  'Library',
  'Canteen',
  'Hostel',
  'Ground',
  'Classroom Block',
  'Parking',
  'Other',
] as const;

export type Location = (typeof LOCATIONS)[number];

type IconName = ComponentProps<typeof Ionicons>['name'];

export const LOCATION_ICONS: Record<Location, IconName> = {
  Library: 'library-outline',
  Canteen: 'restaurant-outline',
  Hostel: 'bed-outline',
  Ground: 'football-outline',
  'Classroom Block': 'school-outline',
  Parking: 'car-outline',
  Other: 'ellipsis-horizontal-circle-outline',
};

/** Ready-made options for pickers: [{ value, label, icon }]. */
export const LOCATION_OPTIONS = LOCATIONS.map((l) => ({ value: l, label: l, icon: LOCATION_ICONS[l] }));
