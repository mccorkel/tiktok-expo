import React from "react";
import { StyleSheet } from "react-native";
import { Amplify } from "aws-amplify";
import { withAuthenticator } from "@aws-amplify/ui-react-native";
import { NavigationContainer } from '@react-navigation/native';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { Ionicons } from '@expo/vector-icons';
import outputs from "./amplify_outputs.json";

// Screens
import HomeScreen from './src/screens/HomeScreen';
import BrowseScreen from './src/screens/BrowseScreen';
import FollowingScreen from './src/screens/FollowingScreen';
import ProfileScreen from './src/screens/ProfileScreen';

Amplify.configure(outputs);

type RootTabParamList = {
  Home: undefined;
  Browse: undefined;
  Following: undefined;
  Profile: { signOut: () => void };
};

const Tab = createBottomTabNavigator<RootTabParamList>();

type AppProps = {
  signOut: () => void;
};

const TAB_COLORS = {
  home: '#007AFF',    // Keep blue for home
  browse: '#34C759',  // Green for browse
  following: '#FF3B30', // Red for following
  profile: '#AF52DE'  // Purple for profile
};

const App = ({ signOut }: AppProps) => {
  return (
    <NavigationContainer>
      <Tab.Navigator
        screenOptions={{
          headerShown: false,
          tabBarStyle: styles.tabBar,
          tabBarActiveTintColor: '#007AFF',
          tabBarInactiveTintColor: '#999999',
        }}
      >
        <Tab.Screen 
          name="Home" 
          component={HomeScreen}
          options={{
            tabBarIcon: ({ focused, size }) => (
              <Ionicons 
                name="home" 
                color={focused ? TAB_COLORS.home : '#999999'} 
                size={size} 
              />
            ),
            tabBarActiveTintColor: TAB_COLORS.home,
          }}
        />
        <Tab.Screen 
          name="Browse" 
          component={BrowseScreen}
          options={{
            tabBarIcon: ({ focused, size }) => (
              <Ionicons 
                name="compass" 
                color={focused ? TAB_COLORS.browse : '#999999'} 
                size={size} 
              />
            ),
            tabBarActiveTintColor: TAB_COLORS.browse,
          }}
        />
        <Tab.Screen 
          name="Following" 
          component={FollowingScreen}
          options={{
            tabBarIcon: ({ focused, size }) => (
              <Ionicons 
                name="heart" 
                color={focused ? TAB_COLORS.following : '#999999'} 
                size={size} 
              />
            ),
            tabBarActiveTintColor: TAB_COLORS.following,
          }}
        />
        <Tab.Screen 
          name="Profile" 
          component={ProfileScreen}
          initialParams={{ signOut }}
          options={{
            tabBarIcon: ({ focused, size }) => (
              <Ionicons 
                name="person" 
                color={focused ? TAB_COLORS.profile : '#999999'} 
                size={size} 
              />
            ),
            tabBarActiveTintColor: TAB_COLORS.profile,
          }}
        />
      </Tab.Navigator>
    </NavigationContainer>
  );
};

const styles = StyleSheet.create({
  tabBar: {
    backgroundColor: '#fff',
    borderTopWidth: 1,
    borderTopColor: '#eee',
    elevation: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    height: 60,
    paddingBottom: 8,
  },
});

export default withAuthenticator(App);