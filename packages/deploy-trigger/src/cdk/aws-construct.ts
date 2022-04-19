import {
  HttpApi,
  HttpMethod,
  PayloadFormatVersion,
} from '@aws-cdk/aws-apigatewayv2-alpha';
import { HttpLambdaIntegration } from '@aws-cdk/aws-apigatewayv2-integrations-alpha';
import { Stack, RemovalPolicy } from 'aws-cdk-lib';
import { Role, ServicePrincipal, PolicyStatement } from 'aws-cdk-lib/aws-iam';
import * as lambda from 'aws-cdk-lib/aws-lambda';
import { LogGroup, RetentionDays } from 'aws-cdk-lib/aws-logs';
import { Bucket } from 'aws-cdk-lib/aws-s3';

import { LambdaDefinition, SupportedRuntime } from '../types';

/* -----------------------------------------------------------------------------
 * Utils
 * ---------------------------------------------------------------------------*/
function getRuntime(runtimeIdentifier: SupportedRuntime | string) {
  switch (runtimeIdentifier) {
    case 'nodejs12.x':
      return lambda.Runtime.NODEJS_12_X;

    case 'nodejs14.x':
      return lambda.Runtime.NODEJS_14_X;

    default:
      throw new Error(`Runtime not supported: ${runtimeIdentifier}`);
  }
}

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

class AtomicDeployment extends Stack {
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

      // API Gateway
      const httpApi = new HttpApi(this, 'ApiGateway', {
        apiName: deploymentId,
      });

      for (const lambdaSource of lambdas) {
        const functionCode = new lambda.S3Code(
          deploymentBucket,
          lambdaSource.sourceKey
        );

        const lambdaFn = new lambda.Function(this, lambdaSource.functionName, {
          runtime: getRuntime(lambdaSource.runtime),
          handler: lambdaSource.handler,
          code: functionCode,
          role: lambdaRole,
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

        const lambdaIntegration = new HttpLambdaIntegration(
          `lambdaIntegration${lambdaSource.functionName}`,
          lambdaFn,
          {
            payloadFormatVersion: PayloadFormatVersion.VERSION_2_0,
          }
        );

        httpApi.addRoutes({
          path: `${lambdaSource.route}/{proxy+}`,
          methods: [HttpMethod.ANY],
          integration: lambdaIntegration,
        });
      }
    }
  }
}

export { AtomicDeployment };
