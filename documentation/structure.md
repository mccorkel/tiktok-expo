# Project Structure

## Tech Stack
- Frontend:
  - React Native
  - Expo
- Backend:
  - AWS Amplify Gen 2
- Authentication:
  - AWS Cognito (via Amplify)

## Dependencies
- "@aws-amplify/ui-react-native": "^2.0.0"
- "@aws-amplify/react-native": "^1.0.0"
- "aws-amplify": "^6.0.0"
- "@react-native-async-storage/async-storage": "1.21.0"
- "@react-native-community/netinfo": "11.1.0"

## Project Organization 

## Native Build Structure
- iOS/
  - Pods/
  - Build/
  - *.xcworkspace
  - *.xcodeproj
- Android/
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

_Last updated: [Current Date]_ 