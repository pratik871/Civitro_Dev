import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  StatusBar,
  Alert,
} from 'react-native';
import { Button } from '../../components/ui/Button';
import { Card } from '../../components/ui/Card';
import { Input } from '../../components/ui/Input';
import { colors } from '../../theme/colors';
import { spacing, borderRadius } from '../../theme/spacing';
import type { IssueCategory, ReportStepData } from '../../types';
import { ISSUE_CATEGORY_LABELS } from '../../types/issue';

const CATEGORY_CONFIG: Array<{
  key: IssueCategory;
  icon: string;
  color: string;
}> = [
  { key: 'pothole', icon: '\u{1F6A7}', color: '#DC2626' },
  { key: 'garbage', icon: '\u{1F5D1}', color: '#EA580C' },
  { key: 'streetlight', icon: '\u{1F4A1}', color: '#EAB308' },
  { key: 'water_supply', icon: '\u{1F4A7}', color: '#2563EB' },
  { key: 'road_damage', icon: '\u26A0\uFE0F', color: '#D97706' },
  { key: 'construction', icon: '\u{1F3D7}', color: '#7C3AED' },
  { key: 'drainage', icon: '\u{1F327}', color: '#0D9488' },
  { key: 'traffic', icon: '\u{1F6A6}', color: '#DC2626' },
  { key: 'healthcare', icon: '\u{1F3E5}', color: '#16A34A' },
  { key: 'education', icon: '\u{1F4DA}', color: '#2563EB' },
  { key: 'public_safety', icon: '\u{1F6E1}', color: '#1E293B' },
  { key: 'other', icon: '\u2699\uFE0F', color: '#6B7280' },
];

const DEPARTMENT_MAP: Partial<Record<IssueCategory, string>> = {
  pothole: 'BBMP Roads Division',
  garbage: 'BBMP Solid Waste Management',
  streetlight: 'BESCOM',
  water_supply: 'BWSSB',
  road_damage: 'BBMP Roads Division',
  construction: 'BBMP Engineering',
  drainage: 'BBMP Storm Water Drain',
  traffic: 'Traffic Police',
  healthcare: 'BBMP Health Division',
  education: 'Dept. of Public Instruction',
  public_safety: 'City Police',
  other: 'BBMP General',
};

