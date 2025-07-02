export const presign = {
  handler: `src/functions/presign/handler.main`,
  events: [
    {
      http: {
        method: 'post',
        path: 'presign',
        private: true,
      },
    },
  ],
};
