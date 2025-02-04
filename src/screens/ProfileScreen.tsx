import React, { useEffect, useState } from "react";
import { View, Text, StyleSheet, Button } from "react-native";
import { getCurrentUser, fetchUserAttributes, signOut as amplifySignOut } from "aws-amplify/auth";

type Props = {
  route: { params: { signOut: () => void } };
};

const ProfileScreen = ({ route: { params: { signOut: authSignOut } } }: Props) => {
  const [userInfo, setUserInfo] = useState({ email: 'Loading...', id: '' });

  useEffect(() => {
    const getUser = async () => {
      try {
        const currentUser = await getCurrentUser();
        const attributes = await fetchUserAttributes();
        setUserInfo({
          email: attributes.email || 'No email found',
          id: currentUser.username
        });
      } catch (error) {
        console.error('Error getting user:', error);
        setUserInfo({ email: 'Error loading user', id: '' });
      }
    };

    getUser();
  }, []);

  const handleSignOut = async () => {
    try {
      authSignOut();
      await amplifySignOut();
    } catch (error) {
      console.error('Sign out error:', error);
    }
  };

  return (
    <View style={styles.container}>
      <View style={styles.content}>
        <Text style={styles.title}>Profile</Text>
        <Text style={styles.email}>{userInfo.email}</Text>
        <Button 
          title="Sign Out" 
          onPress={handleSignOut}
          color="#FF3B30"
        />
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
  },
  content: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 20,
  },
  email: {
    fontSize: 16,
    marginBottom: 30,
  },
});

export default ProfileScreen; 