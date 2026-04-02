import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StatusBar,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useNavigation, useRoute, RouteProp } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { useTranslation } from 'react-i18next';
import { Button } from '../../components/ui/Button';
import { Input } from '../../components/ui/Input';
import { colors } from '../../theme/colors';
import { spacing } from '../../theme/spacing';
import { useAuth } from '../../hooks/useAuth';
import type { AuthStackParamList } from '../../navigation/types';

type RegisterNavProp = NativeStackNavigationProp<AuthStackParamList, 'Register'>;
type RegisterRouteProp = RouteProp<AuthStackParamList, 'Register'>;

export const RegisterScreen: React.FC = () => {
  const { t } = useTranslation();
  const insets = useSafeAreaInsets();
  const navigation = useNavigation<RegisterNavProp>();
  const route = useRoute<RegisterRouteProp>();
  const { sendOTP, isLoading } = useAuth();

  const [name, setName] = useState('');
  const [phone, setPhone] = useState(route.params?.phone || '');
  const [email, setEmail] = useState('');
  const [ward, setWard] = useState('');
  const [constituency, setConstituency] = useState('');
  const [errors, setErrors] = useState<Record<string, string>>({});

  const validate = (): boolean => {
    const newErrors: Record<string, string> = {};
    if (!name.trim()) newErrors.name = t('auth.nameRequired', 'Name is required');
    if (phone.length !== 10) newErrors.phone = t('auth.invalidPhone', 'Enter a valid 10-digit number');
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleRegister = async () => {
    if (!validate()) return;
    const result = await sendOTP(phone, name.trim());
    if (result.success) {
      navigation.navigate('OTPVerify', { phone, isRegistering: true });
    } else {
      setErrors({ phone: result.error || t('auth.registrationFailed', 'Registration failed') });
    }
  };

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <StatusBar barStyle="dark-content" backgroundColor={colors.background} />
      <ScrollView
        contentContainerStyle={styles.scrollContent}
        keyboardShouldPersistTaps="handled"
      >
        <View style={[styles.header, { paddingTop: insets.top + spacing.sm }]}>
          <Text style={styles.title}>{t('auth.createAccount', 'Create your account')}</Text>
          <Text style={styles.subtitle}>
            {t('auth.joinCivicRevolution', 'Join the civic revolution. Your voice matters.')}
          </Text>
        </View>

        <View style={styles.form}>
          <Input
            label={t('auth.fullName', 'Full Name')}
            placeholder={t('auth.enterFullName', 'Enter your full name')}
            value={name}
            onChangeText={setName}
            autoCapitalize="words"
            error={errors.name}
          />

          <Input
            label={t('auth.mobileNumber', 'Mobile Number')}
            placeholder={t('auth.tenDigitMobile', '10-digit mobile number')}
            value={phone}
            onChangeText={text => setPhone(text.replace(/[^0-9]/g, '').slice(0, 10))}
            keyboardType="phone-pad"
            maxLength={10}
            error={errors.phone}
            leftIcon={<Text style={styles.countryCode}>+91</Text>}
          />

          <Input
            label={t('auth.emailOptional', 'Email (Optional)')}
            placeholder={t('auth.emailPlaceholder', 'your@email.com')}
            value={email}
            onChangeText={setEmail}
            keyboardType="email-address"
            autoCapitalize="none"
          />

          <Input
            label={t('auth.ward', 'Ward')}
            placeholder={t('auth.wardPlaceholder', 'e.g., Ward 15')}
            value={ward}
            onChangeText={setWard}
            error={errors.ward}
            helper={t('auth.wardHelper', 'Your municipal ward for local governance')}
          />

          <Input
            label={t('auth.constituency', 'Constituency')}
            placeholder={t('auth.constituencyPlaceholder', 'e.g., South Delhi')}
            value={constituency}
            onChangeText={setConstituency}
            error={errors.constituency}
            helper={t('auth.constituencyHelper', 'Your parliamentary/assembly constituency')}
          />

          <Button
            title={t('auth.continue', 'Continue')}
            onPress={handleRegister}
            fullWidth
            size="lg"
            loading={isLoading}
            style={styles.submitButton}
          />

          <View style={styles.loginRow}>
            <Text style={styles.loginText}>{t('auth.alreadyHaveAccount', 'Already have an account?')} </Text>
            <Button
              title={t('auth.login', 'Login')}
              onPress={() => navigation.navigate('Login')}
              variant="ghost"
              size="sm"
            />
          </View>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  scrollContent: {
    flexGrow: 1,
    paddingHorizontal: spacing['2xl'],
    paddingTop: spacing.lg,
    paddingBottom: spacing['3xl'],
  },
  header: {
    marginBottom: spacing['2xl'],
  },
  title: {
    fontSize: 26,
    fontWeight: '700',
    color: colors.textPrimary,
    marginBottom: spacing.xs,
  },
  subtitle: {
    fontSize: 15,
    color: colors.textMuted,
    lineHeight: 22,
  },
  form: {
    flex: 1,
  },
  countryCode: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.textSecondary,
  },
  submitButton: {
    marginTop: spacing.sm,
  },
  loginRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: spacing.xl,
  },
  loginText: {
    fontSize: 15,
    color: colors.textSecondary,
  },
});
