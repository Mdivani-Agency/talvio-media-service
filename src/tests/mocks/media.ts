import { MediaItem } from '@lib/types';
import { MOCK_USER_ID } from './common';

const timestamp = new Date().toISOString();

export const MOCK_INVALID_MEDIA_ITEM: MediaItem = {
  key: `profile/${MOCK_USER_ID}/test-key.jpg`,
  userId: MOCK_USER_ID,
  name: 'test-name.jpg',
  type: 'image/jpeg',
  publicUrl: 'test-public-url',
  status: 'pending',
  createdAt: timestamp,
  updatedAt: timestamp,
};

export const MOCK_VALID_MEDIA_ITEM: MediaItem = {
  key: `resume/${MOCK_USER_ID}/test-key.jpg`,
  userId: MOCK_USER_ID,
  name: 'test-name.jpg',
  type: 'image/jpeg',
  publicUrl: 'test-public-url',
  status: 'uploaded',
  createdAt: timestamp,
  updatedAt: timestamp,
};
