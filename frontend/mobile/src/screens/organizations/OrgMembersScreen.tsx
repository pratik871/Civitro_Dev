import React, { useState, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  RefreshControl,
  StatusBar,
  ActivityIndicator,
  TouchableOpacity,
  TextInput,
  Alert,
  Modal,
  Pressable,
} from 'react-native';
import { useRoute } from '@react-navigation/native';
import type { RouteProp } from '@react-navigation/native';
import { useTranslation } from 'react-i18next';
import { Avatar } from '../../components/ui/Avatar';
import { Badge } from '../../components/ui/Badge';
import { Button } from '../../components/ui/Button';
import { colors } from '../../theme/colors';
import { spacing, borderRadius } from '../../theme/spacing';
import { formatRelativeTime } from '../../lib/utils';
import {
  useOrgMembers,
  useAddMember,
  useRemoveMember,
} from '../../hooks/useOrganizations';
import type { OrgMember, MemberRole } from '../../hooks/useOrganizations';
import type { RootStackParamList } from '../../navigation/types';

type RouteType = RouteProp<RootStackParamList, 'OrgMembers'>;

const ROLE_COLORS: Record<string, string> = {
  admin: '#DC2626',
  functionary: '#D97706',
  member: '#6B7280',
};

const ROLE_ORDER: MemberRole[] = ['admin', 'functionary', 'member'];

const ROLE_LABEL_KEYS: Record<string, { key: string; fallback: string }> = {
  admin: { key: 'organizations.roleAdmin', fallback: 'Admin' },
  functionary: { key: 'organizations.roleFunctionary', fallback: 'Functionary' },
  member: { key: 'organizations.roleMember', fallback: 'Member' },
};

