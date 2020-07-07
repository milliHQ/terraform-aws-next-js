import { S3Handler } from 'aws-lambda';
import { S3 } from 'aws-sdk';
import unzipper from 'unzipper';
import { getType } from 'mime';

const deployBucket = process.env.TARGET_BUCKET;

export const handler: S3Handler = async function (event) {
  const s3 = new S3({ apiVersion: '2006-03-01' });

  // Get needed information of the event
  const { object } = event.Records[0].s3;
  const { versionId, key } = object;
  const bucket = event.Records[0].s3.bucket.name;

  const params: S3.Types.DeleteObjectRequest = {
    Key: key,
    Bucket: bucket,
    VersionId: versionId,
  };

  // GetObject
  const zip = s3
    .getObject(params)
    .createReadStream()
    .pipe(unzipper.Parse({ forceStream: true }));

  const uploads: Promise<S3.ManagedUpload.SendData>[] = [];

  for await (const e of zip) {
    const entry = e as unzipper.Entry;

    const fileName = entry.path;
    const type = entry.type;
    if (type === 'File') {
      // Get ContentType
      const ContentType = getType(fileName);

      const uploadParams: S3.Types.PutObjectRequest = {
        Bucket: deployBucket,
        Key: fileName,
        Body: entry,
        ContentType: ContentType || 'text/html',
      };

      uploads.push(s3.upload(uploadParams).promise());
    } else {
      entry.autodrain();
    }
  }

  await Promise.all(uploads);

  // Cleanup
  await s3.deleteObject(params).promise();
};
