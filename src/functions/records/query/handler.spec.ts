import { Context } from 'aws-lambda';
import httpError from 'http-errors';
import { publicHandler } from './handler';
import { mediaService } from '@lib/services';
import { MediaItem } from '@lib/types';
import { MOCK_USER_ID, mockLambdaEvent } from '../../../tests/mocks/common';
import { MOCK_VALID_MEDIA_ITEM, MOCK_INVALID_MEDIA_ITEM } from '../../../tests/mocks/media';

const mockMediaItems: MediaItem[] = [
  MOCK_VALID_MEDIA_ITEM,
  MOCK_INVALID_MEDIA_ITEM,
  {
    ...MOCK_VALID_MEDIA_ITEM,
    key: 'resume/user-123/document.pdf',
    name: 'document.pdf',
    type: 'application/pdf',
  },
];

const mockQueryResponse = {
  items: mockMediaItems,
  nextToken: 'next-page-token',
};

describe('Public Handler - Records Query Handler Integration Tests', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    jest.spyOn(mediaService, 'queryUserMedia').mockResolvedValue(mockQueryResponse);
  });

  describe('Successful requests', () => {
    it('should return 200 with media items for valid request', async () => {
      // Arrange
      const event = mockLambdaEvent({
        pathParameters: { userId: MOCK_USER_ID },
        queryStringParameters: { limit: '50' },
      });

      // Act
      const result = await publicHandler(event, {} as Context);

      // Assert
      expect(result.statusCode).toBe(200);
      expect(JSON.parse(result.body)).toEqual(mockQueryResponse);
      expect(mediaService.queryUserMedia).toHaveBeenCalledWith(MOCK_USER_ID, 50, undefined);
    });

    it('should return 200 with default limit when limit not provided', async () => {
      // Arrange
      const event = mockLambdaEvent({
        pathParameters: { userId: MOCK_USER_ID },
      });

      // Act
      const result = await publicHandler(event, {} as Context);

      // Assert
      expect(result.statusCode).toBe(200);
      expect(JSON.parse(result.body)).toEqual(mockQueryResponse);
      expect(mediaService.queryUserMedia).toHaveBeenCalledWith(MOCK_USER_ID, 50, undefined);
    });

    it('should handle custom limit values', async () => {
      // Arrange
      const event = mockLambdaEvent({
        pathParameters: { userId: MOCK_USER_ID },
        queryStringParameters: { limit: '100' },
      });

      // Act
      const result = await publicHandler(event, {} as Context);

      // Assert
      expect(result.statusCode).toBe(200);
      expect(mediaService.queryUserMedia).toHaveBeenCalledWith(MOCK_USER_ID, 100, undefined);
    });

    it('should handle nextToken parameter', async () => {
      // Arrange
      const nextToken = 'next-page-token';
      const event = mockLambdaEvent({
        pathParameters: { userId: MOCK_USER_ID },
        queryStringParameters: { limit: '50', nextToken },
      });

      // Act
      const result = await publicHandler(event, {} as Context);

      // Assert
      expect(result.statusCode).toBe(200);
      expect(mediaService.queryUserMedia).toHaveBeenCalledWith(MOCK_USER_ID, 50, nextToken);
    });

    it('should handle empty result set', async () => {
      // Arrange
      const emptyResponse = { items: [], nextToken: undefined };
      jest.spyOn(mediaService, 'queryUserMedia').mockResolvedValueOnce(emptyResponse);

      const event = mockLambdaEvent({
        pathParameters: { userId: MOCK_USER_ID },
        queryStringParameters: { limit: '50' },
      });

      // Act
      const result = await publicHandler(event, {} as Context);

      // Assert
      expect(result.statusCode).toBe(200);
      expect(JSON.parse(result.body)).toEqual(emptyResponse);
    });

    it('should handle response without nextToken', async () => {
      // Arrange
      const responseWithoutToken = { items: mockMediaItems, nextToken: undefined };
      jest.spyOn(mediaService, 'queryUserMedia').mockResolvedValueOnce(responseWithoutToken);

      const event = mockLambdaEvent({
        pathParameters: { userId: MOCK_USER_ID },
        queryStringParameters: { limit: '50' },
      });

      // Act
      const result = await publicHandler(event, {} as Context);

      // Assert
      expect(result.statusCode).toBe(200);
      expect(JSON.parse(result.body)).toEqual(responseWithoutToken);
    });
  });

  describe('Validation errors', () => {
    it('should return 400 when userId is missing', async () => {
      // Arrange
      const event = mockLambdaEvent({
        pathParameters: {},
        queryStringParameters: { limit: '50' },
      });

      // Act
      const result = await publicHandler(event, {} as Context);

      // Assert
      expect(result.statusCode).toBe(400);
      expect(result.body).toBe(
        JSON.stringify({ error: true, message: 'Event object failed validation' }),
      );
    });

    it('should return 400 when pathParameters is missing', async () => {
      // Arrange
      const event = mockLambdaEvent({
        queryStringParameters: { limit: '50' },
      });

      // Act
      const result = await publicHandler(event, {} as Context);

      // Assert
      expect(result.statusCode).toBe(400);
      expect(result.body).toBe(
        JSON.stringify({ error: true, message: 'Event object failed validation' }),
      );
    });

    it('should return 400 when limit is not in allowed enum values', async () => {
      // Arrange
      const event = mockLambdaEvent({
        pathParameters: { userId: MOCK_USER_ID },
        queryStringParameters: { limit: '25' },
      });

      // Act
      const result = await publicHandler(event, {} as Context);

      // Assert
      expect(result.statusCode).toBe(400);
      expect(result.body).toBe(
        JSON.stringify({ error: true, message: 'Event object failed validation' }),
      );
    });

    it('should accept all valid limit values', async () => {
      const validLimits = ['50', '100', '200'];

      for (const limit of validLimits) {
        // Arrange
        const event = mockLambdaEvent({
          pathParameters: { userId: MOCK_USER_ID },
          queryStringParameters: { limit },
        });

        // Act
        const result = await publicHandler(event, {} as Context);

        // Assert
        expect(result.statusCode).toBe(200);
        expect(mediaService.queryUserMedia).toHaveBeenCalledWith(
          MOCK_USER_ID,
          Number(limit),
          undefined,
        );
      }
    });

    it('should handle empty queryStringParameters', async () => {
      // Arrange
      const event = mockLambdaEvent({
        pathParameters: { userId: MOCK_USER_ID },
        queryStringParameters: {},
      });

      // Act
      const result = await publicHandler(event, {} as Context);

      // Assert
      expect(result.statusCode).toBe(200);
      expect(mediaService.queryUserMedia).toHaveBeenCalledWith(MOCK_USER_ID, 50, undefined);
    });
  });

  describe('Service errors', () => {
    it('should return 500 when media service throws an error', async () => {
      // Arrange
      jest.spyOn(mediaService, 'queryUserMedia').mockRejectedValue(new Error('Database error'));

      const event = mockLambdaEvent({
        pathParameters: { userId: MOCK_USER_ID },
        queryStringParameters: { limit: '50' },
      });

      // Act
      const result = await publicHandler(event, {} as Context);

      // Assert
      expect(result.statusCode).toBe(500);
      expect(result.body).toBe(JSON.stringify({ error: true, message: 'Internal Server Error' }));
    });

    it('should return 500 when media service throws InternalServerError', async () => {
      // Arrange
      jest
        .spyOn(mediaService, 'queryUserMedia')
        .mockRejectedValue(new httpError.InternalServerError('Database connection failed'));

      const event = mockLambdaEvent({
        pathParameters: { userId: MOCK_USER_ID },
        queryStringParameters: { limit: '50' },
      });

      // Act
      const result = await publicHandler(event, {} as Context);

      // Assert
      expect(result.statusCode).toBe(500);
      expect(result.body).toBe(JSON.stringify({ error: true, message: 'Internal Server Error' }));
    });
  });

  describe('Edge cases', () => {
    it('should handle very long nextToken', async () => {
      // Arrange
      const longToken = 'a'.repeat(1000);
      const event = mockLambdaEvent({
        pathParameters: { userId: MOCK_USER_ID },
        queryStringParameters: { limit: '50', nextToken: longToken },
      });

      // Act
      const result = await publicHandler(event, {} as Context);

      // Assert
      expect(result.statusCode).toBe(200);
      expect(mediaService.queryUserMedia).toHaveBeenCalledWith(MOCK_USER_ID, 50, longToken);
    });
  });
});
