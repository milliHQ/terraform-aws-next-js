import { ApiGatewayV2 } from 'aws-sdk';

const apiGatewayV2 = new ApiGatewayV2();

interface ListDeploymentProps {
  target?: 'AWS';
}

async function listDeploymentsCommand({
  target = 'AWS',
}: ListDeploymentProps) {
  const apis = await apiGatewayV2.getApis().promise();
  for (const item of apis.Items || []) {
    if (item.Name.startsWith('tf-next') && item.Description === 'Managed by Terraform-next.js') {
      console.log(item.ApiId);
    }
  }
}

export default listDeploymentsCommand;
