import { paths } from '@millihq/terraform-next-api/schema';

import {
  fetchAWSSigV4,
  FetchAWSSigV4Options,
} from '../../utils/fetch-aws-sig-v4';

type SuccessResponse =
  paths['/deployments']['get']['responses']['200']['content']['application/json'];
type DeploymentItems = SuccessResponse['items'];

async function listDeployments(
  options: FetchAWSSigV4Options
): Promise<DeploymentItems | null> {
  const response = await fetchAWSSigV4(options, '/deployments');

  if (response.status === 200) {
    const { items } = await (response.json() as Promise<SuccessResponse>);
    return items;
  }

  return null;
}

export { listDeployments };
