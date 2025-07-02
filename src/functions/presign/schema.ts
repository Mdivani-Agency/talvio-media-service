import { transpileSchema } from '@middy/validator/transpile';

export const schema = {
  eventSchema: transpileSchema({
    type: 'object',
    required: ['body'],
    properties: {
      body: {
        required: ['name', 'type', 'path'],
        type: 'object',
        properties: {
          name: {
            type: 'string',
          },
          type: {
            type: 'string',
            enum: ['image/jpeg', 'image/png', 'image/webp', 'application/pdf'],
          },
          path: {
            type: 'string',
            format: 'path',
          },
        },
      },
    },
  }),
};
