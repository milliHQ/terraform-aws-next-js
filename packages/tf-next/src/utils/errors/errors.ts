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

export class PermissionDenied extends CliError<'PERMISSION_ERROR'> {
  constructor() {
    super({
      code: 'PERMISSION_ERROR',
      message:
        'Authentication failed. Make sure that the AWS profile is set correctly.',
    });
  }
}
