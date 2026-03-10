import React, { useState, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  RefreshControl,
  StatusBar,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { LeaderCard } from '../../components/leaders/LeaderCard';
import { colors } from '../../theme/colors';
import { spacing } from '../../theme/spacing';
import type { Leader } from '../../types/leader';
import type { RootStackParamList } from '../../navigation/types';

type LeadersNavProp = NativeStackNavigationProp<RootStackParamList>;

const MOCK_LEADERS: Leader[] = [
  {
    id: 'leader-001',
    name: 'Raghavendra Rao',
    party: 'Bharatiya Janata Party',
    partyAbbr: 'BJP',
    governanceLevel: 'ward_councillor',
    constituency: 'Bangalore South',
    ward: 'Ward 15 - Koramangala',
    overallRating: 3.8,
    ratingBreakdown: {
      responsiveness: 4.1,
      transparency: 3.5,
      deliveryOnPromises: 3.2,
      accessibility: 4.5,
      overallImpact: 3.7,
    },
    totalRatings: 342,
    responseRate: 0.78,
    chiScore: 68,
    promisesFulfilled: 8,
    promisesTotal: 15,
    issuesResolved: 89,
    issuesTotal: 142,
    recentActivity: [],
  },
  {
    id: 'leader-002',
    name: 'Kavitha Sharma',
    party: 'Indian National Congress',
    partyAbbr: 'INC',
    governanceLevel: 'mla',
    constituency: 'Bangalore South',
    overallRating: 4.1,
    ratingBreakdown: {
      responsiveness: 4.3,
      transparency: 4.0,
      deliveryOnPromises: 3.8,
      accessibility: 4.2,
      overallImpact: 4.2,
    },
    totalRatings: 1256,
    responseRate: 0.82,
    chiScore: 74,
    promisesFulfilled: 12,
    promisesTotal: 18,
    issuesResolved: 234,
    issuesTotal: 340,
    recentActivity: [],
  },
  {
    id: 'leader-003',
    name: 'Sunil Gowda',
    party: 'Bharatiya Janata Party',
    partyAbbr: 'BJP',
    governanceLevel: 'mayor',
    constituency: 'Bangalore',
    overallRating: 3.5,
    ratingBreakdown: {
      responsiveness: 3.2,
      transparency: 3.8,
      deliveryOnPromises: 3.1,
      accessibility: 3.5,
      overallImpact: 3.9,
    },
    totalRatings: 4521,
    responseRate: 0.65,
    chiScore: 62,
    promisesFulfilled: 15,
    promisesTotal: 30,
    issuesResolved: 567,
    issuesTotal: 980,
    recentActivity: [],
  },
  {
    id: 'leader-004',
    name: 'Arun Kumar Singh',
    party: 'Indian National Congress',
    partyAbbr: 'INC',
    governanceLevel: 'mp',
    constituency: 'Bangalore South',
    overallRating: 3.9,
    ratingBreakdown: {
      responsiveness: 3.7,
      transparency: 4.2,
      deliveryOnPromises: 3.6,
      accessibility: 3.8,
      overallImpact: 4.2,
    },
    totalRatings: 8932,
    responseRate: 0.71,
    chiScore: 71,
    promisesFulfilled: 22,
    promisesTotal: 35,
    issuesResolved: 890,
    issuesTotal: 1450,
    recentActivity: [],
  },
  {
    id: 'leader-005',
    name: 'Meera Natarajan',
    party: 'Indian National Congress',
    partyAbbr: 'INC',
    governanceLevel: 'cm',
    constituency: 'Karnataka',
    overallRating: 4.0,
    ratingBreakdown: {
      responsiveness: 3.9,
      transparency: 4.1,
      deliveryOnPromises: 3.7,
      accessibility: 3.5,
      overallImpact: 4.8,
    },
    totalRatings: 45230,
    responseRate: 0.55,
    chiScore: 69,
    promisesFulfilled: 35,
    promisesTotal: 60,
    issuesResolved: 4500,
    issuesTotal: 8200,
    recentActivity: [],
  },
];

const GOVERNANCE_SECTIONS = [
  { level: 'ward_councillor', title: 'Ward Councillor', icon: '\u{1F3D8}' },
  { level: 'mla', title: 'MLA / Mayor', icon: '\u{1F3DB}' },
  { level: 'mayor', title: 'Mayor', icon: '\u{1F3DB}' },
  { level: 'mp', title: 'Member of Parliament', icon: '\u{1F1EE}\u{1F1F3}' },
  { level: 'cm', title: 'Chief Minister / PM', icon: '\u2B50' },
] as const;

export const LeadersScreen: React.FC = () => {
  const navigation = useNavigation<LeadersNavProp>();
  const [refreshing, setRefreshing] = useState(false);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await new Promise(resolve => setTimeout(resolve, 800));
    setRefreshing(false);
  }, []);

  const groupedLeaders = GOVERNANCE_SECTIONS.map(section => ({
    ...section,
    leaders: MOCK_LEADERS.filter(l => l.governanceLevel === section.level),
  })).filter(section => section.leaders.length > 0);

  return (
    <View style={styles.container}>
      <StatusBar barStyle="dark-content" backgroundColor={colors.background} />

      <View style={styles.header}>
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
            refreshing={refreshing}
            onRefresh={onRefresh}
            tintColor={colors.primary}
            colors={[colors.primary]}
          />
        }
        showsVerticalScrollIndicator={false}
      >
        {groupedLeaders.map(section => (
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
        ))}

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
    paddingTop: spacing['4xl'],
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
});
