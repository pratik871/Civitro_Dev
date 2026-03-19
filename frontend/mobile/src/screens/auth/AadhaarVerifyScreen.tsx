import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  StyleSheet,
  StatusBar,
  Alert,
  ScrollView,
  Linking,
} from 'react-native';
import { useRoute, useNavigation, RouteProp } from '@react-navigation/native';
import { Button } from '../../components/ui/Button';
import { colors } from '../../theme/colors';
import { spacing, borderRadius } from '../../theme/spacing';
import type { AuthStackParamList } from '../../navigation/types';

type AadhaarRouteProp = RouteProp<AuthStackParamList, 'AadhaarVerify'>;

export const AadhaarVerifyScreen: React.FC = () => {
  const route = useRoute<AadhaarRouteProp>();
  const navigation = useNavigation();
  const { userId } = route.params;

  const [shareCode, setShareCode] = useState('');
  const [fileName, setFileName] = useState('');
  const [isUploading, setIsUploading] = useState(false);
  const [error, setError] = useState('');
  const [verifiedName, setVerifiedName] = useState('');

  const handlePickFile = async () => {
    try {
      // react-native-document-picker would be used here
      // For now, show instructions
      Alert.alert(
        'Select Aadhaar XML',
        'Please select the password-protected ZIP file downloaded from myaadhaar.uidai.gov.in',
      );
    } catch (err) {
      setError('Failed to pick file');
    }
  };

  const handleVerify = async () => {
    if (shareCode.length !== 4) {
      setError('Share code must be exactly 4 digits');
      return;
    }

    if (!fileName) {
      setError('Please select an Aadhaar XML zip file');
      return;
    }

    setIsUploading(true);
    setError('');

    try {
      // Upload will be wired when react-native-document-picker is installed
      // const formData = new FormData();
      // formData.append('file', fileBlob);
      // formData.append('share_code', shareCode);
      // const response = await authApi.verifyAadhaar(fileBlob, shareCode, token);
      // setVerifiedName(response.name);

      setVerifiedName('Verification pending — file picker integration required');
    } catch (err: any) {
      setError(err?.message || 'Verification failed');
    } finally {
      setIsUploading(false);
    }
  };

  const handleOpenUIDAI = () => {
    Linking.openURL('https://myaadhaar.uidai.gov.in');
  };

  if (verifiedName) {
    return (
      <View style={styles.container}>
        <StatusBar barStyle="dark-content" backgroundColor={colors.background} />
        <View style={styles.successContent}>
          <Text style={styles.successIcon}>&#10003;</Text>
          <Text style={styles.successTitle}>Aadhaar Verified</Text>
          <Text style={styles.successName}>{verifiedName}</Text>
          <Text style={styles.successSubtitle}>
            Your identity has been verified. You now have enhanced trust on the
            platform.
          </Text>
          <Button
            title="Continue to App"
            onPress={() => navigation.getParent()?.reset({
              index: 0,
              routes: [{ name: 'Main' as never }],
            })}
            fullWidth
            size="lg"
            style={styles.continueButton}
          />
        </View>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <StatusBar barStyle="dark-content" backgroundColor={colors.background} />
      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.scrollContent}
        keyboardShouldPersistTaps="handled"
      >
        <Text style={styles.title}>Verify Aadhaar</Text>
        <Text style={styles.subtitle}>
          Upload your offline Aadhaar XML to verify your identity. This is
          optional but unlocks higher trust features.
        </Text>

        <View style={styles.instructionsCard}>
          <Text style={styles.instructionsTitle}>How to get your Aadhaar XML:</Text>
          <Text style={styles.instructionStep}>
            1. Visit myaadhaar.uidai.gov.in
          </Text>
          <Text style={styles.instructionStep}>
            2. Log in with your Aadhaar number
          </Text>
          <Text style={styles.instructionStep}>
            3. Go to "Offline eKYC" section
          </Text>
          <Text style={styles.instructionStep}>
            4. Create a 4-digit share code
          </Text>
          <Text style={styles.instructionStep}>
            5. Download the ZIP file
          </Text>
          <Button
            title="Open myAadhaar Portal"
            onPress={handleOpenUIDAI}
            variant="outline"
            size="sm"
            style={styles.portalButton}
          />
        </View>

        <View style={styles.inputSection}>
          <Text style={styles.label}>Aadhaar XML File</Text>
          <Button
            title={fileName || 'Select ZIP File'}
            onPress={handlePickFile}
            variant="outline"
            fullWidth
            style={styles.fileButton}
          />
        </View>

        <View style={styles.inputSection}>
          <Text style={styles.label}>4-Digit Share Code</Text>
          <TextInput
            style={styles.shareCodeInput}
            value={shareCode}
            onChangeText={text => {
              setShareCode(text.replace(/[^0-9]/g, '').slice(0, 4));
              setError('');
            }}
            keyboardType="number-pad"
            maxLength={4}
            placeholder="Enter share code"
            placeholderTextColor={colors.textMuted}
          />
        </View>

        {error ? <Text style={styles.errorText}>{error}</Text> : null}

        <Button
          title="Verify Aadhaar"
          onPress={handleVerify}
          fullWidth
          size="lg"
          loading={isUploading}
          style={styles.verifyButton}
        />

        <Button
          title="Skip for Now"
          onPress={() => navigation.getParent()?.reset({
            index: 0,
            routes: [{ name: 'Main' as never }],
          })}
          variant="ghost"
          fullWidth
          style={styles.skipButton}
        />
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  scroll: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: spacing['2xl'],
    paddingTop: spacing['3xl'],
    paddingBottom: spacing['3xl'],
  },
  title: {
    fontSize: 26,
    fontWeight: '700',
    color: colors.textPrimary,
    marginBottom: spacing.sm,
  },
  subtitle: {
    fontSize: 15,
    color: colors.textMuted,
    lineHeight: 22,
    marginBottom: spacing.xl,
  },
  instructionsCard: {
    backgroundColor: colors.white,
    borderRadius: borderRadius.lg,
    padding: spacing.lg,
    marginBottom: spacing.xl,
    borderWidth: 1,
    borderColor: colors.border,
  },
  instructionsTitle: {
    fontSize: 15,
    fontWeight: '600',
    color: colors.textPrimary,
    marginBottom: spacing.md,
  },
  instructionStep: {
    fontSize: 14,
    color: colors.textSecondary,
    lineHeight: 22,
    marginBottom: spacing.xs,
  },
  portalButton: {
    marginTop: spacing.md,
  },
  inputSection: {
    marginBottom: spacing.lg,
  },
  label: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.textPrimary,
    marginBottom: spacing.sm,
  },
  fileButton: {
    justifyContent: 'flex-start',
  },
  shareCodeInput: {
    height: 48,
    borderWidth: 1.5,
    borderColor: colors.border,
    borderRadius: borderRadius.md,
    paddingHorizontal: spacing.lg,
    fontSize: 18,
    fontWeight: '600',
    letterSpacing: 8,
    textAlign: 'center',
    color: colors.textPrimary,
    backgroundColor: colors.white,
  },
  errorText: {
    fontSize: 13,
    color: colors.error,
    textAlign: 'center',
    marginBottom: spacing.md,
  },
  verifyButton: {
    marginTop: spacing.sm,
  },
  skipButton: {
    marginTop: spacing.md,
  },
  successContent: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: spacing['2xl'],
  },
  successIcon: {
    fontSize: 64,
    color: colors.success,
    marginBottom: spacing.lg,
  },
  successTitle: {
    fontSize: 24,
    fontWeight: '700',
    color: colors.textPrimary,
    marginBottom: spacing.sm,
  },
  successName: {
    fontSize: 18,
    fontWeight: '600',
    color: colors.primary,
    marginBottom: spacing.lg,
  },
  successSubtitle: {
    fontSize: 15,
    color: colors.textMuted,
    textAlign: 'center',
    lineHeight: 22,
    marginBottom: spacing['3xl'],
  },
  continueButton: {
    marginTop: spacing.lg,
  },
});
