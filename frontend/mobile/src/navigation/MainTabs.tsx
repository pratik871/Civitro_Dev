import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTranslation } from 'react-i18next';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { HomeScreen } from '../screens/home/HomeScreen';
import { ReportIssueScreen } from '../screens/report/ReportIssueScreen';
import { LeadersScreen } from '../screens/leaders/LeadersScreen';
// Placeholder MapScreen — react-native-maps crashes production builds
// TODO: fix react-native-maps integration, then re-enable
const MapScreenPlaceholder: React.FC = () => (
  <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#F9FAFB' }}>
    <Text style={{ fontSize: 48, marginBottom: 12 }}>{'\u{1F5FA}'}</Text>
    <Text style={{ fontSize: 18, fontWeight: '600', color: '#1A365D' }}>Map View</Text>
    <Text style={{ fontSize: 14, color: '#6B7280', marginTop: 4 }}>Coming soon</Text>
  </View>
);
import { TrendingScreen } from '../screens/trending/TrendingScreen';
import type { MainTabParamList } from './types';
import { colors } from '../theme/colors';
import { spacing } from '../theme/spacing';

const Tab = createBottomTabNavigator<MainTabParamList>();

interface TabIconProps {
  icon: string;
  label: string;
  focused: boolean;
}

const TabIcon: React.FC<TabIconProps> = ({ icon, label, focused }) => {
  return (
    <View style={styles.tabIconContainer}>
      <Text
        style={[
          styles.tabIcon,
          { color: focused ? colors.primary : colors.textMuted },
        ]}
      >
        {icon}
      </Text>
      <Text
        style={[
          styles.tabLabel,
          { color: focused ? colors.primary : colors.textMuted },
          focused && styles.tabLabelActive,
        ]}
      >
        {label}
      </Text>
    </View>
  );
};

export const MainTabs: React.FC = () => {
  const insets = useSafeAreaInsets();
  const { t } = useTranslation();
  return (
    <Tab.Navigator
      screenOptions={{
        headerShown: false,
        tabBarStyle: [styles.tabBar, { paddingBottom: Math.max(insets.bottom, 8), height: 56 + Math.max(insets.bottom, 8) }],
        tabBarShowLabel: false,
        tabBarActiveTintColor: colors.primary,
        tabBarInactiveTintColor: colors.textMuted,
      }}
    >
      <Tab.Screen
        name="Home"
        component={HomeScreen}
        options={{
          tabBarIcon: ({ focused }) => (
            <TabIcon icon={'\u{1F3E0}'} label={t('tabs.home')} focused={focused} />
          ),
        }}
      />
      <Tab.Screen
        name="Report"
        component={ReportIssueScreen}
        options={{
          tabBarIcon: ({ focused }) => (
            <TabIcon icon={'\u{1F4F7}'} label={t('tabs.report')} focused={focused} />
          ),
        }}
      />
      <Tab.Screen
        name="Leaders"
        component={LeadersScreen}
        options={{
          tabBarIcon: ({ focused }) => (
            <TabIcon icon={'\u{1F465}'} label={t('tabs.leaders')} focused={focused} />
          ),
        }}
      />
      <Tab.Screen
        name="Map"
        component={MapScreenPlaceholder}
        options={{
          tabBarIcon: ({ focused }) => (
            <TabIcon icon={'\u{1F4CD}'} label={t('tabs.map')} focused={focused} />
          ),
        }}
      />
      <Tab.Screen
        name="Trending"
        component={TrendingScreen}
        options={{
          tabBarIcon: ({ focused }) => (
            <TabIcon icon={'\u{1F4C8}'} label={t('tabs.trending')} focused={focused} />
          ),
        }}
      />
    </Tab.Navigator>
  );
};

const styles = StyleSheet.create({
  tabBar: {
    backgroundColor: colors.white,
    borderTopWidth: 1,
    borderTopColor: colors.borderLight,
    paddingBottom: 8,
    paddingTop: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -2 },
    shadowOpacity: 0.06,
    shadowRadius: 8,
    elevation: 8,
  },
  tabIconContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    minWidth: 50,
  },
  tabIcon: {
    fontSize: 28,
    marginBottom: 2,
  },
  tabLabel: {
    fontSize: 11,
    fontWeight: '500',
  },
  tabLabelActive: {
    fontWeight: '600',
  },
});
