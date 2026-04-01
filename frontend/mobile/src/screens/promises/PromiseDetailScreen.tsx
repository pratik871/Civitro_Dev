import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  StatusBar,
  ActivityIndicator,
  TouchableOpacity,
  Linking,
} from 'react-native';
import { useRoute, useNavigation, RouteProp } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { Card } from '../../components/ui/Card';
import { Badge } from '../../components/ui/Badge';
import { Avatar } from '../../components/ui/Avatar';
import { usePromiseDetail } from '../../hooks/usePromises';
import type { PromiseStatus } from '../../hooks/usePromises';
import { colors } from '../../theme/colors';
import { spacing, borderRadius } from '../../theme/spacing';
import { formatDate, formatRelativeTime } from '../../lib/utils';
import type { RootStackParamList } from '../../navigation/types';

type DetailRouteProp = RouteProp<RootStackParamList, 'PromiseDetail'>;
type NavigationProp = NativeStackNavigationProp<RootStackParamList>;

const STATUS_CONFIG: Record<PromiseStatus, { color: string; label: string; icon: string }> = {
  detected: { color: colors.textMuted, label: 'Detected', icon: '\uD83D\uDD0D' },
  on_track: { color: colors.warning, label: 'On Track', icon: '\uD83C\uDFD7' },
  delayed: { color: '#EA580C', label: 'Delayed', icon: '\u26A0\uFE0F' },
  fulfilled: { color: colors.success, label: 'Fulfilled', icon: '\u2705' },
  broken: { color: colors.error, label: 'Broken', icon: '\u274C' },
};

const SOURCE_LABELS: Record<string, string> = {
  speech: 'Speech',
  interview: 'Interview',
  manifesto: 'Manifesto',
  social_media: 'Social Media',
  news: 'News',
};

