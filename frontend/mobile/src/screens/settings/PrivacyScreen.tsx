import React, { useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Switch,
  TouchableOpacity,
  StatusBar,
  Alert,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTranslation } from 'react-i18next';
import { colors } from '../../theme/colors';
import { spacing, borderRadius } from '../../theme/spacing';
import { useSettingsStore } from '../../stores/settingsStore';

interface PrivacyToggle {
  key: 'showProfilePublicly' | 'allowAnonymousVoices' | 'showCivicScore' | 'locationSharing' | 'dataAnalytics';
  labelKey: string;
  descriptionKey: string;
}

const PRIVACY_TOGGLES: PrivacyToggle[] = [
  {
    key: 'showProfilePublicly',
    labelKey: 'settings.showProfile',
    descriptionKey: 'settings.showProfileDesc',
  },
  {
    key: 'allowAnonymousVoices',
    labelKey: 'settings.allowAnonymousVoices',
    descriptionKey: 'settings.allowAnonymousVoicesDesc',
  },
  {
    key: 'showCivicScore',
    labelKey: 'settings.showCivicScore',
    descriptionKey: 'settings.showCivicScoreDesc',
  },
  {
    key: 'locationSharing',
    labelKey: 'settings.locationSharing',
    descriptionKey: 'settings.locationSharingDesc',
  },
  {
    key: 'dataAnalytics',
    labelKey: 'settings.dataAnalytics',
    descriptionKey: 'settings.dataAnalyticsDesc',
  },
];

export const PrivacyScreen: React.FC = () => {
  const { t } = useTranslation();
  const navigation = useNavigation();
  const insets = useSafeAreaInsets();
  const { privacySettings, updatePrivacy, loadSettings, isLoaded } =
    useSettingsStore();

  useEffect(() => {
    if (!isLoaded) {
      loadSettings();
    }
  }, [isLoaded, loadSettings]);

  const handleToggle = (key: PrivacyToggle['key'], value: boolean) => {
    updatePrivacy(key, value);
  };

  const handleDeleteAccount = () => {
    Alert.alert(
      t('settings.deleteAccount'),
      t('settings.deleteConfirm'),
      [
        { text: t('common.cancel'), style: 'cancel' },
        {
          text: t('settings.deleteAccount'),
          style: 'destructive',
          onPress: () => {
            Alert.alert(
              t('settings.deleteRequested'),
              t('settings.deleteRequestedDesc'),
            );
          },
        },
      ],
    );
  };

  const handleDownloadData = () => {
    Alert.alert(
      t('settings.downloadData'),
      t('settings.downloadDataComingSoon'),
    );
  };

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      <StatusBar barStyle="dark-content" backgroundColor={colors.background} />

      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity
          onPress={() => navigation.goBack()}
          style={styles.backButton}
          hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
        >
          <Text style={styles.backArrow}>{'\u2039'}</Text>
        </TouchableOpacity>
        <Text style={styles.headerTitle}>{t('settings.privacySecurity')}</Text>
        <View style={styles.headerRight} />
      </View>

      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* Privacy Toggles */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>{t('settings.privacyControls')}</Text>
          <Text style={styles.sectionDescription}>
            {t('settings.privacyControlsDesc')}
          </Text>

          <View style={styles.card}>
            {PRIVACY_TOGGLES.map((toggle, index) => (
              <React.Fragment key={toggle.key}>
                {index > 0 && <View style={styles.divider} />}
                <View style={styles.toggleRow}>
                  <View style={styles.toggleInfo}>
                    <Text style={styles.toggleLabel}>{t(toggle.labelKey)}</Text>
                    <Text style={styles.toggleDescription}>
                      {t(toggle.descriptionKey)}
                    </Text>
                  </View>
                  <Switch
                    value={privacySettings[toggle.key]}
                    onValueChange={value => handleToggle(toggle.key, value)}
                    trackColor={{
                      false: colors.border,
                      true: colors.primary + '60',
                    }}
                    thumbColor={
                      privacySettings[toggle.key] ? colors.primary : '#F4F3F4'
                    }
                  />
                </View>
              </React.Fragment>
            ))}
          </View>
        </View>

        {/* Data & Account */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>{t('settings.dataAccount')}</Text>
          <Text style={styles.sectionDescription}>
            {t('settings.dataAccountDesc')}
          </Text>

          <View style={styles.card}>
            <TouchableOpacity
              style={styles.actionRow}
              onPress={handleDownloadData}
              activeOpacity={0.7}
            >
              <View style={styles.actionInfo}>
                <Text style={styles.actionLabel}>{t('settings.downloadData')}</Text>
                <Text style={styles.actionDescription}>
                  {t('settings.downloadDataDesc')}
                </Text>
              </View>
              <Text style={styles.actionArrow}>{'\u203A'}</Text>
            </TouchableOpacity>

            <View style={styles.divider} />

            <TouchableOpacity
              style={styles.actionRow}
              onPress={handleDeleteAccount}
              activeOpacity={0.7}
            >
              <View style={styles.actionInfo}>
                <Text style={[styles.actionLabel, styles.deleteLabel]}>
                  {t('settings.deleteAccount')}
                </Text>
                <Text style={styles.actionDescription}>
                  {t('settings.deleteAccountDesc')}
                </Text>
              </View>
              <Text style={[styles.actionArrow, styles.deleteLabel]}>
                {'\u203A'}
              </Text>
            </TouchableOpacity>
          </View>
        </View>

        <View style={styles.bottomSpacer} />
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
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: colors.borderLight,
    backgroundColor: colors.white,
  },
  backButton: {
    width: 36,
    height: 36,
    borderRadius: borderRadius.full,
    backgroundColor: colors.backgroundGray,
    alignItems: 'center',
    justifyContent: 'center',
  },
  backArrow: {
    fontSize: 28,
    color: colors.textPrimary,
    marginTop: -2,
  },
  headerTitle: {
    flex: 1,
    fontSize: 18,
    fontWeight: '600',
    color: colors.textPrimary,
    textAlign: 'center',
  },
  headerRight: {
    width: 36,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    padding: spacing.lg,
  },
  section: {
    marginBottom: spacing['2xl'],
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.textPrimary,
    marginBottom: spacing.xs,
  },
  sectionDescription: {
    fontSize: 13,
    color: colors.textMuted,
    lineHeight: 18,
    marginBottom: spacing.md,
  },
  card: {
    backgroundColor: colors.white,
    borderRadius: borderRadius.card,
    padding: spacing.lg,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 3,
    elevation: 1,
  },
  toggleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: spacing.sm,
  },
  toggleInfo: {
    flex: 1,
    marginRight: spacing.md,
  },
  toggleLabel: {
    fontSize: 15,
    fontWeight: '500',
    color: colors.textPrimary,
  },
  toggleDescription: {
    fontSize: 13,
    color: colors.textMuted,
    marginTop: 2,
    lineHeight: 18,
  },
  divider: {
    height: 1,
    backgroundColor: colors.borderLight,
    marginVertical: spacing.sm,
  },
  actionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: spacing.sm,
  },
  actionInfo: {
    flex: 1,
    marginRight: spacing.md,
  },
  actionLabel: {
    fontSize: 15,
    fontWeight: '500',
    color: colors.textPrimary,
  },
  actionDescription: {
    fontSize: 13,
    color: colors.textMuted,
    marginTop: 2,
  },
  actionArrow: {
    fontSize: 22,
    color: colors.textMuted,
  },
  deleteLabel: {
    color: colors.error,
  },
  bottomSpacer: {
    height: 40,
  },
});
