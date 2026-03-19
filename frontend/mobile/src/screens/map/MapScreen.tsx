import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  StatusBar,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  Platform,
} from 'react-native';
import MapView, { Marker, Callout, Region } from 'react-native-maps';
import * as Location from 'expo-location';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { useIssues } from '../../hooks/useIssues';
import { Card } from '../../components/ui/Card';
import { Badge } from '../../components/ui/Badge';
import { colors } from '../../theme/colors';
import { spacing, borderRadius } from '../../theme/spacing';
import { ISSUE_CATEGORY_LABELS } from '../../types/issue';
import type { Issue, IssueCategory } from '../../types/issue';
import type { RootStackParamList } from '../../types/navigation';

type Nav = NativeStackNavigationProp<RootStackParamList>;

const SEVERITY_COLORS: Record<string, string> = {
  critical: colors.error,
  high: colors.error,
  medium: colors.warning,
  low: colors.success,
};

const PIN_COLORS: Record<string, string> = {
  critical: '#DC2626',
  high: '#EA580C',
  medium: '#D97706',
  low: '#059669',
};

// Default to Mumbai center
const DEFAULT_REGION: Region = {
  latitude: 19.076,
  longitude: 72.8777,
  latitudeDelta: 0.05,
  longitudeDelta: 0.05,
};

