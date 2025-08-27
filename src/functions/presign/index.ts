export const privatePresign = {
  handler: 'src/functions/presign/handler.privateHandler',
  events: [
    {
      http: {
        method: 'post',
        path: 'private/{userId}/presign',
        private: true,
      },
    },
  ],
  timeout: 29,
};

export const publicPresign = {
  handler: 'src/functions/presign/handler.publicHandler',
  events: [
    {
      http: {
        method: 'post',
        path: 'public/{userId}/presign',
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
