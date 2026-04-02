import React, { useCallback, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  RefreshControl,
  StatusBar,
  ActivityIndicator,
  TouchableOpacity,
} from 'react-native';
import Svg, { Path } from 'react-native-svg';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { useTranslation } from 'react-i18next';
import { useLeaders } from '../../hooks/useLeaders';
import { useSettingsStore } from '../../stores/settingsStore';
import { transliterateName, translateTitle } from '../../lib/transliterate';
import { colors } from '../../theme/colors';
import { spacing } from '../../theme/spacing';
import type { Leader } from '../../types/leader';
import type { RootStackParamList } from '../../navigation/types';

type LeadersNavProp = NativeStackNavigationProp<RootStackParamList>;

// ── Governance tiers in escalation order ──
// Each tier key maps to a governance level from the backend.
const TIERS = [
  { key: 'ward_councillor', tag: 'T1 Municipal',                level: 'municipal' as const },
  { key: 'mayor',           tag: 'T2 Municipal Corporation',    level: 'municipal' as const },
  { key: 'mla',             tag: 'T3 State Assembly',           level: 'state' as const },
  // branch: department routing inserted here
  { key: 'cm',              tag: 'T5 Chief Minister',           level: 'state' as const },
  // branch: jurisdiction routing inserted here
  { key: 'mp',              tag: 'T6 Member of Parliament',     level: 'central' as const },
  { key: 'pm',              tag: 'T8 Prime Minister',           level: 'central' as const },
];

const LEVEL_COLORS: Record<string, { color: string; bg: string }> = {
  municipal: { color: '#FF6B35', bg: '#FFF3ED' },
  district:  { color: '#3B82F6', bg: '#EFF6FF' },
  state:     { color: '#047857', bg: '#ECFDF5' },
  central:   { color: '#7C3AED', bg: '#F5F3FF' },
};

function getDotColor(rate: number): string {
  if (rate >= 0.7) return '#10B981';
  if (rate >= 0.4) return '#F59E0B';
  if (rate > 0)    return '#EF4444';
  return '#D1D5DB';
}

function getResponsePill(rate: number, t: (k: string, d: string, o?: any) => string): { bg: string; color: string; label: string } {
  if (rate <= 0) return { bg: '#F3F4F6', color: '#9CA3AF', label: t('leaders.noResponseData', 'No response data') };
  const pct = Math.round(rate * 100);
  if (rate >= 0.7) return { bg: '#ECFDF5', color: '#047857', label: t('leaders.avgResolved', 'Avg {{pct}}% resolved', { pct }) };
  if (rate >= 0.4) return { bg: '#FFFBEB', color: '#92400E', label: t('leaders.avgResolved', 'Avg {{pct}}% resolved', { pct }) };
  return { bg: '#FEF2F2', color: '#B91C1C', label: t('leaders.avgResolved', 'Avg {{pct}}% resolved', { pct }) };
}

// ── Build ordered chain items from leaders ──
type ChainItem =
  | { type: 'card'; leader: Leader; tag: string; level: string }
  | { type: 'branch'; text: string; bold: string };

function buildChain(leaders: Leader[], t: (k: string, d: string) => string): ChainItem[] {
  const byLevel: Record<string, Leader[]> = {};
  for (const l of leaders) {
    const key = l.governanceLevel;
    if (!byLevel[key]) byLevel[key] = [];
    byLevel[key].push(l);
  }

  const chain: ChainItem[] = [];

  for (const l of byLevel['ward_councillor'] ?? []) {
    chain.push({ type: 'card', leader: l, tag: t('leaders.t1Municipal', 'T1 Municipal'), level: 'municipal' });
  }
  for (const l of byLevel['mayor'] ?? []) {
    chain.push({ type: 'card', leader: l, tag: t('leaders.t2MunicipalCorp', 'T2 Municipal Corporation'), level: 'municipal' });
  }
  for (const l of byLevel['mla'] ?? []) {
    chain.push({ type: 'card', leader: l, tag: t('leaders.t3StateAssembly', 'T3 State Assembly'), level: 'state' });
  }

  chain.push({
    type: 'branch',
    bold: t('leaders.branchesByDept', 'Branches by department'),
    text: t('leaders.deptRouting', 'issue category determines which minister'),
  });

  for (const l of byLevel['cm'] ?? []) {
    chain.push({ type: 'card', leader: l, tag: t('leaders.t5ChiefMinister', 'T5 Chief Minister'), level: 'state' });
  }

  chain.push({
    type: 'branch',
    bold: t('leaders.branchesByJurisdiction', 'Branches by jurisdiction'),
    text: t('leaders.jurisdictionRouting', 'state issues skip MP; central-scheme issues go through MP'),
  });

  for (const l of byLevel['mp'] ?? []) {
    chain.push({ type: 'card', leader: l, tag: t('leaders.t6MP', 'T6 Member of Parliament'), level: 'central' });
  }
  for (const l of byLevel['pm'] ?? []) {
    chain.push({ type: 'card', leader: l, tag: t('leaders.t8PM', 'T8 Prime Minister'), level: 'central' });
  }

  return chain;
}

