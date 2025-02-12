import { IvsClient, CreateChannelCommand, CreateStreamKeyCommand, GetStreamKeyCommand, ListStreamKeysCommand, DeleteStreamKeyCommand, CreateChannelCommandOutput, GetChannelCommand, GetChannelCommandOutput, GetStreamCommand, CreateRecordingConfigurationCommand, GetRecordingConfigurationCommand, ListRecordingConfigurationsCommand, ListStreamSessionsCommand, type CreateRecordingConfigurationCommandOutput, type ThumbnailConfigurationStorage, type RecordingMode, type RenditionConfigurationRendition, type ThumbnailConfigurationResolution, type RenditionConfigurationRenditionSelection, type CreateRecordingConfigurationCommandInput } from '@aws-sdk/client-ivs';
import { IvschatClient, CreateRoomCommand, CreateRoomCommandOutput } from '@aws-sdk/client-ivschat';
import { fetchAuthSession } from 'aws-amplify/auth';
import outputs from '../../amplify_outputs.json';

const AWS_REGION = 'us-east-1';
const IDENTITY_POOL_ID = outputs.auth.identity_pool_id;
const RECORDING_CONFIGURATION_ARN = 'arn:aws:ivs:us-east-1:525894077320:recording-configuration/wK2p3WOIGpsG';

export interface Channel {
  arn: string;
  name: string;
  playbackUrl: string;
  ingestEndpoint: string;
  isLive?: boolean;
  recordingConfigurationArn: string;
  streamSessionId?: string;
}

export interface StreamKey {
  arn: string;
  value: string;
  channelArn: string;
}

export interface ChatRoom {
  arn: string;
  name: string;
  id: string;
}

interface IVSChannelResponse {
  arn: string;
  name?: string;
  playbackUrl: string;
  ingestEndpoint: string;
  health?: string;
}

export class IVSService {
  private ivsClient: IvsClient | null = null;
  private ivsChatClient: IvschatClient | null = null;

  private async getIVSClient(): Promise<IvsClient> {
    if (!this.ivsClient) {
      const { credentials } = await fetchAuthSession();
      if (!credentials) {
        throw new Error('No credentials available');
      }

      this.ivsClient = new IvsClient({
        region: AWS_REGION,
        credentials
      });
    }
    return this.ivsClient;
  }

  private async getIVSChatClient(): Promise<IvschatClient> {
    if (!this.ivsChatClient) {
      const { credentials } = await fetchAuthSession();
      if (!credentials) {
        throw new Error('No credentials available');
      }

      this.ivsChatClient = new IvschatClient({
        region: AWS_REGION,
        credentials
      });
    }
    return this.ivsChatClient;
  }

  async getRecordingConfiguration(arn: string) {
    try {
      const ivsClient = await this.getIVSClient();
      
      const command = new GetRecordingConfigurationCommand({
        arn
      });

      const response = await ivsClient.send(command);
      console.log('Recording configuration status:', {
        arn,
        state: response.recordingConfiguration?.state,
        destination: response.recordingConfiguration?.destinationConfiguration,
        thumbnailConfig: response.recordingConfiguration?.thumbnailConfiguration
      });

      return response.recordingConfiguration;
    } catch (error) {
      console.error('Error getting recording configuration:', {
        error,
        name: error instanceof Error ? error.name : 'Unknown',
        message: error instanceof Error ? error.message : 'Unknown error'
      });
      throw error;
    }
  }

  async createChannel(name: string, tags?: Record<string, string>): Promise<Channel> {
    try {
      const ivsClient = await this.getIVSClient();
      
      const command = new CreateChannelCommand({
        name,
        tags,
        type: 'BASIC',
        latencyMode: 'LOW',
        authorized: false,
        recordingConfigurationArn: RECORDING_CONFIGURATION_ARN
      });

      const response = await ivsClient.send(command) as CreateChannelCommandOutput;
      
      if (!response.channel?.arn || !response.channel?.playbackUrl || !response.channel?.ingestEndpoint) {
        throw new Error('Invalid channel creation response');
      }

      return {
        arn: response.channel.arn,
        name: response.channel.name || name,
        playbackUrl: response.channel.playbackUrl,
        ingestEndpoint: response.channel.ingestEndpoint,
        recordingConfigurationArn: RECORDING_CONFIGURATION_ARN
      };
    } catch (error) {
      console.error('Error creating channel:', error);
      throw error;
    }
  }

