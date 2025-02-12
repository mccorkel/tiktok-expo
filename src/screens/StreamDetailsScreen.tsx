import React, { useEffect, useState, useRef, useCallback } from 'react';
import { 
  View, 
  Text, 
  StyleSheet, 
  Dimensions, 
  Platform,
  ScrollView,
  ActivityIndicator,
  KeyboardAvoidingView,
  SafeAreaView,
  TouchableOpacity,
  AppState,
  AppStateStatus,
  ViewStyle
} from 'react-native';
import Slider from '@react-native-community/slider';
import { generateClient } from 'aws-amplify/api';
import type { Schema } from '../../amplify/data/resource';
import { useRoute, useIsFocused, useNavigation } from '@react-navigation/native';
import IVSPlayer, { IVSPlayerRef, Quality } from 'amazon-ivs-react-native-player';
import { IVSService } from '../services/IVSService';
import ChatView from '../components/ChatView';
import { Ionicons } from '@expo/vector-icons';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import * as ScreenOrientation from 'expo-screen-orientation';
import FollowButton from '../components/FollowButton';

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

type Profile = Schema['Profile']['type'] & {
  followerCount?: number;
  followingCount?: number;
};

const client = generateClient<Schema>();
const ivsService = new IVSService();
const { width, height } = Dimensions.get('window');
const PLAYER_HEIGHT = width * (9/16); // Default 16:9 aspect ratio

