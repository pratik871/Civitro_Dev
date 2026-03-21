import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTranslation } from 'react-i18next';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import Svg, { Path, Circle, Rect, Line, Polyline } from 'react-native-svg';
import { HomeScreen } from '../screens/home/HomeScreen';
import { ReportIssueScreen } from '../screens/report/ReportIssueScreen';
import { LeadersScreen } from '../screens/leaders/LeadersScreen';
import { MapScreen } from '../screens/map/MapScreen';
import { TrendingScreen } from '../screens/trending/TrendingScreen';
import type { MainTabParamList } from './types';
import { colors } from '../theme/colors';
import { spacing } from '../theme/spacing';

const Tab = createBottomTabNavigator<MainTabParamList>();

const ICON_SIZE = 24;
const ACTIVE_COLOR = '#FF6B35';
const INACTIVE_COLOR = '#6B7280';

// House / Home icon
const HomeIcon: React.FC<{ color: string }> = ({ color }) => (
  <Svg width={ICON_SIZE} height={ICON_SIZE} viewBox="0 0 24 24" fill="none">
    <Path
      d="M3 10.5L12 3l9 7.5V20a1 1 0 01-1 1h-5v-6H9v6H4a1 1 0 01-1-1V10.5z"
      stroke={color}
      strokeWidth={2}
      strokeLinecap="round"
      strokeLinejoin="round"
    />
  </Svg>
);

// Camera with crosshair / Report icon
const ReportIcon: React.FC<{ color: string }> = ({ color }) => (
  <Svg width={ICON_SIZE} height={ICON_SIZE} viewBox="0 0 24 24" fill="none">
    <Path
      d="M23 19a2 2 0 01-2 2H3a2 2 0 01-2-2V8a2 2 0 012-2h4l2-3h6l2 3h4a2 2 0 012 2v11z"
      stroke={color}
      strokeWidth={2}
      strokeLinecap="round"
      strokeLinejoin="round"
    />
    <Circle cx="12" cy="13" r="4" stroke={color} strokeWidth={2} />
    <Line x1="12" y1="9" x2="12" y2="7" stroke={color} strokeWidth={1.5} strokeLinecap="round" />
    <Line x1="12" y1="19" x2="12" y2="17" stroke={color} strokeWidth={1.5} strokeLinecap="round" />
    <Line x1="8" y1="13" x2="6" y2="13" stroke={color} strokeWidth={1.5} strokeLinecap="round" />
    <Line x1="18" y1="13" x2="16" y2="13" stroke={color} strokeWidth={1.5} strokeLinecap="round" />
  </Svg>
);

// People / Leaders icon
const LeadersIcon: React.FC<{ color: string }> = ({ color }) => (
  <Svg width={ICON_SIZE} height={ICON_SIZE} viewBox="0 0 24 24" fill="none">
    <Path
      d="M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2"
      stroke={color}
      strokeWidth={2}
      strokeLinecap="round"
      strokeLinejoin="round"
    />
    <Circle cx="9" cy="7" r="4" stroke={color} strokeWidth={2} />
    <Path
      d="M23 21v-2a4 4 0 00-3-3.87"
      stroke={color}
      strokeWidth={2}
      strokeLinecap="round"
      strokeLinejoin="round"
    />
    <Path
      d="M16 3.13a4 4 0 010 7.75"
      stroke={color}
      strokeWidth={2}
      strokeLinecap="round"
      strokeLinejoin="round"
    />
  </Svg>
);

// Map pin / Location icon
const MapIcon: React.FC<{ color: string }> = ({ color }) => (
  <Svg width={ICON_SIZE} height={ICON_SIZE} viewBox="0 0 24 24" fill="none">
    <Path
      d="M21 10c0 7-9 13-9 13S3 17 3 10a9 9 0 0118 0z"
      stroke={color}
      strokeWidth={2}
      strokeLinecap="round"
      strokeLinejoin="round"
    />
    <Circle cx="12" cy="10" r="3" stroke={color} strokeWidth={2} />
  </Svg>
);

// Trending up / Chart icon
const TrendingIcon: React.FC<{ color: string }> = ({ color }) => (
  <Svg width={ICON_SIZE} height={ICON_SIZE} viewBox="0 0 24 24" fill="none">
    <Polyline
      points="23 6 13.5 15.5 8.5 10.5 1 18"
      stroke={color}
      strokeWidth={2}
      strokeLinecap="round"
      strokeLinejoin="round"
    />
    <Polyline
      points="17 6 23 6 23 12"
      stroke={color}
      strokeWidth={2}
      strokeLinecap="round"
      strokeLinejoin="round"
    />
  </Svg>
);

interface TabIconProps {
  icon: React.ReactNode;
  label: string;
  focused: boolean;
}

const TabIcon: React.FC<TabIconProps> = ({ icon, label, focused }) => {
  return (
    <View style={styles.tabIconContainer}>
      {icon}
      <Text
        style={[
          styles.tabLabel,
          { color: focused ? ACTIVE_COLOR : INACTIVE_COLOR },
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
        tabBarActiveTintColor: ACTIVE_COLOR,
        tabBarInactiveTintColor: INACTIVE_COLOR,
      }}
    >
      <Tab.Screen
        name="Home"
        component={HomeScreen}
        options={{
          tabBarIcon: ({ focused }) => (
            <TabIcon
              icon={<HomeIcon color={focused ? ACTIVE_COLOR : INACTIVE_COLOR} />}
              label={t('tabs.home')}
              focused={focused}
            />
          ),
        }}
      />
      <Tab.Screen
        name="Report"
        component={ReportIssueScreen}
        options={{
          tabBarIcon: ({ focused }) => (
            <TabIcon
              icon={<ReportIcon color={focused ? ACTIVE_COLOR : INACTIVE_COLOR} />}
              label={t('tabs.report')}
              focused={focused}
            />
          ),
        }}
      />
      <Tab.Screen
        name="Leaders"
        component={LeadersScreen}
        options={{
          tabBarIcon: ({ focused }) => (
            <TabIcon
              icon={<LeadersIcon color={focused ? ACTIVE_COLOR : INACTIVE_COLOR} />}
              label={t('tabs.leaders')}
              focused={focused}
            />
          ),
        }}
      />
      <Tab.Screen
        name="Map"
        component={MapScreen}
        options={{
          tabBarIcon: ({ focused }) => (
            <TabIcon
              icon={<MapIcon color={focused ? ACTIVE_COLOR : INACTIVE_COLOR} />}
              label={t('tabs.map')}
              focused={focused}
            />
          ),
        }}
      />
      <Tab.Screen
        name="Trending"
        component={TrendingScreen}
        options={{
          tabBarIcon: ({ focused }) => (
            <TabIcon
              icon={<TrendingIcon color={focused ? ACTIVE_COLOR : INACTIVE_COLOR} />}
              label={t('tabs.trending')}
              focused={focused}
            />
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
  tabLabel: {
    fontSize: 11,
    fontWeight: '500',
    marginTop: 2,
  },
  tabLabelActive: {
    fontWeight: '600',
  },
});
