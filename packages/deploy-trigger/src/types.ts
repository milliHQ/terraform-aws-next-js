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
