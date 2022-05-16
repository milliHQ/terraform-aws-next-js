import { createReadStream } from 'fs';
import { resolve } from 'path';

import nodeFetch from 'node-fetch';
import ora from 'ora';

import { CommandDefaultOptions } from '../types';
import { createDeployment } from '../api/deployment/create-deployment';

/**
 * Same spinner configuration as Next.js
 * @see {@link https://github.com/vercel/next.js/blob/canary/packages/next/build/spinner.ts}
 */
const dotsSpinner = {
  frames: ['.', '..', '...'],
  interval: 200,
};

function createSpinner(text: string) {
  const spinner = ora({ spinner: dotsSpinner, prefixText: text });

  return spinner;
}

type DeployCommandOptions = CommandDefaultOptions & {
  /**
   * Name of the AWS profile to use for authentication
   */
  profile?: string;
  /**
   * The api endpoint to use.
   */
  apiEndpoint: string;
  /**
   * Path to the deployment package that should be uploaded.
   */
  deploymentPackagePath?: string;
};

async function deployCommand({
  apiEndpoint,
  deploymentPackagePath = '.next-tf/deployment.zip',
  profile,
  cwd,
}: DeployCommandOptions) {
  const internalDeploymentPackagePath = resolve(cwd, deploymentPackagePath);

  const uploadSpinner = createSpinner('Uploading deployment package');

  try {
    uploadSpinner.start();
    const response = await createDeployment({ apiEndpoint, profile });

    if (!response) {
      throw new Error('Deployment failed: Could not connect to API');
    }

    await nodeFetch(response.uploadUrl, {
      method: 'POST',
      body: createReadStream(internalDeploymentPackagePath),
    });

    uploadSpinner.stopAndPersist();
    console.log('Upload complete.');
  } catch (error) {
    uploadSpinner.stopAndPersist();
    console.log('Upload failed: ', error);
  }
}

export default deployCommand;
