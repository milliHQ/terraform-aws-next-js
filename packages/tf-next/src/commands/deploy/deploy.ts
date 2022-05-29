import { resolve } from 'path';
import { Readable } from 'stream';

import { FormDataEncoder } from 'form-data-encoder';
import { FormData } from 'formdata-node';
import { fileFromPath } from 'formdata-node/file-from-path';
import nodeFetch from 'node-fetch';

import { GlobalYargs, LogLevel } from '../../types';
import { createSpinner } from '../../utils/create-spinner';
import {
  apiMiddlewareOptions,
  createApiMiddleware,
} from '../../middleware/api';
import { ApiService } from '../../api';

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
   * The api endpoint to use.
   */
  apiService: ApiService;
  /**
   * Path to the deployment package that should be uploaded.
   */
  deploymentPackagePath?: string;
  cwd: string;
  logLevel: LogLevel;
};

async function deployCommand({
  apiService,
  deploymentPackagePath = '.next-tf/deployment.zip',
  cwd,
}: DeployCommandOptions) {
  const internalDeploymentPackagePath = resolve(cwd, deploymentPackagePath);
  let deploymentId: string;

  // Upload package
  const uploadSpinner = createSpinner('Uploading deployment package');
  try {
    uploadSpinner.start();
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
      apiService,
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

/* -----------------------------------------------------------------------------
 * createDeployCommand
 * ---------------------------------------------------------------------------*/

function createDeployCommand(yargs: GlobalYargs) {
  yargs.command(
    'deploy',
    'Deploy a project',
    (yargs) => {
      yargs.options(apiMiddlewareOptions);
    },
    async ({ apiService, logLevel, commandCwd }) => {
      await deployCommand({
        apiService: apiService as ApiService,
        logLevel,
        cwd: commandCwd,
      });
    },
    createApiMiddleware()
  );
}

export { createDeployCommand };
