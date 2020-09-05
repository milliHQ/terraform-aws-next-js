import * as url from 'url';
import { Route, isHandler, HandleValue } from '@vercel/routing-utils';
import PCRE from 'pcre-to-regexp';

import isURL from './util/is-url';
import { RouteResult, HTTPHeaders } from './types';

function resolveRouteParameters(
  str: string,
  match: string[],
  keys: string[]
): string {
  return str.replace(/\$([1-9a-zA-Z]+)/g, (_, param) => {
    let matchIndex: number = keys.indexOf(param);
    if (matchIndex === -1) {
      // It's a number match, not a named capture
      matchIndex = parseInt(param, 10);
    } else {
      // For named captures, add one to the `keys` index to
      // match up with the RegExp group matches
      matchIndex++;
    }
    return match[matchIndex] || '';
  });
}

export class Proxy {
  routes: Route[];
  lambdaRoutes: Set<string>;
  staticRoutes: Set<string>;

  constructor(routes: Route[], lambdaRoutes: string[], staticRoutes: string[]) {
    this.routes = routes;
    this.lambdaRoutes = new Set<string>(lambdaRoutes);
    this.staticRoutes = new Set<string>(staticRoutes);
  }

  _checkFileSystem = (path: string) => {
    return this.staticRoutes.has(path);
  };

  route(reqUrl: string) {
    const parsedUrl = url.parse(reqUrl, true);
    let query = parsedUrl.query;
    let reqPathname = parsedUrl.pathname ?? '/';
    let result: RouteResult | undefined;
    let status: number | undefined;
    let isContinue = false;
    let idx = -1;
    let phase: HandleValue | null = null;
    let combinedHeaders: HTTPHeaders = {};

    for (const routeConfig of this.routes) {
      idx++;
      isContinue = false;

      if (isHandler(routeConfig)) {
        phase = routeConfig.handle;

        // Check if the path is a static file that should be served from the
        // filesystem
        if (routeConfig.handle === 'filesystem') {
          // Check if the route matches a route from the filesystem
          if (this._checkFileSystem(reqPathname)) {
            result = {
              found: true,
              target: 'filesystem',
              dest: reqPathname,
              headers: combinedHeaders,
              continue: false,
              isDestUrl: false,
            };
            break;
          }
        }

        continue;
      }

      const { src, headers } = routeConfig;

      const keys: string[] = [];
      const matcher = PCRE(`%${src}%`, keys);
      const match =
        matcher.exec(reqPathname) || matcher.exec(reqPathname!.substring(1));

      if (match) {
        let destPath: string = reqPathname;

        if (routeConfig.dest) {
          // Fix for next.js 9.5+: Removes querystring from slug URLs
          destPath = url.parse(
            resolveRouteParameters(routeConfig.dest, match, keys)
          ).pathname!;
        }

        if (headers) {
          for (const originalKey of Object.keys(headers)) {
            const lowerKey = originalKey.toLowerCase();
            const originalValue = headers[originalKey];
            const value = resolveRouteParameters(originalValue, match, keys);
            combinedHeaders[lowerKey] = value;
          }
        }

        if (routeConfig.continue) {
          if (routeConfig.status) {
            status = routeConfig.status;
          }
          reqPathname = destPath;
          isContinue = true;
          continue;
        }

        if (routeConfig.check && phase !== 'hit') {
          if (!this.lambdaRoutes.has(destPath)) {
            reqPathname = destPath;
            continue;
          }
        }

        const isDestUrl = isURL(destPath);
        if (isDestUrl) {
          result = {
            found: true,
            dest: destPath,
            continue: isContinue,
            userDest: false,
            isDestUrl,
            status: routeConfig.status || status,
            uri_args: query,
            matched_route: routeConfig,
            matched_route_idx: idx,
            phase,
            headers: combinedHeaders,
          };
          break;
        } else {
          if (!destPath.startsWith('/')) {
            destPath = `/${destPath}`;
          }
          const destParsed = url.parse(destPath, true);
          Object.assign(destParsed.query, query);
          result = {
            found: true,
            dest: destParsed.pathname || '/',
            continue: isContinue,
            userDest: Boolean(routeConfig.dest),
            isDestUrl,
            status: routeConfig.status || status,
            uri_args: destParsed.query,
            matched_route: routeConfig,
            matched_route_idx: idx,
            phase,
            headers: combinedHeaders,
          };
          break;
        }
      }
    }

    if (!result) {
      result = {
        found: false,
        dest: reqPathname,
        continue: isContinue,
        status,
        isDestUrl: false,
        uri_args: query,
        phase,
        headers: combinedHeaders,
      };
    }

    return result;
  }
}
