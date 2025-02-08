// Remove the polyfills import and setup
// import { setupPolyfills } from './src/utils/polyfills';
// setupPolyfills();

import './src/utils/stream-polyfill';
import React, { useEffect, useState } from "react";
import { StyleSheet, View, ActivityIndicator } from "react-native";
import { Amplify } from "aws-amplify";
import { withAuthenticator } from "@aws-amplify/ui-react-native";
import { NavigationContainer } from '@react-navigation/native';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { Ionicons } from '@expo/vector-icons';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { ChatProvider, useChat } from './src/providers/ChatProvider';
import { getCurrentUser } from 'aws-amplify/auth';
import { generateClient } from 'aws-amplify/data';
import type { Schema } from './amplify/data/resource';

// Import screens
import HomeScreen from './src/screens/HomeScreen';
import BrowseScreen from './src/screens/BrowseScreen';
import FollowingScreen from './src/screens/FollowingScreen';
import ProfileScreen from './src/screens/ProfileScreen';
import GoLiveScreen from './src/screens/GoLiveScreen';
import TestChatScreen from './src/screens/TestChatScreen';
import DisplayNameScreen from './src/screens/DisplayNameScreen';

import outputs from "./amplify_outputs.json";

Amplify.configure(outputs);

type RootTabParamList = {
  Home: undefined;
  Browse: undefined;
  Following: undefined;
  Profile: undefined;
  GoLive: undefined;
  TestChat: undefined;
};

const Tab = createBottomTabNavigator<RootTabParamList>();

const TAB_COLORS = {
  home: '#007AFF',    // Keep blue for home
  browse: '#34C759',  // Green for browse
  following: '#FF3B30', // Red for following
  profile: '#AF52DE'  // Purple for profile
};

function ChannelSetup() {
  const { getUserChatRoom } = useChat();

  useEffect(() => {
    setupUserChannel();
  }, []);

  const setupUserChannel = async () => {
    try {
      const user = await getCurrentUser();
      await getUserChatRoom(
        user.userId,
        user.signInDetails?.loginId || 'Anonymous'
      );
    } catch (error) {
      console.error('Error setting up user channel:', error);
    }
  };

  return null;
}

function App() {
  const [isLoading, setIsLoading] = useState(true);
  const [needsProfile, setNeedsProfile] = useState(false);
  const client = generateClient<Schema>();

  useEffect(() => {
    checkUserProfile();
  }, []);

  const checkUserProfile = async () => {
    try {
      const user = await getCurrentUser();
      const { data: profiles } = await client.models.Profile.list({
        filter: {
          userId: { eq: user.userId }
        }
      });

      setNeedsProfile(profiles.length === 0);
      setIsLoading(false);
    } catch (err) {
      console.error('Error checking user profile:', err);
      setIsLoading(false);
    }
  };

  if (isLoading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#007AFF" />
      </View>
    );
  }

  if (needsProfile) {
    return <DisplayNameScreen onComplete={() => setNeedsProfile(false)} />;
  }

  return (
    <ChatProvider>
      <ChannelSetup />
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
              tabBarIcon: ({ color, size }) => (
                <Ionicons name="compass-outline" size={size} color={color} />
              ),
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
          <Tab.Screen 
            name="GoLive" 
            component={GoLiveScreen}
            options={{
              tabBarIcon: ({ color }) => (
                <MaterialCommunityIcons name="record-circle-outline" size={24} color={color} />
              ),
              tabBarLabel: 'Go Live',
            }}
          />
          <Tab.Screen 
            name="TestChat" 
            component={TestChatScreen}
            options={{
              tabBarIcon: ({ color, size }) => (
                <Ionicons name="chatbubbles-outline" size={size} color={color} />
              ),
            }}
          />
        </Tab.Navigator>
      </NavigationContainer>
    </ChatProvider>
  );
}

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
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#fff',
  },
});

export default withAuthenticator(App);