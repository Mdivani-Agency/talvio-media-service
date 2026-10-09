import { existsSync } from 'fs';
import path from 'path';
import { supabaseJwtHttpAuthorizer } from '../authorizer';
import * as getPresignedUrlHandlers from './handler';
import { privateGetPresignedUrl, publicGetPresignedUrl } from './index';

const repoRoot = path.resolve(__dirname, '../../..');

const resolveHandler = (handler: string) => {
  const [file, exportName] = handler.split(/\.(?=[^.]+$)/);
  return { file: path.join(repoRoot, `${file}.ts`), exportName };
};

describe('get-presigned-url HTTP contract (MDI-354)', () => {
  it.each([
    ['private', privateGetPresignedUrl, 'privateHandler'],
    ['public', publicGetPresignedUrl, 'publicHandler'],
  ] as const)('points the %s route at its own get-presigned-url handler', (_label, fn, name) => {
    const { file, exportName } = resolveHandler(fn.handler);

    expect(fn.handler).toBe(`src/functions/get-presigned-url/handler.${name}`);
    expect(existsSync(file)).toBe(true);
    expect(exportName).toBe(name);
    expect(typeof getPresignedUrlHandlers[name]).toBe('function');
  });

  it('keeps the private route behind the API key and the public route behind the JWT authorizer', () => {
    expect(privateGetPresignedUrl.events[0].http).toMatchObject({
      method: 'post',
      path: 'private/{userId}/get-presigned-url',
      private: true,
    });
    expect(publicGetPresignedUrl.events[0].http).toMatchObject({
      method: 'post',
      path: 'public/{userId}/get-presigned-url',
      authorizer: supabaseJwtHttpAuthorizer,
    });
  });
});
