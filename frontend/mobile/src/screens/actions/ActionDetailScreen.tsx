import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  StatusBar,
  TouchableOpacity,
  Image,
  Alert,
  Share,
} from 'react-native';
import { useRoute, useNavigation, RouteProp } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { Card } from '../../components/ui/Card';
import { Badge } from '../../components/ui/Badge';
import { Avatar } from '../../components/ui/Avatar';
import { TranslatedText } from '../../components/ui/TranslatedText';
import { Button } from '../../components/ui/Button';
import { colors } from '../../theme/colors';
import { spacing, borderRadius } from '../../theme/spacing';
import { formatRelativeTime, formatNumber } from '../../lib/utils';
import { useAction, useActionTimeline, useSupportAction, useVerifyAction } from '../../hooks/useCommunityActions';
import { useAuthStore } from '../../stores/authStore';
import {
  ACTION_STATUS_LABELS,
  ACTION_STATUS_COLORS,
  RESPONSE_TYPE_LABELS,
} from '../../types/action';
import type { ActionEvidence, ActionResponse, ActionTimelineEntry } from '../../types/action';
import type { RootStackParamList } from '../../navigation/types';

type DetailRouteProp = RouteProp<RootStackParamList, 'ActionDetail'>;
type NavProp = NativeStackNavigationProp<RootStackParamList>;

