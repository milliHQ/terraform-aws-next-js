import LambdaApi from 'lambda-api';

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

  return api;
}

export { createApi };
