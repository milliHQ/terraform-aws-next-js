import { resolveRouteParameters } from '../src/util/resolve-route-parameters';

describe('resolve route parameters', () => {
  test('resolve numbered param', () => {
    const matcher = new RegExp('^\\/docs(?:\\/([^\\/]+?))$', 'i');
    const match = matcher.exec('/docs/hello-world');

    expect(match).not.toBeNull();

    const keys = Object.keys(match!.groups ?? {});
    const result = resolveRouteParameters(
      'http://example.com/docs/$1',
      match!,
      keys
    );

    expect(result).toBe('http://example.com/docs/hello-world');
  });

  // Underscores in query params are valid
  // See: https://github.com/milliHQ/terraform-aws-next-js/issues/218
  test('resolve named param with underscore', () => {
    const matcher = new RegExp('^/users/(?<user_id>[^/]+?)(?:/)?$', 'i');
    const match = matcher.exec('/users/123');

    expect(match).not.toBeNull();

    const keys = Object.keys(match!.groups ?? {});
    const result = resolveRouteParameters(
      '/users/[user_id]?user_id=$user_id',
      match!,
      keys
    );

    expect(result).toBe('/users/[user_id]?user_id=123');
  });
});
