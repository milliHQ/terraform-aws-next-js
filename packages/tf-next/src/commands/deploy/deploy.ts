import { resolve } from 'path';
import { Readable } from 'stream';

import { FormDataEncoder } from 'form-data-encoder';
import { FormData } from 'formdata-node';
import { fileFromPath } from 'formdata-node/file-from-path';
import nodeFetch from 'node-fetch';

import { LogLevel } from '../../types';
import { ApiService, Client, withClient } from '../../client';

function delay(t: number) {
  return new Promise(function (resolve) {
    setTimeout(resolve, t);
  });
}

function pollUntilDone(
  deploymentId: string,
  apiService: ApiService,
  interval: number,
  timeout: number
) {
  let start = Date.now();
  function run(): Promise<boolean | string> {
    return apiService.getDeploymentById(deploymentId).then((dataResult) => {
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

type DeployCommandOptions = {
  /**
   * Client Service.
   */
  client: Client;
  /**
   * Path to the deployment package that should be uploaded.
   */
  deploymentPackagePath?: string;
  cwd: string;
  logLevel: LogLevel;
};

async function deployCommand({
  client,
  deploymentPackagePath = '.next-tf/deployment.zip',
  cwd,
}: DeployCommandOptions) {
  const { apiService, output } = client;
  const internalDeploymentPackagePath = resolve(cwd, deploymentPackagePath);
  let deploymentId: string;

  // Upload package
  output.spinner('Uploading deployment package');
  try {
    const response = await apiService.createDeployment();

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

    output.stopSpinner();

    // Poll until the CloudFormation stack creation has finished
  } catch (error) {
    output.stopSpinner();
    console.log('Upload failed: ', error);
    return;
  }

  // Deployment
  const deploymentSpinner = output.spinner('Wait for deployment to finish');
  try {
    const deploymentCreationResult = await pollUntilDone(
      deploymentId,
      apiService,
      5000,
      2 * 60000
    );

    output.stopSpinner();
    if (typeof deploymentCreationResult === 'string') {
      console.log('Available at: ', `https://${deploymentCreationResult}`);
    }
  } catch (error) {
    output.stopSpinner();
    console.log('Deployment failed: ', error);
  }
}

/* -----------------------------------------------------------------------------
 * createDeployCommand
 * ---------------------------------------------------------------------------*/

const createDeployCommand = withClient(
  'deploy',
  'Deploy a project',
  () => {},
  ({ client, logLevel, commandCwd }) => {
    deployCommand({
      client,
      logLevel,
      cwd: commandCwd,
    });
  }
);

export { createDeployCommand };
