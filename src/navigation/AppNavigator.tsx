/**
 * AppNavigator: the logged-in part of the app.
 * The tabs are the first screen; detail screens are pushed on top with
 * NATIVE headers (glass on iOS 26, Material top app bar on Android).
 * Claim and Edit open as modal sheets, the native pattern for "fill in a
 * form, then come back".
 */
import { Platform, Pressable, Text } from 'react-native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';

import type { AppStackParamList } from './types';
import MainTabs from './MainTabs';
import ItemDetailsScreen from '../screens/items/ItemDetailsScreen';
import ClaimItemScreen from '../screens/items/ClaimItemScreen';
import EditItemScreen from '../screens/items/EditItemScreen';
import AdminStatsScreen from '../screens/admin/AdminStatsScreen';
import AdminPostsScreen from '../screens/admin/AdminPostsScreen';
import { colors, typography } from '../constants/theme';

const Stack = createNativeStackNavigator<AppStackParamList>();

const isIOS = Platform.OS === 'ios';

export default function AppNavigator() {
  return (
    <Stack.Navigator
      screenOptions={{
        headerTintColor: colors.primary,
        headerTitleStyle: { color: colors.text },
        headerBackButtonDisplayMode: 'minimal', // iOS 26: just the chevron in a glass button
        headerTransparent: isIOS, // content scrolls under the glass header
        headerShadowVisible: false,
        headerStyle: isIOS ? undefined : { backgroundColor: colors.background },
        contentStyle: { backgroundColor: colors.background },
      }}
    >
      <Stack.Screen name="MainTabs" component={MainTabs} options={{ headerShown: false }} />
      <Stack.Screen name="ItemDetails" component={ItemDetailsScreen} options={{ title: '' }} />
      <Stack.Screen
        name="ClaimItem"
        component={ClaimItemScreen}
        options={({ navigation }) => ({
          title: 'Claim item',
          presentation: 'modal',
          headerTransparent: false,
          headerLeft: isIOS
            ? () => (
                <Pressable onPress={navigation.goBack} hitSlop={10} accessibilityRole="button">
                  <Text style={{ ...typography.body, color: colors.primary }}>Cancel</Text>
                </Pressable>
              )
            : undefined,
        })}
      />
      <Stack.Screen
        name="EditItem"
        component={EditItemScreen}
        options={({ navigation }) => ({
          title: 'Edit post',
          presentation: 'modal',
          headerTransparent: false,
          headerLeft: isIOS
            ? () => (
                <Pressable onPress={navigation.goBack} hitSlop={10} accessibilityRole="button">
                  <Text style={{ ...typography.body, color: colors.primary }}>Cancel</Text>
                </Pressable>
              )
            : undefined,
        })}
      />
      <Stack.Screen name="AdminStats" component={AdminStatsScreen} options={{ title: 'Admin dashboard', headerLargeTitleEnabled: isIOS }} />
      <Stack.Screen name="AdminPosts" component={AdminPostsScreen} options={{ title: 'All posts' }} />
    </Stack.Navigator>
  );
}
