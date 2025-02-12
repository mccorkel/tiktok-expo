/*== STEP 1 ===============================================================
The section below creates a Todo database table with a "content" field. Try
adding a new "isDone" field as a boolean. The authorization rule below
specifies that any unauthenticated user can "create", "read", "update", 
and "delete" any "Todo" records.
=========================================================================*/
import { type ClientSchema, a, defineData } from '@aws-amplify/backend';

const schema = a.schema({
  Todo: a
    .model({
      content: a.string(),
      isDone: a.boolean()
    })
    .authorization(allow => [allow.owner()]),

  Profile: a
    .model({
      userId: a.string(),
      displayName: a.string(),
      bio: a.string(),
      avatarUrl: a.string(),
      channelArn: a.string(),
      streamKeyArn: a.string(),
      streamKeyValue: a.string(),
      chatRoomArn: a.string(),
      ingestEndpoint: a.string(),
      playbackUrl: a.string(),
      isLive: a.boolean(),
      lastStreamedAt: a.string(),
      receivedFollows: a.hasMany('Follow', 'followeeId'),
      givenFollows: a.hasMany('Follow', 'followerId'),
      streamSessions: a.hasMany('StreamSession', 'profileId'),
      recordings: a.hasMany('Recording', 'profileId')
    })
    .authorization(allow => [
      // All authenticated users can read profiles
      allow.authenticated().to(['read']),
      // API key can read profiles for recording updates
      allow.publicApiKey().to(['read']),
      // Only owner can create/update/delete their own profile
      allow.owner().to(['create', 'update', 'delete'])
    ]),

  StreamSession: a
    .model({
      profileId: a.string(),
      profile: a.belongsTo('Profile', 'profileId'),
      streamId: a.string(),
      startTime: a.string(),
      endTime: a.string(),
      status: a.enum(['LIVE', 'ENDED', 'FAILED']),
      recordings: a.hasMany('Recording', 'streamSessionId'),
      viewerCount: a.integer(),
      duration: a.integer() // in seconds
    })
    .authorization(allow => [
      allow.authenticated().to(['read']),
      allow.publicApiKey().to(['read']),
      allow.owner().to(['create', 'update', 'delete'])
    ]),

  Recording: a
    .model({
      profileId: a.string(),
      profile: a.belongsTo('Profile', 'profileId'),
      streamSessionId: a.string(),
      streamSession: a.belongsTo('StreamSession', 'streamSessionId'),
      recordingStatus: a.enum(['STARTED', 'COMPLETED', 'FAILED']),
      recordingStatusReason: a.string(),
      s3BucketName: a.string(),
      s3KeyPrefix: a.string(),
      recordingDurationMs: a.integer(),
      recordingSessionId: a.string(),
      startTime: a.string(),
      endTime: a.string()
    })
    .authorization(allow => [
      allow.publicApiKey().to(['create', 'update']),
      allow.authenticated().to(['read']),
      allow.owner().to(['delete'])
    ]),

  ChatMessage: a
    .model({
      roomArn: a.string(),
      content: a.string(),
      senderId: a.string(),
      senderDisplayName: a.string(),
      timestamp: a.string(),
      attributes: a.string(), // JSON string for additional attributes
      messageId: a.string(), // IVS message ID for deduplication
    })
    .authorization(allow => [
      // All authenticated users can read messages
      allow.authenticated().to(['read']),
      // Owner-based authorization using senderId field
      allow.owner()
        .identityClaim('sub')
        .to(['create', 'update', 'delete'])
    ]),

  Follow: a
    .model({
      followerId: a.string(),
      followeeId: a.string(),
      follower: a.belongsTo('Profile', 'followerId'),
      followee: a.belongsTo('Profile', 'followeeId')
    })
    .authorization(allow => [
      allow.authenticated().to(['read']),
      allow.owner().to(['create', 'delete'])
    ]),
    
  // Removed ChatRoom model since we're using IVS stack's chat room
});

export const data = defineData({
  schema,
  authorizationModes: {
    defaultAuthorizationMode: 'userPool',
    apiKeyAuthorizationMode: {
      expiresInDays: 30,
      description: 'API key for recording handler'
    }
  }
});

export type Schema = ClientSchema<typeof schema>;

/*== STEP 2 ===============================================================
Go to your frontend source code. From your client-side code, generate a
Data client to make CRUDL requests to your table. (THIS SNIPPET WILL ONLY
WORK IN THE FRONTEND CODE FILE.)

Using JavaScript or Next.js React Server Components, Middleware, Server 
Actions or Pages Router? Review how to generate Data clients for those use
cases: https://docs.amplify.aws/gen2/build-a-backend/data/connect-to-API/
=========================================================================*/

/*
"use client"
import { generateClient } from "aws-amplify/data";
import type { Schema } from "@/amplify/data/resource";

const client = generateClient<Schema>() // use this Data client for CRUDL requests
*/

/*== STEP 3 ===============================================================
Fetch records from the database and use them in your frontend component.
(THIS SNIPPET WILL ONLY WORK IN THE FRONTEND CODE FILE.)
=========================================================================*/

/* For example, in a React component, you can use this snippet in your
  function's RETURN statement */
// const { data: todos } = await client.models.Todo.list()

// return <ul>{todos.map(todo => <li key={todo.id}>{todo.content}</li>)}</ul>
