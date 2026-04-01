import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  Alert,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  ActivityIndicator,
  ActionSheetIOS,
} from 'react-native';
import Svg, { Path, Circle } from 'react-native-svg';
import * as ImagePicker from 'expo-image-picker';
import { useNavigation } from '@react-navigation/native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Avatar } from '../../components/ui/Avatar';
import { colors } from '../../theme/colors';
import { spacing, borderRadius } from '../../theme/spacing';
import { useAuthStore } from '../../stores/authStore';
import { api, mediaUrl } from '../../lib/api';

export const EditProfileScreen: React.FC = () => {
  const navigation = useNavigation();
  const user = useAuthStore(state => state.user);
  const updateUser = useAuthStore(state => state.updateUser);

  const [name, setName] = useState(user?.name || '');
  const [email, setEmail] = useState(user?.email || '');
  const [avatarUri, setAvatarUri] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [uploadingAvatar, setUploadingAvatar] = useState(false);

  const hasChanges = name !== (user?.name || '') || email !== (user?.email || '');
  const displayAvatar = avatarUri || mediaUrl(user?.avatarUrl);

  const pickImage = async (source: 'camera' | 'library') => {
    const opts: ImagePicker.ImagePickerOptions = {
      mediaTypes: 'images',
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.8,
    };

    let result: ImagePicker.ImagePickerResult;
    if (source === 'camera') {
      const perm = await ImagePicker.requestCameraPermissionsAsync();
      if (!perm.granted) { Alert.alert('Permission needed', 'Camera access is required.'); return; }
      result = await ImagePicker.launchCameraAsync(opts);
    } else {
      result = await ImagePicker.launchImageLibraryAsync(opts);
    }

    if (result.canceled || !result.assets?.[0]) return;

    const asset = result.assets[0];
    setAvatarUri(asset.uri);
    setUploadingAvatar(true);

    try {
      const form = new FormData();
      form.append('avatar', {
        uri: asset.uri,
        type: asset.mimeType || 'image/jpeg',
        name: asset.fileName || 'avatar.jpg',
      } as any);

      const res = await api.upload<{ avatar_url: string }>('/api/v1/auth/avatar', form);

      await updateUser({ avatarUrl: res.avatar_url });
    } catch (e: any) {
      Alert.alert('Upload failed', e?.message || 'Could not upload photo.');
      setAvatarUri(null);
    } finally {
      setUploadingAvatar(false);
    }
  };

  const handleAvatarPress = () => {
    if (Platform.OS === 'ios') {
      ActionSheetIOS.showActionSheetWithOptions(
        { options: ['Cancel', 'Take Photo', 'Choose from Library'], cancelButtonIndex: 0 },
        (index) => {
          if (index === 1) pickImage('camera');
          else if (index === 2) pickImage('library');
        },
      );
    } else {
      Alert.alert('Change Photo', '', [
        { text: 'Take Photo', onPress: () => pickImage('camera') },
        { text: 'Choose from Library', onPress: () => pickImage('library') },
        { text: 'Cancel', style: 'cancel' },
      ]);
    }
  };

  const handleSave = async () => {
    if (!name.trim() || name.trim().length < 2) {
      Alert.alert('Invalid Name', 'Name must be at least 2 characters.');
      return;
    }

    setSaving(true);
    try {
      const body: Record<string, string> = {};
      if (name !== user?.name) body.name = name.trim();
      if (email !== (user?.email || '')) body.email = email.trim();

      const data = await api.put<{ name: string; email: string }>('/api/v1/auth/profile', body);

      await updateUser({
        name: data.name ?? name.trim(),
        email: data.email ?? email.trim(),
      });

      navigation.goBack();
    } catch (e: any) {
      Alert.alert('Error', e?.message || 'Could not update profile.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
          <Svg width={24} height={24} viewBox="0 0 24 24" fill="none">
            <Path d="M19 12H5M12 19l-7-7 7-7" stroke={colors.textPrimary} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" />
          </Svg>
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Edit Profile</Text>
        <TouchableOpacity
          onPress={handleSave}
          disabled={!hasChanges || saving}
          style={[styles.saveBtn, (!hasChanges || saving) && styles.saveBtnDisabled]}
        >
          {saving ? (
            <ActivityIndicator size="small" color="#FFF" />
          ) : (
            <Text style={[styles.saveBtnText, (!hasChanges || saving) && styles.saveBtnTextDisabled]}>Save</Text>
          )}
        </TouchableOpacity>
      </View>

      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        style={styles.flex}
      >
        <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
          {/* Avatar */}
          <View style={styles.avatarSection}>
            <TouchableOpacity onPress={handleAvatarPress} activeOpacity={0.7}>
              <View>
                <Avatar
                  name={name || 'User'}
                  imageUrl={displayAvatar}
                  size={96}
                  backgroundColor={colors.navy}
                />
                {uploadingAvatar && (
                  <View style={styles.avatarLoading}>
                    <ActivityIndicator size="small" color="#FFF" />
                  </View>
                )}
                <View style={styles.cameraIcon}>
                  <Svg width={16} height={16} viewBox="0 0 24 24" fill="none">
                    <Path d="M23 19a2 2 0 01-2 2H3a2 2 0 01-2-2V8a2 2 0 012-2h4l2-3h6l2 3h4a2 2 0 012 2v11z" stroke="#FFF" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" />
                    <Circle cx={12} cy={13} r={4} stroke="#FFF" strokeWidth={2} />
                  </Svg>
                </View>
              </View>
            </TouchableOpacity>
            <Text style={styles.changePhotoText}>Tap to change photo</Text>
          </View>

          {/* Name */}
          <View style={styles.field}>
            <Text style={styles.label}>Name</Text>
            <TextInput
              style={styles.input}
              value={name}
              onChangeText={setName}
              placeholder="Your name"
              placeholderTextColor={colors.textMuted}
              autoCapitalize="words"
              returnKeyType="next"
            />
          </View>

          {/* Email */}
          <View style={styles.field}>
            <Text style={styles.label}>Email</Text>
            <TextInput
              style={styles.input}
              value={email}
              onChangeText={setEmail}
              placeholder="your@email.com (optional)"
              placeholderTextColor={colors.textMuted}
              keyboardType="email-address"
              autoCapitalize="none"
              returnKeyType="done"
            />
          </View>

          {/* Phone (read-only) */}
          <View style={styles.field}>
            <Text style={styles.label}>Phone</Text>
            <View style={[styles.input, styles.inputDisabled]}>
              <Text style={styles.disabledText}>{user?.phone || ''}</Text>
            </View>
            <Text style={styles.hint}>Phone number cannot be changed</Text>
          </View>

          {/* Location (read-only) */}
          {(user?.ward || user?.constituency) && (
            <View style={styles.field}>
              <Text style={styles.label}>Location</Text>
              <View style={[styles.input, styles.inputDisabled]}>
                <Text style={styles.disabledText}>
                  {[user?.ward, user?.constituency].filter(Boolean).join(' | ')}
                </Text>
              </View>
              <Text style={styles.hint}>Location is set automatically via GPS</Text>
            </View>
          )}
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  flex: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.md,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: colors.borderLight,
  },
  backBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: colors.surfaceLight,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: colors.textPrimary,
  },
  saveBtn: {
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 10,
    backgroundColor: '#FF6B35',
    minWidth: 70,
    alignItems: 'center',
  },
  saveBtnDisabled: {
    backgroundColor: '#E5E7EB',
  },
  saveBtnText: {
    fontSize: 15,
    fontWeight: '600',
    color: '#FFF',
  },
  saveBtnTextDisabled: {
    color: '#9CA3AF',
  },
  content: {
    padding: spacing.lg,
  },
  avatarSection: {
    alignItems: 'center',
    paddingVertical: spacing.xl,
  },
  avatarLoading: {
    ...StyleSheet.absoluteFillObject,
    borderRadius: 48,
    backgroundColor: 'rgba(0,0,0,0.4)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  cameraIcon: {
    position: 'absolute',
    bottom: 0,
    right: 0,
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#FF6B35',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: '#FFF',
  },
  changePhotoText: {
    fontSize: 13,
    color: '#FF6B35',
    fontWeight: '500',
    marginTop: 8,
  },
  field: {
    marginBottom: spacing.lg,
  },
  label: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.textPrimary,
    marginBottom: 8,
  },
  input: {
    backgroundColor: '#FFF',
    borderWidth: 1.5,
    borderColor: colors.borderLight,
    borderRadius: borderRadius.md,
    paddingHorizontal: 16,
    paddingVertical: 14,
    fontSize: 16,
    color: colors.textPrimary,
  },
  inputDisabled: {
    backgroundColor: '#F9FAFB',
    justifyContent: 'center',
  },
  disabledText: {
    fontSize: 16,
    color: colors.textMuted,
  },
  hint: {
    fontSize: 12,
    color: colors.textMuted,
    marginTop: 4,
  },
});
