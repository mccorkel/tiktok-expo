import React, { useState, useEffect } from 'react';
import { 
  View, 
  Text, 
  StyleSheet, 
  ScrollView, 
  TouchableOpacity, 
  ActivityIndicator,
  TextInput,
  Alert
} from 'react-native';
import { getCurrentUser } from 'aws-amplify/auth';
import { generateClient } from 'aws-amplify/api';
import type { Schema } from '../../amplify/data/resource';
import { IVSService } from '../services/IVSService';
import AuthenticatedLayout from '../layouts/AuthenticatedLayout';

const client = generateClient<Schema>();
const ivsService = new IVSService();

interface StreamKey {
  arn: string;
  value: string;
  channelArn: string;
}

interface Channel {
  arn: string;
  name: string;
  playbackUrl: string;
  ingestEndpoint: string;
}

export default function ChannelTestScreen() {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [channelInfo, setChannelInfo] = useState<Channel | null>(null);
  const [streamKeys, setStreamKeys] = useState<StreamKey[]>([]);
  const [channelName, setChannelName] = useState('');

  const handleCreateChannel = async () => {
    try {
      setIsLoading(true);
      setError(null);

      if (!channelName.trim()) {
        setError('Channel name is required');
        return;
      }

      const user = await getCurrentUser();
      const channel = await ivsService.createChannel(channelName, {
        userId: user.userId,
        createdAt: new Date().toISOString()
      });

      setChannelInfo(channel);
      
      let streamKey;
      try {
        // Try to create a new stream key
        streamKey = await ivsService.createStreamKey(channel.arn);
      } catch (err: any) {
        // If we hit the quota limit, try to fetch existing stream keys
        if (err?.name === 'ServiceQuotaExceededException') {
          // Silently handle quota exception by fetching existing keys
          const existingKeys = await ivsService.listStreamKeys(channel.arn);
          if (existingKeys.length > 0) {
            setStreamKeys(existingKeys);
            Alert.alert(
              'Success',
              'Channel created successfully! Using existing stream key.'
            );
            return;
          }
        }
        // Only log and throw if it's not a quota error or no keys found
        console.error('Error:', err);
        throw err;
      }

      setStreamKeys([streamKey]);
      Alert.alert(
        'Success',
        'Channel and stream key created successfully!'
      );
    } catch (err) {
      setError('Failed to set up channel');
    } finally {
      setIsLoading(false);
    }
  };

  const handleCreateStreamKey = async () => {
    try {
      setIsLoading(true);
      setError(null);

      if (!channelInfo?.arn) {
        setError('No channel exists');
        return;
      }

      let newKey;
      try {
        newKey = await ivsService.createStreamKey(channelInfo.arn);
      } catch (err: any) {
        if (err?.name === 'ServiceQuotaExceededException') {
          setError('Maximum number of stream keys reached. Please delete an existing key first.');
          return;
        }
        // Only log and throw if it's not a quota error
        console.error('Error:', err);
        throw err;
      }

      setStreamKeys(prev => [...prev, newKey]);
      Alert.alert(
        'Success',
        'New stream key created!'
      );
    } catch (err) {
      setError('Failed to create stream key');
    } finally {
      setIsLoading(false);
    }
  };

  const handleDeleteStreamKey = async (streamKeyArn: string) => {
    try {
      setIsLoading(true);
      setError(null);

      await ivsService.deleteStreamKey(streamKeyArn);
      setStreamKeys(prev => prev.filter(key => key.arn !== streamKeyArn));

      Alert.alert(
        'Success',
        'Stream key deleted successfully!'
      );
    } catch (err) {
      console.error('Error deleting stream key:', err);
      setError('Failed to delete stream key');
    } finally {
      setIsLoading(false);
    }
  };

  const handleRefresh = async () => {
    try {
      setIsLoading(true);
      setError(null);

      if (!channelInfo?.arn) {
        setError('No channel exists');
        return;
      }

      const channel = await ivsService.getChannel(channelInfo.arn);
      setChannelInfo(channel);

      const keys = await ivsService.listStreamKeys(channel.arn);
      console.log('Refresh - Stream keys found:', keys); // Debug log
      setStreamKeys(keys);

      if (keys.length === 0) {
        setError('No stream key found. The key might take a moment to be available.');
      }
    } catch (err) {
      console.error('Error refreshing data:', err);
      setError('Failed to refresh data');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <AuthenticatedLayout>
      <ScrollView style={styles.container}>
        <View style={styles.section}>
          <Text style={styles.title}>IVS Channel Testing</Text>
          
          {isLoading && (
            <ActivityIndicator size="large" color="#007AFF" style={styles.loader} />
          )}

          {error && (
            <Text style={styles.error}>{error}</Text>
          )}

          {!channelInfo ? (
            <View style={styles.createSection}>
              <Text style={styles.sectionTitle}>Create New Channel:</Text>
              <Text style={styles.note}>A stream key will be created with the channel</Text>
              <TextInput
                style={styles.input}
                value={channelName}
                onChangeText={setChannelName}
                placeholder="Enter channel name"
                autoCapitalize="none"
                autoCorrect={false}
                editable={!isLoading}
              />
              <TouchableOpacity 
                style={styles.button}
                onPress={handleCreateChannel}
                disabled={isLoading}
              >
                <Text style={styles.buttonText}>Create Channel</Text>
              </TouchableOpacity>
            </View>
          ) : (
            <>
              <View style={styles.infoSection}>
                <Text style={styles.sectionTitle}>Channel Info:</Text>
                <Text>Name: {channelInfo.name}</Text>
                <Text>ARN: {channelInfo.arn}</Text>
                <Text>Playback URL: {channelInfo.playbackUrl}</Text>
                <Text>Ingest Endpoint: {channelInfo.ingestEndpoint}</Text>
              </View>

              <View style={styles.streamKeysSection}>
                <Text style={styles.sectionTitle}>Stream Keys:</Text>
                {streamKeys.map((key) => (
                  <View key={key.arn} style={styles.streamKeyItem}>
                    <Text>Stream Key Value:</Text>
                    <Text>Value: {key.value}</Text>
                    <TouchableOpacity 
                      style={[styles.button, styles.deleteButton]}
                      onPress={() => handleDeleteStreamKey(key.arn)}
                      disabled={isLoading}
                    >
                      <Text style={styles.buttonText}>Delete Key</Text>
                    </TouchableOpacity>
                  </View>
                ))}
              </View>

              <View style={styles.buttonContainer}>
                <TouchableOpacity 
                  style={[styles.button, { backgroundColor: '#34C759' }]}
                  onPress={handleCreateStreamKey}
                  disabled={isLoading}
                >
                  <Text style={styles.buttonText}>Create New Stream Key</Text>
                </TouchableOpacity>

                <TouchableOpacity 
                  style={[styles.button, { backgroundColor: '#8E8E93' }]}
                  onPress={handleRefresh}
                  disabled={isLoading}
                >
                  <Text style={styles.buttonText}>Refresh All</Text>
                </TouchableOpacity>
              </View>
            </>
          )}
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
  section: {
    padding: 20,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 20,
    textAlign: 'center',
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 10,
  },
  createSection: {
    backgroundColor: '#f8f8f8',
    padding: 15,
    borderRadius: 8,
    marginBottom: 20,
  },
  infoSection: {
    backgroundColor: '#f8f8f8',
    padding: 15,
    borderRadius: 8,
    marginBottom: 20,
  },
  streamKeysSection: {
    backgroundColor: '#f8f8f8',
    padding: 15,
    borderRadius: 8,
    marginBottom: 20,
  },
  streamKeyItem: {
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 8,
    padding: 10,
    marginBottom: 10,
  },
  input: {
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 8,
    padding: 15,
    fontSize: 16,
    marginBottom: 10,
    backgroundColor: '#fff',
  },
  buttonContainer: {
    gap: 10,
  },
  button: {
    backgroundColor: '#007AFF',
    padding: 15,
    borderRadius: 8,
    alignItems: 'center',
    marginTop: 10,
  },
  deleteButton: {
    backgroundColor: '#FF3B30',
    marginTop: 5,
  },
  buttonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
  },
  error: {
    color: '#FF3B30',
    marginBottom: 15,
    textAlign: 'center',
  },
  loader: {
    marginVertical: 20,
  },
  note: {
    color: '#666',
    fontSize: 14,
    marginBottom: 10,
    fontStyle: 'italic',
  },
}); 