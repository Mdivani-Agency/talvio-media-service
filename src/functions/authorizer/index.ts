export const supabaseJwtHttpAuthorizer = {
  name: 'supabaseJwtAuthorizer',
  type: 'token' as const,
  identitySource: 'method.request.header.Authorization',
  // TOKEN cache key is the Authorization header only. Policy must cover every
  // method on the stage (see stageInvokeResource) so TTL can stay on.
  // https://docs.aws.amazon.com/apigateway/latest/developerguide/apigateway-use-lambda-authorizer.html
  resultTtlInSeconds: 30,
};

export const supabaseJwtAuthorizer = {
  handler: 'src/functions/authorizer/handler.main',
};
