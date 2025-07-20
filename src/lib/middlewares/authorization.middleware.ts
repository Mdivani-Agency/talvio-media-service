import middy from '@middy/core';
import { APIGatewayProxyResult } from 'aws-lambda';
import httpError from 'http-errors';
import { MiddyApiGWEvent } from '../types';

export const authorizationMiddleware: middy.MiddlewareObj<
  MiddyApiGWEvent<unknown, { userId: string }, unknown>,
  APIGatewayProxyResult
> = {
  before: async ({ event }) => {
    const { userId } = event.pathParameters;
    const { authorizer } = event.requestContext;

    if (!authorizer) throw httpError.Forbidden('Unauthorized');

    if (userId !== authorizer.sub) throw httpError.Forbidden('Unauthorized');
  },
};
