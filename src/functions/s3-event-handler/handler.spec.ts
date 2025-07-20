import { Context, S3Event } from 'aws-lambda';
import { MediaRepository } from '@lib/repositories';
import { MOCK_INVALID_MEDIA_ITEM, MOCK_VALID_MEDIA_ITEM } from '../../tests/mocks/media';
import { MOCK_USER_ID } from '../../tests/mocks/common';
import { main } from './handler';

describe('S3 Event main', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    jest.spyOn(MediaRepository.prototype, 'get').mockResolvedValue(MOCK_INVALID_MEDIA_ITEM);
    jest.spyOn(MediaRepository.prototype, 'validate').mockResolvedValue(MOCK_VALID_MEDIA_ITEM);
  });

  const createMockS3Event = (objectKey: string, bucketName = 'test-bucket'): S3Event => ({
    Records: [
      {
        eventVersion: '2.1',
        eventSource: 'aws:s3',
        awsRegion: 'us-west-1',
        eventTime: '2024-01-01T00:00:00.000Z',
        eventName: 'ObjectCreated:Put',
        userIdentity: {
          principalId: 'test-user',
        },
        requestParameters: {
          sourceIPAddress: '127.0.0.1',
        },
        responseElements: {
          'x-amz-request-id': 'test-request-id',
          'x-amz-id-2': 'test-id-2',
        },
        s3: {
          s3SchemaVersion: '1.0',
          configurationId: 'test-config',
          bucket: {
            name: bucketName,
            ownerIdentity: {
              principalId: 'test-owner',
            },
            arn: `arn:aws:s3:::${bucketName}`,
          },
          object: {
            key: objectKey,
            size: 1024,
            eTag: 'test-etag',
            sequencer: 'test-sequencer',
          },
        },
      },
    ],
  });

  describe('Object creation events', () => {
    it('should update existing invalid media item to valid', async () => {
      // Arrange
      const objectKey = 'uploads/test-file.jpg';
      const event = createMockS3Event(objectKey);

      // Act
      await main(event, {} as Context, jest.fn());

      // Assert
      expect(MediaRepository.prototype.get).toHaveBeenCalledWith(objectKey);
      expect(MediaRepository.prototype.validate).toHaveBeenCalledWith(objectKey, MOCK_USER_ID);
    });

    it('should not update already valid media item', async () => {
      // Arrange
      jest.spyOn(MediaRepository.prototype, 'get').mockResolvedValueOnce(MOCK_VALID_MEDIA_ITEM);
      const objectKey = 'uploads/test-file.jpg';
      const event = createMockS3Event(objectKey);

      // Act
      await main(event, {} as Context, jest.fn());

      // Assert
      expect(MediaRepository.prototype.get).toHaveBeenCalledWith(objectKey);
      expect(MediaRepository.prototype.validate).not.toHaveBeenCalled();
    });

    it('should not create new media item when none exists', async () => {
      // Arrange
      jest.spyOn(MediaRepository.prototype, 'get').mockResolvedValueOnce(null);
      const objectKey = 'uploads/new-file.pdf';
      const event = createMockS3Event(objectKey);

      // Act
      await main(event, {} as Context, jest.fn());

      // Assert
      expect(MediaRepository.prototype.get).toHaveBeenCalledWith(objectKey);
      expect(MediaRepository.prototype.validate).not.toHaveBeenCalled();
    });

    it('should handle multiple records in event', async () => {
      // Arrange
      const event: S3Event = {
        Records: [
          {
            eventVersion: '2.1',
            eventSource: 'aws:s3',
            awsRegion: 'us-west-1',
            eventTime: '2024-01-01T00:00:00.000Z',
            eventName: 'ObjectCreated:Put',
            userIdentity: { principalId: 'test-user' },
            requestParameters: { sourceIPAddress: '127.0.0.1' },
            responseElements: {
              'x-amz-request-id': 'test-request-id',
              'x-amz-id-2': 'test-id-2',
            },
            s3: {
              s3SchemaVersion: '1.0',
              configurationId: 'test-config',
              bucket: {
                name: 'test-bucket',
                ownerIdentity: { principalId: 'test-owner' },
                arn: 'arn:aws:s3:::test-bucket',
              },
              object: {
                key: 'file1.jpg',
                size: 1024,
                eTag: 'test-etag',
                sequencer: 'test-sequencer',
              },
            },
          },
          {
            eventVersion: '2.1',
            eventSource: 'aws:s3',
            awsRegion: 'us-west-1',
            eventTime: '2024-01-01T00:00:00.000Z',
            eventName: 'ObjectCreated:Put',
            userIdentity: { principalId: 'test-user' },
            requestParameters: { sourceIPAddress: '127.0.0.1' },
            responseElements: {
              'x-amz-request-id': 'test-request-id',
              'x-amz-id-2': 'test-id-2',
            },
            s3: {
              s3SchemaVersion: '1.0',
              configurationId: 'test-config',
              bucket: {
                name: 'test-bucket',
                ownerIdentity: { principalId: 'test-owner' },
                arn: 'arn:aws:s3:::test-bucket',
              },
              object: {
                key: 'file2.pdf',
                size: 1024,
                eTag: 'test-etag',
                sequencer: 'test-sequencer',
              },
            },
          },
        ],
      };

      // Act
      await main(event, {} as Context, jest.fn());

      // Assert
      expect(MediaRepository.prototype.get).toHaveBeenCalledTimes(2);
      expect(MediaRepository.prototype.get).toHaveBeenCalledWith('file1.jpg');
      expect(MediaRepository.prototype.get).toHaveBeenCalledWith('file2.pdf');
      expect(MediaRepository.prototype.validate).toHaveBeenCalledTimes(2);
    });
  });

  describe('Error handling', () => {
    it('should continue processing when one record fails', async () => {
      // Arrange
      jest
        .spyOn(MediaRepository.prototype, 'get')
        .mockRejectedValueOnce(new Error('Database error'));

      const event: S3Event = {
        Records: [
          {
            eventVersion: '2.1',
            eventSource: 'aws:s3',
            awsRegion: 'us-west-1',
            eventTime: '2024-01-01T00:00:00.000Z',
            eventName: 'ObjectCreated:Put',
            userIdentity: { principalId: 'test-user' },
            requestParameters: { sourceIPAddress: '127.0.0.1' },
            responseElements: {
              'x-amz-request-id': 'test-request-id',
              'x-amz-id-2': 'test-id-2',
            },
            s3: {
              s3SchemaVersion: '1.0',
              configurationId: 'test-config',
              bucket: {
                name: 'test-bucket',
                ownerIdentity: { principalId: 'test-owner' },
                arn: 'arn:aws:s3:::test-bucket',
              },
              object: {
                key: 'file1.jpg',
                size: 1024,
                eTag: 'test-etag',
                sequencer: 'test-sequencer',
              },
            },
          },
          {
            eventVersion: '2.1',
            eventSource: 'aws:s3',
            awsRegion: 'us-west-1',
            eventTime: '2024-01-01T00:00:00.000Z',
            eventName: 'ObjectCreated:Put',
            userIdentity: { principalId: 'test-user' },
            requestParameters: { sourceIPAddress: '127.0.0.1' },
            responseElements: {
              'x-amz-request-id': 'test-request-id',
              'x-amz-id-2': 'test-id-2',
            },
            s3: {
              s3SchemaVersion: '1.0',
              configurationId: 'test-config',
              bucket: {
                name: 'test-bucket',
                ownerIdentity: { principalId: 'test-owner' },
                arn: 'arn:aws:s3:::test-bucket',
              },
              object: {
                key: 'file2.pdf',
                size: 1024,
                eTag: 'test-etag',
                sequencer: 'test-sequencer',
              },
            },
          },
        ],
      };

      // Act
      await main(event, {} as Context, jest.fn());

      // Assert
      expect(MediaRepository.prototype.get).toHaveBeenCalledTimes(2);
      expect(MediaRepository.prototype.validate).toHaveBeenCalledTimes(1); // Only first record should create
    });
  });
});
