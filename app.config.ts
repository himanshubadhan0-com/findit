/**
 * app.config.ts: reads app.json and adds settings that depend on .env.
 *
 * Android blocks plain http:// traffic in release builds. The LOCAL Supabase
 * (supabase start) is http://, so cleartext is allowed only when the backend
 * URL is http. A cloud project is https://, so the APK stays locked down.
 */
import type { ConfigContext, ExpoConfig } from 'expo/config';

export default ({ config }: ConfigContext): ExpoConfig => {
  const backendUrl = process.env.EXPO_PUBLIC_SUPABASE_URL ?? '';
  return {
    ...(config as ExpoConfig),
    plugins: [
      ...(config.plugins ?? []),
      ['expo-build-properties', { android: { usesCleartextTraffic: backendUrl.startsWith('http://') } }],
    ],
  };
};
