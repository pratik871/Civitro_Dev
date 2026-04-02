import React, { useState, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  LayoutAnimation,
  Platform,
  UIManager,
} from 'react-native';
import Svg, { Circle, Path, Line } from 'react-native-svg';
import { useTranslation } from 'react-i18next';
import { colors } from '../../theme/colors';
import { useSettingsStore } from '../../stores/settingsStore';
import { transliterateName, translateTitle } from '../../lib/transliterate';
import {
  GOVERNANCE_TIERS,
  TIER_LEVEL_COLORS,
  TIER_I18N_KEYS,
  getResponseRingColor,
  getResponsePillVariant,
} from '../../types/governance';
import type { GovernanceRep } from '../../types/governance';

// Enable LayoutAnimation on Android
if (Platform.OS === 'android' && UIManager.setLayoutAnimationEnabledExperimental) {
  UIManager.setLayoutAnimationEnabledExperimental(true);
}

const SAFFRON = '#FF6B35';

// ---------------------------------------------------------------------------
// Props
// ---------------------------------------------------------------------------
interface RepresentativesPyramidProps {
  reps: GovernanceRep[];
  onMessage?: (rep: GovernanceRep) => void;
  onRate?: (rep: GovernanceRep) => void;
  onViewIssues?: () => void;
}

// ---------------------------------------------------------------------------
// Main Component
// ---------------------------------------------------------------------------
export const RepresentativesPyramid: React.FC<RepresentativesPyramidProps> = ({
  reps,
  onMessage,
  onRate,
  onViewIssues,
}) => {
  const { t } = useTranslation();
  const language = useSettingsStore(state => state.language);
  const [selectedKey, setSelectedKey] = useState<string | null>(null);
  const [showAll, setShowAll] = useState(false);

  // Instant dictionary-based name transliteration (no API call)
  const getTranslitName = useCallback(
    (name: string) => transliterateName(name, language),
    [language],
  );

  const toggleCard = useCallback((key: string) => {
    LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
    if (showAll) setShowAll(false);
    setSelectedKey(prev => (prev === key ? null : key));
  }, [showAll]);

  const toggleSeeAll = useCallback(() => {
    LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
    setSelectedKey(null);
    setShowAll(prev => !prev);
  }, []);

  return (
    <View>
      {/* Section header */}
      <View style={styles.sectionHeader}>
        <Text style={styles.sectionTitle}>{t('reps.yourRepresentatives', 'Your Representatives')}</Text>
        <TouchableOpacity onPress={toggleSeeAll} activeOpacity={0.6} style={styles.seeAllBtn}>
          <Text style={[styles.seeAllText, showAll && { color: colors.textPrimary }]}>
            {showAll ? t('common.collapse', 'Collapse') : t('common.seeAll', 'See All')}
          </Text>
          <Svg width={14} height={14} viewBox="0 0 14 14" fill="none">
            <Path
              d="M5 3l4 4-4 4"
              stroke={showAll ? colors.textPrimary : SAFFRON}
              strokeWidth={2}
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </Svg>
        </TouchableOpacity>
      </View>

      {/* Avatar strip */}
      {!showAll && (
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.stripScroll}
          style={styles.stripContainer}
        >
          {reps.map((rep, idx) => {
            const tier = GOVERNANCE_TIERS.find(t => t.key === rep.tierKey);
            if (!tier) return null;
            const ringColor = getResponseRingColor(rep.responseTimeDays);
            const isSelected = selectedKey === rep.tierKey;
            return (
              <React.Fragment key={rep.tierKey}>
                {idx > 0 && <ConnectorArrow />}
                <TouchableOpacity
                  style={styles.avatarItem}
                  onPress={() => toggleCard(rep.tierKey)}
                  activeOpacity={0.7}
                  hitSlop={{ top: 8, bottom: 8, left: 4, right: 4 }}
                >
                  <View style={[
                    styles.avatar,
                    rep.isElected ? styles.avatarElected : styles.avatarAppointed,
                    { borderColor: ringColor },
                    isSelected && { borderColor: SAFFRON, borderWidth: 3 },
                  ]}>
                    <Text style={styles.avatarInitials}>{rep.initials}</Text>
                    {rep.isDepartmentRouted && (
                      <View style={styles.deptBadge}>
                        <Svg width={7} height={7} viewBox="0 0 8 8">
                          <Circle cx={4} cy={4} r={3} fill="white" />
                        </Svg>
                      </View>
                    )}
                  </View>
                  <Text style={styles.tierLabel}>{TIER_I18N_KEYS[rep.tierKey] ? t(TIER_I18N_KEYS[rep.tierKey].label, tier.label) : tier.label}</Text>
                  <View style={styles.responseRow}>
                    <View style={[styles.respDot, { backgroundColor: ringColor }]} />
                    <Text style={styles.respText}>
                      {rep.responseTimeDays !== null ? `${rep.responseTimeDays}d` : '—'}
                    </Text>
                  </View>
                </TouchableOpacity>
              </React.Fragment>
            );
          })}
        </ScrollView>
      )}

      {/* Inline expanded card (single) */}
      {!showAll && selectedKey && reps.find(r => r.tierKey === selectedKey) && (
        <RepCard
          rep={reps.find(r => r.tierKey === selectedKey)!}
          translitName={getTranslitName(reps.find(r => r.tierKey === selectedKey)!.name)}
          onMessage={onMessage}
          onRate={onRate}
          onViewIssues={onViewIssues}
        />
      )}

      {/* All cards (See All mode) */}
      {showAll && (
        <View style={styles.allCards}>
          {reps.map(rep => (
            <RepCard
              key={rep.tierKey}
              rep={rep}
              translitName={getTranslitName(rep.name)}
              onMessage={onMessage}
              onRate={onRate}
              onViewIssues={onViewIssues}
            />
          ))}
        </View>
      )}
    </View>
  );
};

