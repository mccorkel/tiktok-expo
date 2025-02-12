import { defineFunction } from '@aws-amplify/backend';

export const recordingHandler = defineFunction({
  name: 'recording-handler',
  entry: './handler.ts'
}); 