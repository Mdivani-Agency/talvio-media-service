import httpError from 'http-errors';
import {
  authorizationMiddleware,
  privateValidationMiddleware,
  publicValidationMiddleware,
} from '@lib/middlewares';
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
    console.error('Failed to generate presigned url', ex);
    throw new httpError.InternalServerError('Failed to generate presigned url');
  }
};

export const privateHandler = privateValidationMiddleware(schema, []).handler(presign);
export const publicHandler = publicValidationMiddleware(schema, [authorizationMiddleware]).handler(
  presign,
);
