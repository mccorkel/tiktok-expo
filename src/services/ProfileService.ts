import { generateClient } from 'aws-amplify/api';
import { getCurrentUser } from 'aws-amplify/auth';
import type { Schema } from '../../amplify/data/resource';
import { IVSService } from './IVSService';

const client = generateClient<Schema>();
const ivsService = new IVSService();

export class ProfileService {
  async createProfile(displayName: string): Promise<Schema['Profile']['type']> {
    try {
      const user = await getCurrentUser();
      
      // Create IVS channel
      const channel = await ivsService.createChannel(displayName, {
        userId: user.userId,
        createdAt: new Date().toISOString()
      });

      // Try to create stream key or get existing one
      let streamKey;
      try {
        streamKey = await ivsService.createStreamKey(channel.arn);
      } catch (err: any) {
        if (err?.name === 'ServiceQuotaExceededException') {
          // If quota exceeded, try to get existing stream keys
          const existingKeys = await ivsService.listStreamKeys(channel.arn);
          if (existingKeys.length > 0) {
            streamKey = existingKeys[0];
          } else {
            throw new Error('No stream keys available and cannot create new ones');
          }
        } else {
          throw err;
        }
      }

      // Create chat room
      const chatRoom = await ivsService.createChatRoom(displayName, {
        userId: user.userId,
        createdAt: new Date().toISOString()
      });

      // Create profile with IVS resources
      const profile = await client.models.Profile.create({
        userId: user.userId,
        displayName,
        bio: '',
        avatarUrl: '',
        followers: 0,
        following: 0,
        channelArn: channel.arn,
        streamKeyArn: streamKey.arn,
        streamKeyValue: streamKey.value,
        chatRoomArn: chatRoom.arn,
        ingestEndpoint: channel.ingestEndpoint,
        playbackUrl: channel.playbackUrl,
        isLive: false,
        lastStreamedAt: null
      });

      return profile;
    } catch (error) {
      console.error('Error creating profile:', error);
      throw error;
    }
  }

  async getProfileByUserId(userId: string): Promise<Schema['Profile']['type'] | null> {
    try {
      const { data: profiles } = await client.models.Profile.list({
        filter: {
          userId: { eq: userId }
        }
      });

      return profiles[0] || null;
    } catch (error) {
      console.error('Error getting profile:', error);
      throw error;
    }
  }

  async updateProfile(
    userId: string,
    updates: Partial<Omit<Schema['Profile']['type'], 'id' | 'userId'>>
  ): Promise<Schema['Profile']['type']> {
    try {
      const profile = await this.getProfileByUserId(userId);
      if (!profile) {
        throw new Error('Profile not found');
      }

      const updatedProfile = await client.models.Profile.update({
        id: profile.id,
        ...updates
      });

      return updatedProfile;
    } catch (error) {
      console.error('Error updating profile:', error);
      throw error;
    }
  }

  async setLiveStatus(userId: string, isLive: boolean): Promise<void> {
    try {
      const profile = await this.getProfileByUserId(userId);
      if (!profile) {
        throw new Error('Profile not found');
      }

      await this.updateProfile(userId, {
        isLive,
        lastStreamedAt: isLive ? new Date().toISOString() : profile.lastStreamedAt
      });
    } catch (error) {
      console.error('Error updating live status:', error);
      throw error;
    }
  }
} 