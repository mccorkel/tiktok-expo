import { defineFunction } from '@aws-amplify/backend';

export const moderationHandler = defineFunction({
  name: 'moderation-handler',
  entry: './index.ts'
}); 