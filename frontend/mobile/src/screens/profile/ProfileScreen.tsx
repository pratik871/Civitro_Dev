import React, { useCallback, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Switch,
  ScrollView,
  TouchableOpacity,
  StatusBar,
  Modal,
} from 'react-native';
import Svg, { Path, Circle } from 'react-native-svg';
import { useTranslation } from 'react-i18next';
import { useNavigation, useFocusEffect } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import Constants from 'expo-constants';
import { Avatar } from '../../components/ui/Avatar';
import { Card } from '../../components/ui/Card';
import { ScoreRing } from '../../components/ui/ScoreRing';
import { Badge } from '../../components/ui/Badge';
import { Button } from '../../components/ui/Button';
import { colors } from '../../theme/colors';
import { spacing, borderRadius } from '../../theme/spacing';
import { useSettingsStore } from '../../stores/settingsStore';
import { useAuthStore } from '../../stores/authStore';
import { useAuth } from '../../hooks/useAuth';
import { useDashboardStats } from '../../hooks/useDashboardStats';
import type { RootStackParamList } from '../../navigation/types';

type ProfileNavProp = NativeStackNavigationProp<RootStackParamList>;

const SETTINGS_ITEMS: { icon: string; labelKey: string; route: keyof RootStackParamList }[] = [
  { icon: '\u{1F514}', labelKey: 'settings.notificationSettings', route: 'NotificationSettings' },
  { icon: '\u{1F30D}', labelKey: 'settings.language', route: 'Language' },
  { icon: '\u{1F512}', labelKey: 'settings.privacySecurity', route: 'Privacy' },
  { icon: '\u2753', labelKey: 'settings.helpSupport', route: 'HelpSupport' },
  { icon: '\u{1F4CB}', labelKey: 'settings.termsOfService', route: 'Terms' },
  { icon: '\u{2139}\uFE0F', labelKey: 'settings.aboutCivitro', route: 'About' },
];

