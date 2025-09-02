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
            example: 'resume/user-123/my-resume-2024.pdf',
          },
        },
      },
    },
  }),
};
