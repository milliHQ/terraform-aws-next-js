import LambdaApi, { ErrorHandlingMiddleware } from 'lambda-api';

import { createOrUpdateAlias } from './actions/alias/create-or-update-alias';
import { deleteAliasById } from './actions/alias/delete-alias-by-id';
import { listAliases } from './actions/alias/list-aliases';
import { getDeploymentById } from './actions/deployment/get-deployment-by-id';
import { deleteDeploymentById } from './actions/deployment/delete-deployment-by-id';
import { createDeployment } from './actions/deployment/create-deployment';
import { listDeployments } from './actions/deployment/list-deployments';

import { CloudFormationService } from './services/cloudformation';
import { DynamoDBService } from './services/dynamodb';
import { S3Service } from './services/s3';

function createApi() {
  const api = LambdaApi();

  api.app('cloudFormation', CloudFormationService);
  api.app('dynamoDB', DynamoDBService);
  api.app('s3', S3Service);

  // aliases
  api.delete('/aliases/:hostname/:basePath', deleteAliasById);
  api.delete('/aliases/:hostname', deleteAliasById);
  api.get('/aliases', listAliases);
  api.post('/aliases', createOrUpdateAlias);

  // deployments
  api.get('/deployments/:deploymentId', getDeploymentById);
  api.delete('/deployments/:deploymentId', deleteDeploymentById);
  api.get('/deployments', listDeployments);
  api.post('/deployments', createDeployment);

  // Since all errors should be handled in the the actions in the first place
  // errors that caught here are unhandled exceptions.
  // The exceptions can contain sensitive information so we ensure that they
  // are only logged but not exposed through the API.
  const errorHandler: ErrorHandlingMiddleware = (err, _req, res, next) => {
    // Log the error message to CloudWatch
    console.error(err);

    const cloudWatchLogGroupName = process.env.AWS_LAMBDA_LOG_GROUP_NAME;
    const cloudWatchLogStreamName = process.env.AWS_LAMBDA_LOG_STREAM_NAME;
    const awsRegion = process.env.AWS_REGION;

    res.status(500).json({
      status: 500,
      code: 'INTERNAL_ERROR',
      message: `Internal error. Contact your administrator for a detailed error message. The error message is logged to CloudWatch LogGroup: '${cloudWatchLogGroupName}', LogStream: '${cloudWatchLogStreamName}' in AWS region '${awsRegion}'.`,
      cloudWatchLogGroupName,
      cloudWatchLogStreamName,
      awsRegion,
    });
    next();
  };
  api.use(errorHandler);

  return api;
}

export { createApi };
