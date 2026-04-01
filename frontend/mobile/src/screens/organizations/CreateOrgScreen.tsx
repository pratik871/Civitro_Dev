import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  StatusBar,
  TouchableOpacity,
  TextInput,
  Alert,
  KeyboardAvoidingView,
  Platform,
  Modal,
  Pressable,
} from 'react-native';
import Svg, { Path, Circle } from 'react-native-svg';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { Button } from '../../components/ui/Button';
import { colors } from '../../theme/colors';
import { spacing, borderRadius } from '../../theme/spacing';
import { useCreateOrg } from '../../hooks/useOrganizations';
import type { OrgType } from '../../hooks/useOrganizations';
import type { RootStackParamList } from '../../navigation/types';

type NavProp = NativeStackNavigationProp<RootStackParamList>;

const ORG_TYPES: { key: OrgType; label: string; icon: string; description: string }[] = [
  {
    key: 'political_party',
    label: 'Political Party',
    icon: '\u{1F3DB}',
    description: 'A registered political organization',
  },
  {
    key: 'ngo',
    label: 'NGO',
    icon: '\u{1F91D}',
    description: 'Non-governmental organization',
  },
  {
    key: 'rwa',
    label: 'RWA',
    icon: '\u{1F3E0}',
    description: 'Resident Welfare Association',
  },
  {
    key: 'club',
    label: 'Club',
    icon: '\u{1F465}',
    description: 'Community club or group',
  },
];

const ORG_TYPE_COLORS: Record<OrgType, string> = {
  political_party: '#7C3AED',
  ngo: '#059669',
  rwa: '#2563EB',
  club: '#D97706',
};

const NAME_MAX = 100;
const DESC_MAX = 500;

