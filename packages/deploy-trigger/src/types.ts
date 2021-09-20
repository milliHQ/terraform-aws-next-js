import { Lambda } from 'aws-sdk';
import { Route } from '@vercel/routing-utils';

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

export interface ProxyConfig {
  routes: Route[];
  lambdaRoutes: string[];
  staticRoutes: string[];
  prerenders: Record<string, { lambda: string }>;
  apiId?: string;
}

export type Lambdas = {[path: string]: Buffer}

export interface CreateDeploymentConfiguration {
  accountId: string;
  defaultRuntime: string;
  defaultFunctionMemory: number;
  deploymentName: string;
  lambdaAttachToVpc: boolean;
  lambdaEnvironmentVariables: Lambda.EnvironmentVariables;
  lambdaLoggingPolicyArn: string;
  lambdaTimeout: number;
  proxyConfigBucket: string;
  proxyConfigTable: string;
  region: string;
  vpcSecurityGroupIds: string[];
  vpcSubnetIds: string[];
}

export interface VpcConfig {
  attachToVpc: boolean;
  vpcSecurityGroupIds: string[];
  vpcSubnetIds: string[];
}
