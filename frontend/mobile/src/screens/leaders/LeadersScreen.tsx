import React, { useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  RefreshControl,
  StatusBar,
  ActivityIndicator,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { LeaderCard } from '../../components/leaders/LeaderCard';
import { useLeaders } from '../../hooks/useLeaders';
import { colors } from '../../theme/colors';
import { spacing } from '../../theme/spacing';
import type { RootStackParamList } from '../../navigation/types';

type LeadersNavProp = NativeStackNavigationProp<RootStackParamList>;

const GOVERNANCE_SECTIONS = [
  { level: 'ward_councillor', title: 'Ward Councillor', icon: '\u{1F3D8}' },
  { level: 'mla', title: 'MLA / Mayor', icon: '\u{1F3DB}' },
  { level: 'mayor', title: 'Mayor', icon: '\u{1F3DB}' },
  { level: 'mp', title: 'Member of Parliament', icon: '\u{1F1EE}\u{1F1F3}' },
  { level: 'cm', title: 'Chief Minister / PM', icon: '\u2B50' },
] as const;

export const LeadersScreen: React.FC = () => {
  const navigation = useNavigation<LeadersNavProp>();
  const { data: leaders, isLoading, refetch } = useLeaders();

  const onRefresh = useCallback(async () => {
    await refetch();
  }, [refetch]);

  const insets = useSafeAreaInsets();
  const groupedLeaders = GOVERNANCE_SECTIONS.map(section => ({
    ...section,
    leaders: (leaders ?? []).filter(l => l.governanceLevel === section.level),
  })).filter(section => section.leaders.length > 0);

  if (isLoading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={colors.primary} />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <StatusBar barStyle="dark-content" backgroundColor={colors.background} />

      <View style={[styles.header, { paddingTop: insets.top + spacing.sm }]}>
        <Text style={styles.headerTitle}>Your Governance Chain</Text>
        <Text style={styles.headerSubtitle}>
          From your ward to the nation - rate and track your representatives
        </Text>
      </View>

      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        refreshControl={
          <RefreshControl
            refreshing={false}
            onRefresh={onRefresh}
            tintColor={colors.primary}
            colors={[colors.primary]}
          />
        }
        showsVerticalScrollIndicator={false}
      >
        {groupedLeaders.length === 0 ? (
          <View style={styles.emptyContainer}>
            <Text style={styles.emptyText}>No representatives found</Text>
          </View>
        ) : (
          groupedLeaders.map(section => (
            <View key={section.level} style={styles.section}>
              <View style={styles.sectionHeader}>
                <Text style={styles.sectionIcon}>{section.icon}</Text>
                <Text style={styles.sectionTitle}>{section.title}</Text>
              </View>
              {section.leaders.map(leader => (
                <LeaderCard
                  key={leader.id}
                  leader={leader}
                  onPress={() =>
                    navigation.navigate('LeaderProfile', { leaderId: leader.id })
                  }
                />
              ))}
            </View>
          ))
        )}

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
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.lg,
    paddingBottom: spacing.md,
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: '700',
    color: colors.textPrimary,
    marginBottom: spacing.xs,
  },
  headerSubtitle: {
    fontSize: 14,
    color: colors.textMuted,
    lineHeight: 20,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: spacing.lg,
  },
  section: {
    marginBottom: spacing.xl,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: spacing.md,
    gap: spacing.sm,
  },
  sectionIcon: {
    fontSize: 18,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.navyLight,
  },
  bottomSpacer: {
    height: 40,
  },
  loadingContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.background,
  },
  emptyContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: spacing.xl,
  },
  emptyText: {
    fontSize: 16,
    color: colors.textMuted,
  },
});
