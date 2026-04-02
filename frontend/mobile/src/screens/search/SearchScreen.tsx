import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  FlatList,
  TouchableOpacity,
  StatusBar,
  ActivityIndicator,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { useTranslation } from 'react-i18next';
import { useSearch } from '../../hooks/useSearch';
import { Badge } from '../../components/ui/Badge';
import { colors } from '../../theme/colors';
import { spacing, borderRadius } from '../../theme/spacing';
import type { RootStackParamList } from '../../navigation/types';

type SearchNavProp = NativeStackNavigationProp<RootStackParamList>;

interface SearchResult {
  id: string;
  type: 'issue' | 'leader' | 'poll' | 'voice';
  title: string;
  description: string;
}

const TYPE_ICONS: Record<string, string> = {
  issue: '\u{1F6A7}',
  leader: '\u{1F464}',
  poll: '\u{1F5F3}',
  voice: '\u{1F399}',
};

export const SearchScreen: React.FC = () => {
  const { t } = useTranslation();
  const navigation = useNavigation<SearchNavProp>();
  const [query, setQuery] = useState('');
  const { data: results, isLoading } = useSearch(query);

  const handleResultPress = (result: SearchResult) => {
    switch (result.type) {
      case 'issue':
        navigation.navigate('IssueDetail', { issueId: result.id });
        break;
      case 'leader':
        navigation.navigate('LeaderProfile', { leaderId: result.id });
        break;
      case 'poll':
        navigation.navigate('PollDetail', { pollId: result.id });
        break;
    }
  };

  const renderResult = ({ item }: { item: SearchResult }) => (
    <TouchableOpacity
      style={styles.resultRow}
      onPress={() => handleResultPress(item)}
      activeOpacity={0.7}
    >
      <View style={styles.resultIcon}>
        <Text style={styles.resultEmoji}>{TYPE_ICONS[item.type] || '\u{1F50D}'}</Text>
      </View>
      <View style={styles.resultContent}>
        <Text style={styles.resultTitle} numberOfLines={1}>
          {item.title}
        </Text>
        <Text style={styles.resultSubtitle}>{item.description}</Text>
      </View>
    </TouchableOpacity>
  );

  const resultsList = results ?? [];

  return (
    <View style={styles.container}>
      <StatusBar barStyle="dark-content" backgroundColor={colors.background} />

      <View style={styles.searchBar}>
        <Text style={styles.searchIcon}>{'\u{1F50D}'}</Text>
        <TextInput
          style={styles.searchInput}
          placeholder={t('search.searchPlaceholder', 'Search issues, leaders, polls...')}
          placeholderTextColor={colors.textMuted}
          value={query}
          onChangeText={setQuery}
          autoFocus
          returnKeyType="search"
        />
        {query.length > 0 && (
          <TouchableOpacity onPress={() => setQuery('')}>
            <Text style={styles.clearIcon}>{'\u2715'}</Text>
          </TouchableOpacity>
        )}
      </View>

      {query.length === 0 ? (
        <View style={styles.recentSection}>
          <Text style={[styles.recentTitle, styles.categoriesTitle]}>
            {t('search.browseCategories', 'Browse Categories')}
          </Text>
          <View style={styles.categoryChips}>
            {[
              { key: 'issues', label: t('search.issues', 'Issues') },
              { key: 'leaders', label: t('search.leaders', 'Leaders') },
              { key: 'polls', label: t('search.polls', 'Polls') },
              { key: 'voices', label: t('search.voices', 'Voices') },
            ].map(cat => (
              <TouchableOpacity
                key={cat.key}
                style={styles.categoryChip}
                onPress={() => setQuery(cat.key)}
              >
                <Text style={styles.categoryChipText}>{cat.label}</Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>
      ) : isLoading ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={colors.primary} />
        </View>
      ) : (
        <FlatList
          data={resultsList}
          renderItem={renderResult}
          keyExtractor={item => item.id}
          contentContainerStyle={styles.resultsList}
          showsVerticalScrollIndicator={false}
          ListEmptyComponent={
            <View style={styles.emptyContainer}>
              <Text style={styles.emptyIcon}>{'\u{1F50E}'}</Text>
              <Text style={styles.emptyText}>
                {t('search.noResultsFound', 'No results found')}
              </Text>
              <Text style={styles.emptyHint}>
                {t('search.tryDifferentKeywords', 'Try different keywords or browse categories')}
              </Text>
            </View>
          }
          ListHeaderComponent={
            resultsList.length > 0 ? (
              <Text style={styles.resultCount}>
                {resultsList.length} result{resultsList.length !== 1 ? 's' : ''}
              </Text>
            ) : null
          }
        />
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
  },
  searchBar: {
    flexDirection: 'row',
    alignItems: 'center',
    marginHorizontal: spacing.lg,
    marginVertical: spacing.md,
    paddingHorizontal: spacing.md,
    height: 48,
    backgroundColor: colors.white,
    borderRadius: borderRadius.button,
    borderWidth: 1.5,
    borderColor: colors.primary,
    gap: spacing.sm,
  },
  searchIcon: {
    fontSize: 16,
  },
  searchInput: {
    flex: 1,
    fontSize: 16,
    color: colors.textPrimary,
    padding: 0,
  },
  clearIcon: {
    fontSize: 16,
    color: colors.textMuted,
    padding: spacing.xs,
  },
  recentSection: {
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.md,
  },
  recentTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.textPrimary,
    marginBottom: spacing.md,
  },
  categoriesTitle: {
    marginTop: spacing.xl,
  },
  categoryChips: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
  },
  categoryChip: {
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.sm,
    backgroundColor: colors.primary + '10',
    borderRadius: borderRadius.full,
  },
  categoryChipText: {
    fontSize: 14,
    fontWeight: '500',
    color: colors.primary,
  },
  resultsList: {
    paddingHorizontal: spacing.lg,
  },
  resultCount: {
    fontSize: 13,
    color: colors.textMuted,
    marginBottom: spacing.md,
  },
  resultRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: colors.borderLight,
  },
  resultIcon: {
    width: 40,
    height: 40,
    borderRadius: 10,
    backgroundColor: colors.backgroundGray,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: spacing.md,
  },
  resultEmoji: {
    fontSize: 18,
  },
  resultContent: {
    flex: 1,
  },
  resultTitle: {
    fontSize: 15,
    fontWeight: '500',
    color: colors.textPrimary,
  },
  resultSubtitle: {
    fontSize: 13,
    color: colors.textMuted,
    marginTop: 1,
  },
  emptyContainer: {
    alignItems: 'center',
    paddingTop: 60,
  },
  emptyIcon: {
    fontSize: 40,
    marginBottom: spacing.md,
  },
  emptyText: {
    fontSize: 16,
    fontWeight: '500',
    color: colors.textPrimary,
  },
  emptyHint: {
    fontSize: 14,
    color: colors.textMuted,
    marginTop: spacing.xs,
  },
});
