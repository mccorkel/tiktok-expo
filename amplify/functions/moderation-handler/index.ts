import { S3Client, GetObjectCommand, PutObjectCommand, ListObjectsV2Command } from '@aws-sdk/client-s3';
import { RekognitionClient, DetectModerationLabelsCommand } from '@aws-sdk/client-rekognition';
import { Handler } from 'aws-lambda';

const s3Client = new S3Client({ region: process.env.REGION });
const rekognitionClient = new RekognitionClient({ region: process.env.REGION });

type ModerationEvent = {
  streamSessionId: string;
  bucketName: string;
  thumbnailPrefix: string;
};

export const handler: Handler<ModerationEvent> = async (event) => {
  try {
    const { streamSessionId, bucketName, thumbnailPrefix } = event;

    if (!streamSessionId || !bucketName || !thumbnailPrefix) {
      throw new Error('Missing required parameters');
    }

    // List thumbnails in S3
    const listResponse = await s3Client.send(new ListObjectsV2Command({
      Bucket: bucketName,
      Prefix: thumbnailPrefix
    }));

    if (!listResponse.Contents) {
      console.log('No thumbnails found');
      return {
        statusCode: 200,
        body: JSON.stringify({ message: 'No thumbnails found' })
      };
    }

    const moderationResults = [];

    // Process each thumbnail
    for (const object of listResponse.Contents) {
      if (!object.Key) continue;

      // Get the thumbnail from S3
      const getResponse = await s3Client.send(new GetObjectCommand({
        Bucket: bucketName,
        Key: object.Key
      }));

      if (!getResponse.Body) {
        console.log(`No body found for object: ${object.Key}`);
        continue;
      }

      // Convert stream to buffer
      const imageBytes = await streamToBuffer(getResponse.Body);

      // Send to Rekognition for moderation
      const moderationResponse = await rekognitionClient.send(new DetectModerationLabelsCommand({
        Image: {
          Bytes: imageBytes
        },
        MinConfidence: 80
      }));

      const result = {
        thumbnailKey: object.Key,
        moderationLabels: moderationResponse.ModerationLabels || [],
        timestamp: new Date().toISOString()
      };

      moderationResults.push(result);

      // Save moderation result to S3
      const resultKey = `${thumbnailPrefix}/moderation/${object.Key.split('/').pop()}.json`;
      
      await s3Client.send(new PutObjectCommand({
        Bucket: bucketName,
        Key: resultKey,
        Body: JSON.stringify(result),
        ContentType: 'application/json'
      }));
    }

    return {
      statusCode: 200,
      body: JSON.stringify({
        message: 'Moderation completed',
        results: moderationResults
      })
    };

  } catch (error) {
    console.error('Error in moderation handler:', error);
    throw error;
  }
};

// Helper function to convert stream to buffer
async function streamToBuffer(stream: any): Promise<Buffer> {
  const chunks: Buffer[] = [];
  
  return new Promise((resolve, reject) => {
    stream.on('data', (chunk: Buffer) => chunks.push(chunk));
    stream.on('error', reject);
    stream.on('end', () => resolve(Buffer.concat(chunks)));
  });
} 