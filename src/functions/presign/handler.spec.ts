import { Context } from 'aws-lambda';
import httpError from 'http-errors';
import { privateHandler } from './handler';
import { mediaService } from '@lib/services';
import { PresignResponse } from '@lib/types';
import { MOCK_USER_ID, mockLambdaEvent } from '../../tests/mocks/common';

const mockPresignResponse: PresignResponse = {
  uploadUrl: 'https://s3.amazonaws.com/bucket/presigned-url',
  publicUrl: 'https://media-service-dev.s3.us-west-1.amazonaws.com/test-file.jpg',
};

describe('Private Handler - Presign Handler Integration Tests', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    jest.spyOn(mediaService, 'getPresignUrl').mockResolvedValue(mockPresignResponse);
  });

  describe('Successful requests', () => {
    it('should return 200 with presign response for valid request', async () => {
      // Arrange
      const validBody = {
        name: 'test-file.jpg',
        type: 'image/jpeg',
        path: 'uploads',
      };
      const event = mockLambdaEvent({ body: validBody, pathParameters: { userId: MOCK_USER_ID } });

      // Act
      const result = await privateHandler(event, {} as Context);

      // Assert
      expect(result.statusCode).toBe(200);
      expect(JSON.parse(result.body)).toEqual(mockPresignResponse);
      expect(mediaService.getPresignUrl).toHaveBeenCalledWith(
        {
          name: 'test-file.jpg',
          type: 'image/jpeg',
          path: 'uploads',
        },
        MOCK_USER_ID,
      );
    });

    it('should return 200 for request without path', async () => {
      // Arrange
      const validBody = {
        name: 'document.pdf',
        type: 'application/pdf',
      };
      const event = mockLambdaEvent({ body: validBody, pathParameters: { userId: MOCK_USER_ID } });

      // Act
      const result = await privateHandler(event, {} as Context);

      // Assert
      expect(result.statusCode).toBe(200);
      expect(JSON.parse(result.body)).toEqual(mockPresignResponse);
      expect(mediaService.getPresignUrl).toHaveBeenCalledWith(
        {
          name: 'document.pdf',
          type: 'application/pdf',
          path: undefined,
        },
        MOCK_USER_ID,
      );
    });

    it('should handle file names with spaces and special characters', async () => {
      // Arrange
      const validBody = {
        name: 'My Resume 2024.pdf',
        type: 'application/pdf',
        path: 'documents',
      };
      const event = mockLambdaEvent({ body: validBody, pathParameters: { userId: MOCK_USER_ID } });

      // Act
      const result = await privateHandler(event, {} as Context);

      // Assert
      expect(result.statusCode).toBe(200);
      expect(mediaService.getPresignUrl).toHaveBeenCalledWith(
        {
          name: 'My Resume 2024.pdf',
          type: 'application/pdf',
          path: 'documents',
        },
        MOCK_USER_ID,
      );
    });
  });

  describe('Validation errors', () => {
    it('should return 400 when body is missing', async () => {
      // Arrange
      const event = mockLambdaEvent({ pathParameters: { userId: MOCK_USER_ID } });

      const response = await privateHandler(event, {} as Context);

      // Act & Assert
      expect(response.statusCode).toBe(400);
      expect(response.body).toBe(
        JSON.stringify({ error: true, message: 'Event object failed validation' }),
      );
    });

    it('should return 400 when name is missing', async () => {
      // Arrange
      const invalidBody = {
        type: 'image/jpeg',
        path: 'uploads',
      };
      const event = mockLambdaEvent({
        body: invalidBody,
        pathParameters: { userId: MOCK_USER_ID },
      });

      const response = await privateHandler(event, {} as Context);

      // Act & Assert
      expect(response.statusCode).toBe(400);
      expect(response.body).toBe(
        JSON.stringify({ error: true, message: 'Event object failed validation' }),
      );
    });

    it('should return 400 when type is missing', async () => {
      // Arrange
      const invalidBody = {
        name: 'test.jpg',
        path: 'uploads',
      };
      const event = mockLambdaEvent({
        body: invalidBody,
        pathParameters: { userId: MOCK_USER_ID },
      });

      const response = await privateHandler(event, {} as Context);

      // Act & Assert
      expect(response.statusCode).toBe(400);
      expect(response.body).toBe(
        JSON.stringify({ error: true, message: 'Event object failed validation' }),
      );
    });

    it('should return 400 when type is not in allowed enum values', async () => {
      // Arrange
      const invalidBody = {
        name: 'test.txt',
        type: 'text/plain',
        path: 'uploads',
      };
      const event = mockLambdaEvent({
        body: invalidBody,
        pathParameters: { userId: MOCK_USER_ID },
      });

      const response = await privateHandler(event, {} as Context);

      // Act & Assert
      expect(response.statusCode).toBe(400);
      expect(response.body).toBe(
        JSON.stringify({ error: true, message: 'Event object failed validation' }),
      );
    });

    it('should return 400 when type is not a string', async () => {
      // Arrange
      const invalidBody = {
        name: 'test.jpg',
        type: 123,
        path: 'uploads',
      };
      const event = mockLambdaEvent({
        body: invalidBody,
        pathParameters: { userId: MOCK_USER_ID },
      });

      const response = await privateHandler(event, {} as Context);

      // Act & Assert
      expect(response.statusCode).toBe(400);
      expect(response.body).toBe(
        JSON.stringify({ error: true, message: 'Event object failed validation' }),
      );
    });

    it('should accept all valid content types', async () => {
      const validTypes = ['image/jpeg', 'image/png', 'image/webp', 'application/pdf'];

      for (const type of validTypes) {
        // Arrange
        const validBody = {
          name: 'test.jpg',
          type,
          path: 'uploads',
        };
        const event = mockLambdaEvent({
          body: validBody,
          pathParameters: { userId: MOCK_USER_ID },
        });

        // Act
        const result = await privateHandler(event, {} as Context);

        // Assert
        expect(result.statusCode).toBe(200);
        expect(mediaService.getPresignUrl).toHaveBeenCalledWith(
          {
            name: 'test.jpg',
            type,
            path: 'uploads',
          },
          MOCK_USER_ID,
        );
      }
    });
  });

  describe('Service errors', () => {
    it('should return 500 when media service throws an error', async () => {
      // Arrange
      const validBody = {
        name: 'test.jpg',
        type: 'image/jpeg',
        path: 'uploads',
      };
      const event = mockLambdaEvent({
        body: validBody,
        pathParameters: { userId: MOCK_USER_ID },
      });
      jest.spyOn(mediaService, 'getPresignUrl').mockRejectedValue(new Error('S3 service error'));

      const response = await privateHandler(event, {} as Context);

      // Act & Assert
      expect(response.statusCode).toBe(500);
      expect(response.body).toBe(JSON.stringify({ error: true, message: 'Internal Server Error' }));
    });

    it('should return 500 when media service throws InternalServerError', async () => {
      // Arrange
      const validBody = {
        name: 'test.jpg',
        type: 'image/jpeg',
        path: 'uploads',
      };
      const event = mockLambdaEvent({
        body: validBody,
        pathParameters: { userId: MOCK_USER_ID },
      });
      jest
        .spyOn(mediaService, 'getPresignUrl')
        .mockRejectedValue(new httpError.InternalServerError('Failed to generate presign url'));

      const response = await privateHandler(event, {} as Context);

      // Act & Assert
      expect(response.statusCode).toBe(500);
      expect(response.body).toBe(JSON.stringify({ error: true, message: 'Internal Server Error' }));
    });
  });

  describe('Edge cases', () => {
    it('should handle empty string values', async () => {
      // Arrange
      const invalidBody = {
        name: '',
        type: 'image/jpeg',
        path: 'uploads',
      };
      const event = mockLambdaEvent({
        body: invalidBody,
        pathParameters: { userId: MOCK_USER_ID },
      });

      // Act & Assert
      const response = await privateHandler(event, {} as Context);
      expect(response.statusCode).toBe(400);
      expect(response.body).toBe(
        JSON.stringify({ error: true, message: 'Event object failed validation' }),
      );
    });

    it('should handle very long file names', async () => {
      // Arrange
      const longName = 'a'.repeat(1000) + '.jpg';
      const validBody = {
        name: longName,
        type: 'image/jpeg',
        path: 'uploads',
      };
      const event = mockLambdaEvent({
        body: validBody,
        pathParameters: { userId: MOCK_USER_ID },
      });

      // Act
      const result = await privateHandler(event, {} as Context);

      // Assert
      expect(result.statusCode).toBe(200);
      expect(mediaService.getPresignUrl).toHaveBeenCalledWith(
        {
          name: longName,
          type: 'image/jpeg',
          path: 'uploads',
        },
        MOCK_USER_ID,
      );
    });

    it('should handle special characters in file names', async () => {
      // Arrange
      const validBody = {
        name: 'file@name#.jpg',
        type: 'image/jpeg',
        path: 'uploads',
      };
      const event = mockLambdaEvent({
        body: validBody,
        pathParameters: { userId: MOCK_USER_ID },
      });

      // Act
      const result = await privateHandler(event, {} as Context);

      // Assert
      expect(result.statusCode).toBe(200);
      expect(mediaService.getPresignUrl).toHaveBeenCalledWith(
        {
          name: 'file@name#.jpg',
          type: 'image/jpeg',
          path: 'uploads',
        },
        MOCK_USER_ID,
      );
    });
  });

  describe('Response format validation', () => {
    it('should return response with correct structure', async () => {
      // Arrange
      const validBody = {
        name: 'test.jpg',
        type: 'image/jpeg',
        path: 'uploads',
      };
      const event = mockLambdaEvent({
        body: validBody,
        pathParameters: { userId: MOCK_USER_ID },
      });
      jest.spyOn(mediaService, 'getPresignUrl').mockResolvedValue(mockPresignResponse);

      // Act
      const result = await privateHandler(event, {} as Context);

      // Assert
      expect(result).toHaveProperty('statusCode', 200);
      expect(result).toHaveProperty('body');

      const responseBody = JSON.parse(result.body);
      expect(responseBody).toHaveProperty('uploadUrl');
      expect(responseBody).toHaveProperty('publicUrl');
      expect(typeof responseBody.uploadUrl).toBe('string');
      expect(typeof responseBody.publicUrl).toBe('string');
    });
  });
});
