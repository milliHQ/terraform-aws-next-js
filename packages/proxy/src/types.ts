import { URLSearchParams } from 'url';

import { Route, HandleValue } from '@vercel/routing-utils';

export type HTTPHeaders = Record<string, string>;

export interface ProxyConfig {
  etag: string;
  deploymentId: string;
  routes: Route[];
  lambdaRoutes: Record<string, string>;
  prerenders: Record<string, { lambda: string }>;
}

export interface RouteResult {
  // `true` if a route was matched, `false` otherwise
  found: boolean;
  // if found this indicated wether it is a lambda or static file or an external URL
  target?: 'lambda' | 'filesystem' | 'url';
  // "dest": <string of the dest, either file for lambda or full url for remote>
  dest: string;
  // `true` if last route in current phase matched but set `continue: true`
  continue: boolean;
  // "status": <integer in case exit code is intended to be changed>
  status?: number;
  // "headers": <object of the added response header values>
  headers: HTTPHeaders;
  // "uri_args": <object (key=value) list of new uri args to be passed along to dest >
  uri_args?: URLSearchParams;
  // "matched_route": <object of the route spec that matched>
  matched_route?: Route;
  // "matched_route_idx": <integer of the index of the route matched>
  matched_route_idx?: number;
  // "userDest": <boolean in case the destination was user defined>
  userDest?: boolean;
  // url as destination should end routing
  isDestUrl: boolean;
  // the phase that this route is defined in
  phase?: HandleValue | null;
}

export type FileSystemEntry = {
  etag: string;
  key: string;
};
