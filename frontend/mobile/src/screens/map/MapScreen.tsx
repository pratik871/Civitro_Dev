import React, { useState, useEffect, useRef, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  StatusBar,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
} from 'react-native';
import ClusteredMapView from 'react-native-map-clustering';
import { Marker, Circle, Region } from 'react-native-maps';
import type MapView from 'react-native-maps';
import * as Location from 'expo-location';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { useTranslation } from 'react-i18next';
import { useIssues } from '../../hooks/useIssues';
import { Card } from '../../components/ui/Card';
import { Badge } from '../../components/ui/Badge';
import { colors } from '../../theme/colors';
import { spacing, borderRadius } from '../../theme/spacing';
import { ISSUE_CATEGORY_LABELS } from '../../types/issue';
import type { Issue, IssueCategory } from '../../types/issue';
import type { RootStackParamList } from '../../navigation/types';

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

const SEVERITY_WEIGHT: Record<string, number> = {
  critical: 1.0,
  high: 0.8,
  medium: 0.5,
  low: 0.3,
};

// Default to Ward 45 - Andheri East
const DEFAULT_REGION: Region = {
  latitude: 19.125,
  longitude: 72.835,
  latitudeDelta: 0.03,
  longitudeDelta: 0.03,
};

type ViewMode = 'clusters' | 'heatmap';