export const MapScreen: React.FC = () => {
  const insets = useSafeAreaInsets();
  const navigation = useNavigation<Nav>();
  const mapRef = useRef<MapView>(null);
  const { data: issues, isLoading } = useIssues();
  const [region, setRegion] = useState<Region>(DEFAULT_REGION);
  const [locationReady, setLocationReady] = useState(false);

  const issuesList = issues ?? [];

  // Get user location to center map
  useEffect(() => {
    (async () => {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status === 'granted') {
        try {
          const loc = await Location.getCurrentPositionAsync({
            accuracy: Location.Accuracy.Balanced,
          });
          setRegion({
            latitude: loc.coords.latitude,
            longitude: loc.coords.longitude,
            latitudeDelta: 0.04,
            longitudeDelta: 0.04,
          });
        } catch {
          // Keep default region
        }
      }
      setLocationReady(true);
    })();
  }, []);

  // Fit map to all issue markers
  useEffect(() => {
    if (locationReady && issuesList.length > 0 && mapRef.current) {
      const coords = issuesList
        .filter(i => i.latitude !== 0 && i.longitude !== 0)
        .map(i => ({ latitude: i.latitude, longitude: i.longitude }));
      if (coords.length > 0) {
        mapRef.current.fitToCoordinates(coords, {
          edgePadding: { top: 60, right: 40, bottom: 200, left: 40 },
          animated: true,
        });
      }
    }
  }, [locationReady, issuesList]);

  // Group issues by category for the zone list
  const categoryGroups = (() => {
    if (issuesList.length === 0) return [];
    const grouped: Record<string, Issue[]> = {};
    issuesList.forEach(issue => {
      const cat = issue.category;
      if (!grouped[cat]) grouped[cat] = [];
      grouped[cat].push(issue);
    });
    return Object.entries(grouped)
      .map(([category, catIssues]) => {
        const priorityOrder: Record<string, number> = { critical: 4, high: 3, medium: 2, low: 1 };
        const maxPriority = catIssues.reduce(
          (max, issue) => Math.max(max, priorityOrder[issue.priority] || 0),
          0,
        );
        const severity =
          maxPriority >= 3 ? 'high' : maxPriority === 2 ? 'medium' : 'low';
        return {
          category: category as IssueCategory,
          label:
            ISSUE_CATEGORY_LABELS[category as IssueCategory] || category,
          issueCount: catIssues.length,
          severity: severity as 'high' | 'medium' | 'low',
          issues: catIssues,
          color:
            colors.issueCategories[category as IssueCategory] ||
            colors.textMuted,
        };
      })
      .sort((a, b) => b.issueCount - a.issueCount);
  })();

  if (isLoading && !locationReady) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={colors.primary} />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <StatusBar barStyle="dark-content" backgroundColor={colors.background} />

      <View style={[styles.header, { paddingTop: insets.top + spacing.sm }]}>
        <Text style={styles.headerTitle}>Issue Map</Text>
        <Text style={styles.headerSubtitle}>
          {issuesList.length > 0
            ? `${issuesList.length} issue${issuesList.length !== 1 ? 's' : ''} in your area`
            : 'No issues reported nearby'}
        </Text>
      </View>

      {/* Map */}
      <View style={styles.mapContainer}>
        <MapView
          ref={mapRef}
          style={styles.map}
          initialRegion={region}
          showsUserLocation
          showsMyLocationButton
          showsCompass
          mapType="standard"
        >
          {issuesList
            .filter(i => i.latitude !== 0 && i.longitude !== 0)
            .map(issue => (
              <Marker
                key={issue.id}
                coordinate={{
                  latitude: issue.latitude,
                  longitude: issue.longitude,
                }}
                pinColor={PIN_COLORS[issue.priority] || PIN_COLORS.medium}
                title={issue.title}
                description={
                  ISSUE_CATEGORY_LABELS[issue.category] +
                  ' \u2022 ' +
                  issue.priority.charAt(0).toUpperCase() +
                  issue.priority.slice(1)
                }
                onCalloutPress={() =>
                  navigation.navigate('IssueDetail', { issueId: issue.id })
                }
              />
            ))}
        </MapView>

        {/* Issue count badge overlay */}
        {issuesList.length > 0 && (
          <View style={styles.mapBadge}>
            <Text style={styles.mapBadgeText}>
              {issuesList.length} issue{issuesList.length !== 1 ? 's' : ''}
            </Text>
          </View>
        )}
      </View>

      {/* Legend */}
      <View style={styles.legend}>
        <View style={styles.legendItem}>
          <View style={[styles.legendDot, { backgroundColor: PIN_COLORS.critical }]} />
          <Text style={styles.legendText}>Critical/High</Text>
        </View>
        <View style={styles.legendItem}>
          <View style={[styles.legendDot, { backgroundColor: PIN_COLORS.medium }]} />
          <Text style={styles.legendText}>Medium</Text>
        </View>
        <View style={styles.legendItem}>
          <View style={[styles.legendDot, { backgroundColor: PIN_COLORS.low }]} />
          <Text style={styles.legendText}>Low</Text>
        </View>
      </View>

      {/* Category breakdown list */}
      <ScrollView
        style={styles.zoneList}
        contentContainerStyle={styles.zoneListContent}
        showsVerticalScrollIndicator={false}
      >
        {categoryGroups.length > 0 ? (
          <>
            <Text style={styles.zoneListTitle}>Issues by Category</Text>
            {categoryGroups.map(group => (
              <TouchableOpacity
                key={group.category}
                activeOpacity={0.7}
                onPress={() => {
                  // Navigate to the first issue in this category
                  if (group.issues.length > 0) {
                    navigation.navigate('IssueDetail', {
                      issueId: group.issues[0].id,
                    });
                  }
                }}
              >
                <Card style={styles.zoneCard}>
                  <View style={styles.zoneRow}>
                    <View
                      style={[
                        styles.zoneSeverity,
                        { backgroundColor: group.color },
                      ]}
                    />
                    <View style={styles.zoneInfo}>
                      <Text style={styles.zoneName}>{group.label}</Text>
                      <Text style={styles.zoneIssue}>
                        Highest: {group.severity}
                      </Text>
                    </View>
                    <Badge
                      text={`${group.issueCount} issue${group.issueCount !== 1 ? 's' : ''}`}
                      backgroundColor={
                        SEVERITY_COLORS[group.severity] + '15'
                      }
                      color={SEVERITY_COLORS[group.severity]}
                      size="sm"
                    />
                  </View>
                </Card>
              </TouchableOpacity>
            ))}
          </>
        ) : (
          <View style={styles.emptyContainer}>
            <Text style={styles.emptyIcon}>{'\u{1F5FA}'}</Text>
            <Text style={styles.emptyText}>
              No issues reported in this area yet
            </Text>
          </View>
        )}
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  loadingContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.background,
  },
  header: {
    paddingHorizontal: spacing.lg,
    paddingBottom: spacing.sm,
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: '700',
    color: colors.textPrimary,
  },
  headerSubtitle: {
    fontSize: 14,
    color: colors.textMuted,
    marginTop: 2,
  },
  mapContainer: {
    height: 260,
    marginHorizontal: spacing.lg,
    marginVertical: spacing.sm,
    borderRadius: borderRadius.card,
    overflow: 'hidden',
    position: 'relative',
  },
  map: {
    ...StyleSheet.absoluteFillObject,
  },
  mapBadge: {
    position: 'absolute',
    top: spacing.sm,
    left: spacing.sm,
    backgroundColor: 'rgba(0,0,0,0.7)',
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs,
    borderRadius: borderRadius.full,
  },
  mapBadgeText: {
    color: colors.white,
    fontSize: 12,
    fontWeight: '600',
  },
  legend: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: spacing.xl,
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.lg,
  },
  legendItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
  },
  legendDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
  },
  legendText: {
    fontSize: 12,
    color: colors.textMuted,
    fontWeight: '500',
  },
  zoneList: {
    flex: 1,
  },
  zoneListContent: {
    paddingHorizontal: spacing.lg,
    paddingBottom: spacing['3xl'],
  },
  zoneListTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.textPrimary,
    marginBottom: spacing.md,
    marginTop: spacing.xs,
  },
  zoneCard: {
    marginBottom: spacing.sm,
  },
  zoneRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  zoneSeverity: {
    width: 4,
    height: 36,
    borderRadius: 2,
    marginRight: spacing.md,
  },
  zoneInfo: {
    flex: 1,
  },
  zoneName: {
    fontSize: 15,
    fontWeight: '600',
    color: colors.textPrimary,
  },
  zoneIssue: {
    fontSize: 12,
    color: colors.textMuted,
    marginTop: 1,
  },
  emptyContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingTop: 60,
  },
  emptyIcon: {
    fontSize: 48,
    marginBottom: spacing.md,
  },
  emptyText: {
    fontSize: 16,
    color: colors.textMuted,
    textAlign: 'center',
  },
});