// ---------------------------------------------------------------------------
// ConnectorArrow — small right-pointing chevron between avatars
// ---------------------------------------------------------------------------
const ConnectorArrow: React.FC = () => (
  <View style={styles.connector}>
    <Svg width={10} height={10} viewBox="0 0 10 10" fill="none">
      <Path
        d="M2 5h6M6 3l2 2-2 2"
        stroke={colors.border}
        strokeWidth={1.5}
        strokeLinecap="round"
      />
    </Svg>
  </View>
);

// ---------------------------------------------------------------------------
// RepCard — inline detail card for a representative
// ---------------------------------------------------------------------------
interface RepCardProps {
  rep: GovernanceRep;
  translitName?: string;
  onMessage?: (rep: GovernanceRep) => void;
  onRate?: (rep: GovernanceRep) => void;
  onViewIssues?: () => void;
}

const RepCard: React.FC<RepCardProps> = ({ rep, translitName, onMessage, onRate, onViewIssues }) => {
  const { t } = useTranslation();
  const language = useSettingsStore(state => state.language);
  const tier = GOVERNANCE_TIERS.find(t => t.key === rep.tierKey);
  if (!tier) return null;
  const levelColors = TIER_LEVEL_COLORS[tier.level];
  const respVariant = getResponsePillVariant(rep.responseTimeDays);

  const respPillColors: Record<string, { bg: string; text: string }> = {
    good: { bg: '#ECFDF5', text: '#047857' },
    mid:  { bg: '#FFFBEB', text: '#92400E' },
    slow: { bg: '#FEF2F2', text: '#B91C1C' },
    none: { bg: colors.borderLight, text: colors.textMuted },
  };
  const rpColors = respPillColors[respVariant];

  return (
    <View style={styles.repCard}>
      {/* Tier tag */}
      <View style={[styles.tierTag, { backgroundColor: levelColors.bg }]}>
        <Text style={[styles.tierTagText, { color: levelColors.text }]}>
          {TIER_I18N_KEYS[rep.tierKey] ? t(TIER_I18N_KEYS[rep.tierKey].fullLabel, tier.fullLabel) : tier.fullLabel}{rep.isDepartmentRouted && rep.department ? ` · ${rep.department}` : ''}
        </Text>
      </View>

      {/* Name & title */}
      <Text style={styles.repName}>{translitName || rep.name}</Text>
      <Text style={styles.repTitle}>{translateTitle(rep.title, language)}</Text>

      {/* Meta pills */}
      <View style={styles.metaRow}>
        {rep.responseTimeDays !== null && (
          <View style={[styles.pill, { backgroundColor: rpColors.bg }]}>
            <View style={[styles.pillDot, { backgroundColor: rpColors.text }]} />
            <Text style={[styles.pillText, { color: rpColors.text }]}>
              {t('reps.avgDays', 'Avg {{days}} days', { days: rep.responseTimeDays })}
            </Text>
          </View>
        )}
        {rep.responseTimeDays === null && (
          <View style={[styles.pill, { backgroundColor: rpColors.bg }]}>
            <View style={[styles.pillDot, { backgroundColor: rpColors.text }]} />
            <Text style={[styles.pillText, { color: rpColors.text }]}>
              {tier.key === 't5' || tier.key === 't7' ? t('reps.sla14', '14-day SLA') : t('reps.noData', 'No response data')}
            </Text>
          </View>
        )}
        {rep.rating !== null && (
          <View style={[styles.pill, { backgroundColor: '#FFFBEB' }]}>
            <Svg width={10} height={10} viewBox="0 0 10 10" fill="none">
              <Path
                d="M5 1l1.2 2.5H9L6.8 5.5l.8 2.5L5 6.5 2.4 8l.8-2.5L1 3.5h2.8L5 1z"
                stroke="#92400E"
                strokeWidth={1.5}
              />
            </Svg>
            <Text style={[styles.pillText, { color: '#92400E' }]}>{rep.rating}/5</Text>
          </View>
        )}
        {rep.issuesLabel && (
          <View style={[styles.pill, { backgroundColor: colors.borderLight }]}>
            <Text style={[styles.pillText, { color: colors.textSecondary }]}>{translateTitle(rep.issuesLabel!, language)}</Text>
          </View>
        )}
      </View>

      {/* Action buttons — only for T1 (ward councillor) */}
      {tier.showActions && (
        <View style={styles.actionBtns}>
          <TouchableOpacity
            style={styles.actionBtn}
            onPress={() => onMessage?.(rep)}
            activeOpacity={0.7}
          >
            <Text style={styles.actionBtnText}>{t('reps.message', 'Message')}</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.actionBtn}
            onPress={() => onRate?.(rep)}
            activeOpacity={0.7}
          >
            <Text style={styles.actionBtnText}>{t('reps.rate', 'Rate')}</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.actionBtn}
            onPress={() => onViewIssues?.()}
            activeOpacity={0.7}
          >
            <Text style={styles.actionBtnText}>{t('reps.viewIssues', 'View Issues')}</Text>
          </TouchableOpacity>
        </View>
      )}
    </View>
  );
};

