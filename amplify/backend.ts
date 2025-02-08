import { defineBackend } from '@aws-amplify/backend';
import { PolicyStatement } from "aws-cdk-lib/aws-iam";
import { auth } from './auth/resource';
import { data } from './data/resource';

/**
 * @see https://docs.amplify.aws/react/build-a-backend/ to add storage, functions, and more
 */
const backend = defineBackend({
  auth,
  data
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
      // Chat permissions
      'ivschat:CreateRoom',
      'ivschat:DeleteRoom',
      'ivschat:DisconnectUser',
      'ivschat:GetRoom',
      'ivschat:ListRooms',
      'ivschat:SendMessage',
      'ivschat:CreateChatToken'
    ],
    resources: ['*'],
  })
);
