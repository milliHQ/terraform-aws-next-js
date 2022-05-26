import { pseudoRandomBytes } from 'crypto';

import { createDeployment as dynamoDBCreateDeployment } from '@millihq/tfn-dynamodb-actions';
import { Request, Response } from 'lambda-api';

import { paths } from '../../../schema';
import { S3ServiceType } from '../../services/s3';
import { DynamoDBServiceType } from '../../services/dynamodb';

type SuccessResponse =
  paths['/deployments']['post']['responses']['201']['content']['application/json'];

const UPLOAD_LINK_EXPIRES_SECONDS = 60 * 5;
// S3 Metadata Key where the deployment is stored
const DEPLOYMENT_ID_META_KEY = 'x-amz-meta-tf-next-deployment-id';

export function generateRandomDeploymentId() {
  return pseudoRandomBytes(16).toString('hex');
}

async function createDeployment(
  req: Request,
  res: Response
): Promise<SuccessResponse> {
  const s3Service = req.namespace.s3 as S3ServiceType;
  const dynamoDB = req.namespace.dynamoDB as DynamoDBServiceType;

  const s3Client = s3Service.getS3Client();
  const deploymentId = generateRandomDeploymentId();

  const deployment = await dynamoDBCreateDeployment({
    deploymentId,
    dynamoDBClient: dynamoDB.getDynamoDBClient(),
    deploymentTableName: dynamoDB.getDeploymentTableName(),
    createDate: new Date(),
  });

  const { url, fields } = s3Client.createPresignedPost({
    Bucket: s3Service.getUploadBucketName(),
    Fields: {
      key: `${deploymentId}.zip`,
      'Content-Type': 'application/zip',
      [DEPLOYMENT_ID_META_KEY]: deploymentId,
    },

    Expires: UPLOAD_LINK_EXPIRES_SECONDS,
  });

  res.status(201);
  return {
    id: deploymentId,
    uploadUrl: url,
    uploadAttributes: fields,
    status: deployment.Status,
  };
}

export { createDeployment };
