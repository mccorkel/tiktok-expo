import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, ScrollView, ActivityIndicator, TouchableOpacity } from 'react-native';
import { getCurrentUser, signOut } from 'aws-amplify/auth';
import { generateClient } from 'aws-amplify/api';
import type { Schema } from '../../amplify/data/resource';
import { useNavigation, useRoute } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import type { RouteProp } from '@react-navigation/native';
import { MainLayout } from '../components/MainLayout';

const client = generateClient<Schema>();

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

type NavigationProp = NativeStackNavigationProp<RootStackParamList>;
type ProfileScreenRouteProp = RouteProp<RootStackParamList, 'Profile'>;

type Profile = Schema['Profile']['type'] & {
  followerCount?: number;
};

export default function ProfileScreen() {
  const [profile, setProfile] = useState<Profile | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showStreamKey, setShowStreamKey] = useState(false);
  const navigation = useNavigation<NavigationProp>();
  const route = useRoute<ProfileScreenRouteProp>();

  useEffect(() => {
    loadProfile();

    // Get current user ID for subscription filtering
    getCurrentUser().then(user => {
      console.log('Setting up follow subscription for user:', user.userId);
      
      // Subscribe to follow changes that affect this user
      const sub = client.models.Follow.observeQuery({
        filter: {
          or: [
            { followerId: { eq: user.userId } },
            { followeeId: { eq: user.userId } }
          ]
        }
      }).subscribe({
        next: ({ items }) => {
          console.log('Follow change detected:', {
            followCount: items.length,
            items: items.map(f => ({ 
              followerId: f.followerId, 
              followeeId: f.followeeId 
            }))
          });
          loadProfile();
        },
        error: (err) => console.error('Follow subscription error:', err)
      });

      return () => {
        console.log('Cleaning up follow subscription');
        sub.unsubscribe();
      };
    });
  }, []);

  const loadProfile = async () => {
    try {
      console.log('Loading profile data...');
      setIsLoading(true);
      setError(null);

      const user = await getCurrentUser();
      const { data: profiles } = await client.models.Profile.list({
        filter: {
          userId: { eq: user.userId }
        }
      });

      if (profiles.length > 0) {
        const profile = profiles[0];
        console.log('Found profile:', profile.id);
        
        // Count followers (where this profile is the followee)
        const { data: followers } = await client.models.Follow.list({
          filter: {
            followeeId: { eq: profile.id }
          }
        });
        console.log('Follower count:', followers.length);

        setProfile({
          ...profile,
          followerCount: followers.length
        });
      } else {
        console.log('No profile found');
        setError('Profile not found');
      }
    } catch (err) {
      console.error('Error loading profile:', err);
      setError('Failed to load profile');
    } finally {
      setIsLoading(false);
    }
  };

  const handleSignOut = async () => {
    try {
      await signOut();
    } catch (error) {
      console.error('Error signing out:', error);
    }
  };

  if (isLoading) {
    return (
      <MainLayout navigation={navigation} route={route}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#007AFF" />
        </View>
      </MainLayout>
    );
  }

  if (error || !profile) {
    return (
      <MainLayout navigation={navigation} route={route}>
        <View style={styles.errorContainer}>
          <Text style={styles.error}>{error || 'No profile data available'}</Text>
        </View>
      </MainLayout>
    );
  }

  return (
    <MainLayout navigation={navigation} route={route}>
      <ScrollView style={styles.container}>
        {/* Basic Profile Info */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Profile Information</Text>
          <View style={styles.infoItem}>
            <Text style={styles.label}>Display Name:</Text>
            <Text style={styles.value}>{profile.displayName}</Text>
          </View>
          <View style={styles.infoItem}>
            <Text style={styles.label}>Bio:</Text>
            <Text style={styles.value}>{profile.bio || 'No bio set'}</Text>
          </View>
          <View style={styles.infoItem}>
            <Text style={styles.label}>Followers:</Text>
            <Text style={styles.value}>{profile.followerCount}</Text>
          </View>
        </View>

        {/* IVS Channel Info */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Channel Information</Text>
          <View style={styles.infoItem}>
            <Text style={styles.label}>Channel ARN:</Text>
            <Text style={styles.value} numberOfLines={2}>{profile.channelArn}</Text>
          </View>
          <View style={styles.infoItem}>
            <Text style={styles.label}>Stream Key ARN:</Text>
            <Text style={styles.value} numberOfLines={2}>{profile.streamKeyArn}</Text>
          </View>
          <View style={styles.infoItem}>
            <Text style={styles.label}>Chat Room ARN:</Text>
            <Text style={styles.value} numberOfLines={2}>{profile.chatRoomArn}</Text>
          </View>
        </View>

        {/* Streaming Endpoints */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Streaming Endpoints</Text>
          <View style={styles.infoItem}>
            <Text style={styles.label}>Ingest Endpoint:</Text>
            <Text style={styles.value} numberOfLines={2}>{profile.ingestEndpoint}</Text>
          </View>
          <View style={styles.infoItem}>
            <Text style={styles.label}>Playback URL:</Text>
            <Text style={styles.value} numberOfLines={2}>{profile.playbackUrl}</Text>
          </View>
          <View style={styles.infoItem}>
            <Text style={styles.label}>Server (paste into OBS "Server" field):</Text>
            <Text style={styles.code}>rtmps://{profile.ingestEndpoint}:443/app</Text>
          </View>
        </View>

        {/* Stream Key */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Stream Key</Text>
          <View style={styles.infoItem}>
            <Text style={styles.label}>Stream Key:</Text>
            <View style={styles.streamKeyContainer}>
              <Text style={styles.code}>
                {showStreamKey ? profile.streamKeyValue : '••••••••••••••••'}
              </Text>
              <TouchableOpacity 
                style={styles.toggleButton}
                onPress={() => setShowStreamKey(!showStreamKey)}
              >
                <Text style={styles.toggleButtonText}>
                  {showStreamKey ? 'Hide' : 'Show'}
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>

        {/* Sign Out Button */}
        <View style={styles.section}>
          <TouchableOpacity 
            style={styles.signOutButton}
            onPress={handleSignOut}
          >
            <Text style={styles.signOutText}>Sign Out</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </MainLayout>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  error: {
    color: '#FF3B30',
    textAlign: 'center',
    fontSize: 16,
  },
  section: {
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    marginBottom: 15,
    color: '#000',
  },
  infoItem: {
    marginBottom: 10,
  },
  label: {
    fontSize: 14,
    color: '#666',
    marginBottom: 4,
  },
  value: {
    fontSize: 16,
    color: '#000',
  },
  streamKeyContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 10,
  },
  toggleButton: {
    marginLeft: 10,
    backgroundColor: '#007AFF',
    padding: 8,
    borderRadius: 4,
  },
  toggleButtonText: {
    color: 'white',
    fontSize: 14,
  },
  signOutButton: {
    backgroundColor: '#FF3B30',
    padding: 15,
    borderRadius: 8,
    alignItems: 'center',
  },
  signOutText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
  },
  code: {
    fontFamily: 'monospace',
    backgroundColor: '#f0f0f0',
    padding: 8,
    borderRadius: 4,
    marginBottom: 10,
  },
}); 