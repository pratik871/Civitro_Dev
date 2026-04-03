import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  StatusBar,
  Linking,
  Image,
  Modal,
  Pressable,
} from 'react-native';
import Svg, { Path, Circle as SvgCircle } from 'react-native-svg';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTranslation } from 'react-i18next';
import Constants from 'expo-constants';
import { colors } from '../../theme/colors';
import { spacing, borderRadius } from '../../theme/spacing';
import type { RootStackParamList } from '../../navigation/types';

type AboutNavProp = NativeStackNavigationProp<RootStackParamList>;

interface InfoRow {
  labelKey: string;
  valueKey: string;
}

const appVersion = Constants.expoConfig?.version ?? '1.0.0';

const INFO_ROWS: InfoRow[] = [
  { labelKey: 'settings.platform', valueKey: 'settings.platformValue' },
  { labelKey: 'settings.version', valueKey: '' },
  { labelKey: 'settings.languageAI', valueKey: 'settings.poweredByBhashini' },
  { labelKey: 'settings.builtWith', valueKey: 'settings.builtWithValue' },
];

interface LinkItem {
  labelKey: string;
  action: 'url' | 'navigate';
  target: string;
}

const LINK_ITEMS: LinkItem[] = [
  { labelKey: 'settings.website', action: 'url', target: 'https://civitro.in' },
  { labelKey: 'settings.privacyPolicy', action: 'url', target: 'https://civitro.in/privacy' },
  { labelKey: 'settings.termsOfService', action: 'navigate', target: 'Terms' },
  { labelKey: 'settings.openSourceLicenses', action: 'url', target: 'https://civitro.in/licenses' },
];