export const OrgMembersScreen: React.FC = () => {
  const { t } = useTranslation();
  const route = useRoute<RouteType>();
  const { orgId } = route.params;

  const [searchQuery, setSearchQuery] = useState('');
  const [showAddModal, setShowAddModal] = useState(false);
  const [newUserId, setNewUserId] = useState('');
  const [newRole, setNewRole] = useState<MemberRole>('member');

  const { data: membersData, isLoading, refetch } = useOrgMembers(orgId, 1, 100);
  const addMemberMutation = useAddMember();
  const removeMemberMutation = useRemoveMember();

  const members = membersData?.members ?? [];

  const filteredMembers = useMemo(() => {
    if (!searchQuery.trim()) return members;
    const q = searchQuery.toLowerCase();
    return members.filter(
      m =>
        (m.userName || '').toLowerCase().includes(q) ||
        m.userId.toLowerCase().includes(q) ||
        m.role.toLowerCase().includes(q),
    );
  }, [members, searchQuery]);

  const groupedMembers = useMemo(() => {
    const groups: Record<string, OrgMember[]> = {};
    ROLE_ORDER.forEach(role => {
      const group = filteredMembers.filter(m => m.role === role);
      if (group.length > 0) {
        groups[role] = group;
      }
    });
    return groups;
  }, [filteredMembers]);

  const handleAddMember = () => {
    if (!newUserId.trim()) {
      Alert.alert(t('common.error', 'Error'), t('organizations.enterUserId', 'Please enter a user ID.'));
      return;
    }
    addMemberMutation.mutate(
      { orgId, userId: newUserId.trim(), role: newRole },
      {
        onSuccess: () => {
          setShowAddModal(false);
          setNewUserId('');
          setNewRole('member');
          refetch();
        },
        onError: (err: any) => {
          Alert.alert(t('common.error', 'Error'), err.message || t('organizations.couldNotAddMember', 'Could not add member.'));
        },
      },
    );
  };

  const handleRemoveMember = (member: OrgMember) => {
    Alert.alert(
      t('organizations.removeMember', 'Remove Member'),
      t('organizations.removeMemberConfirm', 'Remove {{name}} from this organization?', { name: member.userName || member.userId }),
      [
        { text: t('common.cancel', 'Cancel'), style: 'cancel' },
        {
          text: t('organizations.remove', 'Remove'),
          style: 'destructive',
          onPress: () => {
            removeMemberMutation.mutate(
              { orgId, userId: member.userId },
              {
                onSuccess: () => refetch(),
                onError: (err: any) => {
                  Alert.alert(t('common.error', 'Error'), err.message || t('organizations.couldNotRemoveMember', 'Could not remove member.'));
                },
              },
            );
          },
        },
      ],
    );
  };

  const renderMember = (member: OrgMember) => (
    <View key={member.id} style={styles.memberRow}>
      <Avatar
        name={member.userName || member.userId}
        imageUrl={member.userAvatar}
        size={44}
      />
      <View style={styles.memberInfo}>
        <Text style={styles.memberName} numberOfLines={1}>
          {member.userName || member.userId}
        </Text>
        <Text style={styles.memberMeta}>
          Level {member.level} -- Joined {formatRelativeTime(member.joinedAt)}
        </Text>
      </View>
      <View style={styles.memberActions}>
        <Badge
          text={member.role}
          backgroundColor={(ROLE_COLORS[member.role] || colors.textMuted) + '15'}
          color={ROLE_COLORS[member.role] || colors.textMuted}
          size="sm"
        />
        {member.role !== 'admin' && (
          <TouchableOpacity
            style={styles.removeButton}
            onPress={() => handleRemoveMember(member)}
          >
            <Text style={styles.removeText}>{'\u2715'}</Text>
          </TouchableOpacity>
        )}
      </View>
    </View>
  );

  const renderSection = () => (
    <View>
      {/* Search bar */}
      <View style={styles.searchContainer}>
        <TextInput
          style={styles.searchInput}
          placeholder={t('organizations.searchMembers', 'Search members...')}
          placeholderTextColor={colors.textMuted}
          value={searchQuery}
          onChangeText={setSearchQuery}
        />
      </View>

      {/* Member count */}
      <View style={styles.countRow}>
        <Text style={styles.countText}>
          {filteredMembers.length} {t('organizations.members', 'members')}
        </Text>
        <TouchableOpacity
          style={styles.addButton}
          onPress={() => setShowAddModal(true)}
        >
          <Text style={styles.addButtonText}>+ {t('organizations.addMember', 'Add Member')}</Text>
        </TouchableOpacity>
      </View>

      {/* Grouped members */}
      {Object.entries(groupedMembers).map(([role, roleMembers]) => (
        <View key={role} style={styles.roleSection}>
          <Text style={styles.roleSectionTitle}>
            {ROLE_LABEL_KEYS[role] ? t(ROLE_LABEL_KEYS[role].key, ROLE_LABEL_KEYS[role].fallback) : role}s ({roleMembers.length})
          </Text>
          {roleMembers.map(renderMember)}
        </View>
      ))}

      {filteredMembers.length === 0 && (
        <View style={styles.emptyContainer}>
          <Text style={styles.emptyIcon}>{'\u{1F465}'}</Text>
          <Text style={styles.emptyTitle}>
            {searchQuery ? t('organizations.noMembersFound', 'No members found') : t('organizations.noMembersYet', 'No members yet')}
          </Text>
          <Text style={styles.emptyText}>
            {searchQuery
              ? t('organizations.tryDifferentSearch', 'Try a different search term.')
              : t('organizations.addMembersToStart', 'Add members to your organization to get started.')}
          </Text>
        </View>
      )}
    </View>
  );

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
        data={[1]}
        renderItem={() => renderSection()}
        keyExtractor={() => 'members'}
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
      />

      {/* Add Member Modal */}
      <Modal visible={showAddModal} transparent animationType="fade">
        <Pressable
          style={styles.modalBackdrop}
          onPress={() => setShowAddModal(false)}
        >
          <View style={styles.modalCard} onStartShouldSetResponder={() => true}>
            <Text style={styles.modalTitle}>{t('organizations.addMember', 'Add Member')}</Text>

            <Text style={styles.fieldLabel}>{t('organizations.userId', 'User ID')}</Text>
            <TextInput
              style={styles.textInput}
              placeholder={t('organizations.enterUserIdPlaceholder', 'Enter user ID...')}
              placeholderTextColor={colors.textMuted}
              value={newUserId}
              onChangeText={setNewUserId}
              autoCapitalize="none"
            />

            <Text style={styles.fieldLabel}>{t('organizations.role', 'Role')}</Text>
            <View style={styles.rolePickerRow}>
              {(['member', 'functionary', 'admin'] as MemberRole[]).map(role => (
                <TouchableOpacity
                  key={role}
                  style={[
                    styles.rolePicker,
                    newRole === role && styles.rolePickerActive,
                  ]}
                  onPress={() => setNewRole(role)}
                >
                  <Text
                    style={[
                      styles.rolePickerText,
                      newRole === role && styles.rolePickerTextActive,
                    ]}
                  >
                    {ROLE_LABEL_KEYS[role] ? t(ROLE_LABEL_KEYS[role].key, ROLE_LABEL_KEYS[role].fallback) : role}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>

            <View style={styles.modalButtons}>
              <Button
                title={t('common.cancel', 'Cancel')}
                variant="outline"
                size="md"
                onPress={() => setShowAddModal(false)}
                style={{ flex: 1 }}
              />
              <Button
                title={t('organizations.add', 'Add')}
                variant="primary"
                size="md"
                onPress={handleAddMember}
                loading={addMemberMutation.isPending}
                style={{ flex: 1, backgroundColor: colors.saffron }}
              />
            </View>
          </View>
        </Pressable>
      </Modal>
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

  // Search
  searchContainer: {
    marginBottom: spacing.md,
  },
  searchInput: {
    backgroundColor: colors.white,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: borderRadius.button,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    fontSize: 15,
    color: colors.textPrimary,
  },

  // Count row
  countRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: spacing.lg,
  },
  countText: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.textMuted,
  },
  addButton: {
    backgroundColor: colors.saffron,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.sm,
    borderRadius: borderRadius.button,
  },
  addButtonText: {
    fontSize: 13,
    fontWeight: '700',
    color: colors.white,
  },

  // Role section
  roleSection: {
    marginBottom: spacing.lg,
  },
  roleSectionTitle: {
    fontSize: 13,
    fontWeight: '700',
    color: colors.textMuted,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: spacing.sm,
  },

  // Member row
  memberRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.white,
    borderRadius: borderRadius.lg,
    padding: spacing.md,
    marginBottom: spacing.sm,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.04,
    shadowRadius: 4,
    elevation: 1,
    gap: spacing.md,
  },
  memberInfo: {
    flex: 1,
  },
  memberName: {
    fontSize: 15,
    fontWeight: '600',
    color: colors.textPrimary,
  },
  memberMeta: {
    fontSize: 12,
    color: colors.textMuted,
    marginTop: 2,
  },
  memberActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  removeButton: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: colors.error + '12',
    alignItems: 'center',
    justifyContent: 'center',
  },
  removeText: {
    fontSize: 10,
    color: colors.error,
    fontWeight: '700',
  },

  // Empty
  emptyContainer: {
    alignItems: 'center',
    paddingTop: 40,
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

  // Modal
  modalBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.4)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: spacing['2xl'],
  },
  modalCard: {
    backgroundColor: colors.white,
    borderRadius: 20,
    padding: spacing['2xl'],
    width: '100%',
    maxWidth: 360,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 12 },
    shadowOpacity: 0.15,
    shadowRadius: 24,
    elevation: 10,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: '800',
    color: colors.textPrimary,
    marginBottom: spacing.xl,
  },
  fieldLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.textPrimary,
    marginBottom: spacing.sm,
  },
  textInput: {
    backgroundColor: colors.backgroundGray,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: borderRadius.md,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.md,
    fontSize: 15,
    color: colors.textPrimary,
    marginBottom: spacing.lg,
  },
  rolePickerRow: {
    flexDirection: 'row',
    gap: spacing.sm,
    marginBottom: spacing.xl,
  },
  rolePicker: {
    flex: 1,
    paddingVertical: spacing.sm,
    borderRadius: borderRadius.button,
    backgroundColor: colors.backgroundGray,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: colors.border,
  },
  rolePickerActive: {
    backgroundColor: colors.saffron + '15',
    borderColor: colors.saffron,
  },
  rolePickerText: {
    fontSize: 13,
    fontWeight: '600',
    color: colors.textMuted,
  },
  rolePickerTextActive: {
    color: colors.saffron,
  },
  modalButtons: {
    flexDirection: 'row',
    gap: spacing.md,
  },
});
