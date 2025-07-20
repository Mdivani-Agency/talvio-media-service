import { transpileSchema } from '@middy/validator/transpile';

export const schema = {
  eventSchema: transpileSchema({
    type: 'object',
    required: ['pathParameters'],
    properties: {
      pathParameters: {
        required: ['userId'],
        type: 'object',
        properties: {
          userId: {
            type: 'string',
          },
        },
      },
      queryStringParameters: {
        type: 'object',
        default: {
          limit: '50',
        },
        properties: {
          limit: {
            type: 'string',
            enum: ['50', '100', '200'],
            default: '50',
          },
          nextToken: {
            type: 'string',
          },
        },
      },
    },
  }),
};
