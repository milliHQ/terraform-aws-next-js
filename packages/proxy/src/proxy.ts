import { URL, URLSearchParams } from 'url';
import { Route, isHandler, HandleValue } from '@vercel/routing-utils';

import { fetchFileSystem } from './actions/fetch-file-system';
import isURL from './util/is-url';
import { resolveRouteParameters } from './util/resolve-route-parameters';
import { TTLCache } from './util/ttl-cache';
import { RouteResult, HTTPHeaders, FileSystemEntry } from './types';
import { ETagCache } from './util/etag-cache';

type NodeFetch = typeof import('node-fetch').default;

/* -----------------------------------------------------------------------------
 * Utils
 * ---------------------------------------------------------------------------*/

// Since we have no replacement for url.parse, thanks Node.js
// https://github.com/nodejs/node/issues/12682
const baseUrl = 'http://n';

function parseUrl(url: string) {
  const _url = new URL(url, baseUrl);
  return {
    pathname: _url.pathname,
    searchParams: _url.searchParams,
  };
}

/**
 * Appends URLSearchParams from param 2 to param 1.
 * Basically Object.assign for URLSearchParams
 * @param param1
 * @param param2
 */
function appendURLSearchParams(
  param1: URLSearchParams,
  param2: URLSearchParams
) {
  for (const [key, value] of param2.entries()) {
    param1.append(key, value);
  }
  return param1;
}

/* -----------------------------------------------------------------------------
 * Proxy
 * ---------------------------------------------------------------------------*/

export class Proxy {
  filesystemCache: TTLCache<FileSystemEntry>;
  routeCache: ETagCache<RouteResult>;
  fetch: NodeFetch;

  constructor(fetch: NodeFetch) {
    this.fetch = fetch;

    // TTL for filesystem is 0 since TTL is determined by the cache-control
    // of the file.
    this.filesystemCache = new TTLCache(0);
    this.routeCache = new ETagCache();
  }

  /**
   * Checks if the requested path matches a static file from the filesystem
   *
   * @param requestedFilePath - Path to the potential file. Could include a
   *    querystring.
   * @returns Absolute path to the file that is matched, otherwise null
   */
  async checkFileSystem(
    deploymentId: string,
    fileSystemEndpointUrl: string,
    requestedFilePathWithPossibleQuerystring: string
  ): Promise<string | null> {
    // Make sure the querystring is removed from the requested file before
    // doing the lookup
    const querystringStartPos =
      requestedFilePathWithPossibleQuerystring.indexOf('?');
    const requestedFilePath =
      querystringStartPos === -1
        ? requestedFilePathWithPossibleQuerystring
        : requestedFilePathWithPossibleQuerystring.substring(
            0,
            querystringStartPos
          );

    // If the last character is a `/` (invalid S3 key), change it to `/index`
    let requestedFilePathWithoutTrailingSlash = requestedFilePath;
    if (requestedFilePath.charAt(requestedFilePath.length - 1) === '/') {
      requestedFilePathWithoutTrailingSlash = requestedFilePath + 'index';
    }

    // If the first character is a `/` (invalid S3 key), remove it
    let s3Key = requestedFilePathWithoutTrailingSlash;
    if (s3Key.charAt(0) === '/') {
      s3Key = s3Key.substring(1);
    }

    try {
      const file = await fetchFileSystem(
        this.fetch,
        this.filesystemCache,
        fileSystemEndpointUrl,
        deploymentId,
        s3Key
      );

      if (file) {
        return '/' + file.key;
      }
    } catch (error) {
      console.error(
        'Unhandled error while checking fileSystem for route: ' +
          requestedFilePathWithoutTrailingSlash
      );
      console.error(error);

      return null;
    }

    // requestedFilePath does not match a key in S3
    return null;
  }

