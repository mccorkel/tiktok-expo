import React from 'react';
import { View, StyleSheet } from 'react-native';
import { Authenticator } from '@aws-amplify/ui-react-native';

const LoginScreen = (props: any) => {
  return (
    <View style={styles.container}>
      <Authenticator.SignIn {...props} />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    padding: 20,
  },
});

export default LoginScreen; 