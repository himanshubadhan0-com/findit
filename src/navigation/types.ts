/**
 * Navigation types: the list of screens and the params each one expects.
 * Example: ItemDetails needs an `itemId`, so navigate('ItemDetails', { itemId })
 * fails to compile if you forget it.
 */
import type { CompositeScreenProps, NavigatorScreenParams } from '@react-navigation/native';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import type { NativeBottomTabScreenProps } from '@react-navigation/bottom-tabs/unstable';

/** Shown when logged OUT. */
export type AuthStackParamList = {
  Welcome: undefined;
  Login: undefined;
  SignUp: undefined;
};

/** The 5 bottom tabs (shown when logged IN). */
export type MainTabParamList = {
  Home: undefined;
  Post: undefined;
  MyActivity: undefined;
  Notifications: undefined;
  Profile: undefined;
};

/** The logged-in stack: tabs at the bottom, plus full-screen pages pushed on top. */
export type AppStackParamList = {
  MainTabs: NavigatorScreenParams<MainTabParamList>;
  /** matchCount is passed right after posting, to show "N possible matches". */
  ItemDetails: { itemId: string; matchCount?: number };
  ClaimItem: { itemId: string };
  EditItem: { itemId: string };
  AdminStats: undefined;
  AdminPosts: undefined;
};

// ---- Prop helpers for screens ----
export type AuthScreenProps<T extends keyof AuthStackParamList> = NativeStackScreenProps<AuthStackParamList, T>;

export type AppScreenProps<T extends keyof AppStackParamList> = NativeStackScreenProps<AppStackParamList, T>;

/** A tab screen can navigate to tabs AND to stack screens like ItemDetails. */
export type TabScreenProps<T extends keyof MainTabParamList> = CompositeScreenProps<
  NativeBottomTabScreenProps<MainTabParamList, T>,
  NativeStackScreenProps<AppStackParamList>
>;

// Lets useNavigation() know our screen names without passing types every time.
declare global {
  namespace ReactNavigation {
    // eslint-disable-next-line @typescript-eslint/no-empty-object-type
    interface RootParamList extends AppStackParamList {}
  }
}
