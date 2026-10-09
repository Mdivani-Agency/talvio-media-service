import { supabaseJwtHttpAuthorizer } from '../../authorizer';

export const publicQueryMedia = {
  handler: 'src/functions/records/query/handler.publicHandler',
  events: [
    {
      http: {
        method: 'get',
        path: 'records/{userId}',
        cors: true,
        authorizer: supabaseJwtHttpAuthorizer,
      },
    },
    {
      http: {
        method: 'get',
        path: '{userId}/records',
        cors: true,
        authorizer: supabaseJwtHttpAuthorizer,
      },
    },
  ],
};