  async getActiveRecordingId(channelArn: string): Promise<string | null> {
    try {
      console.log('Starting getActiveRecordingId:', {
        channelArn,
        timestamp: new Date().toISOString()
      });

      const ivsClient = await this.getIVSClient();
      console.log('IVS client initialized');
      
      const command = new ListStreamSessionsCommand({
        channelArn,
        maxResults: 1
      });
      console.log('ListStreamSessionsCommand created:', {
        params: { channelArn, maxResults: 1 }
      });

      console.log('Sending ListStreamSessionsCommand...');
      const response = await ivsClient.send(command);
      console.log('ListStreamSessions response received:', {
        hasStreamSessions: Boolean(response.streamSessions),
        sessionCount: response.streamSessions?.length || 0,
        nextToken: response.nextToken,
        raw: JSON.stringify(response, null, 2)
      });
      
      // If there's no active stream session, return null
      if (!response.streamSessions || response.streamSessions.length === 0) {
        console.log('No stream sessions found for channel:', {
          channelArn,
          reason: !response.streamSessions ? 'streamSessions is undefined' : 'streamSessions array is empty'
        });
        return null;
      }

      // Get the most recent stream session
      const streamSession = response.streamSessions[0];
      console.log('Most recent stream session:', {
        streamId: streamSession.streamId,
        startTime: streamSession.startTime,
        endTime: streamSession.endTime,
        hasErrorEvent: streamSession.hasErrorEvent
      });
      
      // Only return the stream ID if the session is still active (no endTime)
      if (!streamSession.endTime) {
        console.log('Found active stream session:', {
          streamId: streamSession.streamId,
          startTime: streamSession.startTime,
          hasErrorEvent: streamSession.hasErrorEvent,
          isActive: true,
          reason: 'No endTime present'
        });
        return streamSession.streamId || null;
      }

      console.log('Most recent stream session has ended:', {
        streamId: streamSession.streamId,
        startTime: streamSession.startTime,
        endTime: streamSession.endTime,
        isActive: false,
        reason: 'endTime is present'
      });
      return null;
    } catch (error) {
      console.error('Error getting active recording ID:', {
        error,
        name: error instanceof Error ? error.name : 'Unknown',
        message: error instanceof Error ? error.message : 'Unknown error',
        channelArn,
        timestamp: new Date().toISOString(),
        stack: error instanceof Error ? error.stack : undefined
      });
      return null;
    }
  }

  async getChannel(channelArn: string): Promise<Channel> {
    try {
      const ivsClient = await this.getIVSClient();
      
      // Get channel info
      const channelCommand = new GetChannelCommand({
        arn: channelArn
      });

      const channelResponse = await ivsClient.send(channelCommand);
      console.log('Raw Channel Response:', JSON.stringify(channelResponse, null, 2));
      
      if (!channelResponse.channel?.arn || !channelResponse.channel?.playbackUrl || !channelResponse.channel?.ingestEndpoint) {
        throw new Error('Invalid channel response');
      }

      // Get stream info and recording ID
      let isLive = false;
      let streamSessionId: string | undefined;

      try {
        const streamResponse = await ivsClient.send(new GetStreamCommand({ channelArn }));
        console.log('Full Stream Response:', {
          stream: streamResponse.stream,
          properties: streamResponse.stream ? Object.keys(streamResponse.stream) : [],
          raw: JSON.stringify(streamResponse, null, 2)
        });
        
        if (streamResponse.stream) {
          isLive = true;
          const streamData = streamResponse.stream as any;
          // Get the stream session ID (for live streaming)
          streamSessionId = streamData.streamId;
          
          console.log('Stream data extracted:', {
            streamSessionId,
            streamState: streamData.state,
            streamHealth: streamData.health
          });
        }
      } catch (streamError: any) {
        // Handle expected error cases
        if (streamError.name === 'NotFoundException' || streamError.name === 'ChannelNotBroadcasting') {
          console.log('Channel is offline:', channelArn);
          isLive = false;
        } else {
          // Only throw for unexpected errors
          console.error('Unexpected error checking stream status:', streamError);
          throw streamError;
        }
      }

      return {
        arn: channelResponse.channel.arn,
        name: channelResponse.channel.name || '',
        playbackUrl: channelResponse.channel.playbackUrl,
        ingestEndpoint: channelResponse.channel.ingestEndpoint,
        isLive,
        recordingConfigurationArn: channelResponse.channel.recordingConfigurationArn || '',
        streamSessionId
      };
    } catch (error) {
      console.error('Error getting channel:', error);
      throw error;
    }
  }

  async checkChannelLiveStatus(channelArn: string): Promise<boolean> {
    try {
      const channel = await this.getChannel(channelArn);
      const currentStatus = channel.isLive || false;
      console.log('Channel live status check:', {
        channelArn,
        isLive: currentStatus
      });
      return currentStatus;
    } catch (error) {
      // Log the error but don't throw, just return offline status
      console.log('Error checking live status, assuming channel is offline:', error);
      return false;
    }
  }

