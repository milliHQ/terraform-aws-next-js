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
