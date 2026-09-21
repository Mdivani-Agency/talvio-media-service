import { generateKeyPair, exportJWK, SignJWT, createLocalJWKSet, type KeyLike } from 'jose';
import type { APIGatewayTokenAuthorizerEvent } from 'aws-lambda';
import * as jose from 'jose';
import {
  main,
  resetAuthorizerJwksCache,
  stageInvokeResource,
  verifySupabaseAccessToken,
} from './handler';

const SUPABASE_URL = 'https://example.supabase.co';
const METHOD_ARN = 'arn:aws:execute-api:us-west-1:123456789012:abcdef123/dev/GET/user-123/records';
const STAGE_ARN = 'arn:aws:execute-api:us-west-1:123456789012:abcdef123/dev/*/*';

describe('supabase JWT authorizer', () => {
  const originalSupabaseUrl = process.env.SUPABASE_URL;
  let privateKey: KeyLike;
  let jwks: ReturnType<typeof createLocalJWKSet>;

  const signToken = (overrides?: {
    sub?: string;
    iss?: string;
    aud?: string;
    exp?: string | number;
    omitSub?: boolean;
  }) => {
    const jwt = new SignJWT({})
      .setProtectedHeader({ alg: 'RS256', kid: 'test-key' })
      .setIssuedAt()
      .setExpirationTime(overrides?.exp ?? '5m')
      .setIssuer(overrides?.iss ?? `${SUPABASE_URL}/auth/v1`)
      .setAudience(overrides?.aud ?? 'authenticated');

    if (!overrides?.omitSub) {
      jwt.setSubject(overrides?.sub ?? 'user-123');
    }

    return jwt.sign(privateKey);
  };

  const authorizerEvent = (authorizationToken?: string): APIGatewayTokenAuthorizerEvent => ({
    type: 'TOKEN',
    authorizationToken: authorizationToken ?? '',
    methodArn: METHOD_ARN,
  });

  beforeAll(async () => {
    const keys = await generateKeyPair('RS256', { extractable: true });
    privateKey = keys.privateKey;
    const jwk = await exportJWK(keys.publicKey);
    jwk.kid = 'test-key';
    jwk.alg = 'RS256';
    jwk.use = 'sig';
    jwks = createLocalJWKSet({ keys: [jwk] });
  });

  beforeEach(() => {
    process.env.SUPABASE_URL = SUPABASE_URL;
    resetAuthorizerJwksCache();
    jest
      .spyOn(jose, 'createRemoteJWKSet')
      .mockReturnValue(jwks as unknown as ReturnType<typeof jose.createRemoteJWKSet>);
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  afterAll(() => {
    process.env.SUPABASE_URL = originalSupabaseUrl;
    resetAuthorizerJwksCache();
  });

  describe('verifySupabaseAccessToken', () => {
    it('returns sub for a valid Supabase access token', async () => {
      const token = await signToken();
      await expect(verifySupabaseAccessToken(token, { jwks })).resolves.toBe('user-123');
    });

    it('rejects an expired token', async () => {
      const token = await signToken({ exp: Math.floor(Date.now() / 1000) - 30 });
      await expect(verifySupabaseAccessToken(token, { jwks })).rejects.toThrow();
    });

    it('rejects a token with the wrong issuer', async () => {
      const token = await signToken({ iss: 'https://other.supabase.co/auth/v1' });
      await expect(verifySupabaseAccessToken(token, { jwks })).rejects.toThrow();
    });

    it('rejects a token without sub', async () => {
      const token = await signToken({ omitSub: true });
      await expect(verifySupabaseAccessToken(token, { jwks })).rejects.toThrow('Unauthorized');
    });

    it('rejects when SUPABASE_URL is missing', async () => {
      const token = await signToken();
      await expect(verifySupabaseAccessToken(token, { jwks, supabaseUrl: '' })).rejects.toThrow(
        'Unauthorized',
      );
    });
  });

  describe('main', () => {
    it('allows a valid Bearer token and puts sub on the context', async () => {
      const token = await signToken();
      const result = await main(authorizerEvent(`Bearer ${token}`));

      expect(result.principalId).toBe('user-123');
      expect(result.context).toEqual({ sub: 'user-123' });
      expect(result.policyDocument.Statement[0]).toMatchObject({
        Effect: 'Allow',
        Resource: STAGE_ARN,
      });
    });

    it('allows every method on the stage so a cached token is not route-specific', () => {
      expect(
        stageInvokeResource(
          'arn:aws:execute-api:us-west-1:123456789012:abcdef123/dev/POST/public/user-123/presign',
        ),
      ).toBe(STAGE_ARN);
    });

    it('throws Unauthorized when Authorization is missing', async () => {
      await expect(main(authorizerEvent())).rejects.toThrow('Unauthorized');
    });

    it('throws Unauthorized when the scheme is not Bearer', async () => {
      await expect(main(authorizerEvent('Basic abc'))).rejects.toThrow('Unauthorized');
    });

    it('throws Unauthorized for an expired token', async () => {
      const token = await signToken({ exp: Math.floor(Date.now() / 1000) - 30 });
      await expect(main(authorizerEvent(`Bearer ${token}`))).rejects.toThrow('Unauthorized');
    });

    it('throws Unauthorized for the wrong issuer', async () => {
      const token = await signToken({ iss: 'https://other.supabase.co/auth/v1' });
      await expect(main(authorizerEvent(`Bearer ${token}`))).rejects.toThrow('Unauthorized');
    });
  });
});
