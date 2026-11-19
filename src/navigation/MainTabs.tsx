/**
 * MainTabs: the 5 bottom tabs, using each platform's REAL native tab bar:
 *   iOS     → UITabBarController (Liquid Glass on iOS 26), SF Symbol icons
 *   Android → Material 3 BottomNavigationView, Ionicons rendered to images
 * Each tab also gets a native header (large titles on iOS, Material top app bar on Android).
 */
import { useEffect, useState } from 'react';
import { Platform, type ImageSourcePropType } from 'react-native';
import { createNativeBottomTabNavigator } from '@react-navigation/bottom-tabs/unstable';
import { Ionicons } from '@expo/vector-icons';

import type { MainTabParamList } from './types';
import HomeScreen from '../screens/main/HomeScreen';
import PostItemScreen from '../screens/main/PostItemScreen';
import MyActivityScreen from '../screens/main/MyActivityScreen';
import NotificationsScreen from '../screens/main/NotificationsScreen';
import ProfileScreen from '../screens/main/ProfileScreen';
import { LoadingView } from '../components/Feedback';
import { useNotifications } from '../context/NotificationsContext';
import { colors } from '../constants/theme';

const Tab = createNativeBottomTabNavigator<MainTabParamList>();

type TabName = keyof MainTabParamList;
type IoniconName = keyof typeof Ionicons.glyphMap;

// [normal, selected] icon for each tab
const SF_SYMBOLS = {
  Home: ['house', 'house.fill'],
  Post: ['plus.circle', 'plus.circle.fill'],
  MyActivity: ['list.bullet.rectangle', 'list.bullet.rectangle.fill'],
  Notifications: ['bell', 'bell.fill'],
  Profile: ['person.crop.circle', 'person.crop.circle.fill'],
} as const satisfies Record<TabName, readonly [string, string]>;

const ANDROID_ICONS: Record<TabName, [IoniconName, IoniconName]> = {
  Home: ['home-outline', 'home'],
  Post: ['add-circle-outline', 'add-circle'],
  MyActivity: ['list-outline', 'list'],
  Notifications: ['notifications-outline', 'notifications'],
  Profile: ['person-circle-outline', 'person-circle'],
};

type AndroidIconSet = Record<TabName, [ImageSourcePropType, ImageSourcePropType]>;

/** Android's native tab bar needs image sources, so we render the Ionicons to images once. */
function useAndroidTabIcons(): AndroidIconSet | null {
  const [icons, setIcons] = useState<AndroidIconSet | null>(null);
  useEffect(() => {
    if (Platform.OS !== 'android') return;
    const names = Object.keys(ANDROID_ICONS) as TabName[];
    Promise.all(
      names.map(async (tab) => {
        const [outline, filled] = ANDROID_ICONS[tab];
        // Black icons; the tab bar tints them with the active/inactive colors.
        const [a, b] = await Promise.all([
          Ionicons.getImageSource(outline, 24, '#000'),
          Ionicons.getImageSource(filled, 24, '#000'),
        ]);
        return [tab, [a, b]] as const;
      }),
    ).then((entries) => setIcons(Object.fromEntries(entries) as AndroidIconSet));
  }, []);
  return icons;
}

export default function MainTabs() {
  const androidIcons = useAndroidTabIcons();
  const { unreadCount } = useNotifications();

  if (Platform.OS === 'android' && !androidIcons) return <LoadingView />;

  const icon = (tab: TabName) => ({ focused }: { focused: boolean }) =>
    Platform.OS === 'ios'
      ? { type: 'sfSymbol' as const, name: SF_SYMBOLS[tab][focused ? 1 : 0] }
      : { type: 'image' as const, source: androidIcons![tab][focused ? 1 : 0] };

  return (
    <Tab.Navigator
      screenOptions={{
        tabBarActiveTintColor: colors.primary,
        tabBarInactiveTintColor: colors.textMuted,
        tabBarActiveIndicatorColor: colors.secondaryContainer, // Android M3 "pill" behind the active icon
        tabBarLabelVisibilityMode: 'labeled',
        tabBarMinimizeBehavior: 'onScrollDown', // iOS 26: tab bar shrinks while scrolling
        headerShown: true, // native tabs hide the header unless asked
        headerLargeTitleEnabled: Platform.OS === 'ios',
        headerTransparent: Platform.OS === 'ios', // lets content scroll under the glass header
        headerTintColor: colors.primary,
        headerLargeTitleStyle: { color: colors.text },
        headerTitleStyle: { color: colors.text },
        headerStyle: Platform.OS === 'android' ? { backgroundColor: colors.background } : undefined,
        headerShadowVisible: false,
      }}
    >
      <Tab.Screen name="Home" component={HomeScreen} options={{ title: 'FindIt', tabBarLabel: 'Home', tabBarIcon: icon('Home') }} />
      <Tab.Screen
        name="Post"
        component={PostItemScreen}
        options={{ title: 'Post an Item', tabBarLabel: 'Post', tabBarIcon: icon('Post'), headerLargeTitleEnabled: false }}
      />
      <Tab.Screen
        name="MyActivity"
        component={MyActivityScreen}
        options={{ title: 'My Activity', tabBarLabel: 'Activity', tabBarIcon: icon('MyActivity') }}
      />
      <Tab.Screen
        name="Notifications"
        component={NotificationsScreen}
        options={{
          title: 'Notifications',
          tabBarLabel: 'Alerts',
          tabBarIcon: icon('Notifications'),
          tabBarBadge: unreadCount > 0 ? (unreadCount > 99 ? '99+' : unreadCount) : undefined,
        }}
      />
      <Tab.Screen name="Profile" component={ProfileScreen} options={{ title: 'Profile', tabBarIcon: icon('Profile') }} />
    </Tab.Navigator>
  );
}
