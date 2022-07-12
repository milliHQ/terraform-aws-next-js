import { URL, URLSearchParams } from 'url';

import { Sha256 } from '@aws-crypto/sha256-js';
import { SignatureV4 } from '@aws-sdk/signature-v4';
import { HeaderBag, MemoizedProvider, QueryParameterBag } from '@aws-sdk/types';
import { paths } from '@millihq/terraform-next-api/schema';
import { Credentials } from 'aws-lambda';
import nodeFetch, { HeadersInit } from 'node-fetch';
import pWaitFor from 'p-wait-for';

import {
  createResponseError,
  ResponseError,
} from '../../../utils/errors/response-error';
import { CredentialsError } from '../../../utils/errors';

type NodeFetch = typeof nodeFetch;
type CreateAliasRequestBody =
  paths['/aliases']['post']['requestBody']['content']['application/json'];
type CreateAliasSuccessResponse =
  paths['/aliases']['post']['responses']['201']['content']['application/json'];
type ListAliasQueryParameters = paths['/aliases']['get']['parameters']['query'];
type ListAliasSuccessResponse =
  paths['/aliases']['get']['responses']['200']['content']['application/json'];
type CreateDeploymentSuccessResponse =
  paths['/deployments']['post']['responses']['201']['content']['application/json'];
type ListDeploymentsSuccessResponse =
  paths['/deployments']['get']['responses']['200']['content']['application/json'];
type GetDeploymentByIdSuccessResponse =
  paths['/deployments/{deploymentId}']['get']['responses']['200']['content']['application/json'];
type DeleteDeploymentByIdSuccessResponse =
  paths['/deployments/{deploymentId}']['delete']['responses']['200']['content']['application/json'];

const POLLING_DEFAULT_INTERVAL_MS = 5_000;
const POLLING_DEFAULT_TIMEOUT_MS = 5 * 60_000;

/**
 * API Gateway endpoints use a regional API endpoint which includes the AWS
 * region where they are deployed to.
 * e.g. https://xyz.execute-api.eu-central-1.amazonaws.com
 */
function extractRegionFromApiGatewayEndpoint(
  endpointUrl: string
): string | null {
  const result = endpointUrl.match(/execute-api\.([^\.]*)/);

  if (result && result[1]) {
    return result[1];
  }

  return null;
}

/**
 * Converts the headers from fetch into SignatureV4 compatible format.
 */
function convertFetchHeaders(
  inputHeaders: HeadersInit | undefined = {}
): HeaderBag {
  const result: HeaderBag = {};

  for (const [key, value] of Object.entries(inputHeaders)) {
    result[key] = value;
  }

  return result;
}

function convertURLSearchParamsToQueryBag(
  searchParams: URLSearchParams
): QueryParameterBag {
  let queryBag: QueryParameterBag = {};
  for (const [key, value] of searchParams.entries()) {
    queryBag[key] = value;
  }
  return queryBag;
}

/* -----------------------------------------------------------------------------
 * ApiService
 * ---------------------------------------------------------------------------*/

type ApiServiceOptions = {
  apiEndpoint: string;
  awsCredentialProvider: MemoizedProvider<Credentials>;
};

class ApiService {
  apiEndpoint: string;
  awsCredentialProvider: MemoizedProvider<Credentials>;
  awsRegion: string;

  constructor({ apiEndpoint, awsCredentialProvider }: ApiServiceOptions) {
    this.apiEndpoint = apiEndpoint;
    this.awsCredentialProvider = awsCredentialProvider;

    const awsRegion = extractRegionFromApiGatewayEndpoint(apiEndpoint);
    if (!awsRegion) {
      throw new Error(
        'API endpoint is in bad format. Could not extract region from it.'
      );
    }
    this.awsRegion = awsRegion;
  }

