import { Route } from '@vercel/routing-utils';

export interface ConfigOutput {
  buildId: string;
  routes: Route[];
  staticRoutes: string[];
  staticFilesArchive: string;
  lambdas: Record<
    string,
    {
      handler: string;
      runtime: string;
      filename: string;
      route: string;
    }
  >;
  prerenders: Record<
    string,
    {
      lambda: string;
    }
  >;
  version: number;
}
