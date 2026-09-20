export const supabaseJwtHttpAuthorizer = {
  name: 'supabaseJwtAuthorizer',
  type: 'token' as const,
  identitySource: 'method.request.header.Authorization',
  resultTtlInSeconds: 30,
};

export const supabaseJwtAuthorizer = {
  handler: 'src/functions/authorizer/handler.main',
};
