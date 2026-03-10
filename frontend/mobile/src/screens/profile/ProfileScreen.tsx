import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  StatusBar,
  Alert,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { Avatar } from '../../components/ui/Avatar';
import { Card } from '../../components/ui/Card';
import { ScoreRing } from '../../components/ui/ScoreRing';
import { Badge } from '../../components/ui/Badge';
import { Button } from '../../components/ui/Button';
import { colors } from '../../theme/colors';
import { spacing, borderRadius } from '../../theme/spacing';
import { useAuthStore } from '../../stores/authStore';
import type { RootStackParamList } from '../../navigation/types';

type ProfileNavProp = NativeStackNavigationProp<RootStackParamList>;

const BADGES = [
  { name: 'Active Reporter', icon: '\u{1F4F0}', earned: true },
  { name: 'Poll Participant', icon: '\u{1F5F3}', earned: true },
  { name: 'Community Voice', icon: '\u{1F4E2}', earned: true },
  { name: 'Verifier', icon: '\u2705', earned: false },
  { name: 'Top Citizen', icon: '\u{1F3C6}', earned: false },
  { name: 'Watchdog', icon: '\u{1F440}', earned: false },
];

const SETTINGS_ITEMS = [
  { icon: '\u{1F514}', label: 'Notification Settings' },
  { icon: '\u{1F30D}', label: 'Language' },
  { icon: '\u{1F512}', label: 'Privacy & Security' },
  { icon: '\u2753', label: 'Help & Support' },
  { icon: '\u{1F4CB}', label: 'Terms of Service' },
  { icon: '\u{2139}\uFE0F', label: 'About Civitro' },
];

export const ProfileScreen: React.FC = () => {
  const navigation = useNavigation<ProfileNavProp>();
  const user = useAuthStore(state => state.user);
  const logout = useAuthStore(state => state.logout);

  const handleLogout = () => {
    Alert.alert('Logout', 'Are you sure you want to logout?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Logout',
        style: 'destructive',
        onPress: logout,
      },
    ]);
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
        <Text style={styles.phone}>{user?.phone || '+91 XXXXXXXXXX'}</Text>
        <Text style={styles.location}>
          {user?.ward || 'Ward 15 - Koramangala'} | {user?.constituency || 'Bangalore South'}
        </Text>
      </View>

      {/* Civic Score */}
      <Card style={styles.scoreCard}>
        <View style={styles.scoreRow}>
          <ScoreRing
            score={user?.civicScore || 72}
            size={80}
            strokeWidth={6}
            label="Score"
          />
          <View style={styles.scoreInfo}>
            <Text style={styles.scoreTitle}>Civic Score</Text>
            <Text style={styles.scoreDesc}>
              Your contribution to civic governance
            </Text>
            <Badge
              text="Active Citizen"
              backgroundColor={colors.success + '15'}
              color={colors.success}
              size="sm"
              style={styles.scoreBadge}
            />
          </View>
        </View>
      </Card>

      {/* Activity Stats */}
      <Card style={styles.statsCard}>
        <Text style={styles.sectionTitle}>Your Activity</Text>
        <View style={styles.statsGrid}>
          <View style={styles.statItem}>
            <Text style={styles.statValue}>
              {user?.issuesReported || 14}
            </Text>
            <Text style={styles.statLabel}>Issues Reported</Text>
          </View>
          <View style={styles.statItem}>
            <Text style={[styles.statValue, { color: colors.success }]}>
              {user?.issuesResolved || 9}
            </Text>
            <Text style={styles.statLabel}>Resolved</Text>
          </View>
          <View style={styles.statItem}>
            <Text style={styles.statValue}>
              {user?.voicesCreated || 7}
            </Text>
            <Text style={styles.statLabel}>Voices</Text>
          </View>
          <View style={styles.statItem}>
            <Text style={styles.statValue}>
              {user?.pollsVoted || 12}
            </Text>
            <Text style={styles.statLabel}>Polls Voted</Text>
          </View>
        </View>
      </Card>

      {/* Badges */}
      <Card style={styles.badgesCard}>
        <Text style={styles.sectionTitle}>Badges</Text>
        <View style={styles.badgesGrid}>
          {BADGES.map(badge => (
            <View
              key={badge.name}
              style={[
                styles.badgeItem,
                !badge.earned && styles.badgeItemLocked,
              ]}
            >
              <Text style={styles.badgeIcon}>{badge.icon}</Text>
              <Text
                style={[
                  styles.badgeName,
                  !badge.earned && styles.badgeNameLocked,
                ]}
              >
                {badge.name}
              </Text>
              {!badge.earned && (
                <Text style={styles.badgeLockIcon}>{'\u{1F512}'}</Text>
              )}
            </View>
          ))}
        </View>
      </Card>

      {/* Settings */}
      <Card style={styles.settingsCard}>
        <Text style={styles.sectionTitle}>Settings</Text>
        {SETTINGS_ITEMS.map((item, index) => (
          <TouchableOpacity
            key={index}
            style={[
              styles.settingRow,
              index < SETTINGS_ITEMS.length - 1 && styles.settingRowBorder,
            ]}
            activeOpacity={0.7}
          >
            <Text style={styles.settingIcon}>{item.icon}</Text>
            <Text style={styles.settingLabel}>{item.label}</Text>
            <Text style={styles.settingArrow}>{'\u203A'}</Text>
          </TouchableOpacity>
        ))}
      </Card>

      {/* Logout */}
      <Button
        title="Logout"
        onPress={handleLogout}
        variant="outline"
        fullWidth
        size="lg"
        style={styles.logoutButton}
        textStyle={styles.logoutText}
      />

      <Text style={styles.versionText}>Civitro v1.0.0</Text>

      <View style={styles.bottomSpacer} />
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
  badgesGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
  },
  badgeItem: {
    width: '30%',
    flexGrow: 1,
    alignItems: 'center',
    paddingVertical: spacing.md,
    backgroundColor: colors.primary + '06',
    borderRadius: borderRadius.lg,
    position: 'relative',
  },
  badgeItemLocked: {
    backgroundColor: colors.backgroundGray,
    opacity: 0.6,
  },
  badgeIcon: {
    fontSize: 24,
    marginBottom: spacing.xs,
  },
  badgeName: {
    fontSize: 11,
    fontWeight: '500',
    color: colors.textSecondary,
    textAlign: 'center',
  },
  badgeNameLocked: {
    color: colors.textMuted,
  },
  badgeLockIcon: {
    position: 'absolute',
    top: 4,
    right: 4,
    fontSize: 10,
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
});
