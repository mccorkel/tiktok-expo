import { defineBackend } from '@aws-amplify/backend';
import { PolicyStatement } from "aws-cdk-lib/aws-iam";
import { auth } from './auth/resource';
import { data } from './data/resource';
import { moderationHandler } from './functions/moderation-handler/resource';

/**
 * @see https://docs.amplify.aws/react/build-a-backend/ to add storage, functions, and more
 */
const backend = defineBackend({
  auth,
  data: {
    ...data,
    authorizationModes: {
      defaultAuthorizationMode: 'userPool',
      // Add API key auth mode
      apiKeyAuthorizationMode: {
        expiresInDays: 30,
        description: 'API key for recording handler'
      }
    }
  },
  moderationHandler
});

// Configure IVS and IVS Chat permissions for authenticated users
backend.auth.resources.authenticatedUserIamRole.addToPrincipalPolicy(
  new PolicyStatement({
    actions: [
      // Channel permissions
      'ivs:CreateChannel',
      'ivs:GetChannel',
      'ivs:DeleteChannel',
      'ivs:UpdateChannel', 
      'ivs:ListChannels',
      'ivs:StartStream',
      'ivs:StopStream',
      'ivs:CreateStreamKey',
      'ivs:GetStreamKey',
      'ivs:ListStreamKeys',
      'ivs:TagResource',
      'ivs:GetStream',
      'ivs:ListStreamSessions',
      // Recording configuration permissions
      'ivs:CreateRecordingConfiguration',
      'ivs:GetRecordingConfiguration',
      'ivs:ListRecordingConfigurations',
      'ivs:DeleteRecordingConfiguration',
      'ivs:UpdateRecordingConfiguration',
      'ivs:BatchGetRecordingConfiguration',
      'ivs:BatchGetStreamKey',
      'ivs:ImportPlaybackKeyPair',
      'ivs:PutMetadata',
      // Chat permissions
      'ivschat:CreateRoom',
      'ivschat:DeleteRoom',
      'ivschat:DisconnectUser',
      'ivschat:GetRoom',
      'ivschat:ListRooms',
      'ivschat:SendMessage',
      'ivschat:CreateChatToken',
      'ivschat:TagResource'
    ],
    resources: ['*'],
  })
);

// Add S3 bucket permissions for thumbnails
backend.auth.resources.authenticatedUserIamRole.addToPrincipalPolicy(
  new PolicyStatement({
    actions: [
      's3:PutObject',
      's3:GetObject',
      's3:ListBucket',
      's3:PutObjectAcl',
      's3:GetObjectAcl'
    ],
    resources: [
      'arn:aws:s3:::tiktok-expo-thumbnails',
      'arn:aws:s3:::tiktok-expo-thumbnails/*'
    ],
  })
);
