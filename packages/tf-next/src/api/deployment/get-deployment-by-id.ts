import { paths } from '@millihq/terraform-next-api/schema';

import {
  fetchAWSSigV4,
  FetchAWSSigV4Options,
} from '../../utils/fetch-aws-sig-v4';

type SuccessResponse =
  paths['/deployments/{deploymentId}']['get']['responses']['200']['content']['application/json'];

async function getDeploymentById(
  deploymentId: string,
  options: FetchAWSSigV4Options
): Promise<SuccessResponse | null> {
  const response = await fetchAWSSigV4(options, `/deployments/${deploymentId}`);

  if (response.status === 200) {
    return response.json() as Promise<SuccessResponse>;
  }

  return null;
}

export { getDeploymentById };
