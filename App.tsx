import React, { useEffect, useState } from "react";
import { View, Text, StyleSheet, SafeAreaView, Button, Alert } from "react-native";
import { Amplify } from "aws-amplify";
import { getCurrentUser, fetchUserAttributes, signOut as amplifySignOut } from "aws-amplify/auth";
import { withAuthenticator } from "@aws-amplify/ui-react-native";
import outputs from "./amplify_outputs.json";

Amplify.configure(outputs);

type AppProps = {
  signOut: () => void;
  user: { username?: string };
};

const App = ({ signOut: authSignOut, user }: AppProps) => {
  const [userInfo, setUserInfo] = useState({ email: 'Loading...', id: '' });

  const handleSignOut = async () => {
    try {
      authSignOut();
      await amplifySignOut();
    } catch (error) {
      console.error('Sign out error:', error);
    }
  };

  useEffect(() => {
    const getUser = async () => {
      try {
        const currentUser = await getCurrentUser();
        const attributes = await fetchUserAttributes();
        console.log('User attributes:', attributes);
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

  return (
    <SafeAreaView style={styles.safeArea}>
      <View style={styles.content}>
        <View style={styles.debugBox}>
          <Text style={styles.text}>
            Email: {userInfo.email}
          </Text>
          <Text style={styles.subText}>
            ID: {userInfo.id}
          </Text>
        </View>
        <View style={styles.buttonContainer}>
          <Button 
            title="Sign Out" 
            onPress={handleSignOut}
            color="#FF3B30"
          />
        </View>
      </View>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: '#fff',
  },
  content: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  debugBox: {
    backgroundColor: '#007AFF',
    padding: 20,
    borderRadius: 10,
    width: '80%',
    alignItems: 'center',
  },
  text: {
    fontSize: 20,
    color: '#fff',
    textAlign: 'center',
  },
  buttonContainer: {
    marginTop: 20,
    width: '80%',
  },
  subText: {
    fontSize: 14,
    color: '#fff',
    opacity: 0.8,
    textAlign: 'center',
    marginTop: 8,
  },
});

export default withAuthenticator(App);