import React, { useEffect, useState, useCallback, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Switch,
  TouchableOpacity,
  ActivityIndicator,
  StatusBar,
  Modal,
  FlatList,
  Animated,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTranslation } from 'react-i18next';
import Svg, { Path } from 'react-native-svg';
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

const HOURS = Array.from({ length: 24 }, (_, i) => i.toString().padStart(2, '0'));
const MINUTES = ['00', '15', '30', '45'];

const ITEM_HEIGHT = 44;

/* ── Time Picker Bottom Sheet ── */
interface TimePickerProps {
  visible: boolean;
  label: string;
  value: string;
  onConfirm: (time: string) => void;
  onCancel: () => void;
}

const TimePicker: React.FC<TimePickerProps> = ({ visible, label, value, onConfirm, onCancel }) => {
  const insets = useSafeAreaInsets();
  const [hour, setHour] = useState('22');
  const [minute, setMinute] = useState('00');
  const hourRef = useRef<FlatList>(null);
  const minuteRef = useRef<FlatList>(null);
  const fadeAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (visible) {
      const [h, m] = (value || '22:00').split(':');
      setHour(h);
      setMinute(m);
      Animated.timing(fadeAnim, { toValue: 1, duration: 200, useNativeDriver: true }).start();
      // Scroll to initial positions
      setTimeout(() => {
        const hIdx = HOURS.indexOf(h);
        const mIdx = MINUTES.indexOf(m);
        if (hIdx >= 0) hourRef.current?.scrollToIndex({ index: hIdx, animated: false });
        if (mIdx >= 0) minuteRef.current?.scrollToIndex({ index: mIdx, animated: false });
      }, 100);
    } else {
      fadeAnim.setValue(0);
    }
  }, [visible, value]);

  const renderColumn = (
    data: string[],
    selected: string,
    onSelect: (v: string) => void,
    ref: React.RefObject<FlatList>,
  ) => (
    <FlatList
      ref={ref}
      data={data}
      keyExtractor={item => item}
      showsVerticalScrollIndicator={false}
      snapToInterval={ITEM_HEIGHT}
      decelerationRate="fast"
      style={pickerStyles.column}
      contentContainerStyle={{ paddingVertical: ITEM_HEIGHT * 2 }}
      getItemLayout={(_, index) => ({ length: ITEM_HEIGHT, offset: ITEM_HEIGHT * index, index })}
      onMomentumScrollEnd={e => {
        const idx = Math.round(e.nativeEvent.contentOffset.y / ITEM_HEIGHT);
        if (idx >= 0 && idx < data.length) onSelect(data[idx]);
      }}
      renderItem={({ item }) => {
        const isSelected = item === selected;
        return (
          <TouchableOpacity
            style={[pickerStyles.item, isSelected && pickerStyles.itemSelected]}
            onPress={() => {
              onSelect(item);
              const idx = data.indexOf(item);
              ref.current?.scrollToIndex({ index: idx, animated: true });
            }}
            activeOpacity={0.7}
          >
            <Text style={[pickerStyles.itemText, isSelected && pickerStyles.itemTextSelected]}>
              {item}
            </Text>
          </TouchableOpacity>
        );
      }}
    />
  );

  if (!visible) return null;

  return (
    <Modal transparent visible={visible} animationType="none" onRequestClose={onCancel}>
      <Animated.View style={[pickerStyles.overlay, { opacity: fadeAnim }]}>
        <TouchableOpacity style={pickerStyles.overlayTap} onPress={onCancel} activeOpacity={1} />
        <View style={[pickerStyles.sheet, { paddingBottom: insets.bottom + 16 }]}>
          {/* Header */}
          <View style={pickerStyles.sheetHeader}>
            <TouchableOpacity onPress={onCancel} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
              <Text style={pickerStyles.cancelText}>Cancel</Text>
            </TouchableOpacity>
            <Text style={pickerStyles.sheetTitle}>{label}</Text>
            <TouchableOpacity
              onPress={() => onConfirm(`${hour}:${minute}`)}
              hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
            >
              <Text style={pickerStyles.doneText}>Done</Text>
            </TouchableOpacity>
          </View>

          {/* Picker */}
          <View style={pickerStyles.pickerRow}>
            {renderColumn(HOURS, hour, setHour, hourRef as any)}
            <Text style={pickerStyles.colon}>:</Text>
            {renderColumn(MINUTES, minute, setMinute, minuteRef as any)}
          </View>

          {/* Selection highlight */}
          <View style={pickerStyles.selectionBar} pointerEvents="none" />
        </View>
      </Animated.View>
    </Modal>
  );
};