  async createStreamKey(channelArn: string, tags?: Record<string, string>): Promise<StreamKey> {
    try {
      const ivsClient = await this.getIVSClient();
      
      const command = new CreateStreamKeyCommand({
        channelArn,
        tags
      });

      const response = await ivsClient.send(command);
      
      if (!response.streamKey?.arn || !response.streamKey?.value) {
        throw new Error('Invalid stream key creation response');
      }

      return {
        arn: response.streamKey.arn,
        value: response.streamKey.value,
        channelArn: response.streamKey.channelArn || channelArn
      };
    } catch (error) {
      // Don't log quota exceptions since they're expected and handled by the UI
      if ((error as any)?.name !== 'ServiceQuotaExceededException') {
        console.error('Error creating stream key:', error);
      }
      throw error;
    }
  }

  async getStreamKey(streamKeyArn: string): Promise<StreamKey> {
    try {
      const ivsClient = await this.getIVSClient();
      
      const command = new GetStreamKeyCommand({
        arn: streamKeyArn
      });

      const response = await ivsClient.send(command);
      
      if (!response.streamKey?.arn || !response.streamKey?.value || !response.streamKey?.channelArn) {
        throw new Error('Invalid stream key response');
      }

      return {
        arn: response.streamKey.arn,
        value: response.streamKey.value,
        channelArn: response.streamKey.channelArn
      };
    } catch (error) {
      console.error('Error getting stream key:', error);
      throw error;
    }
  }

  async listStreamKeys(channelArn: string): Promise<StreamKey[]> {
    try {
      const ivsClient = await this.getIVSClient();
      
      const command = new ListStreamKeysCommand({
        channelArn
      });

      const response = await ivsClient.send(command);
      console.log('List stream keys response:', JSON.stringify(response, null, 2));
      
      if (!response.streamKeys || response.streamKeys.length === 0) {
        console.log('No stream keys found in response');
        return [];
      }

      // For each stream key, fetch its full details including the value
      const streamKeysWithValues = await Promise.all(
        response.streamKeys
          .filter(key => key.arn && key.channelArn)
          .map(async (key) => {
            try {
              const fullKey = await this.getStreamKey(key.arn!);
              return fullKey;
            } catch (error) {
              console.error('Error fetching stream key details:', error);
              return null;
            }
          })
      );

      // Filter out any null values from failed fetches
      const validKeys = streamKeysWithValues.filter((key): key is StreamKey => key !== null);
      console.log('Valid stream keys found:', validKeys.length);
      return validKeys;
    } catch (error) {
      console.error('Error listing stream keys:', error);
      throw error;
    }
  }

  async deleteStreamKey(streamKeyArn: string): Promise<void> {
    try {
      const ivsClient = await this.getIVSClient();
      
      const command = new DeleteStreamKeyCommand({
        arn: streamKeyArn
      });

      await ivsClient.send(command);
    } catch (error) {
      console.error('Error deleting stream key:', error);
      throw error;
    }
  }

  async createChatRoom(name: string, tags?: Record<string, string>): Promise<ChatRoom> {
    try {
      const ivsChatClient = await this.getIVSChatClient();
      
      const command = new CreateRoomCommand({
        name,
        tags
      });

      const response = await ivsChatClient.send(command) as CreateRoomCommandOutput;
      
      if (!response.arn || !response.id) {
        throw new Error('Invalid chat room creation response');
      }

      return {
        arn: response.arn,
        name: name, // CreateRoomCommand response doesn't include name
        id: response.id
      };
    } catch (error) {
      console.error('Error creating chat room:', error);
      throw error;
    }
  }

  async listRecordingConfigurations() {
    try {
      const ivsClient = await this.getIVSClient();
      
      const command = new ListRecordingConfigurationsCommand({});
      const response = await ivsClient.send(command);

      console.log('All recording configurations:', 
        JSON.stringify(response.recordingConfigurations, null, 2)
      );

      return response.recordingConfigurations;
    } catch (error) {
      console.error('Error listing recording configurations:', error);
      throw error;
    }
  }

  async verifyThumbnailConfiguration(channelArn: string) {
    try {
      // Get channel details
      const channel = await this.getChannel(channelArn);
      console.log('Channel details:', JSON.stringify(channel, null, 2));

      if (!channel.recordingConfigurationArn) {
        console.log('Channel has no recording configuration');
        return false;
      }

      // Get the specific recording configuration
      const config = await this.getRecordingConfiguration(channel.recordingConfigurationArn);
      if (!config) {
        console.log('Could not get recording configuration:', channel.recordingConfigurationArn);
        return false;
      }

      console.log('Channel recording configuration:', {
        arn: config.arn,
        state: config.state,
        destination: config.destinationConfiguration,
        thumbnailConfig: config.thumbnailConfiguration
      });

      return true;
    } catch (error) {
      console.error('Error verifying thumbnail configuration:', error);
      return false;
    }
  }
} 