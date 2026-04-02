import React, { useState, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  StatusBar,
  TouchableOpacity,
  TextInput,
  Alert,
  Modal,
  Pressable,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import Svg, { Path, Circle } from 'react-native-svg';
import { useNavigation, useRoute } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { Card } from '../../components/ui/Card';
import { Badge } from '../../components/ui/Badge';
import { Button } from '../../components/ui/Button';
import { TranslatedText } from '../../components/ui/TranslatedText';
import { useTranslation } from 'react-i18next';
import { colors } from '../../theme/colors';
import { spacing, borderRadius } from '../../theme/spacing';
import { useCreateAction } from '../../hooks/useCommunityActions';
import { useIssues } from '../../hooks/useIssues';
import api from '../../lib/api';
import type { Issue } from '../../types/issue';
import type { RootStackParamList } from '../../navigation/types';

type NavProp = NativeStackNavigationProp<RootStackParamList>;

const TITLE_MAX = 200;
const MIN_LINKED_ISSUES = 3;

export const CreateActionScreen: React.FC = () => {
  const { t } = useTranslation();
  const navigation = useNavigation<NavProp>();
  const route = useRoute<any>();
  const createMutation = useCreateAction();
  const { data: issues } = useIssues();

  // If navigated from a pattern, pre-populate linked issues
  const patternId = route.params?.patternId as string | undefined;

  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [desiredOutcome, setDesiredOutcome] = useState('');
  const [targetAuthorityId, setTargetAuthorityId] = useState('');
  const [linkedIssueIds, setLinkedIssueIds] = useState<string[]>([]);
  const [issueSearchQuery, setIssueSearchQuery] = useState('');
  const [showPreview, setShowPreview] = useState(false);
  const [patternLoaded, setPatternLoaded] = useState(false);
  const [showSuccess, setShowSuccess] = useState(false);

  // Fetch pattern info and auto-link issues by category when navigated from a pattern
  React.useEffect(() => {
    if (patternId && !patternLoaded) {
      api
        .get<any>(`/api/v1/patterns/${patternId}`)
        .then((res) => {
          const pattern = res.pattern ?? res;
          // Pre-fill title from pattern data
          if (pattern.category && !title) {
            const cat = (pattern.category as string).replace('_', ' ');
            setTitle(`Fix ${cat} issues in our ward`);
            setDescription(`${pattern.report_count ?? 0} reports of ${cat} issues across ${pattern.unique_locations ?? 0} locations over ${pattern.days_unresolved ?? 0} days. Zero resolved.`);
            setDesiredOutcome(`Resolve all ${cat} complaints and prevent recurrence.`);
          }
          // Auto-link issues matching pattern category from loaded issues
          if (pattern.category && issues) {
            const matching = issues
              .filter(i => i.category === pattern.category)
              .map(i => i.id)
              .slice(0, 10);
            if (matching.length > 0) {
              setLinkedIssueIds(matching);
            }
          }
          setPatternLoaded(true);
        })
        .catch(() => {
          setPatternLoaded(true);
        });
    }
  }, [patternId, patternLoaded, issues]);

  const searchResults = useMemo(() => {
    if (!issueSearchQuery.trim() || !issues) return [];
    const q = issueSearchQuery.toLowerCase();
    return issues
      .filter(
        i =>
          !linkedIssueIds.includes(i.id) &&
          ((i.title || i.text || '').toLowerCase().includes(q) ||
            (i.category || '').toLowerCase().includes(q) ||
            (i.address || '').toLowerCase().includes(q)),
      )
      .slice(0, 10);
  }, [issues, issueSearchQuery, linkedIssueIds]);

  const linkedIssues = useMemo(() => {
    if (!issues) return [];
    return issues.filter(i => linkedIssueIds.includes(i.id));
  }, [issues, linkedIssueIds]);

  const detectedCategory = useMemo(() => {
    if (linkedIssues.length === 0) return null;
    const counts: Record<string, number> = {};
    linkedIssues.forEach(i => {
      counts[i.category] = (counts[i.category] || 0) + 1;
    });
    return Object.entries(counts).sort((a, b) => b[1] - a[1])[0]?.[0] ?? null;
  }, [linkedIssues]);

  const canSubmit =
    title.trim().length > 0 &&
    description.trim().length > 0 &&
    desiredOutcome.trim().length > 0 &&
    (linkedIssueIds.length >= MIN_LINKED_ISSUES || !!patternId);

  const handleLinkIssue = (issueId: string) => {
    setLinkedIssueIds(prev => [...prev, issueId]);
    setIssueSearchQuery('');
  };

  const handleUnlinkIssue = (issueId: string) => {
    setLinkedIssueIds(prev => prev.filter(id => id !== issueId));
  };

  const handleSubmit = () => {
    if (!canSubmit) return;
    const payload = {
      title: title.trim(),
      description: description.trim(),
      desiredOutcome: desiredOutcome.trim(),
      targetAuthorityId,
      linkedIssueIds,
      ...(patternId ? { patternId } : {}),
    };
    console.log('=== CREATE ACTION PAYLOAD ===');
    console.log('title:', payload.title);
    console.log('description:', payload.description?.substring(0, 50));
    console.log('desiredOutcome:', payload.desiredOutcome?.substring(0, 50));
    console.log('targetAuthorityId:', payload.targetAuthorityId);
    console.log('linkedIssueIds:', JSON.stringify(payload.linkedIssueIds));
    console.log('patternId:', (payload as any).patternId);
    console.log('canSubmit:', canSubmit);

    createMutation.mutate(
      payload,
      {
        onSuccess: (data) => {
          console.log('=== CREATE ACTION SUCCESS ===', JSON.stringify(data));
          setShowSuccess(true);
        },
        onError: (err: any) => {
          console.log('=== CREATE ACTION ERROR ===');
          console.log('error message:', err?.message);
          console.log('error response:', JSON.stringify(err?.response?.data));
          console.log('error status:', err?.response?.status);
          Alert.alert('Error', err.message || 'Could not create action.');
        },
      },
    );
  };

  if (showPreview) {
    return (
      <>
      <ScrollView style={styles.container} contentContainerStyle={styles.content}>
        <StatusBar barStyle="dark-content" backgroundColor={colors.background} />

        <View style={styles.previewHeader}>
          <Text style={styles.previewLabel}>{t('actions.preview', 'PREVIEW')}</Text>
          <TouchableOpacity onPress={() => setShowPreview(false)}>
            <Text style={styles.editLink}>{t('actions.edit', 'Edit')}</Text>
          </TouchableOpacity>
        </View>

        <Card style={styles.previewCard}>
          <Text style={styles.previewTitle}>{title}</Text>
          <Text style={styles.previewDescription}>{description}</Text>

          <View style={styles.outcomeBox}>
            <Text style={styles.outcomeLabel}>{t('actions.desiredOutcome', 'DESIRED OUTCOME')}</Text>
            <Text style={styles.outcomeText}>{desiredOutcome}</Text>
          </View>

          {detectedCategory && (
            <View style={styles.categoryRow}>
              <Text style={styles.fieldLabel}>{t('actions.autoDetectedCategory', 'Auto-detected category:')}</Text>
              <Badge
                text={detectedCategory.replace('_', ' ')}
                backgroundColor={colors.saffron + '15'}
                color={colors.saffron}
                size="sm"
              />
            </View>
          )}

          <Text style={styles.fieldLabel}>
            {t('actions.linkedEvidence', 'Linked Evidence')}: {linkedIssues.length} {t('actions.issuesCount', 'issues')}
          </Text>
          {linkedIssues.map(issue => (
            <View key={issue.id} style={styles.linkedIssueMini}>
              <Text style={styles.linkedIssueDot}>{'\u2022'}</Text>
              <Text style={styles.linkedIssueMiniText} numberOfLines={1}>
                {issue.title}
              </Text>
            </View>
          ))}
        </Card>

        <View style={styles.submitRow}>
          <Button
            title={t('actions.publishAction', 'Publish Action')}
            onPress={handleSubmit}
            variant="primary"
            size="lg"
            loading={createMutation.isPending}
            style={styles.submitButton}
          />
        </View>
      </ScrollView>
      <Modal visible={showSuccess} transparent animationType="fade">
        <Pressable style={successStyles.backdrop} onPress={() => { setShowSuccess(false); navigation.goBack(); }}>
          <View style={successStyles.card}>
            <View style={successStyles.iconWrap}>
              <Svg viewBox="0 0 24 24" width={32} height={32} fill="none">
                <Circle cx={12} cy={12} r={10} stroke="#10B981" strokeWidth={2} />
                <Path d="M8 12l3 3 5-6" stroke="#10B981" strokeWidth={2.5} strokeLinecap="round" strokeLinejoin="round" />
              </Svg>
            </View>
            <Text style={successStyles.title}>{t('actions.actionPublished', 'Action Published!')}</Text>
            <Text style={successStyles.subtitle}>{t('actions.actionPublishedDesc', 'Your community action is now live. Citizens in your ward can support it.')}</Text>
            <TouchableOpacity style={successStyles.btnPrimary} onPress={() => { setShowSuccess(false); navigation.goBack(); }} activeOpacity={0.7}>
              <Text style={successStyles.btnPrimaryText}>{t('actions.done', 'Done')}</Text>
            </TouchableOpacity>
          </View>
        </Pressable>
      </Modal>
      </>
    );
  }

  return (
    <>
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <ScrollView
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
      >
        <StatusBar barStyle="dark-content" backgroundColor={colors.background} />

        <View style={styles.header}>
          <Text style={styles.headerTitle}>{t('actions.startCommunityAction', 'Start a Community Action')}</Text>
          <Text style={styles.headerSubtitle}>
            {t('actions.rallyYourWard', 'Rally your ward around systemic change')}
          </Text>
        </View>

        {/* Title */}
        <View style={styles.fieldGroup}>
          <Text style={styles.fieldLabel}>{t('actions.title', 'Title')}</Text>
          <TextInput
            style={styles.textInput}
            placeholder={t('actions.titlePlaceholder', 'What change do you want to see?')}
            placeholderTextColor={colors.textMuted}
            value={title}
            onChangeText={t => setTitle(t.slice(0, TITLE_MAX))}
            maxLength={TITLE_MAX}
          />
          <Text style={styles.charCount}>
            {title.length}/{TITLE_MAX}
          </Text>
        </View>

        {/* Description */}
        <View style={styles.fieldGroup}>
          <Text style={styles.fieldLabel}>{t('actions.impactStatement', 'Impact Statement')}</Text>
          <TextInput
            style={[styles.textInput, styles.textArea]}
            placeholder={t('actions.impactPlaceholder', 'Describe the impact this issue has on your community...')}
            placeholderTextColor={colors.textMuted}
            value={description}
            onChangeText={setDescription}
            multiline
            textAlignVertical="top"
          />
        </View>

        {/* Desired Outcome */}
        <View style={styles.fieldGroup}>
          <Text style={styles.fieldLabel}>{t('actions.desiredOutcomeLabel', 'Desired Outcome')}</Text>
          <TextInput
            style={[styles.textInput, styles.textArea]}
            placeholder={t('actions.outcomePlaceholder', 'What specific result are you seeking?')}
            placeholderTextColor={colors.textMuted}
            value={desiredOutcome}
            onChangeText={setDesiredOutcome}
            multiline
            textAlignVertical="top"
          />
        </View>

        {/* Target Authority */}
        <View style={styles.fieldGroup}>
          <Text style={styles.fieldLabel}>{t('actions.targetAuthority', 'Target Authority (Optional)')}</Text>
          <TextInput
            style={styles.textInput}
            placeholder={t('actions.searchAuthority', 'Search for a ward officer or leader...')}
            placeholderTextColor={colors.textMuted}
            value={targetAuthorityId}
            onChangeText={setTargetAuthorityId}
          />
        </View>

        {/* Link Evidence */}
        <View style={styles.fieldGroup}>
          <Text style={styles.fieldLabel}>{t('actions.linkEvidence', 'Link Evidence (Issues)')}</Text>
          {linkedIssueIds.length < MIN_LINKED_ISSUES && (
            <View style={styles.warningBox}>
              <Text style={styles.warningIcon}>{'\u26A0'}</Text>
              <Text style={styles.warningText}>
                {t('actions.minIssuesRequired', 'Minimum {{count}} linked issues required.', { count: MIN_LINKED_ISSUES })}{' '}
                {t('actions.moreNeeded', '{{count}} more needed.', { count: MIN_LINKED_ISSUES - linkedIssueIds.length })}
              </Text>
            </View>
          )}

          {/* Linked issues */}
          {linkedIssues.map(issue => (
            <View key={issue.id} style={styles.linkedIssueRow}>
              <View style={styles.linkedIssueInfo}>
                <Text style={styles.linkedIssueTitle} numberOfLines={1}>
                  {issue.title}
                </Text>
                <Text style={styles.linkedIssueMeta}>
                  {issue.category.replace('_', ' ')} -- {issue.address}
                </Text>
              </View>
              <TouchableOpacity
                style={styles.unlinkButton}
                onPress={() => handleUnlinkIssue(issue.id)}
              >
                <Text style={styles.unlinkText}>{'\u2715'}</Text>
              </TouchableOpacity>
            </View>
          ))}

          {/* Search issues */}
          <TextInput
            style={[styles.textInput, { marginTop: spacing.sm }]}
            placeholder={t('actions.searchIssuesToLink', 'Search issues to link...')}
            placeholderTextColor={colors.textMuted}
            value={issueSearchQuery}
            onChangeText={setIssueSearchQuery}
          />

          {searchResults.length > 0 && (
            <View style={styles.searchResults}>
              {searchResults.map((issue: Issue) => (
                <TouchableOpacity
                  key={issue.id}
                  style={styles.searchResultItem}
                  onPress={() => handleLinkIssue(issue.id)}
                >
                  <Text style={styles.searchResultTitle} numberOfLines={1}>
                    {issue.title}
                  </Text>
                  <Text style={styles.searchResultMeta}>
                    {issue.category.replace('_', ' ')} -- {issue.address}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          )}
        </View>

        {/* Auto-detected category */}
        {detectedCategory && (
          <View style={styles.detectedRow}>
            <Text style={styles.detectedLabel}>{t('actions.autoDetectedCategory', 'Auto-detected category:')}</Text>
            <Badge
              text={detectedCategory.replace('_', ' ')}
              backgroundColor={colors.saffron + '15'}
              color={colors.saffron}
              size="sm"
            />
          </View>
        )}

        {/* Preview button */}
        <View style={styles.submitRow}>
          <Button
            title={t('actions.previewAction', 'Preview Action')}
            onPress={() => setShowPreview(true)}
            variant="primary"
            size="lg"
            disabled={!canSubmit}
            style={[styles.submitButton, !canSubmit && styles.submitButtonDisabled]}
          />
          {!canSubmit && (
            <Text style={styles.submitHint}>
              {t('actions.fillAllFields', 'Fill all fields and link at least {{count}} issues to continue.', { count: MIN_LINKED_ISSUES })}
            </Text>
          )}
        </View>

        <View style={{ height: 40 }} />
      </ScrollView>
    </KeyboardAvoidingView>

    {/* Success Modal */}
    {console.log('=== MODAL STATE ===', showSuccess)}
    <Modal visible={showSuccess} transparent animationType="fade">
      <Pressable style={successStyles.backdrop} onPress={() => { setShowSuccess(false); navigation.goBack(); }}>
        <View style={successStyles.card}>
          <View style={successStyles.iconWrap}>
            <Svg viewBox="0 0 24 24" width={32} height={32} fill="none">
              <Circle cx={12} cy={12} r={10} stroke="#10B981" strokeWidth={2} />
              <Path d="M8 12l3 3 5-6" stroke="#10B981" strokeWidth={2.5} strokeLinecap="round" strokeLinejoin="round" />
            </Svg>
          </View>
          <Text style={successStyles.title}>{t('actions.actionPublished', 'Action Published!')}</Text>
          <Text style={successStyles.subtitle}>{t('actions.actionPublishedDescFull', 'Your community action is now live. Citizens in your ward can support it and rally for change.')}</Text>
          <TouchableOpacity style={successStyles.btnPrimary} onPress={() => { setShowSuccess(false); navigation.goBack(); }} activeOpacity={0.7}>
            <Text style={successStyles.btnPrimaryText}>{t('actions.done', 'Done')}</Text>
          </TouchableOpacity>
        </View>
      </Pressable>
    </Modal>
    </>
  );
};

const successStyles = StyleSheet.create({
  backdrop: { flex: 1, backgroundColor: 'rgba(0,0,0,0.4)', justifyContent: 'center', alignItems: 'center', padding: 40 },
  card: { backgroundColor: '#FFFFFF', borderRadius: 20, padding: 28, alignItems: 'center', width: '100%', maxWidth: 300, shadowColor: '#000', shadowOffset: { width: 0, height: 12 }, shadowOpacity: 0.15, shadowRadius: 24, elevation: 10 },
  iconWrap: { width: 64, height: 64, borderRadius: 32, backgroundColor: '#ECFDF5', alignItems: 'center', justifyContent: 'center', marginBottom: 16 },
  title: { fontSize: 20, fontWeight: '800', color: '#0B1426', marginBottom: 8 },
  subtitle: { fontSize: 13, color: '#6B7280', textAlign: 'center', lineHeight: 19, marginBottom: 20 },
  btnPrimary: { backgroundColor: '#FF6B35', paddingVertical: 12, paddingHorizontal: 32, borderRadius: 12, alignItems: 'center', width: '100%', shadowColor: '#FF6B35', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.25, shadowRadius: 10, elevation: 4 },
  btnPrimaryText: { fontSize: 15, fontWeight: '700', color: '#FFFFFF' },
});

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  content: {
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.md,
    paddingBottom: spacing['3xl'],
  },

  // Header
  header: {
    marginBottom: spacing.xl,
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: '700',
    color: colors.textPrimary,
    marginBottom: spacing.xs,
  },
  headerSubtitle: {
    fontSize: 15,
    color: colors.textMuted,
  },

  // Fields
  fieldGroup: {
    marginBottom: spacing.xl,
  },
  fieldLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.textPrimary,
    marginBottom: spacing.sm,
  },
  textInput: {
    backgroundColor: colors.white,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: borderRadius.md,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.md,
    fontSize: 15,
    color: colors.textPrimary,
  },
  textArea: {
    height: 100,
    paddingTop: spacing.md,
  },
  charCount: {
    fontSize: 12,
    color: colors.textMuted,
    textAlign: 'right',
    marginTop: spacing.xs,
  },

  // Warning
  warningBox: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    backgroundColor: colors.warning + '10',
    borderWidth: 1,
    borderColor: colors.warning + '30',
    borderRadius: borderRadius.md,
    padding: spacing.md,
    marginBottom: spacing.sm,
  },
  warningIcon: {
    fontSize: 16,
  },
  warningText: {
    fontSize: 13,
    color: colors.warning,
    fontWeight: '500',
    flex: 1,
  },

  // Linked issues
  linkedIssueRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.white,
    borderWidth: 1,
    borderColor: colors.saffron + '30',
    borderRadius: borderRadius.md,
    padding: spacing.md,
    marginBottom: spacing.sm,
  },
  linkedIssueInfo: {
    flex: 1,
  },
  linkedIssueTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.textPrimary,
  },
  linkedIssueMeta: {
    fontSize: 12,
    color: colors.textMuted,
    marginTop: 1,
    textTransform: 'capitalize',
  },
  unlinkButton: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: colors.error + '12',
    alignItems: 'center',
    justifyContent: 'center',
    marginLeft: spacing.sm,
  },
  unlinkText: {
    fontSize: 12,
    color: colors.error,
    fontWeight: '700',
  },

  // Search results
  searchResults: {
    backgroundColor: colors.white,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: borderRadius.md,
    marginTop: spacing.xs,
    maxHeight: 200,
  },
  searchResultItem: {
    padding: spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: colors.borderLight,
  },
  searchResultTitle: {
    fontSize: 14,
    fontWeight: '500',
    color: colors.textPrimary,
  },
  searchResultMeta: {
    fontSize: 12,
    color: colors.textMuted,
    marginTop: 1,
    textTransform: 'capitalize',
  },

  // Detected category
  detectedRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    marginBottom: spacing.xl,
  },
  detectedLabel: {
    fontSize: 13,
    color: colors.textMuted,
  },

  // Submit
  submitRow: {
    alignItems: 'center',
  },
  submitButton: {
    width: '100%',
    backgroundColor: colors.saffron,
  },
  submitButtonDisabled: {
    opacity: 0.5,
  },
  submitHint: {
    fontSize: 12,
    color: colors.textMuted,
    textAlign: 'center',
    marginTop: spacing.sm,
  },

  // Preview
  previewHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: spacing.lg,
  },
  previewLabel: {
    fontSize: 12,
    fontWeight: '700',
    color: colors.saffron,
    textTransform: 'uppercase',
    letterSpacing: 1,
  },
  editLink: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.saffron,
  },
  previewCard: {
    marginBottom: spacing.xl,
  },
  previewTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: colors.textPrimary,
    marginBottom: spacing.sm,
  },
  previewDescription: {
    fontSize: 15,
    color: colors.textSecondary,
    lineHeight: 22,
    marginBottom: spacing.md,
  },
  outcomeBox: {
    backgroundColor: colors.saffron + '08',
    borderLeftWidth: 3,
    borderLeftColor: colors.saffron,
    padding: spacing.md,
    borderRadius: borderRadius.sm,
    marginBottom: spacing.md,
  },
  outcomeLabel: {
    fontSize: 11,
    fontWeight: '600',
    color: colors.saffron,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: spacing.xs,
  },
  outcomeText: {
    fontSize: 14,
    color: colors.textPrimary,
    lineHeight: 20,
  },
  categoryRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    marginBottom: spacing.md,
  },
  linkedIssueMini: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    paddingVertical: spacing.xs,
  },
  linkedIssueDot: {
    fontSize: 14,
    color: colors.saffron,
  },
  linkedIssueMiniText: {
    fontSize: 13,
    color: colors.textSecondary,
    flex: 1,
  },
});
