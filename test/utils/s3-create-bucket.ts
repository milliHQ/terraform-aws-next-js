import { randomBytes } from 'crypto';

import S3 from 'aws-sdk/clients/s3';

interface BucketHandler {
  bucketName: string;
  destroy: () => Promise<boolean>;
}

/**
 * Helper to create a new bucket
 */
async function s3CreateBucket(
  s3: S3,
  bucketName: string = randomBytes(8).toString('hex')
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

export type { BucketHandler };
export { s3CreateBucket };
