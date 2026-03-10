import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { HomeScreen } from '../screens/home/HomeScreen';
import { ReportIssueScreen } from '../screens/report/ReportIssueScreen';
import { LeadersScreen } from '../screens/leaders/LeadersScreen';
import { MapScreen } from '../screens/map/MapScreen';
import { TrendingScreen } from '../screens/trending/TrendingScreen';
import type { MainTabParamList } from './types';
import { colors } from '../theme/colors';
import { spacing } from '../theme/spacing';

const Tab = createBottomTabNavigator<MainTabParamList>();

interface TabIconProps {
  icon: string;
  label: string;
  focused: boolean;
  isReport?: boolean;
}

const TabIcon: React.FC<TabIconProps> = ({ icon, label, focused, isReport }) => {
  if (isReport) {
    return (
      <View style={styles.reportContainer}>
        <View style={styles.reportButton}>
          <Text style={styles.reportIcon}>{icon}</Text>
        </View>
        <Text style={[styles.tabLabel, styles.reportLabel]}>{label}</Text>
      </View>
    );
  }

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
  return (
    <Tab.Navigator
      screenOptions={{
        headerShown: false,
        tabBarStyle: styles.tabBar,
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
            <TabIcon icon={'\u{1F3E0}'} label="Home" focused={focused} />
          ),
        }}
      />
      <Tab.Screen
        name="Report"
        component={ReportIssueScreen}
        options={{
          tabBarIcon: ({ focused }) => (
            <TabIcon
              icon={'\u{1F4F7}'}
              label="Report"
              focused={focused}
              isReport
            />
          ),
        }}
      />
      <Tab.Screen
        name="Leaders"
        component={LeadersScreen}
        options={{
          tabBarIcon: ({ focused }) => (
            <TabIcon icon={'\u{1F465}'} label="Leaders" focused={focused} />
          ),
        }}
      />
      <Tab.Screen
        name="Map"
        component={MapScreen}
        options={{
          tabBarIcon: ({ focused }) => (
            <TabIcon icon={'\u{1F4CD}'} label="Map" focused={focused} />
          ),
        }}
      />
      <Tab.Screen
        name="Trending"
        component={TrendingScreen}
        options={{
          tabBarIcon: ({ focused }) => (
            <TabIcon icon={'\u{1F4C8}'} label="Trending" focused={focused} />
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
    height: 70,
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
    fontSize: 22,
    marginBottom: 2,
  },
  tabLabel: {
    fontSize: 11,
    fontWeight: '500',
  },
  tabLabelActive: {
    fontWeight: '600',
  },
  reportContainer: {
    alignItems: 'center',
    marginTop: -16,
  },
  reportButton: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: colors.primary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 6,
    elevation: 6,
  },
  reportIcon: {
    fontSize: 22,
    color: colors.white,
  },
  reportLabel: {
    marginTop: 4,
    color: colors.primary,
    fontWeight: '600',
  },
});
