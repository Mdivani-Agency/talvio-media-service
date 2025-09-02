export const privateGetPresignedUrl = {
  handler: 'src/functions/presign/handler.privateHandler',
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
  handler: 'src/functions/presign/handler.publicHandler',
  events: [
    {
      http: {
        method: 'post',
        path: 'public/{userId}/get-presigned-url',
        cors: true,
        authorizer: {
          arn: 'arn:aws:lambda:${self:provider.region}:${aws:accountId}:function:auth-proxy-service-${self:provider.stage}-Authorizer',
          resultTtlInSeconds: 300,
        },
      },
    },
  ],
  timeout: 29,
};
