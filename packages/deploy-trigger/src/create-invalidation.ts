import { CloudFront } from 'aws-sdk';

import { generateRandomId } from './utils';

// Number of paths a single invalidation can hold
// A invalidation should not have more than 15 paths with wildcards (*) at a time
// https://docs.aws.amazon.com/AmazonCloudFront/latest/DeveloperGuide/Invalidation.html#invalidation-specifying-objects%23InvalidationLimits
//
// TODO: Find out if we can submit multiple invalidations with 15 invalidation
// paths at a single time and if they are running sequentially or if we
// need to take care of this scenario
// May need a step-function with sleep to make this possible?
const limitPathsPerInvalidation = 15;

function chunkArray<T>(array: T[], chunkSize: number): T[][] {
  const R = [];
  for (let i = 0, len = array.length; i < len; i += chunkSize)
    R.push(array.slice(i, i + chunkSize));
  return R;
}

export async function createInvalidation(
  distributionId: string,
  invalidationPaths: string[]
) {
  const cloudFront = new CloudFront({
    apiVersion: '2020-05-31',
  });

  const invalidationChunks = chunkArray(
    invalidationPaths,
    limitPathsPerInvalidation
  );

  for (const chunk of invalidationChunks) {
    try {
      await cloudFront
        .createInvalidation({
          DistributionId: distributionId,
          InvalidationBatch: {
            CallerReference: `${new Date().getTime()}-${generateRandomId(4)}`,
            Paths: {
              Quantity: chunk.length,
              Items: chunk,
            },
          },
        })
        .promise();
    } catch (err) {
      // See TODO from top
      console.log(err);
    }
  }
}
