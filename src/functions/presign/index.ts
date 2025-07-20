export const presign = {
  handler: 'src/functions/presign/handler.main',
  events: [
    {
      http: {
        method: 'post',
        path: 'private/{userId}/presign',
        private: true,
      },
    },
  ],
};
