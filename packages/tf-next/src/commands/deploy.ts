import { resolve } from 'path';
import { Readable } from 'stream';

import { FormDataEncoder } from 'form-data-encoder';
import { FormData } from 'formdata-node';
import { fileFromPath } from 'formdata-node/file-from-path';
import nodeFetch from 'node-fetch';

import { CommandDefaultOptions } from '../types';
import { createDeployment } from '../api/deployment/create-deployment';
import { getDeploymentById } from '../api/deployment/get-deployment-by-id';
import { FetchAWSSigV4Options } from '../utils/fetch-aws-sig-v4';
import { createSpinner } from '../utils/create-spinner';

function delay(t: number) {
  return new Promise(function (resolve) {
    setTimeout(resolve, t);
  });
}

function pollUntilDone(
  deploymentId: string,
  fetchOptions: FetchAWSSigV4Options,
  interval: number,
  timeout: number
) {
  let start = Date.now();
  function run(): Promise<boolean | string> {
    return getDeploymentById(deploymentId, fetchOptions).then((dataResult) => {
      if (!dataResult) {
        throw new Error('Deployment failed.');
      }

      if (dataResult.status === 'FINISHED') {
        if (dataResult.deploymentAlias) {
          return dataResult.deploymentAlias;
        }
        return true;
      } else if (dataResult.status === 'CREATE_FAILED') {
        return false;
      } else {
        if (timeout !== 0 && Date.now() - start > timeout) {
          throw new Error('timeout error on pollUntilDone');
        } else {
          // run again with a short delay
          return delay(interval).then(run);
        }
      }
    });
  }
  return run();
}

/* -----------------------------------------------------------------------------
 * deployCommand
 * ---------------------------------------------------------------------------*/

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
  const fetchOptions: FetchAWSSigV4Options = { apiEndpoint, profile };
  let deploymentId: string;

  // Upload package
  const uploadSpinner = createSpinner('Uploading deployment package');
  try {
    uploadSpinner.start();
    const response = await createDeployment(fetchOptions);

    if (!response) {
      throw new Error('Deployment failed: Could not connect to API');
    }

    deploymentId = response.id;
    const uploadForm = new FormData();
    Object.entries(response.uploadAttributes).forEach(([key, value]) => {
      uploadForm.append(key, value);
    });
    uploadForm.append(
      'file',
      await fileFromPath(internalDeploymentPackagePath)
    );
    const encoder = new FormDataEncoder(uploadForm);

    const uploadResponse = await nodeFetch(response.uploadUrl, {
      method: 'POST',
      headers: encoder.headers,
      body: Readable.from(encoder),
    });

    if (uploadResponse.status !== 204) {
      console.log(uploadResponse.status);
      const parsedResponse = await uploadResponse.text();

      throw new Error(parsedResponse);
    }

    uploadSpinner.stopAndPersist({ prefixText: '✅ Upload complete.' });

    // Poll until the CloudFormation stack creation has finished
  } catch (error) {
    uploadSpinner.stopAndPersist();
    console.log('Upload failed: ', error);
    return;
  }

  // Deployment
  const deploymentSpinner = createSpinner('Wait for deployment to finish');
  try {
    deploymentSpinner.start();
    const deploymentCreationResult = await pollUntilDone(
      deploymentId,
      fetchOptions,
      5000,
      2 * 60000
    );

    deploymentSpinner.stopAndPersist({
      prefixText: '✅ deployment complete.',
    });
    if (typeof deploymentCreationResult === 'string') {
      console.log('Available at: ', `https://${deploymentCreationResult}`);
    }
  } catch (error) {
    deploymentSpinner.stopAndPersist();
    console.log('Deployment failed: ', error);
  }
}

export default deployCommand;
