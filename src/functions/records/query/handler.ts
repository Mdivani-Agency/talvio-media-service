import { publicValidationMiddleware, authorizationMiddleware } from '@lib/middlewares';
import { MiddyApiGWEvent } from '@lib/types';
import { mediaService } from '@lib/services';
import { schema } from './schema';

const queryRecords = async (
  event: MiddyApiGWEvent<null, { userId: string }, { limit?: string; nextToken?: string }>,
) => {
  const { userId } = event.pathParameters;
  const { limit, nextToken } = event.queryStringParameters || {};

  const { items, nextToken: nextTokenFromDb } = await mediaService.queryUserMedia(
    userId,
    Number(limit) || 50,
    nextToken,
  );

  return {
    statusCode: 200,
    body: JSON.stringify({ items, nextToken: nextTokenFromDb }),
  };
};

export const publicHandler = publicValidationMiddleware(schema, [authorizationMiddleware]).handler(
  queryRecords,
);
