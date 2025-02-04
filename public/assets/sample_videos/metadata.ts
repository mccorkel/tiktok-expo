export type VideoMetadata = {
  id: string;
  title: string;
  filename: string;
  duration: number;
  thumbnail: string;
  tags: string[];
};

export const sampleVideos: VideoMetadata[] = [
  {
    id: '1',
    title: 'Sample Video 1',
    filename: 'sample1.mp4',
    duration: 30,
    thumbnail: 'thumb1.jpg',
    tags: ['sample', 'demo'],
  },
  {
    id: '2',
    title: 'Sample Video 2',
    filename: 'sample2.mp4',
    duration: 45,
    thumbnail: 'thumb2.jpg',
    tags: ['sample', 'tutorial'],
  },
  {
    id: '3',
    title: 'Sample Video 3',
    filename: 'sample3.mp4',
    duration: 15,
    thumbnail: 'thumb3.jpg',
    tags: ['sample', 'intro'],
  },
]; 