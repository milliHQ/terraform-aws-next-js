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
      runtime: 'nodejs12.x' | 'nodejs14.x';
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
  images?: {
    domains: string[];
    sizes: number[];
  };
  version: number;
}
