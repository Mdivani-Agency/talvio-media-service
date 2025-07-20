export const S3EventHandler = {
  handler: 'src/functions/s3-event-handler/handler.main',
  events: [
    {
      s3: {
        bucket: '${self:custom.${self:provider.stage}.bucketName}',
      },
    },
  ],
};
