import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  StatusBar,
  ScrollView,
  TouchableOpacity,
} from 'react-native';
import { Card } from '../../components/ui/Card';
import { Badge } from '../../components/ui/Badge';
import { colors } from '../../theme/colors';
import { spacing, borderRadius } from '../../theme/spacing';

const MOCK_ZONES = [
  {
    id: 'zone-1',
    name: 'Koramangala 4th Block',
    issueCount: 12,
    severity: 'high' as const,
    topIssue: 'Potholes',
  },
  {
    id: 'zone-2',
    name: 'Koramangala 5th Block',
    issueCount: 8,
    severity: 'medium' as const,
    topIssue: 'Garbage',
  },
  {
    id: 'zone-3',
    name: 'Koramangala 1st Block',
    issueCount: 3,
    severity: 'low' as const,
    topIssue: 'Streetlight',
  },
  {
    id: 'zone-4',
    name: '80ft Road',
    issueCount: 15,
    severity: 'high' as const,
    topIssue: 'Traffic',
  },
  {
    id: 'zone-5',
    name: 'Forum Mall Area',
    issueCount: 6,
    severity: 'medium' as const,
    topIssue: 'Drainage',
  },
];

const SEVERITY_COLORS = {
  high: colors.error,
  medium: colors.warning,
  low: colors.success,
};

const MOCK_PINS = [
  { id: 'pin-1', type: 'pothole', lat: '12.9352', lng: '77.6245', label: 'Pothole' },
  { id: 'pin-2', type: 'garbage', lat: '12.9380', lng: '77.6260', label: 'Garbage' },
  { id: 'pin-3', type: 'streetlight', lat: '12.9310', lng: '77.6210', label: 'Streetlight' },
  { id: 'pin-4', type: 'water', lat: '12.9340', lng: '77.6230', label: 'Water' },
  { id: 'pin-5', type: 'drainage', lat: '12.9365', lng: '77.6255', label: 'Drainage' },
];

export const MapScreen: React.FC = () => {
  return (
    <View style={styles.container}>
      <StatusBar barStyle="dark-content" backgroundColor={colors.background} />

      <View style={styles.header}>
        <Text style={styles.headerTitle}>Area Map</Text>
        <Text style={styles.headerSubtitle}>Ward 15 - Koramangala</Text>
      </View>

      {/* Map Placeholder */}
      <View style={styles.mapPlaceholder}>
        <View style={styles.mapGrid}>
          {/* Simulated map grid */}
          <View style={[styles.mapZone, { backgroundColor: colors.error + '20', top: 20, left: 30 }]}>
            <Text style={styles.mapZoneText}>4th Block</Text>
          </View>
          <View style={[styles.mapZone, { backgroundColor: colors.warning + '20', top: 60, left: 120 }]}>
            <Text style={styles.mapZoneText}>5th Block</Text>
          </View>
          <View style={[styles.mapZone, { backgroundColor: colors.success + '20', top: 110, left: 50 }]}>
            <Text style={styles.mapZoneText}>1st Block</Text>
          </View>

          {/* Issue pins */}
          {MOCK_PINS.map((pin, i) => (
            <View
              key={pin.id}
              style={[
                styles.mapPin,
                {
                  top: 30 + (i * 35) % 130,
                  left: 40 + (i * 55) % 220,
                },
              ]}
            >
              <Text style={styles.mapPinIcon}>{'\u{1F4CD}'}</Text>
            </View>
          ))}
        </View>

        <View style={styles.mapOverlay}>
          <Text style={styles.mapOverlayIcon}>{'\u{1F5FA}'}</Text>
          <Text style={styles.mapOverlayText}>
            Interactive map with issue pins
          </Text>
          <Text style={styles.mapOverlayHint}>
            Full map requires Google Maps API key
          </Text>
        </View>
      </View>

      {/* Legend */}
      <View style={styles.legend}>
        <View style={styles.legendItem}>
          <View style={[styles.legendDot, { backgroundColor: colors.error }]} />
          <Text style={styles.legendText}>High Severity</Text>
        </View>
        <View style={styles.legendItem}>
          <View style={[styles.legendDot, { backgroundColor: colors.warning }]} />
          <Text style={styles.legendText}>Medium</Text>
        </View>
        <View style={styles.legendItem}>
          <View style={[styles.legendDot, { backgroundColor: colors.success }]} />
          <Text style={styles.legendText}>Low</Text>
        </View>
      </View>

      {/* Zone List */}
      <ScrollView
        style={styles.zoneList}
        contentContainerStyle={styles.zoneListContent}
        showsVerticalScrollIndicator={false}
      >
        <Text style={styles.zoneListTitle}>Zones by Activity</Text>
        {MOCK_ZONES.map(zone => (
          <TouchableOpacity key={zone.id} activeOpacity={0.8}>
            <Card style={styles.zoneCard}>
              <View style={styles.zoneRow}>
                <View
                  style={[
                    styles.zoneSeverity,
                    { backgroundColor: SEVERITY_COLORS[zone.severity] },
                  ]}
                />
                <View style={styles.zoneInfo}>
                  <Text style={styles.zoneName}>{zone.name}</Text>
                  <Text style={styles.zoneIssue}>Top: {zone.topIssue}</Text>
                </View>
                <Badge
                  text={`${zone.issueCount} issues`}
                  backgroundColor={SEVERITY_COLORS[zone.severity] + '15'}
                  color={SEVERITY_COLORS[zone.severity]}
                  size="sm"
                />
              </View>
            </Card>
          </TouchableOpacity>
        ))}
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  header: {
    paddingHorizontal: spacing.lg,
    paddingTop: spacing['4xl'],
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
  mapPlaceholder: {
    height: 200,
    marginHorizontal: spacing.lg,
    marginVertical: spacing.md,
    borderRadius: borderRadius.card,
    backgroundColor: colors.backgroundGray,
    overflow: 'hidden',
    position: 'relative',
  },
  mapGrid: {
    flex: 1,
    position: 'relative',
  },
  mapZone: {
    position: 'absolute',
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: borderRadius.md,
  },
  mapZoneText: {
    fontSize: 11,
    fontWeight: '500',
    color: colors.textSecondary,
  },
  mapPin: {
    position: 'absolute',
  },
  mapPinIcon: {
    fontSize: 18,
  },
  mapOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(255, 252, 248, 0.75)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  mapOverlayIcon: {
    fontSize: 32,
    marginBottom: spacing.sm,
  },
  mapOverlayText: {
    fontSize: 15,
    fontWeight: '600',
    color: colors.textPrimary,
  },
  mapOverlayHint: {
    fontSize: 12,
    color: colors.textMuted,
    marginTop: spacing.xs,
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
    marginTop: spacing.sm,
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
});
