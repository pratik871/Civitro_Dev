import React, { useCallback, useMemo, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  RefreshControl,
  StatusBar,
  ActivityIndicator,
  TouchableOpacity,
  Alert,
} from 'react-native';
import { useRoute } from '@react-navigation/native';
import {
  useBudgetProposals,
  useBudgetResults,
  useSubmitBudgetVote,
} from '../../hooks/useBudgets';
import type { BudgetProposal, BudgetProposalResult } from '../../hooks/useBudgets';
import { colors } from '../../theme/colors';
import { spacing, borderRadius } from '../../theme/spacing';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/** Format paisa amount as INR with Lakh/Cr suffixes. */
function formatINR(paisa: number): string {
  const rupees = paisa / 100;
  if (rupees >= 1_00_00_000) {
    return `\u20B9${(rupees / 1_00_00_000).toFixed(2)} Cr`;
  }
  if (rupees >= 1_00_000) {
    return `\u20B9${(rupees / 1_00_000).toFixed(2)} Lakh`;
  }
  if (rupees >= 1_000) {
    return `\u20B9${(rupees / 1_000).toFixed(1)}K`;
  }
  return `\u20B9${rupees.toFixed(0)}`;
}

const CATEGORY_COLORS: Record<string, string> = {
  infrastructure: '#DC2626',
  education: '#2563EB',
  healthcare: '#16A34A',
  sanitation: '#EA580C',
  environment: '#0D9488',
  safety: '#1E293B',
  recreation: '#7C3AED',
  other: '#6B7280',
};

const CATEGORY_ICONS: Record<string, string> = {
  infrastructure: '\u{1F3D7}',
  education: '\u{1F4DA}',
  healthcare: '\u{1FA7A}',
  sanitation: '\u{1F6B0}',
  environment: '\u{1F333}',
  safety: '\u{1F6E1}',
  recreation: '\u{26BD}',
  other: '\u{1F4CB}',
};

// ---------------------------------------------------------------------------
// Slider (simple custom implementation since we want minimal deps)
// ---------------------------------------------------------------------------

interface AllocationSliderProps {
  value: number;
  onChange: (val: number) => void;
  disabled?: boolean;
}

const AllocationSlider: React.FC<AllocationSliderProps> = ({ value, onChange, disabled }) => {
  const decrement = () => {
    if (!disabled && value > 0) onChange(Math.max(value - 5, 0));
  };
  const increment = () => {
    if (!disabled && value < 100) onChange(Math.min(value + 5, 100));
  };

  return (
    <View style={sliderStyles.container}>
      <TouchableOpacity
        onPress={decrement}
        style={[sliderStyles.button, disabled && sliderStyles.buttonDisabled]}
        disabled={disabled}
      >
        <Text style={sliderStyles.buttonText}>-</Text>
      </TouchableOpacity>

      <View style={sliderStyles.track}>
        <View
          style={[
            sliderStyles.fill,
            { width: `${value}%` },
          ]}
        />
      </View>

      <Text style={sliderStyles.valueText}>{value}%</Text>

      <TouchableOpacity
        onPress={increment}
        style={[sliderStyles.button, disabled && sliderStyles.buttonDisabled]}
        disabled={disabled}
      >
        <Text style={sliderStyles.buttonText}>+</Text>
      </TouchableOpacity>
    </View>
  );
};

const sliderStyles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    marginTop: spacing.sm,
  },
  button: {
    width: 32,
    height: 32,
    borderRadius: borderRadius.full,
    backgroundColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  buttonDisabled: {
    opacity: 0.4,
  },
  buttonText: {
    color: colors.white,
    fontSize: 18,
    fontWeight: '700',
    lineHeight: 20,
  },
  track: {
    flex: 1,
    height: 8,
    borderRadius: 4,
    backgroundColor: colors.borderLight,
    overflow: 'hidden',
  },
  fill: {
    height: '100%',
    backgroundColor: colors.primary,
    borderRadius: 4,
  },
  valueText: {
    width: 40,
    textAlign: 'center',
    fontSize: 14,
    fontWeight: '700',
    color: colors.textPrimary,
  },
});

// ---------------------------------------------------------------------------
// Proposal Card
// ---------------------------------------------------------------------------

interface ProposalCardProps {
  proposal: BudgetProposal;
  allocation: number;
  onAllocationChange: (val: number) => void;
  showResults: boolean;
  result?: BudgetProposalResult;
}

