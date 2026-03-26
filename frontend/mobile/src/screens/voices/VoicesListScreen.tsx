import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  ActivityIndicator,
  TouchableOpacity,
} from 'react-native';
import { useNavigation, useRoute } from '@react-navigation/native';
import { useTranslation } from 'react-i18next';
import { VoiceCard } from '../../components/voices/VoiceCard';
import { colors } from '../../theme/colors';
import { spacing } from '../../theme/spacing';
import { useVoices, useLikeVoice } from '../../hooks/useVoices';
import { useAuthStore } from '../../stores/authStore';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import type { RootStackParamList } from '../../navigation/types';

type NavigationProp = NativeStackNavigationProp<RootStackParamList>;

export const VoicesListScreen: React.FC = () => {
  const { data: voices, isLoading, refetch } = useVoices();
  const navigation = useNavigation<NavigationProp>();
  const route = useRoute();
  const { t } = useTranslation();
  const likeMutation = useLikeVoice();
  const myOnly = (route.params as any)?.myVoices as boolean | undefined;
  const userId = useAuthStore(state => state.user?.id);

  if (isLoading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator color={colors.primary} size="large" />
      </View>
    );
  }

  return (
    <View style={{ flex: 1 }}>
      <FlatList
        data={myOnly ? (voices ?? []).filter(v => v.userId === userId) : (voices ?? [])}
        keyExtractor={(item) => item.id}
        renderItem={({ item }) => (
          <VoiceCard
            voice={item}
            onPress={() => navigation.navigate('VoiceDetail', { voiceId: item.id })}
            onUpvote={() => likeMutation.mutate(item.id, { onSuccess: () => refetch() })}
            onComment={() => navigation.navigate('VoiceDetail', { voiceId: item.id })}
          />
        )}
        contentContainerStyle={styles.list}
        refreshing={false}
        onRefresh={refetch}
        ListEmptyComponent={
          <View style={styles.center}>
            <Text style={styles.emptyText}>{t('voices.noVoices')}</Text>
          </View>
        }
      />
      <TouchableOpacity
        style={styles.fab}
        onPress={() => navigation.navigate('CreateVoice')}
        activeOpacity={0.8}
      >
        <Text style={styles.fabIcon}>{'\u270D'}</Text>
      </TouchableOpacity>
    </View>
  );
};

const styles = StyleSheet.create({
  list: {
    padding: spacing.lg,
    paddingBottom: 40,
  },
  center: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingTop: 60,
  },
  emptyText: {
    fontSize: 15,
    color: colors.textMuted,
  },
  fab: {
    position: 'absolute',
    bottom: 24,
    right: 24,
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 6,
    elevation: 5,
  },
  fabIcon: {
    fontSize: 24,
    color: colors.white,
  },
});