const pickerStyles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(11, 20, 38, 0.4)',
    justifyContent: 'flex-end',
  },
  overlayTap: { flex: 1 },
  sheet: {
    backgroundColor: '#FFFFFF',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    paddingTop: 8,
  },
  sheetHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: '#F3F4F6',
  },
  sheetTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#0B1426',
  },
  cancelText: {
    fontSize: 15,
    color: '#6B7280',
  },
  doneText: {
    fontSize: 15,
    fontWeight: '600',
    color: '#FF6B35',
  },
  pickerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    height: ITEM_HEIGHT * 5,
    paddingHorizontal: 40,
  },
  column: {
    width: 70,
    height: ITEM_HEIGHT * 5,
  },
  colon: {
    fontSize: 28,
    fontWeight: '700',
    color: '#0B1426',
    marginHorizontal: 8,
  },
  item: {
    height: ITEM_HEIGHT,
    alignItems: 'center',
    justifyContent: 'center',
  },
  itemSelected: {},
  itemText: {
    fontSize: 20,
    color: '#D1D5DB',
    fontWeight: '500',
  },
  itemTextSelected: {
    fontSize: 24,
    color: '#0B1426',
    fontWeight: '700',
  },
  selectionBar: {
    position: 'absolute',
    left: 40,
    right: 40,
    top: 14 + 49 + ITEM_HEIGHT * 2, // header + border + 2 items offset
    height: ITEM_HEIGHT,
    borderTopWidth: 1.5,
    borderBottomWidth: 1.5,
    borderColor: '#FF6B35' + '40',
    borderRadius: 8,
  },
});

