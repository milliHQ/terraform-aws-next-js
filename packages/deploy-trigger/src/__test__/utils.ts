import { S3 } from 'aws-sdk';
import * as crypto from 'crypto';
import * as tmp from 'tmp';
import * as fs from 'fs';
import archiver from 'archiver';

export interface BucketHandler {
  bucketName: string;
  destroy: () => Promise<boolean>;
}

/**
 * Helper to create a new bucket
 */
export async function createBucket(
  s3: S3,
  bucketName: string = crypto.randomBytes(8).toString('hex')
): Promise<BucketHandler> {
  await s3
    .createBucket({
      Bucket: bucketName,
    })
    .promise();

  return {
    bucketName,
    async destroy() {
      // Empty bucket and destroy it
      try {
        // We can't delete a bucket before emptying its contents
        const { Contents } = await s3
          .listObjects({ Bucket: bucketName })
          .promise();
        if (Contents && Contents.length > 0) {
          // TypeGuard
          function isObjectIdentifier(
            obj: S3.Object
          ): obj is S3.ObjectIdentifier {
            return typeof obj.Key === 'string';
          }

          await s3
            .deleteObjects({
              Bucket: bucketName,
              Delete: {
                Objects: Contents.filter(isObjectIdentifier).map(({ Key }) => ({
                  Key,
                })),
              },
            })
            .promise();
        }
        await s3.deleteBucket({ Bucket: bucketName }).promise();
        return true;
      } catch (err) {
        console.log(err);
        return false;
      }
    },
  };
}

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
export async function generateZipBundle(filesNames: string[]) {
  return new Promise<string>((resolve) => {
    const tmpFile = tmp.fileSync();
    const output = fs.createWriteStream(tmpFile.name);
    output.on('close', () => resolve(tmpFile.name));

    const archive = archiver('zip', {
      zlib: { level: 5 },
    });
    archive.pipe(output);

    for (const file of filesNames) {
      archive.append('', { name: file });
    }

    archive.finalize();
  });
}

export async function addFilesToS3Bucket(
  s3: S3,
  bucketId: string,
  fileNames: string[]
) {
  const promises = [];

  for (const fileName of fileNames) {
    promises.push(
      s3
        .putObject({
          Bucket: bucketId,
          Key: fileName,
          Body: '',
        })
        .promise()
    );
  }

  return Promise.all(promises);
}
