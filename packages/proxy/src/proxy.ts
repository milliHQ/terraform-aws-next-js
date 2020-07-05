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

  constructor(routes: Route[]) {
    this.routes = routes;
  }

  route(reqUrl: string) {
    let result: RouteResult | undefined;
    let { query, pathname: reqPathname = '/' } = url.parse(reqUrl, true);
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
        continue;
      }

      const { src, headers } = routeConfig;

      const keys: string[] = [];
      const matcher = PCRE(`%${src}%`, keys);
      const match =
        matcher.exec(reqPathname!) || matcher.exec(reqPathname!.substring(1));

      if (match) {
        let destPath: string = reqPathname!;

        if (routeConfig.dest) {
          destPath = resolveRouteParameters(routeConfig.dest, match, keys);
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
        dest: reqPathname!,
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