  /**
   * Fetch that signs a request with SignatureV4 automatically.
   * @param fetchArgs
   * @returns
   */
  private async fetchAWSSigV4<T = {}>(
    ...fetchArgs: Parameters<NodeFetch>
  ): Promise<T> {
    const signature = new SignatureV4({
      region: this.awsRegion,
      service: 'execute-api',
      credentials: this.awsCredentialProvider,
      sha256: Sha256,
    });

    let requestUrl: string;
    if (typeof fetchArgs[0] === 'string') {
      requestUrl = fetchArgs[0];
    } else if ('href' in fetchArgs[0]) {
      requestUrl = fetchArgs[0].href;
    } else {
      requestUrl = fetchArgs[0].url;
    }

    const parsedUrl = new URL(requestUrl, this.apiEndpoint);
    try {
      const signedRequest = await signature.sign({
        hostname: parsedUrl.hostname,
        protocol: parsedUrl.protocol,
        path: parsedUrl.pathname,
        headers: convertFetchHeaders({
          ...fetchArgs[1]?.headers,
          host: parsedUrl.hostname,
          accept: 'application/json',
        }),
        method: fetchArgs[1]?.method?.toUpperCase() ?? 'GET',
        query: convertURLSearchParamsToQueryBag(parsedUrl.searchParams),
        body: fetchArgs[1]?.body,
      });
      const response = await nodeFetch(parsedUrl.href, {
        ...fetchArgs[1],
        headers: signedRequest.headers,
      });
      if (!response.ok) {
        throw await createResponseError(response);
      }

      // OK - parse the response
      if (response.headers.get('content-type') === 'application/json') {
        try {
          return (await response.json()) as Promise<T>;
        } catch (_ignoredError) {
          return {} as T;
        }
      }

      // Response from API is not OK, should never happen
      throw new Error('Invalid response from API');
    } catch (error: any) {
      if (error.name === 'CredentialsProviderError') {
        throw new CredentialsError();
      }

      throw error;
    }
  }

  // Aliases
  createAlias(requestBody: CreateAliasRequestBody) {
    return this.fetchAWSSigV4<CreateAliasSuccessResponse>('/aliases', {
      method: 'POST',
      body: JSON.stringify(requestBody),
      headers: {
        'Content-Type': 'application/json',
      },
    });
  }

  deleteAlias(alias: string) {
    return this.fetchAWSSigV4(`/aliases/${alias}`, {
      method: 'DELETE',
    });
  }

  async listAliases(deploymentId: string) {
    const params: ListAliasQueryParameters = {
      deploymentId,
    };
    const query = new URLSearchParams(params).toString();
    const { items } = await this.fetchAWSSigV4<ListAliasSuccessResponse>(
      `/aliases?${query}`
    );

    return items;
  }

  // Deployments
  createDeployment() {
    return this.fetchAWSSigV4<CreateDeploymentSuccessResponse>('/deployments', {
      method: 'POST',
    });
  }

  async listDeployments() {
    const { items } = await this.fetchAWSSigV4<ListDeploymentsSuccessResponse>(
      '/deployments'
    );
    return items;
  }

  getDeploymentById(deploymentId: string) {
    return this.fetchAWSSigV4<GetDeploymentByIdSuccessResponse>(
      `/deployments/${deploymentId}`
    );
  }

  /**
   * Polls the getDeploymentById endpoint until the status meets the desired
   * status.
   *
   * @param deploymentId - Id of the deployment that should be polled.
   * @param status - Status to wait for until polling finishes.
   * @param options - Polling options.
   */
  pollForDeploymentStatus = async (
    deploymentId: string,
    status: GetDeploymentByIdSuccessResponse['status'],
    options: {
      interval?: number;
      timeout?: number;
    } = {}
  ): Promise<GetDeploymentByIdSuccessResponse> => {
    // Status where we should stop since something bad has happened
    const failureStatus: GetDeploymentByIdSuccessResponse['status'][] = [
      'CREATE_FAILED',
      'DESTROY_FAILED',
    ];
    const {
      interval = POLLING_DEFAULT_INTERVAL_MS,
      timeout = POLLING_DEFAULT_TIMEOUT_MS,
    } = options;

    let result: GetDeploymentByIdSuccessResponse | null = null;
    await pWaitFor(
      async () => {
        const response = await this.getDeploymentById(deploymentId);

        if (response) {
          if (failureStatus.indexOf(response.status) !== -1) {
            // Create a pseudo error response
            throw new ResponseError({
              status: 400,
              code: 'DEPLOYMENT_CREATE_FAILED',
            });
          }

          if (response.status === status) {
            result = response;
            return true;
          }
        }
        return false;
      },
      {
        interval,
        timeout,
        leadingCheck: false,
      }
    );

    if (!result) {
      throw new Error('Could not get deployment status.');
    }

    return result;
  };

  deleteDeploymentById = (deploymentId: string) => {
    return this.fetchAWSSigV4<undefined | DeleteDeploymentByIdSuccessResponse>(
      `/deployments/${deploymentId}`,
      {
        method: 'DELETE',
      }
    );
  };
}

export { ApiService };
