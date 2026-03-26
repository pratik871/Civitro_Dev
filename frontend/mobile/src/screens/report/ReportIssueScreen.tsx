import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  StatusBar,
  Image,
  ActivityIndicator,
  Alert,
  Modal,
  Pressable,
} from 'react-native';
import Svg, { Path, Circle } from 'react-native-svg';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTranslation } from 'react-i18next';
import * as ImagePicker from 'expo-image-picker';
import * as Location from 'expo-location';
import { Button } from '../../components/ui/Button';
import { Card } from '../../components/ui/Card';
import { Input } from '../../components/ui/Input';
import { colors } from '../../theme/colors';
import { spacing, borderRadius } from '../../theme/spacing';
import { useQuery } from '@tanstack/react-query';
import type { IssueCategory, ReportStepData } from '../../types';
import { ISSUE_CATEGORY_LABELS } from '../../types/issue';
import { useCreateIssue } from '../../hooks/useIssues';
import apiClient from '../../lib/api';

const CATEGORY_CONFIG: Array<{
  key: IssueCategory;
  icon: string;
  label: string;
  color: string;
}> = [
  { key: 'pothole', icon: '\u{1F6A7}', label: 'Pothole', color: colors.issueCategories.pothole },
  { key: 'garbage', icon: '\u{1F5D1}', label: 'Garbage', color: colors.issueCategories.garbage },
  { key: 'streetlight', icon: '\u{1F4A1}', label: 'Streetlight', color: colors.issueCategories.streetlight },
  { key: 'water_supply', icon: '\u{1F4A7}', label: 'Water Supply', color: colors.issueCategories.water_supply },
  { key: 'road_damage', icon: '\u26A0\uFE0F', label: 'Road Damage', color: colors.issueCategories.road_damage },
  { key: 'construction', icon: '\u{1F3D7}', label: 'Construction', color: colors.issueCategories.construction },
  { key: 'drainage', icon: '\u{1F327}', label: 'Drainage', color: colors.issueCategories.drainage },
  { key: 'traffic', icon: '\u{1F6A6}', label: 'Traffic', color: colors.issueCategories.traffic },
  { key: 'healthcare', icon: '\u{1F3E5}', label: 'Healthcare', color: colors.issueCategories.healthcare },
  { key: 'education', icon: '\u{1F4DA}', label: 'Education', color: colors.issueCategories.education },
  { key: 'public_safety', icon: '\u{1F6E1}', label: 'Public Safety', color: colors.issueCategories.public_safety },
  { key: 'other', icon: '\u2699\uFE0F', label: 'Other', color: colors.issueCategories.other },
];

// Department mappings fetched from API; falls back to generic label
type DepartmentMap = Partial<Record<IssueCategory, string>>;

