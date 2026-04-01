import React, { useState, useRef, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  StatusBar,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
} from 'react-native';
import MapView, { Circle, Region } from 'react-native-maps';
import { useRoute, RouteProp } from '@react-navigation/native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useHeatmap, type HeatmapPoint } from '../../hooks/useDatamine';
import { Badge } from '../../components/ui/Badge';
import { colors } from '../../theme/colors';
import { spacing, borderRadius } from '../../theme/spacing';
import type { RootStackParamList } from '../../navigation/types';

// Default region: Andheri East, Mumbai
const DEFAULT_REGION: Region = {
  latitude: 19.125,
  longitude: 72.835,
  latitudeDelta: 0.04,
  longitudeDelta: 0.04,
};

function formatCategory(cat: string): string {
  return cat
    .replace(/_/g, ' ')
    .replace(/\b\w/g, (c) => c.toUpperCase());
}

/** Map intensity (0-1) to a fill color string. */
function intensityToColor(intensity: number): string {
  if (intensity >= 0.75) return 'rgba(220, 38, 38, 0.5)'; // red - high
  if (intensity >= 0.5) return 'rgba(255, 107, 53, 0.45)'; // saffron - medium-high
  if (intensity >= 0.25) return 'rgba(251, 191, 36, 0.4)'; // amber - medium
  return 'rgba(5, 150, 105, 0.35)'; // green - low
}

function intensityToStroke(intensity: number): string {
  if (intensity >= 0.75) return 'rgba(220, 38, 38, 0.75)';
  if (intensity >= 0.5) return 'rgba(255, 107, 53, 0.65)';
  if (intensity >= 0.25) return 'rgba(251, 191, 36, 0.6)';
  return 'rgba(5, 150, 105, 0.55)';
}

