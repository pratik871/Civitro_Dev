import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  RefreshControl,
  StatusBar,
  ActivityIndicator,
  TouchableOpacity,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { Card } from '../../components/ui/Card';
import { Badge } from '../../components/ui/Badge';
import { colors } from '../../theme/colors';
import { spacing, borderRadius } from '../../theme/spacing';
import { useMyOrganizations } from '../../hooks/useOrganizations';
import type { Organization, OrgType } from '../../hooks/useOrganizations';
import type { RootStackParamList } from '../../navigation/types';

type NavProp = NativeStackNavigationProp<RootStackParamList>;

const ORG_TYPE_LABELS: Record<OrgType, string> = {
  political_party: 'Political Party',
  ngo: 'NGO',
  rwa: 'RWA',
  club: 'Club',
};

const ORG_TYPE_COLORS: Record<OrgType, string> = {
  political_party: '#7C3AED',
  ngo: '#059669',
  rwa: '#2563EB',
  club: '#D97706',
};

const ORG_TYPE_ICONS: Record<OrgType, string> = {
  political_party: '\u{1F3DB}',
  ngo: '\u{1F91D}',
  rwa: '\u{1F3E0}',
  club: '\u{1F465}',
};

export const OrganizationsScreen: React.FC = () => {
  const navigation = useNavigation<NavProp>();
  const { data: organizations, isLoading, refetch } = useMyOrganizations();

  const renderOrgCard = ({ item }: { item: Organization }) => {
    const typeColor = ORG_TYPE_COLORS[item.type] || colors.textMuted;

    return (
      <TouchableOpacity
        activeOpacity={0.7}
        onPress={() => navigation.navigate('OrgDetail', { orgId: item.id })}
      >
        <Card style={styles.orgCard}>
          <View style={styles.cardHeader}>
            <View style={[styles.orgIcon, { backgroundColor: typeColor + '15' }]}>
              <Text style={styles.orgIconText}>
                {ORG_TYPE_ICONS[item.type] || '\u{1F3E2}'}
              </Text>
            </View>
            <View style={styles.cardHeaderText}>
              <Text style={styles.orgName} numberOfLines={1}>
                {item.name}
              </Text>
              <Badge
                text={ORG_TYPE_LABELS[item.type] || item.type}
                backgroundColor={typeColor + '15'}
                color={typeColor}
                size="sm"
              />
            </View>
          </View>

          {item.description ? (
            <Text style={styles.orgDescription} numberOfLines={2}>
              {item.description}
            </Text>
          ) : null}

          <View style={styles.cardFooter}>
            <View style={styles.metaChip}>
              <Text style={styles.metaIcon}>{'\u{1F4CA}'}</Text>
              <Text style={styles.metaText}>
                {item.subscriptionTier === 'free' ? 'Free' : item.subscriptionTier}
              </Text>
            </View>
            <View style={styles.metaChip}>
              <Text style={styles.metaIcon}>{'\u{1F4C5}'}</Text>
              <Text style={styles.metaText}>
                {new Date(item.createdAt).toLocaleDateString('en-IN', {
                  month: 'short',
                  year: 'numeric',
                })}
              </Text>
            </View>
          </View>
        </Card>
      </TouchableOpacity>
    );
  };

  if (isLoading) {
    return (
      <View style={[styles.container, styles.centered]}>
        <StatusBar barStyle="dark-content" backgroundColor={colors.background} />
        <ActivityIndicator size="large" color={colors.saffron} />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <StatusBar barStyle="dark-content" backgroundColor={colors.background} />
      <FlatList
        data={organizations}
        renderItem={renderOrgCard}
        keyExtractor={item => item.id}
        contentContainerStyle={styles.listContent}
        refreshControl={
          <RefreshControl
            refreshing={false}
            onRefresh={refetch}
            tintColor={colors.saffron}
            colors={[colors.saffron]}
          />
        }
        showsVerticalScrollIndicator={false}
        ListEmptyComponent={
          <View style={styles.emptyContainer}>
            <Text style={styles.emptyIcon}>{'\u{1F3E2}'}</Text>
            <Text style={styles.emptyTitle}>No organizations yet</Text>
            <Text style={styles.emptyText}>
              Create or join a political party, NGO, RWA, or club to coordinate
              with your community.
            </Text>
            <TouchableOpacity
              style={styles.createButton}
              onPress={() => navigation.navigate('CreateOrg')}
            >
              <Text style={styles.createButtonText}>Create Organization</Text>
            </TouchableOpacity>
          </View>
        }
      />

      {/* FAB */}
      {(organizations ?? []).length > 0 && (
        <TouchableOpacity
          style={styles.fab}
          onPress={() => navigation.navigate('CreateOrg')}
          activeOpacity={0.8}
        >
          <Text style={styles.fabText}>+</Text>
        </TouchableOpacity>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  listContent: {
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.md,
    paddingBottom: spacing['3xl'],
  },
  centered: {
    justifyContent: 'center',
    alignItems: 'center',
  },

  // Org Card
  orgCard: {
    marginBottom: spacing.md,
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: spacing.sm,
  },
  orgIcon: {
    width: 48,
    height: 48,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: spacing.md,
  },
  orgIconText: {
    fontSize: 24,
  },
  cardHeaderText: {
    flex: 1,
    gap: spacing.xs,
  },
  orgName: {
    fontSize: 17,
    fontWeight: '700',
    color: colors.textPrimary,
  },
  orgDescription: {
    fontSize: 14,
    color: colors.textMuted,
    lineHeight: 20,
    marginBottom: spacing.md,
  },
  cardFooter: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
  },
  metaChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    backgroundColor: colors.backgroundGray,
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
    borderRadius: borderRadius.full,
  },
  metaIcon: {
    fontSize: 12,
  },
  metaText: {
    fontSize: 12,
    color: colors.textMuted,
    fontWeight: '500',
    textTransform: 'capitalize',
  },

  // Empty state
  emptyContainer: {
    alignItems: 'center',
    paddingTop: 80,
  },
  emptyIcon: {
    fontSize: 56,
    marginBottom: spacing.lg,
  },
  emptyTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: colors.textPrimary,
    marginBottom: spacing.sm,
  },
  emptyText: {
    fontSize: 15,
    color: colors.textMuted,
    textAlign: 'center',
    lineHeight: 22,
    paddingHorizontal: spacing['3xl'],
    marginBottom: spacing.xl,
  },
  createButton: {
    backgroundColor: colors.saffron,
    paddingHorizontal: spacing['2xl'],
    paddingVertical: spacing.md,
    borderRadius: borderRadius.button,
    shadowColor: colors.saffron,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 4,
  },
  createButtonText: {
    color: colors.white,
    fontSize: 15,
    fontWeight: '700',
  },

  // FAB
  fab: {
    position: 'absolute',
    bottom: spacing['3xl'],
    right: spacing.lg,
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: colors.saffron,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: colors.saffron,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.4,
    shadowRadius: 12,
    elevation: 6,
  },
  fabText: {
    fontSize: 28,
    fontWeight: '600',
    color: colors.white,
    marginTop: -2,
  },
});
