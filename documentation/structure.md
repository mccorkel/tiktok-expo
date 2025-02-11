# Project Structure

## Tech Stack
- Frontend:
  - React Native
  - Expo
  - React Navigation
- Backend:
  - AWS Amplify Gen 2
  - Amazon IVS
  - IVS Chat
- Authentication:
  - AWS Cognito (via Amplify)

## Core Dependencies
- "@aws-amplify/ui-react-native": "^2.4.1"
- "@aws-amplify/react-native": "^1.1.6"
- "aws-amplify": "^6.12.2"
- "@api.video/react-native-livestream": "^2.0.2"
- "amazon-ivs-chat-messaging": "^1.1.1"
- "amazon-ivs-react-native-player": "^1.5.0"
- "expo": "~52.0.32"
- "@react-navigation/native": "^7.0.14"
- "@react-navigation/bottom-tabs": "^7.2.0"

## Project Organization 
- src/
  - components/
    - navigation/
      - BottomNavBar.tsx
    - video/
      - VideoCard.tsx
    - chat/
      - ChatRoom.tsx
  - screens/
    - BrowseScreen.tsx
    - FollowingScreen.tsx
    - ProfileScreen.tsx
    - GoLiveScreen.tsx
    - StreamDetailsScreen.tsx
  - providers/
    - ChatProvider.tsx
    - StreamStatusProvider.tsx
  - services/
    - IVSService.ts
  - layouts/
    - AuthenticatedLayout.tsx
    - MainLayout.tsx
  - utils/
    - stream-polyfill.ts

## Amplify Structure
- amplify/
  - auth/
    - resource.ts
  - data/
    - resource.ts
  - backend.ts

## Documentation
- documentation/
  - features.md
  - structure.md
  - cursor_rules.md
  - ivs-recording-events.md
  - cli_commands.md

## Configuration Files
- app.json
- eas.json
- package.json
- tsconfig.json
- amplify_outputs.json

## Native Platforms
- ios/
  - Pods/
  - Build/
  - *.xcworkspace
  - *.xcodeproj
- android/
  - app/
  - gradle/
  - build/

## Build Process
1. Sandbox Configuration
2. Prebuild Generation
3. Native Dependencies
4. Platform-specific builds

## Component Organization
- src/
  - layouts/
    - AuthenticatedLayout.tsx
    - UnauthenticatedLayout.tsx
  - components/
    - navigation/
      - BottomNavBar.tsx
  - screens/
    - HomeScreen.tsx
    - BrowseScreen.tsx
    - FollowingScreen.tsx
    - ProfileScreen.tsx
    - LoginScreen.tsx

## Public Assets
- assets/
  - sample_videos/
    - videos/
    - thumbnails/
    - metadata.ts

_Last updated: March 2024_ 