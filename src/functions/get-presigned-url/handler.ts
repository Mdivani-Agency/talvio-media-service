import { authorizationMiddleware } from '@lib/middlewares/authorization.middleware';
import {
  privateValidationMiddleware,
  publicValidationMiddleware,
} from '@lib/middlewares/common.middleware';
import { mediaService } from '@lib/services/media.service';
import { MiddyApiGWEvent } from '@lib/types';
import { schema } from './schema';

export const main = async (event: MiddyApiGWEvent<{ key: string }>) => {
  const { key } = event.body;

  const presignedUrl = await mediaService.getPresignedUrl(key);

  return {
    statusCode: 200,
    body: JSON.stringify({ urL: presignedUrl }),
  };
};

export const privateHandler = privateValidationMiddleware(schema, []).handler(main);
export const publicHandler = publicValidationMiddleware(schema, [authorizationMiddleware]).handler(
  main,
);
