import React, { useEffect, useState } from 'react';
import { View, TouchableOpacity, Text, StyleSheet, Platform } from 'react-native';
import { useNavigation, NavigationProp } from '@react-navigation/native';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import Ionicons from 'react-native-vector-icons/Ionicons';
import { generateClient } from 'aws-amplify/api';
import { getCurrentUser } from 'aws-amplify/auth';
import type { Schema } from '../../amplify/data/resource';
import HomeScreen from '../../screens/HomeScreen';
import BrowseScreen from '../../screens/BrowseScreen';
import FollowingScreen from '../../screens/FollowingScreen';
import ProfileScreen from '../../screens/ProfileScreen';
import ModerationScreen from '../../screens/ModerationScreen';

const client = generateClient<Schema>();

type RootStackParamList = {
  Home: undefined;
  Browse: undefined;
  Following: undefined;
  Profile: undefined;
  Moderation: undefined;
};

type NavigationProps = NavigationProp<RootStackParamList>;

const Tab = createBottomTabNavigator();

const BottomNavBar = () => {
  const navigation = useNavigation<NavigationProps>();
  const [isModerator, setIsModerator] = useState(false);

  useEffect(() => {
    checkModeratorStatus();
  }, []);

  const checkModeratorStatus = async () => {
    try {
      const user = await getCurrentUser();
      const { data: profiles } = await client.models.Profile.list({
        filter: {
          userId: { eq: user.userId }
        }
      });

      if (profiles.length > 0) {
        setIsModerator(profiles[0].isModerator || false);
      }
    } catch (err) {
      console.error('Error checking moderator status:', err);
    }
  };

  const navItems = [
    { name: 'Home', route: 'Home' },
    { name: 'Browse', route: 'Browse' },
    { name: 'Following', route: 'Following' },
    { name: 'Profile', route: 'Profile' },
    { name: 'Moderation', route: 'Moderation' },
  ] as const;

  return (
    <Tab.Navigator
      screenOptions={({ route }) => ({
        tabBarIcon: ({ focused, color, size }) => {
          let iconName: string = 'help-outline'; // Default icon

          if (route.name === 'Home') {
            iconName = focused ? 'home' : 'home-outline';
          } else if (route.name === 'Browse') {
            iconName = focused ? 'compass' : 'compass-outline';
          } else if (route.name === 'Following') {
            iconName = focused ? 'heart' : 'heart-outline';
          } else if (route.name === 'Profile') {
            iconName = focused ? 'person' : 'person-outline';
          } else if (route.name === 'Moderation') {
            iconName = focused ? 'shield-checkmark' : 'shield-checkmark-outline';
          }

          return <Ionicons name={iconName} size={size} color={color} />;
        },
      })}
    >
      <Tab.Screen name="Home" component={HomeScreen} />
      <Tab.Screen name="Browse" component={BrowseScreen} />
      <Tab.Screen name="Following" component={FollowingScreen} />
      <Tab.Screen name="Profile" component={ProfileScreen} />
      {isModerator && (
        <Tab.Screen 
          name="Moderation" 
          component={ModerationScreen}
          options={{
            title: 'Moderation'
          }}
        />
      )}
    </Tab.Navigator>
  );
};

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    backgroundColor: '#ffffff',
    paddingTop: 10,
    paddingBottom: Platform.OS === 'ios' ? 25 : 10,
    borderTopWidth: 1,
    borderTopColor: '#e0e0e0',
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
  },
  iosExtra: {
    paddingBottom: 35, // Extra padding for iPhone with home indicator
  },
  navItem: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: 8,
  },
  navText: {
    fontSize: 14,
    fontWeight: '500',
    color: '#333',
  },
});

export default BottomNavBar; 