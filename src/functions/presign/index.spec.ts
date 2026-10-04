import { privatePresign, publicPresign } from './index';

describe('presign HTTP contract (MDI-188)', () => {
  it('exposes POST /presign/{userId} as a private API-key route', () => {
    const event = privatePresign.events.find((item) => item.http.path === 'presign/{userId}');

    expect(event).toMatchObject({
      http: {
        method: 'post',
        path: 'presign/{userId}',
        private: true,
      },
    });
  });

  it('keeps the private/ and public/ aliases', () => {
    expect(privatePresign.events.map((item) => item.http.path)).toEqual([
      'presign/{userId}',
      'private/{userId}/presign',
    ]);
    expect(publicPresign.events[0].http).toMatchObject({
      method: 'post',
      path: 'public/{userId}/presign',
    });
  });
});
