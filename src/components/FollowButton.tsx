import React, { useState, useEffect } from 'react';
import { 
  TouchableOpacity, 
  Text, 
  StyleSheet, 
  Animated, 
  ActivityIndicator 
} from 'react-native';
import { generateClient } from 'aws-amplify/api';
import { getCurrentUser } from 'aws-amplify/auth';
import type { Schema } from '../../amplify/data/resource';

const client = generateClient<Schema>();

type FollowButtonProps = {
  profileId: string;
  onFollowChange?: (isFollowing: boolean) => void;
};

export default function FollowButton({ profileId, onFollowChange }: FollowButtonProps) {
  const [isFollowing, setIsFollowing] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const scaleAnim = new Animated.Value(1);

  useEffect(() => {
    checkFollowStatus();
  }, [profileId]);

  const checkFollowStatus = async () => {
    try {
      const user = await getCurrentUser();
      const { data: follows } = await client.models.Follow.list({
        filter: {
          followerId: { eq: user.userId },
          followeeId: { eq: profileId }
        }
      });
      setIsFollowing(follows.length > 0);
    } catch (error) {
      console.error('Error checking follow status:', error);
    }
  };

  const animateButton = () => {
    Animated.sequence([
      Animated.timing(scaleAnim, {
        toValue: 0.95,
        duration: 100,
        useNativeDriver: true,
      }),
      Animated.spring(scaleAnim, {
        toValue: 1,
        friction: 4,
        useNativeDriver: true,
      }),
    ]).start();
  };

  const handlePress = async () => {
    try {
      setIsLoading(true);
      animateButton();
      
      const user = await getCurrentUser();
      
      if (isFollowing) {
        // Unfollow
        const { data: follows } = await client.models.Follow.list({
          filter: {
            followerId: { eq: user.userId },
            followeeId: { eq: profileId }
          }
        });
        
        if (follows.length > 0) {
          await client.models.Follow.delete({ id: follows[0].id });
        }
      } else {
        // Follow
        await client.models.Follow.create({
          followerId: user.userId,
          followeeId: profileId
        });
      }

      setIsFollowing(!isFollowing);
      if (onFollowChange) {
        onFollowChange(!isFollowing);
      }
    } catch (error) {
      console.error('Error toggling follow:', error);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Animated.View style={{ transform: [{ scale: scaleAnim }] }}>
      <TouchableOpacity
        style={[
          styles.button,
          isFollowing ? styles.followingButton : styles.followButton
        ]}
        onPress={handlePress}
        disabled={isLoading}
      >
        {isLoading ? (
          <ActivityIndicator color="#fff" size="small" />
        ) : (
          <Text style={styles.buttonText}>
            {isFollowing ? 'Following' : 'Follow'}
          </Text>
        )}
      </TouchableOpacity>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  button: {
    paddingHorizontal: 20,
    paddingVertical: 8,
    borderRadius: 20,
    minWidth: 100,
    alignItems: 'center',
    justifyContent: 'center',
  },
  followButton: {
    backgroundColor: '#007AFF',
  },
  followingButton: {
    backgroundColor: '#34C759',
  },
  buttonText: {
    color: '#fff',
    fontWeight: 'bold',
    fontSize: 14,
  },
}); 