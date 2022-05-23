import LambdaApi from 'lambda-api';

import { createOrUpdateAlias } from './actions/alias/create-or-update-alias';
import { deleteAliasById } from './actions/alias/delete-alias-by-id';
import { getDeploymentById } from './actions/deployment/get-deployment-by-id';
import { createDeployment } from './actions/deployment/create-deployment';

import { DynamoDBService } from './services/dynamodb';
import { S3Service } from './services/s3';

function createApi() {
  const api = LambdaApi();

  api.app('dynamoDB', DynamoDBService);
  api.app('s3', S3Service);

  // aliases
  api.post('/aliases', createOrUpdateAlias);
  api.delete('/aliases/:hostname/:basePath', deleteAliasById);

  // deployments
  api.get('/deployments/:deploymentId', getDeploymentById);
  api.post('/deployments', createDeployment);

  return api;
}

export { createApi };