export default function StreamDetailsScreen() {
  const [stream, setStream] = useState<Profile | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isPaused, setIsPaused] = useState(false);
  const [isMuted, setIsMuted] = useState(false);
  const [volume, setVolume] = useState(1);
  const [duration, setDuration] = useState(0);
  const [currentTime, setCurrentTime] = useState(0);
  const [qualities, setQualities] = useState<Quality[]>([]);
  const [selectedQuality, setSelectedQuality] = useState<Quality | null>(null);
  const [showControls, setShowControls] = useState(false);
  const [isBuffering, setIsBuffering] = useState(false);
  const playerRef = useRef<IVSPlayerRef>(null);
  const route = useRoute();
  const isFocused = useIsFocused();
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const controlsTimeoutRef = useRef<NodeJS.Timeout>();
  const streamId = (route.params as any)?.streamId;
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [connectionError, setConnectionError] = useState<string | null>(null);
  const [retryCount, setRetryCount] = useState(0);
  const MAX_RETRIES = 3;
  const RETRY_DELAY = 3000; // 3 seconds
  const retryTimeoutRef = useRef<NodeJS.Timeout>();
  const [videoOrientation, setVideoOrientation] = useState<'portrait' | 'landscape'>('landscape');
  const [videoWidth, setVideoWidth] = useState(0);
  const [videoHeight, setVideoHeight] = useState(0);

  useEffect(() => {
    navigation.setOptions({
      headerShown: false
    });

    // Hide controls after initial mount
    const initialTimeout = setTimeout(() => {
      setShowControls(false);
    }, 1000);

    // Reset orientation when navigating away
    return () => {
      if (isFullscreen) {
        ScreenOrientation.lockAsync(ScreenOrientation.OrientationLock.PORTRAIT);
      }
      clearTimeout(initialTimeout);
      if (controlsTimeoutRef.current) {
        clearTimeout(controlsTimeoutRef.current);
      }
    };
  }, [navigation, isFullscreen]);

  // Ensure controls are hidden when entering fullscreen
  useEffect(() => {
    if (isFullscreen) {
      setShowControls(false);
    }
  }, [isFullscreen]);

  useEffect(() => {
    if (streamId) {
      loadStreamDetails();
    }
  }, [streamId]);

  useEffect(() => {
    if (!isFocused && playerRef.current) {
      playerRef.current.pause();
      setIsPaused(true);
      // Reset orientation when screen loses focus
      if (isFullscreen) {
        ScreenOrientation.lockAsync(ScreenOrientation.OrientationLock.PORTRAIT);
        setIsFullscreen(false);
      }
    }
  }, [isFocused, isFullscreen]);

  // Add AppState listener for background state
  useEffect(() => {
    const subscription = AppState.addEventListener('change', handleAppStateChange);
    return () => {
      subscription.remove();
    };
  }, []);

  const handleAppStateChange = async (nextAppState: AppStateStatus) => {
    // When app goes to background, pause the player
    if (nextAppState === 'background' && playerRef.current) {
      playerRef.current.pause();
      setIsPaused(true);
    }
  };

  const handleRetry = useCallback(async () => {
    if (retryCount >= MAX_RETRIES) {
      setConnectionError('Unable to connect after multiple attempts. Please try again later.');
      return;
    }

    try {
      setIsLoading(true);
      setConnectionError(null);
      
      // Retry loading stream details
      await loadStreamDetails();
      
      // Reset retry count on success
      setRetryCount(0);
    } catch (err) {
      console.error('Retry attempt failed:', err);
      setRetryCount(prev => prev + 1);
      
      // Schedule another retry after delay
      retryTimeoutRef.current = setTimeout(handleRetry, RETRY_DELAY);
    } finally {
      setIsLoading(false);
    }
  }, [retryCount, streamId]);

  // Clean up retry timeout on unmount
  useEffect(() => {
    return () => {
      if (retryTimeoutRef.current) {
        clearTimeout(retryTimeoutRef.current);
      }
    };
  }, []);

  const loadStreamDetails = async () => {
    try {
      setIsLoading(true);
      setError(null);
      setConnectionError(null);

      const { data: profile } = await client.models.Profile.get({ id: streamId });
      
      if (!profile) {
        setError('Stream not found');
        return;
      }

      // Count followers (where this profile is the followee)
      const { data: followers } = await client.models.Follow.list({
        filter: {
          followeeId: { eq: profile.id }
        }
      });

      // Count following (where this profile is the follower)
      const { data: following } = await client.models.Follow.list({
        filter: {
          followerId: { eq: profile.id }
        }
      });

      let isActuallyLive = false;
      try {
        if (profile.channelArn) {
          isActuallyLive = await ivsService.checkChannelLiveStatus(profile.channelArn);
        }
      } catch (err) {
        console.error('Error checking live status:', err);
        throw new Error('Failed to check stream status');
      }
      
      const updatedProfile = {
        ...profile,
        isLive: isActuallyLive,
        followerCount: followers.length,
        followingCount: following.length
      };

      setStream(updatedProfile);

      if (isActuallyLive && playerRef.current) {
        playerRef.current.play();
        setIsPaused(false);
      }
    } catch (err) {
      console.error('Error loading stream details:', err);
      if (err instanceof Error && err.message.includes('Network')) {
        setConnectionError('Network connection lost. Retrying...');
        // Start retry process
        retryTimeoutRef.current = setTimeout(handleRetry, RETRY_DELAY);
      } else {
        setError('Failed to load stream details');
      }
    } finally {
      setIsLoading(false);
    }
  };

  const togglePlayPause = () => {
    if (playerRef.current) {
      if (isPaused) {
        playerRef.current.play();
      } else {
        playerRef.current.pause();
      }
      setIsPaused(!isPaused);
    }
  };

  const toggleMute = () => {
    if (playerRef.current) {
      setIsMuted(!isMuted);
    }
  };

  const handleVolumeChange = (value: number) => {
    if (playerRef.current) {
      setVolume(value);
    }
  };

  const handleQualityChange = (quality: Quality) => {
    if (playerRef.current) {
      setSelectedQuality(quality);
    }
  };

  const formatTime = (seconds: number) => {
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = Math.floor(seconds % 60);
    return `${minutes}:${remainingSeconds.toString().padStart(2, '0')}`;
  };

  // Clean up control timeout on unmount
  useEffect(() => {
    return () => {
      if (controlsTimeoutRef.current) {
        clearTimeout(controlsTimeoutRef.current);
      }
    };
  }, []);

  const showControlsTemporarily = () => {
    setShowControls(true);
    if (controlsTimeoutRef.current) {
      clearTimeout(controlsTimeoutRef.current);
    }
    controlsTimeoutRef.current = setTimeout(() => {
      setShowControls(false);
    }, 1000); // Changed from 3000 to 1000 for 1 second timeout
  };

  const handleDisclosurePress = () => {
    // Clear the controls timeout when leaving the screen
    if (controlsTimeoutRef.current) {
      clearTimeout(controlsTimeoutRef.current);
    }
    navigation.navigate('Browse');
  };

  const togglePip = () => {
    console.log('[PIP] Toggle PIP button pressed');
    if (playerRef.current) {
      playerRef.current.togglePip();
    }
  };

  const handleFullscreenToggle = async () => {
    try {
      if (isFullscreen) {
        await ScreenOrientation.lockAsync(ScreenOrientation.OrientationLock.PORTRAIT);
        setIsFullscreen(false);
      } else {
        await ScreenOrientation.lockAsync(ScreenOrientation.OrientationLock.LANDSCAPE);
        setIsFullscreen(true);
      }
    } catch (error) {
      console.error('Failed to toggle fullscreen:', error);
    }
  };

  // Add cleanup for screen orientation
  useEffect(() => {
    return () => {
      // Reset orientation when component unmounts
      ScreenOrientation.lockAsync(ScreenOrientation.OrientationLock.PORTRAIT);
    };
  }, []);

  const getVideoLayout = (): ViewStyle => {
    if (videoOrientation === 'portrait') {
      return {
        width: width,
        height: height,
        backgroundColor: '#000'
      };
    }
    return {
      width: width,
      height: PLAYER_HEIGHT,
      backgroundColor: '#000'
    };
  };

  const handleVideoSizeChange = (width: number, height: number) => {
    console.log('Video size changed:', { width, height });
    setVideoWidth(width);
    setVideoHeight(height);
    setVideoOrientation(height > width ? 'portrait' : 'landscape');
  };

  if (isLoading) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#007AFF" />
        </View>
      </SafeAreaView>
    );
  }

  if (error || !stream) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.errorContainer}>
          <Text style={styles.error}>{error || 'Stream not found'}</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={[
      styles.container,
      videoOrientation === 'portrait' && styles.portraitContainer,
      isFullscreen && { backgroundColor: '#000' }
    ]}>
      <View style={[
        styles.container,
        videoOrientation === 'portrait' && styles.portraitContainer,
        isFullscreen && { backgroundColor: '#000' }
      ]}>
        <View style={[
          styles.playerContainer,
          videoOrientation === 'portrait' && styles.portraitPlayerContainer,
          isFullscreen && styles.playerContainerFullscreen
        ]}>
          {stream.isLive && stream.playbackUrl ? (
            <TouchableOpacity 
              activeOpacity={1} 
              onPress={showControlsTemporarily}
              style={[
                styles.playerWrapper,
                isFullscreen && { width: '100%', height: '100%' }
              ]}
            >
              <IVSPlayer
                ref={playerRef}
                streamUrl={stream.playbackUrl}
                style={getVideoLayout()}
                autoplay={true}
                muted={isMuted}
                volume={volume}
                quality={selectedQuality}
                resizeMode={videoOrientation === 'portrait' ? "aspectFill" : "aspectFit"}
                liveLowLatency={true}
                onData={(data) => {
                  const selectedQuality = data.qualities[0];
                  if (selectedQuality) {
                    handleVideoSizeChange(selectedQuality.width, selectedQuality.height);
                  }
                }}
                onDurationChange={(duration: number | null) => {
                  if (duration !== null) {
                    setDuration(duration);
                  }
                }}
                onProgress={setCurrentTime}
                onQualityChange={setSelectedQuality}
                onPlayerStateChange={(state: string) => {
                  console.log('[Player] State changed:', { state });
                  setIsBuffering(state === 'Buffering');
                  
                  // Handle disconnection states
                  if (state === 'Idle' || state === 'Error') {
                    if (state === 'Error') {
                      setConnectionError('Stream connection lost. Attempting to reconnect...');
                      handleRetry();
                    }
                  } else if (state === 'Playing') {
                    setConnectionError(null);
                    setRetryCount(0);
                  }
                }}
                onError={(err) => {
                  console.error('[Player] Error:', err);
                  setConnectionError('Stream connection error. Attempting to reconnect...');
                  handleRetry();
                }}
              />
              {showControls && (
                <>
                  <View style={styles.controlsOverlay} />
                  <View style={styles.controls}>
                    <View style={styles.topControls}>
                      <TouchableOpacity 
                        onPress={handleDisclosurePress}
                        style={styles.disclosureButton}
                      >
                        <Ionicons 
                          name="chevron-down" 
                          size={28} 
                          color="white" 
                        />
                      </TouchableOpacity>
                      
                      <TouchableOpacity 
                        onPress={handleFullscreenToggle}
                        style={[styles.disclosureButton, { marginLeft: 10 }]}
                      >
                        <Ionicons 
                          name={isFullscreen ? "contract" : "expand"} 
                          size={28} 
                          color="white" 
                        />
                      </TouchableOpacity>
                    </View>
                    
                    <View style={styles.centerControls}>
                      {isBuffering ? (
                        <ActivityIndicator size="large" color="white" />
                      ) : (
                        <TouchableOpacity 
                          onPress={togglePlayPause}
                          style={styles.playPauseButton}
                        >
                          <Ionicons 
                            name={isPaused ? 'play' : 'pause'} 
                            size={40} 
                            color="white" 
                          />
                        </TouchableOpacity>
                      )}
                    </View>

                    <View style={styles.bottomControls}>
                      <TouchableOpacity onPress={toggleMute} style={styles.muteButton}>
                        <Ionicons 
                          name={isMuted ? 'volume-mute' : 'volume-high'} 
                          size={24} 
                          color="white" 
                        />
                      </TouchableOpacity>

                      {qualities.length > 0 && (
                        <TouchableOpacity 
                          style={styles.qualityButton}
                          onPress={() => {
                            // Show quality selection menu
                            // You can implement a modal or dropdown here
                          }}
                        >
                          <Text style={styles.qualityText}>
                            {selectedQuality?.name || 'Auto'}
                          </Text>
                        </TouchableOpacity>
                      )}
                    </View>
                  </View>
                </>
              )}
              {(connectionError || error) && (
                <View style={styles.errorOverlay}>
                  <Text style={styles.errorText}>{connectionError || error}</Text>
                  {connectionError && (
                    <TouchableOpacity 
                      style={styles.retryButton}
                      onPress={handleRetry}
                      disabled={isLoading}
                    >
                      <Text style={styles.retryButtonText}>
                        {isLoading ? 'Retrying...' : 'Retry Now'}
                      </Text>
                    </TouchableOpacity>
                  )}
                </View>
              )}
            </TouchableOpacity>
          ) : (
            <View style={styles.offlineContainer}>
              <Text style={styles.offlineText}>Stream is currently offline</Text>
            </View>
          )}
        </View>

        {videoOrientation === 'landscape' && (
          <>
            <View style={styles.detailsContainer}>
              <View style={styles.titleRow}>
                <Text style={styles.streamTitle}>{stream.displayName}</Text>
                <FollowButton 
                  profileId={stream.id} 
                  onFollowChange={async (isFollowing) => {
                    // Update follower count in UI only
                    setStream(prev => prev ? {
                      ...prev,
                      followerCount: (prev.followerCount ?? 0) + (isFollowing ? 1 : -1)
                    } : null);
                  }}
                />
              </View>
              {stream.bio && (
                <Text style={styles.bio}>{stream.bio}</Text>
              )}
              <View style={styles.statsContainer}>
                <Text style={styles.statsText}>
                  {stream.followerCount} followers • {stream.followingCount} following
                </Text>
              </View>
            </View>

            {stream.chatRoomArn && stream.displayName && (
              <View style={[
                styles.chatContainer,
                isFullscreen && styles.chatContainerFullscreen
              ]}>
                <ChatView 
                  channel={{
                    roomArn: stream.chatRoomArn,
                    displayName: stream.displayName
                  }}
                  onBack={() => navigation.goBack()}
                  showHeader={false}
                  isFullscreen={isFullscreen}
                />
              </View>
            )}
          </>
        )}

        {videoOrientation === 'portrait' && stream.chatRoomArn && stream.displayName && (
          <View style={styles.portraitChatOverlay}>
            <View style={styles.portraitHeader}>
              <Text style={styles.portraitTitle} numberOfLines={1}>
                {stream.displayName}
              </Text>
              <FollowButton 
                profileId={stream.id} 
                onFollowChange={async (isFollowing) => {
                  setStream(prev => prev ? {
                    ...prev,
                    followerCount: (prev.followerCount ?? 0) + (isFollowing ? 1 : -1)
                  } : null);
                }}
              />
            </View>
            <View style={styles.portraitChatContainer}>
              <ChatView 
                channel={{
                  roomArn: stream.chatRoomArn,
                  displayName: stream.displayName
                }}
                onBack={() => navigation.goBack()}
                showHeader={false}
                isFullscreen={true}
              />
            </View>
          </View>
        )}
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
  },
  portraitContainer: {
    backgroundColor: '#000',
  },
  portraitPlayerContainer: {
    width: width,
    height: height,
  },
  portraitChatOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'transparent',
    zIndex: 5,
  },
  portraitHeader: {
    position: 'absolute',
    top: Platform.OS === 'ios' ? 44 : 0,
    left: 0,
    right: 0,
    padding: 15,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: 'rgba(0, 0, 0, 0.3)',
  },
  portraitTitle: {
    color: '#fff',
    fontSize: 18,
    fontWeight: 'bold',
    flex: 1,
    marginRight: 10,
  },
  portraitChatContainer: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    height: '45%', // Increased height for messages
    backgroundColor: 'transparent',
    paddingBottom: Platform.OS === 'ios' ? 34 : 0, // Safe area padding
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
  },
  error: {
    color: 'red',
    fontSize: 16,
  },
  chatContainer: {
    flex: 1,
    backgroundColor: 'transparent',
  },
  chatMessage: {
    color: '#fff',
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    padding: 8,
    borderRadius: 8,
    marginBottom: 8,
  },
  errorText: {
    color: '#fff',
    fontSize: 16,
    textAlign: 'center',
    marginBottom: 15,
  },
  retryButton: {
    backgroundColor: '#007AFF',
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 8,
  },
  retryButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
  },
  controlsOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    zIndex: 2,
  },
  playerContainerFullscreen: {
    position: 'absolute',
    top: 0,
    left: 0,
    width: '75%',
    height: '100%',
    backgroundColor: '#000',
    zIndex: 1,
    overflow: 'hidden',
  },
  player: {
    backgroundColor: '#000',
  },
  playerContainer: {
    width: width,
    height: PLAYER_HEIGHT,
    backgroundColor: '#000',
    overflow: 'hidden',
  },
  playerWrapper: {
    flex: 1,
    backgroundColor: '#000',
    position: 'relative',
    justifyContent: 'center',
    alignItems: 'center',
  },
  controls: {
    ...StyleSheet.absoluteFillObject,
    justifyContent: 'space-between',
    zIndex: 3,
  },
  topControls: {
    flexDirection: 'row',
    padding: 10,
    justifyContent: 'flex-start',
  },
  centerControls: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  bottomControls: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 10,
    justifyContent: 'space-between',
  },
  muteButton: {
    marginHorizontal: 15,
  },
  qualityButton: {
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    padding: 5,
    borderRadius: 4,
  },
  qualityText: {
    color: 'white',
    fontSize: 12,
  },
  offlineContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#1a1a1a',
  },
  offlineText: {
    color: '#fff',
    fontSize: 16,
  },
  detailsContainer: {
    padding: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
  },
  titleRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 5,
  },
  streamTitle: {
    fontSize: 18,
    fontWeight: 'bold',
  },
  bio: {
    fontSize: 14,
    color: '#666',
  },
  statsContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  statsText: {
    fontSize: 12,
    color: '#666',
  },
  chatContainerFullscreen: {
    position: 'absolute',
    right: 0,
    top: 0,
    bottom: 0,
    width: '25%',
    backgroundColor: '#000',
    borderWidth: 0,
    zIndex: 4,
  },
  disclosureButton: {
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    borderRadius: 15,
    padding: 5,
    marginLeft: 10,
  },
  playPauseButton: {
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    borderRadius: 30,
    padding: 15,
  },
  errorOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
}); 