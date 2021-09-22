import { S3 } from 'aws-sdk';

const s3 = new S3();

interface DeleteDeploymentProps {
  deploymentId?: string;
  tag?: string;
  deployBucket: string;
}

async function deleteDeploymentCommand({
  deploymentId,
  tag,
  deployBucket,
}: DeleteDeploymentProps) {
  const json: any = {};
  if (deploymentId) {
    json.deploymentId = deploymentId;
  } else if (tag) {
    json.tag = tag;
  }

  await s3.putObject({
    Key: 'deleteDeployment.json',
    Bucket: deployBucket,
    Body: JSON.stringify(json),
  }).promise();
}

export default deleteDeploymentCommand;
