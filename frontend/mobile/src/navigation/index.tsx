import React, { useEffect, useRef } from 'react';
import { Linking } from 'react-native';
import { NavigationContainer, DefaultTheme, DarkTheme, NavigationContainerRef } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { AuthStack } from './AuthStack';
import { MainTabs } from './MainTabs';
import { IssueDetailScreen } from '../screens/issues/IssueDetailScreen';
import { LeaderProfileScreen } from '../screens/leaders/LeaderProfileScreen';
import { PollsScreen } from '../screens/polls/PollsScreen';
import { PollDetailScreen } from '../screens/polls/PollDetailScreen';
import { PromisesScreen } from '../screens/promises/PromisesScreen';
import { MessagesScreen } from '../screens/messages/MessagesScreen';
import { ChatScreen } from '../screens/messages/ChatScreen';
import { NotificationsScreen } from '../screens/notifications/NotificationsScreen';
import { SearchScreen } from '../screens/search/SearchScreen';
import { CHIScreen } from '../screens/chi/CHIScreen';
import { ProfileScreen } from '../screens/profile/ProfileScreen';
import { IssuesListScreen } from '../screens/issues/IssuesListScreen';
import { VoicesListScreen } from '../screens/voices/VoicesListScreen';
import { VoiceDetailScreen } from '../screens/voices/VoiceDetailScreen';
import { CreateVoiceScreen } from '../screens/voices/CreateVoiceScreen';
import { LanguageScreen } from '../screens/settings/LanguageScreen';
import { NotificationSettingsScreen } from '../screens/settings/NotificationSettingsScreen';
import { PrivacyScreen } from '../screens/settings/PrivacyScreen';
import { HelpSupportScreen } from '../screens/settings/HelpSupportScreen';
import { TermsScreen } from '../screens/settings/TermsScreen';
import { AboutScreen } from '../screens/settings/AboutScreen';
import { ActionsListScreen } from '../screens/actions/ActionsListScreen';
import { ActionDetailScreen } from '../screens/actions/ActionDetailScreen';
import { CreateActionScreen } from '../screens/actions/CreateActionScreen';
import { ActionTimelineScreen } from '../screens/actions/ActionTimelineScreen';
import { PromiseDetailScreen } from '../screens/promises/PromiseDetailScreen';
import { OrganizationsScreen } from '../screens/organizations/OrganizationsScreen';
import { OrgDetailScreen } from '../screens/organizations/OrgDetailScreen';
import { OrgMembersScreen } from '../screens/organizations/OrgMembersScreen';
import { CreateOrgScreen } from '../screens/organizations/CreateOrgScreen';
import { BroadcastsScreen } from '../screens/organizations/BroadcastsScreen';
import { DatamineScreen } from '../screens/datamine/DatamineScreen';
import { HeatmapScreen } from '../screens/datamine/HeatmapScreen';
import { LeaderDashboardScreen } from '../screens/leader-dashboard/LeaderDashboardScreen';
import { ExitPollScreen } from '../screens/polls/ExitPollScreen';
import { BudgetScreen } from '../screens/budgets/BudgetScreen';
import { useAuthStore } from '../stores/authStore';
import { usePushNotifications } from '../hooks/usePushNotifications';
import { colors } from '../theme/colors';
import { useSettingsStore } from '../stores/settingsStore';
import type { RootStackParamList } from './types';

const Stack = createNativeStackNavigator<RootStackParamList>();

