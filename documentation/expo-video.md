# Expo Video Implementation Guide

## Installation
```bash
npm install expo-video
```

## Basic Usage
```typescript
import { useVideoPlayer, VideoView } from 'expo-video';

const player = useVideoPlayer(videoSource);

<VideoView
  player={player}
  resizeMode="contain"
  isMuted
/>
```

## Key Components

### VideoView Props
- player: VideoPlayer instance
- resizeMode: "contain" | "cover" | "fill"
- isMuted: boolean

### Player Methods
- play()
- pause()
- seekTo(seconds)

## Reference
[Official Expo Video Documentation](https://docs.expo.dev/versions/latest/sdk/video/)