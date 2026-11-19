/**
 * A reference to the navigator, so code OUTSIDE screens (like a tapped push
 * notification) can open a screen.
 */
import { createNavigationContainerRef } from '@react-navigation/native';

import type { AppStackParamList } from './types';

export const navigationRef = createNavigationContainerRef<AppStackParamList>();

export function openItem(itemId: string) {
  if (navigationRef.isReady()) navigationRef.navigate('ItemDetails', { itemId });
}
