import { defineFunction } from '@aws-amplify/backend';

export const moderationHandler = defineFunction({
  name: 'moderation-handler',
  entry: './index.ts',
  bundling: {
    external: [
      '@aws-sdk/client-s3',
      '@aws-sdk/client-rekognition'
    ]
  }
}); 