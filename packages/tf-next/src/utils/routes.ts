import { Route } from '@vercel/routing-utils';

/**
 * Given an array of routes we filter routes out that start with
 * - `prefix`
 * - `/prefix`
 * - `^prefix`
 * - `^/prefix`
 */
export function removeRoutesByPrefix(routes: Route[], prefix: string) {
  // https://stackoverflow.com/a/35478115/831465
  const escapedPrefix = prefix.replace(/[|\\{}()[\]^$+*?.]/g, '\\$&');
  const matcher = new RegExp(`^\\^?\\/?\\/${escapedPrefix}`);

  return routes.filter(({ src }) => {
    if (src && src.match(matcher)) {
      return false;
    }

    return true;
  });
}
