import { transpileSchema } from '@middy/validator/transpile';

export const schema = {
  eventSchema: transpileSchema({
    type: 'object',
    required: ['body'],
    properties: {
      body: {
        required: ['key'],
        type: 'object',
        properties: {
          key: {
            type: 'string',
            description: 'The key of the file to get the presigned URL for',
          },
        },
      },
    },
  }),
};