export const PromiseDetailScreen: React.FC = () => {
  const route = useRoute<DetailRouteProp>();
  const navigation = useNavigation<NavigationProp>();
  const { promiseId } = route.params;
  const { data: promise, isLoading } = usePromiseDetail(promiseId);

  if (isLoading) {
    return (
      <View style={[styles.container, styles.centered]}>
        <ActivityIndicator size="large" color={colors.primary} />
      </View>
    );
  }

  if (!promise) {
    return (
      <View style={[styles.container, styles.centered]}>
        <Text style={styles.emptyText}>Promise not found</Text>
      </View>
    );
  }

  const statusConfig = STATUS_CONFIG[promise.status] ?? STATUS_CONFIG.detected;
  const confidencePct = Math.round(promise.confidence * 100);
  const isAIExtracted =
    promise.source_type === 'speech' ||
    promise.source_type === 'news' ||
    promise.source_type === 'interview';

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={styles.content}
      showsVerticalScrollIndicator={false}
    >
      <StatusBar barStyle="dark-content" backgroundColor={colors.background} />

      {/* Status hero */}
      <Card style={[styles.statusCard, { borderLeftColor: statusConfig.color }]}>
        <View style={styles.statusRow}>
          <View
            style={[styles.statusDot, { backgroundColor: statusConfig.color }]}
          />
          <Text style={[styles.statusLabel, { color: statusConfig.color }]}>
            {statusConfig.icon} {statusConfig.label}
          </Text>
        </View>
        <Text style={styles.title}>{promise.title}</Text>
      </Card>

      {/* Leader info */}
      <Card style={styles.leaderCard}>
        <TouchableOpacity
          style={styles.leaderRow}
          onPress={() => {
            if (promise.leader_id) {
              navigation.navigate('LeaderProfile', { leaderId: promise.leader_id });
            }
          }}
          activeOpacity={0.7}
        >
          <Avatar name={promise.leader_name || 'Leader'} size={44} />
          <View style={styles.leaderInfo}>
            <Text style={styles.leaderName}>
              {promise.leader_name || 'Unknown Leader'}
            </Text>
            <Text style={styles.leaderSubtext}>Tap to view profile</Text>
          </View>
          <Text style={styles.chevron}>{'\u203A'}</Text>
        </TouchableOpacity>
      </Card>

      {/* Description */}
      <Card style={styles.sectionCard}>
        <Text style={styles.sectionTitle}>Description</Text>
        <Text style={styles.descriptionText}>{promise.description}</Text>
      </Card>

      {/* Source & detection info */}
      <Card style={styles.sectionCard}>
        <Text style={styles.sectionTitle}>Source Information</Text>
        <View style={styles.infoRow}>
          <Text style={styles.infoLabel}>Source Type</Text>
          <Badge
            text={SOURCE_LABELS[promise.source_type] || promise.source_type}
            backgroundColor={colors.navy + '10'}
            color={colors.navy}
            size="sm"
          />
        </View>
        {isAIExtracted && (
          <View style={styles.infoRow}>
            <Text style={styles.infoLabel}>Detection</Text>
            <Badge
              text="AI Extracted"
              backgroundColor={colors.info + '15'}
              color={colors.info}
              size="sm"
            />
          </View>
        )}
        <View style={styles.infoRow}>
          <Text style={styles.infoLabel}>First Detected</Text>
          <Text style={styles.infoValue}>{formatDate(promise.created_at)}</Text>
        </View>
        <View style={styles.infoRow}>
          <Text style={styles.infoLabel}>Last Updated</Text>
          <Text style={styles.infoValue}>
            {formatRelativeTime(promise.updated_at || promise.created_at)}
          </Text>
        </View>
      </Card>

      {/* Confidence */}
      <Card style={styles.sectionCard}>
        <Text style={styles.sectionTitle}>Confidence Score</Text>
        <View style={styles.confidenceContainer}>
          <View style={styles.confidenceBarBg}>
            <View
              style={[
                styles.confidenceBarFill,
                {
                  width: `${confidencePct}%`,
                  backgroundColor:
                    confidencePct >= 75
                      ? colors.success
                      : confidencePct >= 50
                      ? colors.warning
                      : colors.error,
                },
              ]}
            />
          </View>
          <Text style={styles.confidenceLabel}>{confidencePct}%</Text>
        </View>
        <Text style={styles.confidenceHint}>
          {confidencePct >= 75
            ? 'High confidence — strong evidence supports this promise attribution.'
            : confidencePct >= 50
            ? 'Moderate confidence — some evidence supports this attribution.'
            : 'Low confidence — limited evidence; this may need verification.'}
        </Text>
      </Card>

      {/* Evidence link */}
      {promise.evidence_url ? (
        <Card style={styles.sectionCard}>
          <Text style={styles.sectionTitle}>Evidence</Text>
          <TouchableOpacity
            style={styles.evidenceBtn}
            onPress={() => Linking.openURL(promise.evidence_url!)}
            activeOpacity={0.7}
          >
            <Text style={styles.evidenceIcon}>{'\uD83D\uDD17'}</Text>
            <Text style={styles.evidenceText} numberOfLines={1}>
              {promise.evidence_url}
            </Text>
          </TouchableOpacity>
        </Card>
      ) : null}

      {/* Status timeline */}
      {promise.status_history && promise.status_history.length > 0 ? (
        <Card style={styles.sectionCard}>
          <Text style={styles.sectionTitle}>Status Timeline</Text>
          {promise.status_history.map((entry, idx) => {
            const entryConfig = STATUS_CONFIG[entry.status] ?? STATUS_CONFIG.detected;
            const isLast = idx === promise.status_history!.length - 1;
            return (
              <View key={`${entry.status}-${entry.changed_at}`} style={styles.timelineItem}>
                <View style={styles.timelineLine}>
                  <View
                    style={[
                      styles.timelineDot,
                      { backgroundColor: entryConfig.color },
                    ]}
                  />
                  {!isLast && (
                    <View style={styles.timelineConnector} />
                  )}
                </View>
                <View style={styles.timelineContent}>
                  <View style={styles.timelineHeader}>
                    <Text
                      style={[styles.timelineStatus, { color: entryConfig.color }]}
                    >
                      {entryConfig.icon} {entryConfig.label}
                    </Text>
                    <Text style={styles.timelineDate}>
                      {formatDate(entry.changed_at)}
                    </Text>
                  </View>
                  {entry.note ? (
                    <Text style={styles.timelineNote}>{entry.note}</Text>
                  ) : null}
                </View>
              </View>
            );
          })}
        </Card>
      ) : null}

      {/* Disclaimer */}
      <Card style={styles.disclaimerCard}>
        <Text style={styles.disclaimerIcon}>{'\uD83E\uDD16'}</Text>
        <Text style={styles.disclaimerText}>
          Promise tracking is powered by AI analysis of public speeches, media reports,
          and official documents. Confidence scores reflect the strength of source
          attribution. Community verification helps improve accuracy.
        </Text>
      </Card>
    </ScrollView>
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
  emptyText: {
    fontSize: 16,
    color: colors.textMuted,
    textAlign: 'center',
  },
  content: {
    padding: spacing.lg,
    paddingBottom: spacing['3xl'],
  },
  // Status hero
  statusCard: {
    borderLeftWidth: 4,
    marginBottom: spacing.md,
  },
  statusRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: spacing.sm,
  },
  statusDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    marginRight: spacing.sm,
  },
  statusLabel: {
    fontSize: 14,
    fontWeight: '600',
  },
  title: {
    fontSize: 20,
    fontWeight: '700',
    color: colors.textPrimary,
    lineHeight: 28,
  },
  // Leader
  leaderCard: {
    marginBottom: spacing.md,
  },
  leaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  leaderInfo: {
    flex: 1,
    marginLeft: spacing.md,
  },
  leaderName: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.textPrimary,
  },
  leaderSubtext: {
    fontSize: 12,
    color: colors.textMuted,
    marginTop: 2,
  },
  chevron: {
    fontSize: 24,
    color: colors.textMuted,
    paddingLeft: spacing.sm,
  },
  // Sections
  sectionCard: {
    marginBottom: spacing.md,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.textPrimary,
    marginBottom: spacing.md,
  },
  descriptionText: {
    fontSize: 15,
    color: colors.textSecondary,
    lineHeight: 22,
  },
  // Info rows
  infoRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: colors.borderLight,
  },
  infoLabel: {
    fontSize: 14,
    color: colors.textMuted,
  },
  infoValue: {
    fontSize: 14,
    fontWeight: '500',
    color: colors.textPrimary,
  },
  // Confidence
  confidenceContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    marginBottom: spacing.sm,
  },
  confidenceBarBg: {
    flex: 1,
    height: 10,
    backgroundColor: colors.backgroundGray,
    borderRadius: 5,
    overflow: 'hidden',
  },
  confidenceBarFill: {
    height: '100%',
    borderRadius: 5,
  },
  confidenceLabel: {
    fontSize: 18,
    fontWeight: '700',
    color: colors.textPrimary,
    width: 48,
    textAlign: 'right',
  },
  confidenceHint: {
    fontSize: 13,
    color: colors.textMuted,
    lineHeight: 18,
  },
  // Evidence
  evidenceBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.info + '08',
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.md,
    borderRadius: borderRadius.md,
    gap: spacing.sm,
  },
  evidenceIcon: {
    fontSize: 16,
  },
  evidenceText: {
    flex: 1,
    fontSize: 14,
    color: colors.info,
    textDecorationLine: 'underline',
  },
  // Timeline
  timelineItem: {
    flexDirection: 'row',
    minHeight: 48,
  },
  timelineLine: {
    width: 24,
    alignItems: 'center',
  },
  timelineDot: {
    width: 12,
    height: 12,
    borderRadius: 6,
    marginTop: 4,
    zIndex: 1,
  },
  timelineConnector: {
    width: 2,
    flex: 1,
    backgroundColor: colors.border,
    marginTop: 2,
  },
  timelineContent: {
    flex: 1,
    paddingLeft: spacing.sm,
    paddingBottom: spacing.lg,
  },
  timelineHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.xs,
  },
  timelineStatus: {
    fontSize: 14,
    fontWeight: '600',
  },
  timelineDate: {
    fontSize: 12,
    color: colors.textMuted,
  },
  timelineNote: {
    fontSize: 13,
    color: colors.textSecondary,
    lineHeight: 18,
  },
  // Disclaimer
  disclaimerCard: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: spacing.sm,
    backgroundColor: colors.info + '08',
  },
  disclaimerIcon: {
    fontSize: 16,
    marginTop: 2,
  },
  disclaimerText: {
    flex: 1,
    fontSize: 13,
    color: colors.info,
    lineHeight: 18,
  },
});
