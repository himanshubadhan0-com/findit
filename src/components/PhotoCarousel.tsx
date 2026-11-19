/**
 * PhotoCarousel: swipe through an item's photos. The page dots sit on a
 * small glass capsule (Liquid Glass on iOS 26). No photos → a big category icon.
 */
import { useState } from 'react';
import { FlatList, StyleSheet, View, useWindowDimensions } from 'react-native';
import { Image } from 'expo-image';
import { Ionicons } from '@expo/vector-icons';

import GlassSurface from './GlassSurface';
import { CATEGORY_ICONS, type Category } from '../constants/categories';
import { colors, continuous, radius, spacing } from '../constants/theme';

interface Props {
  photos: string[];
  category: Category;
  height?: number;
}

export default function PhotoCarousel({ photos, category, height = 280 }: Props) {
  const { width: screenWidth } = useWindowDimensions();
  const width = screenWidth - spacing.md * 2;
  const [page, setPage] = useState(0);

  if (photos.length === 0) {
    return (
      <View style={[styles.frame, styles.placeholder, { height: height * 0.6 }]} accessibilityLabel={`No photos. Category ${category}`}>
        <Ionicons name={CATEGORY_ICONS[category]} size={64} color={colors.primary} />
      </View>
    );
  }

  return (
    <View style={[styles.frame, { height }]}>
      <FlatList
        data={photos}
        keyExtractor={(uri) => uri}
        horizontal
        pagingEnabled
        showsHorizontalScrollIndicator={false}
        onMomentumScrollEnd={(e) => setPage(Math.round(e.nativeEvent.contentOffset.x / width))}
        renderItem={({ item, index }) => (
          <Image
            source={{ uri: item }}
            style={{ width, height }}
            contentFit="cover"
            transition={200}
            accessibilityLabel={`Photo ${index + 1} of ${photos.length}`}
          />
        )}
      />
      {photos.length > 1 && (
        <GlassSurface style={styles.dots}>
          {photos.map((uri, i) => (
            <View key={uri} style={[styles.dot, i === page && styles.dotActive]} />
          ))}
        </GlassSurface>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  frame: { borderRadius: radius.lg, overflow: 'hidden', ...continuous, backgroundColor: colors.surface },
  placeholder: { alignItems: 'center', justifyContent: 'center', backgroundColor: colors.primaryContainer },
  dots: {
    position: 'absolute',
    bottom: spacing.sm + 2,
    alignSelf: 'center',
    flexDirection: 'row',
    gap: 6,
    paddingHorizontal: spacing.sm + 2,
    paddingVertical: 7,
    borderRadius: 999,
  },
  dot: { width: 7, height: 7, borderRadius: 4, backgroundColor: 'rgba(0,0,0,0.25)' },
  dotActive: { backgroundColor: colors.primary },
});