// ── Main Screen ──
export const LeadersScreen: React.FC = () => {
  const { t } = useTranslation();
  const language = useSettingsStore(state => state.language);
  const navigation = useNavigation<LeadersNavProp>();
  const { data: leaders, isLoading, refetch } = useLeaders();
  const insets = useSafeAreaInsets();

  const onRefresh = useCallback(async () => {
    await refetch();
  }, [refetch]);

  const allLeaders = leaders ?? [];
  const chain = useMemo(() => buildChain(allLeaders, t), [allLeaders, t]);

  if (isLoading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={colors.primary} />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <StatusBar barStyle="dark-content" backgroundColor="#FFFCF8" />

      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={[styles.scrollContent, { paddingTop: insets.top + spacing.sm }]}
        refreshControl={
          <RefreshControl refreshing={false} onRefresh={onRefresh} tintColor={colors.primary} />
        }
        showsVerticalScrollIndicator={false}
      >
        {/* Header */}
        <View style={styles.header}>
          <View>
            <Text style={styles.headerTitle}>{t('leaders.yourGovChain', 'Your Governance Chain')}</Text>
            <Text style={styles.headerSubtitle}>
              {t('leaders.wardInfo', 'Ward 45, Andheri East')} {'\u00B7'} {t('leaders.districtInfo', 'Mumbai Suburban District')}
            </Text>
          </View>
        </View>

        {allLeaders.length === 0 ? (
          <View style={styles.emptyContainer}>
            <Text style={styles.emptyIcon}>{'\u{1F464}'}</Text>
            <Text style={styles.emptyText}>{t('leaders.noRepsFound', 'No representatives found')}</Text>
          </View>
        ) : (
          <View style={styles.timeline}>
            {/* Vertical line behind everything */}
            <View style={styles.timelineLine} />

            {chain.map((item, idx) => {
              if (item.type === 'branch') {
                return (
                  <View key={`branch-${idx}`} style={styles.branchLabel}>
                    {/* Horizontal connector from timeline */}
                    <View style={styles.branchConnector} />
                    <Text style={styles.branchText}>
                      <Text style={styles.branchBold}>{item.bold}</Text>
                      {' \u2014 '}{item.text}
                    </Text>
                  </View>
                );
              }

              const { leader, tag, level } = item;
              const lc = LEVEL_COLORS[level] ?? LEVEL_COLORS.state;
              const dotColor = getDotColor(leader.responseRate);
              const resp = getResponsePill(leader.responseRate, t);
              const rating = leader.overallRating ?? 0;
              const isDashed = level === 'central' && tag.includes('Parliament');

              return (
                <View key={leader.id} style={styles.cardRow}>
                  {/* Dot */}
                  <View style={[styles.dot, { backgroundColor: dotColor }]} />

                  {/* Card */}
                  <TouchableOpacity
                    style={[
                      styles.card,
                      isDashed && styles.cardDashed,
                    ]}
                    activeOpacity={0.7}
                    onPress={() => navigation.navigate('LeaderProfile', { leaderId: leader.id })}
                  >
                    {/* Tier tag */}
                    <View style={[styles.tierTag, { backgroundColor: lc.bg }]}>
                      <Text style={[styles.tierTagText, { color: lc.color }]}>{tag}</Text>
                    </View>

                    {/* Name */}
                    <Text style={styles.name}>{transliterateName(leader.name, language)}</Text>
                    <Text style={styles.title}>
                      {leader.partyAbbr || ''}{leader.constituency ? ` \u00B7 ${leader.constituency}` : ''}
                    </Text>

                    {/* Meta pills */}
                    <View style={styles.pillRow}>
                      <View style={[styles.pill, { backgroundColor: resp.bg }]}>
                        <View style={[styles.pillDot, { backgroundColor: resp.color }]} />
                        <Text style={[styles.pillText, { color: resp.color }]}>{resp.label}</Text>
                      </View>

                      {rating > 0 && (
                        <View style={[styles.pill, { backgroundColor: '#FFFBEB' }]}>
                          <Svg width={10} height={10} viewBox="0 0 10 10" fill="none">
                            <Path
                              d="M5 1l1.2 2.5H9L6.8 5.5l.8 2.5L5 6.5 2.4 8l.8-2.5L1 3.5h2.8L5 1z"
                              stroke="#92400E"
                              strokeWidth={1.5}
                            />
                          </Svg>
                          <Text style={[styles.pillText, { color: '#92400E' }]}>{rating.toFixed(1)}/5</Text>
                        </View>
                      )}

                      {(leader.issuesTotal > 0 || leader.issuesResolved > 0) && (
                        <View style={[styles.pill, { backgroundColor: '#F3F4F6' }]}>
                          <Text style={[styles.pillText, { color: colors.textSecondary }]}>
                            {leader.issuesTotal - leader.issuesResolved} {t('leaders.open', 'open')} {'\u00B7'} {leader.issuesResolved} {t('leaders.resolved', 'resolved')}
                          </Text>
                        </View>
                      )}
                    </View>

                    {/* Action buttons — only for municipal level */}
                    {level === 'municipal' && (
                      <View style={styles.actions}>
                        <TouchableOpacity
                          style={styles.actionBtn}
                          onPress={() => navigation.navigate('Chat', {
                            recipientId: leader.userId || leader.id,
                            recipientName: leader.name,
                          })}
                          activeOpacity={0.7}
                        >
                          <Text style={styles.actionBtnText}>{t('reps.message', 'Message')}</Text>
                        </TouchableOpacity>
                        <TouchableOpacity
                          style={styles.actionBtn}
                          onPress={() => navigation.navigate('LeaderProfile', { leaderId: leader.id })}
                          activeOpacity={0.7}
                        >
                          <Text style={styles.actionBtnText}>{t('reps.rate', 'Rate')}</Text>
                        </TouchableOpacity>
                        <TouchableOpacity
                          style={styles.actionBtn}
                          onPress={() => navigation.navigate('LeaderProfile', { leaderId: leader.id })}
                          activeOpacity={0.7}
                        >
                          <Text style={styles.actionBtnText}>{t('reps.viewIssues', 'View Issues')}</Text>
                        </TouchableOpacity>
                      </View>
                    )}
                  </TouchableOpacity>
                </View>
              );
            })}
          </View>
        )}

        <View style={styles.bottomSpacer} />
      </ScrollView>
    </View>
  );
};

