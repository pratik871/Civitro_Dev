import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  ActivityIndicator,
} from 'react-native';
import { useNavigation, useRoute } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { useTranslation } from 'react-i18next';
import { IssueCard } from '../../components/issues/IssueCard';
import { colors } from '../../theme/colors';
import { spacing } from '../../theme/spacing';
import { useIssues } from '../../hooks/useIssues';
import { useAuthStore } from '../../stores/authStore';
import type { RootStackParamList } from '../../navigation/types';

type NavProp = NativeStackNavigationProp<RootStackParamList>;

export const IssuesListScreen: React.FC = () => {
  const { t } = useTranslation();
  const navigation = useNavigation<NavProp>();
  const route = useRoute();
  const categoryFilter = (route.params as any)?.category as string | undefined;
  const myIssues = (route.params as any)?.myIssues as boolean | undefined;
  const statusFilter = (route.params as any)?.status as string | undefined;
  const userId = useAuthStore(state => state.user?.id);
  const { data: issues, isLoading, refetch } = useIssues();

  const filteredIssues = (issues ?? []).filter(i => {
    if (categoryFilter && i.category !== categoryFilter) return false;
    if (statusFilter && i.status !== statusFilter) return false;
    if (myIssues && i.reportedBy !== userId) return false;
    return true;
  });

  if (isLoading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator color={colors.primary} size="large" />
      </View>
    );
  }

  return (
    <FlatList
      data={filteredIssues}
      keyExtractor={(item) => item.id}
      renderItem={({ item }) => (
        <IssueCard
          issue={item}
          onPress={() => navigation.navigate('IssueDetail', { issueId: item.id })}
        />
      )}
      contentContainerStyle={styles.list}
      refreshing={false}
      onRefresh={refetch}
      ListEmptyComponent={
        <View style={styles.center}>
          <Text style={styles.emptyText}>{t('issues.noIssuesReported', 'No issues reported yet')}</Text>
        </View>
      }
    />
  );
};

const styles = StyleSheet.create({
  list: {
    padding: spacing.lg,
    paddingBottom: 40,
  },
  center: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingTop: 60,
  },
  emptyText: {
    fontSize: 15,
    color: colors.textMuted,
  },
});
