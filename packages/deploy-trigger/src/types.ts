import { Route } from '@vercel/routing-utils';

/**
 * Supported runtime values for the Lambdas.
 */
export type SupportedRuntime = 'nodejs12.x' | 'nodejs14.x' | 'nodejs16.x';

export type LambdaDefinition = {
  /**
   * Internal functionName, must be unique in this stack.
   */
  functionName: string;
  /**
   * Handler of the Lambda function.
   */
  handler: string;
  /**
   * Key of the zip that is associated with the Lambda.
   */
  sourceKey: string;
  /**
   * Route where the Lambda should be called from.
   */
  route: string;
  /**
   * The runtime of the Lambda.
   */
  runtime: SupportedRuntime;
};

export type DeploymentConfig = {
  routes: Route[];
  lambdas: Record<
    string,
    {
      handler: string;
      runtime: SupportedRuntime;
      filename: string;
      route: string;
    }
  >;
  lambdaRoutes: string[];
  prerenders: Record<
    string,
    {
      lambda: string;
    }
  >;
  staticRoutes: string[];
  version: number;
};

export type ExpireValue = number | 'never';

export interface ManifestFile {
  buildId: string[];
  expiredAt?: string;
  eTag?: string;
}

export interface Manifest {
  version: number;
  currentBuild: string;
  // All files that are currently managed by the manifest
  files: Record<string, ManifestFile>;
}

export interface FileResult {
  key: string;
  eTag: string;
}
