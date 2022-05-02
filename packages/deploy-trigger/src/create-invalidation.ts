import CloudFront from 'aws-sdk/clients/cloudfront';

// Number of paths a single invalidation can hold
// A invalidation should not have more than 15 paths with wildcards (*) at a time
// https://docs.aws.amazon.com/AmazonCloudFront/latest/DeveloperGuide/Invalidation.html#invalidation-specifying-objects%23InvalidationLimits
const limitMultiPathsPerInvalidation = 15;
const limitTotalPathsPerInvalidation = 3000;

/**
 * Splits the incoming paths into paths with tailing wildcard character (`*`),
 * called multiPaths and regular paths, called singlePaths
 * @param invalidationPaths
 * @returns [multiPaths, singlePaths]
 */
export function prepareInvalidations(invalidationPaths: string[]) {
  let multiPaths: string[] = [];
  let singlePaths: string[] = [];

  // Search through the
  for (const invalidationPath of invalidationPaths) {
    // Paths with `*` at the end are multiPaths
    if (invalidationPath.endsWith('*')) {
      multiPaths.push(invalidationPath);
    } else {
      singlePaths.push(invalidationPath);
    }
  }

  // Normalize multipaths
  // E.g. we have the following paths:
  // - /a*
  // - /a/b*
  // They can then be combined into
  // - /a*

  // 1. Sort by length DESC (n...0)
  // 2. Check for every path if there is a shorter path with the same beginning
  //    If true then remove the path
  multiPaths = multiPaths
    .sort((a, b) => b.length - a.length)
    .filter((multiPath, index, array) => {
      // Search for a shorter string that is a substring multiPath
      for (let i = index + 1; i < array.length; i++) {
        // Cut the tailing `*`
        const pathWithoutTail = array[i].substr(0, array[i].length - 1);
        if (multiPath.startsWith(pathWithoutTail)) {
          return false;
        }
      }

      return true;
    });

  // Check if regular paths are already caught by a multiPath
  singlePaths = singlePaths.filter((singlePath) => {
    for (const multiPath of multiPaths) {
      // Cut the tailing `*`
      const pathWithoutTail = multiPath.substr(0, multiPath.length - 1);

      if (singlePath.startsWith(pathWithoutTail)) {
        return false;
      }
    }

    return true;
  });

  return [multiPaths, singlePaths];
}

/**
 * Creates a chunk of paths for a CloudFront invalidation request
 * @param multiPaths
 * @param singlePaths
 * @param maxMultiPaths limit of multiPaths
 * @param maxTotalPaths limit of total paths that can be included in an invalidation
 * @returns
 */
export function createInvalidationChunk(
  multiPaths: string[],
  singlePaths: string[],
  maxMultiPaths: number,
  maxTotalPaths: number
) {
  let pathsChunk: string[] = [];
  let newSinglePaths: string[] = singlePaths;
  let newMultiPaths: string[] = multiPaths;

  // First, try to put as many singlePaths into an invalidation chunk as possible
  const singlePathIndex = Math.min(singlePaths.length, maxTotalPaths);
  if (singlePathIndex > 0) {
    pathsChunk = singlePaths.slice(0, singlePathIndex);
    newSinglePaths = singlePaths.slice(singlePathIndex);
  }

  // Check if chunk is already full and fill the remaining paths with multiPaths
  const numOfAvailablePathsInChunk = maxTotalPaths - pathsChunk.length;
  const numOfAvailableMultiPathsInChunk = Math.min(
    numOfAvailablePathsInChunk,
    maxMultiPaths
  );
  if (numOfAvailableMultiPathsInChunk > 0) {
    pathsChunk.push(...multiPaths.slice(0, numOfAvailableMultiPathsInChunk));
    newMultiPaths = multiPaths.slice(numOfAvailableMultiPathsInChunk);
  }

  return [pathsChunk, newMultiPaths, newSinglePaths];
}

/**
 * Creates a batch of paths that can be used as CloudFront invalidation
 * @param invalidationPaths
 * @returns
 */
export function createInvalidation(
  invalidationId: string,
  multiPaths: string[],
  singlePaths: string[]
): [CloudFront.InvalidationBatch, string[], string[]] {
  const [pathsChunk, newMultiPaths, newSinglePaths] = createInvalidationChunk(
    multiPaths,
    singlePaths,
    limitMultiPathsPerInvalidation,
    limitTotalPathsPerInvalidation
  );

  const cloudFrontInvalidationBatch: CloudFront.InvalidationBatch = {
    CallerReference: `${new Date().getTime()}-${invalidationId}`,
    Paths: {
      Quantity: pathsChunk.length,
      Items: pathsChunk,
    },
  };

  return [cloudFrontInvalidationBatch, newMultiPaths, newSinglePaths];
}
