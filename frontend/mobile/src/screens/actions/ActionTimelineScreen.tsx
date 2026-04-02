import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  StatusBar,
  ActivityIndicator,
} from 'react-native';
import { useRoute, RouteProp } from '@react-navigation/native';
import { Avatar } from '../../components/ui/Avatar';
import { Badge } from '../../components/ui/Badge';
import { useTranslation } from 'react-i18next';
import { colors } from '../../theme/colors';
import { spacing, borderRadius } from '../../theme/spacing';
import { formatRelativeTime } from '../../lib/utils';
import { useActionTimeline } from '../../hooks/useCommunityActions';
import type { ActionTimelineEntry, TimelineActorType, TimelineEntryType } from '../../types/action';
import type { RootStackParamList } from '../../navigation/types';

type TimelineRouteProp = RouteProp<RootStackParamList, 'ActionTimeline'>;

const ACTOR_COLORS: Record<TimelineActorType, string> = {
  citizen: colors.saffron,
  stakeholder: colors.navy,
  system: colors.textMuted,
};

const ACTOR_LABELS: Record<TimelineActorType, string> = {
  citizen: 'Citizen',
  stakeholder: 'Stakeholder',
  system: 'System',
};

const ESCALATION_TYPES: TimelineEntryType[] = ['escalated'];

function getEntryTypeLabel(type: TimelineEntryType): string {
  const labels: Record<TimelineEntryType, string> = {
    created: 'Action Created',
    supported: 'Supported',
    milestone: 'Milestone Reached',
    evidence_linked: 'Evidence Linked',
    stakeholder_notified: 'Stakeholder Notified',
    acknowledged: 'Acknowledged',
    responded: 'Response',
    committed: 'Commitment Made',
    rejected: 'Rejected',
    updated: 'Update',
    escalated: 'Escalated',
    resolved: 'Resolved',
    verified: 'Verified',
    archived: 'Archived',
  };
  return labels[type] || type;
}

