// These are manually generated types from the repo
// Version: 2.6.8-canary.1

/// <reference types="node" />
declare module 'build-utils' {
  let buildUtils: typeof import('@vercel/build-utils');
  export default buildUtils;
}
declare module 'utils' {
  import { Files, FileFsRef } from '@vercel/build-utils';
  import { Route, Source, NowHeader, NowRewrite } from '@vercel/routing-utils';
  type stringMap = {
    [key: string]: string;
  };
  export interface EnvConfig {
    [name: string]: string | undefined;
  }
  function isDynamicRoute(route: string): boolean;
  /**
   * Validate if the entrypoint is allowed to be used
   */
  function validateEntrypoint(entrypoint: string): void;
  /**
   * Exclude certain files from the files object
   */
  function excludeFiles(
    files: Files,
    matcher: (filePath: string) => boolean
  ): Files;
  /**
   * Exclude package manager lockfiles from files
   */
  function excludeLockFiles(files: Files): Files;
  /**
   * Enforce specific package.json configuration for smallest possible lambda
   */
  function normalizePackageJson(defaultPackageJson?: {
    dependencies?: stringMap;
    devDependencies?: stringMap;
    scripts?: stringMap;
  }): {
    dependencies: {
      'next-server': string;
      react: string;
      'react-dom': string;
    };
    devDependencies: {
      next: string;
    };
    scripts: {
      'now-build': string;
    };
  };
  function getNextConfig(
    workPath: string,
    entryPath: string
  ): Promise<string | null>;
  function getPathsInside(entryDirectory: string, files: Files): string[];
  function normalizePage(page: string): string;
  function getRoutes(
    entryPath: string,
    entryDirectory: string,
    pathsInside: string[],
    files: Files,
    url: string
  ): Promise<Route[]>;
  export type Redirect = NowRewrite & {
    statusCode?: number;
    permanent?: boolean;
  };
  type RoutesManifestRegex = {
    regex: string;
    regexKeys: string[];
  };
  export type RoutesManifest = {
    pages404: boolean;
    basePath: string | undefined;
    redirects: (Redirect & RoutesManifestRegex)[];
    rewrites: (NowRewrite & RoutesManifestRegex)[];
    headers?: (NowHeader & RoutesManifestRegex)[];
    dynamicRoutes: {
      page: string;
      regex: string;
      namedRegex?: string;
      routeKeys?: {
        [named: string]: string;
      };
    }[];
    version: number;
    dataRoutes?: Array<{
      page: string;
      dataRouteRegex: string;
      namedDataRouteRegex?: string;
      routeKeys?: {
        [named: string]: string;
      };
    }>;
  };
  export function getRoutesManifest(
    entryPath: string,
    outputDirectory: string,
    nextVersion?: string
  ): Promise<RoutesManifest | undefined>;
  export function getDynamicRoutes(
    entryPath: string,
    entryDirectory: string,
    dynamicPages: string[],
    isDev?: boolean,
    routesManifest?: RoutesManifest,
    omittedRoutes?: Set<string>
  ): Promise<Source[]>;
  function syncEnvVars(
    base: EnvConfig,
    removeEnv: EnvConfig,
    addEnv: EnvConfig
  ): void;
  export const ExperimentalTraceVersion = '9.0.4-canary.1';
  export type PseudoLayer = {
    [fileName: string]: PseudoFile | PseudoSymbolicLink;
  };
  export type PseudoFile = {
    isSymlink: false;
    crc32: number;
    compBuffer: Buffer;
    uncompressedSize: number;
    mode: number;
  };
  export type PseudoSymbolicLink = {
    isSymlink: true;
    file: FileFsRef;
    symlinkTarget: string;
  };
  export type PseudoLayerResult = {
    pseudoLayer: PseudoLayer;
    pseudoLayerBytes: number;
  };
  export function createPseudoLayer(files: {
    [fileName: string]: FileFsRef;
  }): Promise<PseudoLayerResult>;
  interface CreateLambdaFromPseudoLayersOptions {
    files: Files;
    layers: PseudoLayer[];
    handler: string;
    runtime: string;
    memory?: number;
    maxDuration?: number;
    environment?: {
      [name: string]: string;
    };
  }
  export function createLambdaFromPseudoLayers({
    files,
    layers,
    handler,
    runtime,
    memory,
    maxDuration,
    environment,
  }: CreateLambdaFromPseudoLayersOptions): Promise<
    import('@vercel/build-utils/dist').Lambda
  >;
  export type NextPrerenderedRoutes = {
    bypassToken: string | null;
    staticRoutes: {
      [route: string]: {
        initialRevalidate: number | false;
        dataRoute: string;
        srcRoute: string | null;
      };
    };
    legacyBlockingRoutes: {
      [route: string]: {
        routeRegex: string;
        dataRoute: string;
        dataRouteRegex: string;
      };
    };
    fallbackRoutes: {
      [route: string]: {
        fallback: string;
        routeRegex: string;
        dataRoute: string;
        dataRouteRegex: string;
      };
    };
    omittedRoutes: string[];
  };
  export function getExportIntent(
    entryPath: string
  ): Promise<
    | false
    | {
        trailingSlash: boolean;
      }
  >;
  export function getExportStatus(
    entryPath: string
  ): Promise<
    | false
    | {
        success: boolean;
        outDirectory: string;
      }
  >;
  export function getPrerenderManifest(
    entryPath: string
  ): Promise<NextPrerenderedRoutes>;
  function getSourceFilePathFromPage({
    workPath,
    page,
  }: {
    workPath: string;
    page: string;
  }): Promise<string>;
  export {
    excludeFiles,
    validateEntrypoint,
    excludeLockFiles,
    normalizePackageJson,
    getNextConfig,
    getPathsInside,
    getRoutes,
    stringMap,
    syncEnvVars,
    normalizePage,
    isDynamicRoute,
    getSourceFilePathFromPage,
  };
}
declare module 'create-serverless-config' {
  export default function createServerlessConfig(
    workPath: string,
    entryPath: string,
    nextVersion: string | undefined
  ): Promise<void>;
}
declare module 'dev-server' {}
declare module 'legacy-versions' {
  const _default: string[];
  export default _default;
}
declare module '@vercel/next' {
  import {
    BuildOptions,
    Files,
    PrepareCacheOptions,
  } from '@vercel/build-utils';
  import { Route } from '@vercel/routing-utils';
  import { ChildProcess } from 'child_process';
  import { EnvConfig } from 'utils';
  interface BuildParamsMeta {
    isDev: boolean | undefined;
    env?: EnvConfig;
    buildEnv?: EnvConfig;
  }
  interface BuildParamsType extends BuildOptions {
    files: Files;
    entrypoint: string;
    workPath: string;
    meta: BuildParamsMeta;
  }
  export const version = 2;
  export const build: ({
    files,
    workPath,
    entrypoint,
    config,
    meta,
  }: BuildParamsType) => Promise<{
    routes: Route[];
    output: Files;
    watch?: string[];
    childProcesses: ChildProcess[];
  }>;
  export const prepareCache: ({
    workPath,
    entrypoint,
    config,
  }: PrepareCacheOptions) => Promise<Files>;
}
declare module 'now__bridge' {
  import { APIGatewayProxyEvent, Context } from 'aws-lambda';
  import { Server, IncomingHttpHeaders, OutgoingHttpHeaders } from 'http';
  interface NowProxyEvent {
    Action: string;
    body: string;
  }
  export interface NowProxyRequest {
    isApiGateway?: boolean;
    method: string;
    path: string;
    headers: IncomingHttpHeaders;
    body: Buffer;
  }
  export interface NowProxyResponse {
    statusCode: number;
    headers: OutgoingHttpHeaders;
    body: string;
    encoding: BufferEncoding;
  }
  interface ServerLike {
    timeout?: number;
    listen: (
      opts: {
        host?: string;
        port?: number;
      },
      callback: (this: Server | null) => void
    ) => Server | void;
  }
  export class Bridge {
    private server;
    private listening;
    private resolveListening;
    private events;
    private reqIdSeed;
    private shouldStoreEvents;
    constructor(server?: ServerLike, shouldStoreEvents?: boolean);
    setServer(server: ServerLike): void;
    listen(): void | Server;
    launcher(
      event: NowProxyEvent | APIGatewayProxyEvent,
      context: Pick<Context, 'callbackWaitsForEmptyEventLoop'>
    ): Promise<NowProxyResponse>;
    consumeEvent(reqId: string): NowProxyRequest;
  }
}
declare module 'legacy-launcher' {}
declare module 'templated-launcher-shared' {}
declare module 'templated-launcher' {}
