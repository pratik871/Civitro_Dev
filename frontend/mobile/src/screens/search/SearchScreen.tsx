import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  FlatList,
  TouchableOpacity,
  StatusBar,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { Badge } from '../../components/ui/Badge';
import { colors } from '../../theme/colors';
import { spacing, borderRadius } from '../../theme/spacing';
import type { RootStackParamList } from '../../navigation/types';

type SearchNavProp = NativeStackNavigationProp<RootStackParamList>;

interface SearchResult {
  id: string;
  type: 'issue' | 'leader' | 'poll' | 'voice';
  title: string;
  subtitle: string;
  icon: string;
}

const RECENT_SEARCHES = [
  'pothole koramangala',
  'water supply',
  'ward councillor',
  'garbage collection',
];

const MOCK_RESULTS: SearchResult[] = [
  {
    id: 'issue-001',
    type: 'issue',
    title: 'Large pothole near 4th Block Junction',
    subtitle: 'Issue - Koramangala',
    icon: '\u{1F6A7}',
  },
  {
    id: 'issue-004',
    type: 'issue',
    title: 'Water supply disruption in 3rd Block',
    subtitle: 'Issue - Koramangala',
    icon: '\u{1F4A7}',
  },
  {
    id: 'leader-001',
    type: 'leader',
    title: 'Raghavendra Rao',
    subtitle: 'Ward Councillor - Ward 15',
    icon: '\u{1F464}',
  },
  {
    id: 'poll-001',
    type: 'poll',
    title: 'Road repairs vs park development priority',
    subtitle: 'Active Poll - 448 votes',
    icon: '\u{1F5F3}',
  },
  {
    id: 'leader-002',
    type: 'leader',
    title: 'Kavitha Sharma',
    subtitle: 'MLA - Bangalore South',
    icon: '\u{1F464}',
  },
];

export const SearchScreen: React.FC = () => {
  const navigation = useNavigation<SearchNavProp>();
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<SearchResult[]>([]);

  const handleSearch = (text: string) => {
    setQuery(text);
    if (text.length > 1) {
      const filtered = MOCK_RESULTS.filter(
        r =>
          r.title.toLowerCase().includes(text.toLowerCase()) ||
          r.subtitle.toLowerCase().includes(text.toLowerCase()),
      );
      setResults(filtered);
    } else {
      setResults([]);
    }
  };

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
        <Text style={styles.resultEmoji}>{item.icon}</Text>
      </View>
      <View style={styles.resultContent}>
        <Text style={styles.resultTitle} numberOfLines={1}>
          {item.title}
        </Text>
        <Text style={styles.resultSubtitle}>{item.subtitle}</Text>
      </View>
    </TouchableOpacity>
  );

  return (
    <View style={styles.container}>
      <StatusBar barStyle="dark-content" backgroundColor={colors.background} />

      <View style={styles.searchBar}>
        <Text style={styles.searchIcon}>{'\u{1F50D}'}</Text>
        <TextInput
          style={styles.searchInput}
          placeholder="Search issues, leaders, polls..."
          placeholderTextColor={colors.textMuted}
          value={query}
          onChangeText={handleSearch}
          autoFocus
          returnKeyType="search"
        />
        {query.length > 0 && (
          <TouchableOpacity onPress={() => handleSearch('')}>
            <Text style={styles.clearIcon}>{'\u2715'}</Text>
          </TouchableOpacity>
        )}
      </View>

      {query.length === 0 ? (
        <View style={styles.recentSection}>
          <Text style={styles.recentTitle}>Recent Searches</Text>
          {RECENT_SEARCHES.map((search, index) => (
            <TouchableOpacity
              key={index}
              style={styles.recentRow}
              onPress={() => handleSearch(search)}
            >
              <Text style={styles.recentIcon}>{'\u{1F552}'}</Text>
              <Text style={styles.recentText}>{search}</Text>
            </TouchableOpacity>
          ))}

          <Text style={[styles.recentTitle, styles.categoriesTitle]}>
            Browse Categories
          </Text>
          <View style={styles.categoryChips}>
            {['Issues', 'Leaders', 'Polls', 'Voices'].map(cat => (
              <TouchableOpacity key={cat} style={styles.categoryChip}>
                <Text style={styles.categoryChipText}>{cat}</Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>
      ) : (
        <FlatList
          data={results}
          renderItem={renderResult}
          keyExtractor={item => item.id}
          contentContainerStyle={styles.resultsList}
          showsVerticalScrollIndicator={false}
          ListEmptyComponent={
            <View style={styles.emptyContainer}>
              <Text style={styles.emptyIcon}>{'\u{1F50E}'}</Text>
              <Text style={styles.emptyText}>
                No results for "{query}"
              </Text>
              <Text style={styles.emptyHint}>
                Try different keywords or browse categories
              </Text>
            </View>
          }
          ListHeaderComponent={
            results.length > 0 ? (
              <Text style={styles.resultCount}>
                {results.length} result{results.length !== 1 ? 's' : ''}
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
  recentRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: spacing.md,
    gap: spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: colors.borderLight,
  },
  recentIcon: {
    fontSize: 14,
  },
  recentText: {
    fontSize: 15,
    color: colors.textSecondary,
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
