import { APIGatewayProxyEvent, Context } from 'aws-lambda';
import LambdaApi from 'lambda-api';
import { createOrUpdateAlias } from './actions/alias/create-or-update-alias';

import { DynamoDBService } from './services/dynamodb';

const api = LambdaApi();

api.app('dynamoDB', DynamoDBService);

api.post('/alias', createOrUpdateAlias);

async function handler(event: APIGatewayProxyEvent, context: Context) {
  return await api.run(event, context);
}

export { handler };
