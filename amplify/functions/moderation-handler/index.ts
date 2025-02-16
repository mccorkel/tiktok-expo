import type { Handler } from 'aws-lambda';
import { S3Client, ListObjectsV2Command, GetObjectCommand, PutObjectCommand } from '@aws-sdk/client-s3';
import { RekognitionClient, DetectModerationLabelsCommand } from '@aws-sdk/client-rekognition';

const s3Client = new S3Client({ region: process.env.REGION || 'us-east-1' });
const rekognitionClient = new RekognitionClient({ region: process.env.REGION || 'us-east-1' });

type ModerationEvent = {
  bucketName: string;
  thumbnailPrefix: string;
};

type ModerationLabel = {
  Confidence: number;
  Name: string;
  ParentName?: string;
};

export const handler: Handler<ModerationEvent> = async (event: ModerationEvent) => {
  try {
    const { bucketName, thumbnailPrefix } = event;

    if (!bucketName || !thumbnailPrefix) {
      throw new Error('Missing required parameters');
    }

    // List thumbnails in S3
    const listCommand = new ListObjectsV2Command({
      Bucket: bucketName,
      Prefix: thumbnailPrefix
    });

    const thumbnailsList = await s3Client.send(listCommand);
    if (!thumbnailsList.Contents) {
      console.log('No thumbnails found');
      return {
        statusCode: 200,
        body: JSON.stringify({ message: 'No thumbnails found' })
      };
    }

    const moderationResults = [];
    const allLabels = new Map<string, { count: number, maxConfidence: number, thumbnails: string[] }>();

    // Process each thumbnail
    for (const object of thumbnailsList.Contents) {
      if (!object.Key?.endsWith('.jpg')) continue;

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

      // Aggregate labels
      for (const label of (moderationResponse.ModerationLabels || [])) {
        if (!label.Name || label.Confidence === undefined) continue;
        
        const existing = allLabels.get(label.Name);
        if (existing) {
          existing.count++;
          existing.maxConfidence = Math.max(existing.maxConfidence, label.Confidence);
          if (object.Key) {
            existing.thumbnails.push(object.Key);
          }
        } else {
          allLabels.set(label.Name, {
            count: 1,
            maxConfidence: label.Confidence,
            thumbnails: object.Key ? [object.Key] : []
          });
        }
      }

      moderationResults.push(result);

      // Save individual moderation result to S3
      const resultKey = `${thumbnailPrefix}/moderation/${object.Key.split('/').pop()}.json`;
      
      await s3Client.send(new PutObjectCommand({
        Bucket: bucketName,
        Key: resultKey,
        Body: JSON.stringify(result, null, 2),
        ContentType: 'application/json'
      }));

      console.log('Saved moderation results for:', object.Key);
    }

    // Create aggregate report
    const aggregateReport = {
      summary: {
        totalThumbnails: moderationResults.length,
        totalLabelsFound: allLabels.size,
        scanTimestamp: new Date().toISOString()
      },
      labels: Array.from(allLabels.entries()).map(([name, data]) => ({
        name,
        occurrences: data.count,
        maxConfidence: data.maxConfidence,
        thumbnails: data.thumbnails
      })).sort((a, b) => b.occurrences - a.occurrences)
    };

    // Save aggregate report
    await s3Client.send(new PutObjectCommand({
      Bucket: bucketName,
      Key: `${thumbnailPrefix}/moderation/aggregate_report.json`,
      Body: JSON.stringify(aggregateReport, null, 2),
      ContentType: 'application/json'
    }));

    return {
      statusCode: 200,
      body: JSON.stringify({
        message: 'Moderation completed',
        results: moderationResults,
        aggregateReport
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