import middy from '@middy/core';
import { APIGatewayProxyResult } from 'aws-lambda';
import httpError from 'http-errors';
import { MiddyApiGWEvent } from '../types';

/**
 * Presigned uploads are stored at `[path/]{userId}/{file}`, so the owner is the
 * segment just before the file name.
 */
export const isKeyOwnedBy = (key: string, userId: string): boolean => {
  const segments = key.split('/');
  return segments.length >= 2 && segments[segments.length - 2] === userId;
};

export const keyOwnershipMiddleware: middy.MiddlewareObj<
  MiddyApiGWEvent<{ key: string }, unknown, unknown>,
  APIGatewayProxyResult
> = {
  before: async ({ event }) => {
    const sub = event.requestContext.authorizer?.sub;

    if (!sub || !isKeyOwnedBy(event.body.key, sub)) throw httpError.Forbidden('Unauthorized');
  },
};