const ProposalCard: React.FC<ProposalCardProps> = ({
  proposal,
  allocation,
  onAllocationChange,
  showResults,
  result,
}) => {
  const catColor = CATEGORY_COLORS[proposal.category] ?? CATEGORY_COLORS.other;
  const catIcon = CATEGORY_ICONS[proposal.category] ?? CATEGORY_ICONS.other;

  return (
    <View style={cardStyles.card}>
      {/* Header */}
      <View style={cardStyles.header}>
        <Text style={cardStyles.icon}>{catIcon}</Text>
        <View style={cardStyles.headerText}>
          <Text style={cardStyles.title} numberOfLines={2}>
            {proposal.title}
          </Text>
          <View style={cardStyles.metaRow}>
            <View style={[cardStyles.categoryBadge, { backgroundColor: catColor + '18' }]}>
              <Text style={[cardStyles.categoryText, { color: catColor }]}>
                {proposal.category}
              </Text>
            </View>
            <Text style={cardStyles.amount}>
              {formatINR(proposal.requestedAmount)}
            </Text>
          </View>
        </View>
      </View>

      {/* Description */}
      {proposal.description ? (
        <Text style={cardStyles.description} numberOfLines={3}>
          {proposal.description}
        </Text>
      ) : null}

      {/* Allocation slider (vote mode) */}
      {!showResults && (
        <AllocationSlider value={allocation} onChange={onAllocationChange} />
      )}

      {/* Results bar (results mode) */}
      {showResults && result && (
        <View style={cardStyles.resultContainer}>
          <View style={cardStyles.resultBar}>
            <View
              style={[
                cardStyles.resultFill,
                {
                  width: `${Math.min(result.avg_allocation, 100)}%`,
                  backgroundColor: catColor,
                },
              ]}
            />
          </View>
          <Text style={cardStyles.resultText}>
            {result.avg_allocation.toFixed(1)}% avg ({result.total_voters} voters)
          </Text>
        </View>
      )}
    </View>
  );
};

const cardStyles = StyleSheet.create({
  card: {
    backgroundColor: colors.white,
    borderRadius: borderRadius.card,
    padding: spacing.lg,
    marginBottom: spacing.md,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.06,
    shadowRadius: 4,
    elevation: 2,
  },
  header: {
    flexDirection: 'row',
    gap: spacing.md,
  },
  icon: {
    fontSize: 28,
    marginTop: 2,
  },
  headerText: {
    flex: 1,
  },
  title: {
    fontSize: 15,
    fontWeight: '600',
    color: colors.textPrimary,
    lineHeight: 20,
  },
  metaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    marginTop: spacing.xs,
  },
  categoryBadge: {
    paddingHorizontal: spacing.sm,
    paddingVertical: 2,
    borderRadius: borderRadius.sm,
  },
  categoryText: {
    fontSize: 11,
    fontWeight: '600',
    textTransform: 'capitalize',
  },
  amount: {
    fontSize: 13,
    fontWeight: '700',
    color: colors.textSecondary,
  },
  description: {
    fontSize: 13,
    color: colors.textMuted,
    lineHeight: 18,
    marginTop: spacing.sm,
  },
  resultContainer: {
    marginTop: spacing.md,
  },
  resultBar: {
    height: 10,
    borderRadius: 5,
    backgroundColor: colors.borderLight,
    overflow: 'hidden',
  },
  resultFill: {
    height: '100%',
    borderRadius: 5,
  },
  resultText: {
    fontSize: 12,
    color: colors.textMuted,
    marginTop: spacing.xs,
  },
});

// ---------------------------------------------------------------------------
// Main Screen
// ---------------------------------------------------------------------------

type RouteParams = { boundaryId: string };

