import httpError from 'http-errors';
import { privateValidationMiddleware } from '@lib/middlewares';
import { MiddyApiGWEvent, PresignRequest } from '@lib/types';
import { mediaService } from '@lib/services';
import { schema } from './schema';

const presign = async (event: MiddyApiGWEvent<PresignRequest, { userId: string }>) => {
  const { name, type, path } = event.body;
  const { userId } = event.pathParameters;

  try {
    const response = await mediaService.getPresignUrl({ name, type, path }, userId);
    return {
      statusCode: 200,
      body: JSON.stringify(response),
    };
  } catch (ex) {
    console.error('Failed to send emails', ex);
    throw new httpError.InternalServerError('Failed to send emails');
  }
};

export const main = privateValidationMiddleware(schema, []).handler(presign);