export const AboutScreen: React.FC = () => {
  const { t } = useTranslation();
  const navigation = useNavigation<AboutNavProp>();
  const insets = useSafeAreaInsets();
  const [showComingSoon, setShowComingSoon] = React.useState(false);
  const [comingSoonLabel, setComingSoonLabel] = React.useState('');

  const handleLinkPress = (item: LinkItem) => {
    setComingSoonLabel(t(item.labelKey));
    setShowComingSoon(true);
  };

  return (
    <View style={styles.container}>
      <StatusBar barStyle="dark-content" backgroundColor={colors.background} />

      {/* Header */}
      <View style={[styles.header, { paddingTop: insets.top + 12 }]}>
        <TouchableOpacity
          onPress={() => navigation.goBack()}
          style={styles.backButton}
          activeOpacity={0.7}
        >
          <Text style={styles.backArrow}>{'\u2039'}</Text>
        </TouchableOpacity>
        <Text style={styles.headerTitle}>{t('settings.aboutCivitro')}</Text>
        <View style={styles.headerSpacer} />
      </View>

      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
      >
        {/* Logo / App Name */}
        <View style={styles.logoArea}>
          <Image
            source={require('../../../assets/icon.png')}
            style={styles.logoImage}
            resizeMode="contain"
          />
          <Text style={styles.tagline}>Democracy. You Shape.{'\u2122'}</Text>
        </View>

        {/* Description */}
        <View style={styles.descriptionCard}>
          <Text style={styles.description}>
            {t('settings.aboutDescription')}
          </Text>
        </View>

        {/* Info Rows */}
        <Text style={styles.sectionLabel}>{t('settings.information')}</Text>
        <View style={styles.infoCard}>
          {INFO_ROWS.map((row, index) => (
            <View
              key={index}
              style={[
                styles.infoRow,
                index < INFO_ROWS.length - 1 && styles.infoRowBorder,
              ]}
            >
              <Text style={styles.infoLabel}>{t(row.labelKey)}</Text>
              <Text style={styles.infoValue}>{row.valueKey ? t(row.valueKey) : appVersion}</Text>
            </View>
          ))}
        </View>

        {/* Links */}
        <Text style={styles.sectionLabel}>{t('settings.links')}</Text>
        <View style={styles.linksCard}>
          {LINK_ITEMS.map((item, index) => (
            <TouchableOpacity
              key={index}
              style={[
                styles.linkRow,
                index < LINK_ITEMS.length - 1 && styles.linkRowBorder,
              ]}
              onPress={() => handleLinkPress(item)}
              activeOpacity={0.7}
            >
              <Text style={styles.linkLabel}>{t(item.labelKey)}</Text>
              <Text style={styles.linkArrow}>{'\u203A'}</Text>
            </TouchableOpacity>
          ))}
        </View>

        {/* Made in India */}
        <View style={styles.madeInIndia}>
          <Text style={styles.madeInIndiaText}>
            {'\uD83C\uDDEE\uD83C\uDDF3'} {t('settings.madeInIndia')}
          </Text>
        </View>

        <View style={styles.bottomSpacer} />
      </ScrollView>

      {/* Coming Soon Modal */}
      <Modal visible={showComingSoon} transparent animationType="fade" onRequestClose={() => setShowComingSoon(false)}>
        <Pressable style={styles.modalOverlay} onPress={() => setShowComingSoon(false)}>
          <View style={styles.modalCard}>
            {/* Animated icon */}
            <View style={styles.modalIconWrap}>
              <Svg width={48} height={48} viewBox="0 0 48 48" fill="none">
                <SvgCircle cx={24} cy={24} r={22} stroke="#FF6B35" strokeWidth={2.5} strokeDasharray="8 4" />
                <Path d="M24 14v12l8 4" stroke="#FF6B35" strokeWidth={2.5} strokeLinecap="round" strokeLinejoin="round" />
              </Svg>
            </View>

            {/* Title */}
            <Text style={styles.modalTitle}>{t('home.comingSoon', 'Coming Soon')}</Text>

            {/* Feature name */}
            <View style={styles.modalFeaturePill}>
              <Text style={styles.modalFeatureText}>{comingSoonLabel}</Text>
            </View>

            {/* Description */}
            <Text style={styles.modalDesc}>
              {t('about.comingSoonDesc', "We're working hard to bring this to you. Stay tuned for updates!")}
            </Text>

            {/* Button */}
            <TouchableOpacity
              style={styles.modalBtn}
              onPress={() => setShowComingSoon(false)}
              activeOpacity={0.8}
            >
              <Text style={styles.modalBtnText}>{t('home.gotIt', 'Got it')}</Text>
            </TouchableOpacity>
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
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.lg,
    paddingBottom: spacing.md,
    backgroundColor: colors.background,
    borderBottomWidth: 1,
    borderBottomColor: colors.borderLight,
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
  headerSpacer: {
    width: 36,
  },
  scrollView: {
    flex: 1,
  },
  content: {
    paddingHorizontal: spacing.lg,
    paddingTop: spacing['2xl'],
  },
  logoArea: {
    alignItems: 'center',
    marginBottom: spacing['2xl'],
  },
  logoImage: {
    width: 180,
    height: 100,
    marginBottom: spacing.sm,
  },
  tagline: {
    fontSize: 15,
    color: colors.textMuted,
    fontStyle: 'italic',
  },
  descriptionCard: {
    backgroundColor: colors.white,
    borderRadius: borderRadius.card,
    padding: spacing.lg,
    marginBottom: spacing['2xl'],
  },
  description: {
    fontSize: 14,
    color: colors.textSecondary,
    lineHeight: 22,
    textAlign: 'center',
  },
  sectionLabel: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.textPrimary,
    marginBottom: spacing.md,
  },
  infoCard: {
    backgroundColor: colors.white,
    borderRadius: borderRadius.card,
    paddingHorizontal: spacing.lg,
    marginBottom: spacing['2xl'],
  },
  infoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: spacing.md,
  },
  infoRowBorder: {
    borderBottomWidth: 1,
    borderBottomColor: colors.borderLight,
  },
  infoLabel: {
    fontSize: 15,
    color: colors.textPrimary,
    fontWeight: '500',
  },
  infoValue: {
    fontSize: 14,
    color: colors.textMuted,
    flexShrink: 1,
    textAlign: 'right',
    marginLeft: spacing.lg,
  },
  linksCard: {
    backgroundColor: colors.white,
    borderRadius: borderRadius.card,
    paddingHorizontal: spacing.lg,
    marginBottom: spacing['2xl'],
  },
  linkRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: spacing.md,
  },
  linkRowBorder: {
    borderBottomWidth: 1,
    borderBottomColor: colors.borderLight,
  },
  linkLabel: {
    flex: 1,
    fontSize: 15,
    color: colors.primary,
    fontWeight: '500',
  },
  linkArrow: {
    fontSize: 22,
    color: colors.textMuted,
  },
  madeInIndia: {
    alignItems: 'center',
    paddingVertical: spacing.xl,
  },
  madeInIndiaText: {
    fontSize: 15,
    fontWeight: '600',
    color: colors.textSecondary,
  },
  bottomSpacer: {
    height: 40,
  },

  // Coming Soon Modal
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(11, 20, 38, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 32,
  },
  modalCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 24,
    padding: 32,
    alignItems: 'center',
    width: '100%',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 12 },
    shadowOpacity: 0.15,
    shadowRadius: 32,
    elevation: 12,
  },
  modalIconWrap: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: '#FFF3ED',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 20,
  },
  modalTitle: {
    fontSize: 22,
    fontWeight: '700',
    color: '#0B1426',
    marginBottom: 12,
    textAlign: 'center',
  },
  modalFeaturePill: {
    backgroundColor: '#FFF3ED',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#FF6B35' + '30',
  },
  modalFeatureText: {
    fontSize: 15,
    fontWeight: '600',
    color: '#FF6B35',
  },
  modalDesc: {
    fontSize: 14,
    color: '#6B7280',
    textAlign: 'center',
    lineHeight: 21,
    marginBottom: 24,
  },
  modalBtn: {
    width: '100%',
    paddingVertical: 14,
    borderRadius: 14,
    backgroundColor: '#FF6B35',
    alignItems: 'center',
  },
  modalBtnText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#FFFFFF',
  },
});
