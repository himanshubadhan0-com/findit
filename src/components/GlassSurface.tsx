/**
 * GlassSurface: Apple's "Liquid Glass" material on iOS 26+, with a solid
 * fallback everywhere else (Android, older iOS).
 *
 * Use it for things that FLOAT above content: bottom action bars, the photo
 * page indicator, the offline pill. That's where Apple uses glass.
 */
import type { ReactNode } from 'react';
import { Platform, View, type ColorValue, type StyleProp, type ViewProps, type ViewStyle } from 'react-native';
import { GlassView, isGlassEffectAPIAvailable, isLiquidGlassAvailable } from 'expo-glass-effect';

import { colors, shadow } from '../constants/theme';

// Check once. isGlassEffectAPIAvailable guards against early iOS 26 betas that crash.
const GLASS_SUPPORTED =
  Platform.OS === 'ios' && isLiquidGlassAvailable() && isGlassEffectAPIAvailable();

interface Props extends ViewProps {
  children?: ReactNode;
  style?: StyleProp<ViewStyle>;
  /** Tint the glass (e.g. primary for a prominent button). */
  tintColor?: ColorValue;
  /** Glass that reacts to touch (for buttons). */
  interactive?: boolean;
}

export default function GlassSurface({ children, style, tintColor, interactive = false, ...rest }: Props) {
  if (GLASS_SUPPORTED) {
    return (
      <GlassView glassEffectStyle="regular" tintColor={tintColor} isInteractive={interactive} style={style} {...rest}>
        {children}
      </GlassView>
    );
  }
  // Fallback: an elevated surface (Material 3) / opaque bar (older iOS).
  return (
    <View style={[{ backgroundColor: colors.surfaceHigh }, shadow.floating, style]} {...rest}>
      {children}
    </View>
  );
}

export { GLASS_SUPPORTED };
