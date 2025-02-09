// Remove the polyfills import and setup
// import { setupPolyfills } from './src/utils/polyfills';
// setupPolyfills();

import './src/utils/stream-polyfill';
import React, { useEffect, useState } from "react";
import { StyleSheet, View, ActivityIndicator } from "react-native";
import { Amplify } from "aws-amplify";
import { withAuthenticator } from "@aws-amplify/ui-react-native";
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { ChatProvider, useChat } from './src/providers/ChatProvider';
import { getCurrentUser } from 'aws-amplify/auth';
import { generateClient } from 'aws-amplify/api';
import type { Schema } from './amplify/data/resource';
import { StreamStatusProvider } from './src/providers/StreamStatusProvider';

// Import screens
import HomeScreen from './src/screens/HomeScreen';
import BrowseScreen from './src/screens/BrowseScreen';
import FollowingScreen from './src/screens/FollowingScreen';
import ProfileScreen from './src/screens/ProfileScreen';
import GoLiveScreen from './src/screens/GoLiveScreen';
import TestChatScreen from './src/screens/TestChatScreen';
import DisplayNameScreen from './src/screens/DisplayNameScreen';
import ChannelTestScreen from './src/screens/ChannelTestScreen';
import StreamDetailsScreen from './src/screens/StreamDetailsScreen';

import outputs from "./amplify_outputs.json";

Amplify.configure(outputs);

type RootStackParamList = {
  Home: undefined;
  Browse: undefined;
  Following: undefined;
  Profile: undefined;
  GoLive: undefined;
  TestChat: undefined;
  ChannelTest: undefined;
  StreamDetails: { streamId: string };
};

const Stack = createNativeStackNavigator<RootStackParamList>();

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
      <StreamStatusProvider>
        <ChannelSetup />
        <NavigationContainer>
          <Stack.Navigator initialRouteName="Home">
            <Stack.Screen 
              name="Home"
              component={HomeScreen}
              options={{ 
                headerShown: false,
                contentStyle: { backgroundColor: 'white' }
              }}
            />
            <Stack.Screen 
              name="Browse"
              component={BrowseScreen}
              options={{ 
                headerShown: false,
                contentStyle: { backgroundColor: 'white' }
              }}
            />
            <Stack.Screen 
              name="Following"
              component={FollowingScreen}
              options={{ 
                headerShown: false,
                contentStyle: { backgroundColor: 'white' }
              }}
            />
            <Stack.Screen 
              name="Profile"
              component={ProfileScreen}
              options={{ 
                headerShown: false,
                contentStyle: { backgroundColor: 'white' }
              }}
            />
            <Stack.Screen 
              name="GoLive"
              component={GoLiveScreen}
              options={{ 
                headerShown: false,
                contentStyle: { backgroundColor: 'white' }
              }}
            />
            <Stack.Screen 
              name="TestChat"
              component={TestChatScreen}
              options={{ 
                headerShown: false,
                contentStyle: { backgroundColor: 'white' }
              }}
            />
            <Stack.Screen 
              name="ChannelTest"
              component={ChannelTestScreen}
              options={{ 
                headerShown: false,
                contentStyle: { backgroundColor: 'white' }
              }}
            />
            <Stack.Screen 
              name="StreamDetails"
              component={StreamDetailsScreen}
              options={{ headerShown: false }}
            />
          </Stack.Navigator>
        </NavigationContainer>
      </StreamStatusProvider>
    </ChatProvider>
  );
}

const styles = StyleSheet.create({
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#fff',
  }
});

export default withAuthenticator(App);