/**
 * PhotoPicker: add up to 3 photos from the camera or the photo library.
 * Photos are only compressed + uploaded when the post is saved
 * (see services/photos.ts), so picking stays instant.
 */
import { Alert, Pressable, StyleSheet, Text, View } from 'react-native';
import { Image } from 'expo-image';
import * as ImagePicker from 'expo-image-picker';
import { Ionicons } from '@expo/vector-icons';

import { useActionSheet } from './ActionSheet';
import { colors, continuous, radius, spacing, typography } from '../constants/theme';
import { MAX_PHOTOS } from '../utils/validators';
import { haptics } from '../utils/haptics';

interface Props {
  photos: string[];
  onChange: (photos: string[]) => void;
  error?: string;
}

const TILE = 100;

export default function PhotoPicker({ photos, onChange, error }: Props) {
  const showActions = useActionSheet();
  const remaining = MAX_PHOTOS - photos.length;

  const fromLibrary = async () => {
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      allowsMultipleSelection: true,
      selectionLimit: remaining,
      quality: 1, // we compress ourselves before upload
    });
    if (!result.canceled) onChange([...photos, ...result.assets.map((a) => a.uri)].slice(0, MAX_PHOTOS));
  };

  const fromCamera = async () => {
    const permission = await ImagePicker.requestCameraPermissionsAsync();
    if (!permission.granted) {
      Alert.alert('Camera access needed', 'Allow camera access in Settings to take a photo of the item.');
      return;
    }
    try {
      const result = await ImagePicker.launchCameraAsync({ mediaTypes: ['images'], quality: 1 });
      if (!result.canceled) onChange([...photos, result.assets[0].uri].slice(0, MAX_PHOTOS));
    } catch {
      Alert.alert('Camera unavailable', 'This device has no camera. Choose a photo from your library instead.');
    }
  };

  const addPhoto = () =>
    showActions({
      title: 'Add a photo',
      options: [
        { label: 'Take Photo', icon: 'camera-outline', onPress: fromCamera },
        { label: 'Choose from Library', icon: 'images-outline', onPress: fromLibrary },
      ],
    });

  const remove = (uri: string) => {
    haptics.light();
    onChange(photos.filter((p) => p !== uri));
  };

  return (
    <View>
      <View style={styles.row}>
        {photos.map((uri, i) => (
          <View key={uri} style={styles.tile}>
            <Image source={{ uri }} style={styles.image} contentFit="cover" transition={150} accessibilityLabel={`Photo ${i + 1}`} />
            <Pressable
              onPress={() => remove(uri)}
              hitSlop={8}
              style={styles.remove}
              accessibilityRole="button"
              accessibilityLabel={`Remove photo ${i + 1}`}
            >
              <Ionicons name="close" size={14} color={colors.onDark} />
            </Pressable>
          </View>
        ))}
        {remaining > 0 && (
          <Pressable
            onPress={addPhoto}
            style={({ pressed }) => [styles.tile, styles.add, pressed && { opacity: 0.6 }]}
            accessibilityRole="button"
            accessibilityLabel="Add photo"
            android_ripple={{ color: colors.fill }}
          >
            <Ionicons name="camera" size={26} color={colors.primary} />
            <Text style={styles.addText}>Add photo</Text>
          </Pressable>
        )}
      </View>
      <Text style={[styles.helper, !!error && { color: colors.error }]}>
        {error ?? `${photos.length}/${MAX_PHOTOS} photos · compressed before upload`}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm },
  tile: { width: TILE, height: TILE, borderRadius: radius.md, overflow: 'hidden', ...continuous },
  image: { width: '100%', height: '100%' },
  remove: {
    position: 'absolute',
    top: 6,
    right: 6,
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: 'rgba(0,0,0,0.6)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  add: {
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.xs,
    backgroundColor: colors.primaryContainer,
    borderWidth: 1.5,
    borderStyle: 'dashed',
    borderColor: colors.primary,
  },
  addText: { ...typography.footnote, color: colors.primary, fontWeight: '600' },
  helper: { ...typography.footnote, color: colors.textMuted, marginTop: spacing.sm },
});
