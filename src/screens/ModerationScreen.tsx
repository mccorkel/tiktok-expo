import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  ActivityIndicator,
  Alert
} from 'react-native';
import { generateClient } from 'aws-amplify/api';
import { invoke } from 'aws-amplify/functions';
import type { Schema } from '../../amplify/data/resource';
import { MainLayout } from '../components/MainLayout';
import { useNavigation, useRoute } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { RouteProp } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';

const client = generateClient<Schema>();

type Recording = Schema['Recording']['type'];

type RootStackParamList = {
  Home: undefined;
  Browse: undefined;
  Following: undefined;
  Profile: undefined;
  GoLive: undefined;
  Moderation: undefined;
};

type NavigationProp = NativeStackNavigationProp<RootStackParamList, 'Moderation'>;
type ScreenRouteProp = RouteProp<RootStackParamList, 'Moderation'>;

export default function ModerationScreen() {
  const [recordings, setRecordings] = useState<Recording[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [moderatingIds, setModeratingIds] = useState<Set<string>>(new Set());
  const navigation = useNavigation<NavigationProp>();
  const route = useRoute<ScreenRouteProp>();

  useEffect(() => {
    loadRecordings();
  }, []);

  const loadRecordings = async () => {
    try {
      setIsLoading(true);
      setError(null);

      const { data } = await client.models.Recording.list({
        filter: {
          recordingStatus: { eq: 'COMPLETED' }
        }
      });

      // Sort recordings by start time manually
      const sortedData = [...data].sort((a, b) => {
        const dateA = a.startTime ? new Date(a.startTime).getTime() : 0;
        const dateB = b.startTime ? new Date(b.startTime).getTime() : 0;
        return dateB - dateA;
      });

      setRecordings(sortedData);
    } catch (err) {
      console.error('Error loading recordings:', err);
      setError('Failed to load recordings');
    } finally {
      setIsLoading(false);
    }
  };

  const startModeration = async (recording: Recording) => {
    if (!recording.s3BucketName || !recording.s3KeyPrefix) {
      Alert.alert('Error', 'Recording missing required S3 information');
      return;
    }

    try {
      setModeratingIds(prev => new Set(prev).add(recording.id));

      const response = await invoke({
        functionName: 'moderation-handler',
        options: {
          body: {
            bucketName: recording.s3BucketName,
            thumbnailPrefix: `${recording.s3KeyPrefix}/thumbnails`
          }
        }
      });

      console.log('Moderation response:', response);
      Alert.alert('Success', 'Moderation completed successfully');

    } catch (err) {
      console.error('Error running moderation:', err);
      Alert.alert('Error', 'Failed to run moderation');
    } finally {
      setModeratingIds(prev => {
        const next = new Set(prev);
        next.delete(recording.id);
        return next;
      });
    }
  };

  const renderRecordingItem = ({ item: recording }: { item: Recording }) => {
    const isModeratingThis = moderatingIds.has(recording.id);
    const startDate = recording.startTime ? new Date(recording.startTime) : null;
    const endDate = recording.endTime ? new Date(recording.endTime) : null;

    return (
      <View style={styles.recordingItem}>
        <View style={styles.recordingInfo}>
          <Text style={styles.recordingId}>Recording ID: {recording.recordingSessionId}</Text>
          {startDate && (
            <Text style={styles.timestamp}>
              Started: {startDate.toLocaleString()}
            </Text>
          )}
          {endDate && (
            <Text style={styles.timestamp}>
              Ended: {endDate.toLocaleString()}
            </Text>
          )}
          <Text style={styles.duration}>
            Duration: {Math.round((recording.recordingDurationMs || 0) / 1000)}s
          </Text>
        </View>
        
        <TouchableOpacity
          style={[
            styles.moderateButton,
            isModeratingThis && styles.moderateButtonDisabled
          ]}
          onPress={() => startModeration(recording)}
          disabled={isModeratingThis}
        >
          {isModeratingThis ? (
            <ActivityIndicator size="small" color="#fff" />
          ) : (
            <>
              <Ionicons name="shield-checkmark" size={20} color="#fff" />
              <Text style={styles.buttonText}>Moderate</Text>
            </>
          )}
        </TouchableOpacity>
      </View>
    );
  };

  return (
    <MainLayout navigation={navigation} route={route}>
      <View style={styles.container}>
        <View style={styles.header}>
          <Text style={styles.title}>Content Moderation</Text>
          <TouchableOpacity 
            style={styles.refreshButton}
            onPress={loadRecordings}
          >
            <Ionicons name="refresh" size={24} color="#007AFF" />
          </TouchableOpacity>
        </View>

        {isLoading ? (
          <View style={styles.centerContainer}>
            <ActivityIndicator size="large" color="#007AFF" />
          </View>
        ) : error ? (
          <View style={styles.centerContainer}>
            <Text style={styles.error}>{error}</Text>
            <TouchableOpacity 
              style={styles.retryButton}
              onPress={loadRecordings}
            >
              <Text style={styles.retryText}>Retry</Text>
            </TouchableOpacity>
          </View>
        ) : recordings.length === 0 ? (
          <View style={styles.centerContainer}>
            <Text style={styles.noRecordings}>No recordings found</Text>
          </View>
        ) : (
          <FlatList
            data={recordings}
            renderItem={renderRecordingItem}
            keyExtractor={item => item.id}
            contentContainerStyle={styles.list}
            refreshing={isLoading}
            onRefresh={loadRecordings}
          />
        )}
      </View>
    </MainLayout>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
  },
  refreshButton: {
    padding: 8,
  },
  centerContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  list: {
    padding: 16,
  },
  recordingItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    backgroundColor: '#f8f8f8',
    borderRadius: 8,
    marginBottom: 12,
  },
  recordingInfo: {
    flex: 1,
    marginRight: 16,
  },
  recordingId: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 4,
  },
  timestamp: {
    fontSize: 14,
    color: '#666',
    marginBottom: 2,
  },
  duration: {
    fontSize: 14,
    color: '#666',
  },
  moderateButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#007AFF',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 8,
    minWidth: 120,
    justifyContent: 'center',
  },
  moderateButtonDisabled: {
    backgroundColor: '#999',
  },
  buttonText: {
    color: '#fff',
    marginLeft: 8,
    fontWeight: '600',
  },
  error: {
    color: '#FF3B30',
    marginBottom: 16,
  },
  retryButton: {
    backgroundColor: '#007AFF',
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 8,
  },
  retryText: {
    color: '#fff',
    fontWeight: '600',
  },
  noRecordings: {
    color: '#666',
    fontSize: 16,
  },
}); 