export const ActionTimelineScreen: React.FC = () => {
  const { t } = useTranslation();
  const route = useRoute<TimelineRouteProp>();
  const { data: timeline, isLoading } = useActionTimeline(route.params.actionId);

  const renderEntry = ({ item, index }: { item: ActionTimelineEntry; index: number }) => {
    const actorColor = ACTOR_COLORS[item.actorType];
    const isEscalation = ESCALATION_TYPES.includes(item.entryType);
    const isLast = index === (timeline?.length ?? 0) - 1;

    return (
      <View style={[styles.entryRow, isEscalation && styles.escalationRow]}>
        {/* Timeline line + dot */}
        <View style={styles.timelineTrack}>
          <View
            style={[
              styles.timelineDot,
              { backgroundColor: isEscalation ? colors.error : actorColor },
            ]}
          />
          {!isLast && (
            <View
              style={[
                styles.timelineLine,
                { backgroundColor: colors.border },
              ]}
            />
          )}
        </View>

        {/* Content */}
        <View style={[styles.entryContent, isEscalation && styles.escalationContent]}>
          <View style={styles.entryHeader}>
            <Avatar name={item.actorName} size={28} />
            <View style={styles.entryHeaderInfo}>
              <Text style={styles.entryActorName}>{item.actorName}</Text>
              <View style={styles.entryBadges}>
                <Badge
                  text={ACTOR_LABELS[item.actorType]}
                  backgroundColor={actorColor + '15'}
                  color={actorColor}
                  size="sm"
                />
                <Badge
                  text={getEntryTypeLabel(item.entryType)}
                  backgroundColor={
                    isEscalation
                      ? colors.error + '15'
                      : colors.backgroundGray
                  }
                  color={isEscalation ? colors.error : colors.textSecondary}
                  size="sm"
                />
              </View>
            </View>
          </View>

          <Text style={styles.entryText}>{item.content}</Text>
          <Text style={styles.entryTime}>{formatRelativeTime(item.createdAt)}</Text>
        </View>
      </View>
    );
  };

  if (isLoading) {
    return (
      <View style={[styles.container, styles.centered]}>
        <ActivityIndicator size="large" color={colors.saffron} />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <StatusBar barStyle="dark-content" backgroundColor={colors.background} />

      {/* Legend */}
      <View style={styles.legend}>
        <View style={styles.legendItem}>
          <View style={[styles.legendDot, { backgroundColor: colors.saffron }]} />
          <Text style={styles.legendText}>{t('actions.citizenActions', 'Citizen Actions')}</Text>
        </View>
        <View style={styles.legendItem}>
          <View style={[styles.legendDot, { backgroundColor: colors.navy }]} />
          <Text style={styles.legendText}>{t('actions.stakeholder', 'Stakeholder')}</Text>
        </View>
        <View style={styles.legendItem}>
          <View style={[styles.legendDot, { backgroundColor: colors.textMuted }]} />
          <Text style={styles.legendText}>{t('actions.system', 'System')}</Text>
        </View>
        <View style={styles.legendItem}>
          <View style={[styles.legendDot, { backgroundColor: colors.error }]} />
          <Text style={styles.legendText}>{t('actions.escalation', 'Escalation')}</Text>
        </View>
      </View>

      <FlatList
        data={timeline ?? []}
        renderItem={renderEntry}
        keyExtractor={item => item.id}
        contentContainerStyle={styles.listContent}
        showsVerticalScrollIndicator={false}
        ListEmptyComponent={
          <View style={styles.emptyContainer}>
            <Text style={styles.emptyIcon}>{'\u{1F4C5}'}</Text>
            <Text style={styles.emptyTitle}>{t('actions.noTimelineEntries', 'No timeline entries')}</Text>
            <Text style={styles.emptyText}>
              {t('actions.timelineEventsWillAppear', 'Timeline events will appear here as the action progresses.')}
            </Text>
          </View>
        }
      />
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
  listContent: {
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.md,
    paddingBottom: spacing['3xl'],
  },

  // Legend
  legend: {
    flexDirection: 'row',
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    gap: spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: colors.borderLight,
    backgroundColor: colors.white,
  },
  legendItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
  },
  legendDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  legendText: {
    fontSize: 11,
    color: colors.textMuted,
    fontWeight: '500',
  },

  // Entry
  entryRow: {
    flexDirection: 'row',
  },
  escalationRow: {},
  timelineTrack: {
    width: 30,
    alignItems: 'center',
  },
  timelineDot: {
    width: 12,
    height: 12,
    borderRadius: 6,
    marginTop: spacing.md,
    zIndex: 1,
  },
  timelineLine: {
    width: 2,
    flex: 1,
    marginTop: 0,
  },
  entryContent: {
    flex: 1,
    backgroundColor: colors.white,
    borderRadius: borderRadius.lg,
    padding: spacing.md,
    marginBottom: spacing.md,
    marginLeft: spacing.sm,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.04,
    shadowRadius: 4,
    elevation: 1,
  },
  escalationContent: {
    backgroundColor: colors.error + '06',
    borderWidth: 1,
    borderColor: colors.error + '20',
  },
  entryHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: spacing.sm,
  },
  entryHeaderInfo: {
    flex: 1,
    marginLeft: spacing.sm,
  },
  entryActorName: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.textPrimary,
    marginBottom: 2,
  },
  entryBadges: {
    flexDirection: 'row',
    gap: spacing.xs,
  },
  entryText: {
    fontSize: 14,
    color: colors.textSecondary,
    lineHeight: 20,
  },
  entryTime: {
    fontSize: 12,
    color: colors.textMuted,
    marginTop: spacing.sm,
  },

  // Empty
  emptyContainer: {
    alignItems: 'center',
    paddingTop: 60,
  },
  emptyIcon: {
    fontSize: 48,
    marginBottom: spacing.md,
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: colors.textPrimary,
    marginBottom: spacing.xs,
  },
  emptyText: {
    fontSize: 14,
    color: colors.textMuted,
    textAlign: 'center',
    lineHeight: 20,
    paddingHorizontal: spacing['3xl'],
  },
});
