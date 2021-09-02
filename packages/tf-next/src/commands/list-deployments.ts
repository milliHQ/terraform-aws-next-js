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
      const name = item.Name.split(' - ');
      if (name[name.length - 1] !== 'tf-next') {
        console.log(name[name.length - 1]);
      }
    }
  }
}

export default listDeploymentsCommand;
