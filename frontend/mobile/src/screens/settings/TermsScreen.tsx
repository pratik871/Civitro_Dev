import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  StatusBar,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTranslation } from 'react-i18next';
import { colors } from '../../theme/colors';
import { spacing, borderRadius } from '../../theme/spacing';

interface TermsSection {
  title: string;
  body: string;
}

const TERMS_SECTIONS: TermsSection[] = [
  {
    title: '1. Acceptance of Terms',
    body: 'By accessing or using the Civitro platform, you agree to be bound by these Terms of Service and all applicable laws and regulations. If you do not agree with any of these terms, you are prohibited from using or accessing this platform. These terms apply to all users, including citizens, elected representatives, and government officials.',
  },
  {
    title: '2. User Accounts',
    body: 'To use Civitro, you must create an account using a valid Indian mobile number. You are required to provide accurate, current, and complete information during registration. Phone number verification via OTP is mandatory. Optional Aadhaar verification uses offline XML only and enhances your account trust level. You are responsible for maintaining the confidentiality of your account credentials.',
  },
  {
    title: '3. Content Guidelines',
    body: 'Users must not post content that contains hate speech, communal incitement, or targeted harassment. Filing deliberately false or misleading civic reports is prohibited and may result in Civic Score penalties or account suspension. Content must be relevant to civic governance and public interest. Impersonation of government officials or other citizens is strictly forbidden.',
  },
  {
    title: '4. Civic Score',
    body: 'Your Civic Score is calculated based on your platform activity, including issue reports, community engagement, and content quality. Scores can increase through constructive participation and decrease due to policy violations, spam, or false reports. Civic Score tiers determine access to certain platform features. The scoring algorithm may be updated periodically to ensure fairness.',
  },
  {
    title: '5. Privacy',
    body: 'Civitro collects minimal personal data necessary for platform functionality. Aadhaar data is processed as a one-way hash and never stored in raw form. Location data is used solely for geo-tagging civic reports and is not shared with third parties. Messages between users are end-to-end encrypted. For full details, refer to our Privacy Policy.',
  },
  {
    title: '6. Intellectual Property',
    body: 'Users retain ownership of all content they create on Civitro, including text, photos, and videos. By posting content, you grant Civitro a non-exclusive, royalty-free license to display, distribute, and use the content within the platform for civic governance purposes. The Civitro name, logo, and platform design are trademarks of Civitro and may not be used without permission.',
  },
  {
    title: '7. Limitation of Liability',
    body: 'Civitro provides the platform on an "as is" and "as available" basis. We do not guarantee that government agencies will respond to or resolve reported issues within any specific timeframe. Civitro is not liable for any indirect, incidental, or consequential damages arising from your use of the platform. Our total liability shall not exceed the amount you have paid to use the platform.',
  },
  {
    title: '8. Changes to Terms',
    body: 'Civitro reserves the right to modify these Terms of Service at any time. Users will be notified of material changes via in-app notification and email at least 14 days before the changes take effect. Continued use of the platform after changes constitutes acceptance of the revised terms.',
  },
  {
    title: '9. Contact',
    body: 'For questions or concerns about these Terms of Service, please contact us at support@civitro.in. You may also reach us through the Help & Support section within the app.',
  },
];

export const TermsScreen: React.FC = () => {
  const { t } = useTranslation();
  const navigation = useNavigation();
  const insets = useSafeAreaInsets();

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
        <Text style={styles.headerTitle}>{t('settings.termsOfService')}</Text>
        <View style={styles.headerSpacer} />
      </View>

      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
      >
        {/* Last Updated */}
        <Text style={styles.lastUpdated}>{t('settings.lastUpdated')}: March 2026</Text>

        {/* Terms Sections */}
        <View style={styles.termsCard}>
          {TERMS_SECTIONS.map((section, index) => (
            <View
              key={index}
              style={[
                styles.section,
                index < TERMS_SECTIONS.length - 1 && styles.sectionBorder,
              ]}
            >
              <Text style={styles.sectionTitle}>{section.title}</Text>
              <Text style={styles.sectionBody}>{section.body}</Text>
            </View>
          ))}
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
    paddingTop: spacing.xl,
  },
  lastUpdated: {
    fontSize: 13,
    color: colors.textMuted,
    marginBottom: spacing.lg,
    textAlign: 'center',
  },
  termsCard: {
    backgroundColor: colors.white,
    borderRadius: borderRadius.card,
    paddingHorizontal: spacing.lg,
    marginBottom: spacing.lg,
  },
  section: {
    paddingVertical: spacing.lg,
  },
  sectionBorder: {
    borderBottomWidth: 1,
    borderBottomColor: colors.borderLight,
  },
  sectionTitle: {
    fontSize: 15,
    fontWeight: '600',
    color: colors.textPrimary,
    marginBottom: spacing.sm,
  },
  sectionBody: {
    fontSize: 14,
    color: colors.textSecondary,
    lineHeight: 22,
  },
  bottomSpacer: {
    height: 40,
  },
});
