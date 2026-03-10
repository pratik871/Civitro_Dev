import React, { useEffect } from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { AuthStack } from './AuthStack';
import { MainTabs } from './MainTabs';
import { IssueDetailScreen } from '../screens/issues/IssueDetailScreen';
import { LeaderProfileScreen } from '../screens/leaders/LeaderProfileScreen';
import { PollsScreen } from '../screens/polls/PollsScreen';
import { PollDetailScreen } from '../screens/polls/PollDetailScreen';
import { PromisesScreen } from '../screens/promises/PromisesScreen';
import { MessagesScreen } from '../screens/messages/MessagesScreen';
import { NotificationsScreen } from '../screens/notifications/NotificationsScreen';
import { SearchScreen } from '../screens/search/SearchScreen';
import { CHIScreen } from '../screens/chi/CHIScreen';
import { ProfileScreen } from '../screens/profile/ProfileScreen';
import { useAuthStore } from '../stores/authStore';
import { colors } from '../theme/colors';
import type { RootStackParamList } from './types';

const Stack = createNativeStackNavigator<RootStackParamList>();

export const RootNavigator: React.FC = () => {
  const { isAuthenticated, isInitialized, initialize } = useAuthStore();

  useEffect(() => {
    initialize();
  }, [initialize]);

  if (!isInitialized) {
    return null;
  }

  return (
    <NavigationContainer>
      <Stack.Navigator
        screenOptions={{
          headerShown: false,
          contentStyle: { backgroundColor: colors.background },
          animation: 'slide_from_right',
        }}
      >
        {!isAuthenticated ? (
          <Stack.Screen name="Auth" component={AuthStack} />
        ) : (
          <>
            <Stack.Screen name="Main" component={MainTabs} />
            <Stack.Screen
              name="IssueDetail"
              component={IssueDetailScreen}
              options={{
                headerShown: true,
                headerTitle: 'Issue Details',
                headerTintColor: colors.textPrimary,
                headerStyle: { backgroundColor: colors.background },
              }}
            />
            <Stack.Screen
              name="LeaderProfile"
              component={LeaderProfileScreen}
              options={{
                headerShown: true,
                headerTitle: 'Leader Profile',
                headerTintColor: colors.textPrimary,
                headerStyle: { backgroundColor: colors.background },
              }}
            />
            <Stack.Screen
              name="Polls"
              component={PollsScreen}
              options={{
                headerShown: true,
                headerTitle: 'Polls',
                headerTintColor: colors.textPrimary,
                headerStyle: { backgroundColor: colors.background },
              }}
            />
            <Stack.Screen
              name="PollDetail"
              component={PollDetailScreen}
              options={{
                headerShown: true,
                headerTitle: 'Poll',
                headerTintColor: colors.textPrimary,
                headerStyle: { backgroundColor: colors.background },
              }}
            />
            <Stack.Screen
              name="Promises"
              component={PromisesScreen}
              options={{
                headerShown: true,
                headerTitle: 'Promises Tracker',
                headerTintColor: colors.textPrimary,
                headerStyle: { backgroundColor: colors.background },
              }}
            />
            <Stack.Screen
              name="Messages"
              component={MessagesScreen}
              options={{
                headerShown: true,
                headerTitle: 'Messages',
                headerTintColor: colors.textPrimary,
                headerStyle: { backgroundColor: colors.background },
              }}
            />
            <Stack.Screen
              name="Notifications"
              component={NotificationsScreen}
              options={{
                headerShown: true,
                headerTitle: 'Notifications',
                headerTintColor: colors.textPrimary,
                headerStyle: { backgroundColor: colors.background },
              }}
            />
            <Stack.Screen
              name="Search"
              component={SearchScreen}
              options={{
                headerShown: true,
                headerTitle: 'Search',
                headerTintColor: colors.textPrimary,
                headerStyle: { backgroundColor: colors.background },
              }}
            />
            <Stack.Screen
              name="CHI"
              component={CHIScreen}
              options={{
                headerShown: true,
                headerTitle: 'Constituency Health Index',
                headerTintColor: colors.textPrimary,
                headerStyle: { backgroundColor: colors.background },
              }}
            />
            <Stack.Screen
              name="Profile"
              component={ProfileScreen}
              options={{
                headerShown: true,
                headerTitle: 'My Profile',
                headerTintColor: colors.textPrimary,
                headerStyle: { backgroundColor: colors.background },
              }}
            />
          </>
        )}
      </Stack.Navigator>
    </NavigationContainer>
  );
};
