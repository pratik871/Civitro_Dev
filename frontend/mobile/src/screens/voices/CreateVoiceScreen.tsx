import React, { useState, useCallback } from 'react';
import {
  View,
  Text,
  TextInput,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  StatusBar,
  Alert,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTranslation } from 'react-i18next';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import api from '../../lib/api';
import { colors } from '../../theme/colors';
import { spacing, borderRadius } from '../../theme/spacing';
import { useAuthStore } from '../../stores/authStore';

const MAX_CHARS = 500;

export const CreateVoiceScreen: React.FC = () => {
  const { t } = useTranslation();
  const insets = useSafeAreaInsets();
  const navigation = useNavigation();
  const queryClient = useQueryClient();
  const user = useAuthStore(state => state.user);

  const [voiceText, setVoiceText] = useState('');
  const [tagInput, setTagInput] = useState('');
  const [tags, setTags] = useState<string[]>([]);

  // ---------------------------------------------------------------------------
  // Mutation
  // ---------------------------------------------------------------------------

  const createVoice = useMutation({
    mutationFn: () =>
      api.post('/api/v1/voices', {
        text: voiceText.trim(),
        hashtags: tags,
        language: 'en', // TODO: use app language
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['voices'] });
      Alert.alert('', t('voices.postSuccess'), [
        { text: 'OK', onPress: () => navigation.goBack() },
      ]);
    },
    onError: (err: any) => {
      Alert.alert(
        'Error',
        err?.message || 'Could not post your voice. Please try again.',
      );
    },
  });

  // ---------------------------------------------------------------------------
  // Hashtag helpers
  // ---------------------------------------------------------------------------

  const addTag = useCallback(
    (raw: string) => {
      const cleaned = raw
        .replace(/[^a-zA-Z0-9_\u0900-\u097F\u0980-\u09FF\u0A00-\u0A7F\u0A80-\u0AFF\u0B00-\u0B7F\u0B80-\u0BFF\u0C00-\u0C7F\u0C80-\u0CFF\u0D00-\u0D7F]/g, '')
        .toLowerCase()
        .slice(0, 30);
      if (cleaned && !tags.includes(cleaned) && tags.length < 10) {
        setTags(prev => [...prev, cleaned]);
      }
    },
    [tags],
  );

  const removeTag = useCallback((tag: string) => {
    setTags(prev => prev.filter(t => t !== tag));
  }, []);

  const handleTagInputChange = useCallback(
    (text: string) => {
      // If user typed a space or comma, treat it as a separator
      if (text.endsWith(' ') || text.endsWith(',')) {
        const raw = text.slice(0, -1).trim();
        if (raw) addTag(raw);
        setTagInput('');
        return;
      }
      setTagInput(text);
    },
    [addTag],
  );

  const handleTagInputSubmit = useCallback(() => {
    const raw = tagInput.trim();
    if (raw) addTag(raw);
    setTagInput('');
  }, [tagInput, addTag]);

  // ---------------------------------------------------------------------------
  // Derived
  // ---------------------------------------------------------------------------

  const charCount = voiceText.length;
  const canPost = voiceText.trim().length > 0 && !createVoice.isPending;

  // ---------------------------------------------------------------------------
  // Render
  // ---------------------------------------------------------------------------

  return (
    <View style={styles.container}>
      <StatusBar barStyle="dark-content" backgroundColor={colors.background} />

      {/* Header */}
      <View style={[styles.header, { paddingTop: insets.top + 8 }]}>
        <TouchableOpacity
          onPress={() => navigation.goBack()}
          style={styles.backButton}
          activeOpacity={0.7}
          hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
        >
          <Text style={styles.backArrow}>{'\u2039'}</Text>
        </TouchableOpacity>
        <Text style={styles.headerTitle}>{t('voices.createVoice')}</Text>
        <View style={styles.headerRight} />
      </View>

      <KeyboardAvoidingView
        style={styles.flex}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        keyboardVerticalOffset={Platform.OS === 'ios' ? 0 : 0}
      >
        <ScrollView
          style={styles.flex}
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
        >
          {/* Voice text card */}
          <View style={styles.card}>
            <Text style={styles.sectionLabel}>{t('voices.whatOnYourMind')}</Text>
            <TextInput
              style={styles.textInput}
              placeholder={t('voices.placeholder')}
              placeholderTextColor={colors.textMuted}
              value={voiceText}
              onChangeText={text =>
                text.length <= MAX_CHARS ? setVoiceText(text) : undefined
              }
              maxLength={MAX_CHARS}
              multiline
              textAlignVertical="top"
              autoFocus
            />
            <Text style={styles.charCounter}>
              {t('voices.charCount', { count: charCount })}
            </Text>
          </View>

          {/* Hashtag card */}
          <View style={styles.card}>
            <Text style={styles.sectionLabel}>{t('voices.addHashtags')}</Text>
            <TextInput
              style={styles.tagInput}
              placeholder={t('voices.hashtagPlaceholder')}
              placeholderTextColor={colors.textMuted}
              value={tagInput}
              onChangeText={handleTagInputChange}
              onSubmitEditing={handleTagInputSubmit}
              returnKeyType="done"
              autoCapitalize="none"
              autoCorrect={false}
            />
            {tags.length > 0 && (
              <View style={styles.tagsContainer}>
                {tags.map(tag => (
                  <TouchableOpacity
                    key={tag}
                    style={styles.tagPill}
                    onPress={() => removeTag(tag)}
                    activeOpacity={0.7}
                  >
                    <Text style={styles.tagPillText}>#{tag}</Text>
                    <Text style={styles.tagRemove}>{'\u00D7'}</Text>
                  </TouchableOpacity>
                ))}
              </View>
            )}
          </View>
        </ScrollView>

        {/* Post button — pinned to bottom */}
        <View style={styles.bottomBar}>
          <TouchableOpacity
            style={[styles.postButton, !canPost && styles.postButtonDisabled]}
            onPress={() => createVoice.mutate()}
            disabled={!canPost}
            activeOpacity={0.8}
          >
            {createVoice.isPending ? (
              <View style={styles.postButtonInner}>
                <ActivityIndicator color={colors.white} size="small" />
                <Text style={styles.postButtonText}>
                  {t('voices.posting')}
                </Text>
              </View>
            ) : (
              <Text style={styles.postButtonText}>{t('voices.post')}</Text>
            )}
          </TouchableOpacity>
        </View>
      </KeyboardAvoidingView>
    </View>
  );
};