/* ── Main Screen ── */
export const NotificationSettingsScreen: React.FC = () => {
  const { t } = useTranslation();
  const navigation = useNavigation();
  const insets = useSafeAreaInsets();
  const userId = useAuthStore(state => state.user?.id);

  const [prefs, setPrefs] = useState<NotificationPrefs>(DEFAULT_PREFS);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const [pickerTarget, setPickerTarget] = useState<'quietHoursStart' | 'quietHoursEnd' | null>(null);

  const showToast = useCallback((message: string) => {
    setToastMessage(message);
    setTimeout(() => setToastMessage(null), 2000);
  }, []);

  useEffect(() => {
    if (!userId) return;
    const fetchPrefs = async () => {
      try {
        const data = await api.get<any>(
          `/api/v1/notifications/users/${userId}/prefs`,
        );
        setPrefs({
          pushEnabled: data.push_enabled ?? DEFAULT_PREFS.pushEnabled,
          emailEnabled: data.email_enabled ?? DEFAULT_PREFS.emailEnabled,
          smsEnabled: data.sms_enabled ?? DEFAULT_PREFS.smsEnabled,
          quietHoursStart: data.quiet_hours_start || DEFAULT_PREFS.quietHoursStart,
          quietHoursEnd: data.quiet_hours_end || DEFAULT_PREFS.quietHoursEnd,
        });
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
        await api.put(`/api/v1/notifications/users/${userId}/prefs`, {
          push_enabled: updated.pushEnabled,
          email_enabled: updated.emailEnabled,
          sms_enabled: updated.smsEnabled,
          quiet_hours_start: updated.quietHoursStart || '22:00',
          quiet_hours_end: updated.quietHoursEnd || '08:00',
        } as unknown as Record<string, unknown>);
        // saved silently
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

  const handleTimeConfirm = useCallback(
    (time: string) => {
      if (!pickerTarget) return;
      const updated = { ...prefs, [pickerTarget]: time };
      setPrefs(updated);
      setPickerTarget(null);
      savePrefs(updated);
    },
    [prefs, pickerTarget, savePrefs],
  );

  const formatTime12 = (time24: string) => {
    const [hStr, m] = time24.split(':');
    const h = parseInt(hStr, 10);
    const ampm = h >= 12 ? 'PM' : 'AM';
    const h12 = h === 0 ? 12 : h > 12 ? h - 12 : h;
    return `${h12}:${m} ${ampm}`;
  };

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
          <View style={styles.quietHeader}>
            <Svg width={18} height={18} viewBox="0 0 24 24" fill="none">
              <Path d="M21 12.79A9 9 0 1111.21 3a7 7 0 009.79 9.79z" stroke={colors.textMuted} strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round" />
            </Svg>
            <Text style={[styles.sectionTitle, { marginBottom: 0, marginLeft: 8 }]}>{t('settings.quietHours')}</Text>
          </View>
          <Text style={styles.sectionDescription}>
            {t('settings.quietHoursDesc')}
          </Text>

          <View style={styles.card}>
            {/* Visual time range */}
            <View style={styles.timeRange}>
              <TouchableOpacity
                style={styles.timePill}
                onPress={() => setPickerTarget('quietHoursStart')}
                activeOpacity={0.7}
              >
                <Text style={styles.timePillLabel}>From</Text>
                <Text style={styles.timePillValue}>{formatTime12(prefs.quietHoursStart)}</Text>
              </TouchableOpacity>

              <View style={styles.timeArrow}>
                <Svg width={20} height={20} viewBox="0 0 24 24" fill="none">
                  <Path d="M5 12h14M12 5l7 7-7 7" stroke={colors.textMuted} strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round" />
                </Svg>
              </View>

              <TouchableOpacity
                style={styles.timePill}
                onPress={() => setPickerTarget('quietHoursEnd')}
                activeOpacity={0.7}
              >
                <Text style={styles.timePillLabel}>To</Text>
                <Text style={styles.timePillValue}>{formatTime12(prefs.quietHoursEnd)}</Text>
              </TouchableOpacity>
            </View>

            {/* Duration hint */}
            <View style={styles.durationRow}>
              <Svg width={14} height={14} viewBox="0 0 24 24" fill="none">
                <Path d="M12 22c5.523 0 10-4.477 10-10S17.523 2 12 2 2 6.477 2 12s4.477 10 10 10z" stroke={colors.textMuted} strokeWidth={1.5} />
                <Path d="M12 6v6l4 2" stroke={colors.textMuted} strokeWidth={1.5} strokeLinecap="round" />
              </Svg>
              <Text style={styles.durationText}>
                {(() => {
                  const [sh, sm] = prefs.quietHoursStart.split(':').map(Number);
                  const [eh, em] = prefs.quietHoursEnd.split(':').map(Number);
                  let diff = (eh * 60 + em) - (sh * 60 + sm);
                  if (diff <= 0) diff += 24 * 60;
                  const hours = Math.floor(diff / 60);
                  const mins = diff % 60;
                  return mins > 0 ? `${hours}h ${mins}m silent` : `${hours} hours silent`;
                })()}
              </Text>
            </View>
          </View>
        </View>

        <View style={styles.bottomSpacer} />
      </ScrollView>

      {/* Time Picker Modal */}
      <TimePicker
        visible={pickerTarget !== null}
        label={pickerTarget === 'quietHoursStart' ? 'Start Time' : 'End Time'}
        value={pickerTarget ? prefs[pickerTarget] : '22:00'}
        onConfirm={handleTimeConfirm}
        onCancel={() => setPickerTarget(null)}
      />

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
  quietHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: spacing.xs,
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
  timeRange: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  timePill: {
    flex: 1,
    backgroundColor: '#FFF7ED',
    borderRadius: 14,
    paddingVertical: 14,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#FF6B35' + '20',
  },
  timePillLabel: {
    fontSize: 11,
    fontWeight: '500',
    color: colors.textMuted,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: 4,
  },
  timePillValue: {
    fontSize: 20,
    fontWeight: '700',
    color: '#FF6B35',
  },
  timeArrow: {
    marginHorizontal: 12,
  },
  durationRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 14,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: colors.borderLight,
  },
  durationText: {
    fontSize: 13,
    color: colors.textMuted,
    marginLeft: 6,
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
