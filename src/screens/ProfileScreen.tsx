import React from 'react';
import { View, Text, StyleSheet, Button } from 'react-native';
import { useAuthenticator } from '@aws-amplify/ui-react-native';

const ProfileScreen = () => {
  const { signOut } = useAuthenticator();

  return (
    <View style={styles.container}>
      <Text>Profile Screen</Text>
      <Button title="Sign Out" onPress={signOut} />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    gap: 20,
  },
});

export default ProfileScreen; 