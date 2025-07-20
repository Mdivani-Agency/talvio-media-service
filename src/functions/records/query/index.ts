export const publicQueryMedia = {
  handler: 'src/functions/records/query/handler.publicHandler',
  events: [
    {
      http: {
        method: 'get',
        path: '{userId}/records',
        cors: true,
        authorizer: {
          arn: 'arn:aws:lambda:${self:provider.region}:${aws:accountId}:function:auth-service-${self:provider.stage}-restApiAuthorizer',
          resultTtlInSeconds: 300,
        },
      },
    },
  ],
};