export const HeatmapScreen: React.FC = () => {
  const route = useRoute<RouteProp<RootStackParamList, 'Heatmap'>>();
  const { boundaryId } = route.params;
  const insets = useSafeAreaInsets();
  const mapRef = useRef<MapView>(null);

  const { data: heatmapData, isLoading } = useHeatmap(boundaryId);

  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);

  // Unique categories from data
  const categories = useMemo(() => {
    if (!heatmapData?.points?.length) return [];
    const cats = new Set<string>();
    heatmapData.points.forEach((p: HeatmapPoint) => {
      if (p.category) cats.add(p.category);
    });
    return Array.from(cats).sort();
  }, [heatmapData]);

  // Filtered points
  const filteredPoints = useMemo(() => {
    if (!heatmapData?.points?.length) return [];
    if (!selectedCategory) return heatmapData.points;
    return heatmapData.points.filter(
      (p: HeatmapPoint) => p.category === selectedCategory,
    );
  }, [heatmapData, selectedCategory]);

  // Compute region from points
  const region = useMemo(() => {
    if (filteredPoints.length === 0) return DEFAULT_REGION;
    let minLat = Infinity;
    let maxLat = -Infinity;
    let minLng = Infinity;
    let maxLng = -Infinity;
    filteredPoints.forEach((p: HeatmapPoint) => {
      if (p.lat < minLat) minLat = p.lat;
      if (p.lat > maxLat) maxLat = p.lat;
      if (p.lng < minLng) minLng = p.lng;
      if (p.lng > maxLng) maxLng = p.lng;
    });
    const latDelta = Math.max((maxLat - minLat) * 1.4, 0.01);
    const lngDelta = Math.max((maxLng - minLng) * 1.4, 0.01);
    return {
      latitude: (minLat + maxLat) / 2,
      longitude: (minLng + maxLng) / 2,
      latitudeDelta: latDelta,
      longitudeDelta: lngDelta,
    };
  }, [filteredPoints]);

  if (isLoading) {
    return (
      <View style={[styles.container, styles.centered]}>
        <ActivityIndicator size="large" color={colors.primary} />
        <Text style={styles.loadingText}>Loading heatmap...</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <StatusBar barStyle="dark-content" backgroundColor={colors.background} />

      {/* Category filter bar */}
      <View style={[styles.filterBar, { paddingTop: insets.top > 0 ? 0 : spacing.sm }]}>
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.filterContent}
        >
          <TouchableOpacity
            style={[
              styles.filterChip,
              !selectedCategory && styles.filterChipActive,
            ]}
            onPress={() => setSelectedCategory(null)}
          >
            <Text
              style={[
                styles.filterChipText,
                !selectedCategory && styles.filterChipTextActive,
              ]}
            >
              All
            </Text>
          </TouchableOpacity>
          {categories.map((cat) => (
            <TouchableOpacity
              key={cat}
              style={[
                styles.filterChip,
                selectedCategory === cat && styles.filterChipActive,
              ]}
              onPress={() =>
                setSelectedCategory(selectedCategory === cat ? null : cat)
              }
            >
              <Text
                style={[
                  styles.filterChipText,
                  selectedCategory === cat && styles.filterChipTextActive,
                ]}
              >
                {formatCategory(cat)}
              </Text>
            </TouchableOpacity>
          ))}
        </ScrollView>
      </View>

      {/* Full-screen map */}
      <View style={styles.mapWrapper}>
        <MapView
          ref={mapRef}
          style={styles.map}
          initialRegion={region}
          showsUserLocation
          showsCompass
          mapType="standard"
        >
          {filteredPoints.map((point: HeatmapPoint, idx: number) => (
            <Circle
              key={`heat-${idx}`}
              center={{ latitude: point.lat, longitude: point.lng }}
              radius={200 + point.intensity * 400}
              fillColor={intensityToColor(point.intensity)}
              strokeColor={intensityToStroke(point.intensity)}
              strokeWidth={1}
            />
          ))}
        </MapView>

        {/* Point count badge */}
        <View style={styles.countBadge}>
          <Text style={styles.countBadgeText}>
            {filteredPoints.length} point
            {filteredPoints.length !== 1 ? 's' : ''}
          </Text>
        </View>

        {/* Legend */}
        <View style={styles.legend}>
          <Text style={styles.legendTitle}>Intensity</Text>
          <View style={styles.legendScale}>
            <View style={styles.legendGradient}>
              <View
                style={[
                  styles.legendSegment,
                  { backgroundColor: 'rgba(5, 150, 105, 0.6)' },
                ]}
              />
              <View
                style={[
                  styles.legendSegment,
                  { backgroundColor: 'rgba(251, 191, 36, 0.7)' },
                ]}
              />
              <View
                style={[
                  styles.legendSegment,
                  { backgroundColor: 'rgba(255, 107, 53, 0.75)' },
                ]}
              />
              <View
                style={[
                  styles.legendSegment,
                  { backgroundColor: 'rgba(220, 38, 38, 0.8)' },
                ]}
              />
            </View>
            <View style={styles.legendLabels}>
              <Text style={styles.legendLabel}>Low</Text>
              <Text style={styles.legendLabel}>High</Text>
            </View>
          </View>
        </View>
      </View>

      {/* Summary footer */}
      <View style={[styles.footer, { paddingBottom: Math.max(insets.bottom, spacing.md) }]}>
        <View style={styles.footerStat}>
          <Text style={styles.footerValue}>
            {heatmapData?.total_points ?? 0}
          </Text>
          <Text style={styles.footerLabel}>Total Points</Text>
        </View>
        <View style={styles.footerStat}>
          <Text style={styles.footerValue}>{categories.length}</Text>
          <Text style={styles.footerLabel}>Categories</Text>
        </View>
        <View style={styles.footerStat}>
          <Badge
            text={boundaryId}
            backgroundColor={colors.primary + '15'}
            color={colors.primary}
            size="sm"
          />
          <Text style={styles.footerLabel}>Ward</Text>
        </View>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  centered: {
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    fontSize: 14,
    color: colors.textMuted,
    marginTop: spacing.md,
  },

  // Filter bar
  filterBar: {
    backgroundColor: colors.white,
    borderBottomWidth: 1,
    borderBottomColor: colors.borderLight,
  },
  filterContent: {
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.sm,
    gap: spacing.sm,
  },
  filterChip: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs + 2,
    borderRadius: borderRadius.full,
    backgroundColor: colors.backgroundGray,
    borderWidth: 1,
    borderColor: colors.borderLight,
  },
  filterChipActive: {
    backgroundColor: colors.primary,
    borderColor: colors.primary,
  },
  filterChipText: {
    fontSize: 12,
    fontWeight: '600',
    color: colors.textSecondary,
  },
  filterChipTextActive: {
    color: colors.white,
  },

  // Map
  mapWrapper: {
    flex: 1,
    position: 'relative',
  },
  map: {
    ...StyleSheet.absoluteFillObject,
  },
  countBadge: {
    position: 'absolute',
    top: spacing.md,
    left: spacing.md,
    backgroundColor: 'rgba(0,0,0,0.7)',
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs,
    borderRadius: borderRadius.full,
  },
  countBadgeText: {
    color: colors.white,
    fontSize: 12,
    fontWeight: '600',
  },

  // Legend
  legend: {
    position: 'absolute',
    bottom: spacing.lg,
    right: spacing.md,
    backgroundColor: 'rgba(255,255,255,0.92)',
    borderRadius: borderRadius.lg,
    padding: spacing.md,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.12,
    shadowRadius: 6,
    elevation: 4,
    width: 110,
  },
  legendTitle: {
    fontSize: 11,
    fontWeight: '600',
    color: colors.textSecondary,
    marginBottom: spacing.xs,
    textAlign: 'center',
  },
  legendScale: {},
  legendGradient: {
    flexDirection: 'row',
    height: 10,
    borderRadius: 5,
    overflow: 'hidden',
  },
  legendSegment: {
    flex: 1,
  },
  legendLabels: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 3,
  },
  legendLabel: {
    fontSize: 9,
    color: colors.textMuted,
    fontWeight: '500',
  },

  // Footer
  footer: {
    flexDirection: 'row',
    backgroundColor: colors.white,
    paddingTop: spacing.md,
    paddingHorizontal: spacing.xl,
    borderTopWidth: 1,
    borderTopColor: colors.borderLight,
    justifyContent: 'space-around',
  },
  footerStat: {
    alignItems: 'center',
  },
  footerValue: {
    fontSize: 18,
    fontWeight: '700',
    color: colors.textPrimary,
  },
  footerLabel: {
    fontSize: 11,
    fontWeight: '500',
    color: colors.textMuted,
    marginTop: 2,
  },
});
