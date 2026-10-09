import { supabaseJwtHttpAuthorizer } from '../authorizer';

export const privateGetPresignedUrl = {
  handler: 'src/functions/get-presigned-url/handler.privateHandler',
  events: [
    {
      http: {
        method: 'post',
        path: 'private/{userId}/get-presigned-url',
        private: true,
      },
    },
  ],
  timeout: 29,
};

export const publicGetPresignedUrl = {
  handler: 'src/functions/get-presigned-url/handler.publicHandler',
  events: [
    {
      http: {
        method: 'post',
        path: 'public/{userId}/get-presigned-url',
        cors: true,
        authorizer: supabaseJwtHttpAuthorizer,
      },
    },
  ],
  timeout: 29,
};