export const MapScreen: React.FC = () => {
  const { t } = useTranslation();
  const insets = useSafeAreaInsets();
  const navigation = useNavigation<Nav>();
  const mapRef = useRef<MapView>(null);
  const { data: issues, isLoading } = useIssues();
  const [region, setRegion] = useState<Region>(DEFAULT_REGION);
  const [locationReady, setLocationReady] = useState(false);
  const [viewMode, setViewMode] = useState<ViewMode>('clusters');

  const issuesList = issues ?? [];

  // Filter issues with valid coordinates near the ward (exclude far-away issues)
  const validIssues = useMemo(
    () => issuesList.filter(i =>
      i.latitude !== 0 && i.longitude !== 0 &&
      Math.abs(i.latitude - DEFAULT_REGION.latitude) < 0.5 &&
      Math.abs(i.longitude - DEFAULT_REGION.longitude) < 0.5
    ),
    [issuesList],
  );

  // Heatmap: group nearby issues into density cells
  const heatCells = useMemo(() => {
    if (validIssues.length === 0) return [];
    const cellSize = 0.005; // ~500m grid cells
    const grid: Record<string, { lat: number; lng: number; count: number; maxSeverity: number }> = {};
    validIssues.forEach(issue => {
      const key = `${Math.round(issue.latitude / cellSize)}_${Math.round(issue.longitude / cellSize)}`;
      if (!grid[key]) {
        grid[key] = {
          lat: Math.round(issue.latitude / cellSize) * cellSize,
          lng: Math.round(issue.longitude / cellSize) * cellSize,
          count: 0,
          maxSeverity: 0,
        };
      }
      grid[key].count += 1;
      grid[key].maxSeverity = Math.max(
        grid[key].maxSeverity,
        SEVERITY_WEIGHT[issue.priority] ?? 0.5,
      );
    });
    return Object.values(grid);
  }, [validIssues]);

  // Center map on ward issues
  useEffect(() => {
    setLocationReady(true);
  }, []);

  // Fit map to ward issues when loaded
  useEffect(() => {
    if (validIssues.length > 0 && mapRef.current) {
      const coords = validIssues.map(i => ({
        latitude: i.latitude,
        longitude: i.longitude,
      }));
      setTimeout(() => {
        mapRef.current?.fitToCoordinates(coords, {
          edgePadding: { top: 60, right: 40, bottom: 200, left: 40 },
          animated: true,
        });
      }, 500);
    }
  }, [validIssues]);

  // Group issues by category for the zone list
  const categoryGroups = useMemo(() => {
    if (issuesList.length === 0) return [];
    const grouped: Record<string, Issue[]> = {};
    issuesList.forEach(issue => {
      const cat = issue.category;
      if (!grouped[cat]) grouped[cat] = [];
      grouped[cat].push(issue);
    });
    return Object.entries(grouped)
      .map(([category, catIssues]) => {
        const priorityOrder: Record<string, number> = {
          critical: 4,
          high: 3,
          medium: 2,
          low: 1,
        };
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
  }, [issuesList]);

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
        <Text style={styles.headerTitle}>{t('map.issueMap', 'Issue Map')}</Text>
        <Text style={styles.headerSubtitle}>
          {issuesList.length > 0
            ? t('map.issuesInArea', '{{count}} issues in your area', { count: issuesList.length })
            : t('map.noIssuesNearby', 'No issues reported nearby')}
        </Text>
      </View>

      {/* View mode toggle */}
      <View style={styles.toggleRow}>
        <TouchableOpacity
          style={[
            styles.toggleBtn,
            viewMode === 'clusters' && styles.toggleBtnActive,
          ]}
          onPress={() => setViewMode('clusters')}
        >
          <Text
            style={[
              styles.toggleText,
              viewMode === 'clusters' && styles.toggleTextActive,
            ]}
          >
            {'\u{1F4CD}'} {t('map.clusters', 'Clusters')}
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[
            styles.toggleBtn,
            viewMode === 'heatmap' && styles.toggleBtnActive,
          ]}
          onPress={() => setViewMode('heatmap')}
        >
          <Text
            style={[
              styles.toggleText,
              viewMode === 'heatmap' && styles.toggleTextActive,
            ]}
          >
            {'\u{1F525}'} {t('map.heatmap', 'Heatmap')}
          </Text>
        </TouchableOpacity>
      </View>

      {/* Map */}
      <View style={styles.mapContainer}>
        <ClusteredMapView
          ref={mapRef}
          style={styles.map}
          initialRegion={region}
          showsUserLocation
          showsMyLocationButton
          showsCompass
          mapType="standard"
          clusterColor={colors.primary}
          clusterTextColor={colors.white}
          clusterFontFamily="System"
          radius={50}
          minZoomLevel={4}
          maxZoom={16}
          animationEnabled={false}
        >
          {/* Cluster markers (shown in both modes for tap interaction) */}
          {viewMode === 'clusters' &&
            validIssues.map(issue => (
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
                  (issue.priority.charAt(0).toUpperCase() +
                    issue.priority.slice(1))
                }
                onCalloutPress={() =>
                  navigation.navigate('IssueDetail', { issueId: issue.id })
                }
              />
            ))}

          {/* Heatmap overlay — density circles */}
          {viewMode === 'heatmap' &&
            heatCells.map((cell, idx) => {
              const intensity = Math.min(cell.count / 3, 1); // normalize: 3+ issues = max
              // Red-orange gradient: more issues = darker red
              const fillColor = intensity > 0.7
                ? `rgba(220, 38, 38, 0.55)`   // red - critical
                : intensity > 0.4
                ? `rgba(255, 107, 53, 0.50)`   // saffron - moderate
                : `rgba(251, 191, 36, 0.45)`;  // amber - low
              const strokeColor = intensity > 0.7
                ? `rgba(220, 38, 38, 0.8)`
                : intensity > 0.4
                ? `rgba(255, 107, 53, 0.7)`
                : `rgba(251, 191, 36, 0.6)`;
              return (
                <Circle
                  key={`heat-${idx}`}
                  center={{ latitude: cell.lat, longitude: cell.lng }}
                  radius={300 + cell.count * 120}
                  fillColor={fillColor}
                  strokeColor={strokeColor}
                  strokeWidth={2}
                />
              );
            })}
        </ClusteredMapView>

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
        {viewMode === 'clusters' ? (
          <>
            <View style={styles.legendItem}>
              <View
                style={[
                  styles.legendDot,
                  { backgroundColor: PIN_COLORS.critical },
                ]}
              />
              <Text style={styles.legendText}>{t('map.criticalHigh', 'Critical/High')}</Text>
            </View>
            <View style={styles.legendItem}>
              <View
                style={[
                  styles.legendDot,
                  { backgroundColor: PIN_COLORS.medium },
                ]}
              />
              <Text style={styles.legendText}>{t('map.medium', 'Medium')}</Text>
            </View>
            <View style={styles.legendItem}>
              <View
                style={[
                  styles.legendDot,
                  { backgroundColor: PIN_COLORS.low },
                ]}
              />
              <Text style={styles.legendText}>{t('map.low', 'Low')}</Text>
            </View>
          </>
        ) : (
          <>
            <View style={styles.legendItem}>
              <View style={[styles.legendBar, { backgroundColor: '#059669' }]} />
              <Text style={styles.legendText}>{t('map.lowDensity', 'Low density')}</Text>
            </View>
            <View style={styles.legendItem}>
              <View style={[styles.legendBar, { backgroundColor: '#D97706' }]} />
              <Text style={styles.legendText}>{t('map.medium', 'Medium')}</Text>
            </View>
            <View style={styles.legendItem}>
              <View style={[styles.legendBar, { backgroundColor: '#DC2626' }]} />
              <Text style={styles.legendText}>{t('map.highDensity', 'High density')}</Text>
            </View>
          </>
        )}
      </View>

      {/* Category breakdown list */}
      <ScrollView
        style={styles.zoneList}
        contentContainerStyle={styles.zoneListContent}
        showsVerticalScrollIndicator={false}
      >
        {categoryGroups.length > 0 ? (
          <>
            <Text style={styles.zoneListTitle}>{t('map.issuesByCategory', 'Issues by Category')}</Text>
            {categoryGroups.map(group => (
              <TouchableOpacity
                key={group.category}
                activeOpacity={0.7}
                onPress={() => {
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
              {t('map.noIssuesInArea', 'No issues reported in this area yet')}
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
  toggleRow: {
    flexDirection: 'row',
    marginHorizontal: spacing.lg,
    marginBottom: spacing.sm,
    backgroundColor: colors.backgroundGray,
    borderRadius: borderRadius.full,
    padding: 3,
  },
  toggleBtn: {
    flex: 1,
    paddingVertical: 8,
    alignItems: 'center',
    borderRadius: borderRadius.full,
  },
  toggleBtnActive: {
    backgroundColor: colors.white,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  toggleText: {
    fontSize: 13,
    fontWeight: '600',
    color: colors.textMuted,
  },
  toggleTextActive: {
    color: colors.textPrimary,
  },
  mapContainer: {
    height: 280,
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
  legendBar: {
    width: 20,
    height: 8,
    borderRadius: 2,
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
