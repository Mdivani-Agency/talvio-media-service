import { supabaseJwtHttpAuthorizer } from '../../authorizer';
import { publicQueryMedia } from './index';

describe('records HTTP contract (MDI-351)', () => {
  it('exposes the documented GET /records/{userId} behind the Supabase JWT authorizer', () => {
    const event = publicQueryMedia.events.find((item) => item.http.path === 'records/{userId}');

    expect(event?.http).toEqual({
      method: 'get',
      path: 'records/{userId}',
      cors: true,
      authorizer: supabaseJwtHttpAuthorizer,
    });
  });

  it('keeps the {userId}/records alias on the same authorizer', () => {
    expect(publicQueryMedia.events.map((item) => item.http.path)).toEqual([
      'records/{userId}',
      '{userId}/records',
    ]);
    publicQueryMedia.events.forEach((item) => {
      expect(item.http).toMatchObject({ method: 'get', authorizer: supabaseJwtHttpAuthorizer });
    });
  });
});
