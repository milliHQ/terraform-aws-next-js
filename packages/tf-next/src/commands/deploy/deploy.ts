import { resolve } from 'path';
import { Readable } from 'stream';

import chalk from 'chalk';
import { writeSync as copy } from 'clipboardy';
import { FormDataEncoder } from 'form-data-encoder';
import { FormData } from 'formdata-node';
import { fileFromPath } from 'formdata-node/file-from-path';
import nodeFetch from 'node-fetch';

import { Client, withClient } from '../../client';
import { GlobalOptions } from '../../types';
import { DeploymentCreateFailed, ResponseError } from '../../utils/errors';

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
  /**
   * Wether to copy the URL of the finished deployment to the clipboard.
   */
  noClipboard: boolean;
  /**
   * The working directory where the command should run.
   */
  cwd: string;
};

async function deployCommand({
  client,
  deploymentPackagePath = '.next-tf/deployment.zip',
  noClipboard,
  cwd,
}: DeployCommandOptions) {
  const { apiService, output } = client;
  const internalDeploymentPackagePath = resolve(cwd, deploymentPackagePath);
  let deploymentId: string;

  // Upload package
  output.spinner('Uploading deployment package');
  try {
    const deployment = await apiService.createDeployment();
    deploymentId = deployment.id;

    const uploadForm = new FormData();
    Object.entries(deployment.uploadAttributes).forEach(([key, value]) => {
      uploadForm.append(key, value);
    });
    uploadForm.append(
      'file',
      await fileFromPath(internalDeploymentPackagePath)
    );
    const encoder = new FormDataEncoder(uploadForm);

    const uploadResponse = await nodeFetch(deployment.uploadUrl, {
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
    output.success('Deployment package uploaded');

    // Poll until the CloudFormation stack creation has finished
  } catch (error: any) {
    console.debug(error.toString());
    console.error('Could not upload deployment package.');
    return;
  }

  // Deployment
  output.spinner('Waiting for deployment');
  try {
    const deploymentCreationResult = await apiService.pollForDeploymentStatus(
      deploymentId,
      'FINISHED'
    );
    output.stopSpinner();
    output.success('Deployment ready');

    // If we have a preview deployment, display the URL
    if (deploymentCreationResult.deploymentAlias) {
      const previewUrl = `https://${deploymentCreationResult.deploymentAlias}`;

      let urlCopiedToClipboard = false;
      try {
        if (!noClipboard) {
          copy(previewUrl);
          urlCopiedToClipboard = true;
        }
      } catch (_ignoredError) {}

      output.log(
        `Available at: ${previewUrl}${
          urlCopiedToClipboard ? chalk.gray` (copied to clipboard)` : ''
        } `
      );
    } else {
      output.log(`Deployment Id: ${deploymentCreationResult.id}`);
    }
  } catch (error: ResponseError | any) {
    if (error.code === 'DEPLOYMENT_CREATE_FAILED') {
      throw new DeploymentCreateFailed();
    }

    throw error;
  }
}

/* -----------------------------------------------------------------------------
 * createDeployCommand
 * ---------------------------------------------------------------------------*/

type DeployCommandArguments = {
  noClipboard?: boolean;
} & GlobalOptions;

const createDeployCommand = withClient<DeployCommandArguments>(
  'deploy',
  'Deploy a project',
  (yargs) => {
    yargs.option('no-clipboard', {
      type: 'boolean',
      description:
        'Do not copy the url to clipboard after a successful deployment',
    });
  },
  async ({ client, commandCwd, noClipboard }) => {
    await deployCommand({
      client,
      cwd: commandCwd,
      noClipboard: !!noClipboard,
    });
  }
);

export { createDeployCommand };
