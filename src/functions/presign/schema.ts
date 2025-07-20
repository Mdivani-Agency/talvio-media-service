import { transpileSchema } from '@middy/validator/transpile';

export const schema = {
  eventSchema: transpileSchema({
    type: 'object',
    required: ['body'],
    properties: {
      body: {
        required: ['name', 'type'],
        type: 'object',
        properties: {
          name: {
            type: 'string',
            minLength: 1,
          },
          type: {
            type: 'string',
            enum: ['image/jpeg', 'image/png', 'image/webp', 'application/pdf'],
          },
          path: {
            type: 'string',
          },
        },
      },
    },
  }),
};