export const BudgetScreen: React.FC = () => {
  const route = useRoute();
  const { boundaryId } = (route.params as RouteParams) ?? {};

  const { data: proposals, isLoading, refetch } = useBudgetProposals(boundaryId);
  const { data: results } = useBudgetResults(boundaryId);
  const voteMutation = useSubmitBudgetVote();

  const [showResults, setShowResults] = useState(false);

  // Track allocation per proposal
  const [allocations, setAllocations] = useState<Record<string, number>>({});

  // Initialize allocations from existing user votes
  const initialized = React.useRef(false);
  React.useEffect(() => {
    if (proposals && proposals.length > 0 && !initialized.current) {
      const hasExistingVotes = proposals.some((p) => p.userAllocation > 0);
      if (hasExistingVotes) {
        const existing: Record<string, number> = {};
        proposals.forEach((p) => {
          existing[p.id] = p.userAllocation;
        });
        setAllocations(existing);
        setShowResults(true);
      }
      initialized.current = true;
    }
  }, [proposals]);

  const totalAllocation = useMemo(() => {
    return Object.values(allocations).reduce((sum, v) => sum + v, 0);
  }, [allocations]);

  const handleAllocationChange = useCallback((proposalId: string, value: number) => {
    setAllocations((prev) => ({ ...prev, [proposalId]: value }));
  }, []);

  const handleSubmit = useCallback(() => {
    if (totalAllocation !== 100) {
      Alert.alert(
        'Invalid Total',
        `Your allocations must add up to 100%. Currently: ${totalAllocation}%`,
      );
      return;
    }

    const allocs = Object.entries(allocations)
      .filter(([, pct]) => pct > 0)
      .map(([proposalId, pct]) => ({
        proposal_id: proposalId,
        allocation_pct: pct,
      }));

    voteMutation.mutate(
      { boundaryId, allocations: allocs },
      {
        onSuccess: () => {
          Alert.alert('Vote Submitted', 'Your budget allocation has been recorded.');
          setShowResults(true);
        },
        onError: (err: any) => {
          Alert.alert('Error', err?.message ?? 'Failed to submit vote.');
        },
      },
    );
  }, [allocations, boundaryId, totalAllocation, voteMutation]);

  // Results lookup map
  const resultsMap = useMemo(() => {
    const map: Record<string, BudgetProposalResult> = {};
    results?.proposals?.forEach((r) => {
      map[r.proposal_id] = r;
    });
    return map;
  }, [results]);

  // ---------------------------------------------------------------------------
  // Render
  // ---------------------------------------------------------------------------

  if (isLoading) {
    return (
      <View style={[styles.container, styles.centered]}>
        <ActivityIndicator size="large" color={colors.primary} />
      </View>
    );
  }

  const allProposals = proposals ?? [];

  const renderHeader = () => (
    <View>
      {/* Total bar */}
      <View style={styles.totalCard}>
        <View style={styles.totalRow}>
          <Text style={styles.totalLabel}>Your Allocation</Text>
          <Text
            style={[
              styles.totalValue,
              totalAllocation === 100 && styles.totalValid,
              totalAllocation > 100 && styles.totalOver,
            ]}
          >
            {totalAllocation}%
          </Text>
        </View>
        <View style={styles.totalBar}>
          <View
            style={[
              styles.totalFill,
              {
                width: `${Math.min(totalAllocation, 100)}%`,
                backgroundColor:
                  totalAllocation === 100
                    ? colors.success
                    : totalAllocation > 100
                      ? colors.error
                      : colors.primary,
              },
            ]}
          />
        </View>
        <Text style={styles.totalHint}>
          {totalAllocation === 100
            ? 'You have allocated 100% -- ready to submit!'
            : `Allocate ${100 - totalAllocation}% more to reach 100%.`}
        </Text>
      </View>

      {/* Toggle */}
      <View style={styles.toggleRow}>
        <TouchableOpacity
          style={[styles.toggleButton, !showResults && styles.toggleButtonActive]}
          onPress={() => setShowResults(false)}
        >
          <Text style={[styles.toggleText, !showResults && styles.toggleTextActive]}>
            Vote
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.toggleButton, showResults && styles.toggleButtonActive]}
          onPress={() => setShowResults(true)}
        >
          <Text style={[styles.toggleText, showResults && styles.toggleTextActive]}>
            Results
          </Text>
        </TouchableOpacity>
      </View>

      {/* Stats */}
      {showResults && results && (
        <View style={styles.statsRow}>
          <View style={styles.statCard}>
            <Text style={styles.statValue}>{results.total_voters}</Text>
            <Text style={styles.statLabel}>Voters</Text>
          </View>
          <View style={styles.statCard}>
            <Text style={[styles.statValue, { color: colors.primary }]}>
              {allProposals.length}
            </Text>
            <Text style={styles.statLabel}>Proposals</Text>
          </View>
          <View style={styles.statCard}>
            <Text style={[styles.statValue, { color: colors.success }]}>
              {results.fiscal_year}
            </Text>
            <Text style={styles.statLabel}>Fiscal Year</Text>
          </View>
        </View>
      )}

      <Text style={styles.sectionTitle}>
        {showResults ? 'Community Results' : 'Budget Proposals'}
      </Text>
    </View>
  );

  const renderProposal = ({ item }: { item: BudgetProposal }) => (
    <ProposalCard
      proposal={item}
      allocation={allocations[item.id] ?? 0}
      onAllocationChange={(val) => handleAllocationChange(item.id, val)}
      showResults={showResults}
      result={resultsMap[item.id]}
    />
  );

  const renderFooter = () => {
    if (showResults) return null;
    return (
      <TouchableOpacity
        style={[
          styles.submitButton,
          totalAllocation !== 100 && styles.submitButtonDisabled,
        ]}
        onPress={handleSubmit}
        disabled={totalAllocation !== 100 || voteMutation.isPending}
      >
        {voteMutation.isPending ? (
          <ActivityIndicator size="small" color={colors.white} />
        ) : (
          <Text style={styles.submitText}>Submit Vote</Text>
        )}
      </TouchableOpacity>
    );
  };

  return (
    <View style={styles.container}>
      <StatusBar barStyle="dark-content" backgroundColor={colors.background} />
      <FlatList
        data={allProposals}
        renderItem={renderProposal}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.listContent}
        refreshControl={
          <RefreshControl
            refreshing={false}
            onRefresh={refetch}
            tintColor={colors.primary}
            colors={[colors.primary]}
          />
        }
        showsVerticalScrollIndicator={false}
        ListHeaderComponent={renderHeader}
        ListFooterComponent={renderFooter}
        ListEmptyComponent={
          <View style={styles.emptyContainer}>
            <Text style={styles.emptyIcon}>{'\u{1F4B0}'}</Text>
            <Text style={styles.emptyTitle}>No budget proposals</Text>
            <Text style={styles.emptyText}>
              Participatory budgeting proposals will appear here when your ward
              has an active budget cycle.
            </Text>
          </View>
        }
      />
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
  listContent: {
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.md,
    paddingBottom: spacing['3xl'],
  },
  centered: {
    justifyContent: 'center',
    alignItems: 'center',
  },

  // Total allocation bar
  totalCard: {
    backgroundColor: colors.white,
    borderRadius: borderRadius.card,
    padding: spacing.lg,
    marginBottom: spacing.lg,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.06,
    shadowRadius: 4,
    elevation: 2,
  },
  totalRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.sm,
  },
  totalLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.textSecondary,
  },
  totalValue: {
    fontSize: 22,
    fontWeight: '700',
    color: colors.primary,
  },
  totalValid: {
    color: colors.success,
  },
  totalOver: {
    color: colors.error,
  },
  totalBar: {
    height: 8,
    borderRadius: 4,
    backgroundColor: colors.borderLight,
    overflow: 'hidden',
  },
  totalFill: {
    height: '100%',
    borderRadius: 4,
  },
  totalHint: {
    fontSize: 12,
    color: colors.textMuted,
    marginTop: spacing.xs,
  },

  // Toggle
  toggleRow: {
    flexDirection: 'row',
    backgroundColor: colors.borderLight,
    borderRadius: borderRadius.button,
    marginBottom: spacing.lg,
    padding: 3,
  },
  toggleButton: {
    flex: 1,
    paddingVertical: spacing.sm,
    borderRadius: borderRadius.button - 2,
    alignItems: 'center',
  },
  toggleButtonActive: {
    backgroundColor: colors.white,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.08,
    shadowRadius: 2,
    elevation: 1,
  },
  toggleText: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.textMuted,
  },
  toggleTextActive: {
    color: colors.textPrimary,
  },

  // Stats
  statsRow: {
    flexDirection: 'row',
    gap: spacing.sm,
    marginBottom: spacing.lg,
  },
  statCard: {
    flex: 1,
    backgroundColor: colors.white,
    borderRadius: borderRadius.lg,
    paddingVertical: spacing.md,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  statValue: {
    fontSize: 20,
    fontWeight: '700',
    color: colors.textPrimary,
  },
  statLabel: {
    fontSize: 11,
    fontWeight: '500',
    color: colors.textMuted,
    marginTop: 2,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },

  sectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.textPrimary,
    marginBottom: spacing.md,
  },

  // Submit
  submitButton: {
    backgroundColor: colors.primary,
    borderRadius: borderRadius.button,
    paddingVertical: spacing.md,
    alignItems: 'center',
    marginTop: spacing.md,
    marginBottom: spacing.xl,
  },
  submitButtonDisabled: {
    opacity: 0.5,
  },
  submitText: {
    fontSize: 16,
    fontWeight: '700',
    color: colors.white,
  },

  // Empty
  emptyContainer: {
    alignItems: 'center',
    paddingTop: 60,
  },
  emptyIcon: {
    fontSize: 48,
    marginBottom: spacing.md,
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: colors.textPrimary,
    marginBottom: spacing.xs,
  },
  emptyText: {
    fontSize: 14,
    color: colors.textMuted,
    textAlign: 'center',
    lineHeight: 20,
    paddingHorizontal: spacing['3xl'],
  },
});
