import { S3Handler } from 'aws-lambda';

export const handler: S3Handler = async function (event) {
  // Object key may have spaces or unicode non-ASCII characters.
  const srcKey = decodeURIComponent(
    event.Records[0].s3.object.key.replace(/\+/g, ' ')
  );
  const bucket = event.Records[0].s3.bucket.name;


};
