export type ExpireValue = number | 'never';

interface Build {
  files: string[];
  expiredAt?: string;
}

export interface ManifestFile {
  buildId: string[];
  expiredAt?: string;
}

export interface Manifest {
  version: number;
  currentBuild: string;
  // All files that are currently managed by the manifest
  files: Record<string, ManifestFile>;
}