// Parse a deep link URL into screen + params
function parseDeepLink(url: string): { screen: string; params: Record<string, string> } | null {
  const match = url.match(/share\/(issue|voice|action)\/([^/?#]+)/);
  if (!match) return null;
  const type = match[1];
  const id = match[2];
  const screenMap: Record<string, { screen: string; paramKey: string }> = {
    issue: { screen: 'IssueDetail', paramKey: 'issueId' },
    voice: { screen: 'VoiceDetail', paramKey: 'voiceId' },
    action: { screen: 'ActionDetail', paramKey: 'actionId' },
  };
  const entry = screenMap[type];
  if (!entry) return null;
  return { screen: entry.screen, params: { [entry.paramKey]: id } };
}

export const RootNavigator: React.FC = () => {
  const { isAuthenticated, isInitialized, initialize, pendingDeepLink, setPendingDeepLink } = useAuthStore();
  const darkMode = useSettingsStore(state => state.darkMode);
  const navigationRef = useRef<NavigationContainerRef<RootStackParamList>>(null);

  // Register push notification token when authenticated
  usePushNotifications();

  useEffect(() => {
    initialize();
  }, [initialize]);

  // Capture deep links when not authenticated
  useEffect(() => {
    if (!isInitialized) return;

    const handleURL = (event: { url: string }) => {
      if (!isAuthenticated) {
        const parsed = parseDeepLink(event.url);
        if (parsed) setPendingDeepLink(parsed);
      }
    };

    // Check initial URL
    Linking.getInitialURL().then((url) => {
      if (url && !isAuthenticated) {
        const parsed = parseDeepLink(url);
        if (parsed) setPendingDeepLink(parsed);
      }
    });

    const sub = Linking.addEventListener('url', handleURL);
    return () => sub.remove();
  }, [isInitialized, isAuthenticated, setPendingDeepLink]);

  // Navigate to pending deep link after authentication
  useEffect(() => {
    if (isAuthenticated && pendingDeepLink && navigationRef.current) {
      // Small delay to let the navigator mount the authenticated screens
      const timer = setTimeout(() => {
        navigationRef.current?.navigate(pendingDeepLink.screen as any, pendingDeepLink.params as any);
        setPendingDeepLink(null);
      }, 500);
      return () => clearTimeout(timer);
    }
  }, [isAuthenticated, pendingDeepLink, setPendingDeepLink]);

  if (!isInitialized) {
    return null;
  }

  const CivitroLightTheme = {
    ...DefaultTheme,
    colors: { ...DefaultTheme.colors, background: '#FFFCF8', card: '#FFFFFF', text: '#111827', border: '#E5E7EB', primary: '#FF6B35' },
  };

  const CivitroDarkTheme = {
    ...DarkTheme,
    colors: { ...DarkTheme.colors, background: '#0F1419', card: '#1A2332', text: '#F1F5F9', border: '#2D3B4E', primary: '#FF6B35' },
  };

  const linking = {
    prefixes: ['civitro://', 'https://civitro.com'],
    config: {
      screens: {
        IssueDetail: 'share/issue/:issueId',
        VoiceDetail: 'share/voice/:voiceId',
        ActionDetail: 'share/action/:actionId',
      },
    },
  };

  return (
    <NavigationContainer ref={navigationRef} theme={darkMode ? CivitroDarkTheme : CivitroLightTheme} linking={linking}>
      <Stack.Navigator
        screenOptions={{
          headerShown: false,
          contentStyle: { backgroundColor: darkMode ? '#0F1419' : colors.background },
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
              name="Chat"
              component={ChatScreen}
              options={{ headerShown: false }}
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
            <Stack.Screen
              name="IssuesList"
              component={IssuesListScreen}
              options={{
                headerShown: true,
                headerTitle: 'All Issues',
                headerTintColor: colors.textPrimary,
                headerStyle: { backgroundColor: colors.background },
              }}
            />
            <Stack.Screen
              name="VoicesList"
              component={VoicesListScreen}
              options={{
                headerShown: true,
                headerTitle: 'Community Voices',
                headerTintColor: colors.textPrimary,
                headerStyle: { backgroundColor: colors.background },
              }}
            />
            <Stack.Screen
              name="VoiceDetail"
              component={VoiceDetailScreen}
              options={{ headerShown: false }}
            />
            <Stack.Screen
              name="CreateVoice"
              component={CreateVoiceScreen}
              options={{ headerShown: false }}
            />
            <Stack.Screen
              name="ActionsList"
              component={ActionsListScreen}
              options={{
                headerShown: true,
                headerTitle: 'Community Actions',
                headerTintColor: colors.textPrimary,
                headerStyle: { backgroundColor: colors.background },
              }}
            />
            <Stack.Screen
              name="ActionDetail"
              component={ActionDetailScreen}
              options={{
                headerShown: true,
                headerTitle: 'Action Details',
                headerTintColor: colors.textPrimary,
                headerStyle: { backgroundColor: colors.background },
              }}
            />
            <Stack.Screen
              name="CreateAction"
              component={CreateActionScreen}
              options={{
                headerShown: true,
                headerTitle: 'New Action',
                headerTintColor: colors.textPrimary,
                headerStyle: { backgroundColor: colors.background },
              }}
            />
            <Stack.Screen
              name="ActionTimeline"
              component={ActionTimelineScreen}
              options={{
                headerShown: true,
                headerTitle: 'Action Timeline',
                headerTintColor: colors.textPrimary,
                headerStyle: { backgroundColor: colors.background },
              }}
            />
            <Stack.Screen
              name="Language"
              component={LanguageScreen}
              options={{ headerShown: false }}
            />
            <Stack.Screen
              name="NotificationSettings"
              component={NotificationSettingsScreen}
              options={{ headerShown: false }}
            />
            <Stack.Screen
              name="Privacy"
              component={PrivacyScreen}
              options={{ headerShown: false }}
            />
            <Stack.Screen
              name="HelpSupport"
              component={HelpSupportScreen}
              options={{ headerShown: false }}
            />
            <Stack.Screen
              name="Terms"
              component={TermsScreen}
              options={{ headerShown: false }}
            />
            <Stack.Screen
              name="About"
              component={AboutScreen}
              options={{ headerShown: false }}
            />
            <Stack.Screen
              name="PromiseDetail"
              component={PromiseDetailScreen}
              options={{ headerShown: true, headerTitle: 'Promise Details', headerTintColor: colors.textPrimary, headerStyle: { backgroundColor: colors.background } }}
            />
            <Stack.Screen
              name="Organizations"
              component={OrganizationsScreen}
              options={{ headerShown: true, headerTitle: 'Organizations', headerTintColor: colors.textPrimary, headerStyle: { backgroundColor: colors.background } }}
            />
            <Stack.Screen
              name="OrgDetail"
              component={OrgDetailScreen}
              options={{ headerShown: true, headerTitle: 'Organization', headerTintColor: colors.textPrimary, headerStyle: { backgroundColor: colors.background } }}
            />
            <Stack.Screen
              name="OrgMembers"
              component={OrgMembersScreen}
              options={{ headerShown: true, headerTitle: 'Members', headerTintColor: colors.textPrimary, headerStyle: { backgroundColor: colors.background } }}
            />
            <Stack.Screen
              name="CreateOrg"
              component={CreateOrgScreen}
              options={{ headerShown: true, headerTitle: 'New Organization', headerTintColor: colors.textPrimary, headerStyle: { backgroundColor: colors.background } }}
            />
            <Stack.Screen
              name="Broadcasts"
              component={BroadcastsScreen}
              options={{ headerShown: true, headerTitle: 'Broadcasts', headerTintColor: colors.textPrimary, headerStyle: { backgroundColor: colors.background } }}
            />
            <Stack.Screen
              name="Datamine"
              component={DatamineScreen}
              options={{ headerShown: true, headerTitle: 'Analytics', headerTintColor: colors.textPrimary, headerStyle: { backgroundColor: colors.background } }}
            />
            <Stack.Screen
              name="Heatmap"
              component={HeatmapScreen}
              options={{ headerShown: true, headerTitle: 'Issue Heatmap', headerTintColor: colors.textPrimary, headerStyle: { backgroundColor: colors.background } }}
            />
            <Stack.Screen
              name="LeaderDashboard"
              component={LeaderDashboardScreen}
              options={{ headerShown: true, headerTitle: 'Leader Dashboard', headerTintColor: colors.textPrimary, headerStyle: { backgroundColor: colors.background } }}
            />
            <Stack.Screen
              name="ExitPoll"
              component={ExitPollScreen}
              options={{ headerShown: true, headerTitle: 'Exit Polls', headerTintColor: colors.textPrimary, headerStyle: { backgroundColor: colors.background } }}
            />
            <Stack.Screen
              name="Budget"
              component={BudgetScreen}
              options={{ headerShown: true, headerTitle: 'Participatory Budget', headerTintColor: colors.textPrimary, headerStyle: { backgroundColor: colors.background } }}
            />
          </>
        )}
      </Stack.Navigator>
    </NavigationContainer>
  );
};
