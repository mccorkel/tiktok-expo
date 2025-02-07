import { ReadableStream, WritableStream, TransformStream } from 'web-streams-polyfill';

Object.assign(global, {
  ReadableStream,
  WritableStream,
  TransformStream
}); 