export const ReportIssueScreen: React.FC = () => {
  const [step, setStep] = useState(1);
  const [data, setData] = useState<ReportStepData>({
    latitude: 12.9352,
    longitude: 77.6245,
    address: 'Koramangala 4th Block, Bangalore',
    suggestedCategory: 'pothole',
  });
  const [description, setDescription] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const handleTakePhoto = () => {
    // Simulate photo capture
    setData(prev => ({
      ...prev,
      photoUri: 'mock-photo-uri',
    }));
    Alert.alert('Camera', 'Photo captured successfully (simulated)');
  };

  const handleSelectCategory = (category: IssueCategory) => {
    setData(prev => ({
      ...prev,
      category,
      department: DEPARTMENT_MAP[category],
    }));
  };

  const handleSubmit = () => {
    setSubmitting(true);
    // Simulate submission
    setTimeout(() => {
      setSubmitting(false);
      Alert.alert(
        'Issue Reported!',
        'Your issue has been submitted successfully. You can track its progress in the Issues section.',
        [
          {
            text: 'OK',
            onPress: () => {
              setStep(1);
              setData({
                latitude: 12.9352,
                longitude: 77.6245,
                address: 'Koramangala 4th Block, Bangalore',
                suggestedCategory: 'pothole',
              });
              setDescription('');
            },
          },
        ],
      );
    }, 1500);
  };

  const renderStepIndicator = () => (
    <View style={styles.stepIndicator}>
      {[1, 2, 3].map(s => (
        <View key={s} style={styles.stepRow}>
          <View
            style={[
              styles.stepDot,
              s <= step ? styles.stepDotActive : styles.stepDotInactive,
            ]}
          >
            <Text style={[styles.stepNumber, s <= step && styles.stepNumberActive]}>
              {s}
            </Text>
          </View>
          <Text
            style={[
              styles.stepLabel,
              s <= step ? styles.stepLabelActive : styles.stepLabelInactive,
            ]}
          >
            {s === 1 ? 'Photo' : s === 2 ? 'Classify' : 'Review'}
          </Text>
          {s < 3 && (
            <View
              style={[
                styles.stepLine,
                s < step ? styles.stepLineActive : styles.stepLineInactive,
              ]}
            />
          )}
        </View>
      ))}
    </View>
  );

  const renderStep1 = () => (
    <View style={styles.stepContent}>
      <Text style={styles.stepTitle}>Capture the Issue</Text>
      <Text style={styles.stepSubtitle}>
        Take a photo and we will auto-detect your location
      </Text>

      <TouchableOpacity
        style={styles.cameraPlaceholder}
        onPress={handleTakePhoto}
        activeOpacity={0.8}
      >
        {data.photoUri ? (
          <View style={styles.photoTaken}>
            <Text style={styles.photoTakenIcon}>{'\u2705'}</Text>
            <Text style={styles.photoTakenText}>Photo captured</Text>
            <Text style={styles.photoRetake}>Tap to retake</Text>
          </View>
        ) : (
          <>
            <View style={styles.cameraIconContainer}>
              <Text style={styles.cameraIcon}>{'\u{1F4F7}'}</Text>
            </View>
            <Text style={styles.cameraText}>Tap to take photo</Text>
            <Text style={styles.cameraHint}>
              Capture a clear photo of the issue
            </Text>
          </>
        )}
      </TouchableOpacity>

      <Card style={styles.locationCard}>
        <View style={styles.locationRow}>
          <Text style={styles.locationIcon}>{'\u{1F4CD}'}</Text>
          <View style={styles.locationInfo}>
            <Text style={styles.locationTitle}>Location Detected</Text>
            <Text style={styles.locationAddress}>{data.address}</Text>
            <Text style={styles.locationCoords}>
              {data.latitude?.toFixed(4)}, {data.longitude?.toFixed(4)}
            </Text>
          </View>
          <View style={styles.gpsIndicator}>
            <Text style={styles.gpsText}>GPS</Text>
          </View>
        </View>
      </Card>

      <Button
        title="Next: Classify Issue"
        onPress={() => setStep(2)}
        fullWidth
        size="lg"
        style={styles.nextButton}
      />
    </View>
  );

  const renderStep2 = () => (
    <View style={styles.stepContent}>
      <Text style={styles.stepTitle}>Classify the Issue</Text>
      <Text style={styles.stepSubtitle}>
        AI suggests:{' '}
        <Text style={styles.aiSuggestion}>
          {ISSUE_CATEGORY_LABELS[data.suggestedCategory || 'other']}
        </Text>
        . Tap to change.
      </Text>

      <View style={styles.categoryGrid}>
        {CATEGORY_CONFIG.map(cat => {
          const isSelected = data.category === cat.key;
          const isSuggested =
            !data.category && data.suggestedCategory === cat.key;
          return (
            <TouchableOpacity
              key={cat.key}
              style={[
                styles.categoryItem,
                isSelected && {
                  borderColor: cat.color,
                  backgroundColor: cat.color + '10',
                },
                isSuggested && !data.category && {
                  borderColor: cat.color + '60',
                  borderStyle: 'dashed' as any,
                },
              ]}
              onPress={() => handleSelectCategory(cat.key)}
              activeOpacity={0.7}
            >
              <Text style={styles.categoryIcon}>{cat.icon}</Text>
              <Text
                style={[
                  styles.categoryLabel,
                  isSelected && { color: cat.color, fontWeight: '600' },
                ]}
                numberOfLines={1}
              >
                {ISSUE_CATEGORY_LABELS[cat.key]}
              </Text>
              {isSuggested && !data.category && (
                <Text style={styles.aiTag}>AI</Text>
              )}
            </TouchableOpacity>
          );
        })}
      </View>

      <Input
        label="Description (Optional)"
        placeholder="Add more details about the issue..."
        value={description}
        onChangeText={setDescription}
        multiline
        numberOfLines={3}
        containerStyle={styles.descriptionInput}
      />

      <View style={styles.buttonRow}>
        <Button
          title="Back"
          onPress={() => setStep(1)}
          variant="outline"
          size="md"
          style={styles.backButton}
        />
        <Button
          title="Next: Review"
          onPress={() => {
            if (!data.category && data.suggestedCategory) {
              setData(prev => ({
                ...prev,
                category: prev.suggestedCategory,
                department: DEPARTMENT_MAP[prev.suggestedCategory!],
              }));
            }
            setStep(3);
          }}
          size="md"
          style={styles.nextButtonFlex}
        />
      </View>
    </View>
  );

  const renderStep3 = () => {
    const selectedCategory = data.category || data.suggestedCategory || 'other';
    const categoryConfig = CATEGORY_CONFIG.find(c => c.key === selectedCategory);

    return (
      <View style={styles.stepContent}>
        <Text style={styles.stepTitle}>Review & Submit</Text>
        <Text style={styles.stepSubtitle}>
          Confirm the details before submitting
        </Text>

        <Card style={styles.reviewCard}>
          {/* Photo preview placeholder */}
          <View style={styles.reviewPhoto}>
            <Text style={styles.reviewPhotoIcon}>{'\u{1F4F8}'}</Text>
            <Text style={styles.reviewPhotoText}>Photo attached</Text>
          </View>

          <View style={styles.reviewDetails}>
            <View style={styles.reviewRow}>
              <Text style={styles.reviewLabel}>Category</Text>
              <View style={styles.reviewCategoryBadge}>
                <Text style={styles.reviewCategoryIcon}>
                  {categoryConfig?.icon}
                </Text>
                <Text
                  style={[
                    styles.reviewCategoryText,
                    { color: categoryConfig?.color },
                  ]}
                >
                  {ISSUE_CATEGORY_LABELS[selectedCategory]}
                </Text>
              </View>
            </View>

            <View style={styles.reviewDivider} />

            <View style={styles.reviewRow}>
              <Text style={styles.reviewLabel}>Location</Text>
              <Text style={styles.reviewValue}>{data.address}</Text>
            </View>

            <View style={styles.reviewDivider} />

            <View style={styles.reviewRow}>
              <Text style={styles.reviewLabel}>Auto-Routed To</Text>
              <Text style={[styles.reviewValue, styles.departmentText]}>
                {data.department || DEPARTMENT_MAP[selectedCategory]}
              </Text>
            </View>

            {description ? (
              <>
                <View style={styles.reviewDivider} />
                <View style={styles.reviewRow}>
                  <Text style={styles.reviewLabel}>Description</Text>
                  <Text style={styles.reviewValue}>{description}</Text>
                </View>
              </>
            ) : null}
          </View>
        </Card>

        <View style={styles.routingInfo}>
          <Text style={styles.routingIcon}>{'\u2699\uFE0F'}</Text>
          <Text style={styles.routingText}>
            This issue will be automatically routed to the relevant department
            and tracked on the blockchain ledger.
          </Text>
        </View>

        <View style={styles.buttonRow}>
          <Button
            title="Back"
            onPress={() => setStep(2)}
            variant="outline"
            size="md"
            style={styles.backButton}
          />
          <Button
            title="Submit Issue"
            onPress={handleSubmit}
            size="lg"
            loading={submitting}
            style={styles.nextButtonFlex}
          />
        </View>
      </View>
    );
  };

  return (
    <View style={styles.container}>
      <StatusBar barStyle="dark-content" backgroundColor={colors.background} />

      <View style={styles.header}>
        <Text style={styles.headerTitle}>Report an Issue</Text>
      </View>

      {renderStepIndicator()}

      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
      >
        {step === 1 && renderStep1()}
        {step === 2 && renderStep2()}
        {step === 3 && renderStep3()}
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
  },
  stepIndicator: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: spacing['2xl'],
    paddingBottom: spacing.lg,
  },
  stepRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  stepDot: {
    width: 28,
    height: 28,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  stepDotActive: {
    backgroundColor: colors.primary,
  },
  stepDotInactive: {
    backgroundColor: colors.border,
  },
  stepNumber: {
    fontSize: 13,
    fontWeight: '600',
    color: colors.textMuted,
  },
  stepNumberActive: {
    color: colors.white,
  },
  stepLabel: {
    fontSize: 12,
    fontWeight: '500',
    marginLeft: spacing.xs,
  },
  stepLabelActive: {
    color: colors.primary,
  },
  stepLabelInactive: {
    color: colors.textMuted,
  },
  stepLine: {
    width: 24,
    height: 2,
    marginHorizontal: spacing.sm,
  },
  stepLineActive: {
    backgroundColor: colors.primary,
  },
  stepLineInactive: {
    backgroundColor: colors.border,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: spacing.lg,
    paddingBottom: spacing['4xl'],
  },
  stepContent: {
    flex: 1,
  },
  stepTitle: {
    fontSize: 20,
    fontWeight: '600',
    color: colors.textPrimary,
    marginBottom: spacing.xs,
  },
  stepSubtitle: {
    fontSize: 14,
    color: colors.textMuted,
    lineHeight: 20,
    marginBottom: spacing.xl,
  },
  aiSuggestion: {
    color: colors.primary,
    fontWeight: '600',
  },
  cameraPlaceholder: {
    height: 200,
    borderWidth: 2,
    borderColor: colors.border,
    borderStyle: 'dashed',
    borderRadius: borderRadius.card,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.backgroundGray,
    marginBottom: spacing.lg,
  },
  cameraIconContainer: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: colors.primary + '15',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing.sm,
  },
  cameraIcon: {
    fontSize: 28,
  },
  cameraText: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.textPrimary,
  },
  cameraHint: {
    fontSize: 13,
    color: colors.textMuted,
    marginTop: spacing.xs,
  },
  photoTaken: {
    alignItems: 'center',
  },
  photoTakenIcon: {
    fontSize: 36,
    marginBottom: spacing.sm,
  },
  photoTakenText: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.success,
  },
  photoRetake: {
    fontSize: 13,
    color: colors.textMuted,
    marginTop: spacing.xs,
  },
  locationCard: {
    marginBottom: spacing.xl,
  },
  locationRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  locationIcon: {
    fontSize: 24,
    marginRight: spacing.md,
  },
  locationInfo: {
    flex: 1,
  },
  locationTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.textPrimary,
    marginBottom: 2,
  },
  locationAddress: {
    fontSize: 13,
    color: colors.textSecondary,
  },
  locationCoords: {
    fontSize: 11,
    color: colors.textMuted,
    marginTop: 2,
  },
  gpsIndicator: {
    backgroundColor: colors.success + '15',
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
    borderRadius: borderRadius.sm,
  },
  gpsText: {
    fontSize: 11,
    fontWeight: '600',
    color: colors.success,
  },
  nextButton: {
    marginTop: spacing.sm,
  },
  categoryGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
    marginBottom: spacing.xl,
  },
  categoryItem: {
    width: '30%',
    flexGrow: 1,
    alignItems: 'center',
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.sm,
    borderWidth: 1.5,
    borderColor: colors.border,
    borderRadius: borderRadius.lg,
    backgroundColor: colors.white,
    position: 'relative',
  },
  categoryIcon: {
    fontSize: 24,
    marginBottom: spacing.xs,
  },
  categoryLabel: {
    fontSize: 11,
    color: colors.textSecondary,
    textAlign: 'center',
    fontWeight: '500',
  },
  aiTag: {
    position: 'absolute',
    top: 4,
    right: 4,
    backgroundColor: colors.primary,
    color: colors.white,
    fontSize: 8,
    fontWeight: '700',
    paddingHorizontal: 4,
    paddingVertical: 1,
    borderRadius: 3,
    overflow: 'hidden',
  },
  descriptionInput: {
    marginBottom: spacing.sm,
  },
  buttonRow: {
    flexDirection: 'row',
    gap: spacing.md,
    marginTop: spacing.md,
  },
  backButton: {
    flex: 1,
  },
  nextButtonFlex: {
    flex: 2,
  },
  reviewCard: {
    marginBottom: spacing.lg,
    padding: 0,
    overflow: 'hidden',
  },
  reviewPhoto: {
    height: 120,
    backgroundColor: colors.navy + '08',
    alignItems: 'center',
    justifyContent: 'center',
  },
  reviewPhotoIcon: {
    fontSize: 32,
    marginBottom: spacing.xs,
  },
  reviewPhotoText: {
    fontSize: 14,
    color: colors.textMuted,
    fontWeight: '500',
  },
  reviewDetails: {
    padding: spacing.lg,
  },
  reviewRow: {
    paddingVertical: spacing.sm,
  },
  reviewLabel: {
    fontSize: 12,
    fontWeight: '500',
    color: colors.textMuted,
    marginBottom: spacing.xs,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  reviewValue: {
    fontSize: 15,
    color: colors.textPrimary,
    lineHeight: 20,
  },
  reviewCategoryBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  reviewCategoryIcon: {
    fontSize: 18,
  },
  reviewCategoryText: {
    fontSize: 15,
    fontWeight: '600',
  },
  reviewDivider: {
    height: 1,
    backgroundColor: colors.borderLight,
  },
  departmentText: {
    color: colors.info,
    fontWeight: '500',
  },
  routingInfo: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    backgroundColor: colors.info + '08',
    padding: spacing.md,
    borderRadius: borderRadius.lg,
    marginBottom: spacing.xl,
    gap: spacing.sm,
  },
  routingIcon: {
    fontSize: 16,
    marginTop: 2,
  },
  routingText: {
    flex: 1,
    fontSize: 13,
    color: colors.info,
    lineHeight: 18,
  },
});
