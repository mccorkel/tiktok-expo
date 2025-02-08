import { IvsClient, CreateChannelCommand, CreateStreamKeyCommand, GetStreamKeyCommand, ListStreamKeysCommand, DeleteStreamKeyCommand, CreateChannelCommandOutput, GetChannelCommand } from '@aws-sdk/client-ivs';
import { IvschatClient, CreateRoomCommand, CreateRoomCommandOutput } from '@aws-sdk/client-ivschat';
import { fetchAuthSession } from 'aws-amplify/auth';
import outputs from '../../amplify_outputs.json';

const AWS_REGION = 'us-east-1';
const IDENTITY_POOL_ID = outputs.auth.identity_pool_id;

export interface Channel {
  arn: string;
  name: string;
  playbackUrl: string;
  ingestEndpoint: string;
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

  async createChannel(name: string, tags?: Record<string, string>): Promise<Channel> {
    try {
      const ivsClient = await this.getIVSClient();
      
      const command = new CreateChannelCommand({
        name,
        tags,
        type: 'BASIC',
        latencyMode: 'LOW',
        authorized: false
      });

      const response = await ivsClient.send(command) as CreateChannelCommandOutput;
      
      if (!response.channel?.arn || !response.channel?.playbackUrl || !response.channel?.ingestEndpoint) {
        throw new Error('Invalid channel creation response');
      }

      return {
        arn: response.channel.arn,
        name: response.channel.name || name,
        playbackUrl: response.channel.playbackUrl,
        ingestEndpoint: response.channel.ingestEndpoint
      };
    } catch (error) {
      console.error('Error creating channel:', error);
      throw error;
    }
  }

  async getChannel(channelArn: string): Promise<Channel> {
    try {
      const ivsClient = await this.getIVSClient();
      
      const command = new GetChannelCommand({
        arn: channelArn
      });

      const response = await ivsClient.send(command);
      
      if (!response.channel?.arn || !response.channel?.playbackUrl || !response.channel?.ingestEndpoint) {
        throw new Error('Invalid channel response');
      }

      return {
        arn: response.channel.arn,
        name: response.channel.name || '',
        playbackUrl: response.channel.playbackUrl,
        ingestEndpoint: response.channel.ingestEndpoint
      };
    } catch (error) {
      console.error('Error getting channel:', error);
      throw error;
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
} 