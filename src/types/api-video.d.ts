declare module '@api.video/react-native-livestream' {
  import { ViewStyle } from 'react-native';
  
  export interface ApiVideoLiveStreamProps {
    style: ViewStyle;
    camera?: 'front' | 'back';
    video: {
      fps: number;
      resolution: string;
      bitrate: number;
      gopDuration: number;
    };
    audio: {
      sampleRate: number;
      isStereo: boolean;
      bitrate: number;
    };
    isMuted: boolean;
    enablePinchedZoom?: boolean;
    onConnectionSuccess?: () => void;
    onConnectionFailed?: (code: string) => void;
    onDisconnect?: () => void;
  }

  export const ApiVideoLiveStreamView: React.ComponentType<ApiVideoLiveStreamProps>;
} 