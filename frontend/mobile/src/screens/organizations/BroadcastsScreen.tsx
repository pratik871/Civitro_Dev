import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  RefreshControl,
  StatusBar,
  ActivityIndicator,
  TouchableOpacity,
  TextInput,
  Alert,
  Modal,
  Pressable,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { useRoute } from '@react-navigation/native';
import type { RouteProp } from '@react-navigation/native';
import { useTranslation } from 'react-i18next';
import { Card } from '../../components/ui/Card';
import { Badge } from '../../components/ui/Badge';
import { Button } from '../../components/ui/Button';
import { colors } from '../../theme/colors';
import { spacing, borderRadius } from '../../theme/spacing';
import { formatRelativeTime, formatNumber, toPercentage } from '../../lib/utils';
import { useBroadcasts, useSendBroadcast } from '../../hooks/useOrganizations';
import type { Broadcast } from '../../hooks/useOrganizations';
import type { RootStackParamList } from '../../navigation/types';

type RouteType = RouteProp<RootStackParamList, 'Broadcasts'>;

const TEXT_MAX = 2000;

export const BroadcastsScreen: React.FC = () => {
  const { t } = useTranslation();
  const route = useRoute<RouteType>();
  const { orgId } = route.params;

  const [showCompose, setShowCompose] = useState(false);
  const [newText, setNewText] = useState('');
  const [selectedBroadcast, setSelectedBroadcast] = useState<Broadcast | null>(null);

  const { data: broadcastsData, isLoading, refetch } = useBroadcasts(orgId, 1, 50);
  const sendMutation = useSendBroadcast();

  const broadcasts = broadcastsData?.broadcasts ?? [];
  const totalCount = broadcastsData?.totalCount ?? 0;

  const handleSend = () => {
    if (!newText.trim()) {
      Alert.alert(t('common.error', 'Error'), t('organizations.enterMessage', 'Please enter a message.'));
      return;
    }
    sendMutation.mutate(
      { orgId, text: newText.trim() },
      {
        onSuccess: () => {
          setShowCompose(false);
          setNewText('');
          refetch();
        },
        onError: (err: any) => {
          Alert.alert(t('common.error', 'Error'), err.message || t('organizations.couldNotSendBroadcast', 'Could not send broadcast.'));
        },
      },
    );
  };

  const renderBroadcast = ({ item }: { item: Broadcast }) => {
    const readRate =
      item.totalCount > 0 ? item.readCount / item.totalCount : 0;
    const readPercent = Math.round(readRate * 100);

    return (
      <TouchableOpacity
        activeOpacity={0.7}
        onPress={() => setSelectedBroadcast(item)}
      >
        <Card style={styles.broadcastCard}>
          <View style={styles.cardHeader}>
            <Text style={styles.broadcastTime}>
              {formatRelativeTime(item.createdAt)}
            </Text>
            <Badge
              text={`${readPercent}% ${t('organizations.read', 'read')}`}
              backgroundColor={
                readPercent >= 50
                  ? colors.success + '15'
                  : colors.warning + '15'
              }
              color={readPercent >= 50 ? colors.success : colors.warning}
              size="sm"
            />
          </View>

          <Text style={styles.broadcastText} numberOfLines={3}>
            {item.text}
          </Text>

          <View style={styles.broadcastFooter}>
            <View style={styles.reachChip}>
              <Text style={styles.reachIcon}>{'\u{1F4E8}'}</Text>
              <Text style={styles.reachText}>
                {formatNumber(item.readCount)} / {formatNumber(item.totalCount)}{' '}
                {t('organizations.reached', 'reached')}
              </Text>
            </View>
            {item.targetLevel > 0 && (
              <View style={styles.levelChip}>
                <Text style={styles.levelText}>
                  Level {item.targetLevel}
                </Text>
              </View>
            )}
          </View>

          {/* Read progress bar */}
          <View style={styles.progressContainer}>
            <View style={styles.progressTrack}>
              <View
                style={[
                  styles.progressFill,
                  { width: `${Math.min(readPercent, 100)}%` },
                ]}
              />
            </View>
          </View>
        </Card>
      </TouchableOpacity>
    );
  };

  const renderHeader = () => (
    <View>
      <View style={styles.headerRow}>
        <Text style={styles.headerCount}>
          {totalCount} {t('organizations.broadcasts', 'broadcasts')}
        </Text>
        <TouchableOpacity
          style={styles.composeButton}
          onPress={() => setShowCompose(true)}
        >
          <Text style={styles.composeButtonText}>+ {t('organizations.newBroadcast', 'New Broadcast')}</Text>
        </TouchableOpacity>
      </View>
    </View>
  );

  if (isLoading) {
    return (
      <View style={[styles.container, styles.centered]}>
        <StatusBar barStyle="dark-content" backgroundColor={colors.background} />
        <ActivityIndicator size="large" color={colors.saffron} />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <StatusBar barStyle="dark-content" backgroundColor={colors.background} />
      <FlatList
        data={broadcasts}
        renderItem={renderBroadcast}
        keyExtractor={item => item.id}
        contentContainerStyle={styles.listContent}
        refreshControl={
          <RefreshControl
            refreshing={false}
            onRefresh={refetch}
            tintColor={colors.saffron}
            colors={[colors.saffron]}
          />
        }
        showsVerticalScrollIndicator={false}
        ListHeaderComponent={renderHeader}
        ListEmptyComponent={
          <View style={styles.emptyContainer}>
            <Text style={styles.emptyIcon}>{'\u{1F4E2}'}</Text>
            <Text style={styles.emptyTitle}>{t('organizations.noBroadcastsYet', 'No broadcasts yet')}</Text>
            <Text style={styles.emptyText}>
              {t('organizations.sendFirstBroadcast', 'Send your first broadcast to communicate with all organization members.')}
            </Text>
            <TouchableOpacity
              style={styles.emptyButton}
              onPress={() => setShowCompose(true)}
            >
              <Text style={styles.emptyButtonText}>{t('organizations.sendBroadcast', 'Send Broadcast')}</Text>
            </TouchableOpacity>
          </View>
        }
      />

      {/* Compose Modal */}
      <Modal visible={showCompose} transparent animationType="slide">
        <KeyboardAvoidingView
          style={styles.composeBackdrop}
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        >
          <Pressable
            style={styles.composeBackdropInner}
            onPress={() => setShowCompose(false)}
          >
            <View
              style={styles.composeCard}
              onStartShouldSetResponder={() => true}
            >
              <View style={styles.composeHeader}>
                <Text style={styles.composeTitle}>{t('organizations.newBroadcast', 'New Broadcast')}</Text>
                <TouchableOpacity onPress={() => setShowCompose(false)}>
                  <Text style={styles.composeClose}>{'\u2715'}</Text>
                </TouchableOpacity>
              </View>

              <TextInput
                style={styles.composeInput}
                placeholder={t('organizations.writeMessagePlaceholder', 'Write your message to all members...')}
                placeholderTextColor={colors.textMuted}
                value={newText}
                onChangeText={t => setNewText(t.slice(0, TEXT_MAX))}
                maxLength={TEXT_MAX}
                multiline
                textAlignVertical="top"
                autoFocus
              />
              <Text style={styles.charCount}>
                {newText.length}/{TEXT_MAX}
              </Text>

              <View style={styles.composeActions}>
                <Button
                  title={t('organizations.sendBroadcast', 'Send Broadcast')}
                  onPress={handleSend}
                  variant="primary"
                  size="lg"
                  loading={sendMutation.isPending}
                  disabled={!newText.trim()}
                  fullWidth
                  style={[
                    styles.sendButton,
                    !newText.trim() && styles.sendButtonDisabled,
                  ]}
                />
              </View>
            </View>
          </Pressable>
        </KeyboardAvoidingView>
      </Modal>

      {/* Broadcast Detail Modal */}
      <Modal
        visible={!!selectedBroadcast}
        transparent
        animationType="fade"
      >
        <Pressable
          style={styles.detailBackdrop}
          onPress={() => setSelectedBroadcast(null)}
        >
          <View
            style={styles.detailCard}
            onStartShouldSetResponder={() => true}
          >
            {selectedBroadcast && (
              <>
                <View style={styles.detailHeader}>
                  <Text style={styles.detailTime}>
                    {new Date(selectedBroadcast.createdAt).toLocaleDateString(
                      'en-IN',
                      {
                        day: 'numeric',
                        month: 'long',
                        year: 'numeric',
                        hour: '2-digit',
                        minute: '2-digit',
                      },
                    )}
                  </Text>
                  <TouchableOpacity
                    onPress={() => setSelectedBroadcast(null)}
                  >
                    <Text style={styles.composeClose}>{'\u2715'}</Text>
                  </TouchableOpacity>
                </View>

                <Text style={styles.detailText}>
                  {selectedBroadcast.text}
                </Text>

                <View style={styles.detailStats}>
                  <View style={styles.detailStatItem}>
                    <Text style={styles.detailStatValue}>
                      {formatNumber(selectedBroadcast.readCount)}
                    </Text>
                    <Text style={styles.detailStatLabel}>{t('organizations.read', 'Read')}</Text>
                  </View>
                  <View style={styles.detailStatItem}>
                    <Text style={styles.detailStatValue}>
                      {formatNumber(selectedBroadcast.totalCount)}
                    </Text>
                    <Text style={styles.detailStatLabel}>{t('organizations.total', 'Total')}</Text>
                  </View>
                  <View style={styles.detailStatItem}>
                    <Text style={styles.detailStatValue}>
                      {selectedBroadcast.totalCount > 0
                        ? toPercentage(
                            selectedBroadcast.readCount,
                            selectedBroadcast.totalCount,
                          )
                        : '0%'}
                    </Text>
                    <Text style={styles.detailStatLabel}>{t('organizations.readRate', 'Read Rate')}</Text>
                  </View>
                </View>

                {selectedBroadcast.targetLevel > 0 && (
                  <Text style={styles.detailMeta}>
                    {t('organizations.targetedAtLevel', 'Targeted at level {{level}} members', { level: selectedBroadcast.targetLevel })}
                  </Text>
                )}
              </>
            )}
          </View>
        </Pressable>
      </Modal>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  listContent: {
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.md,
    paddingBottom: spacing['3xl'],
  },
  centered: {
    justifyContent: 'center',
    alignItems: 'center',
  },

  // Header
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: spacing.lg,
  },
  headerCount: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.textMuted,
  },
  composeButton: {
    backgroundColor: colors.saffron,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.sm,
    borderRadius: borderRadius.button,
  },
  composeButtonText: {
    fontSize: 13,
    fontWeight: '700',
    color: colors.white,
  },

  // Broadcast card
  broadcastCard: {
    marginBottom: spacing.md,
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: spacing.sm,
  },
  broadcastTime: {
    fontSize: 12,
    color: colors.textMuted,
    fontWeight: '500',
  },
  broadcastText: {
    fontSize: 15,
    fontWeight: '500',
    color: colors.textPrimary,
    lineHeight: 22,
    marginBottom: spacing.md,
  },
  broadcastFooter: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    marginBottom: spacing.sm,
  },
  reachChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    backgroundColor: colors.backgroundGray,
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
    borderRadius: borderRadius.full,
  },
  reachIcon: {
    fontSize: 12,
  },
  reachText: {
    fontSize: 12,
    color: colors.textMuted,
    fontWeight: '500',
  },
  levelChip: {
    backgroundColor: colors.info + '15',
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
    borderRadius: borderRadius.full,
  },
  levelText: {
    fontSize: 12,
    color: colors.info,
    fontWeight: '500',
  },
  progressContainer: {
    marginTop: spacing.xs,
  },
  progressTrack: {
    height: 4,
    backgroundColor: colors.backgroundGray,
    borderRadius: 2,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    backgroundColor: colors.saffron,
    borderRadius: 2,
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
    marginBottom: spacing.xl,
  },
  emptyButton: {
    backgroundColor: colors.saffron,
    paddingHorizontal: spacing['2xl'],
    paddingVertical: spacing.md,
    borderRadius: borderRadius.button,
    shadowColor: colors.saffron,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 4,
  },
  emptyButtonText: {
    color: colors.white,
    fontSize: 15,
    fontWeight: '700',
  },

  // Compose Modal
  composeBackdrop: {
    flex: 1,
  },
  composeBackdropInner: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.4)',
    justifyContent: 'flex-end',
  },
  composeCard: {
    backgroundColor: colors.white,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    padding: spacing['2xl'],
    paddingBottom: spacing['4xl'],
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -4 },
    shadowOpacity: 0.1,
    shadowRadius: 16,
    elevation: 8,
  },
  composeHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: spacing.lg,
  },
  composeTitle: {
    fontSize: 20,
    fontWeight: '800',
    color: colors.textPrimary,
  },
  composeClose: {
    fontSize: 18,
    color: colors.textMuted,
    fontWeight: '600',
  },
  composeInput: {
    backgroundColor: colors.backgroundGray,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: borderRadius.lg,
    padding: spacing.lg,
    fontSize: 15,
    color: colors.textPrimary,
    height: 150,
    lineHeight: 22,
  },
  charCount: {
    fontSize: 12,
    color: colors.textMuted,
    textAlign: 'right',
    marginTop: spacing.xs,
    marginBottom: spacing.md,
  },
  composeActions: {
    marginTop: spacing.sm,
  },
  sendButton: {
    backgroundColor: colors.saffron,
  },
  sendButtonDisabled: {
    opacity: 0.5,
  },

  // Detail Modal
  detailBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.4)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: spacing['2xl'],
  },
  detailCard: {
    backgroundColor: colors.white,
    borderRadius: 20,
    padding: spacing['2xl'],
    width: '100%',
    maxWidth: 400,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 12 },
    shadowOpacity: 0.15,
    shadowRadius: 24,
    elevation: 10,
  },
  detailHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: spacing.lg,
  },
  detailTime: {
    fontSize: 13,
    color: colors.textMuted,
    fontWeight: '500',
  },
  detailText: {
    fontSize: 16,
    fontWeight: '500',
    color: colors.textPrimary,
    lineHeight: 24,
    marginBottom: spacing.xl,
  },
  detailStats: {
    flexDirection: 'row',
    gap: spacing.md,
    marginBottom: spacing.md,
  },
  detailStatItem: {
    flex: 1,
    backgroundColor: colors.backgroundGray,
    borderRadius: borderRadius.lg,
    paddingVertical: spacing.md,
    alignItems: 'center',
  },
  detailStatValue: {
    fontSize: 18,
    fontWeight: '700',
    color: colors.textPrimary,
  },
  detailStatLabel: {
    fontSize: 10,
    fontWeight: '500',
    color: colors.textMuted,
    marginTop: 2,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  detailMeta: {
    fontSize: 13,
    color: colors.textMuted,
    textAlign: 'center',
    marginTop: spacing.sm,
  },
});
