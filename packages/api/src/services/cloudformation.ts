import CloudFormation from 'aws-sdk/clients/cloudformation';

type CloudFormationServiceType = typeof CloudFormationService;

class CloudFormationService {
  static async deleteStack(stackName: string): Promise<void> {
    const cloudFormationClient = new CloudFormation();
    const response = await cloudFormationClient
      .deleteStack({
        StackName: stackName,
      })
      .promise();

    if (response.$response.error) {
      throw response.$response.error;
    }
  }
}

export type { CloudFormationServiceType };
export { CloudFormationService };
