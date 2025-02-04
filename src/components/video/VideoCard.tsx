import React, { useRef, useEffect } from 'react';
import { View, Text, StyleSheet, Dimensions } from 'react-native';
import { Video, AVPlaybackStatus } from 'expo-av';
import { VideoMetadata } from '../../../public/assets/sample_videos/metadata';

interface VideoCardProps {
  video: VideoMetadata;
  isVisible?: boolean;
}

const { width, height } = Dimensions.get('window');
const VIDEO_WIDTH = width - 20; // Full width minus padding

const videoSources = {
  'sample1.mp4': require('../../../public/assets/sample_videos/sample1.mp4'),
  'sample2.mp4': require('../../../public/assets/sample_videos/sample2.mp4'),
  'sample3.mp4': require('../../../public/assets/sample_videos/sample3.mp4'),
} as const;

const VideoCard: React.FC<VideoCardProps> = ({ video, isVisible = false }) => {
  const videoRef = useRef<Video>(null);

  useEffect(() => {
    if (isVisible && videoRef.current) {
      playPreview();
    } else {
      // Stop video when not visible
      videoRef.current?.stopAsync();
    }
  }, [isVisible]);

  const playPreview = async () => {
    try {
      await videoRef.current?.setPositionAsync(0); // Reset to start
      await videoRef.current?.playAsync();
      
      // Set up loop
      const interval = setInterval(async () => {
        await videoRef.current?.setPositionAsync(0);
        await videoRef.current?.playAsync();
      }, 5000);

      // Cleanup interval when component unmounts or video becomes invisible
      return () => clearInterval(interval);
    } catch (error) {
      console.error('Error playing video:', error);
    }
  };

  return (
    <View style={styles.container}>
      <Video
        ref={videoRef}
        source={videoSources[video.filename as keyof typeof videoSources]}
        style={styles.video}
        resizeMode="cover"
        shouldPlay={false}
        isLooping={false}
        onPlaybackStatusUpdate={(status) => {
          if (!status.isLoaded) return;
          // Stop and reset after 5 seconds if still playing
          if (status.positionMillis >= 5000 && status.isPlaying) {
            videoRef.current?.setPositionAsync(0);
          }
        }}
      />
      <View style={styles.overlay}>
        <Text style={styles.title}>{video.title}</Text>
        <Text style={styles.duration}>{video.duration}s</Text>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    width: width,
    height: height,
    paddingVertical: 10,
    paddingHorizontal: 10,
    backgroundColor: '#000',
    justifyContent: 'center',
    alignItems: 'center',
    paddingTop: -50,
  },
  video: {
    width: VIDEO_WIDTH,
    aspectRatio: 16/9,
    borderRadius: 8,
    marginTop: -50,
  },
  overlay: {
    position: 'absolute',
    bottom: 160,
    left: 10,
    right: 10,
    padding: 16,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    borderBottomLeftRadius: 8,
    borderBottomRightRadius: 8,
  },
  title: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
    marginBottom: 4,
  },
  duration: {
    color: '#fff',
    fontSize: 14,
  },
});

export default VideoCard; 