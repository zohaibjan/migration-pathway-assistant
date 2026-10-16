import React from 'react';
import { StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { NavigationContainer } from '@react-navigation/native';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import type { MainTabParamList, RootStackParamList } from '../types';
import { COLORS } from '../constants';
import { WelcomeScreen } from '../screens/Welcome';
import { AssessmentScreen } from '../screens/Assessment';
import { ResultsScreen } from '../screens/Results';
import { SavedScreen } from '../screens/Saved';
import { GuideScreen } from '../screens/Guide';
import { SettingsScreen } from '../screens/Settings';
import { AssistantScreen } from '../screens/Assistant';
import { AIResultsScreen } from '../screens/AIResults';
import { AuthScreen } from '../screens/Auth';
import { PrPathwayScreen } from '../screens/PrPathway';

const Stack = createNativeStackNavigator<RootStackParamList>();
const Tab = createBottomTabNavigator<MainTabParamList>();

const VISIBLE_TABS: ReadonlyArray<keyof MainTabParamList> = [
  'Home',
  'Assessment',
  'Assistant',
  'Saved',
  'Guide',
  'Settings'
];

const TAB_ICONS: Record<keyof MainTabParamList, [keyof typeof Ionicons.glyphMap, keyof typeof Ionicons.glyphMap]> = {
  Home: ['home', 'home-outline'],
  Assessment: ['compass', 'compass-outline'],
  Assistant: ['sparkles', 'sparkles-outline'],
  Saved: ['folder', 'folder-outline'],
  Guide: ['book', 'book-outline'],
  Settings: ['settings', 'settings-outline'],
  Results: ['document-text', 'document-text-outline'],
  AIResults: ['sparkles', 'sparkles-outline'],
  PrPathway: ['time', 'time-outline']
};

function MainTabs() {
  return (
    <Tab.Navigator
      screenOptions={({ route }) => {
        const isHidden = !VISIBLE_TABS.includes(route.name as keyof MainTabParamList);
        return {
          headerShown: false,
          tabBarActiveTintColor: COLORS.ink900,
          tabBarInactiveTintColor: COLORS.ink300,
          tabBarStyle: styles.tabBar,
          tabBarLabelStyle: styles.tabLabel,
          tabBarItemStyle: isHidden ? styles.hiddenTab : undefined,
          tabBarButton: isHidden ? () => null : undefined,
          tabBarIcon: ({ focused, color, size }) => {
            const pair = TAB_ICONS[route.name as keyof MainTabParamList];
            const name = focused ? pair[0] : pair[1];
            return <Ionicons name={name} size={size ?? 22} color={color} />;
          }
        };
      }}
    >
      <Tab.Screen name="Home" component={WelcomeScreen} />
      <Tab.Screen name="Assessment" component={AssessmentScreen} options={{ tabBarLabel: 'Assess' }} />
      <Tab.Screen name="Assistant" component={AssistantScreen} options={{ tabBarLabel: 'AI' }} />
      <Tab.Screen name="Saved" component={SavedScreen} />
      <Tab.Screen name="Guide" component={GuideScreen} />
      <Tab.Screen name="Settings" component={SettingsScreen} options={{ tabBarLabel: 'Info' }} />
      <Tab.Screen name="Results" component={ResultsScreen} />
      <Tab.Screen name="AIResults" component={AIResultsScreen} />
      <Tab.Screen name="PrPathway" component={PrPathwayScreen} />
    </Tab.Navigator>
  );
}

export default function AppNavigator() {
  return (
    <NavigationContainer>
      <Stack.Navigator
        screenOptions={{
          headerShown: false,
          animation: 'slide_from_right',
          contentStyle: { backgroundColor: COLORS.cream50 }
        }}
      >
        <Stack.Screen name="Main" component={MainTabs} />
        <Stack.Screen
          name="Auth"
          component={AuthScreen}
          options={{ presentation: 'modal', animation: 'slide_from_bottom' }}
        />
      </Stack.Navigator>
    </NavigationContainer>
  );
}

const styles = StyleSheet.create({
  tabBar: {
    height: 86,
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: 'rgba(17,20,15,0.08)',
    backgroundColor: COLORS.cream50,
    position: 'absolute'
  },
  tabLabel: {
    fontSize: 11,
    fontWeight: '600',
    marginTop: 2,
    letterSpacing: 0.2
  },
  hiddenTab: {
    display: 'none'
  }
});
