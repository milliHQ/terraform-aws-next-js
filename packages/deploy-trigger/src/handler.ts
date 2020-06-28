import { S3Handler } from 'aws-lambda';
import { S3 } from 'aws-sdk';

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

  // Cleanup
  await s3.deleteObject(params).promise();
};