export const ProfileScreen: React.FC = () => {
  const { t } = useTranslation();
  const navigation = useNavigation<ProfileNavProp>();
  const user = useAuthStore(state => state.user);
  const logout = useAuthStore(state => state.logout);
  const darkMode = useSettingsStore(state => state.darkMode);
  const setDarkMode = useSettingsStore(state => state.setDarkMode);
  const { refreshProfile } = useAuth();
  const { data: stats } = useDashboardStats();

  // Refresh civic score whenever this screen comes into focus
  useFocusEffect(useCallback(() => { refreshProfile(); }, [refreshProfile]));

  const [showLogoutModal, setShowLogoutModal] = useState(false);

  const handleLogout = () => {
    setShowLogoutModal(true);
  };

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={styles.content}
      showsVerticalScrollIndicator={false}
    >
      <StatusBar barStyle="dark-content" backgroundColor={colors.background} />

      {/* Profile Header */}
      <View style={styles.profileHeader}>
        <Avatar
          name={user?.name || 'User'}
          size={80}
          backgroundColor={colors.navy}
        />
        <Text style={styles.name}>{user?.name || 'Citizen'}</Text>
        <Text style={styles.phone}>{user?.phone || ''}</Text>
        {(user?.ward || user?.constituency) && (
          <Text style={styles.location}>
            {[user?.ward, user?.constituency].filter(Boolean).join(' | ')}
          </Text>
        )}
      </View>

      {/* Civic Score */}
      <Card style={styles.scoreCard}>
        <View style={styles.scoreRow}>
          <ScoreRing
            score={user?.civicScore ?? 0}
            size={80}
            strokeWidth={6}
            label="Score"
          />
          <View style={styles.scoreInfo}>
            <Text style={styles.scoreTitle}>{t('profile.civicScore')}</Text>
            <Text style={styles.scoreDesc}>
              {t('profile.civicScoreDesc')}
            </Text>
            {(user?.civicScore ?? 0) > 0 && (
              <Badge
                text={
                  (user?.civicScore ?? 0) >= 75
                    ? t('profile.starCitizen')
                    : (user?.civicScore ?? 0) >= 50
                    ? t('profile.activeCitizen')
                    : t('profile.newCitizen')
                }
                backgroundColor={
                  ((user?.civicScore ?? 0) >= 50 ? colors.success : colors.info) + '15'
                }
                color={(user?.civicScore ?? 0) >= 50 ? colors.success : colors.info}
                size="sm"
                style={styles.scoreBadge}
              />
            )}
          </View>
        </View>
      </Card>

      {/* Activity Stats */}
      <Card style={styles.statsCard}>
        <Text style={styles.sectionTitle}>{t('profile.yourActivity')}</Text>
        <View style={styles.statsGrid}>
          <TouchableOpacity style={styles.statItem} onPress={() => navigation.navigate('IssuesList' as any, { myIssues: true })} activeOpacity={0.7}>
            <Text style={styles.statValue}>
              {stats?.issues_reported ?? 0}
            </Text>
            <Text style={styles.statLabel}>{t('profile.issuesReported')}</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.statItem} onPress={() => navigation.navigate('IssuesList' as any, { myIssues: true, status: 'resolved' })} activeOpacity={0.7}>
            <Text style={[styles.statValue, { color: colors.success }]}>
              {stats?.validations ?? 0}
            </Text>
            <Text style={styles.statLabel}>{t('profile.issuesResolved')}</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.statItem} onPress={() => navigation.navigate('VoicesList' as any, { myVoices: true })} activeOpacity={0.7}>
            <Text style={styles.statValue}>
              {stats?.actions_started ?? 0}
            </Text>
            <Text style={styles.statLabel}>{t('profile.voicesCreated')}</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.statItem} onPress={() => navigation.navigate('Polls' as any, { myVoted: true })} activeOpacity={0.7}>
            <Text style={styles.statValue}>
              {stats?.polls_voted ?? 0}
            </Text>
            <Text style={styles.statLabel}>{t('profile.pollsVoted')}</Text>
          </TouchableOpacity>
        </View>
      </Card>

      {/* Badges */}
      <Card style={styles.badgesCard}>
        <Text style={styles.sectionTitle}>{t('profile.badges')}</Text>
        <View style={styles.emptyBadges}>
          <Text style={styles.emptyBadgesText}>{t('profile.noBadges')}</Text>
          <Text style={styles.emptyBadgesHint}>
            {t('profile.earnBadges')}
          </Text>
        </View>
      </Card>

      {/* Settings */}
      <Card style={styles.settingsCard}>
        <Text style={styles.sectionTitle}>{t('profile.settings')}</Text>
        {SETTINGS_ITEMS.map((item, index) => (
          <TouchableOpacity
            key={index}
            style={[
              styles.settingRow,
              index < SETTINGS_ITEMS.length - 1 && styles.settingRowBorder,
            ]}
            activeOpacity={0.7}
            onPress={() => navigation.navigate(item.route as any)}
          >
            <Text style={styles.settingIcon}>{item.icon}</Text>
            <Text style={styles.settingLabel}>{t(item.labelKey)}</Text>
            <Text style={styles.settingArrow}>{'\u203A'}</Text>
          </TouchableOpacity>
        ))}
      </Card>

      {/* Logout */}
      <Button
        title={t('profile.logout')}
        onPress={handleLogout}
        variant="outline"
        fullWidth
        size="lg"
        style={styles.logoutButton}
        textStyle={styles.logoutText}
      />

      <Text style={styles.versionText}>Civitro v{Constants.expoConfig?.version ?? '1.0.0'}</Text>

      <View style={styles.bottomSpacer} />

      {/* Logout Confirmation Modal */}
      <Modal visible={showLogoutModal} transparent animationType="fade" onRequestClose={() => setShowLogoutModal(false)}>
        <View style={styles.modalOverlay}>
          <View style={styles.logoutModal}>
            {/* Icon */}
            <View style={styles.logoutIconWrap}>
              <Svg width={32} height={32} viewBox="0 0 24 24" fill="none">
                <Path d="M9 21H5a2 2 0 01-2-2V5a2 2 0 012-2h4" stroke="#EF4444" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" />
                <Path d="M16 17l5-5-5-5M21 12H9" stroke="#EF4444" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" />
              </Svg>
            </View>

            <Text style={styles.logoutModalTitle}>Leaving so soon?</Text>
            <Text style={styles.logoutModalDesc}>
              You'll need to sign in again to continue your civic journey. Your progress is safely saved.
            </Text>

            {/* Buttons */}
            <TouchableOpacity
              style={styles.logoutConfirmBtn}
              onPress={() => { setShowLogoutModal(false); logout(); }}
              activeOpacity={0.8}
            >
              <Text style={styles.logoutConfirmText}>Yes, Log Out</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.logoutCancelBtn}
              onPress={() => setShowLogoutModal(false)}
              activeOpacity={0.7}
            >
              <Text style={styles.logoutCancelText}>Stay & Keep Building</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  content: {
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.md,
  },
  profileHeader: {
    alignItems: 'center',
    paddingVertical: spacing.xl,
  },
  name: {
    fontSize: 24,
    fontWeight: '700',
    color: colors.textPrimary,
    marginTop: spacing.md,
  },
  phone: {
    fontSize: 15,
    color: colors.textMuted,
    marginTop: spacing.xs,
  },
  location: {
    fontSize: 13,
    color: colors.textMuted,
    marginTop: spacing.xs,
  },
  scoreCard: {
    marginBottom: spacing.md,
  },
  scoreRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  scoreInfo: {
    flex: 1,
    marginLeft: spacing.lg,
  },
  scoreTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: colors.textPrimary,
  },
  scoreDesc: {
    fontSize: 13,
    color: colors.textMuted,
    marginTop: 2,
  },
  scoreBadge: {
    marginTop: spacing.sm,
  },
  statsCard: {
    marginBottom: spacing.md,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.textPrimary,
    marginBottom: spacing.md,
  },
  statsGrid: {
    flexDirection: 'row',
  },
  statItem: {
    flex: 1,
    alignItems: 'center',
  },
  statValue: {
    fontSize: 22,
    fontWeight: '700',
    color: colors.textPrimary,
  },
  statLabel: {
    fontSize: 11,
    color: colors.textMuted,
    marginTop: 2,
    textAlign: 'center',
  },
  badgesCard: {
    marginBottom: spacing.md,
  },
  emptyBadges: {
    alignItems: 'center',
    paddingVertical: spacing.xl,
  },
  emptyBadgesText: {
    fontSize: 15,
    fontWeight: '600',
    color: colors.textMuted,
    marginBottom: spacing.xs,
  },
  emptyBadgesHint: {
    fontSize: 13,
    color: colors.textMuted,
    textAlign: 'center',
  },
  settingsCard: {
    marginBottom: spacing.lg,
  },
  settingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: spacing.md,
  },
  settingRowBorder: {
    borderBottomWidth: 1,
    borderBottomColor: colors.borderLight,
  },
  settingIcon: {
    fontSize: 18,
    marginRight: spacing.md,
    width: 24,
    textAlign: 'center',
  },
  settingLabel: {
    flex: 1,
    fontSize: 15,
    color: colors.textPrimary,
  },
  settingArrow: {
    fontSize: 22,
    color: colors.textMuted,
  },
  logoutButton: {
    borderColor: colors.error,
    marginBottom: spacing.md,
  },
  logoutText: {
    color: colors.error,
  },
  versionText: {
    textAlign: 'center',
    fontSize: 12,
    color: colors.textMuted,
    marginBottom: spacing.md,
  },
  bottomSpacer: {
    height: 40,
  },

  // Logout modal
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(11, 20, 38, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 32,
  },
  logoutModal: {
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    padding: 28,
    alignItems: 'center',
    width: '100%',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.15,
    shadowRadius: 24,
    elevation: 10,
  },
  logoutIconWrap: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: '#FEF2F2',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
  },
  logoutModalTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#0B1426',
    marginBottom: 8,
    textAlign: 'center',
  },
  logoutModalDesc: {
    fontSize: 14,
    fontWeight: '400',
    color: '#6B7280',
    textAlign: 'center',
    lineHeight: 20,
    marginBottom: 24,
  },
  logoutConfirmBtn: {
    width: '100%',
    paddingVertical: 14,
    borderRadius: 12,
    backgroundColor: '#EF4444',
    alignItems: 'center',
    marginBottom: 10,
  },
  logoutConfirmText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  logoutCancelBtn: {
    width: '100%',
    paddingVertical: 14,
    borderRadius: 12,
    backgroundColor: '#F3F4F6',
    alignItems: 'center',
  },
  logoutCancelText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#0B1426',
  },
});
