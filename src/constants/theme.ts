/**
 * theme.ts: the single source of truth for how FindIt looks.
 *
 * The app follows each platform's CURRENT design language:
 *   iOS 26     → Apple Human Interface Guidelines: grouped grey background,
 *                white rounded "inset" sections, SF type sizes, capsule
 *                buttons, continuous ("squircle") corners, Liquid Glass bars.
 *   Android 16 → Material 3 (Expressive): tinted surfaces, tonal containers,
 *                M3 type scale, pill buttons, 8dp filter chips, 16dp cards.
 *
 * `pick({ ios, android })` chooses a value per platform. Every screen imports
 * from here, so changing a value re-themes the whole app.
 */
import { Platform, type TextStyle } from 'react-native';

const isIOS = Platform.OS === 'ios';

/** Choose a value per platform (anything that isn't iOS uses the Android/Material value). */
export function pick<T>(values: { ios: T; android: T }): T {
  return isIOS ? values.ios : values.android;
}

export const colors = {
  // Brand: one primary color (indigo) on both platforms.
  primary: '#4F46E5',
  primaryPressed: '#4338CA',
  onPrimary: '#FFFFFF',
  primaryContainer: pick({ ios: '#ECEBFF', android: '#E2DFFF' }), // tinted backgrounds
  onPrimaryContainer: pick({ ios: '#3730A3', android: '#2A2287' }),
  secondaryContainer: pick({ ios: '#E5E5EA', android: '#E3E0F9' }), // selected chips, tab indicator

  // Lost / Found badges (Lost = red, Found = green), using each platform's system tones.
  lost: pick({ ios: '#D70015', android: '#B3261E' }),
  lostContainer: pick({ ios: '#FFE5E7', android: '#F9DEDC' }),
  found: pick({ ios: '#248A3D', android: '#146C2E' }),
  foundContainer: pick({ ios: '#DDF5E3', android: '#C4EED0' }),

  // Surfaces
  background: pick({ ios: '#F2F2F7', android: '#FCF8FF' }), // iOS systemGroupedBackground / M3 surface
  surface: pick({ ios: '#FFFFFF', android: '#F3EFFA' }), // iOS section / M3 surfaceContainerLow
  surfaceHigh: pick({ ios: '#FFFFFF', android: '#EBE6F3' }), // M3 surfaceContainerHigh (sheets)
  fill: pick({ ios: 'rgba(118,118,128,0.12)', android: '#E7E2EE' }), // segmented tracks, chips
  separator: pick({ ios: 'rgba(60,60,67,0.29)', android: '#C9C5D0' }),
  outline: pick({ ios: 'rgba(60,60,67,0.18)', android: '#79767F' }), // text field borders
  scrim: 'rgba(0,0,0,0.32)',

  // Text
  text: pick({ ios: '#000000', android: '#1C1B20' }),
  textMuted: pick({ ios: 'rgba(60,60,67,0.6)', android: '#49454F' }),
  textFaint: pick({ ios: 'rgba(60,60,67,0.3)', android: '#79767F' }),
  onDark: '#FFFFFF',

  // Feedback
  error: pick({ ios: '#D70015', android: '#B3261E' }),
  errorContainer: pick({ ios: '#FFE5E7', android: '#F9DEDC' }),
  warning: pick({ ios: '#C93400', android: '#8C5000' }),
  warningContainer: pick({ ios: '#FFF1DE', android: '#FFDDB7' }),
  success: pick({ ios: '#248A3D', android: '#146C2E' }),
  successContainer: pick({ ios: '#DDF5E3', android: '#C4EED0' }),
} as const;

/** Spacing scale (density-independent pixels). */
export const spacing = {
  xxs: 2,
  xs: 4,
  sm: 8,
  md: 16,
  lg: 24,
  xl: 32,
  xxl: 48,
} as const;

/** Corner radius scale. iOS 26 uses larger, continuous corners; Material 3 uses its shape scale. */
export const radius = {
  sm: pick({ ios: 10, android: 8 }), // chips (M3 = 8dp)
  md: pick({ ios: 14, android: 12 }), // inputs, small cards
  lg: pick({ ios: 26, android: 16 }), // cards, grouped sections
  xl: pick({ ios: 34, android: 28 }), // sheets
  pill: 999, // capsule buttons, badges
} as const;

/**
 * Text styles: iOS Dynamic Type sizes vs. the Material 3 type scale.
 * Name → (iOS style / M3 role)
 */
/** pick() for text styles, typed so fontWeight is a valid React Native weight. */
const text = (v: { ios: TextStyle; android: TextStyle }): TextStyle => pick(v);

export const typography = {
  largeTitle: text({ ios: { fontSize: 34, fontWeight: '700' }, android: { fontSize: 32, fontWeight: '400' } }), // displaySmall
  title: text({ ios: { fontSize: 22, fontWeight: '700' }, android: { fontSize: 22, fontWeight: '500' } }), // title2 / titleLarge
  headline: text({ ios: { fontSize: 17, fontWeight: '600' }, android: { fontSize: 16, fontWeight: '500' } }), // headline / titleMedium
  body: text({ ios: { fontSize: 17, fontWeight: '400' }, android: { fontSize: 16, fontWeight: '400' } }), // body / bodyLarge
  subhead: text({ ios: { fontSize: 15, fontWeight: '400' }, android: { fontSize: 14, fontWeight: '400' } }), // subheadline / bodyMedium
  footnote: text({ ios: { fontSize: 13, fontWeight: '400' }, android: { fontSize: 12, fontWeight: '400' } }), // footnote / bodySmall
  label: text({ ios: { fontSize: 15, fontWeight: '600' }, android: { fontSize: 14, fontWeight: '500' } }), // buttons / labelLarge
  caption: text({ ios: { fontSize: 12, fontWeight: '600' }, android: { fontSize: 11, fontWeight: '500' } }), // badges / labelSmall
} as const;

/** Legacy shortcuts (some components use plain sizes). */
export const fontSize = { xs: 12, sm: 14, md: 16, lg: 18, xl: 22, xxl: 28, display: 34 } as const;
export const fontWeight = { regular: '400', medium: '500', semibold: '600', bold: '700' } as const;

/** Minimum touch target (Apple: 44pt, Material: 48dp). */
export const touchTarget = pick({ ios: 44, android: 48 });

/**
 * Shadows are only for FLOATING things (bottom action bar, sheets). Both
 * platforms now use flat cards on tinted backgrounds instead of drop shadows.
 */
export const shadow = {
  floating: pick({
    ios: { shadowColor: '#000', shadowOpacity: 0.12, shadowRadius: 16, shadowOffset: { width: 0, height: 4 } },
    android: { elevation: 3 },
  }),
} as const;

/** iOS "squircle" corners. Ignored on Android. */
export const continuous = { borderCurve: 'continuous' } as const;
