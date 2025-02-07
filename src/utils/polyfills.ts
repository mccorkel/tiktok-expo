import { Platform } from 'react-native';
import { polyfill as polyfillEncoding } from 'react-native-polyfill-globals/src/encoding';
import { polyfill as polyfillReadableStream } from 'react-native-polyfill-globals/src/readable-stream';
import { polyfill as polyfillFetch } from 'react-native-polyfill-globals/src/fetch';
import { polyfill as polyfillURL } from 'react-native-polyfill-globals/src/url';

export function setupPolyfills() {
  // These are safe for both platforms
  polyfillEncoding();
  polyfillURL();
  
  // Add extra polyfills for Android
  if (Platform.OS === 'android') {
    polyfillReadableStream();
    polyfillFetch();
  }
} 