import { APIGatewayProxyEvent, Context } from 'aws-lambda';
import LambdaApi from 'lambda-api';

import { createOrUpdateAlias } from './actions/alias/create-or-update-alias';
import { deleteAlias } from './actions/alias/delete-alias';
import { createDeployment } from './actions/deployment/create-deployment';

import { DynamoDBService } from './services/dynamodb';
import { S3Service } from './services/s3';

const api = LambdaApi();

api.app('dynamoDB', DynamoDBService);
api.app('s3', S3Service);

api.post('/alias', createOrUpdateAlias);
api.delete('/alias', deleteAlias);
api.post('/deployments', createDeployment);

async function handler(event: APIGatewayProxyEvent, context: Context) {
  return await api.run(event, context);
}

export { handler };
