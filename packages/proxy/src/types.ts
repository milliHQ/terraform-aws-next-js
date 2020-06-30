import { Route, HandleValue } from '@vercel/routing-utils';

export interface ProxyConfig {
  routes: Route[];
  lambdaRoutes: string[];
}

export interface RouteResult {
  // `true` if a route was matched, `false` otherwise
  found: boolean;
  // "dest": <string of the dest, either file for lambda or full url for remote>
  dest: string;
  // `true` if last route in current phase matched but set `continue: true`
  continue: boolean;
  // "status": <integer in case exit code is intended to be changed>
  status?: number;
  // "headers": <object of the added response header values>
  // headers: HttpHeadersConfig;
  // "uri_args": <object (key=value) list of new uri args to be passed along to dest >
  uri_args?: { [key: string]: any };
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