export const ActionDetailScreen: React.FC = () => {
  const route = useRoute<DetailRouteProp>();
  const navigation = useNavigation<NavProp>();
  const { data, isLoading, error } = useAction(route.params.actionId);
  const { data: timeline } = useActionTimeline(route.params.actionId);
  const supportMutation = useSupportAction();
  const verifyMutation = useVerifyAction();
  const currentUser = useAuthStore(s => s.user);
  const [hasSupported, setHasSupported] = useState<boolean | null>(null);

  if (error) {
    return (
      <View style={styles.loadingContainer}>
        <Text style={styles.loadingText}>Failed to load action</Text>
        <Text style={[styles.loadingText, { fontSize: 13, marginTop: 8 }]}>
          {error instanceof Error ? error.message : 'Network error'}
        </Text>
      </View>
    );
  }

  if (isLoading || !data) {
    return (
      <View style={styles.loadingContainer}>
        <Text style={styles.loadingText}>Loading action...</Text>
      </View>
    );
  }

  const { action, evidence, responses, verifications } = data;
  const supported = hasSupported !== null ? hasSupported : action.hasSupported;
  const statusColor = ACTION_STATUS_COLORS[action.status];
  const progress = Math.min(action.supportCount / Math.max(action.supportGoal, 1), 1);
  const isResolved = action.status === 'resolved' || action.status === 'verified';

  const handleSupport = () => {
    const prev = supported;
    setHasSupported(!prev);
    supportMutation.mutate(
      { actionId: action.id, support: !prev },
      {
        onError: () => {
          setHasSupported(prev);
          Alert.alert('Error', 'Could not update support. Please try again.');
        },
      },
    );
  };

  const handleShare = async () => {
    try {
      await Share.share({
        title: `Community Action: ${action.title}`,
        message: `Support this community action: "${action.title}" -- ${action.supportCount} supporters and counting. Join us on Civitro!`,
      });
    } catch {
      // user cancelled
    }
  };

  const handleVerify = (verified: boolean) => {
    verifyMutation.mutate(
      { actionId: action.id, verified },
      {
        onSuccess: () =>
          Alert.alert('Thank You', 'Your verification has been recorded.'),
        onError: (err: Error) =>
          Alert.alert('Error', err.message || 'Could not submit verification.'),
      },
    );
  };

  const recentTimeline = (timeline ?? []).slice(0, 5);

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={styles.content}
      showsVerticalScrollIndicator={false}
    >
      <StatusBar barStyle="dark-content" backgroundColor={colors.background} />

      {/* Status + Title Section */}
      <View style={styles.titleSection}>
        <View style={styles.statusRow}>
          <Badge
            text={ACTION_STATUS_LABELS[action.status]}
            backgroundColor={statusColor + '15'}
            color={statusColor}
            size="md"
          />
          <Badge
            text={action.escalationLevel.toUpperCase()}
            backgroundColor={colors.navy + '10'}
            color={colors.navy}
            size="sm"
          />
        </View>

        <TranslatedText text={action.title} style={styles.title} />
        <TranslatedText text={action.description} style={styles.description} />

        {action.desiredOutcome ? (
          <View style={styles.outcomeBox}>
            <Text style={styles.outcomeLabel}>DESIRED OUTCOME</Text>
            <TranslatedText text={action.desiredOutcome} style={styles.outcomeText} />
          </View>
        ) : null}

        <View style={styles.creatorRow}>
          <Avatar name={action.creatorName} size={28} />
          <Text style={styles.creatorText}>
            Started by <Text style={styles.creatorName}>{action.creatorName}</Text>
          </Text>
          <Text style={styles.timeText}>{formatRelativeTime(action.createdAt)}</Text>
        </View>
      </View>

      {/* Support Progress */}
      <Card style={styles.supportCard}>
        <View style={styles.supportHeader}>
          <Text style={styles.sectionTitle}>Community Support</Text>
          <Text style={styles.supportCount}>
            {formatNumber(action.supportCount)} / {formatNumber(action.supportGoal)}
          </Text>
        </View>
        <View style={styles.progressTrack}>
          <View style={[styles.progressFill, { width: `${progress * 100}%` }]} />
        </View>
        <Text style={styles.progressPercent}>
          {Math.round(progress * 100)}% of goal reached
        </Text>

        {/* Support button */}
        <TouchableOpacity
          style={[styles.supportButton, supported && styles.supportButtonActive]}
          onPress={handleSupport}
          disabled={supportMutation.isPending}
          activeOpacity={0.8}
        >
          <Text style={[styles.supportButtonIcon, supported && styles.supportButtonIconActive]}>
            {supported ? '\u2714' : '\u270B'}
          </Text>
          <Text style={[styles.supportButtonText, supported && styles.supportButtonTextActive]}>
            {supported ? 'You Support This' : 'Support This Action'}
          </Text>
        </TouchableOpacity>
      </Card>

      {/* Actions Row */}
      <View style={styles.actionsRow}>
        <TouchableOpacity style={styles.actionButton} onPress={handleShare}>
          <Text style={styles.actionIcon}>{'\u{1F4E4}'}</Text>
          <Text style={styles.actionText}>Share</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={styles.actionButton}
          onPress={() => navigation.navigate('ActionTimeline', { actionId: action.id })}
        >
          <Text style={styles.actionIcon}>{'\u{1F4C5}'}</Text>
          <Text style={styles.actionText}>Timeline</Text>
        </TouchableOpacity>
      </View>

      {/* Evidence Section */}
      <Card style={styles.sectionCard}>
        <Text style={styles.sectionTitle}>Evidence Package</Text>
        <Text style={styles.sectionSubtitle}>
          {evidence.length} linked issue{evidence.length !== 1 ? 's' : ''}
        </Text>

        {evidence.length > 0 ? (
          evidence.map((ev: ActionEvidence) => (
            <TouchableOpacity
              key={ev.id}
              style={styles.evidenceItem}
              onPress={() => navigation.navigate('IssueDetail', { issueId: ev.issueId })}
            >
              {ev.issuePhotoUrl ? (
                <Image source={{ uri: ev.issuePhotoUrl }} style={styles.evidencePhoto} />
              ) : (
                <View style={styles.evidencePhotoPlaceholder}>
                  <Text style={styles.evidencePhotoIcon}>{'\u{1F4F7}'}</Text>
                </View>
              )}
              <View style={styles.evidenceInfo}>
                <Text style={styles.evidenceTitle} numberOfLines={1}>
                  {ev.issueTitle}
                </Text>
                <Text style={styles.evidenceMeta}>
                  {ev.issueCategory.replace('_', ' ')} {ev.autoLinked ? '(auto-linked)' : ''}
                </Text>
              </View>
              <Text style={styles.chevron}>{'\u203A'}</Text>
            </TouchableOpacity>
          ))
        ) : (
          <Text style={styles.noContent}>No evidence linked yet.</Text>
        )}
      </Card>

      {/* Economic Impact */}
      {action.economicImpact && (
        <Card style={styles.economicCard}>
          <Text style={styles.sectionTitle}>Economic Impact</Text>
          <Text style={styles.sectionSubtitle}>
            Auto-calculated from linked evidence
          </Text>

          <View style={styles.impactGrid}>
            <View style={styles.impactItem}>
              <Text style={styles.impactLabel}>Cost of Inaction</Text>
              <Text style={[styles.impactValue, { color: colors.error }]}>
                {'\u20B9'} {formatNumber(action.economicImpact.costOfInaction)}
              </Text>
            </View>
            <View style={styles.impactItem}>
              <Text style={styles.impactLabel}>Cost to Resolve</Text>
              <Text style={[styles.impactValue, { color: colors.success }]}>
                {'\u20B9'} {formatNumber(action.economicImpact.costOfResolution)}
              </Text>
            </View>
            <View style={styles.impactItemFull}>
              <Text style={styles.impactLabel}>ROI Ratio</Text>
              <Text style={[styles.impactValue, { color: colors.saffron }]}>
                {action.economicImpact.roiRatio.toFixed(1)}:1
              </Text>
              <Text style={styles.impactNote}>
                Every {'\u20B9'}1 spent saves {'\u20B9'}{action.economicImpact.roiRatio.toFixed(1)}
              </Text>
            </View>
          </View>

          {action.economicImpact.comparison && (
            <View style={styles.comparisonBox}>
              <Text style={styles.comparisonIcon}>{'\u{1F4CA}'}</Text>
              <Text style={styles.comparisonText}>{action.economicImpact.comparison}</Text>
            </View>
          )}
        </Card>
      )}

      {/* Stakeholder Responses */}
      <Card style={styles.sectionCard}>
        <Text style={styles.sectionTitle}>Stakeholder Responses</Text>
        <Text style={styles.sectionSubtitle}>
          Directed to: {action.targetAuthorityName}
        </Text>

        {responses.length > 0 ? (
          responses.map((resp: ActionResponse) => (
            <View key={resp.id} style={styles.responseItem}>
              <View style={styles.responseHeader}>
                <Avatar name={resp.responderName} size={32} />
                <View style={styles.responseInfo}>
                  <Text style={styles.responseName}>{resp.responderName}</Text>
                  <Text style={styles.responseRole}>{resp.responderRole}</Text>
                </View>
                <Badge
                  text={RESPONSE_TYPE_LABELS[resp.responseType]}
                  backgroundColor={
                    resp.responseType === 'reject'
                      ? colors.error + '15'
                      : resp.responseType === 'resolve'
                      ? colors.success + '15'
                      : colors.info + '15'
                  }
                  color={
                    resp.responseType === 'reject'
                      ? colors.error
                      : resp.responseType === 'resolve'
                      ? colors.success
                      : colors.info
                  }
                  size="sm"
                />
              </View>
              <TranslatedText text={resp.content} style={styles.responseContent} />
              <Text style={styles.responseTime}>{formatRelativeTime(resp.createdAt)}</Text>
            </View>
          ))
        ) : (
          <View style={styles.noResponseBox}>
            <Text style={styles.noResponseIcon}>{'\u23F3'}</Text>
            <Text style={styles.noResponseText}>Awaiting stakeholder response</Text>
          </View>
        )}
      </Card>

      {/* Recent Timeline */}
      <Card style={styles.sectionCard}>
        <View style={styles.timelineHeader}>
          <Text style={styles.sectionTitle}>Timeline</Text>
          <TouchableOpacity
            onPress={() => navigation.navigate('ActionTimeline', { actionId: action.id })}
          >
            <Text style={styles.viewAllText}>View All</Text>
          </TouchableOpacity>
        </View>

        {recentTimeline.length > 0 ? (
          recentTimeline.map((entry: ActionTimelineEntry) => {
            const entryColor =
              entry.actorType === 'citizen'
                ? colors.saffron
                : entry.actorType === 'stakeholder'
                ? colors.navy
                : colors.textMuted;
            return (
              <View key={entry.id} style={styles.timelineItem}>
                <View style={[styles.timelineDot, { backgroundColor: entryColor }]} />
                <View style={styles.timelineContent}>
                  <Text style={styles.timelineActor}>{entry.actorName}</Text>
                  <Text style={styles.timelineText}>{entry.content}</Text>
                  <Text style={styles.timelineTime}>
                    {formatRelativeTime(entry.createdAt)}
                  </Text>
                </View>
              </View>
            );
          })
        ) : (
          <Text style={styles.noContent}>No timeline entries yet.</Text>
        )}
      </Card>

      {/* Verification section for resolved actions */}
      {action.status === 'resolved' && (
        <Card style={styles.verifyCard}>
          <Text style={styles.verifyTitle}>Verify Resolution</Text>
          <Text style={styles.verifyDesc}>
            Has this community action been truly resolved? Your verification helps maintain accountability.
          </Text>
          <View style={styles.verifyButtons}>
            <Button
              title="Yes, Verified"
              onPress={() => handleVerify(true)}
              variant="primary"
              size="md"
              loading={verifyMutation.isPending}
              style={styles.verifyButtonItem}
            />
            <Button
              title="Not Resolved"
              onPress={() => handleVerify(false)}
              variant="outline"
              size="md"
              loading={verifyMutation.isPending}
              style={styles.verifyButtonItem}
            />
          </View>

          {verifications.length > 0 && (
            <View style={styles.verificationsCount}>
              <Text style={styles.verificationsText}>
                {verifications.filter(v => v.verified).length} of{' '}
                {verifications.length} verifiers confirmed resolution
              </Text>
            </View>
          )}
        </Card>
      )}

      <View style={{ height: 40 }} />
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  content: {
    paddingBottom: spacing['3xl'],
  },
  loadingContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.background,
  },
  loadingText: {
    fontSize: 16,
    color: colors.textMuted,
  },

  // Title section
  titleSection: {
    padding: spacing.lg,
  },
  statusRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    marginBottom: spacing.md,
  },
  title: {
    fontSize: 22,
    fontWeight: '700',
    color: colors.textPrimary,
    lineHeight: 28,
    marginBottom: spacing.sm,
  },
  description: {
    fontSize: 15,
    color: colors.textSecondary,
    lineHeight: 22,
    marginBottom: spacing.md,
  },
  outcomeBox: {
    backgroundColor: colors.saffron + '08',
    borderLeftWidth: 3,
    borderLeftColor: colors.saffron,
    padding: spacing.md,
    borderRadius: borderRadius.sm,
    marginBottom: spacing.md,
  },
  outcomeLabel: {
    fontSize: 11,
    fontWeight: '600',
    color: colors.saffron,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: spacing.xs,
  },
  outcomeText: {
    fontSize: 14,
    color: colors.textPrimary,
    lineHeight: 20,
  },
  creatorRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  creatorText: {
    fontSize: 13,
    color: colors.textMuted,
    flex: 1,
  },
  creatorName: {
    fontWeight: '600',
    color: colors.textSecondary,
  },
  timeText: {
    fontSize: 12,
    color: colors.textMuted,
  },

  // Support card
  supportCard: {
    marginHorizontal: spacing.lg,
    marginBottom: spacing.md,
  },
  supportHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: spacing.sm,
  },
  supportCount: {
    fontSize: 15,
    fontWeight: '700',
    color: colors.saffron,
  },
  progressTrack: {
    height: 10,
    backgroundColor: colors.backgroundGray,
    borderRadius: 5,
    overflow: 'hidden',
    marginBottom: spacing.xs,
  },
  progressFill: {
    height: '100%',
    backgroundColor: colors.saffron,
    borderRadius: 5,
  },
  progressPercent: {
    fontSize: 12,
    color: colors.textMuted,
    fontWeight: '500',
    marginBottom: spacing.lg,
  },
  supportButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.sm,
    paddingVertical: spacing.md,
    borderRadius: borderRadius.button,
    backgroundColor: colors.saffron + '12',
    borderWidth: 1.5,
    borderColor: colors.saffron + '40',
  },
  supportButtonActive: {
    backgroundColor: colors.saffron,
    borderColor: colors.saffron,
    shadowColor: colors.saffron,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.4,
    shadowRadius: 12,
    elevation: 6,
  },
  supportButtonIcon: {
    fontSize: 18,
    color: colors.saffron,
  },
  supportButtonIconActive: {
    color: colors.white,
  },
  supportButtonText: {
    fontSize: 16,
    fontWeight: '700',
    color: colors.saffron,
  },
  supportButtonTextActive: {
    color: colors.white,
  },

  // Actions row
  actionsRow: {
    flexDirection: 'row',
    paddingHorizontal: spacing.lg,
    marginBottom: spacing.md,
    gap: spacing.sm,
  },
  actionButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.xs,
    paddingVertical: spacing.sm,
    borderRadius: borderRadius.md,
    backgroundColor: colors.backgroundGray,
  },
  actionIcon: {
    fontSize: 14,
    color: colors.textMuted,
  },
  actionText: {
    fontSize: 12,
    fontWeight: '500',
    color: colors.textMuted,
  },

  // Sections
  sectionCard: {
    marginHorizontal: spacing.lg,
    marginBottom: spacing.md,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: colors.textPrimary,
    marginBottom: 2,
  },
  sectionSubtitle: {
    fontSize: 13,
    color: colors.textMuted,
    marginBottom: spacing.md,
  },
  noContent: {
    fontSize: 13,
    color: colors.textMuted,
    textAlign: 'center',
    paddingVertical: spacing.md,
  },

  // Evidence
  evidenceItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: colors.borderLight,
  },
  evidencePhoto: {
    width: 44,
    height: 44,
    borderRadius: borderRadius.sm,
  },
  evidencePhotoPlaceholder: {
    width: 44,
    height: 44,
    borderRadius: borderRadius.sm,
    backgroundColor: colors.backgroundGray,
    alignItems: 'center',
    justifyContent: 'center',
  },
  evidencePhotoIcon: {
    fontSize: 18,
  },
  evidenceInfo: {
    flex: 1,
    marginLeft: spacing.md,
  },
  evidenceTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.textPrimary,
  },
  evidenceMeta: {
    fontSize: 12,
    color: colors.textMuted,
    marginTop: 1,
    textTransform: 'capitalize',
  },
  chevron: {
    fontSize: 22,
    color: colors.textMuted,
    marginLeft: spacing.sm,
  },

  // Economic impact
  economicCard: {
    marginHorizontal: spacing.lg,
    marginBottom: spacing.md,
    backgroundColor: colors.saffron + '06',
    borderWidth: 1,
    borderColor: colors.saffron + '20',
  },
  impactGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
  },
  impactItem: {
    flex: 1,
    minWidth: '45%',
    backgroundColor: colors.white,
    padding: spacing.md,
    borderRadius: borderRadius.md,
  },
  impactItemFull: {
    width: '100%',
    backgroundColor: colors.white,
    padding: spacing.md,
    borderRadius: borderRadius.md,
  },
  impactLabel: {
    fontSize: 11,
    fontWeight: '500',
    color: colors.textMuted,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: spacing.xs,
  },
  impactValue: {
    fontSize: 20,
    fontWeight: '700',
  },
  impactNote: {
    fontSize: 12,
    color: colors.textMuted,
    marginTop: spacing.xs,
  },
  comparisonBox: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    marginTop: spacing.md,
    padding: spacing.sm,
    backgroundColor: colors.white,
    borderRadius: borderRadius.md,
  },
  comparisonIcon: {
    fontSize: 18,
  },
  comparisonText: {
    fontSize: 13,
    color: colors.textSecondary,
    flex: 1,
    lineHeight: 18,
  },

  // Stakeholder responses
  responseItem: {
    paddingVertical: spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: colors.borderLight,
  },
  responseHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: spacing.sm,
  },
  responseInfo: {
    flex: 1,
    marginLeft: spacing.sm,
  },
  responseName: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.textPrimary,
  },
  responseRole: {
    fontSize: 12,
    color: colors.textMuted,
  },
  responseContent: {
    fontSize: 14,
    color: colors.textPrimary,
    lineHeight: 20,
  },
  responseTime: {
    fontSize: 12,
    color: colors.textMuted,
    marginTop: spacing.xs,
  },
  noResponseBox: {
    alignItems: 'center',
    paddingVertical: spacing.xl,
  },
  noResponseIcon: {
    fontSize: 28,
    marginBottom: spacing.sm,
  },
  noResponseText: {
    fontSize: 14,
    color: colors.textMuted,
  },

  // Timeline
  timelineHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: spacing.md,
  },
  viewAllText: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.saffron,
  },
  timelineItem: {
    flexDirection: 'row',
    marginBottom: spacing.md,
  },
  timelineDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    marginTop: 4,
    marginRight: spacing.md,
  },
  timelineContent: {
    flex: 1,
  },
  timelineActor: {
    fontSize: 13,
    fontWeight: '600',
    color: colors.textPrimary,
  },
  timelineText: {
    fontSize: 13,
    color: colors.textSecondary,
    lineHeight: 18,
    marginTop: 1,
  },
  timelineTime: {
    fontSize: 11,
    color: colors.textMuted,
    marginTop: 2,
  },

  // Verification
  verifyCard: {
    marginHorizontal: spacing.lg,
    marginTop: spacing.md,
    backgroundColor: colors.success + '08',
    borderWidth: 1,
    borderColor: colors.success + '30',
  },
  verifyTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.textPrimary,
    marginBottom: spacing.xs,
  },
  verifyDesc: {
    fontSize: 14,
    color: colors.textSecondary,
    marginBottom: spacing.md,
    lineHeight: 20,
  },
  verifyButtons: {
    flexDirection: 'row',
    gap: spacing.md,
  },
  verifyButtonItem: {
    flex: 1,
  },
  verificationsCount: {
    marginTop: spacing.md,
    paddingTop: spacing.sm,
    borderTopWidth: 1,
    borderTopColor: colors.success + '20',
  },
  verificationsText: {
    fontSize: 13,
    color: colors.textMuted,
    textAlign: 'center',
  },
});
