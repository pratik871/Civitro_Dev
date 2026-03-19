import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  StatusBar,
  Linking,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
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

  const handleLinkPress = (item: LinkItem) => {
    if (item.action === 'url') {
      Linking.openURL(item.target);
    } else if (item.target === 'Terms') {
      navigation.navigate('Terms' as any);
    }
  };

  return (
    <View style={styles.container}>
      <StatusBar barStyle="dark-content" backgroundColor={colors.background} />

      {/* Header */}
      <View style={styles.header}>
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
          <View style={styles.logoContainer}>
            <Text style={styles.logoText}>C</Text>
          </View>
          <Text style={styles.appName}>Civitro</Text>
          <Text style={styles.tagline}>{t('settings.tagline')}</Text>
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
    paddingTop: spacing['3xl'],
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
  logoContainer: {
    width: 80,
    height: 80,
    borderRadius: borderRadius.xl,
    backgroundColor: colors.navy,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing.md,
  },
  logoText: {
    fontSize: 36,
    fontWeight: '700',
    color: colors.primary,
  },
  appName: {
    fontSize: 28,
    fontWeight: '700',
    color: colors.textPrimary,
    marginBottom: spacing.xs,
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
});
