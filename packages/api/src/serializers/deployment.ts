import { DeploymentItem } from '@millihq/tfn-dynamodb-actions';

import { components } from '../../schema';

type Deployment = components['schemas']['Deployment'];

/* -----------------------------------------------------------------------------
 * deploymentDefaultSerializer
 * ---------------------------------------------------------------------------*/

type DeploymentDefaultSerializerInput = Pick<
  DeploymentItem,
  'DeploymentId' | 'CreateDate' | 'Status' | 'DeploymentAlias'
>;

function deploymentDefaultSerializer<
  DeploymentInput extends DeploymentDefaultSerializerInput
>(deployment: DeploymentInput): Deployment {
  return {
    // Required attributes
    id: deployment.DeploymentId,
    createDate: deployment.CreateDate,
    status: deployment.Status,
    // Optional attributes
    deploymentAlias: deployment.DeploymentAlias,
  };
}

export { deploymentDefaultSerializer };