const TIMELINE_LEFT = 7; // center of the dot

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FFFCF8',
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: 20,
  },

  // Header
  header: {
    marginBottom: 20,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '800',
    color: '#0B1426',
    lineHeight: 24,
  },
  headerSubtitle: {
    fontSize: 12,
    fontWeight: '500',
    color: '#6B7280',
    marginTop: 2,
  },

  // Timeline container
  timeline: {
    position: 'relative',
    paddingLeft: 24,
  },
  timelineLine: {
    position: 'absolute',
    left: TIMELINE_LEFT,
    top: 8,
    bottom: 8,
    width: 2,
    backgroundColor: '#E5E7EB',
    borderRadius: 1,
  },

  // Card row (dot + card)
  cardRow: {
    position: 'relative',
    marginBottom: 16,
  },
  dot: {
    position: 'absolute',
    left: -21,
    top: 18,
    width: 12,
    height: 12,
    borderRadius: 6,
    borderWidth: 2.5,
    borderColor: '#FFFCF8',
    zIndex: 2,
  },

  // Card
  card: {
    backgroundColor: '#FFFFFF',
    borderRadius: 10,
    padding: 14,
    borderWidth: 1,
    borderColor: '#F3F4F6',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 3,
    elevation: 2,
  },
  cardDashed: {
    borderLeftWidth: 2,
    borderLeftColor: '#E5E7EB',
    borderStyle: 'dashed',
  },

  // Tier tag
  tierTag: {
    alignSelf: 'flex-start',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 4,
    marginBottom: 8,
  },
  tierTagText: {
    fontSize: 9,
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },

  // Name & title
  name: {
    fontSize: 16,
    fontWeight: '700',
    color: '#0B1426',
    lineHeight: 20,
  },
  title: {
    fontSize: 11,
    fontWeight: '500',
    color: '#6B7280',
    marginTop: 2,
  },

  // Pills
  pillRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginTop: 8,
  },
  pill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 8,
  },
  pillDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },
  pillText: {
    fontSize: 10,
    fontWeight: '600',
  },

  // Actions
  actions: {
    flexDirection: 'row',
    gap: 6,
    marginTop: 10,
  },
  actionBtn: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    backgroundColor: '#FFFFFF',
  },
  actionBtnText: {
    fontSize: 11,
    fontWeight: '600',
    color: '#6B7280',
  },

  // Branch label
  branchLabel: {
    position: 'relative',
    marginVertical: -4,
    marginBottom: 12,
    paddingVertical: 8,
    paddingHorizontal: 14,
    paddingLeft: 4,
    backgroundColor: '#F3F4F6',
    borderRadius: 10,
  },
  branchConnector: {
    position: 'absolute',
    left: -17,
    top: '50%',
    width: 12,
    height: 2,
    backgroundColor: '#E5E7EB',
  },
  branchText: {
    fontSize: 10,
    fontWeight: '500',
    color: '#9CA3AF',
    lineHeight: 14,
  },
  branchBold: {
    fontWeight: '700',
    color: '#0B1426',
  },

  // Empty & loading
  bottomSpacer: {
    height: 60,
  },
  loadingContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#FFFCF8',
  },
  emptyContainer: {
    alignItems: 'center',
    paddingTop: 60,
  },
  emptyIcon: {
    fontSize: 48,
    marginBottom: 12,
  },
  emptyText: {
    fontSize: 16,
    color: colors.textMuted,
  },
});
