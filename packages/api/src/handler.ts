import { APIGatewayProxyEvent, Context } from 'aws-lambda';

import { createApi } from './api';

const api = createApi();

async function handler(event: APIGatewayProxyEvent, context: Context) {
  return await api.run(event, context);
}

export { handler };
