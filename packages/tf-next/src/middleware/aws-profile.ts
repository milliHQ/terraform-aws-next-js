import { defaultProvider } from '@aws-sdk/credential-provider-node';
import { Credentials, MemoizedProvider } from '@aws-sdk/types';
import { MiddlewareFunction, Options } from 'yargs';

type AWSProfileArguments = {
  awsCredentialProvider: MemoizedProvider<Credentials>;
};

/**
 * Generates a aws credential provider from the Node.js environment.
 * It will attempt to find credentials from the following sources (listed in
 * order of precedence):
 *   - Environment variables exposed via process.env
 *   - SSO credentials from token cache
 *   - Web identity token credentials
 *   - Shared credentials and config ini files
 *   - The EC2/ECS Instance Metadata Service
 *
 * @see {@link https://www.npmjs.com/package/@aws-sdk/credential-provider-node}
 */
const awsProfileMiddleware: MiddlewareFunction<AWSProfileArguments> = (
  argv
) => {
  // If the --profile flag is provided load a named profile
  const profile =
    typeof argv.profile === 'string' ? typeof argv.profile : undefined;

  argv.awsCredentialProvider = defaultProvider({
    profile,
  });

  return argv;
};

/**
 * Command line options that are added when the awsProfileMiddleware is used.
 */
const awsProfileMiddlewareOptions: Record<string, Options> = {
  profile: {
    type: 'string',
    description:
      'AWS profile that should be used for authentication with the API endpoint.',
  },
};

export type { AWSProfileArguments };
export { awsProfileMiddleware, awsProfileMiddlewareOptions };
