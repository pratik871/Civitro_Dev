import React, { useState } from 'react';
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
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTranslation } from 'react-i18next';
import { colors } from '../../theme/colors';
import { spacing, borderRadius } from '../../theme/spacing';

interface FAQItem {
  question: string;
  answer: string;
}

const FAQ_ITEMS: FAQItem[] = [
  {
    question: 'How do I report an issue?',
    answer:
      'Tap the Report tab, take a photo or describe the issue, add your location, select a category, and submit. Your report will be sent to the relevant department.',
  },
  {
    question: 'What is Civic Score?',
    answer:
      'Your Civic Score reflects your contribution to civic governance. You earn points by reporting issues (+10), receiving upvotes on your reports (+2), and commenting on issues (+3). Scores range from 0 to 1000 across 5 tiers.',
  },
  {
    question: 'How does Aadhaar verification work?',
    answer:
      'We use offline Aadhaar XML verification. Your data never leaves your device during verification. Only a hash is stored for deduplication.',
  },
  {
    question: 'Can I change my language?',
    answer:
      "Yes! Go to Profile > Language to select from 16 Indian languages. Content will be translated using Bhashini, India's national language AI platform.",
  },
  {
    question: 'How are leaders rated?',
    answer:
      'Leaders are rated on a 0-5 scale based on 5 weighted factors: issue resolution speed, response rate, promise fulfillment, citizen feedback, and engagement quality.',
  },
  {
    question: 'Is my data safe?',
    answer:
      'Yes. We use end-to-end encryption for messages, hash sensitive data like Aadhaar, and never share personal information with third parties.',
  },
  {
    question: 'How do I delete my account?',
    answer:
      'Go to Profile > Privacy & Security > Delete Account. This will permanently remove all your data within 30 days.',
  },
];

export const HelpSupportScreen: React.FC = () => {
  const { t } = useTranslation();
  const navigation = useNavigation();
  const insets = useSafeAreaInsets();
  const [expandedIndex, setExpandedIndex] = useState<number | null>(null);

  const toggleFAQ = (index: number) => {
    setExpandedIndex(prev => (prev === index ? null : index));
  };

  const handleEmailSupport = () => {
    Linking.openURL('mailto:support@civitro.in');
  };

  const handleReportBug = () => {
    Linking.openURL('mailto:support@civitro.in?subject=Bug%20Report');
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
        <Text style={styles.headerTitle}>{t('settings.helpSupport')}</Text>
        <View style={styles.headerSpacer} />
      </View>

      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
      >
        {/* FAQ Section */}
        <Text style={styles.sectionTitle}>{t('settings.faq')}</Text>

        <View style={styles.faqContainer}>
          {FAQ_ITEMS.map((item, index) => (
            <View key={index}>
              <TouchableOpacity
                style={[
                  styles.faqRow,
                  index < FAQ_ITEMS.length - 1 && styles.faqRowBorder,
                ]}
                onPress={() => toggleFAQ(index)}
                activeOpacity={0.7}
              >
                <Text style={styles.faqQuestion}>{item.question}</Text>
                <Text style={styles.faqChevron}>
                  {expandedIndex === index ? '\u25BE' : '\u25B8'}
                </Text>
              </TouchableOpacity>
              {expandedIndex === index && (
                <View style={styles.faqAnswerContainer}>
                  <Text style={styles.faqAnswer}>{item.answer}</Text>
                </View>
              )}
            </View>
          ))}
        </View>

        {/* Contact Section */}
        <Text style={styles.sectionTitle}>{t('settings.contactUs')}</Text>

        <View style={styles.contactCard}>
          <TouchableOpacity
            style={[styles.contactRow, styles.contactRowBorder]}
            onPress={handleEmailSupport}
            activeOpacity={0.7}
          >
            <Text style={styles.contactIcon}>{'\u2709'}</Text>
            <View style={styles.contactInfo}>
              <Text style={styles.contactLabel}>{t('settings.email')}</Text>
              <Text style={styles.contactValue}>support@civitro.in</Text>
            </View>
            <Text style={styles.contactArrow}>{'\u203A'}</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.contactRow}
            onPress={handleReportBug}
            activeOpacity={0.7}
          >
            <Text style={styles.contactIcon}>{'\uD83D\uDC1B'}</Text>
            <View style={styles.contactInfo}>
              <Text style={styles.contactLabel}>{t('settings.reportBug')}</Text>
              <Text style={styles.contactValue}>
                {t('settings.reportBugDesc')}
              </Text>
            </View>
            <Text style={styles.contactArrow}>{'\u203A'}</Text>
          </TouchableOpacity>
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
  sectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.textPrimary,
    marginBottom: spacing.md,
  },
  faqContainer: {
    backgroundColor: colors.white,
    borderRadius: borderRadius.card,
    paddingHorizontal: spacing.lg,
    marginBottom: spacing['2xl'],
  },
  faqRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: spacing.lg,
  },
  faqRowBorder: {
    borderBottomWidth: 1,
    borderBottomColor: colors.borderLight,
  },
  faqQuestion: {
    flex: 1,
    fontSize: 15,
    fontWeight: '500',
    color: colors.textPrimary,
    paddingRight: spacing.sm,
  },
  faqChevron: {
    fontSize: 16,
    color: colors.textMuted,
  },
  faqAnswerContainer: {
    paddingBottom: spacing.lg,
    borderBottomWidth: 1,
    borderBottomColor: colors.borderLight,
  },
  faqAnswer: {
    fontSize: 14,
    color: colors.textSecondary,
    lineHeight: 21,
  },
  contactCard: {
    backgroundColor: colors.white,
    borderRadius: borderRadius.card,
    paddingHorizontal: spacing.lg,
    marginBottom: spacing.lg,
  },
  contactRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: spacing.lg,
  },
  contactRowBorder: {
    borderBottomWidth: 1,
    borderBottomColor: colors.borderLight,
  },
  contactIcon: {
    fontSize: 20,
    marginRight: spacing.md,
    width: 28,
    textAlign: 'center',
  },
  contactInfo: {
    flex: 1,
  },
  contactLabel: {
    fontSize: 15,
    fontWeight: '500',
    color: colors.textPrimary,
  },
  contactValue: {
    fontSize: 13,
    color: colors.textMuted,
    marginTop: 2,
  },
  contactArrow: {
    fontSize: 22,
    color: colors.textMuted,
  },
  bottomSpacer: {
    height: 40,
  },
});