  async route(
    deploymentId: string,
    routes: Route[],
    lambdaRoutes: Record<string, string>,
    fileSystemEndpointUrl: string,
    reqUrl: string
  ) {
    const parsedUrl = parseUrl(reqUrl);
    let { searchParams, pathname: reqPathname = '/' } = parsedUrl;
    let result: RouteResult | undefined;
    let status: number | undefined;
    let isContinue = false;
    let phase: HandleValue | undefined;
    let combinedHeaders: HTTPHeaders = {};
    let target: undefined | 'filesystem' | 'lambda';

    /**
     * Set the route result target as filesystem
     */
    function setTargetFilesystem(dest: string) {
      result = {
        found: true,
        target: 'filesystem',
        dest,
        headers: combinedHeaders,
        continue: false,
        isDestUrl: false,
        status,
        phase,
      };
    }

    for (let routeIndex = 0; routeIndex < routes.length; routeIndex++) {
      /**
       * This is how the routing basically works:
       * (For reference see: https://vercel.com/docs/configuration#routes)
       *
       * 1. Checks if the route is an exact match to a route in the
       *    S3 filesystem (e.g. /test.html -> s3://test.html)
       *    --> true: returns found in filesystem
       * 2.
       *
       */

      const routeConfig = routes[routeIndex];

      //////////////////////////////////////////////////////////////////////////
      // Phase 1: Check for handler
      if (isHandler(routeConfig)) {
        phase = routeConfig.handle;

        // Check if the path is a static file that should be served from the
        // filesystem
        if (routeConfig.handle === 'filesystem') {
          const filePath = await this.checkFileSystem(
            deploymentId,
            fileSystemEndpointUrl,
            reqPathname
          );

          // Check if the route matches a route from the filesystem
          if (filePath !== null) {
            setTargetFilesystem(filePath);
            break;
          }
        }

        continue;
      }

      // Skip resource phase entirely because we don't support it
      if (phase === 'resource') {
        continue;
      }

      // Special case to allow redirect to kick in when a continue route was touched before
      if (phase === 'error' && isContinue) {
        break;
      }

      //////////////////////////////////////////////////////////////////////////
      // Phase 2: Check for source
      const { src, headers } = routeConfig;
      // Note: Routes are case-insensitive
      // TODO: Performance: Cache matcher results
      const matcher = new RegExp(src, 'i');
      const match = matcher.exec(reqPathname);

      if (match !== null) {
        const keys = Object.keys(match.groups ?? {});
        isContinue = false;
        // The path that should be sent to the target system (lambda or filesystem)
        let destPath: string = reqPathname;

        if (routeConfig.status) {
          status = routeConfig.status;
        }

        if (routeConfig.dest) {
          // Rewrite dynamic routes
          // e.g. /posts/1234 -> /posts/[id]?id=1234
          destPath = resolveRouteParameters(routeConfig.dest, match, keys);
        }

        if (headers) {
          for (const originalKey in headers) {
            const originalValue = headers[originalKey];
            const value = resolveRouteParameters(originalValue, match, keys);
            combinedHeaders[originalKey] = value;
          }
        }

        if (routeConfig.continue) {
          reqPathname = destPath;
          isContinue = true;
        }

        // Check for external rewrite
        const isDestUrl = isURL(destPath);
        if (isDestUrl) {
          result = {
            found: true,
            dest: destPath,
            continue: isContinue,
            userDest: false,
            isDestUrl,
            status: status,
            uri_args: searchParams,
            matched_route: routeConfig,
            matched_route_idx: routeIndex,
            phase,
            headers: combinedHeaders,
            target: 'url',
          };

          if (isContinue) {
            continue;
          }

          break;
        }

        if (routeConfig.check && phase !== 'hit') {
          if (destPath in lambdaRoutes) {
            target = 'lambda';
          } else {
            // Check if the path matches a route from the filesystem
            const filePath = await this.checkFileSystem(
              deploymentId,
              fileSystemEndpointUrl,
              destPath
            );
            if (filePath !== null) {
              setTargetFilesystem(filePath);
              break;
            }

            // When it is not a lambda route we cut the url_args
            // for the next iteration
            const nextUrl = parseUrl(destPath);
            reqPathname = nextUrl.pathname!;
            appendURLSearchParams(searchParams, nextUrl.searchParams);
            continue;
          }
        }

        if (destPath.charAt(0) !== '/') {
          destPath = `/${destPath}`;
        }

        const destParsed = parseUrl(destPath);
        appendURLSearchParams(searchParams, destParsed.searchParams);
        result = {
          found: true,
          dest: destParsed.pathname || '/',
          continue: isContinue,
          userDest: Boolean(routeConfig.dest),
          isDestUrl,
          status: status,
          uri_args: searchParams,
          matched_route: routeConfig,
          matched_route_idx: routeIndex,
          phase,
          headers: combinedHeaders,
          target,
        };

        if (isContinue) {
          continue;
        }

        break;
      }
    }

    if (!result) {
      result = {
        found: false,
        dest: reqPathname,
        continue: isContinue,
        status,
        isDestUrl: false,
        uri_args: searchParams,
        phase,
        headers: combinedHeaders,
      };
    }

    return result;
  }
}
