import { Context } from 'aws-lambda';
import { mediaService } from '@lib/services';
import { MOCK_USER_ID, mockLambdaEvent } from '../../tests/mocks/common';
import { privateHandler } from './handler';

const MOCK_KEY = `resume/${MOCK_USER_ID}/cv.pdf`;

describe('Private Handler - Get Presigned URL', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    jest
      .spyOn(mediaService, 'getPresignedUrl')
      .mockResolvedValue({ presignedUrl: 'https://s3.amazonaws.com/bucket/signed' });
  });

  it('accepts a { key } body and asks the service for a download URL', async () => {
    const event = mockLambdaEvent({
      body: { key: MOCK_KEY },
      pathParameters: { userId: MOCK_USER_ID },
    });

    const response = await privateHandler(event, {} as Context);

    expect(response.statusCode).toBe(200);
    expect(mediaService.getPresignedUrl).toHaveBeenCalledWith(MOCK_KEY);
  });

  it('rejects an upload-presign body that has no key', async () => {
    const event = mockLambdaEvent({
      body: { name: 'cv.pdf', type: 'application/pdf' },
      pathParameters: { userId: MOCK_USER_ID },
    });

    const response = await privateHandler(event, {} as Context);

    expect(response.statusCode).toBe(400);
    expect(mediaService.getPresignedUrl).not.toHaveBeenCalled();
  });
});
