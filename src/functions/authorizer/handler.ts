import type {
  APIGatewayAuthorizerResult,
  APIGatewayTokenAuthorizerEvent,
  StatementEffect,
} from 'aws-lambda';
import * as jose from 'jose';
import type { JWTVerifyGetKey } from 'jose';

const UNAUTHORIZED = 'Unauthorized';

let remoteJwks: JWTVerifyGetKey | undefined;
let remoteJwksUrl: string | undefined;

const normalizeSupabaseUrl = (value?: string) => value?.replace(/\/$/, '');

const getRemoteJwks = (supabaseUrl: string): JWTVerifyGetKey => {
  if (!remoteJwks || remoteJwksUrl !== supabaseUrl) {
    remoteJwksUrl = supabaseUrl;
    remoteJwks = jose.createRemoteJWKSet(new URL(`${supabaseUrl}/auth/v1/.well-known/jwks.json`));
  }
  return remoteJwks;
};

export const resetAuthorizerJwksCache = () => {
  remoteJwks = undefined;
  remoteJwksUrl = undefined;
};

export const verifySupabaseAccessToken = async (
  token: string,
  deps: { jwks?: JWTVerifyGetKey; supabaseUrl?: string } = {},
): Promise<string> => {
  const supabaseUrl = normalizeSupabaseUrl(deps.supabaseUrl ?? process.env.SUPABASE_URL);
  if (!supabaseUrl) {
    throw new Error(UNAUTHORIZED);
  }

  const { payload } = await jose.jwtVerify(token, deps.jwks ?? getRemoteJwks(supabaseUrl), {
    issuer: `${supabaseUrl}/auth/v1`,
    audience: 'authenticated',
  });

  if (!payload.sub) {
    throw new Error(UNAUTHORIZED);
  }

  return payload.sub;
};

const extractBearerToken = (authorizationToken?: string) => {
  if (!authorizationToken) {
    throw new Error(UNAUTHORIZED);
  }

  const [scheme, token] = authorizationToken.split(' ');
  if (scheme?.toLowerCase() !== 'bearer' || !token) {
    throw new Error(UNAUTHORIZED);
  }

  return token;
};

const allowPolicy = (sub: string, methodArn: string): APIGatewayAuthorizerResult => ({
  principalId: sub,
  policyDocument: {
    Version: '2012-10-17',
    Statement: [
      {
        Action: 'execute-api:Invoke',
        Effect: 'Allow' as StatementEffect,
        Resource: methodArn,
      },
    ],
  },
  context: { sub },
});

export const main = async (
  event: APIGatewayTokenAuthorizerEvent,
): Promise<APIGatewayAuthorizerResult> => {
  try {
    const sub = await verifySupabaseAccessToken(extractBearerToken(event.authorizationToken));
    return allowPolicy(sub, event.methodArn);
  } catch {
    throw new Error(UNAUTHORIZED);
  }
};
