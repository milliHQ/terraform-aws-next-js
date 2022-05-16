import S3 from 'aws-sdk/clients/s3';

type S3ServiceType = typeof S3Service;

class S3Service {
  static s3Client: S3;

  static getS3Client(): S3 {
    if (!S3Service.s3Client) {
      S3Service.s3Client = new S3({
        region: process.env.UPLOAD_BUCKET_REGION,
      });
    }

    return S3Service.s3Client;
  }

  static getUploadBucketName(): string {
    return process.env.UPLOAD_BUCKET_ID;
  }
}

export type { S3ServiceType };
export { S3Service };
