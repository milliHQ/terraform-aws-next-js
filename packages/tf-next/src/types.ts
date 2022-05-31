import { Route } from '@vercel/routing-utils';
import { Argv } from 'yargs';

export interface ConfigOutput {
  buildId: string;
  routes: Route[];
  staticRoutes: string[];
  lambdaRoutes: string[];
  staticFilesArchive: string;
  lambdas: Record<
    string,
    {
      handler: string;
      runtime: 'nodejs12.x' | 'nodejs14.x' | 'nodejs16.x';
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

export type LogLevel = 'verbose' | 'none';

export type GlobalOptions = {
  /**
   * The current working directory where the command is executed from.
   */
  commandCwd: string;
  /**
   * LogLevel of the command
   */
  logLevel: LogLevel;
};

export type GlobalYargs<T = unknown> = Argv<GlobalOptions & T>;