export const CreateOrgScreen: React.FC = () => {
  const navigation = useNavigation<NavProp>();
  const createMutation = useCreateOrg();

  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [selectedType, setSelectedType] = useState<OrgType | null>(null);
  const [showSuccess, setShowSuccess] = useState(false);

  const canSubmit = name.trim().length > 0 && selectedType !== null;

  const handleSubmit = () => {
    if (!canSubmit || !selectedType) return;
    createMutation.mutate(
      {
        name: name.trim(),
        type: selectedType,
        description: description.trim(),
      },
      {
        onSuccess: () => {
          setShowSuccess(true);
        },
        onError: (err: any) => {
          Alert.alert('Error', err.message || 'Could not create organization.');
        },
      },
    );
  };

  return (
    <>
      <KeyboardAvoidingView
        style={styles.container}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <ScrollView
          contentContainerStyle={styles.content}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
        >
          <StatusBar barStyle="dark-content" backgroundColor={colors.background} />

          <View style={styles.header}>
            <Text style={styles.headerTitle}>Create Organization</Text>
            <Text style={styles.headerSubtitle}>
              Set up a political party, NGO, RWA, or community club
            </Text>
          </View>

          {/* Organization Type */}
          <View style={styles.fieldGroup}>
            <Text style={styles.fieldLabel}>Type</Text>
            <View style={styles.typeGrid}>
              {ORG_TYPES.map(orgType => {
                const isSelected = selectedType === orgType.key;
                const typeColor = ORG_TYPE_COLORS[orgType.key];
                return (
                  <TouchableOpacity
                    key={orgType.key}
                    style={[
                      styles.typeCard,
                      isSelected && {
                        borderColor: typeColor,
                        backgroundColor: typeColor + '08',
                      },
                    ]}
                    onPress={() => setSelectedType(orgType.key)}
                    activeOpacity={0.7}
                  >
                    <Text style={styles.typeIcon}>{orgType.icon}</Text>
                    <Text
                      style={[
                        styles.typeLabel,
                        isSelected && { color: typeColor },
                      ]}
                    >
                      {orgType.label}
                    </Text>
                    <Text style={styles.typeDescription} numberOfLines={1}>
                      {orgType.description}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </View>
          </View>

          {/* Name */}
          <View style={styles.fieldGroup}>
            <Text style={styles.fieldLabel}>Name</Text>
            <TextInput
              style={styles.textInput}
              placeholder="Organization name"
              placeholderTextColor={colors.textMuted}
              value={name}
              onChangeText={t => setName(t.slice(0, NAME_MAX))}
              maxLength={NAME_MAX}
            />
            <Text style={styles.charCount}>
              {name.length}/{NAME_MAX}
            </Text>
          </View>

          {/* Description */}
          <View style={styles.fieldGroup}>
            <Text style={styles.fieldLabel}>Description (Optional)</Text>
            <TextInput
              style={[styles.textInput, styles.textArea]}
              placeholder="What does your organization do?"
              placeholderTextColor={colors.textMuted}
              value={description}
              onChangeText={t => setDescription(t.slice(0, DESC_MAX))}
              maxLength={DESC_MAX}
              multiline
              textAlignVertical="top"
            />
            <Text style={styles.charCount}>
              {description.length}/{DESC_MAX}
            </Text>
          </View>

          {/* Submit */}
          <View style={styles.submitRow}>
            <Button
              title="Create Organization"
              onPress={handleSubmit}
              variant="primary"
              size="lg"
              loading={createMutation.isPending}
              disabled={!canSubmit}
              fullWidth
              style={[
                styles.submitButton,
                !canSubmit && styles.submitButtonDisabled,
              ]}
            />
            {!canSubmit && (
              <Text style={styles.submitHint}>
                Select a type and enter a name to continue.
              </Text>
            )}
          </View>

          <View style={{ height: 40 }} />
        </ScrollView>
      </KeyboardAvoidingView>

      {/* Success Modal */}
      <Modal visible={showSuccess} transparent animationType="fade">
        <Pressable
          style={styles.modalBackdrop}
          onPress={() => {
            setShowSuccess(false);
            navigation.goBack();
          }}
        >
          <View style={styles.modalCard}>
            <View style={styles.successIconWrap}>
              <Svg viewBox="0 0 24 24" width={32} height={32} fill="none">
                <Circle cx={12} cy={12} r={10} stroke="#10B981" strokeWidth={2} />
                <Path
                  d="M8 12l3 3 5-6"
                  stroke="#10B981"
                  strokeWidth={2.5}
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              </Svg>
            </View>
            <Text style={styles.successTitle}>Organization Created!</Text>
            <Text style={styles.successSubtitle}>
              Your organization is now live. Start adding members and sending
              broadcasts.
            </Text>
            <TouchableOpacity
              style={styles.successButton}
              onPress={() => {
                setShowSuccess(false);
                navigation.goBack();
              }}
              activeOpacity={0.7}
            >
              <Text style={styles.successButtonText}>Done</Text>
            </TouchableOpacity>
          </View>
        </Pressable>
      </Modal>
    </>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  content: {
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.md,
    paddingBottom: spacing['3xl'],
  },

  // Header
  header: {
    marginBottom: spacing.xl,
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: '700',
    color: colors.textPrimary,
    marginBottom: spacing.xs,
  },
  headerSubtitle: {
    fontSize: 15,
    color: colors.textMuted,
  },

  // Fields
  fieldGroup: {
    marginBottom: spacing.xl,
  },
  fieldLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.textPrimary,
    marginBottom: spacing.sm,
  },
  textInput: {
    backgroundColor: colors.white,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: borderRadius.md,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.md,
    fontSize: 15,
    color: colors.textPrimary,
  },
  textArea: {
    height: 100,
    paddingTop: spacing.md,
  },
  charCount: {
    fontSize: 12,
    color: colors.textMuted,
    textAlign: 'right',
    marginTop: spacing.xs,
  },

  // Type picker
  typeGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
  },
  typeCard: {
    width: '48%',
    flexGrow: 1,
    backgroundColor: colors.white,
    borderWidth: 1.5,
    borderColor: colors.border,
    borderRadius: borderRadius.lg,
    padding: spacing.md,
    alignItems: 'center',
    gap: spacing.xs,
  },
  typeIcon: {
    fontSize: 28,
  },
  typeLabel: {
    fontSize: 14,
    fontWeight: '700',
    color: colors.textPrimary,
  },
  typeDescription: {
    fontSize: 11,
    color: colors.textMuted,
    textAlign: 'center',
  },

  // Submit
  submitRow: {
    alignItems: 'center',
  },
  submitButton: {
    backgroundColor: colors.saffron,
  },
  submitButtonDisabled: {
    opacity: 0.5,
  },
  submitHint: {
    fontSize: 12,
    color: colors.textMuted,
    textAlign: 'center',
    marginTop: spacing.sm,
  },

  // Success Modal
  modalBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.4)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 40,
  },
  modalCard: {
    backgroundColor: colors.white,
    borderRadius: 20,
    padding: 28,
    alignItems: 'center',
    width: '100%',
    maxWidth: 300,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 12 },
    shadowOpacity: 0.15,
    shadowRadius: 24,
    elevation: 10,
  },
  successIconWrap: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: '#ECFDF5',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing.lg,
  },
  successTitle: {
    fontSize: 20,
    fontWeight: '800',
    color: colors.navy,
    marginBottom: spacing.sm,
  },
  successSubtitle: {
    fontSize: 13,
    color: colors.textMuted,
    textAlign: 'center',
    lineHeight: 19,
    marginBottom: spacing.xl,
  },
  successButton: {
    backgroundColor: colors.saffron,
    paddingVertical: spacing.md,
    paddingHorizontal: spacing['3xl'],
    borderRadius: borderRadius.button,
    alignItems: 'center',
    width: '100%',
    shadowColor: colors.saffron,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.25,
    shadowRadius: 10,
    elevation: 4,
  },
  successButtonText: {
    fontSize: 15,
    fontWeight: '700',
    color: colors.white,
  },
});