// ---------------------------------------------------------------------------
// Styles — pixel-perfect matching the HTML mockup
// ---------------------------------------------------------------------------
const styles = StyleSheet.create({
  // Section header
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '800',
    color: colors.textPrimary,
  },
  seeAllBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  seeAllText: {
    fontSize: 13,
    fontWeight: '600',
    color: SAFFRON,
  },

  // Avatar strip
  stripContainer: {
    marginHorizontal: -20,
  },
  stripScroll: {
    paddingHorizontal: 20,
    paddingVertical: 4,
    alignItems: 'flex-start',
    gap: 4,
  },
  avatarItem: {
    alignItems: 'center',
    width: 52,
    gap: 3,
  },
  avatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2.5,
  },
  avatarElected: {
    backgroundColor: SAFFRON,
  },
  avatarAppointed: {
    backgroundColor: '#1E3A5F',
  },
  avatarInitials: {
    fontSize: 12,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  deptBadge: {
    position: 'absolute',
    bottom: -2,
    right: -4,
    width: 14,
    height: 14,
    borderRadius: 7,
    backgroundColor: '#3B82F6',
    borderWidth: 2,
    borderColor: '#FFFFFF',
    alignItems: 'center',
    justifyContent: 'center',
  },
  tierLabel: {
    fontSize: 9,
    fontWeight: '600',
    color: colors.textSecondary,
    textAlign: 'center',
  },
  responseRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 2,
  },
  respDot: {
    width: 5,
    height: 5,
    borderRadius: 2.5,
  },
  respText: {
    fontSize: 8,
    fontWeight: '600',
    color: colors.textMuted,
  },

  // Connector arrow
  connector: {
    justifyContent: 'center',
    alignItems: 'center',
    width: 12,
    marginTop: -18, // align with avatar center
  },

  // Rep detail card (inline)
  repCard: {
    marginTop: 10,
    backgroundColor: colors.white,
    borderRadius: 10,
    padding: 14,
    borderWidth: 1,
    borderColor: colors.borderLight,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.06,
    shadowRadius: 3,
    elevation: 2,
  },
  tierTag: {
    alignSelf: 'flex-start',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 4,
    marginBottom: 6,
  },
  tierTagText: {
    fontSize: 9,
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  repName: {
    fontSize: 14,
    fontWeight: '700',
    color: colors.textPrimary,
    lineHeight: 18,
  },
  repTitle: {
    fontSize: 11,
    fontWeight: '500',
    color: colors.textSecondary,
    marginTop: 2,
  },
  metaRow: {
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
  actionBtns: {
    flexDirection: 'row',
    gap: 6,
    marginTop: 10,
  },
  actionBtn: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.white,
  },
  actionBtnText: {
    fontSize: 11,
    fontWeight: '600',
    color: colors.textSecondary,
  },

  // All cards (See All mode)
  allCards: {
    gap: 10,
    marginTop: 4,
  },
});
