import { Context } from 'aws-lambda';
import { mediaService } from '@lib/services';
import { MOCK_USER_ID, mockLambdaEvent } from '../../tests/mocks/common';
import { privateHandler, publicHandler } from './handler';

const MOCK_KEY = `resume/${MOCK_USER_ID}/cv.pdf`;
const MOCK_PRESIGNED_URL = 'https://s3.amazonaws.com/bucket/signed';

const eventFor = (body: Record<string, unknown>) =>
  mockLambdaEvent({ body, pathParameters: { userId: MOCK_USER_ID } });

describe('Get Presigned URL handlers', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    jest
      .spyOn(mediaService, 'getPresignedUrl')
      .mockResolvedValue({ presignedUrl: MOCK_PRESIGNED_URL });
  });

  describe('privateHandler', () => {
    it('returns a flat { presignedUrl } for a { key } body', async () => {
      const response = await privateHandler(eventFor({ key: MOCK_KEY }), {} as Context);

      expect(response.statusCode).toBe(200);
      expect(JSON.parse(response.body)).toEqual({ presignedUrl: MOCK_PRESIGNED_URL });
      expect(mediaService.getPresignedUrl).toHaveBeenCalledWith(MOCK_KEY);
    });

    it('signs any key, since the API key is trusted', async () => {
      const response = await privateHandler(
        eventFor({ key: 'resume/another-user/cv.pdf' }),
        {} as Context,
      );

      expect(response.statusCode).toBe(200);
      expect(mediaService.getPresignedUrl).toHaveBeenCalledWith('resume/another-user/cv.pdf');
    });

    it('rejects an upload-presign body that has no key', async () => {
      const response = await privateHandler(
        eventFor({ name: 'cv.pdf', type: 'application/pdf' }),
        {} as Context,
      );

      expect(response.statusCode).toBe(400);
      expect(mediaService.getPresignedUrl).not.toHaveBeenCalled();
    });
  });

  describe('publicHandler', () => {
    it('returns a flat { presignedUrl } for a key in the caller user folder', async () => {
      const response = await publicHandler(eventFor({ key: MOCK_KEY }), {} as Context);

      expect(response.statusCode).toBe(200);
      expect(JSON.parse(response.body)).toEqual({ presignedUrl: MOCK_PRESIGNED_URL });
      expect(mediaService.getPresignedUrl).toHaveBeenCalledWith(MOCK_KEY);
    });

    it("rejects another user's key with 403 and never signs it", async () => {
      const response = await publicHandler(
        eventFor({ key: 'resume/another-user/cv.pdf' }),
        {} as Context,
      );

      expect(response.statusCode).toBe(403);
      expect(mediaService.getPresignedUrl).not.toHaveBeenCalled();
    });

    it('rejects a path userId that does not match the token with 403', async () => {
      const event = mockLambdaEvent({
        body: { key: 'resume/another-user/cv.pdf' },
        pathParameters: { userId: 'another-user' },
      });

      const response = await publicHandler(event, {} as Context);

      expect(response.statusCode).toBe(403);
      expect(mediaService.getPresignedUrl).not.toHaveBeenCalled();
    });
  });
});
