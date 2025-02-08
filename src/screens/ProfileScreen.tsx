import React, { useEffect, useState, useCallback } from 'react';
import { View, Text, StyleSheet, ScrollView, ActivityIndicator, TouchableOpacity } from 'react-native';
import { getCurrentUser, signOut } from 'aws-amplify/auth';
import { generateClient } from 'aws-amplify/api';
import type { Schema } from '../../amplify/data/resource';
import AuthenticatedLayout from '../layouts/AuthenticatedLayout';
import { IVSService } from '../services/IVSService';

const client = generateClient<Schema>();
const ivsService = new IVSService();

type Profile = Schema['Profile']['type'];

export default function ProfileScreen() {
  const [profile, setProfile] = useState<Profile | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showStreamKey, setShowStreamKey] = useState(false);

  const checkLiveStatus = useCallback(async () => {
    if (!profile?.channelArn) return;

    try {
      const isLive = await ivsService.checkChannelLiveStatus(profile.channelArn);
      console.log('Current live status:', profile.isLive, 'New live status:', isLive);
      
      if (isLive !== profile.isLive) {
        console.log('Updating live status in database...');
        const { data: updatedProfile } = await client.models.Profile.update({
          id: profile.id,
          isLive,
          lastStreamedAt: isLive ? new Date().toISOString() : profile.lastStreamedAt
        });

        console.log('Profile updated:', updatedProfile);
        if (updatedProfile) {
          setProfile(updatedProfile);
        }
      }
    } catch (err) {
      console.error('Error checking live status:', err);
    }
  }, [profile?.channelArn, profile?.isLive, profile?.id]);

  useEffect(() => {
    loadProfile();
  }, []);

  // Set up polling for live status
  useEffect(() => {
    if (!profile?.channelArn) return;

    // Check immediately
    checkLiveStatus();

    // Then check every 10 seconds
    const interval = setInterval(checkLiveStatus, 10000);

    return () => clearInterval(interval);
  }, [profile?.channelArn, checkLiveStatus]);

  const loadProfile = async () => {
    try {
      setIsLoading(true);
      setError(null);

      const user = await getCurrentUser();
      const { data: profiles } = await client.models.Profile.list({
        filter: {
          userId: { eq: user.userId }
        }
      });

      if (profiles.length > 0) {
        setProfile(profiles[0]);
      } else {
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
      <AuthenticatedLayout>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#007AFF" />
        </View>
      </AuthenticatedLayout>
    );
  }

  if (error || !profile) {
    return (
      <AuthenticatedLayout>
        <View style={styles.errorContainer}>
          <Text style={styles.error}>{error || 'No profile data available'}</Text>
        </View>
      </AuthenticatedLayout>
    );
  }

  return (
    <AuthenticatedLayout>
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
            <Text style={styles.value}>{profile.followers}</Text>
          </View>
          <View style={styles.infoItem}>
            <Text style={styles.label}>Following:</Text>
            <Text style={styles.value}>{profile.following}</Text>
          </View>
        </View>

        {/* Streaming Status */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Streaming Status</Text>
          <View style={styles.infoItem}>
            <Text style={styles.label}>Live Status:</Text>
            <Text style={[
              styles.value,
              profile.isLive ? styles.liveStatus : styles.offlineStatus
            ]}>
              {profile.isLive ? 'LIVE' : 'Offline'}
            </Text>
          </View>
          {profile.lastStreamedAt && (
            <View style={styles.infoItem}>
              <Text style={styles.label}>Last Streamed:</Text>
              <Text style={styles.value}>
                {new Date(profile.lastStreamedAt).toLocaleString()}
              </Text>
            </View>
          )}
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
            <Text style={styles.code}>rtmps://{profile.ingestEndpoint}</Text>
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
    </AuthenticatedLayout>
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
  liveStatus: {
    color: '#34C759',
    fontWeight: 'bold',
  },
  offlineStatus: {
    color: '#8E8E93',
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