/**
 * App.tsx: the root of the app. It only wires providers together:
 *   SafeAreaProvider       → knows where the notch / home bar are
 *   AuthProvider           → who is logged in (context/AuthContext.tsx)
 *   NotificationsProvider  → live notification list, badge, push (context/NotificationsContext.tsx)
 *   ActionSheetProvider    → native action sheets (iOS) / M3 bottom sheets (Android)
 *   NavigationContainer    → navigation state (+ a ref so push taps can open screens)
 *   RootNavigator          → decides: auth screens or main app
 *   OfflineBanner          → floats on top when there's no internet
 */
import { StatusBar } from 'expo-status-bar';
import { NavigationContainer, DefaultTheme, type LinkingOptions, type Theme } from '@react-navigation/native';
import * as Linking from 'expo-linking';
import { SafeAreaProvider } from 'react-native-safe-area-context';

import { AuthProvider } from './context/AuthContext';
import { NotificationsProvider } from './context/NotificationsContext';
import { ActionSheetProvider } from './components/ActionSheet';
import RootNavigator from './navigation/RootNavigator';
import { navigationRef } from './navigation/navigationRef';
import OfflineBanner from './components/OfflineBanner';
import { colors } from './constants/theme';
import type { AppStackParamList } from './navigation/types';

/**
 * Deep links: findit://item/<id> opens a post, findit://post opens the form,
 * and so on. Handy for QR stickers (future work) and for testing screens.
 * (In Expo Go the URL looks like exp://<host>:8081/--/item/<id>.)
 */
const linking: LinkingOptions<AppStackParamList> = {
  prefixes: [Linking.createURL('/'), 'findit://'],
  config: {
    screens: {
      MainTabs: {
        screens: { Home: 'home', Post: 'post', MyActivity: 'activity', Notifications: 'alerts', Profile: 'profile' },
      },
      ItemDetails: 'item/:itemId',
      ClaimItem: 'item/:itemId/claim',
      EditItem: 'item/:itemId/edit',
      AdminStats: 'admin',
      AdminPosts: 'admin/posts',
    },
  },
};

// Make React Navigation's backgrounds and headers use our colors.
const navigationTheme: Theme = {
  ...DefaultTheme,
  colors: {
    ...DefaultTheme.colors,
    primary: colors.primary,
    background: colors.background,
    card: colors.background,
    text: colors.text,
    border: colors.separator,
  },
};

export default function App() {
  return (
    <SafeAreaProvider>
      <AuthProvider>
        <NotificationsProvider>
          <ActionSheetProvider>
            <NavigationContainer ref={navigationRef} theme={navigationTheme} linking={linking}>
              <RootNavigator />
            </NavigationContainer>
            <OfflineBanner />
            <StatusBar style="dark" />
          </ActionSheetProvider>
        </NotificationsProvider>
      </AuthProvider>
    </SafeAreaProvider>
  );
}
