import React, { useState, useCallback, useEffect } from 'react';
import { StyleSheet, View, Dimensions, Platform } from 'react-native';
import IVSPlayer, { IVSPlayerRef, PlayerState } from 'amazon-ivs-react-native-player';
import { IconButton, ActivityIndicator, Text } from 'react-native-paper';
import Slider from '@react-native-community/slider';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useIsFocused } from '@react-navigation/native';

const { width } = Dimensions.get('window');

export default function BrowseScreen() {
  const playerRef = React.useRef<IVSPlayerRef>(null);
  const [paused, setPaused] = useState(true);
  const [buffering, setBuffering] = useState(false);
  const [duration, setDuration] = useState<number | null>(null);
  const [position, setPosition] = useState<number>(0);
  const [lockPosition, setLockPosition] = useState(false);
  const [isMuted, setIsMuted] = useState(false);
  const [volume, setVolume] = useState(1);
  const isFocused = useIsFocused();

  // Pause video when screen loses focus
  useEffect(() => {
    if (!isFocused) {
      setPaused(true);
    }
  }, [isFocused]);

  return (
    <View style={styles.container}>
      <View style={styles.playerContainer}>
        {buffering && Platform.OS === 'ios' && (
          <ActivityIndicator animating size="large" style={styles.loader} />
        )}
        
        <IVSPlayer 
          ref={playerRef}
          streamUrl="https://fcc3ddae59ed.us-west-2.playback.live-video.net/api/video/v1/us-west-2.893648527354.channel.DmumNckWFTqz.m3u8"
          style={styles.player}
          autoplay={false}
          paused={paused}
          muted={isMuted}
          onDurationChange={setDuration}
          onRebuffering={() => setBuffering(true)}
          onPlayerStateChange={(state) => {
            if (state === PlayerState.Playing || state === PlayerState.Idle) {
              setBuffering(false);
            }
          }}
          onProgress={(newPosition) => {
            if (!lockPosition) {
              setPosition(newPosition);
            }
          }}
        >
          <SafeAreaView style={styles.controls}>
            <View style={styles.progressContainer}>
              <Text style={styles.timeText}>
                {formatTime(position)} / {formatTime(duration || 0)}
              </Text>
              {duration && (
                <Slider
                  style={styles.slider}
                  minimumValue={0}
                  maximumValue={duration}
                  value={position}
                  onSlidingComplete={(value) => {
                    playerRef.current?.seekTo(value);
                  }}
                  onTouchStart={() => setLockPosition(true)}
                  onTouchEnd={() => setLockPosition(false)}
                />
              )}
            </View>
            
            <View style={styles.buttonContainer}>
              <IconButton
                icon={paused ? 'play' : 'pause'}
                size={40}
                iconColor="white"
                onPress={() => setPaused(!paused)}
                style={styles.playButton}
              />
              <View style={styles.volumeContainer}>
                <IconButton
                  icon={isMuted ? "volume-off" : "volume-high"}
                  size={24}
                  iconColor="white"
                  onPress={() => setIsMuted(!isMuted)}
                />
                <Slider
                  style={styles.volumeSlider}
                  minimumValue={0}
                  maximumValue={1}
                  value={isMuted ? 0 : volume}
                  onValueChange={(value) => {
                    if (value === 0) {
                      setIsMuted(true);
                    } else {
                      setVolume(value);
                      setIsMuted(false);
                    }
                  }}
                />
              </View>
              <IconButton
                icon="picture-in-picture-top-right"
                size={40}
                iconColor="white"
                onPress={() => playerRef.current?.togglePip()}
                style={styles.pipButton}
              />
            </View>
          </SafeAreaView>
        </IVSPlayer>
      </View>
    </View>
  );
}

const formatTime = (seconds: number): string => {
  const minutes = Math.floor(seconds / 60);
  const remainingSeconds = Math.floor(seconds % 60);
  return `${minutes}:${remainingSeconds.toString().padStart(2, '0')}`;
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#000',
    justifyContent: 'center',
  },
  playerContainer: {
    width: width,
    height: width * (9/16),
    backgroundColor: '#000',
    alignSelf: 'center',
  },
  player: {
    flex: 1,
  },
  controls: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    padding: 20,
  },
  progressContainer: {
    marginBottom: 10,
  },
  timeText: {
    color: 'white',
    marginBottom: 5,
  },
  slider: {
    width: '100%',
  },
  buttonContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  playButton: {
    borderWidth: 1,
    borderColor: 'white',
  },
  pipButton: {
    marginLeft: 'auto',
  },
  loader: {
    position: 'absolute',
    zIndex: 1,
    alignSelf: 'center',
    top: '50%',
  },
  volumeContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  volumeSlider: {
    width: 100,
    height: 24,
  },
}); 