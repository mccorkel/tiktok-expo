import React, { useState } from 'react';
import { StyleSheet, View, Dimensions, Button } from 'react-native';
import IVSPlayer, { IVSPlayerRef } from 'amazon-ivs-react-native-player';

const { width } = Dimensions.get('window');

export default function BrowseScreen() {
  const playerRef = React.useRef<IVSPlayerRef>(null);
  const [isPlaying, setIsPlaying] = useState(false);

  return (
    <View style={styles.container}>
      <View style={styles.playerContainer}>
        <IVSPlayer 
          ref={playerRef}
          streamUrl="https://fcc3ddae59ed.us-west-2.playback.live-video.net/api/video/v1/us-west-2.893648527354.channel.DmumNckWFTqz.m3u8"
          style={styles.player}
          liveLowLatency
          onPlayerStateChange={(state) => {
            console.log('Player State:', state);
            setIsPlaying(state === 'Playing');
          }}
          onError={(err) => console.log('Player Error:', err)}
        />
      </View>

      <View style={styles.controls}>
        <Button 
          title={isPlaying ? "Pause" : "Play"}
          onPress={() => {
            if (isPlaying) {
              playerRef.current?.pause();
            } else {
              playerRef.current?.play();
            }
          }}
        />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#000',
  },
  playerContainer: {
    width: width,
    height: width * (9/16),
    backgroundColor: '#000',
  },
  player: {
    flex: 1,
  },
  controls: {
    padding: 20,
    gap: 10,
  },
}); 