export const ReportIssueScreen: React.FC = () => {
  const insets = useSafeAreaInsets();
  const { t } = useTranslation();
  const [step, setStep] = useState(1);
  const [data, setData] = useState<ReportStepData>({});
  const [description, setDescription] = useState('');
  const [locationLoading, setLocationLoading] = useState(true);
  const createIssue = useCreateIssue();

  const { data: departmentMap } = useQuery<DepartmentMap>({
    queryKey: ['departments'],
    queryFn: () => apiClient.get('/api/v1/issues/departments'),
    staleTime: 300_000,
  });
  const DEPARTMENT_MAP: DepartmentMap = departmentMap ?? {};

  // Fetch real GPS location on mount
  useEffect(() => {
    (async () => {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert('Permission Denied', 'Location permission is required to report issues.');
        setLocationLoading(false);
        return;
      }
      try {
        const loc = await Location.getCurrentPositionAsync({
          accuracy: Location.Accuracy.High,
        });
        const [geo] = await Location.reverseGeocodeAsync({
          latitude: loc.coords.latitude,
          longitude: loc.coords.longitude,
        });
        const address = geo
          ? [geo.name, geo.street, geo.subregion, geo.city].filter(Boolean).join(', ')
          : `${loc.coords.latitude.toFixed(4)}, ${loc.coords.longitude.toFixed(4)}`;
        setData(prev => ({
          ...prev,
          latitude: loc.coords.latitude,
          longitude: loc.coords.longitude,
          address,
        }));
      } catch {
        Alert.alert('Location Error', 'Could not determine your location. Please try again.');
      } finally {
        setLocationLoading(false);
      }
    })();
  }, []);

  const handleTakePhoto = async () => {
    const { status } = await ImagePicker.requestCameraPermissionsAsync();
    if (status !== 'granted') {
      Alert.alert('Permission Denied', 'Camera permission is required to take photos.');
      return;
    }
    const result = await ImagePicker.launchCameraAsync({
      mediaTypes: ['images'],
      quality: 0.8,
      allowsEditing: true,
    });
    if (!result.canceled && result.assets[0]) {
      setData(prev => ({ ...prev, photoUri: result.assets[0].uri }));
    }
  };

  const handlePickPhoto = async () => {
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      quality: 0.8,
      allowsEditing: true,
    });
    if (!result.canceled && result.assets[0]) {
      setData(prev => ({ ...prev, photoUri: result.assets[0].uri }));
    }
  };

  const handleSelectCategory = (category: IssueCategory) => {
    setData(prev => ({
      ...prev,
      category,
      department: DEPARTMENT_MAP[category],
    }));
  };

  const [submitting, setSubmitting] = useState(false);
  const [showSuccess, setShowSuccess] = useState(false);

  const handleSubmit = async () => {
    const selectedCategory = data.category || data.suggestedCategory || 'other';
    if (!data.latitude || !data.longitude) {
      Alert.alert('Location Required', 'Please wait for your location to be detected.');
      return;
    }

    setSubmitting(true);
    try {
      // Upload photo first if one was captured
      let photoUrls: string[] = [];
      if (data.photoUri) {
        const formData = new FormData();
        const uri = data.photoUri;
        const filename = uri.split('/').pop() || 'photo.jpg';
        formData.append('photo', {
          uri,
          name: filename,
          type: 'image/jpeg',
        } as any);
        const uploadRes = await apiClient.upload<{ url: string }>('/api/v1/issues/upload', formData);
        photoUrls = [uploadRes.url];
      }

      createIssue.mutate(
        {
          text: description || ISSUE_CATEGORY_LABELS[selectedCategory],
          gps_lat: data.latitude,
          gps_lng: data.longitude,
          category: selectedCategory,
          severity: 'medium',
          photo_urls: photoUrls.length > 0 ? photoUrls : undefined,
        },
        {
          onSuccess: () => {
            setSubmitting(false);
            setShowSuccess(true);
          },
          onError: (err) => {
            setSubmitting(false);
            Alert.alert('Submission Failed', err.message || 'Could not submit the issue. Please try again.');
          },
        },
      );
    } catch (err: any) {
      setSubmitting(false);
      Alert.alert('Upload Failed', err.message || 'Could not upload photo. Please try again.');
    }
  };

  const STEP_LABELS = [t('issues.photo'), t('issues.describe'), t('issues.classify'), t('issues.review')];
  const TOTAL_STEPS = STEP_LABELS.length;

  const renderStepIndicator = () => (
    <View style={styles.stepIndicator}>
      {STEP_LABELS.map((label, i) => {
        const s = i + 1;
        return (
          <React.Fragment key={s}>
            <View style={styles.stepItem}>
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
                {label}
              </Text>
            </View>
            {s < TOTAL_STEPS && (
              <View
                style={[
                  styles.stepLine,
                  s < step ? styles.stepLineActive : styles.stepLineInactive,
                ]}
              />
            )}
          </React.Fragment>
        );
      })}
    </View>
  );

  const renderStep1 = () => (
    <View style={styles.stepContent}>
      <Text style={styles.stepTitle}>{t('issues.captureTheIssue')}</Text>
      <Text style={styles.stepSubtitle}>
        {t('issues.takePhotoAutoDetect')}
      </Text>

      {data.photoUri ? (
        <TouchableOpacity
          style={styles.cameraPlaceholder}
          onPress={handleTakePhoto}
          activeOpacity={0.8}
        >
          <Image
            source={{ uri: data.photoUri }}
            style={StyleSheet.absoluteFill}
            resizeMode="cover"
          />
          <View style={styles.photoOverlay}>
            <Text style={styles.photoRetake}>{t('issues.tapToRetake')}</Text>
          </View>
        </TouchableOpacity>
      ) : (
        <View style={styles.photoButtons}>
          <TouchableOpacity
            style={styles.cameraPlaceholder}
            onPress={handleTakePhoto}
            activeOpacity={0.8}
          >
            <View style={styles.cameraIconContainer}>
              <Text style={styles.cameraIcon}>{'\u{1F4F7}'}</Text>
            </View>
            <Text style={styles.cameraText}>{t('issues.takePhoto')}</Text>
            <Text style={styles.cameraHint}>
              {t('issues.capturePhotoHint')}
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.galleryButton}
            onPress={handlePickPhoto}
            activeOpacity={0.8}
          >
            <Text style={styles.galleryButtonText}>{t('issues.chooseFromGallery')}</Text>
          </TouchableOpacity>
        </View>
      )}

      <Card style={styles.locationCard}>
        <View style={styles.locationRow}>
          <Text style={styles.locationIcon}>{'\u{1F4CD}'}</Text>
          <View style={styles.locationInfo}>
            {locationLoading ? (
              <>
                <Text style={styles.locationTitle}>{t('issues.detectingLocation')}</Text>
                <ActivityIndicator size="small" color={colors.primary} style={{ marginTop: 4 }} />
              </>
            ) : data.latitude ? (
              <>
                <Text style={styles.locationTitle}>{t('issues.locationDetected')}</Text>
                <Text style={styles.locationAddress}>{data.address}</Text>
                <Text style={styles.locationCoords}>
                  {data.latitude?.toFixed(4)}, {data.longitude?.toFixed(4)}
                </Text>
              </>
            ) : (
              <Text style={styles.locationTitle}>{t('issues.locationUnavailable')}</Text>
            )}
          </View>
          {data.latitude && (
            <View style={styles.gpsIndicator}>
              <Text style={styles.gpsText}>GPS</Text>
            </View>
          )}
        </View>
      </Card>

      <Button
        title={t('issues.nextDescribe')}
        onPress={() => setStep(2)}
        fullWidth
        size="lg"
        style={styles.nextButton}
      />
    </View>
  );

  const renderStep2 = () => (
    <View style={styles.stepContent}>
      <Text style={styles.stepTitle}>{t('issues.describeTheIssue')}</Text>
      <Text style={styles.stepSubtitle}>
        {t('issues.describeSubtitle')}
      </Text>

      <Input
        label={t('issues.whatsTheProblem')}
        placeholder={t('issues.descriptionPlaceholder')}
        value={description}
        onChangeText={setDescription}
        multiline
        numberOfLines={5}
        containerStyle={styles.descriptionInput}
      />

      <View style={styles.buttonRow}>
        <Button
          title={t('issues.back')}
          onPress={() => setStep(1)}
          variant="outline"
          size="md"
          style={styles.backButton}
        />
        <Button
          title={t('issues.nextClassify')}
          onPress={() => setStep(3)}
          size="md"
          style={styles.nextButtonFlex}
        />
      </View>
    </View>
  );

  const renderStep3 = () => (
    <View style={styles.stepContent}>
      <Text style={styles.stepTitle}>{t('issues.classifyTheIssue')}</Text>
      <Text style={styles.stepSubtitle}>
        {t('issues.aiSuggests')}{' '}
        <Text style={styles.aiSuggestion}>
          {CATEGORY_CONFIG.find(c => c.key === (data.suggestedCategory || 'other'))?.label || 'Other'}
        </Text>
        {t('issues.tapToChange')}
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
                {cat.label}
              </Text>
              {isSuggested && !data.category && (
                <Text style={styles.aiTag}>AI</Text>
              )}
            </TouchableOpacity>
          );
        })}
      </View>

      <View style={styles.buttonRow}>
        <Button
          title={t('issues.back')}
          onPress={() => setStep(2)}
          variant="outline"
          size="md"
          style={styles.backButton}
        />
        <Button
          title={t('issues.nextReview')}
          onPress={() => {
            if (!data.category && data.suggestedCategory) {
              setData(prev => ({
                ...prev,
                category: prev.suggestedCategory,
                department: DEPARTMENT_MAP[prev.suggestedCategory!],
              }));
            }
            setStep(4);
          }}
          size="md"
          style={styles.nextButtonFlex}
        />
      </View>
    </View>
  );

  const renderStep4 = () => {
    const selectedCategory = data.category || data.suggestedCategory || 'other';
    const categoryConfig = CATEGORY_CONFIG.find(c => c.key === selectedCategory);

    return (
      <View style={styles.stepContent}>
        <Text style={styles.stepTitle}>{t('issues.reviewAndSubmit')}</Text>
        <Text style={styles.stepSubtitle}>
          {t('issues.confirmDetails')}
        </Text>

        <Card style={styles.reviewCard}>
          {data.photoUri ? (
            <Image
              source={{ uri: data.photoUri }}
              style={styles.reviewPhotoImage}
              resizeMode="cover"
            />
          ) : (
            <View style={styles.reviewPhoto}>
              <Text style={styles.reviewPhotoIcon}>{'\u{1F4F8}'}</Text>
              <Text style={styles.reviewPhotoText}>{t('issues.noPhotoAttached')}</Text>
            </View>
          )}

          <View style={styles.reviewDetails}>
            <View style={styles.reviewRow}>
              <Text style={styles.reviewLabel}>{t('issues.category')}</Text>
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
                  {t(`issues.${selectedCategory}`)}
                </Text>
              </View>
            </View>

            <View style={styles.reviewDivider} />

            <View style={styles.reviewRow}>
              <Text style={styles.reviewLabel}>{t('issues.location')}</Text>
              <Text style={styles.reviewValue}>{data.address}</Text>
            </View>

            <View style={styles.reviewDivider} />

            <View style={styles.reviewRow}>
              <Text style={styles.reviewLabel}>{t('issues.autoRoutedTo')}</Text>
              <Text style={[styles.reviewValue, styles.departmentText]}>
                {data.department || DEPARTMENT_MAP[selectedCategory] || t('issues.autoDetermined')}
              </Text>
            </View>

            {description ? (
              <>
                <View style={styles.reviewDivider} />
                <View style={styles.reviewRow}>
                  <Text style={styles.reviewLabel}>{t('issues.description')}</Text>
                  <Text style={styles.reviewValue}>{description}</Text>
                </View>
              </>
            ) : null}
          </View>
        </Card>

        <View style={styles.routingInfo}>
          <Text style={styles.routingIcon}>{'\u2699\uFE0F'}</Text>
          <Text style={styles.routingText}>
            {t('issues.routingInfo')}
          </Text>
        </View>

        <View style={styles.buttonRow}>
          <Button
            title={t('issues.back')}
            onPress={() => setStep(3)}
            variant="outline"
            size="md"
            style={styles.backButton}
          />
          <Button
            title={t('issues.submitReport')}
            onPress={handleSubmit}
            size="lg"
            loading={submitting || createIssue.isPending}
            style={styles.nextButtonFlex}
          />
        </View>
      </View>
    );
  };

  return (
    <View style={styles.container}>
      <StatusBar barStyle="dark-content" backgroundColor={colors.background} />

      <View style={[styles.header, { paddingTop: insets.top + spacing.sm }]}>
        <Text style={styles.headerTitle}>{t('issues.reportIssue')}</Text>
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
        {step === 4 && renderStep4()}
      </ScrollView>

      {/* Success Modal */}
      <Modal visible={showSuccess} transparent animationType="fade">
        <Pressable
          style={successStyles.backdrop}
          onPress={() => {
            setShowSuccess(false);
            setStep(1);
            setData(prev => ({ latitude: prev.latitude, longitude: prev.longitude, address: prev.address }));
            setDescription('');
          }}
        >
          <View style={successStyles.card}>
            {/* Checkmark circle */}
            <View style={successStyles.iconWrap}>
              <Svg viewBox="0 0 24 24" width={32} height={32} fill="none">
                <Circle cx={12} cy={12} r={10} stroke="#10B981" strokeWidth={2} />
                <Path d="M8 12l3 3 5-6" stroke="#10B981" strokeWidth={2.5} strokeLinecap="round" strokeLinejoin="round" />
              </Svg>
            </View>

            <Text style={successStyles.title}>Issue Reported!</Text>
            <Text style={successStyles.subtitle}>
              Your issue has been submitted successfully. Citizens and ward officers can now see it.
            </Text>

            {/* Steps */}
            <View style={successStyles.steps}>
              <View style={successStyles.stepRow}>
                <View style={[successStyles.stepDot, successStyles.stepDotDone]} />
                <Text style={successStyles.stepText}>Reported</Text>
              </View>
              <View style={successStyles.stepLine} />
              <View style={successStyles.stepRow}>
                <View style={successStyles.stepDot} />
                <Text style={successStyles.stepTextMuted}>Assigned</Text>
              </View>
              <View style={successStyles.stepLine} />
              <View style={successStyles.stepRow}>
                <View style={successStyles.stepDot} />
                <Text style={successStyles.stepTextMuted}>Resolved</Text>
              </View>
            </View>

            <TouchableOpacity
              style={successStyles.btn}
              onPress={() => {
                setShowSuccess(false);
                setStep(1);
                setData(prev => ({ latitude: prev.latitude, longitude: prev.longitude, address: prev.address }));
                setDescription('');
              }}
              activeOpacity={0.7}
            >
              <Text style={successStyles.btnText}>Track Progress</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={successStyles.btnSecondary}
              onPress={() => {
                setShowSuccess(false);
                setStep(1);
                setData(prev => ({ latitude: prev.latitude, longitude: prev.longitude, address: prev.address }));
                setDescription('');
              }}
              activeOpacity={0.7}
            >
              <Text style={successStyles.btnSecondaryText}>Report Another</Text>
            </TouchableOpacity>
          </View>
        </Pressable>
      </Modal>
    </View>
  );
};

