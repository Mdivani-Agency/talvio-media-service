import { Context, S3Event } from 'aws-lambda';
import { MediaRepository } from '@lib/repositories';
import { MOCK_INVALID_MEDIA_ITEM, MOCK_VALID_MEDIA_ITEM } from '../../tests/mocks/media';
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
      expect(MediaRepository.prototype.validate).toHaveBeenCalledWith(objectKey);
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
    it('fails the invocation when validate fails so Lambda retries', async () => {
      jest
        .spyOn(MediaRepository.prototype, 'validate')
        .mockRejectedValueOnce(new Error('Failed to update media item'));

      await expect(
        main(createMockS3Event('resume/user-123/cv.pdf'), {} as Context, jest.fn()),
      ).rejects.toThrow('Failed to process 1 of 1 S3 records: resume/user-123/cv.pdf');
    });

    it('resolves when every record succeeds', async () => {
      await expect(
        main(createMockS3Event('resume/user-123/cv.pdf'), {} as Context, jest.fn()),
      ).resolves.toBeUndefined();
    });

    it('processes the rest of the batch, then fails the invocation when one record fails', async () => {
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
      await expect(main(event, {} as Context, jest.fn())).rejects.toThrow(
        'Failed to process 1 of 2 S3 records: file1.jpg',
      );

      // Assert
      expect(MediaRepository.prototype.get).toHaveBeenCalledTimes(2);
      expect(MediaRepository.prototype.validate).toHaveBeenCalledTimes(1);
      expect(MediaRepository.prototype.validate).toHaveBeenCalledWith('file2.pdf');
    });
  });

  describe('Object key decoding', () => {
    it.each([
      ['a space encoded as +', 'my+docs/user-123/cv.pdf', 'my docs/user-123/cv.pdf'],
      ['a literal + encoded as %2B', 'c%2B%2B/user-123/cv.pdf', 'c++/user-123/cv.pdf'],
      ['a literal % encoded as %25', '100%25/user-123/cv.pdf', '100%/user-123/cv.pdf'],
      ['non-ASCII characters', 'r%C3%A9sum%C3%A9/user-123/cv.pdf', 'résumé/user-123/cv.pdf'],
      ['a plain key', 'resume/user-123/cv.pdf', 'resume/user-123/cv.pdf'],
    ])('decodes %s before lookup and validation', async (_label, eventKey, storedKey) => {
      await main(createMockS3Event(eventKey), {} as Context, jest.fn());

      expect(MediaRepository.prototype.get).toHaveBeenCalledWith(storedKey);
      expect(MediaRepository.prototype.validate).toHaveBeenCalledWith(storedKey);
    });

    it('skips a malformed key and keeps processing the batch', async () => {
      const event = createMockS3Event('bad%E0%A4%A/user-123/cv.pdf');
      event.Records.push(createMockS3Event('ok/user-123/cv.pdf').Records[0]);

      await expect(main(event, {} as Context, jest.fn())).resolves.toBeUndefined();

      expect(MediaRepository.prototype.get).toHaveBeenCalledTimes(1);
      expect(MediaRepository.prototype.get).toHaveBeenCalledWith('ok/user-123/cv.pdf');
    });
  });
});
