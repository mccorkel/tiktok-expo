import { 
  IvsClient, 
  CreateChannelCommand,
  GetChannelCommand,
  CreateStreamKeyCommand,
  GetStreamKeyCommand,
  ListStreamKeysCommand,
  DeleteStreamKeyCommand,
  StreamKey as IVSStreamKey
} from "@aws-sdk/client-ivs";
import { fetchAuthSession } from 'aws-amplify/auth';

interface StreamKey {
  arn: string;
  value: string;  // The actual stream key to use with broadcasting software
  channelArn: string;
}

interface Channel {
  arn: string;
  name: string;
  playbackUrl: string;
  ingestEndpoint: string;
}

export class IVSService {
  private ivsClient: IvsClient | null = null;

  private async getIVSClient(): Promise<IvsClient> {
    if (!this.ivsClient) {
      const session = await fetchAuthSession();
      if (!session.credentials) {
        throw new Error('No credentials available');
      }
      
      this.ivsClient = new IvsClient({ 
        region: "us-east-1",  // Change this to your region
        credentials: {
          accessKeyId: session.credentials.accessKeyId,
          secretAccessKey: session.credentials.secretAccessKey,
          sessionToken: session.credentials.sessionToken
        }
      });
    }
    return this.ivsClient;
  }

  async createChannel(name: string, tags?: Record<string, string>): Promise<Channel> {
    try {
      const ivsClient = await this.getIVSClient();
      
      const command = new CreateChannelCommand({
        name,
        tags,
        type: 'BASIC',  // or 'STANDARD' for higher quality
        latencyMode: 'LOW',  // or 'NORMAL'
        authorized: false,  // Set to true if you want to restrict who can stream
      });

      const response = await ivsClient.send(command);
      
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
} 