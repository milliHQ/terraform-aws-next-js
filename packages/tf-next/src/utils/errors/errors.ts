import { CliError } from './cli-error';

export class MissingApiEndpoint extends CliError<'MISSING_API_ENDPOINT'> {
  constructor() {
    super({
      code: 'MISSING_API_ENDPOINT',
      message:
        'API endpoint not set. Please use the --endpoint flag to set the endpoint.',
    });
  }
}

export class CredentialsError extends CliError<'INVALID_CREDENTIALS'> {
  constructor() {
    super({
      code: 'INVALID_CREDENTIALS',
      message:
        'Could not read the provided AWS credentials.\nPlease make sure that the provided AWS profile exists.',
    });
  }
}

export class AliasOverrideNotAllowed extends CliError<'ALIAS_OVERRIDE_NOT_ALLOWED'> {
  constructor(alias: string) {
    super({
      code: 'ALIAS_OVERRIDE_NOT_ALLOWED',
      message: `Alias ${alias} already exists.\nTo override run the command with --force flag.`,
    });
  }
}

export class AliasNotExists extends CliError<'ALIAS_NOT_EXISTS'> {
  constructor(alias: string) {
    super({
      code: 'ALIAS_NOT_EXISTS',
      message: `Alias with name ${alias} does not exist.`,
    });
  }
}

export class DeleteDeploymentAlias extends CliError<'ALIAS_DELETE_DEPLOYMENT_ALIAS'> {
  constructor() {
    super({
      code: 'ALIAS_DELETE_DEPLOYMENT_ALIAS',
      message:
        'Requested alias is a deployment alias.\nCan only be removed when the linked deployment is removed.',
    });
  }
}

export class DeploymentNotExists extends CliError<'DEPLOYMENT_NOT_EXISTS'> {
  constructor(deploymentId: string) {
    super({
      code: 'DEPLOYMENT_NOT_EXISTS',
      message: `Deployment with id ${deploymentId} does not exist.`,
    });
  }
}

export class DeploymentHasLinkedAliases extends CliError<'DEPLOYMENT_HAS_CUSTOM_ALIASES'> {
  constructor() {
    super({
      code: 'DEPLOYMENT_HAS_CUSTOM_ALIASES',
      message:
        'Deployment has linked custom alias(es).\nPlease remove all custom aliases before removing a deployment.',
    });
  }
}

export class DeploymentCreateFailed extends CliError<'DEPLOYMENT_CREATE_FAILED'> {
  constructor() {
    super({
      code: 'DEPLOYMENT_CREATE_FAILED',
      message:
        'Creation of the deployment failed. Please see the logs in AWS CloudWatch for more information.',
    });
  }
}