// ---------------------------------------------------------------------------
// Styles
// ---------------------------------------------------------------------------

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  flex: {
    flex: 1,
  },

  // Header
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.lg,
    paddingTop: spacing['2xl'],
    paddingBottom: spacing.md,
    backgroundColor: colors.background,
    borderBottomWidth: 1,
    borderBottomColor: colors.borderLight,
  },
  backButton: {
    width: 36,
    height: 36,
    borderRadius: borderRadius.full,
    backgroundColor: colors.white,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: colors.borderLight,
  },
  backArrow: {
    fontSize: 26,
    color: colors.textPrimary,
    marginTop: -2,
    lineHeight: 30,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: colors.textPrimary,
  },
  headerRight: {
    width: 36,
  },

  // Scroll
  scrollContent: {
    padding: spacing.lg,
    paddingBottom: spacing['3xl'],
  },

  // Cards
  card: {
    backgroundColor: colors.white,
    borderRadius: borderRadius.card,
    padding: spacing.lg,
    marginBottom: spacing.lg,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
    borderWidth: 1,
    borderColor: colors.borderLight,
  },

  sectionLabel: {
    fontSize: 15,
    fontWeight: '600',
    color: colors.textPrimary,
    marginBottom: spacing.md,
  },

  // Text input
  textInput: {
    minHeight: 150,
    fontSize: 16,
    lineHeight: 24,
    color: colors.textPrimary,
    padding: spacing.md,
    backgroundColor: colors.backgroundGray,
    borderRadius: borderRadius.lg,
    borderWidth: 1,
    borderColor: colors.border,
  },
  charCounter: {
    fontSize: 12,
    color: colors.textMuted,
    textAlign: 'right',
    marginTop: spacing.sm,
  },

  // Tag input
  tagInput: {
    height: 44,
    fontSize: 15,
    color: colors.textPrimary,
    paddingHorizontal: spacing.md,
    backgroundColor: colors.backgroundGray,
    borderRadius: borderRadius.lg,
    borderWidth: 1,
    borderColor: colors.border,
  },
  tagsContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
    marginTop: spacing.md,
  },
  tagPill: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.primary + '15',
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: borderRadius.full,
    gap: spacing.xs,
  },
  tagPillText: {
    fontSize: 13,
    fontWeight: '500',
    color: colors.primary,
  },
  tagRemove: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.primary,
    marginLeft: spacing.xs,
  },

  // Bottom bar
  bottomBar: {
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.md,
    paddingBottom: spacing['2xl'],
    backgroundColor: colors.background,
    borderTopWidth: 1,
    borderTopColor: colors.borderLight,
  },
  postButton: {
    backgroundColor: colors.primary,
    borderRadius: borderRadius.button,
    paddingVertical: spacing.lg,
    alignItems: 'center',
    justifyContent: 'center',
  },
  postButtonDisabled: {
    opacity: 0.5,
  },
  postButtonInner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  postButtonText: {
    fontSize: 16,
    fontWeight: '700',
    color: colors.white,
  },
});
