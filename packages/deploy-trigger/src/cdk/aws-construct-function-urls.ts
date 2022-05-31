import { Stack, RemovalPolicy, CfnOutput, Duration } from 'aws-cdk-lib';
import { Role, ServicePrincipal, PolicyStatement } from 'aws-cdk-lib/aws-iam';
import * as lambda from 'aws-cdk-lib/aws-lambda';
import { LogGroup, RetentionDays } from 'aws-cdk-lib/aws-logs';
import { Bucket } from 'aws-cdk-lib/aws-s3';

import { LambdaDefinition } from '../types';
import { getRuntime } from './cdk-utils';

/* -----------------------------------------------------------------------------
 * CDK construct
 * ---------------------------------------------------------------------------*/

type AtomicDeploymentOptions = {
  /**
   * Bucket where the deployment is stored to.
   */
  deploymentBucketId: string;
  /**
   * Unique ID of the deployment.
   */
  deploymentId: string;
  /**
   * The lambdas that should be created as part of the stack.
   */
  lambdas: LambdaDefinition[];
};

class AtomicDeploymentFunctionUrls extends Stack {
  constructor({
    deploymentBucketId,
    deploymentId,
    lambdas,
  }: AtomicDeploymentOptions) {
    super();

    /**
     * S3 bucket where the code for the Lambda is stored.
     */
    const deploymentBucket = Bucket.fromBucketArn(
      this,
      'deploymentBucket',
      `arn:aws:s3:::${deploymentBucketId}`
    );

    if (lambdas.length > 0) {
      // Create service role for Lambdas
      const lambdaRole = new Role(this, 'lambdaRole', {
        assumedBy: new ServicePrincipal('lambda.amazonaws.com'),
        description: 'Managed by Terraform Next.js',
      });

      lambdaRole.addToPolicy(
        new PolicyStatement({
          actions: ['logs:PutLogEvents', 'logs:CreateLogStream'],
          resources: ['arn:aws:logs:*:*:log-group:/aws/lambda/*'],
        })
      );

      const routes = lambdas.map((lambdaSource) => {
        const functionCode = new lambda.S3Code(
          deploymentBucket,
          lambdaSource.sourceKey
        );

        const lambdaFn = new lambda.Function(this, lambdaSource.functionName, {
          description: deploymentId,
          runtime: getRuntime(lambdaSource.runtime),
          handler: lambdaSource.handler,
          code: functionCode,
          role: lambdaRole,
          timeout: Duration.seconds(29),
          memorySize: 1024,
        });

        const functionUrl = lambdaFn.addFunctionUrl({
          authType: lambda.FunctionUrlAuthType.NONE,
        });

        // LogGroup for Lambda
        // We create the logGroup manually here, because setting the retention on
        // the function does not work
        // See: https://milangatyas.com/Blog/Detail/8/set-aws-lambda-log-group-retention-with-aws-c
        new LogGroup(this, `logGroup${lambdaSource.functionName}`, {
          logGroupName: `/aws/lambda/${lambdaFn.functionName}`,
          retention: RetentionDays.FIVE_DAYS,
          removalPolicy: RemovalPolicy.DESTROY,
        });

        return `${lambdaSource.route} ${functionUrl.url}`;
      });

      new CfnOutput(this, 'lambdaRoutes', {
        value: routes.join(' '),
      });
    }
  }
}

export { AtomicDeploymentFunctionUrls };
