import { paths } from '@millihq/terraform-next-api/schema';

import {
  fetchAWSSigV4,
  FetchAWSSigV4Options,
} from '../../utils/fetch-aws-sig-v4';

type SuccessResponse =
  paths['/deployments']['post']['responses']['201']['content']['application/json'];

async function createDeployment(
  options: FetchAWSSigV4Options
): Promise<SuccessResponse | null> {
  const response = await fetchAWSSigV4(options, '/deployments', {
    method: 'POST',
  });

  if (response.status === 201) {
    return response.json() as Promise<SuccessResponse>;
  }

  return null;
}

export { createDeployment };
