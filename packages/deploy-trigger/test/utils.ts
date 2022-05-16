import * as crypto from 'crypto';
import * as fs from 'fs';

import archiver from 'archiver';
import S3 from 'aws-sdk/clients/s3';
import * as tmp from 'tmp';

import { DeploymentConfig } from '../src/types';

export function generateS3ClientForTesting() {
  return new S3({
    endpoint: process.env.S3_ENDPOINT,
    accessKeyId: process.env.MINIO_ACCESS_KEY,
    secretAccessKey: process.env.MINIO_SECRET_KEY,

    s3ForcePathStyle: true,
    signatureVersion: 'v4',
    sslEnabled: false,
  });
}

/**
 * Creates a zip archive with dummy files
 */
export async function generateZipBundle(
  deploymentConfig: DeploymentConfig,
  filesNames: string[]
) {
  return new Promise<string>((resolve) => {
    const tmpFile = tmp.fileSync();
    const output = fs.createWriteStream(tmpFile.name);
    output.on('close', () => resolve(tmpFile.name));

    const archive = archiver('zip', {
      zlib: { level: 5 },
    });
    archive.pipe(output);

    archive.append(JSON.stringify(deploymentConfig), { name: 'config.json' });

    for (const file of filesNames) {
      archive.append('', { name: file, prefix: 'static/' });
    }

    archive.finalize();
  });
}

export function addFilesToS3Bucket(
  s3: S3,
  bucketId: string,
  fileNames: string[]
) {
  const promises = [];

  for (const fileName of fileNames) {
    // Fill with random body to create different etags in S3
    const body = crypto.randomBytes(20).toString('hex');
    promises.push(
      s3
        .putObject({
          Bucket: bucketId,
          Key: fileName,
          Body: body,
        })
        .promise()
    );
  }

  return Promise.all(promises);
}
