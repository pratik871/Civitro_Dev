import React, { useEffect, useState, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Switch,
  TouchableOpacity,
  ActivityIndicator,
  StatusBar,
  TextInput,
  Alert,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTranslation } from 'react-i18next';
import { colors } from '../../theme/colors';
import { spacing, borderRadius } from '../../theme/spacing';
import { useAuthStore } from '../../stores/authStore';
import api from '../../lib/api';

interface NotificationPrefs {
  pushEnabled: boolean;
  emailEnabled: boolean;
  smsEnabled: boolean;
  quietHoursStart: string;
  quietHoursEnd: string;
}

const DEFAULT_PREFS: NotificationPrefs = {
  pushEnabled: true,
  emailEnabled: true,
  smsEnabled: false,
  quietHoursStart: '22:00',
  quietHoursEnd: '08:00',
};

export const NotificationSettingsScreen: React.FC = () => {
  const { t } = useTranslation();
  const navigation = useNavigation();
  const insets = useSafeAreaInsets();
  const userId = useAuthStore(state => state.user?.id);

  const [prefs, setPrefs] = useState<NotificationPrefs>(DEFAULT_PREFS);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  const showToast = useCallback((message: string) => {
    setToastMessage(message);
    setTimeout(() => setToastMessage(null), 2000);
  }, []);

  useEffect(() => {
    if (!userId) return;
    const fetchPrefs = async () => {
      try {
        const data = await api.get<NotificationPrefs>(
          `/api/v1/notifications/users/${userId}/prefs`,
        );
        setPrefs(data);
      } catch {
        // Use defaults if fetch fails
      } finally {
        setIsLoading(false);
      }
    };
    fetchPrefs();
  }, [userId]);

  const savePrefs = useCallback(
    async (updated: NotificationPrefs) => {
      if (!userId) return;
      setIsSaving(true);
      try {
        await api.put(`/api/v1/notifications/users/${userId}/prefs`, updated as unknown as Record<string, unknown>);
        showToast('Settings saved');
      } catch {
        showToast('Failed to save');
      } finally {
        setIsSaving(false);
      }
    },
    [userId, showToast],
  );

  const handleToggle = useCallback(
    (key: keyof Pick<NotificationPrefs, 'pushEnabled' | 'emailEnabled' | 'smsEnabled'>) => {
      const updated = { ...prefs, [key]: !prefs[key] };
      setPrefs(updated);
      savePrefs(updated);
    },
    [prefs, savePrefs],
  );

  const handleQuietHoursChange = useCallback(
    (key: 'quietHoursStart' | 'quietHoursEnd', value: string) => {
      const updated = { ...prefs, [key]: value };
      setPrefs(updated);
    },
    [prefs],
  );

  const handleQuietHoursBlur = useCallback(
    (key: 'quietHoursStart' | 'quietHoursEnd') => {
      // Validate HH:MM format
      const value = prefs[key];
      const match = value.match(/^([01]\d|2[0-3]):([0-5]\d)$/);
      if (!match) {
        Alert.alert('Invalid Time', 'Please enter time in HH:MM format (e.g. 22:00)');
        setPrefs(prev => ({ ...prev, [key]: DEFAULT_PREFS[key] }));
        return;
      }
      savePrefs(prefs);
    },
    [prefs, savePrefs],
  );

  if (isLoading) {
    return (
      <View style={styles.loadingContainer}>
        <StatusBar barStyle="dark-content" backgroundColor={colors.background} />
        <ActivityIndicator size="large" color={colors.primary} />
      </View>
    );
  }

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
        <Text style={styles.headerTitle}>{t('settings.notificationSettings')}</Text>
        <View style={styles.headerRight} />
      </View>

      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* Notification Channels */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>{t('settings.notificationChannels')}</Text>
          <Text style={styles.sectionDescription}>
            {t('settings.notificationChannelsDesc')}
          </Text>

          <View style={styles.card}>
            <View style={styles.toggleRow}>
              <View style={styles.toggleInfo}>
                <Text style={styles.toggleLabel}>{t('settings.pushNotifications')}</Text>
                <Text style={styles.toggleDescription}>
                  {t('settings.pushNotificationsDesc')}
                </Text>
              </View>
              <Switch
                value={prefs.pushEnabled}
                onValueChange={() => handleToggle('pushEnabled')}
                trackColor={{ false: colors.border, true: colors.primary + '60' }}
                thumbColor={prefs.pushEnabled ? colors.primary : '#F4F3F4'}
              />
            </View>

            <View style={styles.divider} />

            <View style={styles.toggleRow}>
              <View style={styles.toggleInfo}>
                <Text style={styles.toggleLabel}>{t('settings.emailNotifications')}</Text>
                <Text style={styles.toggleDescription}>
                  {t('settings.emailNotificationsDesc')}
                </Text>
              </View>
              <Switch
                value={prefs.emailEnabled}
                onValueChange={() => handleToggle('emailEnabled')}
                trackColor={{ false: colors.border, true: colors.primary + '60' }}
                thumbColor={prefs.emailEnabled ? colors.primary : '#F4F3F4'}
              />
            </View>

            <View style={styles.divider} />

            <View style={styles.toggleRow}>
              <View style={styles.toggleInfo}>
                <Text style={styles.toggleLabel}>{t('settings.smsNotifications')}</Text>
                <Text style={styles.toggleDescription}>
                  {t('settings.smsNotificationsDesc')}
                </Text>
              </View>
              <Switch
                value={prefs.smsEnabled}
                onValueChange={() => handleToggle('smsEnabled')}
                trackColor={{ false: colors.border, true: colors.primary + '60' }}
                thumbColor={prefs.smsEnabled ? colors.primary : '#F4F3F4'}
              />
            </View>
          </View>
        </View>

        {/* Quiet Hours */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>{t('settings.quietHours')}</Text>
          <Text style={styles.sectionDescription}>
            {t('settings.quietHoursDesc')}
          </Text>

          <View style={styles.card}>
            <View style={styles.timeRow}>
              <Text style={styles.timeLabel}>{t('settings.startTime')}</Text>
              <TextInput
                style={styles.timeInput}
                value={prefs.quietHoursStart}
                onChangeText={value => handleQuietHoursChange('quietHoursStart', value)}
                onBlur={() => handleQuietHoursBlur('quietHoursStart')}
                placeholder="22:00"
                placeholderTextColor={colors.textMuted}
                keyboardType="numbers-and-punctuation"
                maxLength={5}
              />
            </View>

            <View style={styles.divider} />

            <View style={styles.timeRow}>
              <Text style={styles.timeLabel}>{t('settings.endTime')}</Text>
              <TextInput
                style={styles.timeInput}
                value={prefs.quietHoursEnd}
                onChangeText={value => handleQuietHoursChange('quietHoursEnd', value)}
                onBlur={() => handleQuietHoursBlur('quietHoursEnd')}
                placeholder="08:00"
                placeholderTextColor={colors.textMuted}
                keyboardType="numbers-and-punctuation"
                maxLength={5}
              />
            </View>
          </View>
        </View>

        <View style={styles.bottomSpacer} />
      </ScrollView>

      {/* Toast */}
      {toastMessage && (
        <View style={[styles.toast, { bottom: insets.bottom + 24 }]}>
          <Text style={styles.toastText}>{toastMessage}</Text>
        </View>
      )}

      {/* Saving indicator */}
      {isSaving && (
        <View style={styles.savingOverlay}>
          <ActivityIndicator size="small" color={colors.primary} />
        </View>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  loadingContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
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
  },
  divider: {
    height: 1,
    backgroundColor: colors.borderLight,
    marginVertical: spacing.sm,
  },
  timeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: spacing.sm,
  },
  timeLabel: {
    fontSize: 15,
    fontWeight: '500',
    color: colors.textPrimary,
  },
  timeInput: {
    fontSize: 15,
    fontWeight: '500',
    color: colors.primary,
    backgroundColor: colors.backgroundGray,
    borderRadius: borderRadius.md,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    minWidth: 80,
    textAlign: 'center',
  },
  toast: {
    position: 'absolute',
    left: spacing['3xl'],
    right: spacing['3xl'],
    backgroundColor: colors.navy,
    borderRadius: borderRadius.button,
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.lg,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 8,
    elevation: 4,
  },
  toastText: {
    fontSize: 14,
    fontWeight: '500',
    color: colors.textInverse,
  },
  savingOverlay: {
    position: 'absolute',
    top: 0,
    right: spacing.lg,
    paddingTop: spacing.lg,
  },
  bottomSpacer: {
    height: 40,
  },
});
