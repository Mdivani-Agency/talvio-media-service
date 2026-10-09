import { isKeyOwnedBy, keyOwnershipMiddleware } from './key-ownership.middleware';

const USER_ID = 'user-123';

const before = keyOwnershipMiddleware.before as (_request: never) => Promise<void>;

const run = (key: string, sub?: string) =>
  before({
    event: {
      body: { key },
      requestContext: { authorizer: sub ? { sub } : undefined },
    },
  } as never);

describe('isKeyOwnedBy', () => {
  it.each([
    ['a key with a path', `resume/${USER_ID}/cv.pdf`],
    ['a key with a nested path', `a/b/${USER_ID}/cv.pdf`],
    ['a key without a path', `${USER_ID}/cv.pdf`],
  ])('accepts %s', (_label, key) => {
    expect(isKeyOwnedBy(key, USER_ID)).toBe(true);
  });

  it.each([
    ["another user's key", 'resume/user-456/cv.pdf'],
    ['the user ID used as a path prefix', `${USER_ID}/user-456/cv.pdf`],
    ['the user ID as the file name', `resume/${USER_ID}`],
    ['a bare file name', 'cv.pdf'],
    ['a user ID that only shares a prefix', `resume/${USER_ID}0/cv.pdf`],
  ])('rejects %s', (_label, key) => {
    expect(isKeyOwnedBy(key, USER_ID)).toBe(false);
  });
});

describe('keyOwnershipMiddleware', () => {
  it('lets a key under the caller user folder through', async () => {
    await expect(run(`resume/${USER_ID}/cv.pdf`, USER_ID)).resolves.toBeUndefined();
  });

  it("rejects another user's key with 403", async () => {
    await expect(run('resume/user-456/cv.pdf', USER_ID)).rejects.toMatchObject({ statusCode: 403 });
  });

  it('rejects a request without an authorizer with 403', async () => {
    await expect(run(`resume/${USER_ID}/cv.pdf`)).rejects.toMatchObject({ statusCode: 403 });
  });
});