const successStyles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.4)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 40,
  },
  card: {
    backgroundColor: '#FFFFFF',
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
  iconWrap: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: '#ECFDF5',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
  },
  title: {
    fontSize: 20,
    fontWeight: '800',
    color: '#0B1426',
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 13,
    color: '#6B7280',
    textAlign: 'center',
    lineHeight: 19,
    marginBottom: 20,
  },
  steps: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 24,
  },
  stepRow: {
    alignItems: 'center',
    gap: 4,
  },
  stepDot: {
    width: 12,
    height: 12,
    borderRadius: 6,
    borderWidth: 2,
    borderColor: '#E5E7EB',
    backgroundColor: '#FFFFFF',
  },
  stepDotDone: {
    borderColor: '#10B981',
    backgroundColor: '#10B981',
  },
  stepLine: {
    width: 32,
    height: 2,
    backgroundColor: '#E5E7EB',
    marginHorizontal: 4,
    marginBottom: 16,
  },
  stepText: {
    fontSize: 10,
    fontWeight: '600',
    color: '#10B981',
  },
  stepTextMuted: {
    fontSize: 10,
    fontWeight: '500',
    color: '#9CA3AF',
  },
  btn: {
    backgroundColor: '#FF6B35',
    paddingHorizontal: 32,
    paddingVertical: 12,
    borderRadius: 12,
    width: '100%',
    alignItems: 'center',
    shadowColor: '#FF6B35',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.25,
    shadowRadius: 10,
    elevation: 4,
    marginBottom: 10,
  },
  btnText: {
    fontSize: 15,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  btnSecondary: {
    paddingVertical: 10,
    width: '100%',
    alignItems: 'center',
  },
  btnSecondaryText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#6B7280',
  },
});

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
  },
  stepIndicator: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: spacing.lg,
    paddingBottom: spacing.lg,
  },
  stepItem: {
    alignItems: 'center',
  },
  stepDot: {
    width: 24,
    height: 24,
    borderRadius: 12,
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
    fontSize: 11,
    fontWeight: '600',
    color: colors.textMuted,
  },
  stepNumberActive: {
    color: colors.white,
  },
  stepLabel: {
    fontSize: 10,
    fontWeight: '500',
    marginTop: 3,
  },
  stepLabelActive: {
    color: colors.primary,
  },
  stepLabelInactive: {
    color: colors.textMuted,
  },
  stepLine: {
    flex: 1,
    height: 2,
    marginHorizontal: spacing.xs,
    marginBottom: spacing.lg,
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
  photoButtons: {
    marginBottom: spacing.lg,
  },
  photoOverlay: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: 'rgba(0,0,0,0.4)',
    paddingVertical: spacing.sm,
    alignItems: 'center',
  },
  photoRetake: {
    fontSize: 13,
    color: colors.white,
    fontWeight: '500',
  },
  galleryButton: {
    alignItems: 'center',
    paddingVertical: spacing.md,
    marginTop: spacing.sm,
    borderRadius: borderRadius.lg,
    backgroundColor: colors.white,
    borderWidth: 1,
    borderColor: colors.border,
  },
  galleryButtonText: {
    fontSize: 14,
    fontWeight: '500',
    color: colors.primary,
  },
  reviewPhotoImage: {
    height: 180,
    width: '100%',
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
