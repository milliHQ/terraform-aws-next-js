import { Route } from '@vercel/routing-utils';

export interface ConfigOutput {
  buildId: string;
  routes: Route[];
  staticFilesArchive: string;
  lambdas: {
    [key: string]: {
      handler: string;
      runtime: string;
      filename: string;
    };
  };
}
