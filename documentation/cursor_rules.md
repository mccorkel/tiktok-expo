# Cursor Rules

This document outlines the coding and development rules we follow in this project.

## Current Rules
1. All new features must be documented in features.md
2. Project structure changes must be updated in structure.md
3. New development rules must be added to this file
4. All error handling must include:
   - Proper error logging with descriptive messages
   - User-friendly error messages in the UI
   - Error boundaries where appropriate
5. Amplify Configuration Rules:
   - Always verify amplify_outputs.json is properly generated after sandbox creation
   - Ensure all required dependencies are installed and linked
   - Run `npx expo prebuild` after any major configuration changes
6. Development Environment Reset Process:
   - Stop all running processes (sandbox, metro)
   - Clean build artifacts and node_modules
   - Reinstall dependencies
   - Start sandbox fresh
   - Verify amplify_outputs.json
   - Start Expo with cleared cache
7. Amplify Gen 2 Configuration Requirements:
   - Always include explicit loginWith configuration
   - Verify Amplify dependencies are at compatible versions
   - Use proper configuration structure for Auth.Cognito
8. Configuration Debugging Requirements:
   - Always log configuration objects during development
   - Verify configuration structure matches Amplify Gen 2 requirements
   - Keep configuration logging in development builds only
9. Expo Prebuild Requirements:
   - Run `npx expo prebuild` after:
     - Amplify configuration changes
     - Native dependency updates
     - Major version upgrades
   - Clean iOS and Android builds after prebuild:
     - `rm -rf ios/build android/app/build`
   - Verify amplify_outputs.json exists before prebuild
10. Configuration Validation Requirements:
    - Always verify outputs structure before configuration
    - Log configuration errors with full context
    - Add error boundaries for configuration failures
    - Document expected configuration structure
11. Screen Component Requirements:
    - Each screen should be in its own file under src/screens
    - Use consistent styling patterns across screens
    - Include proper type definitions for props and navigation
    - Handle loading and error states appropriately
12. Navigation Requirements:
    - Always type navigation props properly
    - Define route param lists for type safety
    - Use consistent navigation patterns
    - Handle navigation state and history appropriately
13. Debugging Requirements:
    - Add visual debug elements during development
    - Use consistent console logging patterns
    - Include user and authentication state logging
    - Add visual indicators for layout boundaries
14. Amplify Gen 2 Auth Configuration Structure:
    - Always use nested Cognito configuration
    - Explicitly set loginWith mechanisms
    - Match configuration keys exactly with outputs
    - Include all required auth fields:
      - userPoolId
      - userPoolClientId
      - identityPoolId
      - region
      - loginWith settings
15. Testing and Debugging Process:
    - Start with minimal implementation
    - Add complexity incrementally
    - Test each layer before adding the next
    - Document working configurations
16. Component Layering Process:
    - Verify basic React Native rendering first
    - Add authentication components incrementally
    - Test each authentication feature separately
    - Document working authentication flows
17. Amplify Configuration Simplicity:
    - Always use direct outputs for configuration
    - Configure Amplify with raw outputs object
    - Avoid manual configuration structure
    - Let Amplify Gen 2 handle configuration mapping

## Video Implementation
- Use WebView with Amazon IVS Web SDK for video playback
- Keep native VideoCard as fallback
- Reference: [IVS Web SDK Documentation](https://docs.aws.amazon.com/ivs/latest/userguide/player-web-sdk.html)

### Example Usage
```typescript
import { WebView } from 'react-native-webview';

// Load IVS player in WebView
const htmlContent = `
  <script src="https://player.live-video.net/1.19.0/amazon-ivs-player.min.js"></script>
  <div id="video-player"></div>
  <script>
    const player = IVSPlayer.create();
    player.attachHTMLVideoElement(document.getElementById('video-player'));
    player.load(videoUrl);
  </script>
`;
```

## Audio Implementation
- Use `expo-av` for audio configuration
- Configure audio mode at app startup
- Reference: [Expo AV Documentation](https://docs.expo.dev/versions/latest/sdk/audio-av/)

### Example Usage
```typescript
import { Audio } from 'expo-av';

await Audio.setAudioModeAsync({
  allowsRecordingIOS: false,
  playsInSilentModeIOS: true,
  staysActiveInBackground: false,
  shouldDuckAndroid: false,
});
```

# Amplify Gen 2 Rules & Notes

## Auth Permissions

When granting permissions in auth/resource.ts:

1. Use the `access` property to grant permissions between resources:
```typescript
export const auth = defineAuth({
  // ...other config
  access: (allow) => [
    allow.resource(someFunction).to(['manageUsers'])
  ]
});
```

2. Use `authenticatedRole` to grant AWS service permissions to authenticated users:
```typescript
export const auth = defineAuth({
  // ...other config
  authenticatedRole: {
    statements: [
      {
        effect: 'Allow',
        actions: [
          'service:Action1',
          'service:Action2'
        ],
        resources: ['*']
      }
    ]
  }
});
```

### Common Auth Actions
- manageUsers - Full CRUD access to users
- manageGroupMembership - Add/remove users from groups
- manageGroups - CRUD access to groups
- createUser - Create new users only
- deleteUser - Delete users only
- getUser - Read user info only
- listUsers - List users in pool

Reference: [Auth Resource Access Documentation](https://docs.amplify.aws/react-native/build-a-backend/auth/grant-access-to-auth-resources/)

## Amplify Gen 2 Service Permissions

### IVS/IVS Chat Permissions
To grant IVS permissions, export a permissions object from auth/resource.ts:
```typescript
// In auth/resource.ts
export const auth = defineAuth({
  loginWith: { email: true },
  userAttributes: {
    email: { required: true, mutable: true }
  }
});

// Add service permissions
export const permissions = {
  ivs: {
    allow: true  // Grants necessary IVS/IVS Chat permissions to authenticated users
  }
};
```

This is the preferred way to grant AWS service permissions in Amplify Gen 2, rather than using IAM roles directly.

Reference: [Amplify Gen 2 Auth Resource](https://docs.amplify.aws/gen2/build-a-backend/auth/)

_Last updated: [Current Date]_ 