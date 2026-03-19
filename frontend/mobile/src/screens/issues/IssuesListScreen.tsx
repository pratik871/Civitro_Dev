import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  ActivityIndicator,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { IssueCard } from '../../components/issues/IssueCard';
import { colors } from '../../theme/colors';
import { spacing } from '../../theme/spacing';
import { useIssues } from '../../hooks/useIssues';
import type { RootStackParamList } from '../../navigation/types';

type NavProp = NativeStackNavigationProp<RootStackParamList>;

export const IssuesListScreen: React.FC = () => {
  const navigation = useNavigation<NavProp>();
  const { data: issues, isLoading, refetch } = useIssues();

  if (isLoading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator color={colors.primary} size="large" />
      </View>
    );
  }

  return (
    <FlatList
      data={issues ?? []}
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
          <Text style={styles.emptyText}>No issues reported yet</Text>
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
